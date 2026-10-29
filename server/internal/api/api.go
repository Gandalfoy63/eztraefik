// Docs: docs/06 - API/API Overview.md
// Package api is eztraefik's REST API under /api/v1, used by the web UI.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"eztraefik/internal/auth"
	"eztraefik/internal/docker"
	"eztraefik/internal/store"
	"eztraefik/internal/traefik"
)

// Config comes from environment variables, see docs/08 - Deployment/Configuration.md.
type Config struct {
	Version        string
	SharedDir      string
	DataDir        string
	TraefikAPI     string
	DevMode        bool
	DefaultCAURL   string
	DefaultCACert  string
	DefaultPorts   [2]int // published HTTP and HTTPS ports proposed in onboarding
	DefaultNetwork string
	DefaultName    string // Traefik container name
}

type App struct {
	Cfg      Config
	Store    *store.Store
	Docker   *docker.Client
	Manager  *traefik.Manager
	API      *traefik.API
	Metrics  *traefik.Collector
	Sessions *auth.Sessions
	Log      *slog.Logger

	applyMu sync.Mutex // one Traefik recreate at a time
}

// Handler wires every endpoint. Mutating requests need the X-EZT header (CSRF guard on top of SameSite cookies).
func (a *App) Handler() http.Handler {
	mux := http.NewServeMux()
	pub := func(pattern string, h http.HandlerFunc) { mux.Handle(pattern, a.guard(h, false)) }
	priv := func(pattern string, h http.HandlerFunc) { mux.Handle(pattern, a.guard(h, true)) }

	pub("GET /api/v1/meta", a.meta)
	pub("POST /api/v1/auth/login", a.login)
	pub("POST /api/v1/auth/logout", a.logout)
	pub("GET /api/v1/onboarding/check", a.onboardingCheck)
	pub("POST /api/v1/onboarding/complete", a.onboardingComplete)

	priv("GET /api/v1/overview", a.overview)
	priv("GET /api/v1/runtime", a.runtime)

	priv("GET /api/v1/routes", a.listRoutes)
	priv("POST /api/v1/routes", a.saveRoute)
	priv("PUT /api/v1/routes/{id}", a.saveRoute)
	priv("DELETE /api/v1/routes/{id}", a.deleteRoute)
	priv("POST /api/v1/routes/preview", a.previewRoute)

	priv("GET /api/v1/services", a.listServices)
	priv("POST /api/v1/services", a.saveService)
	priv("PUT /api/v1/services/{id}", a.saveService)
	priv("DELETE /api/v1/services/{id}", a.deleteService)

	priv("GET /api/v1/middlewares", a.listMiddlewares)
	priv("POST /api/v1/middlewares", a.saveMiddleware)
	priv("PUT /api/v1/middlewares/{id}", a.saveMiddleware)
	priv("DELETE /api/v1/middlewares/{id}", a.deleteMiddleware)
	priv("POST /api/v1/tools/htpasswd", a.htpasswd)

	priv("GET /api/v1/domains", a.listDomains)
	priv("POST /api/v1/domains", a.saveDomain)
	priv("DELETE /api/v1/domains/{name}", a.deleteDomain)
	priv("GET /api/v1/domains/{name}/dns", a.checkDNS)

	priv("GET /api/v1/certificates", a.listCerts)
	priv("POST /api/v1/certificates", a.uploadCert)
	priv("DELETE /api/v1/certificates/{id}", a.deleteCert)

	priv("GET /api/v1/traefik", a.getTraefik)
	priv("PUT /api/v1/traefik", a.putTraefik)
	priv("POST /api/v1/traefik/apply", a.applyTraefik)
	priv("POST /api/v1/traefik/restart", a.restartTraefik)

	priv("GET /api/v1/docker/containers", a.listContainers)
	priv("POST /api/v1/docker/containers/{id}/connect", a.connectContainer)
	priv("GET /api/v1/docker/networks", a.listNetworks)

	priv("GET /api/v1/stats", a.stats)
	priv("GET /api/v1/logs/traefik", a.traefikLogs)
	priv("GET /api/v1/logs/access", a.accessLogs)

	priv("GET /api/v1/history", a.listHistory)
	priv("GET /api/v1/history/{id}", a.getHistory)
	priv("POST /api/v1/history/{id}/rollback", a.rollback)
	priv("GET /api/v1/config/dynamic", a.dynamicConfig)
	priv("GET /api/v1/export", a.export)
	priv("POST /api/v1/import", a.importState)
	priv("PUT /api/v1/account/password", a.changePassword)

	priv("GET /api/v1/migrate/npm", a.npmStatus)
	priv("POST /api/v1/migrate/npm/connect", a.npmConnect)
	priv("POST /api/v1/migrate/npm/plan", a.npmReplan)
	priv("DELETE /api/v1/migrate/npm/session", a.npmForget)
	priv("POST /api/v1/migrate/npm/import", a.npmImport)
	priv("POST /api/v1/migrate/npm/switch", a.npmSwitch)
	priv("POST /api/v1/migrate/npm/switch-back", a.npmSwitchBack)
	return mux
}

type ctxKey struct{}

func (a *App) guard(h http.HandlerFunc, needAuth bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" && r.Header.Get("X-EZT") != "1" {
			fail(w, http.StatusForbidden, "missing X-EZT header")
			return
		}
		if needAuth {
			user, ok := a.Sessions.User(r)
			if !ok {
				fail(w, http.StatusUnauthorized, "Sign in first.")
				return
			}
			r = r.WithContext(context.WithValue(r.Context(), ctxKey{}, user))
		}
		h(w, r)
	})
}

func userOf(r *http.Request) string {
	if u, ok := r.Context().Value(ctxKey{}).(string); ok {
		return u
	}
	return "system"
}

func send(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func ok(w http.ResponseWriter, v any) { send(w, http.StatusOK, v) }

// FieldError points at the form field that is wrong, so the UI can show the message under it.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e FieldError) Error() string { return e.Message }

func fail(w http.ResponseWriter, status int, msg string) {
	send(w, status, map[string]any{"error": msg})
}

func failErr(w http.ResponseWriter, err error) {
	var fe FieldError
	if errors.As(err, &fe) {
		send(w, http.StatusUnprocessableEntity, map[string]any{"error": fe.Message, "field": fe.Field})
		return
	}
	var nf notFound
	if errors.As(err, &nf) {
		fail(w, http.StatusNotFound, nf.Error())
		return
	}
	fail(w, http.StatusInternalServerError, err.Error())
}

type notFound string

func (n notFound) Error() string { return string(n) }

func decode(r *http.Request, v any) error {
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 4<<20))
	if err := dec.Decode(v); err != nil {
		return FieldError{Message: "The request body is not valid JSON: " + err.Error()}
	}
	return nil
}

// WriteDynamic renders the state and writes it where Traefik's file provider watches.
func (a *App) WriteDynamic(st store.State) error {
	out := traefik.Render(st)
	traefik.RenderTransports(out, st)
	yaml := "# Generated by eztraefik. Edits here are overwritten; change it in the eztraefik UI.\n" + traefik.ToYAML(out)
	return store.WriteFileAtomic(filepath.Join(a.Cfg.SharedDir, "dynamic", "ezt.yml"), []byte(yaml), 0o644)
}

// Commit saves a change, rewrites the dynamic config, then reports what Traefik said about our objects.
func (a *App) Commit(r *http.Request, message string, fn func(*store.State) error) (store.State, []string, error) {
	st, err := a.Store.Update(userOf(r), message, fn)
	if err != nil {
		return st, nil, err
	}
	if err := a.WriteDynamic(st); err != nil {
		return st, nil, fmt.Errorf("saved, but writing the Traefik config failed: %w", err)
	}
	return st, a.traefikErrors(r.Context()), nil
}

// traefikErrors waits briefly for Traefik to reload the file, then lists errors on objects from the file provider.
func (a *App) traefikErrors(ctx context.Context) []string {
	time.Sleep(700 * time.Millisecond)
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	raw, err := a.API.RawData(ctx)
	if err != nil {
		return nil
	}
	var out []string
	collect := func(kind string, name string, errs []string) {
		if strings.HasSuffix(name, "@file") {
			for _, e := range errs {
				out = append(out, fmt.Sprintf("%s %s: %s", kind, strings.TrimSuffix(name, "@file"), e))
			}
		}
	}
	for n, v := range raw.Routers {
		collect("Route", n, v.Error)
	}
	for n, v := range raw.TCPRouters {
		collect("Route", n, v.Error)
	}
	for n, v := range raw.UDPRouters {
		collect("Route", n, v.Error)
	}
	for n, v := range raw.Services {
		collect("Service", n, v.Error)
	}
	for n, v := range raw.Middlewares {
		collect("Middleware", n, v.Error)
	}
	return out
}

func (a *App) meta(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	user, signedIn := a.Sessions.User(r)
	ok(w, map[string]any{
		"version": a.Cfg.Version, "onboarded": st.Onboarded, "signedIn": signedIn, "user": user, "devMode": a.Cfg.DevMode,
	})
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Username, Password string }
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	ip := clientIP(r)
	if !a.Sessions.Allow(ip) {
		fail(w, http.StatusTooManyRequests, "Too many attempts. Wait 15 minutes and try again.")
		return
	}
	st := a.Store.Get()
	if st.Admin == nil || !strings.EqualFold(in.Username, st.Admin.Username) || !auth.CheckPassword(st.Admin.PasswordHash, in.Password) {
		a.Sessions.Fail(ip)
		fail(w, http.StatusUnauthorized, "Wrong username or password.")
		return
	}
	a.Sessions.Create(w, st.Admin.Username)
	ok(w, map[string]any{"user": st.Admin.Username})
}

func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	a.Sessions.Destroy(w, r)
	ok(w, map[string]any{})
}

func (a *App) changePassword(w http.ResponseWriter, r *http.Request) {
	var in struct{ Current, Next string }
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	if len(in.Next) < 12 {
		failErr(w, FieldError{"next", "Use at least 12 characters."})
		return
	}
	_, err := a.Store.Update(userOf(r), "Password changed", func(st *store.State) error {
		if st.Admin == nil || !auth.CheckPassword(st.Admin.PasswordHash, in.Current) {
			return FieldError{"current", "This is not your current password."}
		}
		h, err := auth.HashPassword(in.Next)
		if err != nil {
			return err
		}
		st.Admin.PasswordHash = h
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	a.Sessions.DestroyAll()
	a.Sessions.Create(w, userOf(r))
	ok(w, map[string]any{})
}

func hostname() string {
	h, _ := os.Hostname()
	return h
}

// EnsureSelfOnNetwork connects eztraefik's own container to the Traefik network so it can reach the API.
func (a *App) EnsureSelfOnNetwork(ctx context.Context) {
	st := a.Store.Get()
	host, _ := os.Hostname()
	if host == "" {
		return
	}
	if _, err := a.Docker.Inspect(ctx, host); err != nil {
		return // not running in a container
	}
	if err := a.Docker.EnsureNetwork(ctx, st.Traefik.Network); err != nil {
		a.Log.Warn("network", "err", err)
		return
	}
	if err := a.Docker.Connect(ctx, st.Traefik.Network, host); err != nil {
		a.Log.Warn("connect self to network", "err", err)
	}
}

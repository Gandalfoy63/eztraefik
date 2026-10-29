// Docs: docs/03 - Features/Onboarding.md, docs/03 - Features/Config History.md
package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"eztraefik/internal/auth"
	"eztraefik/internal/store"
	"eztraefik/internal/traefik"
)

// DefaultTraefik is the config a fresh install starts from.
func DefaultTraefik(c Config) store.TraefikConfig {
	httpPort, httpsPort := c.DefaultPorts[0], c.DefaultPorts[1]
	return store.TraefikConfig{
		Image: "traefik:v3.7.16", ContainerName: c.DefaultName, Network: c.DefaultNetwork, LogLevel: "INFO", AccessLog: true,
		DockerProvider: true, ExposedByDefault: false,
		Entrypoints: []store.Entrypoint{
			{Name: "web", Port: 80, Protocol: "tcp", HostPort: httpPort},
			{Name: "websecure", Port: 443, Protocol: "tcp", HostPort: httpsPort},
		},
		Resolvers:  []store.Resolver{},
		Env:        []store.EnvVar{},
		ExtraFlags: []string{},
	}
}

func (a *App) onboardingCheck(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	if st.Onboarded {
		fail(w, http.StatusConflict, "Setup is already done.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	resp := map[string]any{"defaults": map[string]any{
		"httpPort": a.Cfg.DefaultPorts[0], "httpsPort": a.Cfg.DefaultPorts[1], "image": "traefik:v3.7.16",
		"caServer": a.Cfg.DefaultCAURL, "caCertPEM": a.Cfg.DefaultCACert, "devMode": a.Cfg.DevMode,
	}}
	v, err := a.Docker.Version(ctx)
	if err != nil {
		resp["docker"] = map[string]any{"ok": false, "error": err.Error()}
		ok(w, resp)
		return
	}
	list, _ := a.Docker.Containers(ctx, true)
	nets, _ := a.Docker.Networks(ctx)
	existing := []map[string]any{}
	for _, c := range list {
		if strings.Contains(c.Image, "traefik") && !strings.Contains(c.Image, "whoami") && c.Labels["ezt.role"] != "traefik" {
			existing = append(existing, map[string]any{"name": c.Name(), "image": c.Image, "state": c.State})
		}
	}
	// Ports already published by other containers: Traefik can't take them.
	used := map[int]string{}
	for _, c := range list {
		if c.State != "running" {
			continue
		}
		for _, p := range c.Ports {
			if p.PublicPort > 0 {
				used[p.PublicPort] = c.Name()
			}
		}
	}
	resp["docker"] = map[string]any{"ok": true, "version": v.Version, "apiVersion": v.APIVersion, "containers": len(list), "networks": len(nets)}
	resp["existingTraefik"] = existing
	resp["usedPorts"] = used
	ok(w, resp)
}

type onboardingInput struct {
	HTTPPort    int            `json:"httpPort"`
	HTTPSPort   int            `json:"httpsPort"`
	Redirect    bool           `json:"redirect"`
	Image       string         `json:"image"`
	ReplaceName string         `json:"replaceName"` // an existing Traefik container to stop and keep
	Domain      string         `json:"domain"`
	CertMode    string         `json:"certMode"` // http, dns, none
	Email       string         `json:"email"`
	DNSProvider string         `json:"dnsProvider"`
	DNSEnv      []store.EnvVar `json:"dnsEnv"`
	CAServer    string         `json:"caServer"`
	CACertPEM   string         `json:"caCertPEM"`
	Username    string         `json:"username"`
	Password    string         `json:"password"`
}

func (a *App) onboardingComplete(w http.ResponseWriter, r *http.Request) {
	var in onboardingInput
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	if a.Store.Get().Onboarded {
		fail(w, http.StatusConflict, "Setup is already done.")
		return
	}
	in.Username = strings.TrimSpace(in.Username)
	if in.Username == "" {
		failErr(w, FieldError{"username", "Choose a username."})
		return
	}
	if len(in.Password) < 12 {
		failErr(w, FieldError{"password", "Use at least 12 characters."})
		return
	}
	defaults := a.Cfg
	defaults.DefaultPorts = [2]int{in.HTTPPort, in.HTTPSPort}
	cfg := DefaultTraefik(defaults)
	if in.Image != "" {
		cfg.Image = in.Image
	}
	if in.Redirect {
		cfg.Entrypoints[0].RedirectTo = "websecure"
	}
	domain := strings.TrimSpace(strings.ToLower(in.Domain))
	if domain != "" && !hostRe.MatchString(domain) {
		failErr(w, FieldError{"domain", "Enter a domain like example.com."})
		return
	}
	switch in.CertMode {
	case "http", "dns":
		res := store.Resolver{Name: "letsencrypt", Email: strings.TrimSpace(in.Email), Challenge: in.CertMode, HTTPEntry: "web",
			DNSProvider: in.DNSProvider, CAServer: strings.TrimSpace(in.CAServer), CACertPEM: in.CACertPEM}
		if res.CAServer != "" {
			res.Name = "acme"
		}
		cfg.Resolvers = append(cfg.Resolvers, res)
		cfg.Env = append(cfg.Env, in.DNSEnv...)
	}
	if err := validateTraefik(&cfg); err != nil {
		failErr(w, err)
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		failErr(w, err)
		return
	}
	_, err = a.Store.Update(in.Username, "Setup finished", func(st *store.State) error {
		st.Traefik = cfg
		st.Admin = &store.Admin{Username: in.Username, PasswordHash: hash}
		if domain != "" {
			d := store.Domain{Name: domain}
			if len(cfg.Resolvers) > 0 {
				d.Resolver = cfg.Resolvers[0].Name
			}
			st.Domains = append(st.Domains, d)
		}
		st.Onboarded = true
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	a.Sessions.Create(w, in.Username)
	if in.ReplaceName != "" {
		// Stop the old proxy so its ports are free; it is kept, not deleted.
		_ = a.Docker.Stop(r.Context(), in.ReplaceName, 10)
	}
	// A container eztraefik did not create must never be replaced in place: rename it out of the way and keep it.
	if c, err := a.Docker.Inspect(r.Context(), cfg.ContainerName); err == nil && c.Config.Labels["ezt.managed"] != "true" {
		_ = a.Docker.Stop(r.Context(), c.ID, 10)
		_ = a.Docker.Rename(r.Context(), c.ID, cfg.ContainerName+"-before-ezt")
	}
	a.EnsureSelfOnNetwork(r.Context())
	if err := a.ApplyTraefik(r.Context(), in.Username); err != nil {
		send(w, http.StatusOK, map[string]any{"applied": false, "error": err.Error()})
		return
	}
	ok(w, map[string]any{"applied": true})
}

// ---------- History ----------

func (a *App) listHistory(w http.ResponseWriter, r *http.Request) {
	ok(w, map[string]any{"entries": a.Store.History()})
}

func (a *App) getHistory(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id"))
	e, st, err := a.Store.Snapshot(id)
	if err != nil {
		fail(w, http.StatusNotFound, "Version not found.")
		return
	}
	st.Traefik = masked(st.Traefik)
	ok(w, map[string]any{"entry": e, "state": st, "yaml": traefik.ToYAML(traefik.Render(st))})
}

// rollback restores routes, services, middlewares, domains and Traefik settings from a snapshot. The admin account is kept.
func (a *App) rollback(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id"))
	_, snap, err := a.Store.Snapshot(id)
	if err != nil {
		fail(w, http.StatusNotFound, "Version not found.")
		return
	}
	_, warnings, err := a.Commit(r, fmt.Sprintf("Rolled back to version %d", id), func(st *store.State) error {
		admin, applied := st.Admin, st.Applied
		*st = snap
		st.Admin, st.Applied, st.Onboarded = admin, applied, true
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	ok(w, map[string]any{"warnings": warnings})
}

func (a *App) dynamicConfig(w http.ResponseWriter, r *http.Request) {
	out := traefik.Render(a.Store.Get())
	traefik.RenderTransports(out, a.Store.Get())
	ok(w, map[string]any{"yaml": traefik.ToYAML(out)})
}

// export downloads the whole config, without the admin account. Secret env values are included: keep the file safe.
func (a *App) export(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	st.Admin, st.Applied = nil, nil
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="eztraefik-%s.json"`, time.Now().Format("2006-01-02")))
	ok(w, map[string]any{"format": "eztraefik-export", "version": a.Cfg.Version, "state": st})
}

func (a *App) importState(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Format string          `json:"format"`
		State  json.RawMessage `json:"state"`
	}
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	if in.Format != "eztraefik-export" {
		failErr(w, FieldError{"file", "This is not an eztraefik export file."})
		return
	}
	var imported store.State
	if err := json.Unmarshal(in.State, &imported); err != nil {
		failErr(w, FieldError{"file", "The file is damaged: " + err.Error()})
		return
	}
	if err := validateTraefik(&imported.Traefik); err != nil {
		failErr(w, err)
		return
	}
	_, warnings, err := a.Commit(r, "Config imported", func(st *store.State) error {
		admin, applied := st.Admin, st.Applied
		*st = imported
		st.Admin, st.Applied, st.Onboarded = admin, applied, true
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	ok(w, map[string]any{"warnings": warnings})
}

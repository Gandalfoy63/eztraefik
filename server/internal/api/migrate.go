// Docs: docs/03 - Features/Import from NPM.md
package api

import (
	"archive/tar"
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"eztraefik/internal/auth"
	"eztraefik/internal/docker"
	"eztraefik/internal/npm"
	"eztraefik/internal/store"
	"eztraefik/internal/traefik"
)

// npmSession keeps what was read from NPM between the review and the import. In memory only: NPM tokens are never saved.
type npmSession struct {
	mu        sync.Mutex
	url       string
	email     string // the NPM account email, the default for a new Let's Encrypt resolver
	container string
	data      *npm.Data
	htpasswd  map[int][]string
	expires   time.Time
}

var npmSess npmSession

type npmDetected struct {
	Name         string `json:"name"`
	Image        string `json:"image"`
	State        string `json:"state"`
	HTTPPort     int    `json:"httpPort"`
	HTTPSPort    int    `json:"httpsPort"`
	AdminPort    int    `json:"adminPort"`
	SuggestedURL string `json:"suggestedUrl"`
}

// detectNPM finds Nginx Proxy Manager containers on this host and a URL eztraefik can reach their API on.
func (a *App) detectNPM(ctx context.Context) []npmDetected {
	list, err := a.Docker.Containers(ctx, true)
	if err != nil {
		return nil
	}
	gateway := ""
	if self, err := a.Docker.Inspect(ctx, hostname()); err == nil {
		for _, n := range self.NetworkSettings.Networks {
			if n.Gateway != "" {
				gateway = n.Gateway
				break
			}
		}
	}
	out := []npmDetected{}
	for _, c := range list {
		if !strings.Contains(c.Image, "nginx-proxy-manager") {
			continue
		}
		in, err := a.Docker.Inspect(ctx, c.ID)
		if err != nil {
			continue
		}
		d := npmDetected{Name: c.Name(), Image: c.Image, State: c.State,
			HTTPPort: in.HostPort("80/tcp"), HTTPSPort: in.HostPort("443/tcp"), AdminPort: in.HostPort("81/tcp")}
		if d.AdminPort > 0 && gateway != "" {
			d.SuggestedURL = fmt.Sprintf("http://%s:%d", gateway, d.AdminPort) // the host, seen from eztraefik's network
		}
		out = append(out, d)
	}
	return out
}

func (a *App) npmStatus(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	npmSess.mu.Lock()
	connected := npmSess.data != nil && time.Now().Before(npmSess.expires)
	url := npmSess.url
	npmSess.mu.Unlock()
	resp := map[string]any{"detected": a.detectNPM(r.Context()), "migration": st.Migration, "connected": connected, "url": url}
	if connected {
		resp["plan"] = a.npmPlan(nil, "")
	}
	ok(w, resp)
}

// readHtpasswd copies NPM's access list files (/data/access/<id>) out of its container: they hold the password hashes.
func (a *App) readHtpasswd(ctx context.Context, container string) (map[int][]string, error) {
	data, err := a.Docker.ArchiveRead(ctx, container, "/data/access")
	if err != nil {
		return nil, err
	}
	out := map[int][]string{}
	tr := tar.NewReader(bytes.NewReader(data))
	for {
		h, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return out, err
		}
		id, convErr := strconv.Atoi(path.Base(h.Name))
		if h.Typeflag != tar.TypeReg || convErr != nil {
			continue
		}
		sc := bufio.NewScanner(io.LimitReader(tr, 1<<20))
		for sc.Scan() {
			if l := strings.TrimSpace(sc.Text()); strings.Contains(l, ":") {
				out[id] = append(out[id], l)
			}
		}
	}
	return out, nil
}

func (a *App) npmConnect(w http.ResponseWriter, r *http.Request) {
	var in struct {
		URL, Email, Password, Challenge, Code, Container string
	}
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	if !strings.HasPrefix(in.URL, "http://") && !strings.HasPrefix(in.URL, "https://") {
		failErr(w, FieldError{"url", "Enter the address of NPM's admin panel, like http://192.0.2.10:81."})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	c := npm.New(in.URL)
	if _, err := c.Version(ctx); err != nil {
		failErr(w, FieldError{"url", err.Error()})
		return
	}
	if in.Challenge != "" {
		if err := c.Login2FA(ctx, in.Challenge, strings.TrimSpace(in.Code)); err != nil {
			failErr(w, FieldError{"code", "This code was not accepted. Use the current code from your app."})
			return
		}
	} else {
		challenge, err := c.Login(ctx, in.Email, in.Password)
		if err != nil {
			var ae *npm.APIError
			if errors.As(err, &ae) && ae.Status < 500 {
				failErr(w, FieldError{"password", "NPM rejected this email or password."})
				return
			}
			failErr(w, err)
			return
		}
		if challenge != "" {
			ok(w, map[string]any{"needs2fa": true, "challenge": challenge})
			return
		}
	}
	data, err := c.Fetch(ctx)
	if err != nil {
		failErr(w, err)
		return
	}
	warn := []string{}
	ht := map[int][]string{}
	if in.Container != "" && len(data.AccessLists) > 0 {
		if ht, err = a.readHtpasswd(ctx, in.Container); err != nil {
			warn = append(warn, "Could not read the access list passwords from the NPM container ("+err.Error()+"). You can type them in below.")
			ht = map[int][]string{}
		}
	}
	npmSess.mu.Lock()
	npmSess.url, npmSess.container, npmSess.data, npmSess.htpasswd, npmSess.expires = in.URL, in.Container, &data, ht, time.Now().Add(time.Hour)
	if in.Email != "" {
		npmSess.email = strings.TrimSpace(in.Email)
	}
	npmSess.mu.Unlock()
	ok(w, map[string]any{"plan": a.npmPlan(nil, ""), "version": data.Version, "warnings": warn})
}

func (a *App) npmPlan(passwords map[string]string, email string) *npm.Plan {
	npmSess.mu.Lock()
	defer npmSess.mu.Unlock()
	if npmSess.data == nil {
		return nil
	}
	containers, _ := a.Docker.Containers(context.Background(), true)
	// Recent NPM versions no longer keep the Let's Encrypt email in the certificate: default to the NPM account email.
	fallback := ""
	if email == "" {
		fallback = npmSess.email
	}
	p := npm.BuildPlan(*npmSess.data, a.Store.Get(), containers, npm.Options{Htpasswd: npmSess.htpasswd, Passwords: passwords, Hash: auth.APR1,
		ResolverEmail: email, FallbackEmail: fallback})
	return &p
}

func (a *App) npmReplan(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Passwords map[string]string `json:"passwords"`
		Email     string            `json:"resolverEmail"`
	}
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	p := a.npmPlan(in.Passwords, in.Email)
	if p == nil {
		fail(w, http.StatusConflict, "Connect to Nginx Proxy Manager first.")
		return
	}
	ok(w, map[string]any{"plan": p})
}

func (a *App) npmForget(w http.ResponseWriter, r *http.Request) {
	npmSess.mu.Lock()
	npmSess.data, npmSess.htpasswd, npmSess.url = nil, nil, ""
	npmSess.mu.Unlock()
	ok(w, map[string]any{})
}

// npmImport adds the selected items. Routes that fail eztraefik's validation are reported, the rest is saved.
func (a *App) npmImport(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Items     []string          `json:"items"`
		Passwords map[string]string `json:"passwords"`
		Email     string            `json:"resolverEmail"`
	}
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	p := a.npmPlan(in.Passwords, in.Email)
	if p == nil {
		fail(w, http.StatusConflict, "Connect to Nginx Proxy Manager first.")
		return
	}
	npmSess.mu.Lock()
	source, container := npmSess.url, npmSess.container
	npmSess.mu.Unlock()

	chosen := []npm.Item{}
	for _, it := range p.Items {
		if it.Action == "import" && it.Route != nil && slices.Contains(in.Items, it.ID) {
			chosen = append(chosen, it)
		}
	}
	if len(chosen) == 0 {
		failErr(w, FieldError{"items", "Select at least one item that can be imported."})
		return
	}
	// Copied certificates first: routes refer to them.
	certIDs := map[int]string{}
	for _, it := range chosen {
		for _, cid := range it.Certs {
			if _, done := certIDs[cid]; done {
				continue
			}
			c := p.Certs[cid]
			if _, err := traefik.ValidatePair([]byte(c.Meta.Certificate), []byte(c.Meta.CertificateKey)); err != nil {
				failErr(w, fmt.Errorf("certificate %s from NPM is not a valid pair: %w", c.NiceName, err))
				return
			}
			id := store.NewID()
			if err := store.WriteFileAtomic(a.Cfg.SharedDir+"/certs/"+id+".crt", []byte(c.Meta.Certificate), 0o644); err != nil {
				failErr(w, err)
				return
			}
			if err := store.WriteFileAtomic(a.Cfg.SharedDir+"/certs/"+id+".key", []byte(c.Meta.CertificateKey), 0o600); err != nil {
				failErr(w, err)
				return
			}
			certIDs[cid] = id
		}
	}

	type failed struct {
		ID, Source, Error string
	}
	var fails []failed
	imported := 0
	connect := []string{}
	_, warnings, err := a.Commit(r, "Imported from Nginx Proxy Manager", func(st *store.State) error {
		for cid, id := range certIDs {
			c := p.Certs[cid]
			leaf, _ := traefik.ValidatePair([]byte(c.Meta.Certificate), []byte(c.Meta.CertificateKey))
			st.Certificates = append(st.Certificates, store.UploadedCert{ID: id, Name: "NPM: " + c.NiceName, Domains: traefik.CertNames(leaf), NotAfter: leaf.NotAfter, Issuer: leaf.Issuer.CommonName})
		}
		usesResolver := false
		streamPorts := map[string]int{}
		for _, it := range chosen {
			usesResolver = usesResolver || it.UsesResolver
			for _, ep := range it.Entrypoints {
				if e, isNew := p.Entrypoints[ep]; isNew && !hasEntrypoint(st, ep) {
					st.Traefik.Entrypoints = append(st.Traefik.Entrypoints, e)
					streamPorts[ep] = p.StreamPorts[ep]
				}
			}
			for _, m := range it.Middlewares {
				if def, isNew := p.Middlewares[m]; isNew && !slices.ContainsFunc(st.Middlewares, func(x store.Middleware) bool { return x.Name == m }) {
					def.ID, def.UpdatedAt = store.NewID(), time.Now().UTC()
					st.Middlewares = append(st.Middlewares, def)
				}
			}
		}
		if usesResolver && p.Resolver != nil && !hasResolver(st, p.Resolver.Name) {
			st.Traefik.Resolvers = append(st.Traefik.Resolvers, *p.Resolver)
			st.Traefik.Env = append(st.Traefik.Env, p.ResolverEnv...)
		}
		for _, it := range chosen {
			rt := *it.Route
			rt.ID, rt.UpdatedAt = store.NewID(), time.Now().UTC()
			if err := a.validateRoute(st, &rt); err != nil {
				fails = append(fails, failed{it.ID, it.Source, err.Error()})
				continue
			}
			st.Routes = append(st.Routes, rt)
			imported++
			if rt.Target.Kind == "docker" {
				connect = append(connect, rt.Target.Container)
			}
		}
		if imported == 0 {
			return FieldError{"items", "Nothing could be imported: " + fails[0].Error}
		}
		m := st.Migration
		if m == nil {
			m = &store.Migration{StreamPorts: map[string]int{}}
		}
		m.Source, m.NPMContainer, m.ImportedAt, m.Imported = source, container, time.Now().UTC(), imported
		for k, v := range streamPorts {
			m.StreamPorts[k] = v
		}
		st.Migration = m
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	st := a.Store.Get()
	for _, c := range dedupe(connect) {
		if err := a.Docker.Connect(r.Context(), st.Traefik.Network, c); err != nil {
			warnings = append(warnings, fmt.Sprintf("Could not connect %s to the %s network: %v", c, st.Traefik.Network, err))
		}
	}
	ok(w, map[string]any{"imported": imported, "failed": fails, "warnings": warnings, "pending": traefik.Hash(st.Traefik) != a.currentHash(r.Context())})
}

func dedupe(ss []string) []string {
	slices.Sort(ss)
	return slices.Compact(ss)
}

func (a *App) currentHash(ctx context.Context) string {
	s, _ := a.Manager.Status(ctx, a.Store.Get().Traefik.ContainerName)
	return s.ConfigHash
}

// npmSwitch moves NPM's published ports to Traefik: NPM is stopped (kept), Traefik is recreated on its ports.
// If Traefik does not start, NPM is started again and the ports go back.
func (a *App) npmSwitch(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	m := st.Migration
	if m == nil || m.NPMContainer == "" {
		fail(w, http.StatusConflict, "Switching needs an import from an NPM container on this Docker host.")
		return
	}
	if m.SwitchedAt != nil {
		fail(w, http.StatusConflict, "Traffic already goes to Traefik.")
		return
	}
	ctx := r.Context()
	npmC, err := a.Docker.Inspect(ctx, m.NPMContainer)
	if err != nil {
		fail(w, http.StatusBadGateway, "NPM container not found: "+err.Error())
		return
	}
	want := map[string]int{"web": npmC.HostPort("80/tcp"), "websecure": npmC.HostPort("443/tcp")}
	for ep, port := range m.StreamPorts {
		proto := "tcp"
		if strings.HasPrefix(ep, "npm-udp-") {
			proto = "udp"
		}
		hp := npmC.HostPort(fmt.Sprintf("%d/%s", port, proto))
		if hp == 0 {
			hp = port
		}
		want[ep] = hp
	}
	if want["web"] == 0 && want["websecure"] == 0 {
		fail(w, http.StatusConflict, "The NPM container does not publish ports 80 or 443, so there is nothing to take over.")
		return
	}
	previous := map[string]int{}
	_, err = a.Store.Update(userOf(r), "Switch traffic from NPM to Traefik", func(s *store.State) error {
		for i, e := range s.Traefik.Entrypoints {
			if hp, ok := want[e.Name]; ok && hp > 0 {
				previous[e.Name] = e.HostPort
				s.Traefik.Entrypoints[i].HostPort = hp
			}
		}
		s.Migration.PreviousPorts = previous
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	if err := a.Docker.Stop(ctx, m.NPMContainer, 10); err != nil {
		a.restorePorts(r, previous)
		fail(w, http.StatusBadGateway, "Could not stop NPM: "+err.Error())
		return
	}
	if err := a.ApplyTraefik(ctx, userOf(r)); err != nil {
		// Give the ports back to NPM.
		a.restorePorts(r, previous)
		_ = a.ApplyTraefik(context.WithoutCancel(ctx), userOf(r))
		_ = a.Docker.Start(context.WithoutCancel(ctx), m.NPMContainer)
		fail(w, http.StatusBadGateway, "Traefik could not take NPM's ports, NPM was started again: "+err.Error())
		return
	}
	now := time.Now().UTC()
	_, _ = a.Store.Update(userOf(r), "Traffic switched to Traefik", func(s *store.State) error {
		s.Migration.SwitchedAt = &now
		return nil
	})
	ok(w, map[string]any{"ports": want})
}

func (a *App) restorePorts(r *http.Request, previous map[string]int) {
	_, _ = a.Store.Update(userOf(r), "Ports given back to NPM", func(s *store.State) error {
		for i, e := range s.Traefik.Entrypoints {
			if hp, ok := previous[e.Name]; ok {
				s.Traefik.Entrypoints[i].HostPort = hp
			}
		}
		if s.Migration != nil {
			s.Migration.SwitchedAt, s.Migration.PreviousPorts = nil, nil
		}
		return nil
	})
}

// npmSwitchBack gives the ports back to NPM and starts it. Imported routes stay in eztraefik.
func (a *App) npmSwitchBack(w http.ResponseWriter, r *http.Request) {
	m := a.Store.Get().Migration
	if m == nil || m.SwitchedAt == nil {
		fail(w, http.StatusConflict, "Traffic is not switched to Traefik.")
		return
	}
	a.restorePorts(r, m.PreviousPorts)
	if err := a.ApplyTraefik(r.Context(), userOf(r)); err != nil {
		fail(w, http.StatusBadGateway, "Traefik could not release the ports: "+err.Error())
		return
	}
	if err := a.Docker.Start(r.Context(), m.NPMContainer); err != nil && !isNotModified(err) {
		fail(w, http.StatusBadGateway, "Ports released, but NPM did not start: "+err.Error())
		return
	}
	ok(w, map[string]any{})
}

func isNotModified(err error) bool {
	var de *docker.Error
	return errors.As(err, &de) && de.Status == http.StatusNotModified
}

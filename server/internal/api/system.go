// Docs: docs/03 - Features/Traefik Container.md, docs/03 - Features/Entrypoints.md, docs/03 - Features/Docker.md
package api

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"

	"eztraefik/internal/docker"
	"eztraefik/internal/store"
	"eztraefik/internal/traefik"
)

var envKeyRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)
var dnsProviderRe = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]*$`)

// validateTraefik checks the install config before it is saved.
func validateTraefik(cfg *store.TraefikConfig) error {
	if strings.TrimSpace(cfg.Image) == "" {
		return FieldError{"image", "Enter the Traefik image, for example traefik:v3.7.16."}
	}
	if !nameRe.MatchString(cfg.ContainerName) {
		return FieldError{"containerName", "Use lowercase letters, numbers and dashes."}
	}
	if !nameRe.MatchString(cfg.Network) {
		return FieldError{"network", "Use lowercase letters, numbers and dashes."}
	}
	seen := map[string]bool{"traefik": true}
	ports := map[string]string{fmt.Sprintf("%d/tcp", traefik.APIPort): "traefik (internal)"}
	hostPorts := map[string]string{}
	for i := range cfg.Entrypoints {
		e := &cfg.Entrypoints[i]
		e.Name = strings.TrimSpace(strings.ToLower(e.Name))
		if !nameRe.MatchString(e.Name) {
			return FieldError{"entrypoints", fmt.Sprintf("Entrypoint name %q: use lowercase letters, numbers and dashes.", e.Name)}
		}
		if seen[e.Name] {
			return FieldError{"entrypoints", fmt.Sprintf("The name %s is used twice (traefik is reserved).", e.Name)}
		}
		seen[e.Name] = true
		if e.Protocol != "udp" {
			e.Protocol = "tcp"
		}
		if e.Port < 1 || e.Port > 65535 {
			return FieldError{"entrypoints", fmt.Sprintf("Entrypoint %s: port must be between 1 and 65535.", e.Name)}
		}
		k := fmt.Sprintf("%d/%s", e.Port, e.Protocol)
		if other, dup := ports[k]; dup {
			return FieldError{"entrypoints", fmt.Sprintf("Entrypoints %s and %s both use %s.", e.Name, other, k)}
		}
		ports[k] = e.Name
		if e.HostPort != 0 {
			if e.HostPort < 1 || e.HostPort > 65535 {
				return FieldError{"entrypoints", fmt.Sprintf("Entrypoint %s: published port must be between 1 and 65535.", e.Name)}
			}
			hk := fmt.Sprintf("%d/%s", e.HostPort, e.Protocol)
			if other, dup := hostPorts[hk]; dup {
				return FieldError{"entrypoints", fmt.Sprintf("Entrypoints %s and %s are both published on %s.", e.Name, other, hk)}
			}
			hostPorts[hk] = e.Name
		}
		if e.Protocol == "udp" && (e.RedirectTo != "" || e.DefaultResolver != "" || e.HTTP3) {
			e.RedirectTo, e.DefaultResolver, e.HTTP3 = "", "", false
		}
	}
	for _, e := range cfg.Entrypoints {
		if e.RedirectTo != "" && !slices.ContainsFunc(cfg.Entrypoints, func(x store.Entrypoint) bool { return x.Name == e.RedirectTo }) {
			return FieldError{"entrypoints", fmt.Sprintf("Entrypoint %s redirects to %s, which does not exist.", e.Name, e.RedirectTo)}
		}
	}
	rseen := map[string]bool{}
	for i := range cfg.Resolvers {
		r := &cfg.Resolvers[i]
		r.Name = strings.TrimSpace(strings.ToLower(r.Name))
		if !nameRe.MatchString(r.Name) || rseen[r.Name] {
			return FieldError{"resolvers", fmt.Sprintf("Resolver name %q must be unique, lowercase letters, numbers and dashes.", r.Name)}
		}
		rseen[r.Name] = true
		if !strings.Contains(r.Email, "@") {
			return FieldError{"resolvers", fmt.Sprintf("Resolver %s needs an email address for expiry notices.", r.Name)}
		}
		switch r.Challenge {
		case "dns":
			if r.DNSProvider == "" {
				return FieldError{"resolvers", fmt.Sprintf("Resolver %s: choose the DNS provider (its credentials go in environment variables).", r.Name)}
			}
			if !dnsProviderRe.MatchString(r.DNSProvider) {
				return FieldError{"resolvers", fmt.Sprintf("Resolver %s: %q is not a DNS provider code.", r.Name, r.DNSProvider)}
			}
			if r.PropagationSeconds < 0 || r.PropagationSeconds > 86400 {
				return FieldError{"resolvers", fmt.Sprintf("Resolver %s: Propagation Seconds must be between 0 and 86400.", r.Name)}
			}
		case "tls":
		default:
			r.Challenge = "http"
			if r.HTTPEntry == "" {
				r.HTTPEntry = "web"
			}
			if !seen[r.HTTPEntry] {
				return FieldError{"resolvers", fmt.Sprintf("Resolver %s uses entrypoint %s for the HTTP challenge, which does not exist.", r.Name, r.HTTPEntry)}
			}
		}
	}
	for _, e := range cfg.Entrypoints {
		if e.DefaultResolver != "" && !rseen[e.DefaultResolver] {
			return FieldError{"entrypoints", fmt.Sprintf("Entrypoint %s uses resolver %s, which does not exist.", e.Name, e.DefaultResolver)}
		}
	}
	for _, e := range cfg.Env {
		if !envKeyRe.MatchString(e.Key) {
			return FieldError{"env", fmt.Sprintf("%q is not a valid variable name.", e.Key)}
		}
	}
	for _, f := range cfg.ExtraFlags {
		if !strings.HasPrefix(f, "--") {
			return FieldError{"extraFlags", fmt.Sprintf("%q must start with --.", f)}
		}
	}
	lv := strings.ToUpper(cfg.LogLevel)
	if !slices.Contains([]string{"TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "PANIC"}, lv) {
		lv = "INFO"
	}
	cfg.LogLevel = lv
	if cfg.DashboardPort < 0 || cfg.DashboardPort > 65535 {
		return FieldError{"dashboardPort", "Port must be between 1 and 65535, or empty."}
	}
	return nil
}

// masked hides secret env values in responses.
func masked(cfg store.TraefikConfig) store.TraefikConfig {
	env := make([]store.EnvVar, len(cfg.Env))
	for i, e := range cfg.Env {
		env[i] = e
		if e.Secret && e.Value != "" {
			env[i].Value = ""
		}
	}
	cfg.Env = env
	return cfg
}

func maskFlags(cfg store.TraefikConfig) []string { return traefik.Flags(cfg) }

func maskEnv(cfg store.TraefikConfig) []string {
	out := []string{}
	secret := map[string]bool{}
	for _, e := range cfg.Env {
		secret[e.Key] = e.Secret
	}
	for _, kv := range traefik.Env(cfg) {
		k, _, _ := strings.Cut(kv, "=")
		if secret[k] {
			out = append(out, k+"=********")
		} else {
			out = append(out, kv)
		}
	}
	return out
}

func diffLines(oldL, newL []string) (added, removed []string) {
	o := map[string]bool{}
	for _, l := range oldL {
		o[l] = true
	}
	n := map[string]bool{}
	for _, l := range newL {
		n[l] = true
		if !o[l] {
			added = append(added, l)
		}
	}
	for _, l := range oldL {
		if !n[l] {
			removed = append(removed, l)
		}
	}
	return
}

func (a *App) getTraefik(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
	defer cancel()
	status, err := a.Manager.Status(ctx, st.Traefik.ContainerName)
	statusErr := ""
	if err != nil {
		statusErr = err.Error()
	}
	var version *traefik.Version
	if v, err := a.API.Version(ctx); err == nil {
		version = &v
	}
	pending := status.ConfigHash != traefik.Hash(st.Traefik)
	resp := map[string]any{
		"config": masked(st.Traefik), "status": status, "statusError": statusErr, "version": version,
		"pending": pending && status.Exists, "flags": maskFlags(st.Traefik), "env": maskEnv(st.Traefik),
	}
	if st.Applied != nil && pending {
		af, rf := diffLines(maskFlags(*st.Applied), maskFlags(st.Traefik))
		ae, re := diffLines(maskEnv(*st.Applied), maskEnv(st.Traefik))
		resp["diff"] = map[string]any{"addedFlags": af, "removedFlags": rf, "addedEnv": ae, "removedEnv": re,
			"imageFrom": st.Applied.Image, "imageTo": st.Traefik.Image}
	}
	ok(w, resp)
}

func (a *App) putTraefik(w http.ResponseWriter, r *http.Request) {
	var in store.TraefikConfig
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	st, err := a.Store.Update(userOf(r), "Traefik settings changed", func(st *store.State) error {
		// Secrets come back empty from GET; keep the stored value when the user did not type a new one.
		for i, e := range in.Env {
			if e.Secret && e.Value == "" {
				for _, old := range st.Traefik.Env {
					if old.Key == e.Key {
						in.Env[i].Value = old.Value
					}
				}
			}
		}
		// A deleted resolver leaves the entrypoints, routes and domains that used it, not the other way round.
		removed := []string{}
		for _, old := range st.Traefik.Resolvers {
			if !slices.ContainsFunc(in.Resolvers, func(x store.Resolver) bool { return x.Name == old.Name }) {
				removed = append(removed, old.Name)
			}
		}
		for i := range in.Entrypoints {
			if slices.Contains(removed, in.Entrypoints[i].DefaultResolver) {
				in.Entrypoints[i].DefaultResolver = ""
			}
		}
		if err := validateTraefik(&in); err != nil {
			return err
		}
		for _, name := range removed {
			detachResolver(st, name)
		}
		// Routes may point at entrypoints that were renamed or removed.
		for _, rt := range st.Routes {
			for _, ep := range rt.Entrypoints {
				if !slices.ContainsFunc(in.Entrypoints, func(e store.Entrypoint) bool { return e.Name == ep }) {
					return FieldError{"entrypoints", fmt.Sprintf("Route %s uses entrypoint %s. Change the route first.", rt.Name, ep)}
				}
			}
			if rt.Protocol == "http" && !rt.TLS.Enabled && rt.Enabled {
				for _, e := range in.Entrypoints {
					if e.RedirectTo != "" && slices.Contains(rt.Entrypoints, e.Name) {
						return FieldError{"entrypoints", fmt.Sprintf("Route %s answers over plain HTTP on %s. A redirect there would break it: turn on HTTPS for the route first.", rt.Name, e.Name)}
					}
				}
			}
		}
		st.Traefik = in
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	_ = a.WriteDynamic(st) // redirect ports depend on entrypoints
	ok(w, map[string]any{"config": masked(st.Traefik)})
}

// applyTraefik recreates the container with the saved config.
func (a *App) applyTraefik(w http.ResponseWriter, r *http.Request) {
	if err := a.ApplyTraefik(r.Context(), userOf(r)); err != nil {
		fail(w, http.StatusBadGateway, err.Error())
		return
	}
	ok(w, map[string]any{})
}

func (a *App) ApplyTraefik(ctx context.Context, user string) error {
	a.applyMu.Lock()
	defer a.applyMu.Unlock()
	st := a.Store.Get()
	if err := a.WriteDynamic(st); err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Minute)
	defer cancel()
	if err := a.Manager.Apply(ctx, st.Traefik); err != nil {
		return err
	}
	applied := st.Traefik
	_, err := a.Store.Update(user, "Traefik container recreated", func(s *store.State) error {
		s.Applied = &applied
		return nil
	})
	return err
}

func (a *App) restartTraefik(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	ctx, cancel := context.WithTimeout(r.Context(), time.Minute)
	defer cancel()
	if err := a.Docker.Restart(ctx, st.Traefik.ContainerName); err != nil {
		fail(w, http.StatusBadGateway, err.Error())
		return
	}
	ok(w, map[string]any{})
}

// ---------- Docker ----------

type ContainerInfo struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Image        string            `json:"image"`
	State        string            `json:"state"`
	Status       string            `json:"status"`
	Networks     []string          `json:"networks"`
	Ports        []docker.Port     `json:"ports"`
	Labels       map[string]string `json:"traefikLabels"`
	Reachable    bool              `json:"reachable"` // shares the Traefik network
	Role         string            `json:"role,omitempty"`
	Routes       []string          `json:"routes"`
	ExposedPorts []int             `json:"exposedPorts"`
}

func (a *App) listContainers(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	list, err := a.Docker.Containers(r.Context(), true)
	if err != nil {
		fail(w, http.StatusBadGateway, "Docker is not reachable: "+err.Error())
		return
	}
	out := []ContainerInfo{}
	for _, c := range list {
		ci := ContainerInfo{ID: c.ID[:12], Name: c.Name(), Image: c.Image, State: c.State, Status: c.Status,
			Networks: []string{}, Ports: c.Ports, Labels: map[string]string{}, Role: c.Labels["ezt.role"], Routes: []string{}, ExposedPorts: []int{}}
		for n := range c.NetworkSettings.Networks {
			ci.Networks = append(ci.Networks, n)
			if n == st.Traefik.Network {
				ci.Reachable = true
			}
		}
		slices.Sort(ci.Networks)
		for k, v := range c.Labels {
			if strings.HasPrefix(k, "traefik.") {
				ci.Labels[k] = v
			}
		}
		seenPort := map[int]bool{}
		for _, p := range c.Ports {
			if p.Type == "tcp" && !seenPort[p.PrivatePort] {
				seenPort[p.PrivatePort] = true
				ci.ExposedPorts = append(ci.ExposedPorts, p.PrivatePort)
			}
		}
		slices.Sort(ci.ExposedPorts)
		for _, rt := range st.Routes {
			if rt.Target.Kind == "docker" && rt.Target.Container == ci.Name {
				ci.Routes = append(ci.Routes, rt.Name)
			}
		}
		out = append(out, ci)
	}
	slices.SortFunc(out, func(x, y ContainerInfo) int { return strings.Compare(x.Name, y.Name) })
	ok(w, map[string]any{"containers": out, "network": st.Traefik.Network})
}

func (a *App) connectContainer(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	if err := a.Docker.Connect(r.Context(), st.Traefik.Network, r.PathValue("id")); err != nil {
		fail(w, http.StatusBadGateway, err.Error())
		return
	}
	ok(w, map[string]any{})
}

func (a *App) listNetworks(w http.ResponseWriter, r *http.Request) {
	nets, err := a.Docker.Networks(r.Context())
	if err != nil {
		fail(w, http.StatusBadGateway, err.Error())
		return
	}
	type n struct {
		Name       string `json:"name"`
		Driver     string `json:"driver"`
		Containers int    `json:"containers"`
	}
	out := []n{}
	for _, x := range nets {
		out = append(out, n{x.Name, x.Driver, len(x.Containers)})
	}
	ok(w, map[string]any{"networks": out})
}

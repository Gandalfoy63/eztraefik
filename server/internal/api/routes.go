// Docs: docs/03 - Features/Routes.md
package api

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"

	"eztraefik/internal/store"
	"eztraefik/internal/traefik"
)

var (
	nameRe = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)
	hostRe = regexp.MustCompile(`^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$|^localhost$`)
)

// RuntimeRouter is a router as Traefik sees it, from any provider.
type RuntimeRouter struct {
	Name        string   `json:"name"`
	Provider    string   `json:"provider"`
	Protocol    string   `json:"protocol"`
	Rule        string   `json:"rule"`
	EntryPoints []string `json:"entryPoints"`
	Service     string   `json:"service"`
	Middlewares []string `json:"middlewares"`
	TLS         bool     `json:"tls"`
	Status      string   `json:"status"`
	Errors      []string `json:"errors"`
}

func splitProvider(full string) (string, string) {
	if i := strings.LastIndex(full, "@"); i > 0 {
		return full[:i], full[i+1:]
	}
	return full, ""
}

func (a *App) runtimeRouters(ctx context.Context) ([]RuntimeRouter, bool) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	raw, err := a.API.RawData(ctx)
	if err != nil {
		return nil, false
	}
	out := []RuntimeRouter{}
	add := func(proto string, m map[string]traefik.RawRouter) {
		for full, v := range m {
			name, prov := splitProvider(full)
			if prov == "internal" {
				continue
			}
			out = append(out, RuntimeRouter{Name: name, Provider: prov, Protocol: proto, Rule: v.Rule, EntryPoints: v.EntryPoints,
				Service: v.Service, Middlewares: v.Middlewares, TLS: len(v.TLS) > 0 && string(v.TLS) != "null", Status: v.Status, Errors: v.Error})
		}
	}
	add("http", raw.Routers)
	add("tcp", raw.TCPRouters)
	add("udp", raw.UDPRouters)
	slices.SortFunc(out, func(x, y RuntimeRouter) int { return strings.Compare(x.Name, y.Name) })
	return out, true
}

func (a *App) listRoutes(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	rt, reachable := a.runtimeRouters(r.Context())
	byName := map[string]RuntimeRouter{}
	external := []RuntimeRouter{}
	for _, x := range rt {
		if x.Provider == "file" {
			byName[x.Name] = x
		} else {
			external = append(external, x)
		}
	}
	type item struct {
		store.Route
		Rule    string         `json:"rule"`
		Runtime *RuntimeRouter `json:"runtime,omitempty"`
	}
	items := []item{}
	for _, rt := range st.Routes {
		it := item{Route: rt, Rule: traefik.Rule(rt)}
		if x, ok := byName[rt.Name]; ok {
			it.Runtime = &x
		}
		items = append(items, it)
	}
	ok(w, map[string]any{"routes": items, "external": external, "traefikReachable": reachable})
}

func (a *App) validateRoute(st *store.State, rt *store.Route) error {
	rt.Name = strings.TrimSpace(strings.ToLower(rt.Name))
	if !nameRe.MatchString(rt.Name) {
		return FieldError{"name", "Use lowercase letters, numbers and dashes, starting and ending with a letter or number."}
	}
	if strings.HasPrefix(rt.Name, "ezt-") {
		return FieldError{"name", "Names starting with ezt- are reserved."}
	}
	for _, o := range st.Routes {
		if o.Name == rt.Name && o.ID != rt.ID {
			return FieldError{"name", "Another route already uses this name."}
		}
	}
	if !slices.Contains([]string{"http", "tcp", "udp"}, rt.Protocol) {
		rt.Protocol = "http"
	}
	hosts := []string{}
	for _, h := range rt.Hosts {
		h = strings.TrimSpace(strings.ToLower(h))
		if h == "" {
			continue
		}
		if !hostRe.MatchString(h) {
			return FieldError{"hosts", fmt.Sprintf("%q doesn't look like a domain, for example app.example.com.", h)}
		}
		hosts = append(hosts, h)
	}
	rt.Hosts = hosts
	if rt.Protocol == "http" && len(hosts) == 0 && strings.TrimSpace(rt.RawRule) == "" && strings.TrimSpace(rt.PathPrefix) == "" {
		return FieldError{"hosts", "Enter the domain visitors will use."}
	}
	if rt.PathPrefix != "" && !strings.HasPrefix(rt.PathPrefix, "/") {
		return FieldError{"pathPrefix", "A path starts with /."}
	}

	// Target
	switch rt.Target.Kind {
	case "docker":
		if strings.TrimSpace(rt.Target.Container) == "" {
			return FieldError{"target", "Choose the container to forward to."}
		}
	case "ip":
		addr := strings.TrimSpace(rt.Target.Address)
		addr = strings.TrimPrefix(strings.TrimPrefix(addr, "http://"), "https://")
		addr = strings.TrimSuffix(addr, "/")
		if addr == "" {
			return FieldError{"target", "Enter an IP address or hostname."}
		}
		if net.ParseIP(strings.Trim(addr, "[]")) == nil && !regexp.MustCompile(`^[a-zA-Z0-9.-]+$`).MatchString(addr) {
			return FieldError{"target", "Enter an IP address or hostname, without a port or path."}
		}
		rt.Target.Address = addr
	case "service":
		// Provider-qualified names (noop@internal, api@docker) are Traefik's own; anything else must be a shared service.
		found := strings.Contains(rt.Target.Service, "@")
		for _, s := range st.Services {
			if s.Name == rt.Target.Service && s.Protocol == rt.Protocol {
				found = true
			}
		}
		if !found {
			return FieldError{"target", "Choose a service with the same protocol as the route."}
		}
	default:
		return FieldError{"target", "Choose where to forward traffic."}
	}
	if rt.Target.Kind != "service" {
		if rt.Target.Port < 1 || rt.Target.Port > 65535 {
			return FieldError{"port", "Port must be between 1 and 65535."}
		}
		for _, s := range st.Services {
			if s.Name == rt.Name {
				return FieldError{"name", "A service already has this name. Pick another route name."}
			}
		}
		if rt.Target.Scheme != "https" {
			rt.Target.Scheme = "http"
		}
	}

	// Entrypoints default to what the protocol and TLS imply.
	eps := []string{}
	for _, e := range rt.Entrypoints {
		for _, ce := range st.Traefik.Entrypoints {
			if ce.Name == e {
				wantUDP := rt.Protocol == "udp"
				if (ce.Protocol == "udp") != wantUDP {
					return FieldError{"entrypoints", fmt.Sprintf("Entrypoint %s is %s, this route is %s.", e, strings.ToUpper(ce.Protocol), strings.ToUpper(rt.Protocol))}
				}
				eps = append(eps, e)
			}
		}
	}
	if len(eps) == 0 {
		switch {
		case rt.Protocol == "udp":
			return FieldError{"entrypoints", "Choose the UDP entrypoint (port) this route listens on."}
		case rt.Protocol == "tcp":
			return FieldError{"entrypoints", "Choose the entrypoint (port) this route listens on."}
		case rt.TLS.Enabled && hasEntrypoint(st, "websecure"):
			eps = []string{"websecure"}
		case hasEntrypoint(st, "web"):
			eps = []string{"web"}
		default:
			return FieldError{"entrypoints", "Choose at least one entrypoint."}
		}
	}
	rt.Entrypoints = eps
	// An entrypoint-wide redirect sends everything to HTTPS, so a route without HTTPS there would never answer.
	if rt.Protocol == "http" && !rt.TLS.Enabled {
		for _, e := range st.Traefik.Entrypoints {
			if e.RedirectTo != "" && slices.Contains(eps, e.Name) {
				return FieldError{"entrypoints", fmt.Sprintf("Entrypoint %s redirects every request to HTTPS, so this route would never answer over HTTP. Turn on HTTPS, or turn off that redirect in Entrypoints.", e.Name)}
			}
		}
	}

	for _, m := range rt.Middlewares {
		if !strings.Contains(m, "@") && !hasMiddleware(st, m, rt.Protocol) {
			return FieldError{"middlewares", fmt.Sprintf("Middleware %s does not exist.", m)}
		}
	}
	if rt.Protocol == "udp" {
		rt.TLS = store.RouteTLS{}
		rt.Middlewares = nil
	}
	if rt.TLS.Enabled {
		switch rt.TLS.Mode {
		case "passthrough":
			if rt.Protocol != "tcp" {
				return FieldError{"tls", "Passthrough is only for TCP routes."}
			}
		case "existing":
			if rt.TLS.Domain == "" {
				return FieldError{"tls", "Choose a certificate."}
			}
		default:
			rt.TLS.Mode = "resolver"
			if rt.TLS.Resolver == "" && len(st.Traefik.Resolvers) > 0 {
				rt.TLS.Resolver = st.Traefik.Resolvers[0].Name
			}
			if rt.TLS.Resolver != "" && !hasResolver(st, rt.TLS.Resolver) {
				return FieldError{"tls", "This certificate resolver does not exist."}
			}
		}
	}
	return nil
}

func hasEntrypoint(st *store.State, name string) bool {
	return slices.ContainsFunc(st.Traefik.Entrypoints, func(e store.Entrypoint) bool { return e.Name == name })
}

func hasResolver(st *store.State, name string) bool {
	return slices.ContainsFunc(st.Traefik.Resolvers, func(e store.Resolver) bool { return e.Name == name })
}

func hasMiddleware(st *store.State, name, proto string) bool {
	return slices.ContainsFunc(st.Middlewares, func(m store.Middleware) bool {
		return m.Name == name && (m.Protocol == proto || (proto == "http" && m.Protocol == ""))
	})
}

func (a *App) saveRoute(w http.ResponseWriter, r *http.Request) {
	var in store.Route
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	id := r.PathValue("id")
	connect := ""
	verb := "created"
	if id != "" {
		verb = "updated"
	}
	st, warnings, err := a.Commit(r, fmt.Sprintf("Route %s %s", strings.ToLower(strings.TrimSpace(in.Name)), verb), func(st *store.State) error {
		if id == "" {
			in.ID = store.NewID()
		} else {
			in.ID = id
			idx := slices.IndexFunc(st.Routes, func(x store.Route) bool { return x.ID == id })
			if idx < 0 {
				return notFound("Route not found.")
			}
		}
		if err := a.validateRoute(st, &in); err != nil {
			return err
		}
		in.UpdatedAt = time.Now().UTC()
		if idx := slices.IndexFunc(st.Routes, func(x store.Route) bool { return x.ID == in.ID }); idx >= 0 {
			st.Routes[idx] = in
		} else {
			st.Routes = append(st.Routes, in)
		}
		if in.Target.Kind == "docker" {
			connect = in.Target.Container
		}
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	// Traefik can only reach a container that shares its network.
	if connect != "" {
		if err := a.Docker.Connect(r.Context(), st.Traefik.Network, connect); err != nil {
			warnings = append(warnings, fmt.Sprintf("Could not connect %s to the %s network: %v", connect, st.Traefik.Network, err))
		}
	}
	var saved store.Route
	for _, x := range st.Routes {
		if x.ID == in.ID {
			saved = x
		}
	}
	ok(w, map[string]any{"route": saved, "warnings": warnings})
}

func (a *App) deleteRoute(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, warnings, err := a.Commit(r, "Route "+a.routeName(id)+" deleted", func(st *store.State) error {
		idx := slices.IndexFunc(st.Routes, func(x store.Route) bool { return x.ID == id })
		if idx < 0 {
			return notFound("Route not found.")
		}
		st.Routes = slices.Delete(st.Routes, idx, idx+1)
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	ok(w, map[string]any{"warnings": warnings})
}

// previewRoute returns the YAML a draft route would produce, without saving.
func (a *App) previewRoute(w http.ResponseWriter, r *http.Request) {
	var in store.Route
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	st := a.Store.Get()
	in.Enabled = true
	if in.Name == "" {
		in.Name = "new-route"
	}
	_ = a.validateRoute(&st, &in) // fills defaults; errors are shown when saving
	only := store.State{Traefik: st.Traefik, Routes: []store.Route{in}, Certificates: nil}
	out := traefik.Render(only)
	delete(out, "tls")
	ok(w, map[string]any{"yaml": traefik.ToYAML(out)})
}

func (a *App) routeName(id string) string {
	for _, x := range a.Store.Get().Routes {
		if x.ID == id {
			return x.Name
		}
	}
	return id
}

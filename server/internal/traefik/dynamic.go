// Docs: docs/04 - Architecture/Dynamic Config.md
// Reference: docs/00 - Downloaded Docs/Traefik/reference/routing-configuration/
package traefik

import (
	"fmt"
	"strings"

	"eztraefik/internal/store"
)

// SharedInTraefik is where the shared volume is mounted inside the Traefik container.
const SharedInTraefik = "/etc/eztraefik"

const redirectMiddleware = "ezt-redirect-https"

// Rule builds the router rule for a route.
func Rule(r store.Route) string {
	if strings.TrimSpace(r.RawRule) != "" {
		return r.RawRule
	}
	switch r.Protocol {
	case "tcp":
		if len(r.Hosts) == 0 {
			return "HostSNI(`*`)"
		}
		parts := make([]string, len(r.Hosts))
		for i, h := range r.Hosts {
			parts[i] = fmt.Sprintf("HostSNI(`%s`)", h)
		}
		return strings.Join(parts, " || ")
	case "udp":
		return ""
	}
	parts := make([]string, 0, len(r.Hosts))
	for _, h := range r.Hosts {
		parts = append(parts, fmt.Sprintf("Host(`%s`)", h))
	}
	rule := strings.Join(parts, " || ")
	if len(parts) > 1 {
		rule = "(" + rule + ")"
	}
	if p := strings.TrimSpace(r.PathPrefix); p != "" && p != "/" {
		if rule == "" {
			return fmt.Sprintf("PathPrefix(`%s`)", p)
		}
		rule += fmt.Sprintf(" && PathPrefix(`%s`)", p)
	}
	if rule == "" {
		rule = "PathPrefix(`/`)"
	}
	return rule
}

// ServiceName is the Traefik service a route sends traffic to.
func ServiceName(r store.Route) string {
	if r.Target.Kind == "service" {
		return r.Target.Service
	}
	return r.Name
}

// TargetURL is the server address of a route that points at a container or an IP.
func TargetURL(r store.Route) string {
	host := r.Target.Address
	if r.Target.Kind == "docker" {
		host = r.Target.Container
	}
	addr := fmt.Sprintf("%s:%d", host, r.Target.Port)
	if strings.Contains(host, ":") && !strings.HasPrefix(host, "[") { // IPv6
		addr = fmt.Sprintf("[%s]:%d", host, r.Target.Port)
	}
	if r.Protocol != "http" {
		return addr
	}
	scheme := r.Target.Scheme
	if scheme == "" {
		scheme = "http"
	}
	return scheme + "://" + addr
}

// webEntrypoint is the plain HTTP entrypoint redirects listen on: "web" if it exists, else the first TCP entrypoint without TLS.
func webEntrypoint(cfg store.TraefikConfig) (store.Entrypoint, bool) {
	for _, e := range cfg.Entrypoints {
		if e.Name == "web" {
			return e, true
		}
	}
	for _, e := range cfg.Entrypoints {
		if e.Protocol != "udp" && e.DefaultResolver == "" && e.Port == 80 {
			return e, true
		}
	}
	return store.Entrypoint{}, false
}

// Render turns the state into Traefik's dynamic configuration (file provider format).
func Render(st store.State) M {
	httpRouters, httpServices, httpMws, httpTransports := M{}, M{}, M{}, M{}
	tcpRouters, tcpServices, tcpMws := M{}, M{}, M{}
	udpRouters, udpServices := M{}, M{}
	needRedirect := false
	cfg := st.Traefik

	for _, r := range st.Routes {
		if !r.Enabled {
			continue
		}
		eps := toAny(r.Entrypoints)
		switch r.Protocol {
		case "http":
			router := M{"rule": Rule(r), "service": ServiceName(r), "entryPoints": eps}
			if list := routeMiddlewares(r, httpMws); len(list) > 0 {
				router["middlewares"] = toAny(list)
			}
			if r.Priority > 0 {
				router["priority"] = r.Priority
			}
			if r.TLS.Enabled {
				router["tls"] = routerTLS(r, st)
				if r.TLS.Redirect {
					if web, ok := webEntrypoint(cfg); ok {
						needRedirect = true
						redir := M{"rule": Rule(r), "service": ServiceName(r), "entryPoints": []any{web.Name}, "middlewares": []any{redirectMiddleware}}
						if r.Priority > 0 {
							redir["priority"] = r.Priority
						}
						httpRouters[r.Name+"-redirect"] = redir
					}
				}
			}
			httpRouters[r.Name] = router
			if r.Target.Kind != "service" {
				lb := M{"servers": []any{M{"url": TargetURL(r)}}}
				routeTransport(r, lb, httpTransports)
				httpServices[r.Name] = M{"loadBalancer": lb}
			}
		case "tcp":
			router := M{"rule": Rule(r), "service": ServiceName(r), "entryPoints": eps}
			if len(r.Middlewares) > 0 {
				router["middlewares"] = toAny(r.Middlewares)
			}
			if r.Priority > 0 {
				router["priority"] = r.Priority
			}
			if r.TLS.Enabled {
				if r.TLS.Mode == "passthrough" {
					router["tls"] = M{"passthrough": true}
				} else {
					router["tls"] = routerTLS(r, st)
				}
			}
			tcpRouters[r.Name] = router
			if r.Target.Kind != "service" {
				tcpServices[r.Name] = M{"loadBalancer": M{"servers": []any{M{"address": TargetURL(r)}}}}
			}
		case "udp":
			udpRouters[r.Name] = M{"service": ServiceName(r), "entryPoints": eps}
			if r.Target.Kind != "service" {
				udpServices[r.Name] = M{"loadBalancer": M{"servers": []any{M{"address": TargetURL(r)}}}}
			}
		}
	}

	for _, s := range st.Services {
		def := renderService(s)
		switch s.Protocol {
		case "tcp":
			tcpServices[s.Name] = def
		case "udp":
			udpServices[s.Name] = def
		default:
			httpServices[s.Name] = def
		}
	}

	for _, m := range st.Middlewares {
		cfgCopy := M{}
		for k, v := range m.Config {
			cfgCopy[k] = v
		}
		if m.Protocol == "tcp" {
			tcpMws[m.Name] = M{m.Type: cfgCopy}
		} else {
			httpMws[m.Name] = M{m.Type: cfgCopy}
		}
	}
	if needRedirect {
		rs := M{"scheme": "https", "permanent": true}
		// With non-standard published ports (like the dev environment) the redirect must keep the public port.
		for _, e := range cfg.Entrypoints {
			if e.Name == "websecure" && e.HostPort != 0 && e.HostPort != 443 {
				rs["port"] = fmt.Sprint(e.HostPort)
			}
		}
		httpMws[redirectMiddleware] = M{"redirectScheme": rs}
	}

	out := M{}
	add := func(proto string, parts M) {
		sec := M{}
		for k, v := range parts {
			if len(v.(M)) > 0 {
				sec[k] = v
			}
		}
		if len(sec) > 0 {
			out[proto] = sec
		}
	}
	add("http", M{"routers": httpRouters, "services": httpServices, "middlewares": httpMws, "serversTransports": httpTransports})
	add("tcp", M{"routers": tcpRouters, "services": tcpServices, "middlewares": tcpMws})
	add("udp", M{"routers": udpRouters, "services": udpServices})

	tls := M{"options": M{"default": M{"minVersion": "VersionTLS12", "sniStrict": false}}}
	if len(st.Certificates) > 0 {
		certs := []any{}
		for _, c := range st.Certificates {
			certs = append(certs, M{
				"certFile": fmt.Sprintf("%s/certs/%s.crt", SharedInTraefik, c.ID),
				"keyFile":  fmt.Sprintf("%s/certs/%s.key", SharedInTraefik, c.ID),
			})
		}
		tls["certificates"] = certs
	}
	out["tls"] = tls
	return out
}

func routerTLS(r store.Route, st store.State) M {
	switch r.TLS.Mode {
	case "existing":
		t := M{}
		if r.TLS.Resolver != "" {
			// An ACME certificate: name the resolver so it keeps renewing, and the domain so no new one is ordered.
			t["certResolver"] = r.TLS.Resolver
		}
		if r.TLS.Domain != "" && r.TLS.Resolver != "" {
			t["domains"] = []any{M{"main": r.TLS.Domain}}
		}
		return t
	case "resolver", "":
		res := r.TLS.Resolver
		dom, hasDom := domainFor(r, st)
		if res == "" && hasDom {
			res = dom.Resolver
		}
		if res == "" && len(st.Traefik.Resolvers) > 0 {
			res = st.Traefik.Resolvers[0].Name
		}
		if res == "" {
			return M{}
		}
		t := M{"certResolver": res}
		// A wildcard domain gets one certificate for *.domain and domain, shared by all its routes.
		if hasDom && dom.Wildcard {
			t["domains"] = []any{M{"main": "*." + dom.Name, "sans": []any{dom.Name}}}
		}
		return t
	}
	return M{}
}

func renderService(s store.Service) M {
	switch s.Kind {
	case "weighted":
		items := []any{}
		for _, w := range s.Weighted {
			items = append(items, M{"name": w.Service, "weight": w.Weight})
		}
		return M{"weighted": M{"services": items}}
	case "failover":
		if s.Failover == nil {
			return M{}
		}
		return M{"failover": M{"service": s.Failover.Service, "fallback": s.Failover.Fallback}}
	case "mirroring":
		if s.Mirroring == nil {
			return M{}
		}
		mirrors := []any{}
		for _, m := range s.Mirroring.Mirrors {
			mirrors = append(mirrors, M{"name": m.Service, "percent": m.Weight})
		}
		return M{"mirroring": M{"service": s.Mirroring.Service, "mirrors": mirrors}}
	}
	servers := []any{}
	for _, srv := range s.Servers {
		if s.Protocol == "http" || s.Protocol == "" {
			servers = append(servers, M{"url": srv})
		} else {
			servers = append(servers, M{"address": srv})
		}
	}
	lb := M{"servers": servers}
	if s.Protocol == "http" || s.Protocol == "" {
		if s.HealthCheck != nil && s.HealthCheck.Path != "" {
			hc := M{"path": s.HealthCheck.Path}
			if s.HealthCheck.Interval != "" {
				hc["interval"] = s.HealthCheck.Interval
			}
			if s.HealthCheck.Timeout != "" {
				hc["timeout"] = s.HealthCheck.Timeout
			}
			lb["healthCheck"] = hc
		}
		if s.Sticky {
			lb["sticky"] = M{"cookie": M{"name": "ezt_" + s.Name, "httpOnly": true, "secure": true}}
		}
		if s.PassHostHeader != nil {
			lb["passHostHeader"] = *s.PassHostHeader
		}
		if s.InsecureSkipVerify {
			lb["serversTransport"] = "ezt-insecure@file"
		}
	}
	return M{"loadBalancer": lb}
}

// RenderTransports adds the shared servers transport used by services that skip TLS verification.
func RenderTransports(out M, st store.State) {
	for _, s := range st.Services {
		if s.InsecureSkipVerify {
			h, _ := out["http"].(M)
			if h == nil {
				h = M{}
				out["http"] = h
			}
			transports, _ := h["serversTransports"].(M)
			if transports == nil {
				transports = M{}
				h["serversTransports"] = transports
			}
			transports["ezt-insecure"] = M{"insecureSkipVerify": true}
			return
		}
	}
}

func toAny(ss []string) []any {
	out := make([]any, len(ss))
	for i, s := range ss {
		out[i] = s
	}
	return out
}

// DomainFor returns the configured domain the route's hosts belong to.
func DomainFor(r store.Route, st store.State) (store.Domain, bool) { return domainFor(r, st) }

// domainFor returns the configured domain the route's hosts belong to.
func domainFor(r store.Route, st store.State) (store.Domain, bool) {
	for _, d := range st.Domains {
		for _, h := range r.Hosts {
			if h == d.Name || (strings.HasSuffix(h, "."+d.Name) && !strings.Contains(strings.TrimSuffix(h, "."+d.Name), ".")) {
				return d, true
			}
		}
	}
	return store.Domain{}, false
}

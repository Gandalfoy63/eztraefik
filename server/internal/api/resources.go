// Docs: docs/03 - Features/Services.md, docs/03 - Features/Middlewares.md, docs/03 - Features/Domains.md
package api

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"eztraefik/internal/auth"
	"eztraefik/internal/store"
	"eztraefik/internal/traefik"
)

// ---------- Services ----------

type RuntimeService struct {
	Name         string            `json:"name"`
	Provider     string            `json:"provider"`
	Protocol     string            `json:"protocol"`
	Type         string            `json:"type"`
	Status       string            `json:"status"`
	Servers      []string          `json:"servers"`
	ServerStatus map[string]string `json:"serverStatus"`
	UsedBy       []string          `json:"usedBy"`
	Errors       []string          `json:"errors"`
}

func (a *App) runtimeServices(ctx context.Context) ([]RuntimeService, bool) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	raw, err := a.API.RawData(ctx)
	if err != nil {
		return nil, false
	}
	out := []RuntimeService{}
	add := func(proto string, m map[string]traefik.RawService) {
		for full, v := range m {
			name, prov := splitProvider(full)
			if prov == "internal" {
				continue
			}
			rs := RuntimeService{Name: name, Provider: prov, Protocol: proto, Type: v.Type, Status: v.Status,
				ServerStatus: v.ServerStatus, UsedBy: v.UsedBy, Errors: v.Error, Servers: []string{}}
			if v.LoadBalancer != nil {
				for _, s := range v.LoadBalancer.Servers {
					rs.Servers = append(rs.Servers, s.URL+s.Address)
				}
			}
			out = append(out, rs)
		}
	}
	add("http", raw.Services)
	add("tcp", raw.TCPServices)
	add("udp", raw.UDPServices)
	slices.SortFunc(out, func(x, y RuntimeService) int { return strings.Compare(x.Name, y.Name) })
	return out, true
}

func (a *App) listServices(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	rt, reachable := a.runtimeServices(r.Context())
	ok(w, map[string]any{"services": st.Services, "runtime": rt, "traefikReachable": reachable})
}

func validateService(st *store.State, s *store.Service) error {
	s.Name = strings.TrimSpace(strings.ToLower(s.Name))
	if !nameRe.MatchString(s.Name) || strings.HasPrefix(s.Name, "ezt-") {
		return FieldError{"name", "Use lowercase letters, numbers and dashes. Names starting with ezt- are reserved."}
	}
	for _, o := range st.Services {
		if o.Name == s.Name && o.ID != s.ID {
			return FieldError{"name", "Another service already uses this name."}
		}
	}
	for _, rt := range st.Routes {
		if rt.Name == s.Name && rt.Target.Kind != "service" {
			return FieldError{"name", "A route uses this name for its own destination. Pick another name."}
		}
	}
	if !slices.Contains([]string{"http", "tcp", "udp"}, s.Protocol) {
		s.Protocol = "http"
	}
	names := map[string]bool{}
	for _, o := range st.Services {
		if o.ID != s.ID {
			names[o.Name] = true
		}
	}
	for _, rt := range st.Routes {
		if rt.Target.Kind != "service" {
			names[rt.Name] = true
		}
	}
	refOK := func(n string) bool { return names[n] || strings.Contains(n, "@") }
	switch s.Kind {
	case "weighted":
		if len(s.Weighted) < 2 {
			return FieldError{"weighted", "Add at least two services to split traffic between."}
		}
		for _, x := range s.Weighted {
			if !refOK(x.Service) {
				return FieldError{"weighted", fmt.Sprintf("Service %s does not exist.", x.Service)}
			}
			if x.Weight < 0 {
				return FieldError{"weighted", "Weights can't be negative."}
			}
		}
	case "failover":
		if s.Failover == nil || !refOK(s.Failover.Service) || !refOK(s.Failover.Fallback) {
			return FieldError{"failover", "Choose a main service and a fallback service."}
		}
	case "mirroring":
		if s.Mirroring == nil || !refOK(s.Mirroring.Service) {
			return FieldError{"mirroring", "Choose the main service."}
		}
		for _, m := range s.Mirroring.Mirrors {
			if !refOK(m.Service) || m.Weight < 0 || m.Weight > 100 {
				return FieldError{"mirroring", "Each mirror needs an existing service and a percent from 0 to 100."}
			}
		}
	default:
		s.Kind = "loadbalancer"
		servers := []string{}
		for _, srv := range s.Servers {
			srv = strings.TrimSpace(srv)
			if srv == "" {
				continue
			}
			if s.Protocol == "http" {
				u, err := url.Parse(srv)
				if err != nil || (u.Scheme != "http" && u.Scheme != "https" && u.Scheme != "h2c") || u.Host == "" {
					return FieldError{"servers", fmt.Sprintf("%q must be a URL like http://10.0.0.5:8080.", srv)}
				}
			} else if _, _, err := net.SplitHostPort(srv); err != nil {
				return FieldError{"servers", fmt.Sprintf("%q must be host:port, like 10.0.0.5:5432.", srv)}
			}
			servers = append(servers, srv)
		}
		if len(servers) == 0 {
			return FieldError{"servers", "Add at least one server."}
		}
		s.Servers = servers
	}
	return nil
}

func (a *App) saveService(w http.ResponseWriter, r *http.Request) {
	var in store.Service
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	id := r.PathValue("id")
	st, warnings, err := a.Commit(r, "Service "+strings.ToLower(in.Name)+" saved", func(st *store.State) error {
		in.ID = id
		if id == "" {
			in.ID = store.NewID()
		} else if !slices.ContainsFunc(st.Services, func(x store.Service) bool { return x.ID == id }) {
			return notFound("Service not found.")
		}
		if id != "" {
			// A rename must not break routes pointing at the old name.
			for _, old := range st.Services {
				if old.ID == id && old.Name != strings.ToLower(in.Name) {
					for _, rt := range st.Routes {
						if rt.Target.Kind == "service" && rt.Target.Service == old.Name {
							return FieldError{"name", fmt.Sprintf("Route %s uses this service. Change the route first.", rt.Name)}
						}
					}
				}
			}
		}
		if err := validateService(st, &in); err != nil {
			return err
		}
		in.UpdatedAt = time.Now().UTC()
		if idx := slices.IndexFunc(st.Services, func(x store.Service) bool { return x.ID == in.ID }); idx >= 0 {
			st.Services[idx] = in
		} else {
			st.Services = append(st.Services, in)
		}
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	for _, s := range st.Services {
		if s.ID == in.ID {
			ok(w, map[string]any{"service": s, "warnings": warnings})
			return
		}
	}
}

func (a *App) deleteService(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, warnings, err := a.Commit(r, "Service deleted", func(st *store.State) error {
		idx := slices.IndexFunc(st.Services, func(x store.Service) bool { return x.ID == id })
		if idx < 0 {
			return notFound("Service not found.")
		}
		name := st.Services[idx].Name
		for _, rt := range st.Routes {
			if rt.Target.Kind == "service" && rt.Target.Service == name {
				return FieldError{"", fmt.Sprintf("Route %s uses this service. Change or delete the route first.", rt.Name)}
			}
		}
		for _, s := range st.Services {
			refs := []string{}
			for _, x := range s.Weighted {
				refs = append(refs, x.Service)
			}
			if s.Failover != nil {
				refs = append(refs, s.Failover.Service, s.Failover.Fallback)
			}
			if s.Mirroring != nil {
				refs = append(refs, s.Mirroring.Service)
				for _, m := range s.Mirroring.Mirrors {
					refs = append(refs, m.Service)
				}
			}
			if slices.Contains(refs, name) {
				return FieldError{"", fmt.Sprintf("Service %s uses this service.", s.Name)}
			}
		}
		st.Services = slices.Delete(st.Services, idx, idx+1)
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	ok(w, map[string]any{"warnings": warnings})
}

// ---------- Middlewares ----------

// Traefik Proxy middleware types eztraefik accepts. Hub-only types are rejected with a clear message.
var httpMiddlewareTypes = []string{"addPrefix", "basicAuth", "buffering", "chain", "circuitBreaker", "compress", "contentType",
	"digestAuth", "errors", "forwardAuth", "grpcWeb", "headers", "inFlightReq", "ipAllowList", "passTLSClientCert", "rateLimit",
	"redirectRegex", "redirectScheme", "replacePath", "replacePathRegex", "retry", "stripPrefix", "stripPrefixRegex"}
var tcpMiddlewareTypes = []string{"inFlightConn", "ipAllowList"}
var hubOnly = []string{"apiKey", "jwt", "hmac", "oidc", "opa", "waf", "ldap", "oAuthClientCredentials", "oAuthIntrospection", "distributedRateLimit"}

func (a *App) listMiddlewares(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	type rtMw struct {
		Name     string   `json:"name"`
		Provider string   `json:"provider"`
		Protocol string   `json:"protocol"`
		Type     string   `json:"type"`
		Status   string   `json:"status"`
		UsedBy   []string `json:"usedBy"`
		Errors   []string `json:"errors"`
	}
	rt := []rtMw{}
	raw, err := a.API.RawData(ctx)
	if err == nil {
		for proto, m := range map[string]map[string]traefik.RawMiddleware{"http": raw.Middlewares, "tcp": raw.TCPMiddlewares} {
			for full, v := range m {
				name, prov := splitProvider(full)
				if prov == "internal" {
					continue
				}
				rt = append(rt, rtMw{name, prov, proto, v.Type, v.Status, v.UsedBy, v.Error})
			}
		}
		slices.SortFunc(rt, func(x, y rtMw) int { return strings.Compare(x.Name, y.Name) })
	}
	ok(w, map[string]any{"middlewares": st.Middlewares, "runtime": rt, "traefikReachable": err == nil,
		"types": map[string]any{"http": httpMiddlewareTypes, "tcp": tcpMiddlewareTypes, "hubOnly": hubOnly}})
}

func (a *App) saveMiddleware(w http.ResponseWriter, r *http.Request) {
	var in store.Middleware
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	id := r.PathValue("id")
	st, warnings, err := a.Commit(r, "Middleware "+strings.ToLower(in.Name)+" saved", func(st *store.State) error {
		in.Name = strings.TrimSpace(strings.ToLower(in.Name))
		if !nameRe.MatchString(in.Name) || strings.HasPrefix(in.Name, "ezt-") {
			return FieldError{"name", "Use lowercase letters, numbers and dashes. Names starting with ezt- are reserved."}
		}
		if in.Protocol != "tcp" {
			in.Protocol = "http"
		}
		types := httpMiddlewareTypes
		if in.Protocol == "tcp" {
			types = tcpMiddlewareTypes
		}
		if slices.Contains(hubOnly, in.Type) {
			return FieldError{"type", "This middleware needs Traefik Hub. eztraefik runs Traefik Proxy."}
		}
		if !slices.Contains(types, in.Type) {
			return FieldError{"type", "Choose a middleware type."}
		}
		if in.Config == nil {
			in.Config = map[string]any{}
		}
		if in.Type == "chain" {
			list, _ := in.Config["middlewares"].([]any)
			if len(list) == 0 {
				return FieldError{"config", "A chain needs at least one middleware."}
			}
			for _, x := range list {
				if n, _ := x.(string); n == in.Name {
					return FieldError{"config", "A chain can't include itself."}
				}
			}
		}
		for _, o := range st.Middlewares {
			if o.Name == in.Name && o.ID != id {
				return FieldError{"name", "Another middleware already uses this name."}
			}
		}
		in.ID = id
		if id == "" {
			in.ID = store.NewID()
		}
		in.UpdatedAt = time.Now().UTC()
		if idx := slices.IndexFunc(st.Middlewares, func(x store.Middleware) bool { return x.ID == in.ID }); idx >= 0 {
			old := st.Middlewares[idx]
			if old.Name != in.Name {
				for _, rt := range st.Routes {
					if slices.Contains(rt.Middlewares, old.Name) {
						return FieldError{"name", fmt.Sprintf("Route %s uses this middleware. Rename is blocked to keep it working.", rt.Name)}
					}
				}
			}
			st.Middlewares[idx] = in
		} else if id != "" {
			return notFound("Middleware not found.")
		} else {
			st.Middlewares = append(st.Middlewares, in)
		}
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	for _, m := range st.Middlewares {
		if m.ID == in.ID {
			ok(w, map[string]any{"middleware": m, "warnings": warnings})
			return
		}
	}
}

func (a *App) deleteMiddleware(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, warnings, err := a.Commit(r, "Middleware deleted", func(st *store.State) error {
		idx := slices.IndexFunc(st.Middlewares, func(x store.Middleware) bool { return x.ID == id })
		if idx < 0 {
			return notFound("Middleware not found.")
		}
		name := st.Middlewares[idx].Name
		for _, rt := range st.Routes {
			if slices.Contains(rt.Middlewares, name) {
				return FieldError{"", fmt.Sprintf("Route %s uses this middleware. Remove it from the route first.", rt.Name)}
			}
		}
		st.Middlewares = slices.Delete(st.Middlewares, idx, idx+1)
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	ok(w, map[string]any{"warnings": warnings})
}

// htpasswd hashes "user:password" pairs for the BasicAuth middleware, so plain passwords never get stored.
func (a *App) htpasswd(w http.ResponseWriter, r *http.Request) {
	var in struct{ Username, Password string }
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	if in.Username == "" || strings.Contains(in.Username, ":") {
		failErr(w, FieldError{"username", "Enter a username without a colon."})
		return
	}
	if len(in.Password) < 8 {
		failErr(w, FieldError{"password", "Use at least 8 characters."})
		return
	}
	ok(w, map[string]any{"user": in.Username + ":" + auth.APR1(in.Password)})
}

// ---------- Domains ----------

type DomainInfo struct {
	Name     string   `json:"name"`
	Explicit bool     `json:"explicit"`
	Resolver string   `json:"resolver,omitempty"`
	Wildcard bool     `json:"wildcard"`
	Hosts    []string `json:"hosts"`
	Routes   []string `json:"routes"`
}

// registrable returns the last two labels (example.com). Good enough without a public suffix list; documented.
func registrable(host string) string {
	host = strings.TrimPrefix(host, "*.")
	parts := strings.Split(host, ".")
	if len(parts) <= 2 {
		return host
	}
	return strings.Join(parts[len(parts)-2:], ".")
}

func (a *App) listDomains(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	byName := map[string]*DomainInfo{}
	get := func(n string) *DomainInfo {
		if d, ok := byName[n]; ok {
			return d
		}
		d := &DomainInfo{Name: n, Hosts: []string{}, Routes: []string{}}
		byName[n] = d
		return d
	}
	for _, d := range st.Domains {
		x := get(d.Name)
		x.Explicit, x.Resolver, x.Wildcard = true, d.Resolver, d.Wildcard
	}
	for _, rt := range st.Routes {
		for _, h := range rt.Hosts {
			name := registrable(h)
			for _, d := range st.Domains {
				if h == d.Name || strings.HasSuffix(h, "."+d.Name) {
					name = d.Name
				}
			}
			x := get(name)
			if !slices.Contains(x.Hosts, h) {
				x.Hosts = append(x.Hosts, h)
			}
			if !slices.Contains(x.Routes, rt.Name) {
				x.Routes = append(x.Routes, rt.Name)
			}
		}
	}
	out := []DomainInfo{}
	for _, d := range byName {
		slices.Sort(d.Hosts)
		out = append(out, *d)
	}
	slices.SortFunc(out, func(x, y DomainInfo) int { return strings.Compare(x.Name, y.Name) })
	ok(w, map[string]any{"domains": out, "certificates": a.allCerts(st)})
}

func (a *App) saveDomain(w http.ResponseWriter, r *http.Request) {
	var in store.Domain
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	in.Name = strings.TrimSpace(strings.ToLower(in.Name))
	if !hostRe.MatchString(in.Name) || strings.HasPrefix(in.Name, "*.") {
		failErr(w, FieldError{"name", "Enter a domain like example.com, without *."})
		return
	}
	_, warnings, err := a.Commit(r, "Domain "+in.Name+" saved", func(st *store.State) error {
		if in.Resolver != "" && !hasResolver(st, in.Resolver) {
			return FieldError{"resolver", "This certificate resolver does not exist."}
		}
		if in.Wildcard {
			ok := false
			for _, res := range st.Traefik.Resolvers {
				if res.Name == in.Resolver && res.Challenge == "dns" {
					ok = true
				}
			}
			if !ok {
				return FieldError{"wildcard", "Wildcard certificates need a resolver with the DNS challenge."}
			}
		}
		if idx := slices.IndexFunc(st.Domains, func(d store.Domain) bool { return d.Name == in.Name }); idx >= 0 {
			st.Domains[idx] = in
		} else {
			st.Domains = append(st.Domains, in)
		}
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	ok(w, map[string]any{"domain": in, "warnings": warnings})
}

func (a *App) deleteDomain(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	_, _, err := a.Commit(r, "Domain "+name+" removed", func(st *store.State) error {
		idx := slices.IndexFunc(st.Domains, func(d store.Domain) bool { return d.Name == name })
		if idx < 0 {
			return notFound("Domain not found.")
		}
		st.Domains = slices.Delete(st.Domains, idx, idx+1)
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	ok(w, map[string]any{})
}

func (a *App) checkDNS(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
	defer cancel()
	addrs, err := net.DefaultResolver.LookupHost(ctx, strings.TrimPrefix(name, "*."))
	if err != nil {
		ok(w, map[string]any{"resolves": false, "addresses": []string{}, "error": "No DNS record found for this name."})
		return
	}
	ok(w, map[string]any{"resolves": true, "addresses": addrs})
}

// ---------- Certificates ----------

func (a *App) allCerts(st store.State) []traefik.Cert {
	certs := traefik.ACMECerts(a.Cfg.SharedDir)
	for _, c := range st.Certificates {
		main := ""
		if len(c.Domains) > 0 {
			main = c.Domains[0]
		}
		certs = append(certs, traefik.Cert{ID: c.ID, Source: "uploaded", Main: main, Domains: c.Domains, Issuer: c.Issuer, NotAfter: c.NotAfter, Name: c.Name})
	}
	return certs
}

func (a *App) listCerts(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	ok(w, map[string]any{"certificates": a.allCerts(st), "resolvers": st.Traefik.Resolvers})
}

func (a *App) uploadCert(w http.ResponseWriter, r *http.Request) {
	var in struct{ Name, Cert, Key string }
	if err := decode(r, &in); err != nil {
		failErr(w, err)
		return
	}
	leaf, err := traefik.ValidatePair([]byte(in.Cert), []byte(in.Key))
	if err != nil {
		failErr(w, FieldError{"cert", "The certificate and key don't form a valid pair: " + err.Error()})
		return
	}
	id := store.NewID()
	dir := a.Cfg.SharedDir + "/certs/"
	if err := store.WriteFileAtomic(dir+id+".crt", []byte(in.Cert), 0o644); err != nil {
		failErr(w, err)
		return
	}
	if err := store.WriteFileAtomic(dir+id+".key", []byte(in.Key), 0o600); err != nil {
		failErr(w, err)
		return
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		name = leaf.Subject.CommonName
	}
	c := store.UploadedCert{ID: id, Name: name, Domains: traefik.CertNames(leaf), NotAfter: leaf.NotAfter, Issuer: leaf.Issuer.CommonName}
	_, warnings, err := a.Commit(r, "Certificate "+name+" uploaded", func(st *store.State) error {
		st.Certificates = append(st.Certificates, c)
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	ok(w, map[string]any{"certificate": c, "warnings": warnings})
}

func (a *App) deleteCert(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, _, err := a.Commit(r, "Certificate deleted", func(st *store.State) error {
		idx := slices.IndexFunc(st.Certificates, func(c store.UploadedCert) bool { return c.ID == id })
		if idx < 0 {
			return notFound("Only uploaded certificates can be deleted here.")
		}
		st.Certificates = slices.Delete(st.Certificates, idx, idx+1)
		return nil
	})
	if err != nil {
		failErr(w, err)
		return
	}
	ok(w, map[string]any{})
}

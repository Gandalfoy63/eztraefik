// Docs: docs/03 - Features/Import from NPM.md
package npm

import (
	"fmt"
	"regexp"
	"sort"
	"strings"

	"eztraefik/internal/docker"
	"eztraefik/internal/store"
)

// Item is one NPM object and what it becomes in eztraefik. Notes list every behavior change, so nothing is lost silently.
type Item struct {
	ID           string       `json:"id"`
	Kind         string       `json:"kind"` // proxy, location, redirect, stream, notfound
	Source       string       `json:"source"`
	Action       string       `json:"action"` // import or skip
	Reason       string       `json:"reason,omitempty"`
	Name         string       `json:"name,omitempty"`
	Target       string       `json:"target,omitempty"`
	TLS          string       `json:"tls,omitempty"`
	Notes        []string     `json:"notes"`
	Converted    []string     `json:"converted"`           // named settings read from its custom nginx config
	Passwords    []string     `json:"passwords,omitempty"` // "<access list id>/<user>" that still need a password
	Middlewares  []string     `json:"middlewares"`
	Entrypoints  []string     `json:"entrypoints"`
	Certs        []int        `json:"certs"`
	UsesResolver bool         `json:"usesResolver"`
	Route        *store.Route `json:"-"`
}

type Plan struct {
	Items        []Item                      `json:"items"`
	Middlewares  map[string]store.Middleware `json:"-"`
	Entrypoints  map[string]store.Entrypoint `json:"-"`
	Certs        map[int]Certificate         `json:"-"`
	Resolver     *store.Resolver             `json:"resolver,omitempty"` // to create; nil when eztraefik already has one
	ResolverEnv  []store.EnvVar              `json:"-"`
	ResolverName string                      `json:"resolverName,omitempty"`
	Warnings     []string                    `json:"warnings"`
	StreamPorts  map[string]int              `json:"streamPorts"` // entrypoint -> port to publish at switch-over
}

type Options struct {
	// Htpasswd holds the lines of NPM's /data/access/<id> files, when eztraefik could read them from the container.
	Htpasswd map[int][]string
	// Passwords typed in the import screen, keyed "<access list id>/<user>".
	Passwords map[string]string
	// Hash turns a plain password into an htpasswd hash (apr1).
	Hash          func(string) string
	ResolverEmail string
	// FallbackEmail is used when neither ResolverEmail nor NPM's certificates give one (the NPM account email).
	FallbackEmail string
}

var invalidName = regexp.MustCompile(`[^a-z0-9-]+`)

type namer struct{ used map[string]bool }

func (n *namer) name(base string) string {
	s := strings.Trim(invalidName.ReplaceAllString(strings.ToLower(strings.TrimPrefix(base, "*.")), "-"), "-")
	if strings.HasPrefix(s, "ezt-") || s == "" {
		s = "npm-" + s
	}
	if len(s) > 55 {
		s = strings.Trim(s[:55], "-")
	}
	out := s
	for i := 2; n.used[out]; i++ {
		out = fmt.Sprintf("%s-%d", s, i)
	}
	n.used[out] = true
	return out
}

// target finds whether NPM forwards to a container on this host (by name or IP) or to a plain address.
func target(host string, port int, scheme string, containers []docker.ContainerSummary) (store.Target, string) {
	h := strings.TrimSpace(strings.ToLower(host))
	for _, c := range containers {
		match := strings.EqualFold(c.Name(), h)
		for _, n := range c.NetworkSettings.Networks {
			if n.IPAddress != "" && n.IPAddress == h {
				match = true
			}
		}
		if match {
			t := store.Target{Kind: "docker", Container: c.Name(), Port: port, Scheme: scheme}
			return t, fmt.Sprintf("container %s:%d", c.Name(), port)
		}
	}
	if scheme == "" { // streams: an address, not a URL
		return store.Target{Kind: "ip", Address: h, Port: port}, fmt.Sprintf("%s:%d", h, port)
	}
	return store.Target{Kind: "ip", Address: h, Port: port, Scheme: scheme}, fmt.Sprintf("%s://%s:%d", scheme, h, port)
}

// readNginx turns a host's custom nginx config into route settings and says what happened to each directive.
func readNginx(it *Item, src string, inherited store.RouteSettings, forwards bool) store.RouteSettings {
	n := ParseNginx(src, inherited, forwards)
	it.Converted = append(it.Converted, n.Converted...)
	for _, d := range n.Covered {
		it.Converted = append(it.Converted, "No setting needed, Traefik already does this: "+d)
	}
	for _, d := range n.Skipped {
		it.Notes = append(it.Notes, "Custom nginx config is not converted: "+d)
	}
	return n.Settings
}

// settingsOf returns nil when no setting is on, so routes without any stay as they were.
func settingsOf(s store.RouteSettings) *store.RouteSettings {
	if s.IsEmpty() {
		return nil
	}
	return &s
}

// dnsEnv maps NPM's certbot credential file to the variables Traefik's DNS providers (lego) read.
var dnsEnv = map[string]map[string]string{
	"cloudflare":   {"dns_cloudflare_api_token": "CF_DNS_API_TOKEN", "dns_cloudflare_email": "CF_API_EMAIL", "dns_cloudflare_api_key": "CF_API_KEY"},
	"digitalocean": {"dns_digitalocean_token": "DO_AUTH_TOKEN"},
	"duckdns":      {"dns_duckdns_token": "DUCKDNS_TOKEN"},
	"hetzner":      {"dns_hetzner_api_token": "HETZNER_API_KEY"},
	"ovh": {"dns_ovh_endpoint": "OVH_ENDPOINT", "dns_ovh_application_key": "OVH_APPLICATION_KEY",
		"dns_ovh_application_secret": "OVH_APPLICATION_SECRET", "dns_ovh_consumer_key": "OVH_CONSUMER_KEY"},
}

func parseCredentials(provider, ini string) ([]store.EnvVar, bool) {
	m, known := dnsEnv[provider]
	if !known {
		return nil, false
	}
	var out []store.EnvVar
	for _, line := range strings.Split(ini, "\n") {
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		if env, found := m[strings.TrimSpace(k)]; found {
			out = append(out, store.EnvVar{Key: env, Value: strings.TrimSpace(v), Secret: true})
		}
	}
	return out, len(out) > 0
}

// BuildPlan maps an NPM configuration onto the current eztraefik state. It changes nothing.
func BuildPlan(d Data, st store.State, containers []docker.ContainerSummary, opt Options) Plan {
	p := Plan{Middlewares: map[string]store.Middleware{}, Entrypoints: map[string]store.Entrypoint{}, Certs: map[int]Certificate{},
		Warnings: []string{}, StreamPorts: map[string]int{}}
	nm := &namer{used: map[string]bool{}}
	for _, r := range st.Routes {
		nm.used[r.Name] = true
	}
	for _, s := range st.Services {
		nm.used[s.Name] = true
	}
	mwNames := map[string]bool{}
	for _, m := range st.Middlewares {
		mwNames[m.Name] = true
	}
	routedHosts := map[string]string{}
	for _, r := range st.Routes {
		for _, h := range r.Hosts {
			routedHosts[h] = r.Name
		}
	}
	certByID := map[int]Certificate{}
	for _, c := range d.Certificates {
		certByID[c.ID] = c
	}
	aclByID := map[int]AccessList{}
	for _, a := range d.AccessLists {
		aclByID[a.ID] = a
	}
	webRedirects := false
	for _, e := range st.Traefik.Entrypoints {
		if e.Name == "web" && e.RedirectTo != "" {
			webRedirects = true
		}
	}

	// The resolver new certificates come from: eztraefik's own if it has one, else one made from NPM's Let's Encrypt account.
	resolverName := ""
	if len(st.Traefik.Resolvers) > 0 {
		resolverName = st.Traefik.Resolvers[0].Name
	}
	needResolver := func() string {
		if resolverName != "" {
			return resolverName
		}
		email := opt.ResolverEmail
		var le *Certificate
		for i, c := range d.Certificates {
			if c.Provider == "letsencrypt" {
				le = &d.Certificates[i]
				if email == "" {
					email = c.Meta.Email
				}
				break
			}
		}
		if email == "" && opt.FallbackEmail != "" {
			email = opt.FallbackEmail
			p.Warnings = append(p.Warnings, fmt.Sprintf("NPM's certificates don't say which email they used: the new Let's Encrypt resolver uses your NPM account email, %s. Change it below if needed.", email))
		}
		if email == "" {
			return ""
		}
		res := store.Resolver{Name: "letsencrypt", Email: email, Challenge: "http", HTTPEntry: "web"}
		if le != nil && bool(le.Meta.DNSChallenge) && le.Meta.DNSProvider != "" {
			res.Challenge, res.DNSProvider = "dns", le.Meta.DNSProvider
			if env, ok := parseCredentials(le.Meta.DNSProvider, le.Meta.DNSCredentials); ok {
				p.ResolverEnv = env
			} else {
				p.Warnings = append(p.Warnings, fmt.Sprintf("NPM used the %s DNS challenge. Add its credentials as environment variables on the Traefik page; eztraefik only converts Cloudflare, DigitalOcean, Duck DNS, Hetzner and OVH automatically.", le.Meta.DNSProvider))
			}
		}
		p.Resolver = &res
		resolverName = res.Name
		p.ResolverName = res.Name
		return resolverName
	}

	// tlsFor decides HTTPS for a host from its NPM certificate.
	tlsFor := func(it *Item, certID int, forced bool) store.RouteTLS {
		if certID <= 0 {
			if webRedirects {
				// eztraefik's web entrypoint sends every request to HTTPS, so a plain HTTP route could not answer.
				if res := needResolver(); res != "" {
					it.Notes = append(it.Notes, "Served over HTTPS with a new certificate: eztraefik redirects all HTTP to HTTPS.")
					it.UsesResolver = true
					it.TLS = "New certificate (" + res + ")"
					return store.RouteTLS{Enabled: true, Mode: "resolver", Resolver: res, Redirect: true}
				}
				it.Action, it.Reason = "skip", "Plain HTTP in NPM, and eztraefik redirects all HTTP to HTTPS. Add a certificate resolver or turn off the redirect on the web entrypoint."
			}
			it.TLS = "No"
			return store.RouteTLS{}
		}
		c, ok := certByID[certID]
		if !ok {
			it.Notes = append(it.Notes, "Its NPM certificate no longer exists; served without HTTPS.")
			it.TLS = "No"
			return store.RouteTLS{}
		}
		if !forced {
			it.Notes = append(it.Notes, "HTTP visitors are now redirected to HTTPS (NPM answered both).")
		}
		if c.Provider == "letsencrypt" {
			res := needResolver()
			if res == "" {
				it.Action, it.Reason = "skip", "Uses a Let's Encrypt certificate, but no email is known for a resolver. Enter one below."
				return store.RouteTLS{}
			}
			it.UsesResolver = true
			it.TLS = "Let's Encrypt, renewed by Traefik (" + res + ")"
			it.Notes = append(it.Notes, "Traefik requests its own Let's Encrypt certificate on the first visit after the switch.")
			return store.RouteTLS{Enabled: true, Mode: "resolver", Resolver: res, Redirect: true}
		}
		if c.Meta.Certificate == "" || c.Meta.CertificateKey == "" {
			it.Action, it.Reason = "skip", fmt.Sprintf("Certificate %q has no key readable through the API.", c.NiceName)
			return store.RouteTLS{}
		}
		p.Certs[c.ID] = c
		it.Certs = append(it.Certs, c.ID)
		it.TLS = "Copied certificate " + c.NiceName
		domain := c.NiceName
		if len(c.DomainNames) > 0 {
			domain = c.DomainNames[0]
		}
		return store.RouteTLS{Enabled: true, Mode: "existing", Domain: domain, Redirect: true}
	}

	hsts := func(it *Item, enabled, sub bool) {
		if !enabled {
			return
		}
		name := "npm-hsts"
		if sub {
			name = "npm-hsts-subdomains"
		}
		if !mwNames[name] {
			p.Middlewares[name] = store.Middleware{Name: name, Protocol: "http", Type: "headers",
				Config: map[string]any{"stsSeconds": 63072000, "stsIncludeSubdomains": sub, "stsPreload": true}}
		}
		it.Middlewares = append(it.Middlewares, name)
	}

	acl := func(it *Item, id int) {
		if id <= 0 {
			return
		}
		a, ok := aclByID[id]
		if !ok {
			it.Notes = append(it.Notes, "Its access list no longer exists in NPM.")
			return
		}
		base := "npm-acl-" + strings.Trim(invalidName.ReplaceAllString(strings.ToLower(a.Name), "-"), "-")
		allows, denies := []string{}, []string{}
		allowAll := false
		for _, c := range a.Clients {
			switch {
			case c.Directive == "allow" && c.Address == "all":
				allowAll = true
			case c.Directive == "allow":
				allows = append(allows, c.Address)
			case c.Address != "all":
				denies = append(denies, c.Address)
			}
		}
		if len(denies) > 0 {
			it.Notes = append(it.Notes, fmt.Sprintf("Access list %q blocks %s: Traefik Proxy only has allow lists, these addresses are no longer blocked.", a.Name, strings.Join(denies, ", ")))
		}
		hasIPs := len(allows) > 0 && !allowAll
		hasUsers := len(a.Items) > 0
		if hasIPs && hasUsers && bool(a.SatisfyAny) {
			it.Notes = append(it.Notes, fmt.Sprintf("Access list %q let visitors in with an allowed IP OR a password. Traefik requires both.", a.Name))
		}
		if hasIPs {
			name := base + "-ips"
			if _, done := p.Middlewares[name]; !done && !mwNames[name] {
				p.Middlewares[name] = store.Middleware{Name: name, Protocol: "http", Type: "ipAllowList", Config: map[string]any{"sourceRange": toAny(allows)}}
			}
			it.Middlewares = append(it.Middlewares, name)
		}
		if hasUsers {
			name := base + "-auth"
			users := []any{}
			missing := []string{}
			lines := map[string]string{}
			for _, l := range opt.Htpasswd[a.ID] {
				if u, _, ok := strings.Cut(l, ":"); ok {
					lines[u] = l
				}
			}
			for _, u := range a.Items {
				key := fmt.Sprintf("%d/%s", a.ID, u.Username)
				switch {
				case lines[u.Username] != "":
					users = append(users, lines[u.Username])
				case opt.Passwords[key] != "" && opt.Hash != nil:
					users = append(users, u.Username+":"+opt.Hash(opt.Passwords[key]))
				default:
					missing = append(missing, key)
				}
			}
			if len(missing) > 0 {
				// Never import a protected site without its protection.
				it.Passwords = append(it.Passwords, missing...)
				if it.Action != "skip" {
					it.Action, it.Reason = "skip", fmt.Sprintf("Protected by access list %q: enter the passwords below, NPM does not give them out.", a.Name)
				}
				return
			}
			if _, done := p.Middlewares[name]; !done && !mwNames[name] {
				p.Middlewares[name] = store.Middleware{Name: name, Protocol: "http", Type: "basicAuth",
					Config: map[string]any{"users": users, "removeHeader": !bool(a.PassAuth)}}
			}
			it.Middlewares = append(it.Middlewares, name)
		}
	}

	conflict := func(it *Item, hosts []string) {
		for _, h := range hosts {
			if r, ok := routedHosts[h]; ok {
				it.Action, it.Reason = "skip", fmt.Sprintf("%s is already routed by eztraefik route %s.", h, r)
				return
			}
		}
	}

	lower := func(ss []string) []string {
		out := make([]string, len(ss))
		for i, s := range ss {
			out[i] = strings.ToLower(strings.TrimSpace(s))
		}
		return out
	}

	for _, h := range d.ProxyHosts {
		hosts := lower(h.DomainNames)
		it := Item{ID: fmt.Sprintf("proxy-%d", h.ID), Kind: "proxy", Source: strings.Join(hosts, ", "), Action: "import", Notes: []string{}, Converted: []string{}, Middlewares: []string{}, Entrypoints: []string{}, Certs: []int{}}
		conflict(&it, hosts)
		scheme := h.ForwardScheme
		if scheme != "https" {
			scheme = "http"
		}
		t, desc := target(h.ForwardHost, h.ForwardPort, scheme, containers)
		it.Target = desc
		tls := tlsFor(&it, h.CertificateID, bool(h.SSLForced))
		if tls.Enabled {
			hsts(&it, bool(h.HSTSEnabled), bool(h.HSTSSubdomains))
		}
		acl(&it, h.AccessListID)
		hostSettings := readNginx(&it, h.AdvancedConfig, store.RouteSettings{}, true)
		if h.BlockExploits {
			it.Notes = append(it.Notes, "\"Block common exploits\" has no Traefik equivalent.")
		}
		if h.Caching {
			it.Notes = append(it.Notes, "Caching of assets has no Traefik Proxy equivalent.")
		}
		if !h.Enabled {
			it.Notes = append(it.Notes, "Disabled in NPM: imported disabled.")
		}
		if it.Action == "import" {
			it.Name = nm.name(hosts[0])
			rt := store.Route{Name: it.Name, Protocol: "http", Hosts: hosts, Entrypoints: []string{}, Target: t, Middlewares: it.Middlewares, TLS: tls, Enabled: bool(h.Enabled), Settings: settingsOf(hostSettings)}
			it.Route = &rt
		}
		p.Items = append(p.Items, it)
		// Custom locations become their own routes with a path prefix, same domains and protection.
		for i, loc := range h.Locations {
			li := Item{ID: fmt.Sprintf("proxy-%d-loc-%d", h.ID, i+1), Kind: "location", Source: strings.Join(hosts, ", ") + " " + loc.Path,
				Action: it.Action, Reason: it.Reason, Notes: []string{}, Converted: []string{}, Middlewares: it.Middlewares, Entrypoints: []string{}, Certs: it.Certs, TLS: it.TLS, UsesResolver: it.UsesResolver}
			ls := loc.ForwardScheme
			if ls != "https" {
				ls = "http"
			}
			lt, ldesc := target(loc.ForwardHost, loc.ForwardPort, ls, containers)
			li.Target = ldesc
			path := loc.Path
			if !strings.HasPrefix(path, "/") || strings.ContainsAny(path, "~^$*()") {
				li.Action, li.Reason = "skip", fmt.Sprintf("Location %q is a regular expression; recreate it with a custom rule.", loc.Path)
			}
			// nginx locations inherit what their server block sets.
			locSettings := readNginx(&li, loc.AdvancedConfig, hostSettings, true)
			if li.Action == "import" {
				li.Name = nm.name(it.Name + "-" + strings.Trim(path, "/"))
				rt := store.Route{Name: li.Name, Protocol: "http", Hosts: hosts, PathPrefix: strings.TrimSuffix(path, "/"), Entrypoints: []string{}, Target: lt,
					Middlewares: it.Middlewares, TLS: tls, Enabled: bool(h.Enabled), Settings: settingsOf(locSettings)}
				if rt.PathPrefix == "" {
					rt.PathPrefix = "/"
				}
				li.Route = &rt
			}
			p.Items = append(p.Items, li)
		}
	}

	for _, r := range d.Redirections {
		hosts := lower(r.DomainNames)
		it := Item{ID: fmt.Sprintf("redirect-%d", r.ID), Kind: "redirect", Source: strings.Join(hosts, ", "), Action: "import", Notes: []string{}, Converted: []string{}, Middlewares: []string{}, Entrypoints: []string{}, Certs: []int{}}
		conflict(&it, hosts)
		dest := strings.TrimSuffix(strings.TrimSpace(r.ForwardDomain), "/")
		repl := ""
		regex := `^https?://[^/]+(.*)$`
		switch r.ForwardScheme {
		case "http", "https":
			repl = r.ForwardScheme + "://" + dest
		default: // auto: keep the visitor's scheme
			regex = `^(https?)://[^/]+(.*)$`
			repl = "${1}://" + dest
		}
		if r.PreservePath {
			if r.ForwardScheme == "http" || r.ForwardScheme == "https" {
				repl += "${1}"
			} else {
				repl += "${2}"
			}
		} else {
			repl += "/"
		}
		code := r.ForwardCode
		shown := map[string]string{"http": "http://", "https": "https://"}[r.ForwardScheme] + dest
		if shown == dest {
			shown = "the same scheme on " + dest
		}
		if r.PreservePath {
			shown += ", keeping the path"
		}
		it.Target = fmt.Sprintf("redirect (%d) to %s", code, shown)
		tls := tlsFor(&it, r.CertificateID, bool(r.SSLForced))
		if tls.Enabled {
			hsts(&it, bool(r.HSTSEnabled), bool(r.HSTSSubdomains))
		}
		if code == 307 || code == 308 {
			it.Notes = append(it.Notes, fmt.Sprintf("Traefik answers %d redirects as %d for GET requests.", code, map[int]int{307: 302, 308: 301}[code]))
		}
		redirectSettings := readNginx(&it, r.AdvancedConfig, store.RouteSettings{}, false)
		if it.Action == "import" {
			it.Name = nm.name(hosts[0])
			mw := nm.name("redirect-" + it.Name)
			p.Middlewares[mw] = store.Middleware{Name: mw, Protocol: "http", Type: "redirectRegex",
				Config: map[string]any{"regex": regex, "replacement": repl, "permanent": code == 301 || code == 308}}
			it.Middlewares = append([]string{mw}, it.Middlewares...)
			rt := store.Route{Name: it.Name, Protocol: "http", Hosts: hosts, Entrypoints: []string{}, Target: store.Target{Kind: "service", Service: "noop@internal"},
				Middlewares: it.Middlewares, TLS: tls, Enabled: bool(r.Enabled), Settings: settingsOf(redirectSettings)}
			it.Route = &rt
		}
		p.Items = append(p.Items, it)
	}

	epByPort := map[string]string{}
	for _, e := range st.Traefik.Entrypoints {
		epByPort[fmt.Sprintf("%d/%s", e.Port, e.Protocol)] = e.Name
	}
	for _, s := range d.Streams {
		for _, proto := range []string{"tcp", "udp"} {
			if (proto == "tcp" && !s.TCP) || (proto == "udp" && !s.UDP) {
				continue
			}
			it := Item{ID: fmt.Sprintf("stream-%d-%s", s.ID, proto), Kind: "stream", Source: fmt.Sprintf("port %d/%s", s.IncomingPort, proto), Action: "import",
				Notes: []string{}, Converted: []string{}, Middlewares: []string{}, Entrypoints: []string{}, Certs: []int{}}
			t, desc := target(s.ForwardingHost, s.ForwardingPort, "", containers)
			t.Scheme = ""
			it.Target = desc
			key := fmt.Sprintf("%d/%s", s.IncomingPort, proto)
			ep, exists := epByPort[key]
			if !exists {
				ep = fmt.Sprintf("npm-%s-%d", proto, s.IncomingPort)
				p.Entrypoints[ep] = store.Entrypoint{Name: ep, Port: s.IncomingPort, Protocol: proto}
				p.StreamPorts[ep] = s.IncomingPort
				epByPort[key] = ep
				it.Notes = append(it.Notes, fmt.Sprintf("New entrypoint %s. The port opens on the host when you switch traffic from NPM.", ep))
			} else {
				for _, r := range st.Routes {
					if r.Protocol == proto && len(r.Hosts) == 0 && contains(r.Entrypoints, ep) {
						it.Action, it.Reason = "skip", fmt.Sprintf("Port %s already goes to eztraefik route %s.", key, r.Name)
					}
				}
			}
			it.Entrypoints = []string{ep}
			if !s.Enabled {
				it.Notes = append(it.Notes, "Disabled in NPM: imported disabled.")
			}
			if it.Action == "import" {
				it.Name = nm.name(fmt.Sprintf("npm-%s-%d", proto, s.IncomingPort))
				rt := store.Route{Name: it.Name, Protocol: proto, Hosts: []string{}, Entrypoints: []string{ep}, Target: t, Middlewares: []string{}, Enabled: bool(s.Enabled)}
				it.Route = &rt
			}
			p.Items = append(p.Items, it)
		}
	}

	for _, dh := range d.DeadHosts {
		p.Items = append(p.Items, Item{ID: fmt.Sprintf("notfound-%d", dh.ID), Kind: "notfound", Source: strings.Join(lower(dh.DomainNames), ", "), Action: "skip",
			Reason: "Not needed: Traefik already answers 404 for domains without a route.", Notes: []string{}, Converted: []string{}, Middlewares: []string{}, Entrypoints: []string{}, Certs: []int{}})
	}
	sort.SliceStable(p.Items, func(i, j int) bool { return kindOrder[p.Items[i].Kind] < kindOrder[p.Items[j].Kind] })
	return p
}

var kindOrder = map[string]int{"proxy": 0, "location": 0, "redirect": 1, "stream": 2, "notfound": 3}

func toAny(ss []string) []any {
	out := make([]any, len(ss))
	for i, s := range ss {
		out[i] = s
	}
	return out
}

func contains(ss []string, s string) bool {
	for _, x := range ss {
		if x == s {
			return true
		}
	}
	return false
}

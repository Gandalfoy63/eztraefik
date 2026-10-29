package npm

import (
	"encoding/json"
	"strings"
	"testing"

	"eztraefik/internal/docker"
	"eztraefik/internal/store"
)

// Shapes taken from a real NPM 2.15.1 API (dev environment).
const sample = `{
 "proxyHosts": [
  {"id":1,"domain_names":["a.npm.test","WWW.a.npm.test"],"forward_scheme":"http","forward_host":"app-a","forward_port":80,"access_list_id":0,"certificate_id":2,
   "ssl_forced":true,"hsts_enabled":true,"hsts_subdomains":false,"block_exploits":true,"caching_enabled":false,"advanced_config":"","enabled":1,
   "locations":[{"path":"/api","forward_scheme":"http","forward_host":"10.0.0.9","forward_port":8080,"advanced_config":""}]},
  {"id":2,"domain_names":["secure.npm.test"],"forward_scheme":"https","forward_host":"app-b","forward_port":443,"access_list_id":1,"certificate_id":3,
   "ssl_forced":false,"advanced_config":"client_max_body_size 50m;","enabled":true,"locations":[]}
 ],
 "redirections": [{"id":1,"domain_names":["old.npm.test"],"forward_scheme":"https","forward_domain_name":"a.npm.test","forward_http_code":301,"preserve_path":true,"certificate_id":0,"enabled":true}],
 "streams": [{"id":1,"incoming_port":5432,"forwarding_host":"db","forwarding_port":5432,"tcp_forwarding":true,"udp_forwarding":true,"enabled":true}],
 "accessLists": [{"id":1,"name":"Team","satisfy_any":true,"pass_auth":false,"items":[{"username":"alice"}],
   "clients":[{"address":"192.168.1.0/24","directive":"allow"},{"address":"10.9.9.9","directive":"deny"},{"address":"all","directive":"deny"}]}],
 "certificates": [
   {"id":2,"provider":"letsencrypt","nice_name":"a","domain_names":["a.npm.test"],"meta":{"letsencrypt_email":"me@npm.test"}},
   {"id":3,"provider":"other","nice_name":"Internal","domain_names":["*.npm.test"],"meta":{"certificate":"CERT","certificate_key":"KEY"}}
 ],
 "deadHosts": [{"id":1,"domain_names":["gone.npm.test"]}]
}`

func load(t *testing.T) Data {
	var d Data
	if err := json.Unmarshal([]byte(sample), &d); err != nil {
		t.Fatal(err)
	}
	return d
}

func containers() []docker.ContainerSummary {
	var c []docker.ContainerSummary
	_ = json.Unmarshal([]byte(`[{"Id":"aaaaaaaaaaaa1","Names":["/app-a"]},{"Id":"bbbbbbbbbbbb1","Names":["/app-b"]}]`), &c)
	return c
}

func state() store.State {
	return store.State{Traefik: store.TraefikConfig{Entrypoints: []store.Entrypoint{
		{Name: "web", Port: 80, Protocol: "tcp", HostPort: 18080}, {Name: "websecure", Port: 443, Protocol: "tcp", HostPort: 18443}}}}
}

func item(p Plan, id string) Item {
	for _, it := range p.Items {
		if it.ID == id {
			return it
		}
	}
	return Item{}
}

func TestPlanMapsEveryKind(t *testing.T) {
	p := BuildPlan(load(t), state(), containers(), Options{Htpasswd: map[int][]string{1: {"alice:$apr1$x$y"}}})

	a := item(p, "proxy-1")
	if a.Action != "import" || a.Route.Target.Kind != "docker" || a.Route.Target.Container != "app-a" || a.Route.Hosts[1] != "www.a.npm.test" {
		t.Errorf("proxy-1: %+v %+v", a, a.Route)
	}
	if a.Route.TLS.Mode != "resolver" || p.Resolver == nil || p.Resolver.Email != "me@npm.test" || !strings.Contains(strings.Join(a.Middlewares, ","), "npm-hsts") {
		t.Errorf("proxy-1 TLS / HSTS: %+v resolver %+v", a.Route.TLS, p.Resolver)
	}
	loc := item(p, "proxy-1-loc-1")
	if loc.Route == nil || loc.Route.PathPrefix != "/api" || loc.Route.Target.Kind != "ip" || loc.Route.Target.Address != "10.0.0.9" {
		t.Errorf("location: %+v", loc.Route)
	}

	s := item(p, "proxy-2")
	if s.Action != "import" || s.Route.TLS.Mode != "existing" || s.Route.TLS.Domain != "*.npm.test" || len(s.Certs) != 1 || s.Route.Target.Scheme != "https" {
		t.Errorf("proxy-2: %+v", s)
	}
	auth := p.Middlewares["npm-acl-team-auth"]
	if auth.Type != "basicAuth" || auth.Config["removeHeader"] != true {
		t.Errorf("basic auth middleware: %+v", auth)
	}
	if ips := p.Middlewares["npm-acl-team-ips"]; ips.Type != "ipAllowList" {
		t.Errorf("ip middleware: %+v", ips)
	}
	notes := strings.Join(s.Notes, " ")
	for _, want := range []string{"10.9.9.9", "allowed IP OR a password", "Custom nginx config", "redirected to HTTPS"} {
		if !strings.Contains(notes, want) {
			t.Errorf("proxy-2 notes miss %q: %s", want, notes)
		}
	}

	rd := item(p, "redirect-1")
	mw := p.Middlewares[rd.Middlewares[0]]
	if rd.Route.Target.Service != "noop@internal" || mw.Config["replacement"] != "https://a.npm.test${1}" || mw.Config["permanent"] != true {
		t.Errorf("redirect: %+v %+v", rd.Route, mw)
	}
	tcp, udp := item(p, "stream-1-tcp"), item(p, "stream-1-udp")
	if tcp.Route.Protocol != "tcp" || udp.Route.Protocol != "udp" || p.StreamPorts["npm-tcp-5432"] != 5432 || p.Entrypoints["npm-udp-5432"].Protocol != "udp" {
		t.Errorf("streams: %+v %+v %+v", tcp.Route, udp.Route, p.StreamPorts)
	}
	if p.Entrypoints["npm-tcp-5432"].HostPort != 0 {
		t.Error("stream ports must not be published before the switch-over")
	}
	if item(p, "notfound-1").Action != "skip" {
		t.Error("404 hosts are not imported")
	}
}

func TestProtectedHostNeedsPasswords(t *testing.T) {
	p := BuildPlan(load(t), state(), containers(), Options{})
	s := item(p, "proxy-2")
	if s.Action != "skip" || len(s.Passwords) != 1 || s.Passwords[0] != "1/alice" {
		t.Fatalf("a protected host without hashes must be skipped and ask for passwords: %+v", s)
	}
	p = BuildPlan(load(t), state(), containers(), Options{Passwords: map[string]string{"1/alice": "pw"}, Hash: func(s string) string { return "HASH" }})
	if item(p, "proxy-2").Action != "import" || p.Middlewares["npm-acl-team-auth"].Config["users"].([]any)[0] != "alice:HASH" {
		t.Fatalf("typed password not used: %+v", p.Middlewares["npm-acl-team-auth"])
	}
}

func TestConflictsAndRedirectingWeb(t *testing.T) {
	st := state()
	st.Routes = []store.Route{{Name: "existing", Hosts: []string{"a.npm.test"}}}
	st.Traefik.Entrypoints[0].RedirectTo = "websecure"
	st.Traefik.Resolvers = []store.Resolver{{Name: "acme"}}
	p := BuildPlan(load(t), st, containers(), Options{Htpasswd: map[int][]string{1: {"alice:h"}}})
	if it := item(p, "proxy-1"); it.Action != "skip" || !strings.Contains(it.Reason, "existing") {
		t.Errorf("domain conflict not detected: %+v", it)
	}
	if rd := item(p, "redirect-1"); !rd.Route.TLS.Enabled || rd.Route.TLS.Resolver != "acme" || p.Resolver != nil {
		t.Errorf("plain host on a redirecting web entrypoint must get HTTPS from the existing resolver: %+v", rd.Route.TLS)
	}
}

// NPM 2.12+ keeps no email in Let's Encrypt certificates: the NPM account email must be used, not every host skipped.
func TestLetsEncryptWithoutEmailUsesNPMAccount(t *testing.T) {
	d := load(t)
	for i := range d.Certificates {
		d.Certificates[i].Meta.Email = ""
	}
	if it := item(BuildPlan(d, state(), containers(), Options{Htpasswd: map[int][]string{1: {"alice:h"}}}), "proxy-1"); it.Action != "skip" {
		t.Fatalf("without any email the host can't get a resolver: %+v", it)
	}
	p := BuildPlan(d, state(), containers(), Options{Htpasswd: map[int][]string{1: {"alice:h"}}, FallbackEmail: "me@npm.test"})
	if it := item(p, "proxy-1"); it.Action != "import" || p.Resolver == nil || p.Resolver.Email != "me@npm.test" {
		t.Fatalf("NPM account email not used: %+v resolver %+v", it, p.Resolver)
	}
	if len(p.Warnings) == 0 || !strings.Contains(p.Warnings[0], "me@npm.test") {
		t.Errorf("the plan must say which email it used: %v", p.Warnings)
	}
	if s := item(p, "stream-1-tcp"); strings.HasPrefix(s.Target, "://") {
		t.Errorf("stream target shown as %q", s.Target)
	}
}

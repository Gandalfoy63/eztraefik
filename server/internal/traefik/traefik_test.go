package traefik

import (
	"strings"
	"testing"

	"eztraefik/internal/store"
)

func TestRule(t *testing.T) {
	cases := []struct {
		r    store.Route
		want string
	}{
		{store.Route{Protocol: "http", Hosts: []string{"a.test"}}, "Host(`a.test`)"},
		{store.Route{Protocol: "http", Hosts: []string{"a.test", "b.test"}, PathPrefix: "/api"}, "(Host(`a.test`) || Host(`b.test`)) && PathPrefix(`/api`)"},
		{store.Route{Protocol: "tcp"}, "HostSNI(`*`)"},
		{store.Route{Protocol: "tcp", Hosts: []string{"db.test"}}, "HostSNI(`db.test`)"},
		{store.Route{Protocol: "http", RawRule: "Header(`X`, `1`)"}, "Header(`X`, `1`)"},
	}
	for _, c := range cases {
		if got := Rule(c.r); got != c.want {
			t.Errorf("Rule = %s, want %s", got, c.want)
		}
	}
}

func TestRenderRedirectKeepsPublishedPort(t *testing.T) {
	st := store.State{
		Traefik: store.TraefikConfig{Entrypoints: []store.Entrypoint{
			{Name: "web", Port: 80, Protocol: "tcp", HostPort: 18080},
			{Name: "websecure", Port: 443, Protocol: "tcp", HostPort: 18443},
		}, Resolvers: []store.Resolver{{Name: "acme"}}},
		Routes: []store.Route{{Name: "app", Protocol: "http", Hosts: []string{"app.ezt.test"}, Entrypoints: []string{"websecure"}, Enabled: true,
			Target: store.Target{Kind: "docker", Container: "whoami", Port: 80}, TLS: store.RouteTLS{Enabled: true, Mode: "resolver", Resolver: "acme", Redirect: true}}},
	}
	y := ToYAML(Render(st))
	for _, want := range []string{`url: "http://whoami:80"`, `certResolver: "acme"`, `port: "18443"`, `app-redirect:`, `rule: "Host(` + "`app.ezt.test`" + `)"`} {
		if !strings.Contains(y, want) {
			t.Errorf("YAML missing %s:\n%s", want, y)
		}
	}
}

func TestFlagsRedirectToPublishedPort(t *testing.T) {
	cfg := store.TraefikConfig{Network: "ezt", Entrypoints: []store.Entrypoint{
		{Name: "web", Port: 80, Protocol: "tcp", HostPort: 18080, RedirectTo: "websecure"},
		{Name: "websecure", Port: 443, Protocol: "tcp", HostPort: 18443},
		{Name: "dns", Port: 53, Protocol: "udp", HostPort: 15353},
	}}
	f := strings.Join(Flags(cfg), " ")
	for _, want := range []string{"--entrypoints.web.http.redirections.entrypoint.to=:18443", "--entrypoints.dns.address=:53/udp"} {
		if !strings.Contains(f, want) {
			t.Errorf("flags missing %s: %s", want, f)
		}
	}
}

func TestParseProm(t *testing.T) {
	text := `# HELP x
traefik_router_requests_total{code="200",method="GET",protocol="http",router="app@file",service="app@file"} 12
traefik_entrypoint_request_duration_seconds_bucket{code="200",entrypoint="web",le="0.1"} 3
traefik_open_connections{entrypoint="web",protocol="TCP"} 2`
	s := ParseProm(text)
	if len(s) != 3 || s[0].Labels["router"] != "app@file" || s[0].Value != 12 || s[1].Labels["le"] != "0.1" {
		t.Fatalf("unexpected parse: %+v", s)
	}
}

func TestCovers(t *testing.T) {
	if !Covers("*.ezt.test", "app.ezt.test") || Covers("*.ezt.test", "a.b.ezt.test") || Covers("*.ezt.test", "ezt.test") {
		t.Error("wildcard matching is wrong")
	}
}

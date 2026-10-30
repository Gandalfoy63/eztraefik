package api

import (
	"slices"
	"strings"
	"testing"

	"eztraefik/internal/store"
	"eztraefik/internal/traefik"
)

func TestComputeProgress(t *testing.T) {
	hosts := []string{"a.x.test", "b.x.test", "c.y.test", "d.z.test"}
	certs := []traefik.Cert{{Source: "acme", Domains: []string{"*.x.test"}}, {Source: "uploaded", Domains: []string{"d.z.test"}}}
	logs := []string{
		`ERR Unable to obtain ACME certificate for domains error="unable to generate a certificate for the domains [a.x.test]: time limit exceeded"`,
		`ERR Unable to obtain ACME certificate for domains error="unable to generate a certificate for the domains [c.y.test]: (KO) url token=SECRET"`,
	}
	p := computeProgress(hosts, certs, logs)
	if !slices.Equal(p.Done, []string{"a.x.test", "b.x.test"}) {
		t.Errorf("a wildcard covers both, even after an earlier failure: %v", p.Done)
	}
	if len(p.Failed) != 1 || p.Failed[0].Host != "c.y.test" || strings.Contains(p.Failed[0].Reason, "SECRET") {
		t.Errorf("failed: %+v", p.Failed)
	}
	if !slices.Equal(p.Waiting, []string{"d.z.test"}) {
		t.Errorf("an uploaded certificate doesn't count as renewed: %v", p.Waiting)
	}
}

func TestCertHostsSkipsWhatGetsNoACMECertificate(t *testing.T) {
	st := store.State{Traefik: store.TraefikConfig{Resolvers: []store.Resolver{{Name: "le"}}}, Routes: []store.Route{
		{Enabled: true, Hosts: []string{"on.test"}, TLS: store.RouteTLS{Enabled: true, Mode: "resolver"}},
		{Enabled: false, Hosts: []string{"off.test"}, TLS: store.RouteTLS{Enabled: true, Mode: "resolver"}},
		{Enabled: true, Hosts: []string{"plain.test"}},
		{Enabled: true, Hosts: []string{"upload.test"}, TLS: store.RouteTLS{Enabled: true, Mode: "existing", Domain: "upload.test"}},
	}}
	if got := certHosts(st, ""); !slices.Equal(got, []string{"on.test"}) {
		t.Errorf("%v", got)
	}
}

// A retry looks at one resolver: its hosts, and only its certificates count.
func TestRetryIsLimitedToOneResolver(t *testing.T) {
	st := store.State{Traefik: store.TraefikConfig{Resolvers: []store.Resolver{{Name: "first"}, {Name: "second"}}}, Routes: []store.Route{
		{Enabled: true, Hosts: []string{"a.test"}, TLS: store.RouteTLS{Enabled: true, Mode: "resolver", Resolver: "first"}},
		{Enabled: true, Hosts: []string{"b.test"}, TLS: store.RouteTLS{Enabled: true, Mode: "resolver", Resolver: "second"}},
	}}
	hosts := certHosts(st, "second")
	if !slices.Equal(hosts, []string{"b.test"}) {
		t.Fatalf("%v", hosts)
	}
	certs := []traefik.Cert{{Source: "acme", Resolver: "first", Domains: []string{"b.test"}}}
	if p := computeProgress(hosts, resolverCerts(certs, "second"), nil); !slices.Equal(p.Waiting, []string{"b.test"}) {
		t.Errorf("another resolver's certificate must not count: %+v", p)
	}
	if len(certs) != 1 {
		t.Errorf("the list itself must stay: %v", certs)
	}
}

func TestLogsHideTokens(t *testing.T) {
	got := tokenInURL.ReplaceAllString("update?clear=false&domains=a&token=abc-123&txt=x", "${1}***")
	if strings.Contains(got, "abc-123") || !strings.Contains(got, "&txt=x") {
		t.Errorf("%s", got)
	}
}

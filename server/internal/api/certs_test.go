package api

import (
	"slices"
	"testing"

	"eztraefik/internal/store"
)

func certRoutes() *store.State {
	return &store.State{
		Routes: []store.Route{
			{Name: "uses-upload", TLS: store.RouteTLS{Enabled: true, Mode: "existing", Domain: "*.a.test", Redirect: true}},
			{Name: "uses-issued", TLS: store.RouteTLS{Enabled: true, Mode: "existing", Domain: "*.a.test", Resolver: "le"}},
			{Name: "uses-resolver", TLS: store.RouteTLS{Enabled: true, Mode: "resolver", Resolver: "le", Redirect: true}},
			{Name: "other", TLS: store.RouteTLS{Enabled: true, Mode: "resolver", Resolver: "other"}},
		},
		Domains: []store.Domain{{Name: "a.test", Resolver: "le"}},
	}
}

// Deleting a certificate must keep the route, on HTTPS, and only drop the certificate choice.
func TestDeletedUploadLeavesRoutes(t *testing.T) {
	st := certRoutes()
	got := detachCert(st, store.UploadedCert{Domains: []string{"*.a.test"}})
	if !slices.Equal(got, []string{"uses-upload"}) || len(st.Routes) != 4 {
		t.Fatalf("detached %v, %d routes", got, len(st.Routes))
	}
	r := st.Routes[0].TLS
	if !r.Enabled || !r.Redirect || r.Mode != "resolver" || r.Domain != "" {
		t.Errorf("route must stay on HTTPS without the certificate: %+v", r)
	}
	if st.Routes[1].TLS.Domain != "*.a.test" {
		t.Error("a certificate issued by a resolver is a different one")
	}
}

func TestSameDomainUploadKeepsRoutes(t *testing.T) {
	st := certRoutes()
	st.Certificates = []store.UploadedCert{{Domains: []string{"*.a.test"}}}
	if got := detachCert(st, store.UploadedCert{Domains: []string{"*.a.test"}}); len(got) != 0 {
		t.Errorf("another upload still covers it: %v", got)
	}
}

func TestDeletedResolverLeavesRoutesAndDomains(t *testing.T) {
	st := certRoutes()
	got := detachResolver(st, "le")
	if !slices.Equal(got, []string{"uses-issued", "uses-resolver"}) || len(st.Routes) != 4 {
		t.Fatalf("detached %v", got)
	}
	if !st.Routes[2].TLS.Enabled || st.Routes[2].TLS.Resolver != "" || st.Routes[3].TLS.Resolver != "other" || st.Domains[0].Resolver != "" {
		t.Errorf("%+v %+v", st.Routes, st.Domains)
	}
}

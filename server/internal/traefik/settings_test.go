package traefik

import (
	"slices"
	"testing"

	"eztraefik/internal/store"
)

func TestRouteSettingsRender(t *testing.T) {
	r := store.Route{Name: "app", Protocol: "http", Hosts: []string{"a.test"}, Enabled: true, Middlewares: []string{"mine"},
		Target: store.Target{Kind: "ip", Address: "10.0.0.1", Port: 80, Scheme: "https"},
		Settings: &store.RouteSettings{MaxBodyBytes: 26214400, AllowedIPs: []string{"10.0.0.0/8"}, ConnectTimeout: 30, SkipCertificateCheck: true,
			HidePublicDomain: true, Compress: true, ResponseHeaders: map[string]string{"X-A": "b"}, RewritePattern: "^/a(.*)", RewriteTarget: "/${1}"}}
	st := store.State{Routes: []store.Route{r}, Services: []store.Service{{Name: "s", InsecureSkipVerify: true}}}
	out := Render(st)
	RenderTransports(out, st)
	h := out["http"].(M)

	list := h["routers"].(M)["app"].(M)["middlewares"].([]any)
	want := []any{"ezt-app-ips", "mine", "ezt-app-limit", "ezt-app-headers", "ezt-app-compress", "ezt-app-rewrite"}
	if !slices.Equal(list, want) {
		t.Errorf("order: %v", list)
	}
	mws := h["middlewares"].(M)
	if mws["ezt-app-limit"].(M)["buffering"].(M)["maxRequestBodyBytes"] != int64(26214400) {
		t.Errorf("limit: %v", mws["ezt-app-limit"])
	}
	lb := h["services"].(M)["app"].(M)["loadBalancer"].(M)
	if lb["serversTransport"] != "ezt-app@file" || lb["passHostHeader"] != false {
		t.Errorf("service: %v", lb)
	}
	tr := h["serversTransports"].(M)
	if tr["ezt-app"].(M)["forwardingTimeouts"].(M)["dialTimeout"] != "30s" || tr["ezt-insecure"] == nil {
		t.Errorf("a route transport and the shared one must both exist: %v", tr)
	}
}

func TestNoSettingsAddNothing(t *testing.T) {
	r := store.Route{Name: "app", Protocol: "http", Hosts: []string{"a.test"}, Enabled: true, Target: store.Target{Kind: "ip", Address: "10.0.0.1", Port: 80}}
	h := Render(store.State{Routes: []store.Route{r}})["http"].(M)
	if _, has := h["middlewares"]; has {
		t.Error("no middleware expected")
	}
	if _, has := h["serversTransports"]; has {
		t.Error("no transport expected")
	}
}

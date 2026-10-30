package npm

import (
	"slices"
	"strings"
	"testing"

	"eztraefik/internal/store"
)

func TestNginxUserConfig(t *testing.T) {
	n := ParseNginx("client_max_body_size 25m;", store.RouteSettings{}, true)
	if n.Settings.MaxBodyBytes != 25*1024*1024 || n.Converted[0] != "Max Upload Size: 25 MB" || len(n.Skipped) != 0 {
		t.Fatalf("%+v", n)
	}
}

func TestNginxEveryDirective(t *testing.T) {
	n := ParseNginx(`
# a comment; with a semicolon
client_max_body_size 1G;
proxy_connect_timeout 30s;
proxy_read_timeout 5m;
proxy_ssl_verify off;
gzip on;
add_header X-Frame-Options "DENY" always;
add_header X-Custom "a b";
proxy_hide_header Server;
proxy_set_header X-Env prod;
proxy_set_header Host $proxy_host;
rewrite ^/api/(.*)$ /$1 break;
allow 10.0.0.0/8;
allow 192.168.1.5;
deny all;
`, store.RouteSettings{}, true)
	s := n.Settings
	if s.MaxBodyBytes != 1<<30 || s.ConnectTimeout != 30 || s.ResponseTimeout != 300 || !s.SkipCertificateCheck || !s.Compress || !s.BlockFrames || !s.HidePublicDomain {
		t.Errorf("settings: %+v", s)
	}
	if s.ResponseHeaders["X-Custom"] != "a b" || s.ResponseHeaders["Server"] != "" || s.RequestHeaders["X-Env"] != "prod" {
		t.Errorf("headers: %+v %+v", s.ResponseHeaders, s.RequestHeaders)
	}
	if _, removed := s.ResponseHeaders["Server"]; !removed {
		t.Error("proxy_hide_header must remove the header")
	}
	if s.RewritePattern != "^/api/(.*)$" || s.RewriteTarget != "/${1}" {
		t.Errorf("rewrite: %q %q", s.RewritePattern, s.RewriteTarget)
	}
	if !slices.Equal(s.AllowedIPs, []string{"10.0.0.0/8", "192.168.1.5"}) {
		t.Errorf("ips: %v", s.AllowedIPs)
	}
	if len(n.Skipped) != 0 {
		t.Errorf("skipped: %v", n.Skipped)
	}
}

func TestNginxCoveredNeedsNoSetting(t *testing.T) {
	n := ParseNginx(`proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_buffering off;
client_max_body_size 0;`, store.RouteSettings{}, true)
	if len(n.Covered) != 7 || len(n.Converted) != 0 || len(n.Skipped) != 0 {
		t.Fatalf("%+v", n)
	}
	if !n.Settings.IsEmpty() {
		t.Errorf("no setting expected: %+v", n.Settings)
	}
}

// A block applies only under its condition: what is inside must never become host-wide.
func TestNginxBlocksAreNotEntered(t *testing.T) {
	n := ParseNginx(`location /upload { client_max_body_size 1g; add_header X-A b; }
if ($host = x) { return 301 https://y; }
client_max_body_size 5m;`, store.RouteSettings{}, true)
	if n.Settings.MaxBodyBytes != 5*1024*1024 || n.Settings.RedirectPattern != "" || n.Settings.ResponseHeaders != nil {
		t.Errorf("block content leaked: %+v", n.Settings)
	}
	if len(n.Skipped) != 2 || !strings.HasPrefix(n.Skipped[0], "location /upload") {
		t.Errorf("skipped: %v", n.Skipped)
	}
}

func TestNginxReturnKeepsHostAndPath(t *testing.T) {
	n := ParseNginx("return 301 https://$host$request_uri;", store.RouteSettings{}, true)
	if n.Settings.RedirectTarget != "https://${2}${3}" || !n.Settings.RedirectPermanent {
		t.Fatalf("%+v", n.Settings)
	}
	if ParseNginx("return 404;", store.RouteSettings{}, true).Skipped[0] != "return 404" {
		t.Error("return without a URL has no conversion")
	}
}

// Rules that would change meaning stay visible as not converted.
func TestNginxKeepsWhatItCannotConvert(t *testing.T) {
	for _, src := range []string{
		"allow 10.0.0.1;",                          // without deny all, it allows everyone
		"deny 10.0.0.1; allow all;",                // Traefik Proxy has no deny list
		"allow 10.0.0.1; deny 10.0.0.2; deny all;", // order matters
		"add_header X-Id $request_id;",             // a variable Traefik does not have
		"proxy_set_header X-Id $request_id;",
		"rewrite ^/(?=x)(.*)$ /$1;", // lookahead: not a Go regular expression
		"rewrite ^/a$ /b redirect;", // relative redirect
		"rewrite ^/a$ /$host;",      // variable
		"proxy_cache my_cache;",     // unknown
		"proxy_ssl_verify on;",
		"client_max_body_size 25m", // no semicolon
	} {
		n := ParseNginx(src, store.RouteSettings{}, true)
		if len(n.Skipped) == 0 || !n.Settings.IsEmpty() {
			t.Errorf("%q: skipped %v settings %+v", src, n.Skipped, n.Settings)
		}
	}
}

func TestNginxInheritanceDoesNotShareMaps(t *testing.T) {
	host := ParseNginx("add_header X-A a;", store.RouteSettings{}, true).Settings
	loc := ParseNginx("add_header X-B b; client_max_body_size 2m;", host, true).Settings
	if loc.ResponseHeaders["X-A"] != "a" || loc.ResponseHeaders["X-B"] != "b" {
		t.Errorf("location: %+v", loc.ResponseHeaders)
	}
	if _, leaked := host.ResponseHeaders["X-B"]; leaked {
		t.Error("a location changed its host's settings")
	}
}

func TestNginxRedirectHostHasNoAppConnection(t *testing.T) {
	n := ParseNginx("proxy_read_timeout 60s; proxy_ssl_verify off;", store.RouteSettings{}, false)
	if len(n.Skipped) != 2 || !n.Settings.IsEmpty() {
		t.Fatalf("%+v", n)
	}
}

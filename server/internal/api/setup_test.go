package api

import "testing"

// The setup must never offer eztraefik itself as a Traefik container to replace (that stopped the setup mid-way).
func TestIsOtherTraefik(t *testing.T) {
	cases := []struct {
		image, role string
		want        bool
	}{
		{"traefik:v3.7.16", "", true},
		{"docker.io/library/traefik:v2.11", "", true},
		{"gandasdevstudio/eztraefik:1.2.1", "", false},
		{"eztraefik:dev", "", false},
		{"traefik/whoami:v1.11.0", "", false},
		{"traefik:v3.7.16", "traefik", false}, // already managed by eztraefik
		{"nginx:1.27", "", false},
	}
	for _, c := range cases {
		if got := isOtherTraefik(c.image, c.role, "0123456789ab"); got != c.want {
			t.Errorf("isOtherTraefik(%q, %q) = %v, want %v", c.image, c.role, got, c.want)
		}
	}
}

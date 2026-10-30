package domains

import "testing"

func TestRegistrable(t *testing.T) {
	for host, want := range map[string]string{
		"myhome.duckdns.org":     "myhome.duckdns.org",
		"app.myhome.duckdns.org": "myhome.duckdns.org",
		"*.myhome.duckdns.org":   "myhome.duckdns.org",
		"app.example.com":        "example.com",
		"example.com":            "example.com",
		"a.b.example.co.uk":      "example.co.uk",
		"foo.bar.ck":             "foo.bar.ck", // wildcard rule *.ck
		"www.ck":                 "www.ck",     // exception !www.ck
		"a.www.ck":               "www.ck",
		"localhost":              "localhost",
		"app.home.unknowntld":    "home.unknowntld",
	} {
		if got := Registrable(host); got != want {
			t.Errorf("Registrable(%q) = %q, want %q", host, got, want)
		}
	}
}

func TestGroup(t *testing.T) {
	cases := []struct {
		name     string
		hosts    []string
		explicit []string
		want     map[string]string
	}{
		{"shared suffix", []string{"myhome.duckdns.org", "a.myhome.duckdns.org", "other.duckdns.org"}, nil,
			map[string]string{"myhome.duckdns.org": "myhome.duckdns.org", "a.myhome.duckdns.org": "myhome.duckdns.org", "other.duckdns.org": "other.duckdns.org"}},
		{"plain domain stays", []string{"a.example.com", "b.example.com"}, nil,
			map[string]string{"a.example.com": "example.com", "b.example.com": "example.com"}},
		{"recurring part", []string{"a.home.example.com", "b.home.example.com"}, nil,
			map[string]string{"a.home.example.com": "home.example.com", "b.home.example.com": "home.example.com"}},
		{"recurring parts side by side", []string{"a.home.example.com", "b.home.example.com", "c.work.example.com"}, nil,
			map[string]string{"a.home.example.com": "home.example.com", "b.home.example.com": "home.example.com", "c.work.example.com": "work.example.com"}},
		{"a direct host keeps the domain", []string{"www.example.com", "a.home.example.com", "b.home.example.com"}, nil,
			map[string]string{"www.example.com": "example.com", "a.home.example.com": "example.com", "b.home.example.com": "example.com"}},
		{"one deep host is no pattern", []string{"a.b.example.com"}, nil, map[string]string{"a.b.example.com": "example.com"}},
		{"added domain wins", []string{"a.home.example.com", "b.home.example.com"}, []string{"example.com"},
			map[string]string{"a.home.example.com": "example.com", "b.home.example.com": "example.com"}},
		{"longest added domain wins", []string{"a.home.example.com"}, []string{"example.com", "home.example.com"},
			map[string]string{"a.home.example.com": "home.example.com"}},
		{"wildcard host", []string{"*.home.example.com", "a.home.example.com"}, nil,
			map[string]string{"*.home.example.com": "example.com", "a.home.example.com": "example.com"}},
	}
	for _, c := range cases {
		got := Group(c.hosts, c.explicit)
		for h, want := range c.want {
			if got[h] != want {
				t.Errorf("%s: %s is in %q, want %q", c.name, h, got[h], want)
			}
		}
	}
}

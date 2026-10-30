// Docs: docs/03 - Features/Domains.md
// Reference: docs/00 - Downloaded Docs/Public Suffix List/README.md
// Package domains finds which domain a host belongs to: myhome.duckdns.org, not duckdns.org.
package domains

import (
	_ "embed"
	"slices"
	"strings"
	"sync"
)

//go:embed public_suffix_list.dat
var pslData string

var loadRules = sync.OnceValue(func() map[string]bool {
	rules := map[string]bool{}
	for _, line := range strings.Split(pslData, "\n") {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "//") {
			rules[line] = true
		}
	}
	return rules
})

// Registrable returns the shortest name someone can own under a public suffix, following the list's algorithm:
// the longest matching rule wins, "*" matches one label, "!" is an exception, and no match means the last label.
func Registrable(host string) string {
	host = strings.TrimPrefix(strings.ToLower(host), "*.")
	labels := strings.Split(host, ".")
	rules := loadRules()
	suffix := 1
	for i := range labels {
		name := strings.Join(labels[i:], ".")
		if rules["!"+name] {
			suffix = len(labels) - i - 1
			break
		}
		wild := i > 0 && rules["*."+name]
		if wild {
			suffix = len(labels) - i + 1
			break
		}
		if rules[name] {
			suffix = len(labels) - i
			break
		}
	}
	if suffix >= len(labels) {
		return host
	}
	return strings.Join(labels[len(labels)-suffix-1:], ".")
}

// split narrows a domain when its hosts show a repeated part: with only a.home.example.com and b.home.example.com
// the domain is home.example.com. A host directly on the domain, like www.example.com, keeps the domain as it is.
func split(domain string, hosts []string, out map[string]string) {
	children := map[string][]string{}
	repeated := false
	for _, h := range hosts {
		rest, ok := strings.CutSuffix(h, "."+domain)
		if !ok || !strings.Contains(rest, ".") { // the domain itself, or one label below it
			children = nil
			break
		}
		child := rest[strings.LastIndex(rest, ".")+1:] + "." + domain
		children[child] = append(children[child], h)
		repeated = repeated || len(children[child]) > 1
	}
	if !repeated {
		for _, h := range hosts {
			out[h] = domain
		}
		return
	}
	for child, list := range children {
		split(child, list, out)
	}
}

// Group maps each host to its domain. A domain the user added always wins, the longest one first.
func Group(hosts, explicit []string) map[string]string {
	out := map[string]string{}
	inferred := map[string][]string{}
	byLength := slices.Clone(explicit)
	slices.SortFunc(byLength, func(a, b string) int { return len(b) - len(a) })
	for _, full := range hosts {
		h := strings.TrimPrefix(full, "*.")
		idx := slices.IndexFunc(byLength, func(d string) bool { return h == d || strings.HasSuffix(h, "."+d) })
		if idx >= 0 {
			out[full] = byLength[idx]
			continue
		}
		base := Registrable(h)
		if !slices.Contains(inferred[base], h) {
			inferred[base] = append(inferred[base], h)
		}
	}
	found := map[string]string{}
	for base, list := range inferred {
		split(base, list, found)
	}
	for _, full := range hosts {
		if _, done := out[full]; !done {
			out[full] = found[strings.TrimPrefix(full, "*.")]
		}
	}
	return out
}

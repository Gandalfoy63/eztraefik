// Docs: docs/03 - Features/Route Settings.md
// Reference: docs/00 - Downloaded Docs/nginx/README.md
package npm

import (
	"fmt"
	"net"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"eztraefik/internal/store"
)

// Nginx is what a custom nginx config becomes. Every directive lands in exactly one list, so nothing is lost silently.
type Nginx struct {
	Settings  store.RouteSettings
	Converted []string // named settings, for the review: "Max Upload Size: 25 MB"
	Covered   []string // directives Traefik does not need: it already behaves this way
	Skipped   []string // directives with no conversion, as written
}

type directive struct {
	name string
	args []string
	text string
}

// parseDirectives splits a config into top-level directives. Blocks (location, if...) are never entered:
// what is inside applies only under a condition, so reading it as host-wide would change behavior.
func parseDirectives(src string) (list []directive, skipped []string) {
	var tok []string
	var cur strings.Builder
	inTok := false
	flush := func() {
		if inTok {
			tok = append(tok, cur.String())
			cur.Reset()
			inTok = false
		}
	}
	text := func() string { return strings.Join(tok, " ") }
	for i := 0; i < len(src); i++ {
		c := src[i]
		switch {
		case c == '#':
			flush()
			for i < len(src) && src[i] != '\n' {
				i++
			}
		case c == '"' || c == '\'':
			inTok = true
			for i++; i < len(src) && src[i] != c; i++ {
				if src[i] == '\\' && i+1 < len(src) {
					i++
				}
				cur.WriteByte(src[i])
			}
		case c == ' ' || c == '\t' || c == '\n' || c == '\r':
			flush()
		case c == ';':
			flush()
			if len(tok) > 0 {
				list = append(list, directive{strings.ToLower(tok[0]), tok[1:], text()})
			}
			tok = nil
		case c == '{':
			flush()
			depth := 1
			for i++; i < len(src) && depth > 0; i++ {
				switch src[i] {
				case '{':
					depth++
				case '}':
					depth--
				}
			}
			i--
			skipped = append(skipped, text()+" { ... }")
			tok = nil
		default:
			inTok = true
			cur.WriteByte(c)
		}
	}
	flush()
	if len(tok) > 0 { // no closing semicolon: nginx would refuse it
		skipped = append(skipped, text())
	}
	return list, skipped
}

// nginxSize reads an nginx size: 25m, 1G, 512k, or plain bytes.
func nginxSize(s string) (int64, bool) {
	s = strings.ToLower(strings.TrimSpace(s))
	mul := int64(1)
	if s != "" {
		switch s[len(s)-1] {
		case 'k':
			mul, s = 1024, s[:len(s)-1]
		case 'm':
			mul, s = 1024*1024, s[:len(s)-1]
		case 'g':
			mul, s = 1024*1024*1024, s[:len(s)-1]
		}
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil || n < 0 {
		return 0, false
	}
	return n * mul, true
}

// nginxSeconds reads an nginx time: 90, 90s, 5m, 1h, rounded up to whole seconds.
func nginxSeconds(s string) (int, bool) {
	s = strings.ToLower(strings.TrimSpace(s))
	unit := map[string]float64{"ms": 0.001, "s": 1, "m": 60, "h": 3600, "d": 86400}
	mul := 1.0
	for _, u := range []string{"ms", "s", "m", "h", "d"} {
		if strings.HasSuffix(s, u) {
			mul, s = unit[u], strings.TrimSuffix(s, u)
			break
		}
	}
	n, err := strconv.ParseFloat(s, 64)
	if err != nil || n < 0 {
		return 0, false
	}
	out := int(n * mul)
	if float64(out) < n*mul {
		out++
	}
	return out, true
}

// FormatSize shows a byte count the way the Max Upload Size setting does.
func FormatSize(n int64) string {
	const mb = 1024 * 1024
	switch {
	case n >= 1024*mb && n%(1024*mb) == 0:
		return fmt.Sprintf("%d GB", n/(1024*mb))
	case n%mb == 0:
		return fmt.Sprintf("%d MB", n/mb)
	}
	return fmt.Sprintf("%.1f MB", float64(n)/mb)
}

// Request headers Traefik already sends (or passes through) with the value these nginx variables hold.
var forwardedHeaders = map[string][]string{
	"host":              {"$host", "$http_host"},
	"x-real-ip":         {"$remote_addr"},
	"x-forwarded-for":   {"$proxy_add_x_forwarded_for", "$remote_addr"},
	"x-forwarded-proto": {"$scheme"},
	"x-forwarded-host":  {"$host", "$http_host"},
	"x-forwarded-port":  {"$server_port"},
	"upgrade":           {"$http_upgrade"},
	"connection":        {"$http_connection", "$connection_upgrade", "upgrade"},
	"authorization":     {"$http_authorization"},
}

// directives that only repeat what Traefik does by default, by name and value ("" = any value).
var coveredDirectives = map[string]string{
	"proxy_http_version":      "",
	"proxy_buffering":         "off",
	"proxy_request_buffering": "off",
	"proxy_redirect":          "off",
	"proxy_send_timeout":      "",
	"gzip":                    "off",
}

var redirectVars = regexp.MustCompile(`\$[a-z_]+`)

// ParseNginx reads a custom nginx config on top of inherited settings (a custom location inherits its host's).
// forwards is false for hosts that answer themselves, like redirections: they have no connection to an app to tune.
func ParseNginx(src string, inherited store.RouteSettings, forwards bool) Nginx {
	s := inherited.Clone()
	list, skipped := parseDirectives(src)
	out := Nginx{Skipped: skipped}
	converted := func(format string, a ...any) { out.Converted = append(out.Converted, fmt.Sprintf(format, a...)) }

	// allow / deny only mean an allow list when they end with "deny all": nginx stops at the first match.
	access := []directive{}
	for _, d := range list {
		if d.name == "allow" || d.name == "deny" {
			access = append(access, d)
		}
	}
	ips := accessIPs(access)
	if ips == nil && len(access) > 0 {
		for _, d := range access {
			out.Skipped = append(out.Skipped, d.text)
		}
	} else if len(ips) > 0 {
		s.AllowedIPs = ips
		converted("Allowed IP Addresses: %s", strings.Join(ips, ", "))
	}

	for _, d := range list {
		arg := ""
		if len(d.args) > 0 {
			arg = d.args[0]
		}
		ok := false
		switch d.name {
		case "allow", "deny":
			continue
		case "client_max_body_size":
			if n, valid := nginxSize(arg); valid && len(d.args) == 1 {
				ok = true
				s.MaxBodyBytes = n
				if n == 0 {
					out.Covered = append(out.Covered, d.text)
				} else {
					converted("Max Upload Size: %s", FormatSize(n))
				}
			}
		case "proxy_connect_timeout":
			if n, valid := nginxSeconds(arg); valid && forwards {
				ok, s.ConnectTimeout = true, n
				converted("Connect Timeout: %d seconds", n)
			}
		case "proxy_read_timeout":
			if n, valid := nginxSeconds(arg); valid && forwards {
				ok, s.ResponseTimeout = true, n
				converted("Response Timeout: %d seconds", n)
			}
		case "proxy_ssl_verify":
			if arg == "off" && forwards {
				ok, s.SkipCertificateCheck = true, true
				converted("Skip App Certificate Check: on")
			}
		case "gzip":
			if arg == "on" {
				ok, s.Compress = true, true
				converted("Compress Responses: on")
			}
		case "add_header":
			if len(d.args) >= 2 && !strings.Contains(d.args[1], "$") {
				ok = true
				addResponseHeader(&s, &out, d.args[0], d.args[1])
			}
		case "proxy_hide_header":
			if arg != "" {
				ok = true
				s.ResponseHeaders = setHeader(s.ResponseHeaders, arg, "")
				converted("Response Header Removed: %s", arg)
			}
		case "proxy_set_header":
			if len(d.args) == 2 {
				ok = setRequestHeader(&s, &out, d, forwards)
			}
		case "rewrite":
			ok = parseRewrite(&s, &out, d.args)
		case "return":
			ok = parseReturn(&s, &out, d.args)
		}
		if ok {
			continue
		}
		if want, known := coveredDirectives[d.name]; known && (want == "" || want == arg) {
			out.Covered = append(out.Covered, d.text)
			continue
		}
		out.Skipped = append(out.Skipped, d.text)
	}
	out.Settings = s
	return out
}

// accessIPs returns the allow list of "allow a; allow b; deny all;", or nil when the rules mean anything else.
func accessIPs(list []directive) []string {
	if len(list) < 2 {
		return nil
	}
	last := list[len(list)-1]
	if last.name != "deny" || len(last.args) != 1 || last.args[0] != "all" {
		return nil
	}
	ips := []string{}
	for _, d := range list[:len(list)-1] {
		if d.name != "allow" || len(d.args) != 1 {
			return nil
		}
		a := d.args[0]
		if _, _, err := net.ParseCIDR(a); err != nil && net.ParseIP(a) == nil {
			return nil // "all", "unix:"
		}
		ips = append(ips, a)
	}
	return ips
}

func setHeader(h map[string]string, name, value string) map[string]string {
	if h == nil {
		h = map[string]string{}
	}
	h[name] = value
	return h
}

func addResponseHeader(s *store.RouteSettings, out *Nginx, name, value string) {
	switch {
	case strings.EqualFold(name, "X-Frame-Options") && strings.EqualFold(value, "DENY"):
		s.BlockFrames = true
		out.Converted = append(out.Converted, "Block Embedding In Frames: on")
	case strings.EqualFold(name, "X-Content-Type-Options") && strings.EqualFold(value, "nosniff"):
		s.BlockSniffing = true
		out.Converted = append(out.Converted, "Block Content Type Sniffing: on")
	default:
		s.ResponseHeaders = setHeader(s.ResponseHeaders, name, value)
		out.Converted = append(out.Converted, fmt.Sprintf("Response Header: %s = %s", name, value))
	}
}

func setRequestHeader(s *store.RouteSettings, out *Nginx, d directive, forwards bool) bool {
	name, value := d.args[0], d.args[1]
	if slices.Contains(forwardedHeaders[strings.ToLower(name)], strings.ToLower(value)) {
		out.Covered = append(out.Covered, d.text)
		return true
	}
	if strings.EqualFold(name, "Host") && value == "$proxy_host" && forwards {
		s.HidePublicDomain = true
		out.Converted = append(out.Converted, "Send Public Domain To App: off")
		return true
	}
	if strings.Contains(value, "$") {
		return false
	}
	s.RequestHeaders = setHeader(s.RequestHeaders, name, value)
	if value == "" {
		out.Converted = append(out.Converted, "Request Header Removed: "+name)
	} else {
		out.Converted = append(out.Converted, fmt.Sprintf("Request Header: %s = %s", name, value))
	}
	return true
}

// parseRewrite handles "rewrite regex replacement [flag]". Inside the app a path changes; an absolute URL or a
// redirect flag answers the visitor instead. A relative redirect has no safe Traefik form: it stays unconverted.
func parseRewrite(s *store.RouteSettings, out *Nginx, args []string) bool {
	if len(args) < 2 || len(args) > 3 {
		return false
	}
	pattern, repl := args[0], args[1]
	flag := ""
	if len(args) == 3 {
		flag = args[2]
	}
	if _, err := regexp.Compile(pattern); err != nil || strings.Contains(repl, "?") {
		return false // PCRE only (Traefik uses Go regular expressions), or a query string
	}
	if redirectVars.MatchString(repl) { // nginx variables, not $1
		return false
	}
	groups := regexp.MustCompile(`\$(\d)`).ReplaceAllString(repl, "$${$1}")
	absolute := strings.HasPrefix(repl, "http://") || strings.HasPrefix(repl, "https://")
	switch {
	case absolute || flag == "redirect" || flag == "permanent":
		if !absolute || s.RedirectPattern != "" {
			return false
		}
		s.RedirectPattern = "^https?://[^/]+" + strings.TrimPrefix(pattern, "^")
		s.RedirectTarget = groups
		s.RedirectPermanent = flag == "permanent"
		out.Converted = append(out.Converted, fmt.Sprintf("Redirect Visitors: %s to %s", pattern, repl))
	case flag == "" || flag == "last" || flag == "break":
		if s.RewritePattern != "" {
			return false // Traefik's replacement applies one pattern; a second rewrite would change the result
		}
		s.RewritePattern, s.RewriteTarget = pattern, groups
		out.Converted = append(out.Converted, fmt.Sprintf("Rewrite Path: %s to %s", pattern, repl))
	default:
		return false
	}
	return true
}

// parseReturn handles "return 301 url". Traefik's redirect regex can rebuild $scheme, $host and $request_uri.
func parseReturn(s *store.RouteSettings, out *Nginx, args []string) bool {
	if len(args) != 2 || s.RedirectPattern != "" {
		return false
	}
	code := args[0]
	if !slices.Contains([]string{"301", "302", "303", "307", "308"}, code) {
		return false
	}
	url := args[1]
	target := strings.NewReplacer("$scheme", "${1}", "$host", "${2}", "$request_uri", "${3}").Replace(url)
	if redirectVars.MatchString(target) || !(strings.HasPrefix(target, "http") || strings.HasPrefix(target, "${1}")) {
		return false
	}
	s.RedirectPattern = `^(https?)://([^/:]+)[^/]*(.*)$`
	s.RedirectTarget = target
	s.RedirectPermanent = code == "301" || code == "308"
	out.Converted = append(out.Converted, fmt.Sprintf("Redirect Visitors: to %s (%s)", url, code))
	return true
}

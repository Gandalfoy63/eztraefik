// Docs: docs/03 - Features/Route Settings.md
// Reference: docs/00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/buffering.md
package traefik

import (
	"fmt"

	"eztraefik/internal/store"
)

// routeMiddlewares turns a route's named settings into middlewares of its own (names under the reserved ezt- prefix)
// and returns the router's full list: access and redirects run before the middlewares chosen by hand, the rest after.
func routeMiddlewares(r store.Route, mws M) []string {
	s := r.Settings
	if s == nil {
		return r.Middlewares
	}
	before, after := []string{}, []string{}
	add := func(list *[]string, suffix, kind string, cfg M) {
		name := "ezt-" + r.Name + "-" + suffix
		mws[name] = M{kind: cfg}
		*list = append(*list, name)
	}
	if len(s.AllowedIPs) > 0 {
		add(&before, "ips", "ipAllowList", M{"sourceRange": toAny(s.AllowedIPs)})
	}
	if s.RedirectPattern != "" {
		add(&before, "redirect", "redirectRegex", M{"regex": s.RedirectPattern, "replacement": s.RedirectTarget, "permanent": s.RedirectPermanent})
	}
	if s.MaxBodyBytes > 0 {
		add(&after, "limit", "buffering", M{"maxRequestBodyBytes": s.MaxBodyBytes})
	}
	headers := M{}
	if len(s.RequestHeaders) > 0 {
		headers["customRequestHeaders"] = stringMap(s.RequestHeaders)
	}
	if len(s.ResponseHeaders) > 0 {
		headers["customResponseHeaders"] = stringMap(s.ResponseHeaders)
	}
	if s.BlockFrames {
		headers["frameDeny"] = true
	}
	if s.BlockSniffing {
		headers["contentTypeNosniff"] = true
	}
	if len(headers) > 0 {
		add(&after, "headers", "headers", headers)
	}
	if s.Compress {
		add(&after, "compress", "compress", M{})
	}
	if s.RewritePattern != "" {
		add(&after, "rewrite", "replacePathRegex", M{"regex": s.RewritePattern, "replacement": s.RewriteTarget})
	}
	return append(append(before, r.Middlewares...), after...)
}

// routeTransport adds the connection settings of a route to its generated service.
func routeTransport(r store.Route, lb M, transports M) {
	s := r.Settings
	if s == nil {
		return
	}
	if s.HidePublicDomain {
		lb["passHostHeader"] = false
	}
	t := M{}
	if s.SkipCertificateCheck {
		t["insecureSkipVerify"] = true
	}
	timeouts := M{}
	if s.ConnectTimeout > 0 {
		timeouts["dialTimeout"] = fmt.Sprintf("%ds", s.ConnectTimeout)
	}
	if s.ResponseTimeout > 0 {
		timeouts["responseHeaderTimeout"] = fmt.Sprintf("%ds", s.ResponseTimeout)
	}
	if len(timeouts) > 0 {
		t["forwardingTimeouts"] = timeouts
	}
	if len(t) > 0 {
		name := "ezt-" + r.Name
		transports[name] = t
		lb["serversTransport"] = name + "@file"
	}
}

func stringMap(m map[string]string) M {
	out := M{}
	for k, v := range m {
		out[k] = v
	}
	return out
}

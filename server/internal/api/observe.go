// Docs: docs/03 - Features/Stats.md, docs/03 - Features/Logs.md, docs/03 - Features/Relations.md
package api

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"eztraefik/internal/traefik"
)

var ranges = map[string]time.Duration{"15m": 15 * time.Minute, "1h": time.Hour, "24h": 24 * time.Hour, "7d": 7 * 24 * time.Hour}

func (a *App) stats(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		key = "total"
	}
	rng := r.URL.Query().Get("range")
	d, okR := ranges[rng]
	if !okR {
		rng, d = "1h", time.Hour
	}
	pts := a.Metrics.Series(key, time.Now().Add(-d))
	// Long ranges are bucketed so charts get at most ~180 points.
	step := 1
	if n := len(pts); n > 180 {
		step = (n + 179) / 180
	}
	out := []traefik.Point{}
	for i := 0; i < len(pts); i += step {
		p := traefik.Point{T: pts[i].T}
		for j := i; j < i+step && j < len(pts); j++ {
			q := pts[j]
			p.Requests += q.Requests
			p.C2xx += q.C2xx
			p.C3xx += q.C3xx
			p.C4xx += q.C4xx
			p.C5xx += q.C5xx
			p.DurSum += q.DurSum
			if q.P95 > p.P95 {
				p.P95 = q.P95
			}
		}
		out = append(out, p)
	}
	ok(w, map[string]any{"key": key, "range": rng, "stepSeconds": step * 60, "points": out, "keys": a.Metrics.Keys(), "status": a.Metrics.Status()})
}

var tokenInURL = regexp.MustCompile(`(?i)([?&](?:token|key|secret|password)=)[^&\s"\]]+`)

func (a *App) traefikLogs(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	tail, _ := strconv.Atoi(r.URL.Query().Get("tail"))
	if tail <= 0 || tail > 2000 {
		tail = 300
	}
	lines, err := a.Docker.Logs(r.Context(), st.Traefik.ContainerName, tail, 0)
	if err != nil {
		fail(w, http.StatusBadGateway, "Could not read Traefik logs: "+err.Error())
		return
	}
	type line struct {
		Time    string `json:"time"`
		Level   string `json:"level"`
		Message string `json:"message"`
		Raw     string `json:"raw"`
	}
	out := []line{}
	for _, l := range lines {
		// DNS providers' errors can quote a request URL with the API token in it.
		l.Text = tokenInURL.ReplaceAllString(l.Text, "${1}***")
		ln := line{Time: l.Time, Raw: l.Text, Message: l.Text, Level: "INFO"}
		// Traefik's default log format: "2026-10-29T10:00:00Z INF message key=value"
		if f := strings.Fields(l.Text); len(f) >= 2 {
			switch f[1] {
			case "TRC", "DBG", "INF", "WRN", "ERR", "FTL", "PNC":
				ln.Level = map[string]string{"TRC": "TRACE", "DBG": "DEBUG", "INF": "INFO", "WRN": "WARN", "ERR": "ERROR", "FTL": "FATAL", "PNC": "PANIC"}[f[1]]
				ln.Message = strings.TrimSpace(strings.SplitN(l.Text, f[1], 2)[1])
			}
		}
		out = append(out, ln)
	}
	ok(w, map[string]any{"lines": out})
}

// accessLogs reads the tail of the JSON access log Traefik writes into the shared folder.
func (a *App) accessLogs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	path := filepath.Join(a.Cfg.SharedDir, "logs", "access.log")
	f, err := os.Open(path)
	if err != nil {
		ok(w, map[string]any{"entries": []any{}, "enabled": a.Store.Get().Traefik.AccessLog})
		return
	}
	defer f.Close()
	// Read at most the last 4 MB.
	if fi, err := f.Stat(); err == nil && fi.Size() > 4<<20 {
		_, _ = f.Seek(-4<<20, io.SeekEnd)
	}
	type entry struct {
		Time     string  `json:"time"`
		Client   string  `json:"client"`
		Method   string  `json:"method"`
		Host     string  `json:"host"`
		Path     string  `json:"path"`
		Status   int     `json:"status"`
		Router   string  `json:"router"`
		Service  string  `json:"service"`
		Duration float64 `json:"durationMs"`
		Size     int64   `json:"size"`
	}
	all := []entry{}
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 64<<10), 1<<20)
	for sc.Scan() {
		var m map[string]any
		if json.Unmarshal(sc.Bytes(), &m) != nil {
			continue
		}
		s := func(k string) string { v, _ := m[k].(string); return v }
		n := func(k string) float64 { v, _ := m[k].(float64); return v }
		e := entry{Time: s("time"), Client: s("ClientHost"), Method: s("RequestMethod"), Host: s("RequestHost"), Path: s("RequestPath"),
			Status: int(n("DownstreamStatus")), Router: s("RouterName"), Service: s("ServiceName"), Duration: n("Duration") / 1e6, Size: int64(n("DownstreamContentSize"))}
		if v := q.Get("router"); v != "" && !strings.HasPrefix(e.Router, v) {
			continue
		}
		if v := q.Get("status"); v != "" && !strings.HasPrefix(strconv.Itoa(e.Status), v) {
			continue
		}
		if v := q.Get("q"); v != "" && !strings.Contains(strings.ToLower(e.Host+e.Path+e.Client), strings.ToLower(v)) {
			continue
		}
		all = append(all, e)
	}
	if len(all) > limit {
		all = all[len(all)-limit:]
	}
	// newest first
	for i, j := 0, len(all)-1; i < j; i, j = i+1, j-1 {
		all[i], all[j] = all[j], all[i]
	}
	ok(w, map[string]any{"entries": all, "enabled": a.Store.Get().Traefik.AccessLog})
}

// runtime returns Traefik's raw data for the relation views.
func (a *App) runtime(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
	defer cancel()
	raw, err := a.API.RawData(ctx)
	if err != nil {
		fail(w, http.StatusBadGateway, "Traefik is not reachable: "+err.Error())
		return
	}
	ok(w, raw)
}

type Attention struct {
	Severity string `json:"severity"` // warning or danger
	Kind     string `json:"kind"`
	Title    string `json:"title"`
	Detail   string `json:"detail"`
	Link     string `json:"link"`
}

func (a *App) overview(w http.ResponseWriter, r *http.Request) {
	st := a.Store.Get()
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
	defer cancel()
	status, _ := a.Manager.Status(ctx, st.Traefik.ContainerName)
	raw, rawErr := a.API.RawData(ctx)
	var version string
	if v, err := a.API.Version(ctx); err == nil {
		version = v.Version
	}

	counts := map[string]int{}
	attention := []Attention{}
	if !status.Exists {
		attention = append(attention, Attention{"danger", "traefik", "Traefik container is missing", "Create it from the Traefik page.", "#traefik"})
	} else if !status.Running {
		attention = append(attention, Attention{"danger", "traefik", "Traefik is not running", "State: " + status.State, "#traefik"})
	} else if status.ConfigHash != traefik.Hash(st.Traefik) {
		attention = append(attention, Attention{"warning", "traefik", "Traefik settings not applied", "Saved changes need a container restart.", "#traefik"})
	}
	if rawErr == nil {
		for _, m := range []map[string]traefik.RawRouter{raw.Routers, raw.TCPRouters, raw.UDPRouters} {
			for n, v := range m {
				// Internal routers and the redirect helpers eztraefik adds are not routes the user made.
				if strings.HasSuffix(n, "@internal") || strings.HasSuffix(n, "-redirect@file") {
					continue
				}
				counts["routers"]++
				for _, e := range v.Error {
					name, _ := splitProvider(n)
					attention = append(attention, Attention{"danger", "route", "Route " + name + " has an error", e, "#routes"})
				}
			}
		}
		for _, m := range []map[string]traefik.RawService{raw.Services, raw.TCPServices, raw.UDPServices} {
			for n, v := range m {
				if strings.HasSuffix(n, "@internal") {
					continue
				}
				counts["services"]++
				down, total := 0, 0
				for _, s := range v.ServerStatus {
					total++
					if s != "UP" {
						down++
					}
				}
				if down > 0 {
					name, _ := splitProvider(n)
					counts["servicesDown"]++
					attention = append(attention, Attention{"danger", "service", strconv.Itoa(down) + " of " + strconv.Itoa(total) + " servers down", "Service " + name, "#services"})
				}
			}
		}
		for n, v := range raw.Middlewares {
			if !strings.HasSuffix(n, "@internal") {
				counts["middlewares"]++
				for _, e := range v.Error {
					name, _ := splitProvider(n)
					attention = append(attention, Attention{"danger", "middleware", "Middleware " + name + " has an error", e, "#middlewares"})
				}
			}
		}
	}
	certs := a.allCerts(st)
	counts["certificates"] = len(certs)
	for _, c := range certs {
		days := int(time.Until(c.NotAfter).Hours() / 24)
		switch {
		case days < 0:
			attention = append(attention, Attention{"danger", "certificate", "Certificate expired", c.Main, "#certificates"})
		case days <= 3:
			attention = append(attention, Attention{"danger", "certificate", "Certificate expires in " + strconv.Itoa(days) + " days", c.Main, "#certificates"})
		case days <= 14:
			counts["certsExpiring"]++
			attention = append(attention, Attention{"warning", "certificate", "Certificate expires in " + strconv.Itoa(days) + " days", c.Main, "#certificates"})
		}
	}
	protocols := map[string]int{}
	for _, rt := range st.Routes {
		protocols[rt.Protocol]++
	}
	hist := a.Store.History()
	if len(hist) > 6 {
		hist = hist[:6]
	}
	pts := a.Metrics.Series("total", time.Now().Add(-time.Hour))
	ok(w, map[string]any{
		"traefik": map[string]any{"status": status, "version": version, "reachable": rawErr == nil},
		"counts":  counts, "protocols": protocols, "managedRoutes": len(st.Routes),
		"attention": attention, "recent": hist, "traffic": pts, "metrics": a.Metrics.Status(),
	})
}

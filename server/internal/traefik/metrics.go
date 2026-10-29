// Docs: docs/03 - Features/Stats.md
// Reference: docs/00 - Downloaded Docs/Traefik/reference/install-configuration/observability/metrics.md
package traefik

import (
	"bufio"
	"context"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Sample is one parsed Prometheus line.
type Sample struct {
	Name   string
	Labels map[string]string
	Value  float64
}

// ParseProm parses the Prometheus text format (comments skipped, no exemplars).
func ParseProm(text string) []Sample {
	var out []Sample
	sc := bufio.NewScanner(strings.NewReader(text))
	sc.Buffer(make([]byte, 64<<10), 1<<20)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || line[0] == '#' {
			continue
		}
		s := Sample{Labels: map[string]string{}}
		rest := line
		if i := strings.IndexByte(line, '{'); i >= 0 {
			s.Name = line[:i]
			j := strings.LastIndexByte(line, '}')
			if j < i {
				continue
			}
			parseLabels(line[i+1:j], s.Labels)
			rest = strings.TrimSpace(line[j+1:])
		} else {
			f := strings.Fields(line)
			if len(f) < 2 {
				continue
			}
			s.Name, rest = f[0], f[1]
		}
		valStr := strings.Fields(rest)
		if len(valStr) == 0 {
			continue
		}
		v, err := strconv.ParseFloat(valStr[0], 64)
		if err != nil {
			continue
		}
		s.Value = v
		out = append(out, s)
	}
	return out
}

func parseLabels(s string, into map[string]string) {
	for len(s) > 0 {
		eq := strings.IndexByte(s, '=')
		if eq < 0 || eq+1 >= len(s) || s[eq+1] != '"' {
			return
		}
		key := strings.TrimSpace(strings.TrimPrefix(s[:eq], ","))
		i := eq + 2
		var b strings.Builder
		for i < len(s) && s[i] != '"' {
			if s[i] == '\\' && i+1 < len(s) {
				i++
				switch s[i] {
				case 'n':
					b.WriteByte('\n')
				default:
					b.WriteByte(s[i])
				}
			} else {
				b.WriteByte(s[i])
			}
			i++
		}
		into[key] = b.String()
		s = strings.TrimPrefix(s[min(i+1, len(s)):], ",")
	}
}

// Point is one minute of traffic for one series.
type Point struct {
	T        int64   `json:"t"` // unix seconds, start of the minute
	Requests float64 `json:"requests"`
	C2xx     float64 `json:"c2xx"`
	C3xx     float64 `json:"c3xx"`
	C4xx     float64 `json:"c4xx"`
	C5xx     float64 `json:"c5xx"`
	DurSum   float64 `json:"durSum"` // seconds, divide by Requests for the mean
	P95      float64 `json:"p95"`    // seconds, estimated from histogram buckets
}

type counters struct {
	total, c2, c3, c4, c5, dur float64
	buckets                    map[float64]float64
}

// Collector scrapes Traefik's metrics every interval and keeps one point per minute per series for 7 days.
type Collector struct {
	API      *API
	Interval time.Duration

	mu      sync.RWMutex
	last    map[string]counters
	series  map[string][]Point // key: "entrypoint:web", "router:grafana@file", "service:...", "total"
	open    map[string]float64 // open connections per entrypoint
	lastOK  time.Time
	lastErr string
}

const keepPoints = 7 * 24 * 60

func NewCollector(api *API) *Collector {
	return &Collector{API: api, Interval: 15 * time.Second, last: map[string]counters{}, series: map[string][]Point{}, open: map[string]float64{}}
}

func (c *Collector) Run(ctx context.Context) {
	t := time.NewTicker(c.Interval)
	defer t.Stop()
	c.scrape(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			c.scrape(ctx)
		}
	}
}

func (c *Collector) scrape(ctx context.Context) {
	text, err := c.API.Metrics(ctx)
	c.mu.Lock()
	defer c.mu.Unlock()
	if err != nil {
		c.lastErr = err.Error()
		return
	}
	c.lastErr = ""
	c.lastOK = time.Now()
	now := map[string]counters{}
	get := func(k string) counters {
		v, ok := now[k]
		if !ok {
			v = counters{buckets: map[float64]float64{}}
		}
		return v
	}
	open := map[string]float64{}
	for _, s := range ParseProm(text) {
		var key string
		switch {
		case strings.HasPrefix(s.Name, "traefik_entrypoint_"):
			key = "entrypoint:" + s.Labels["entrypoint"]
		case strings.HasPrefix(s.Name, "traefik_router_"):
			key = "router:" + s.Labels["router"]
		case strings.HasPrefix(s.Name, "traefik_service_"):
			key = "service:" + s.Labels["service"]
		case s.Name == "traefik_open_connections":
			open[s.Labels["entrypoint"]] += s.Value
			continue
		default:
			continue
		}
		if key == "entrypoint:traefik" {
			continue // eztraefik's own API and metrics traffic
		}
		v := get(key)
		switch {
		case strings.HasSuffix(s.Name, "_requests_total"):
			v.total += s.Value
			switch (s.Labels["code"] + "x")[0] {
			case '2':
				v.c2 += s.Value
			case '3':
				v.c3 += s.Value
			case '4':
				v.c4 += s.Value
			case '5':
				v.c5 += s.Value
			}
		case strings.HasSuffix(s.Name, "_request_duration_seconds_sum"):
			v.dur += s.Value
		case strings.HasSuffix(s.Name, "_request_duration_seconds_bucket"):
			if le, err := strconv.ParseFloat(s.Labels["le"], 64); err == nil {
				v.buckets[le] += s.Value
			} else if s.Labels["le"] == "+Inf" {
				v.buckets[math.Inf(1)] += s.Value
			}
		}
		now[key] = v
	}
	// The total series is the sum of entrypoints, so every request counts once.
	tot := counters{buckets: map[float64]float64{}}
	for k, v := range now {
		if strings.HasPrefix(k, "entrypoint:") {
			tot.total += v.total
			tot.c2 += v.c2
			tot.c3 += v.c3
			tot.c4 += v.c4
			tot.c5 += v.c5
			tot.dur += v.dur
			for le, n := range v.buckets {
				tot.buckets[le] += n
			}
		}
	}
	now["total"] = tot
	c.open = open

	minute := time.Now().Truncate(time.Minute).Unix()
	for k, cur := range now {
		prev, ok := c.last[k]
		if !ok {
			continue // first sight: no delta yet
		}
		d := counters{
			total: nonNeg(cur.total - prev.total), c2: nonNeg(cur.c2 - prev.c2), c3: nonNeg(cur.c3 - prev.c3),
			c4: nonNeg(cur.c4 - prev.c4), c5: nonNeg(cur.c5 - prev.c5), dur: nonNeg(cur.dur - prev.dur),
			buckets: map[float64]float64{},
		}
		for le, n := range cur.buckets {
			d.buckets[le] = nonNeg(n - prev.buckets[le])
		}
		pts := c.series[k]
		if len(pts) == 0 || pts[len(pts)-1].T != minute {
			pts = append(pts, Point{T: minute})
		}
		p := &pts[len(pts)-1]
		p.Requests += d.total
		p.C2xx += d.c2
		p.C3xx += d.c3
		p.C4xx += d.c4
		p.C5xx += d.c5
		p.DurSum += d.dur
		if q := quantile(d.buckets, 0.95); q > p.P95 {
			p.P95 = q
		}
		if len(pts) > keepPoints {
			pts = pts[len(pts)-keepPoints:]
		}
		c.series[k] = pts
	}
	c.last = now
}

func nonNeg(v float64) float64 {
	if v < 0 {
		return 0 // counter reset after a Traefik restart
	}
	return v
}

func quantile(buckets map[float64]float64, q float64) float64 {
	if len(buckets) == 0 {
		return 0
	}
	les := make([]float64, 0, len(buckets))
	for le := range buckets {
		les = append(les, le)
	}
	sort.Float64s(les)
	total := buckets[les[len(les)-1]]
	if total == 0 {
		return 0
	}
	target := q * total
	for _, le := range les {
		if buckets[le] >= target {
			if math.IsInf(le, 1) && len(les) > 1 {
				return les[len(les)-2]
			}
			return le
		}
	}
	return 0
}

// Series returns points for one key since a time, filling empty minutes with zeros.
func (c *Collector) Series(key string, since time.Time) []Point {
	c.mu.RLock()
	defer c.mu.RUnlock()
	pts := c.series[key]
	start := since.Truncate(time.Minute).Unix()
	end := time.Now().Truncate(time.Minute).Unix()
	byT := map[int64]Point{}
	for _, p := range pts {
		if p.T >= start {
			byT[p.T] = p
		}
	}
	out := make([]Point, 0, (end-start)/60+1)
	for t := start; t <= end; t += 60 {
		if p, ok := byT[t]; ok {
			out = append(out, p)
		} else {
			out = append(out, Point{T: t})
		}
	}
	return out
}

// Keys lists the series that have data.
func (c *Collector) Keys() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	keys := make([]string, 0, len(c.series))
	for k := range c.series {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

type CollectorStatus struct {
	LastOK time.Time          `json:"lastOk"`
	Error  string             `json:"error,omitempty"`
	Open   map[string]float64 `json:"openConnections"`
}

func (c *Collector) Status() CollectorStatus {
	c.mu.RLock()
	defer c.mu.RUnlock()
	open := map[string]float64{}
	for k, v := range c.open {
		if k != "traefik" {
			open[k] = v
		}
	}
	return CollectorStatus{LastOK: c.lastOK, Error: c.lastErr, Open: open}
}

// Docs: docs/03 - Features/Certificates.md
package api

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"

	"eztraefik/internal/store"
	"eztraefik/internal/traefik"
)

// refreshLimit is when a refresh counts as over even with hosts still waiting. Traefik may still finish them later.
const refreshLimit = 30 * time.Minute

type refreshFailure struct {
	Host   string `json:"host"`
	Reason string `json:"reason"`
}

type refreshProgress struct {
	Total   int              `json:"total"`
	Done    []string         `json:"done"`
	Failed  []refreshFailure `json:"failed"`
	Waiting []string         `json:"waiting"`
}

var acmeFailure = regexp.MustCompile(`Unable to obtain ACME certificate.*?domains \[([^\]]*)\]`)

// failureReason turns Traefik's error into a sentence. It never quotes the error: those can hold API tokens.
func failureReason(line string) string {
	switch {
	case strings.Contains(line, "rateLimited"):
		return "Let's Encrypt limit reached. Try again later."
	case strings.Contains(line, "(KO)"):
		return "The DNS provider refused the token for this domain."
	case strings.Contains(line, "time limit exceeded"):
		return "The DNS record was not seen in time. Raise Propagation Seconds."
	case strings.Contains(line, "unauthorized"), strings.Contains(line, "401"), strings.Contains(line, "403"):
		return "The DNS provider refused the credentials."
	}
	return "The request failed. See the Logs page."
}

// certHosts lists the hosts Traefik asks an ACME resolver about, on enabled routes only.
func certHosts(st store.State) []string {
	hosts := []string{}
	for _, r := range st.Routes {
		if !r.Enabled || !r.TLS.Enabled || !traefik.RequestsCert(r, st) {
			continue
		}
		for _, h := range r.Hosts {
			if !strings.HasPrefix(h, "*.") && !slices.Contains(hosts, h) {
				hosts = append(hosts, h)
			}
		}
	}
	slices.Sort(hosts)
	return hosts
}

// computeProgress sorts hosts into done, failed and waiting. A certificate wins over an earlier failure: Traefik retries.
func computeProgress(hosts []string, certs []traefik.Cert, logs []string) refreshProgress {
	reasons := map[string]string{}
	for _, line := range logs {
		m := acmeFailure.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		for _, name := range strings.FieldsFunc(m[1], func(c rune) bool { return c == ' ' || c == ',' }) {
			for _, h := range hosts {
				if traefik.Covers(name, h) {
					reasons[h] = failureReason(line)
				}
			}
		}
	}
	p := refreshProgress{Total: len(hosts), Done: []string{}, Failed: []refreshFailure{}, Waiting: []string{}}
	for _, h := range hosts {
		covered := slices.ContainsFunc(certs, func(c traefik.Cert) bool {
			return c.Source == "acme" && slices.ContainsFunc(c.Domains, func(n string) bool { return traefik.Covers(n, h) })
		})
		switch reason, failed := reasons[h]; {
		case covered:
			p.Done = append(p.Done, h)
		case failed:
			p.Failed = append(p.Failed, refreshFailure{h, reason})
		default:
			p.Waiting = append(p.Waiting, h)
		}
	}
	return p
}

func (a *App) refreshStatus(w http.ResponseWriter, r *http.Request) {
	a.refreshMu.Lock()
	started, deleted := a.refreshStarted, a.refreshDeleted
	a.refreshMu.Unlock()
	resp := map[string]any{"started": !started.IsZero(), "backup": traefik.HasACMEBackup(a.Cfg.SharedDir), "deleted": deleted}
	if !started.IsZero() {
		st := a.Store.Get()
		lines, _ := a.Docker.Logs(r.Context(), st.Traefik.ContainerName, 2000, started.Unix())
		text := make([]string, len(lines))
		for i, l := range lines {
			text[i] = l.Text
		}
		p := computeProgress(certHosts(st), traefik.ACMECerts(a.Cfg.SharedDir), text)
		resp["progress"] = p
		resp["running"] = len(p.Waiting) > 0 && time.Since(started) < refreshLimit
		resp["startedAt"] = started
	}
	ok(w, resp)
}

// stopped runs fn while Traefik is stopped and always starts it again. Routes don't answer until it is back.
func (a *App) stopped(ctx context.Context, fn func() error) error {
	name := a.Store.Get().Traefik.ContainerName
	if err := a.Docker.Stop(ctx, name, 10); err != nil {
		return fmt.Errorf("could not stop Traefik, nothing was changed: %w", err)
	}
	fnErr := fn()
	if err := a.Docker.Start(ctx, name); err != nil {
		return fmt.Errorf("Traefik did not start again: %w", err)
	}
	return fnErr
}

// startRefresh deletes every ACME certificate so Traefik requests new ones. Uploaded certificates are not touched.
func (a *App) startRefresh(w http.ResponseWriter, r *http.Request) {
	if !a.applyMu.TryLock() {
		fail(w, http.StatusConflict, "Traefik is being changed right now. Try again in a moment.")
		return
	}
	defer a.applyMu.Unlock()
	ctx, cancel := context.WithTimeout(r.Context(), time.Minute)
	defer cancel()
	deleted := 0
	started := time.Now()
	err := a.stopped(ctx, func() (e error) {
		deleted, e = traefik.ClearACMECerts(a.Cfg.SharedDir)
		return e
	})
	if err != nil {
		fail(w, http.StatusBadGateway, err.Error())
		return
	}
	a.refreshMu.Lock()
	a.refreshStarted, a.refreshDeleted = started, deleted
	a.refreshMu.Unlock()
	ok(w, map[string]any{"deleted": deleted})
}

// restoreRefresh puts back the certificates the last hard refresh deleted.
func (a *App) restoreRefresh(w http.ResponseWriter, r *http.Request) {
	if !a.applyMu.TryLock() {
		fail(w, http.StatusConflict, "Traefik is being changed right now. Try again in a moment.")
		return
	}
	defer a.applyMu.Unlock()
	if !traefik.HasACMEBackup(a.Cfg.SharedDir) {
		fail(w, http.StatusNotFound, "There is no backup to restore.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), time.Minute)
	defer cancel()
	if err := a.stopped(ctx, func() error { return traefik.RestoreACMECerts(a.Cfg.SharedDir) }); err != nil {
		fail(w, http.StatusBadGateway, err.Error())
		return
	}
	a.refreshMu.Lock()
	a.refreshStarted = time.Time{}
	a.refreshMu.Unlock()
	ok(w, map[string]any{})
}

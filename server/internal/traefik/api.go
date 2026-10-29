// Docs: docs/03 - Features/Relations.md
// Reference: docs/00 - Downloaded Docs/Traefik/reference/install-configuration/api-dashboard.md
package traefik

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// API reads Traefik's runtime state from its internal entrypoint.
type API struct {
	Base string // for example http://traefik:8080
	HTTP *http.Client
}

func NewAPI(base string) *API {
	return &API{Base: base, HTTP: &http.Client{Timeout: 5 * time.Second}}
}

func (a *API) get(ctx context.Context, path string, out any) error {
	req, err := http.NewRequestWithContext(ctx, "GET", a.Base+path, nil)
	if err != nil {
		return err
	}
	resp, err := a.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("traefik api %s: %d %s", path, resp.StatusCode, b)
	}
	if out == nil {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func (a *API) Ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, "GET", a.Base+"/ping", nil)
	if err != nil {
		return err
	}
	resp, err := a.HTTP.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("ping: %d", resp.StatusCode)
	}
	return nil
}

type Version struct {
	Version   string `json:"Version"`
	Codename  string `json:"Codename"`
	StartDate string `json:"startDate"`
}

func (a *API) Version(ctx context.Context) (Version, error) {
	var v Version
	return v, a.get(ctx, "/api/version", &v)
}

// RawData is /api/rawdata: every router, service and middleware from every provider, with status and relations.
type RawData struct {
	Routers        map[string]RawRouter     `json:"routers"`
	Middlewares    map[string]RawMiddleware `json:"middlewares"`
	Services       map[string]RawService    `json:"services"`
	TCPRouters     map[string]RawRouter     `json:"tcpRouters"`
	TCPMiddlewares map[string]RawMiddleware `json:"tcpMiddlewares"`
	TCPServices    map[string]RawService    `json:"tcpServices"`
	UDPRouters     map[string]RawRouter     `json:"udpRouters"`
	UDPServices    map[string]RawService    `json:"udpServices"`
}

type RawRouter struct {
	EntryPoints []string        `json:"entryPoints"`
	Middlewares []string        `json:"middlewares,omitempty"`
	Service     string          `json:"service"`
	Rule        string          `json:"rule,omitempty"`
	Priority    int64           `json:"priority,omitempty"`
	TLS         json.RawMessage `json:"tls,omitempty"`
	Status      string          `json:"status"`
	Error       []string        `json:"error,omitempty"`
	Using       []string        `json:"using,omitempty"`
	Provider    string          `json:"provider,omitempty"`
}

type RawMiddleware struct {
	Type   string   `json:"type"`
	Status string   `json:"status"`
	Error  []string `json:"error,omitempty"`
	UsedBy []string `json:"usedBy,omitempty"`
}

type RawService struct {
	LoadBalancer *struct {
		Servers []struct {
			URL     string `json:"url,omitempty"`
			Address string `json:"address,omitempty"`
		} `json:"servers"`
	} `json:"loadBalancer,omitempty"`
	Weighted     json.RawMessage   `json:"weighted,omitempty"`
	Failover     json.RawMessage   `json:"failover,omitempty"`
	Mirroring    json.RawMessage   `json:"mirroring,omitempty"`
	Status       string            `json:"status"`
	Error        []string          `json:"error,omitempty"`
	UsedBy       []string          `json:"usedBy,omitempty"`
	ServerStatus map[string]string `json:"serverStatus,omitempty"`
	Type         string            `json:"type,omitempty"`
}

func (a *API) RawData(ctx context.Context) (RawData, error) {
	var r RawData
	return r, a.get(ctx, "/api/rawdata", &r)
}

type EntryPointInfo struct {
	Name    string `json:"name"`
	Address string `json:"address"`
}

func (a *API) Entrypoints(ctx context.Context) ([]EntryPointInfo, error) {
	var e []EntryPointInfo
	return e, a.get(ctx, "/api/entrypoints", &e)
}

// Metrics returns the Prometheus text exposition.
func (a *API) Metrics(ctx context.Context) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", a.Base+"/metrics", nil)
	if err != nil {
		return "", err
	}
	resp, err := a.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	return string(b), err
}

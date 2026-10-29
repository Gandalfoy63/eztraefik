// Docs: docs/03 - Features/Import from NPM.md
// Package npm reads a Nginx Proxy Manager configuration through its REST API and turns it into eztraefik objects.
// Reference: docs/00 - Downloaded Docs/Nginx Proxy Manager/api/
package npm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Bool accepts true/false and 0/1: older NPM versions return integers for flags.
type Bool bool

func (b *Bool) UnmarshalJSON(data []byte) error {
	switch strings.Trim(string(data), `"`) {
	case "true", "1":
		*b = true
	default:
		*b = false
	}
	return nil
}

type ProxyHost struct {
	ID             int        `json:"id"`
	DomainNames    []string   `json:"domain_names"`
	ForwardScheme  string     `json:"forward_scheme"`
	ForwardHost    string     `json:"forward_host"`
	ForwardPort    int        `json:"forward_port"`
	AccessListID   int        `json:"access_list_id"`
	CertificateID  int        `json:"certificate_id"`
	SSLForced      Bool       `json:"ssl_forced"`
	HSTSEnabled    Bool       `json:"hsts_enabled"`
	HSTSSubdomains Bool       `json:"hsts_subdomains"`
	BlockExploits  Bool       `json:"block_exploits"`
	Caching        Bool       `json:"caching_enabled"`
	AdvancedConfig string     `json:"advanced_config"`
	Enabled        Bool       `json:"enabled"`
	Locations      []Location `json:"locations"`
}

type Location struct {
	Path           string `json:"path"`
	ForwardScheme  string `json:"forward_scheme"`
	ForwardHost    string `json:"forward_host"`
	ForwardPort    int    `json:"forward_port"`
	AdvancedConfig string `json:"advanced_config"`
}

type Redirection struct {
	ID             int      `json:"id"`
	DomainNames    []string `json:"domain_names"`
	ForwardScheme  string   `json:"forward_scheme"` // auto, http, https
	ForwardDomain  string   `json:"forward_domain_name"`
	ForwardCode    int      `json:"forward_http_code"`
	PreservePath   Bool     `json:"preserve_path"`
	CertificateID  int      `json:"certificate_id"`
	SSLForced      Bool     `json:"ssl_forced"`
	HSTSEnabled    Bool     `json:"hsts_enabled"`
	HSTSSubdomains Bool     `json:"hsts_subdomains"`
	AdvancedConfig string   `json:"advanced_config"`
	Enabled        Bool     `json:"enabled"`
}

type Stream struct {
	ID             int    `json:"id"`
	IncomingPort   int    `json:"incoming_port"`
	ForwardingHost string `json:"forwarding_host"`
	ForwardingPort int    `json:"forwarding_port"`
	TCP            Bool   `json:"tcp_forwarding"`
	UDP            Bool   `json:"udp_forwarding"`
	Enabled        Bool   `json:"enabled"`
}

type AccessList struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	SatisfyAny Bool   `json:"satisfy_any"`
	PassAuth   Bool   `json:"pass_auth"`
	Items      []struct {
		Username string `json:"username"`
	} `json:"items"`
	Clients []struct {
		Address   string `json:"address"`
		Directive string `json:"directive"` // allow or deny
	} `json:"clients"`
}

type Certificate struct {
	ID          int      `json:"id"`
	Provider    string   `json:"provider"` // letsencrypt or other
	NiceName    string   `json:"nice_name"`
	DomainNames []string `json:"domain_names"`
	ExpiresOn   string   `json:"expires_on"`
	Meta        struct {
		Email          string `json:"letsencrypt_email"`
		DNSChallenge   Bool   `json:"dns_challenge"`
		DNSProvider    string `json:"dns_provider"`
		DNSCredentials string `json:"dns_provider_credentials"`
		Certificate    string `json:"certificate"`
		CertificateKey string `json:"certificate_key"`
	} `json:"meta"`
}

type DeadHost struct {
	ID          int      `json:"id"`
	DomainNames []string `json:"domain_names"`
}

// Data is everything read from one NPM instance.
type Data struct {
	Version      string        `json:"version"`
	ProxyHosts   []ProxyHost   `json:"proxyHosts"`
	Redirections []Redirection `json:"redirections"`
	Streams      []Stream      `json:"streams"`
	AccessLists  []AccessList  `json:"accessLists"`
	Certificates []Certificate `json:"certificates"`
	DeadHosts    []DeadHost    `json:"deadHosts"`
}

type Client struct {
	Base  string
	Token string
	HTTP  *http.Client
}

func New(base string) *Client {
	return &Client{Base: strings.TrimSuffix(strings.TrimSuffix(base, "/"), "/api"), HTTP: &http.Client{Timeout: 15 * time.Second}}
}

// APIError is an error answered by NPM itself.
type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("Nginx Proxy Manager answered %d: %s", e.Status, e.Message)
}

func (c *Client) call(ctx context.Context, method, path string, body, out any) error {
	var rd io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.Base+"/api"+path, rd)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("could not reach Nginx Proxy Manager at %s: %w", c.Base, err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		var e struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.Unmarshal(data, &e)
		if e.Error.Message == "" {
			e.Error.Message = strings.TrimSpace(string(data))
		}
		return &APIError{resp.StatusCode, e.Error.Message}
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("this does not look like the Nginx Proxy Manager API (%s): %w", c.Base, err)
	}
	return nil
}

// Version checks the URL points at NPM and returns its version.
func (c *Client) Version(ctx context.Context) (string, error) {
	var v struct {
		Status  string `json:"status"`
		Version struct {
			Major, Minor, Revision int
		} `json:"version"`
	}
	if err := c.call(ctx, "GET", "/", nil, &v); err != nil {
		return "", err
	}
	if v.Status != "OK" {
		return "", errors.New("this URL answers, but not like Nginx Proxy Manager's API")
	}
	return fmt.Sprintf("%d.%d.%d", v.Version.Major, v.Version.Minor, v.Version.Revision), nil
}

// Login signs in. When the account uses two-factor auth, it returns a challenge for Login2FA instead.
func (c *Client) Login(ctx context.Context, email, password string) (challenge string, err error) {
	var out struct {
		Token          string `json:"token"`
		Requires2FA    bool   `json:"requires_2fa"`
		ChallengeToken string `json:"challenge_token"`
	}
	if err := c.call(ctx, "POST", "/tokens", map[string]string{"identity": email, "secret": password}, &out); err != nil {
		return "", err
	}
	if out.Requires2FA {
		return out.ChallengeToken, nil
	}
	c.Token = out.Token
	return "", nil
}

func (c *Client) Login2FA(ctx context.Context, challenge, code string) error {
	var out struct {
		Token string `json:"token"`
	}
	if err := c.call(ctx, "POST", "/tokens/2fa", map[string]string{"challenge_token": challenge, "code": code}, &out); err != nil {
		return err
	}
	c.Token = out.Token
	return nil
}

// Fetch reads every object eztraefik can import.
func (c *Client) Fetch(ctx context.Context) (Data, error) {
	var d Data
	var err error
	if d.Version, err = c.Version(ctx); err != nil {
		return d, err
	}
	steps := []struct {
		path string
		out  any
	}{
		{"/nginx/proxy-hosts", &d.ProxyHosts},
		{"/nginx/redirection-hosts", &d.Redirections},
		{"/nginx/streams", &d.Streams},
		{"/nginx/access-lists?expand=items,clients", &d.AccessLists},
		{"/nginx/certificates", &d.Certificates},
		{"/nginx/dead-hosts", &d.DeadHosts},
	}
	for _, s := range steps {
		if err := c.call(ctx, "GET", s.path, nil, s.out); err != nil {
			return d, fmt.Errorf("reading %s: %w", s.path, err)
		}
	}
	return d, nil
}

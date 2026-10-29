// Docs: docs/04 - Architecture/Docker Client.md
// Package docker is a small Docker Engine API client over the Unix socket, pinned to API v1.47.
// Reference: docs/00 - Downloaded Docs/Docker Engine API/
package docker

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const apiVersion = "v1.47"

type Client struct {
	http *http.Client
	base string
}

// New accepts unix:///var/run/docker.sock or tcp://host:2375.
func New(host string) (*Client, error) {
	u, err := url.Parse(host)
	if err != nil {
		return nil, err
	}
	tr := &http.Transport{MaxIdleConns: 10, IdleConnTimeout: 30 * time.Second}
	base := "http://docker/" + apiVersion
	switch u.Scheme {
	case "unix":
		path := u.Path
		tr.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", path)
		}
	case "tcp", "http":
		base = "http://" + u.Host + "/" + apiVersion
	default:
		return nil, fmt.Errorf("unsupported docker host %q", host)
	}
	return &Client{http: &http.Client{Transport: tr}, base: base}, nil
}

// Error carries the Engine's status code and message.
type Error struct {
	Status  int
	Message string
}

func (e *Error) Error() string { return fmt.Sprintf("docker: %d %s", e.Status, e.Message) }

func IsNotFound(err error) bool {
	var de *Error
	return errors.As(err, &de) && de.Status == http.StatusNotFound
}

func (c *Client) do(ctx context.Context, method, path string, q url.Values, body any, out any) error {
	resp, err := c.raw(ctx, method, path, q, body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if out == nil {
		_, _ = io.Copy(io.Discard, resp.Body)
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func (c *Client) raw(ctx context.Context, method, path string, q url.Values, body any) (*http.Response, error) {
	var rd io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		rd = bytes.NewReader(b)
	}
	u := c.base + path
	if len(q) > 0 {
		u += "?" + q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, method, u, rd)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		defer resp.Body.Close()
		var m struct {
			Message string `json:"message"`
		}
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
		_ = json.Unmarshal(b, &m)
		if m.Message == "" {
			m.Message = strings.TrimSpace(string(b))
		}
		return nil, &Error{Status: resp.StatusCode, Message: m.Message}
	}
	return resp, nil
}

// ---- System ----

type Version struct {
	Version    string `json:"Version"`
	APIVersion string `json:"ApiVersion"`
	Os         string `json:"Os"`
	Arch       string `json:"Arch"`
}

func (c *Client) Version(ctx context.Context) (Version, error) {
	var v Version
	err := c.do(ctx, "GET", "/version", nil, nil, &v)
	return v, err
}

// ---- Containers ----

type Port struct {
	IP          string `json:"IP"`
	PrivatePort int    `json:"PrivatePort"`
	PublicPort  int    `json:"PublicPort"`
	Type        string `json:"Type"`
}

type ContainerSummary struct {
	ID              string            `json:"Id"`
	Names           []string          `json:"Names"`
	Image           string            `json:"Image"`
	State           string            `json:"State"`
	Status          string            `json:"Status"`
	Created         int64             `json:"Created"`
	Ports           []Port            `json:"Ports"`
	Labels          map[string]string `json:"Labels"`
	NetworkSettings struct {
		Networks map[string]struct {
			IPAddress string `json:"IPAddress"`
			NetworkID string `json:"NetworkID"`
		} `json:"Networks"`
	} `json:"NetworkSettings"`
}

func (c ContainerSummary) Name() string {
	if len(c.Names) == 0 {
		return c.ID[:12]
	}
	return strings.TrimPrefix(c.Names[0], "/")
}

func (c *Client) Containers(ctx context.Context, all bool) ([]ContainerSummary, error) {
	q := url.Values{}
	if all {
		q.Set("all", "1")
	}
	var out []ContainerSummary
	err := c.do(ctx, "GET", "/containers/json", q, nil, &out)
	return out, err
}

type ContainerJSON struct {
	ID      string `json:"Id"`
	Name    string `json:"Name"`
	Created string `json:"Created"`
	State   struct {
		Status    string `json:"Status"`
		Running   bool   `json:"Running"`
		StartedAt string `json:"StartedAt"`
		ExitCode  int    `json:"ExitCode"`
		Error     string `json:"Error"`
	} `json:"State"`
	Config struct {
		Image        string              `json:"Image"`
		Env          []string            `json:"Env"`
		Cmd          []string            `json:"Cmd"`
		Labels       map[string]string   `json:"Labels"`
		ExposedPorts map[string]struct{} `json:"ExposedPorts"`
		Hostname     string              `json:"Hostname"`
	} `json:"Config"`
	Mounts []struct {
		Type        string `json:"Type"`
		Name        string `json:"Name"`
		Source      string `json:"Source"`
		Destination string `json:"Destination"`
	} `json:"Mounts"`
	HostConfig struct {
		PortBindings map[string][]PortBinding `json:"PortBindings"`
	} `json:"HostConfig"`
	NetworkSettings struct {
		Networks map[string]struct {
			IPAddress string `json:"IPAddress"`
			Gateway   string `json:"Gateway"`
		} `json:"Networks"`
	} `json:"NetworkSettings"`
}

// HostPort returns the host port published for a container port like "80/tcp", or 0.
func (c ContainerJSON) HostPort(containerPort string) int {
	for _, b := range c.HostConfig.PortBindings[containerPort] {
		var n int
		if _, err := fmt.Sscan(b.HostPort, &n); err == nil && n > 0 {
			return n
		}
	}
	return 0
}

func (c *Client) Inspect(ctx context.Context, id string) (ContainerJSON, error) {
	var out ContainerJSON
	err := c.do(ctx, "GET", "/containers/"+url.PathEscape(id)+"/json", nil, nil, &out)
	return out, err
}

// CreateSpec is the subset of ContainerConfig + HostConfig eztraefik uses.
type CreateSpec struct {
	Image            string              `json:"Image"`
	Cmd              []string            `json:"Cmd,omitempty"`
	Env              []string            `json:"Env,omitempty"`
	Labels           map[string]string   `json:"Labels,omitempty"`
	ExposedPorts     map[string]struct{} `json:"ExposedPorts,omitempty"`
	HostConfig       HostConfig          `json:"HostConfig"`
	NetworkingConfig *NetworkingConfig   `json:"NetworkingConfig,omitempty"`
}

type HostConfig struct {
	Binds         []string                 `json:"Binds,omitempty"`
	Mounts        []Mount                  `json:"Mounts,omitempty"`
	PortBindings  map[string][]PortBinding `json:"PortBindings,omitempty"`
	RestartPolicy RestartPolicy            `json:"RestartPolicy"`
}

type Mount struct {
	Type     string `json:"Type"` // bind or volume
	Source   string `json:"Source"`
	Target   string `json:"Target"`
	ReadOnly bool   `json:"ReadOnly,omitempty"`
}

type PortBinding struct {
	HostIP   string `json:"HostIp,omitempty"`
	HostPort string `json:"HostPort"`
}

type RestartPolicy struct {
	Name string `json:"Name"`
}

type NetworkingConfig struct {
	EndpointsConfig map[string]EndpointSettings `json:"EndpointsConfig"`
}

type EndpointSettings struct {
	Aliases []string `json:"Aliases,omitempty"`
}

func (c *Client) Create(ctx context.Context, name string, spec CreateSpec) (string, error) {
	var out struct {
		ID string `json:"Id"`
	}
	err := c.do(ctx, "POST", "/containers/create", url.Values{"name": {name}}, spec, &out)
	return out.ID, err
}

func (c *Client) Start(ctx context.Context, id string) error {
	return c.do(ctx, "POST", "/containers/"+url.PathEscape(id)+"/start", nil, nil, nil)
}

func (c *Client) Stop(ctx context.Context, id string, timeout int) error {
	err := c.do(ctx, "POST", "/containers/"+url.PathEscape(id)+"/stop", url.Values{"t": {fmt.Sprint(timeout)}}, nil, nil)
	var de *Error
	if errors.As(err, &de) && de.Status == http.StatusNotModified {
		return nil
	}
	return err
}

func (c *Client) Restart(ctx context.Context, id string) error {
	return c.do(ctx, "POST", "/containers/"+url.PathEscape(id)+"/restart", url.Values{"t": {"10"}}, nil, nil)
}

func (c *Client) Remove(ctx context.Context, id string, force bool) error {
	q := url.Values{}
	if force {
		q.Set("force", "1")
	}
	return c.do(ctx, "DELETE", "/containers/"+url.PathEscape(id), q, nil, nil)
}

func (c *Client) Rename(ctx context.Context, id, name string) error {
	return c.do(ctx, "POST", "/containers/"+url.PathEscape(id)+"/rename", url.Values{"name": {name}}, nil, nil)
}

// Logs returns the last lines of stdout and stderr, demultiplexed. Containers without a TTY use 8-byte frame headers.
func (c *Client) Logs(ctx context.Context, id string, tail int, since int64) ([]LogLine, error) {
	q := url.Values{"stdout": {"1"}, "stderr": {"1"}, "timestamps": {"1"}, "tail": {fmt.Sprint(tail)}}
	if since > 0 {
		q.Set("since", fmt.Sprint(since))
	}
	resp, err := c.raw(ctx, "GET", "/containers/"+url.PathEscape(id)+"/logs", q, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	var lines []LogLine
	add := func(stream string, chunk []byte) {
		sc := bufio.NewScanner(bytes.NewReader(chunk))
		sc.Buffer(make([]byte, 64<<10), 1<<20)
		for sc.Scan() {
			t := sc.Text()
			ts, msg, _ := strings.Cut(t, " ")
			lines = append(lines, LogLine{Stream: stream, Time: ts, Text: msg})
		}
	}
	if len(data) >= 8 && (data[0] == 1 || data[0] == 2) && data[1] == 0 && data[2] == 0 && data[3] == 0 {
		for len(data) >= 8 {
			stream := "stdout"
			if data[0] == 2 {
				stream = "stderr"
			}
			n := int(binary.BigEndian.Uint32(data[4:8]))
			if 8+n > len(data) {
				n = len(data) - 8
			}
			add(stream, data[8:8+n])
			data = data[8+n:]
		}
	} else {
		add("stdout", data)
	}
	return lines, nil
}

type LogLine struct {
	Stream string `json:"stream"`
	Time   string `json:"time"`
	Text   string `json:"text"`
}

// ArchiveRead returns a tar archive of a path inside a container (GET /containers/{id}/archive).
func (c *Client) ArchiveRead(ctx context.Context, id, path string) ([]byte, error) {
	resp, err := c.raw(ctx, "GET", "/containers/"+url.PathEscape(id)+"/archive", url.Values{"path": {path}}, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(io.LimitReader(resp.Body, 32<<20))
}

// ---- Images ----

// Pull downloads an image and waits until done. The Engine streams progress as JSON lines.
func (c *Client) Pull(ctx context.Context, image string) error {
	ref, tag := image, "latest"
	if i := strings.LastIndex(image, ":"); i > strings.LastIndex(image, "/") {
		ref, tag = image[:i], image[i+1:]
	}
	resp, err := c.raw(ctx, "POST", "/images/create", url.Values{"fromImage": {ref}, "tag": {tag}}, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	dec := json.NewDecoder(resp.Body)
	for {
		var m struct {
			Error string `json:"error"`
		}
		if err := dec.Decode(&m); err == io.EOF {
			return nil
		} else if err != nil {
			return err
		}
		if m.Error != "" {
			return errors.New(m.Error)
		}
	}
}

func (c *Client) ImageExists(ctx context.Context, image string) bool {
	return c.do(ctx, "GET", "/images/"+url.PathEscape(image)+"/json", nil, nil, nil) == nil
}

// ---- Networks ----

type Network struct {
	ID         string `json:"Id"`
	Name       string `json:"Name"`
	Driver     string `json:"Driver"`
	Scope      string `json:"Scope"`
	Internal   bool   `json:"Internal"`
	Containers map[string]struct {
		Name        string `json:"Name"`
		IPv4Address string `json:"IPv4Address"`
	} `json:"Containers"`
}

func (c *Client) Networks(ctx context.Context) ([]Network, error) {
	var out []Network
	err := c.do(ctx, "GET", "/networks", nil, nil, &out)
	return out, err
}

func (c *Client) NetworkInspect(ctx context.Context, id string) (Network, error) {
	var out Network
	err := c.do(ctx, "GET", "/networks/"+url.PathEscape(id), nil, nil, &out)
	return out, err
}

// EnsureNetwork creates a bridge network if it does not exist yet.
func (c *Client) EnsureNetwork(ctx context.Context, name string) error {
	if _, err := c.NetworkInspect(ctx, name); err == nil {
		return nil
	} else if !IsNotFound(err) {
		return err
	}
	return c.do(ctx, "POST", "/networks/create", nil, map[string]any{
		"Name": name, "Driver": "bridge", "Labels": map[string]string{"ezt.managed": "true"},
	}, nil)
}

func (c *Client) Connect(ctx context.Context, network, container string) error {
	err := c.do(ctx, "POST", "/networks/"+url.PathEscape(network)+"/connect", nil, map[string]any{"Container": container}, nil)
	var de *Error
	if errors.As(err, &de) && de.Status == http.StatusForbidden && strings.Contains(de.Message, "already exists") {
		return nil
	}
	return err
}

// ---- Volumes ----

func (c *Client) EnsureVolume(ctx context.Context, name string) error {
	if err := c.do(ctx, "GET", "/volumes/"+url.PathEscape(name), nil, nil, nil); err == nil {
		return nil
	} else if !IsNotFound(err) {
		return err
	}
	return c.do(ctx, "POST", "/volumes/create", nil, map[string]any{"Name": name, "Labels": map[string]string{"ezt.managed": "true"}}, nil)
}

// Docs: docs/03 - Features/Traefik Container.md
// Reference: docs/00 - Downloaded Docs/Traefik/reference/install-configuration/configuration-options.md
package traefik

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"eztraefik/internal/docker"
	"eztraefik/internal/store"
)

// APIPort is Traefik's internal entrypoint for the API, ping and metrics. It is never published unless DashboardPort is set.
const APIPort = 8080

// Flags builds the Traefik command line from the install config.
func Flags(cfg store.TraefikConfig) []string {
	f := []string{
		"--global.checknewversion=false",
		"--global.sendanonymoususage=false",
		fmt.Sprintf("--entrypoints.traefik.address=:%d", APIPort),
		"--api=true",
		"--api.insecure=true",
		"--api.dashboard=true",
		"--ping=true",
		"--metrics.prometheus=true",
		"--metrics.prometheus.entrypoint=traefik",
		"--metrics.prometheus.addentrypointslabels=true",
		"--metrics.prometheus.addrouterslabels=true",
		"--metrics.prometheus.addserviceslabels=true",
		"--providers.file.directory=" + SharedInTraefik + "/dynamic",
		"--providers.file.watch=true",
	}
	level := cfg.LogLevel
	if level == "" {
		level = "INFO"
	}
	f = append(f, "--log.level="+level)
	if cfg.AccessLog {
		f = append(f, "--accesslog=true", "--accesslog.format=json", "--accesslog.filepath="+SharedInTraefik+"/logs/access.log")
	}
	if cfg.DockerProvider {
		f = append(f, "--providers.docker=true",
			fmt.Sprintf("--providers.docker.exposedbydefault=%t", cfg.ExposedByDefault),
			"--providers.docker.network="+cfg.Network)
	}
	for _, e := range cfg.Entrypoints {
		p := "--entrypoints." + e.Name
		addr := fmt.Sprintf(":%d", e.Port)
		if e.Protocol == "udp" {
			addr += "/udp"
		}
		f = append(f, p+".address="+addr)
		if e.RedirectTo != "" {
			to := e.RedirectTo
			// Redirect to the published port when it is not the standard one, for example in the dev environment.
			for _, t := range cfg.Entrypoints {
				if t.Name == e.RedirectTo && t.HostPort != 0 && t.HostPort != 443 {
					to = fmt.Sprintf(":%d", t.HostPort)
				}
			}
			f = append(f, p+".http.redirections.entrypoint.to="+to, p+".http.redirections.entrypoint.scheme=https")
		}
		if e.DefaultResolver != "" {
			f = append(f, p+".http.tls=true", p+".http.tls.certresolver="+e.DefaultResolver)
		}
		if e.HTTP3 {
			f = append(f, p+".http3=true")
		}
		if len(e.TrustedIPs) > 0 {
			ips := strings.Join(e.TrustedIPs, ",")
			f = append(f, p+".forwardedheaders.trustedips="+ips)
		}
	}
	for _, r := range cfg.Resolvers {
		p := "--certificatesresolvers." + r.Name + ".acme"
		f = append(f, p+".email="+r.Email, p+".storage="+SharedInTraefik+"/acme/"+r.Name+".json")
		if r.CAServer != "" {
			f = append(f, p+".caserver="+r.CAServer)
		}
		switch r.Challenge {
		case "tls":
			f = append(f, p+".tlschallenge=true")
		case "dns":
			f = append(f, p+".dnschallenge=true", p+".dnschallenge.provider="+r.DNSProvider)
		default:
			ep := r.HTTPEntry
			if ep == "" {
				ep = "web"
			}
			f = append(f, p+".httpchallenge=true", p+".httpchallenge.entrypoint="+ep)
		}
	}
	return append(f, cfg.ExtraFlags...)
}

// Env builds the container environment: user variables plus the CA bundle for private ACME servers.
func Env(cfg store.TraefikConfig) []string {
	env := []string{}
	cas := []string{}
	for _, r := range cfg.Resolvers {
		if strings.TrimSpace(r.CACertPEM) != "" {
			cas = append(cas, SharedInTraefik+"/ca/"+r.Name+".pem")
		}
	}
	if len(cas) > 0 {
		env = append(env, "LEGO_CA_CERTIFICATES="+strings.Join(cas, string(os.PathListSeparator)))
	}
	for _, e := range cfg.Env {
		if e.Key != "" {
			env = append(env, e.Key+"="+e.Value)
		}
	}
	return env
}

// Hash identifies a config, stored as a label so drift between config and container is visible.
func Hash(cfg store.TraefikConfig) string {
	h := sha256.New()
	fmt.Fprintln(h, cfg.Image, cfg.Network, cfg.DashboardPort)
	for _, f := range Flags(cfg) {
		fmt.Fprintln(h, f)
	}
	env := Env(cfg)
	sort.Strings(env)
	for _, e := range env {
		fmt.Fprintln(h, e)
	}
	for _, e := range cfg.Entrypoints {
		fmt.Fprintln(h, e.Name, e.HostPort, e.Protocol)
	}
	return hex.EncodeToString(h.Sum(nil))[:16]
}

// Manager creates and replaces the Traefik container.
type Manager struct {
	Docker       *docker.Client
	SharedDir    string // the shared volume as seen by eztraefik
	SharedVolume string // its Docker volume name, mounted into Traefik
	DockerSocket string // host path of the Docker socket, for Traefik's Docker provider
}

func (m *Manager) Spec(cfg store.TraefikConfig) docker.CreateSpec {
	exposed := map[string]struct{}{}
	bindings := map[string][]docker.PortBinding{}
	for _, e := range cfg.Entrypoints {
		if e.HostPort == 0 {
			continue
		}
		proto := "tcp"
		if e.Protocol == "udp" {
			proto = "udp"
		}
		k := fmt.Sprintf("%d/%s", e.Port, proto)
		exposed[k] = struct{}{}
		bindings[k] = []docker.PortBinding{{HostPort: fmt.Sprint(e.HostPort)}}
		if e.HTTP3 && proto == "tcp" {
			k3 := fmt.Sprintf("%d/udp", e.Port)
			exposed[k3] = struct{}{}
			bindings[k3] = []docker.PortBinding{{HostPort: fmt.Sprint(e.HostPort)}}
		}
	}
	if cfg.DashboardPort > 0 {
		k := fmt.Sprintf("%d/tcp", APIPort)
		exposed[k] = struct{}{}
		bindings[k] = []docker.PortBinding{{HostPort: fmt.Sprint(cfg.DashboardPort)}}
	}
	mounts := []docker.Mount{{Type: "volume", Source: m.SharedVolume, Target: SharedInTraefik}}
	if cfg.DockerProvider {
		mounts = append(mounts, docker.Mount{Type: "bind", Source: m.DockerSocket, Target: "/var/run/docker.sock", ReadOnly: true})
	}
	return docker.CreateSpec{
		Image:        cfg.Image,
		Cmd:          Flags(cfg),
		Env:          Env(cfg),
		Labels:       map[string]string{"ezt.managed": "true", "ezt.role": "traefik", "ezt.config-hash": Hash(cfg)},
		ExposedPorts: exposed,
		HostConfig: docker.HostConfig{
			Mounts:        mounts,
			PortBindings:  bindings,
			RestartPolicy: docker.RestartPolicy{Name: "unless-stopped"},
		},
		NetworkingConfig: &docker.NetworkingConfig{EndpointsConfig: map[string]docker.EndpointSettings{cfg.Network: {Aliases: []string{"traefik"}}}},
	}
}

// PrepareShared creates the folders Traefik reads and writes, and the CA files for private ACME servers.
func (m *Manager) PrepareShared(cfg store.TraefikConfig) error {
	for _, d := range []string{"dynamic", "acme", "certs", "ca", "logs"} {
		if err := os.MkdirAll(filepath.Join(m.SharedDir, d), 0o755); err != nil {
			return err
		}
	}
	for _, r := range cfg.Resolvers {
		if strings.TrimSpace(r.CACertPEM) != "" {
			if err := store.WriteFileAtomic(filepath.Join(m.SharedDir, "ca", r.Name+".pem"), []byte(r.CACertPEM), 0o644); err != nil {
				return err
			}
		}
	}
	return nil
}

// Apply replaces the running Traefik container with one built from cfg. If the new one fails to start, the old one comes back.
func (m *Manager) Apply(ctx context.Context, cfg store.TraefikConfig) error {
	if err := m.Docker.EnsureNetwork(ctx, cfg.Network); err != nil {
		return fmt.Errorf("network %s: %w", cfg.Network, err)
	}
	if err := m.PrepareShared(cfg); err != nil {
		return fmt.Errorf("shared folder: %w", err)
	}
	if !m.Docker.ImageExists(ctx, cfg.Image) {
		if err := m.Docker.Pull(ctx, cfg.Image); err != nil {
			return fmt.Errorf("pull %s: %w", cfg.Image, err)
		}
	}
	old, err := m.Docker.Inspect(ctx, cfg.ContainerName)
	hadOld := err == nil
	if err != nil && !docker.IsNotFound(err) {
		return err
	}
	backup := cfg.ContainerName + "-ezt-previous"
	if hadOld {
		_ = m.Docker.Remove(ctx, backup, true)
		if err := m.Docker.Stop(ctx, old.ID, 10); err != nil {
			return fmt.Errorf("stop current Traefik: %w", err)
		}
		if err := m.Docker.Rename(ctx, old.ID, backup); err != nil {
			return fmt.Errorf("rename current Traefik: %w", err)
		}
	}
	restore := func(cause error) error {
		if hadOld {
			_ = m.Docker.Remove(ctx, cfg.ContainerName, true)
			_ = m.Docker.Rename(ctx, old.ID, cfg.ContainerName)
			_ = m.Docker.Start(ctx, old.ID)
			return fmt.Errorf("%w (the previous Traefik container was started again)", cause)
		}
		return cause
	}
	id, err := m.Docker.Create(ctx, cfg.ContainerName, m.Spec(cfg))
	if err != nil {
		return restore(fmt.Errorf("create Traefik: %w", err))
	}
	if err := m.Docker.Start(ctx, id); err != nil {
		return restore(fmt.Errorf("start Traefik: %w", err))
	}
	// A container that exits right away (bad flag) is a failed apply too.
	time.Sleep(1500 * time.Millisecond)
	if c, err := m.Docker.Inspect(ctx, id); err == nil && !c.State.Running {
		logs, _ := m.Docker.Logs(ctx, id, 5, 0)
		msg := c.State.Error
		for _, l := range logs {
			msg += " " + l.Text
		}
		return restore(fmt.Errorf("Traefik stopped right after starting: %s", strings.TrimSpace(msg)))
	}
	if hadOld {
		_ = m.Docker.Remove(ctx, old.ID, true)
	}
	return nil
}

// Status of the Traefik container.
type Status struct {
	Exists     bool   `json:"exists"`
	Running    bool   `json:"running"`
	State      string `json:"state"`
	StartedAt  string `json:"startedAt"`
	Image      string `json:"image"`
	ID         string `json:"id"`
	ConfigHash string `json:"configHash"`
	Managed    bool   `json:"managed"`
}

func (m *Manager) Status(ctx context.Context, name string) (Status, error) {
	c, err := m.Docker.Inspect(ctx, name)
	if docker.IsNotFound(err) {
		return Status{}, nil
	}
	if err != nil {
		return Status{}, err
	}
	return Status{
		Exists: true, Running: c.State.Running, State: c.State.Status, StartedAt: c.State.StartedAt,
		Image: c.Config.Image, ID: c.ID, ConfigHash: c.Config.Labels["ezt.config-hash"], Managed: c.Config.Labels["ezt.managed"] == "true",
	}, nil
}

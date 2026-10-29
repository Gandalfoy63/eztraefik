// Docs: docs/09 - Data/Data Model.md
// Package store holds eztraefik's state: what the user configured, saved as one JSON file.
package store

import "time"

// State is everything eztraefik manages. Traefik's own runtime state is read from its API, not stored here.
type State struct {
	Onboarded    bool           `json:"onboarded"`
	Admin        *Admin         `json:"admin,omitempty"`
	Traefik      TraefikConfig  `json:"traefik"`
	Routes       []Route        `json:"routes"`
	Services     []Service      `json:"services"`
	Middlewares  []Middleware   `json:"middlewares"`
	Domains      []Domain       `json:"domains"`
	Certificates []UploadedCert `json:"certificates"`
	// Applied is the Traefik config the running container was created with. A difference means a restart is pending.
	Applied *TraefikConfig `json:"applied,omitempty"`
}

type Admin struct {
	Username     string `json:"username"`
	PasswordHash string `json:"passwordHash"`
}

// TraefikConfig is the install (static) configuration, turned into container flags and env vars.
type TraefikConfig struct {
	Image            string       `json:"image"`
	ContainerName    string       `json:"containerName"`
	Network          string       `json:"network"`
	Entrypoints      []Entrypoint `json:"entrypoints"`
	Resolvers        []Resolver   `json:"resolvers"`
	Env              []EnvVar     `json:"env"`
	ExtraFlags       []string     `json:"extraFlags"`
	LogLevel         string       `json:"logLevel"`
	AccessLog        bool         `json:"accessLog"`
	DockerProvider   bool         `json:"dockerProvider"`
	ExposedByDefault bool         `json:"exposedByDefault"`
	// Dashboard publishes Traefik's own dashboard on the given host port (0 = not published).
	DashboardPort int `json:"dashboardPort"`
}

type Entrypoint struct {
	Name       string   `json:"name"`
	Port       int      `json:"port"`
	Protocol   string   `json:"protocol"` // tcp or udp
	HostPort   int      `json:"hostPort"` // 0 = not published on the host
	RedirectTo string   `json:"redirectTo,omitempty"`
	HTTP3      bool     `json:"http3,omitempty"`
	TrustedIPs []string `json:"trustedIPs,omitempty"`
	// DefaultResolver issues certificates for every router on this entrypoint.
	DefaultResolver string `json:"defaultResolver,omitempty"`
}

type Resolver struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Challenge   string `json:"challenge"` // http, tls or dns
	HTTPEntry   string `json:"httpEntrypoint,omitempty"`
	DNSProvider string `json:"dnsProvider,omitempty"`
	CAServer    string `json:"caServer,omitempty"`
	// CACertPEM is trusted when talking to CAServer, for private CAs like Pebble or step-ca.
	CACertPEM string `json:"caCertPEM,omitempty"`
}

type EnvVar struct {
	Key    string `json:"key"`
	Value  string `json:"value"`
	Secret bool   `json:"secret"`
}

// Route is one router. Its destination is a container, an address, or a named service.
type Route struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Protocol    string    `json:"protocol"` // http, tcp, udp
	Hosts       []string  `json:"hosts"`
	PathPrefix  string    `json:"pathPrefix,omitempty"`
	RawRule     string    `json:"rawRule,omitempty"` // overrides the generated rule when set
	Entrypoints []string  `json:"entrypoints"`
	Target      Target    `json:"target"`
	Middlewares []string  `json:"middlewares"`
	TLS         RouteTLS  `json:"tls"`
	Priority    int       `json:"priority,omitempty"`
	Enabled     bool      `json:"enabled"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Target struct {
	Kind      string `json:"kind"` // docker, ip, service
	Container string `json:"container,omitempty"`
	Address   string `json:"address,omitempty"`
	Port      int    `json:"port,omitempty"`
	Scheme    string `json:"scheme,omitempty"` // http or https, HTTP routes only
	Service   string `json:"service,omitempty"`
}

type RouteTLS struct {
	Enabled bool `json:"enabled"`
	// Mode: resolver (issue a certificate), existing (use an issued or uploaded one), passthrough (TCP only).
	Mode     string `json:"mode"`
	Resolver string `json:"resolver,omitempty"`
	// Domain is the main domain of an existing certificate, for example *.example.com.
	Domain   string `json:"domain,omitempty"`
	Redirect bool   `json:"redirect"`
}

// Service is a reusable backend with more than one server or a traffic split.
type Service struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	Protocol           string          `json:"protocol"`
	Kind               string          `json:"kind"` // loadbalancer, weighted, failover, mirroring
	Servers            []string        `json:"servers"`
	Weighted           []WeightedRef   `json:"weighted,omitempty"`
	Failover           *FailoverConfig `json:"failover,omitempty"`
	Mirroring          *MirrorConfig   `json:"mirroring,omitempty"`
	HealthCheck        *HealthCheck    `json:"healthCheck,omitempty"`
	Sticky             bool            `json:"sticky,omitempty"`
	PassHostHeader     *bool           `json:"passHostHeader,omitempty"`
	InsecureSkipVerify bool            `json:"insecureSkipVerify,omitempty"`
	UpdatedAt          time.Time       `json:"updatedAt"`
}

type WeightedRef struct {
	Service string `json:"service"`
	Weight  int    `json:"weight"`
}

type FailoverConfig struct {
	Service  string `json:"service"`
	Fallback string `json:"fallback"`
}

type MirrorConfig struct {
	Service string        `json:"service"`
	Mirrors []WeightedRef `json:"mirrors"` // weight is the percent of traffic copied
}

type HealthCheck struct {
	Path     string `json:"path"`
	Interval string `json:"interval"`
	Timeout  string `json:"timeout"`
}

// Middleware config is passed through to Traefik as-is under its type, for example basicAuth.
type Middleware struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Protocol  string         `json:"protocol"` // http or tcp
	Type      string         `json:"type"`
	Config    map[string]any `json:"config"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

type Domain struct {
	Name     string `json:"name"`
	Resolver string `json:"resolver,omitempty"`
	Wildcard bool   `json:"wildcard,omitempty"`
}

type UploadedCert struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Domains  []string  `json:"domains"`
	NotAfter time.Time `json:"notAfter"`
	Issuer   string    `json:"issuer"`
}

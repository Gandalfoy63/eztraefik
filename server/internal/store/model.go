// Docs: docs/09 - Data/Data Model.md
// Package store holds eztraefik's state: what the user configured, saved as one JSON file.
package store

import (
	"maps"
	"slices"
	"time"
)

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
	// Migration records an import from Nginx Proxy Manager and the switch-over of its ports.
	Migration *Migration `json:"migration,omitempty"`
}

type Migration struct {
	Source       string    `json:"source"`       // NPM URL
	NPMContainer string    `json:"npmContainer"` // set when NPM runs on this Docker host
	ImportedAt   time.Time `json:"importedAt"`
	Imported     int       `json:"imported"`
	// StreamPorts are entrypoints created for NPM streams: published only at switch-over (NPM holds the ports before).
	StreamPorts map[string]int `json:"streamPorts"`
	SwitchedAt  *time.Time     `json:"switchedAt,omitempty"`
	// PreviousPorts are the host ports of Traefik entrypoints before the switch, to switch back.
	PreviousPorts map[string]int `json:"previousPorts,omitempty"`
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
	// Settings are the named options of an HTTP route. Rendered as middlewares and a transport of its own.
	Settings *RouteSettings `json:"settings,omitempty"`
}

// RouteSettings is what custom nginx config in NPM usually sets, in terms a person picks in the route window.
type RouteSettings struct {
	MaxBodyBytes         int64             `json:"maxBodyBytes,omitempty"`
	ConnectTimeout       int               `json:"connectTimeout,omitempty"`  // seconds
	ResponseTimeout      int               `json:"responseTimeout,omitempty"` // seconds
	SkipCertificateCheck bool              `json:"skipCertificateCheck,omitempty"`
	HidePublicDomain     bool              `json:"hidePublicDomain,omitempty"`
	Compress             bool              `json:"compress,omitempty"`
	BlockFrames          bool              `json:"blockFrames,omitempty"`
	BlockSniffing        bool              `json:"blockSniffing,omitempty"`
	AllowedIPs           []string          `json:"allowedIPs,omitempty"`
	RequestHeaders       map[string]string `json:"requestHeaders,omitempty"`  // an empty value removes the header
	ResponseHeaders      map[string]string `json:"responseHeaders,omitempty"` // an empty value removes the header
	RewritePattern       string            `json:"rewritePattern,omitempty"`
	RewriteTarget        string            `json:"rewriteTarget,omitempty"`
	RedirectPattern      string            `json:"redirectPattern,omitempty"`
	RedirectTarget       string            `json:"redirectTarget,omitempty"`
	RedirectPermanent    bool              `json:"redirectPermanent,omitempty"`
}

// Clone copies the settings, so a custom location can inherit from its host without sharing its maps.
func (s RouteSettings) Clone() RouteSettings {
	s.AllowedIPs = slices.Clone(s.AllowedIPs)
	s.RequestHeaders = maps.Clone(s.RequestHeaders)
	s.ResponseHeaders = maps.Clone(s.ResponseHeaders)
	return s
}

// IsEmpty reports whether no setting is on.
func (s RouteSettings) IsEmpty() bool {
	return s.MaxBodyBytes == 0 && s.ConnectTimeout == 0 && s.ResponseTimeout == 0 && !s.SkipCertificateCheck && !s.HidePublicDomain &&
		!s.Compress && !s.BlockFrames && !s.BlockSniffing && len(s.AllowedIPs) == 0 && len(s.RequestHeaders) == 0 && len(s.ResponseHeaders) == 0 &&
		s.RewritePattern == "" && s.RedirectPattern == ""
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

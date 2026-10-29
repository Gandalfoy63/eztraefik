// Docs: docs/08 - Deployment/Configuration.md, docs/04 - Architecture/Overview.md
// Command eztraefik serves the web UI and API that manage a Traefik container.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"eztraefik/internal/api"
	"eztraefik/internal/auth"
	"eztraefik/internal/docker"
	"eztraefik/internal/store"
	"eztraefik/internal/traefik"
	"eztraefik/internal/webui"
)

// version is set at build time from the VERSION file: -ldflags "-X main.version=$(cat VERSION)".
var version = "dev"

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil {
		return v
	}
	return def
}

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		resp, err := http.Get("http://127.0.0.1" + env("EZT_LISTEN", ":8080") + "/api/v1/meta")
		if err != nil || resp.StatusCode != 200 {
			os.Exit(1)
		}
		os.Exit(0)
	}

	cfg := api.Config{
		Version:        version,
		SharedDir:      env("EZT_SHARED_DIR", "/shared"),
		DataDir:        env("EZT_DATA_DIR", "/data"),
		TraefikAPI:     env("EZT_TRAEFIK_API", "http://traefik:8080"),
		DevMode:        env("EZT_DEV", "") == "1",
		DefaultCAURL:   env("EZT_DEFAULT_ACME_CA_SERVER", ""),
		DefaultPorts:   [2]int{envInt("EZT_DEFAULT_HTTP_PORT", 80), envInt("EZT_DEFAULT_HTTPS_PORT", 443)},
		DefaultNetwork: env("EZT_DEFAULT_NETWORK", "ezt"),
		DefaultName:    env("EZT_DEFAULT_TRAEFIK_NAME", "traefik"),
	}
	if f := env("EZT_DEFAULT_ACME_CA_CERT_FILE", ""); f != "" {
		if b, err := os.ReadFile(f); err == nil {
			cfg.DefaultCACert = string(b)
		} else {
			log.Warn("could not read EZT_DEFAULT_ACME_CA_CERT_FILE", "err", err)
		}
	}

	st, err := store.Open(cfg.DataDir, api.DefaultTraefik(cfg))
	if err != nil {
		log.Error("open data", "err", err)
		os.Exit(1)
	}
	dc, err := docker.New(env("EZT_DOCKER_HOST", "unix:///var/run/docker.sock"))
	if err != nil {
		log.Error("docker", "err", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	sharedVolume := env("EZT_SHARED_VOLUME", "")
	if sharedVolume == "" {
		sharedVolume = detectVolume(ctx, dc, cfg.SharedDir)
	}
	if sharedVolume == "" {
		sharedVolume = "ezt-shared"
		log.Warn("could not detect the shared volume, using ezt-shared; set EZT_SHARED_VOLUME if Traefik can't see its config")
	}

	tapi := traefik.NewAPI(cfg.TraefikAPI)
	sessions := auth.NewSessions()
	sessions.Secure = env("EZT_SECURE_COOKIES", "") == "1"
	app := &api.App{
		Cfg: cfg, Store: st, Docker: dc, API: tapi, Sessions: sessions, Log: log,
		Manager: &traefik.Manager{Docker: dc, SharedDir: cfg.SharedDir, SharedVolume: sharedVolume,
			DockerSocket: env("EZT_HOST_DOCKER_SOCKET", "/var/run/docker.sock")},
		Metrics: traefik.NewCollector(tapi),
	}
	if err := app.Manager.PrepareShared(st.Get().Traefik); err != nil {
		log.Warn("prepare shared folder", "err", err)
	}
	if err := app.WriteDynamic(st.Get()); err != nil {
		log.Warn("write dynamic config", "err", err)
	}
	if st.Get().Onboarded {
		app.EnsureSelfOnNetwork(ctx)
	}
	go app.Metrics.Run(ctx)

	mux := http.NewServeMux()
	mux.Handle("/api/", app.Handler())
	mux.Handle("/", webui.Handler())
	srv := &http.Server{Addr: env("EZT_LISTEN", ":8080"), Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	go func() {
		<-ctx.Done()
		sctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(sctx)
	}()
	log.Info("eztraefik listening", "addr", srv.Addr, "version", version, "sharedVolume", sharedVolume)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Error("server", "err", err)
		os.Exit(1)
	}
}

// detectVolume finds the Docker volume mounted at dir in our own container.
func detectVolume(ctx context.Context, dc *docker.Client, dir string) string {
	host, _ := os.Hostname()
	c, err := dc.Inspect(ctx, host)
	if err != nil {
		return ""
	}
	for _, m := range c.Mounts {
		if m.Destination == strings.TrimSuffix(dir, "/") && m.Type == "volume" {
			return m.Name
		}
	}
	return ""
}

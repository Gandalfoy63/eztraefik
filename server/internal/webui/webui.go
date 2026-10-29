// Docs: docs/04 - Architecture/Overview.md
// Package webui serves the built React app. dist/ is filled by the Docker build (or `make web`).
// Reference: docs/00 - Downloaded Docs/Go/embed.md
package webui

import (
	"embed"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
)

func init() {
	// Go does not know this extension; browsers expect the manifest type.
	_ = mime.AddExtensionType(".webmanifest", "application/manifest+json")
}

//go:embed all:dist
var files embed.FS

// Handler serves static files and falls back to index.html, so deep links like /#routes work after reload.
func Handler() http.Handler {
	sub, _ := fs.Sub(files, "dist")
	fileServer := http.FileServerFS(sub)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if p == "" {
			p = "index.html"
		}
		if _, err := fs.Stat(sub, p); err != nil {
			r.URL.Path = "/"
			p = "index.html"
		}
		if strings.HasPrefix(p, "assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable") // file names carry a content hash
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		fileServer.ServeHTTP(w, r)
	})
}

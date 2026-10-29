// Docs: docs/02 - Tech/Stack.md
// Reference: docs/00 - Downloaded Docs/Vite/config/server-options.md
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
  // During development the Go server runs on :8080 and Vite proxies the API to it.
  server: { proxy: { "/api": "http://localhost:8080" } },
});

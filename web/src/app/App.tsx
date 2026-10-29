// Docs: docs/04 - Architecture/Frontend.md
// Decides what to show: setup wizard, sign-in, or the app. Pages are picked from the hash.
import { useCallback, useEffect, useState, type JSX } from "react";
import { api, setUnauthorizedHandler, type Meta } from "../api";
import { Spinner, ToastProvider } from "../ui/feedback";
import { Shell } from "./Shell";
import { TooltipLayer } from "./Tooltip";
import { useLocation } from "./router";
import { Login } from "../pages/Login";
import { Onboarding } from "../pages/Onboarding";
import { Overview } from "../pages/Overview";
import { Routes } from "../pages/Routes";
import { Services } from "../pages/Services";
import { Middlewares } from "../pages/Middlewares";
import { Domains } from "../pages/Domains";
import { Certificates } from "../pages/Certificates";
import { Entrypoints } from "../pages/Entrypoints";
import { Docker } from "../pages/Docker";
import { Stats } from "../pages/Stats";
import { Logs } from "../pages/Logs";
import { TraefikPage } from "../pages/Traefik";
import { SettingsPage } from "../pages/Settings";
import { NotFound } from "../pages/NotFound";

const PAGES: Record<string, (p: { params: URLSearchParams }) => JSX.Element> = {
  overview: Overview, routes: Routes, services: Services, middlewares: Middlewares, domains: Domains, certificates: Certificates,
  entrypoints: Entrypoints, docker: Docker, stats: Stats, logs: Logs, traefik: TraefikPage, settings: SettingsPage,
};

export function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loc = useLocation();

  const load = useCallback(() => {
    api.get<Meta>("/meta").then(setMeta).catch(e => setError(e.message));
  }, []);
  useEffect(load, [load]);
  useEffect(() => setUnauthorizedHandler(() => setMeta(m => (m ? { ...m, signedIn: false } : m))), []);

  let body;
  if (error) body = <div className="center-screen"><p className="muted">eztraefik is not reachable: {error}</p></div>;
  else if (!meta) body = <div className="center-screen"><Spinner /></div>;
  else if (!meta.onboarded) body = <Onboarding devMode={meta.devMode} onDone={load} />;
  else if (!meta.signedIn) body = <Login version={meta.version} onDone={load} />;
  else {
    const Page = PAGES[loc.page] ?? NotFound;
    body = (
      <Shell page={loc.page} version={meta.version} user={meta.user} onSignOut={() => api.post("/auth/logout").finally(load)}>
        <Page params={loc.params} />
      </Shell>
    );
  }
  return (
    <ToastProvider>
      {body}
      <TooltipLayer />
    </ToastProvider>
  );
}

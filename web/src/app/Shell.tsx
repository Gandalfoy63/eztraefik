// Docs: docs/05 - UI-UX/Navigation.md
// App frame: grouped sidebar (collapsible, drawer on mobile), top bar with breadcrumb and theme, animated page entrance.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Box, ChartLine, Container, DoorOpen, Globe, Layers, LayoutDashboard, LogOut, Moon, Route as RouteIcon, ScrollText, Server, Settings, ShieldCheck, Sun,
  type LucideIcon,
} from "lucide-react";
import { api } from "../api";
import { useLoad, reducedMotion } from "../ui/hooks";

interface NavItem {
  page: string;
  label: string;
  icon: LucideIcon;
  attentionKind?: string;
}
export const NAV: { group?: string; items: NavItem[] }[] = [
  { items: [{ page: "overview", label: "Overview", icon: LayoutDashboard }] },
  {
    group: "Routing",
    items: [
      { page: "routes", label: "Routes", icon: RouteIcon, attentionKind: "route" },
      { page: "services", label: "Services", icon: Server, attentionKind: "service" },
      { page: "middlewares", label: "Middlewares", icon: Layers, attentionKind: "middleware" },
    ],
  },
  {
    group: "Network",
    items: [
      { page: "domains", label: "Domains", icon: Globe },
      { page: "certificates", label: "Certificates", icon: ShieldCheck, attentionKind: "certificate" },
      { page: "entrypoints", label: "Entrypoints", icon: DoorOpen },
    ],
  },
  { group: "Sources", items: [{ page: "docker", label: "Docker", icon: Container }] },
  {
    group: "Observe",
    items: [
      { page: "stats", label: "Stats", icon: ChartLine },
      { page: "logs", label: "Logs", icon: ScrollText },
    ],
  },
  {
    group: "System",
    items: [
      { page: "traefik", label: "Traefik", icon: Box, attentionKind: "traefik" },
      { page: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export function pageMeta(page: string) {
  for (const g of NAV) for (const i of g.items) if (i.page === page) return { ...i, group: g.group };
  return null;
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="7" fill="currentColor" />
      <path d="M8 9h4.5c2 0 3 1 3.5 2.5L17 14l1 2.5c.5 1.5 1.5 2.5 3.5 2.5M8 19h4.5c2 0 3-1 3.5-2.5M17 14h4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
export { BrandMark };

interface OverviewLite {
  traefik: { status: { running: boolean; exists: boolean }; version: string; reachable: boolean };
  attention: { kind: string; severity: string }[];
}

function useTheme() {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  const [theme, setTheme] = useState<string | null>(() => {
    try {
      return localStorage.getItem("ezt-theme");
    } catch {
      return null;
    }
  });
  const effective = theme || (media.matches ? "light" : "dark");
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);
  const toggle = () => {
    const next = effective === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("ezt-theme", next);
    } catch {
      /* private mode */
    }
  };
  return { effective, toggle };
}

export function Shell({ page, version, user, onSignOut, children }: { page: string; version: string; user: string; onSignOut: () => void; children: ReactNode }) {
  const mobile = useMedia("(max-width: 860px)");
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("ezt-sidebar") === "collapsed";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { effective, toggle: toggleTheme } = useTheme();
  const overview = useLoad(() => api.get<OverviewLite>("/overview"), [], 15000);
  const meta = pageMeta(page);

  useEffect(() => {
    try {
      localStorage.setItem("ezt-sidebar", collapsed ? "collapsed" : "expanded");
    } catch {
      /* private mode */
    }
  }, [collapsed]);
  useEffect(() => setMobileOpen(false), [page]);
  useEffect(() => {
    document.title = `${meta?.label ?? "eztraefik"} - eztraefik`;
  }, [meta?.label]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const sidebarState = mobile ? (mobileOpen ? "expanded" : "collapsed") : collapsed ? "collapsed" : "expanded";
  const toggleLabel = mobile ? (mobileOpen ? "Close navigation" : "Open navigation") : collapsed ? "Expand sidebar" : "Collapse sidebar";
  const counts: Record<string, { n: number; danger: boolean }> = {};
  for (const a of overview.data?.attention ?? []) {
    const c = (counts[a.kind] ||= { n: 0, danger: false });
    c.n++;
    if (a.severity === "danger") c.danger = true;
  }
  const t = overview.data?.traefik;
  const running = t?.status.running && t.reachable;

  return (
    <div className="app" data-sidebar={sidebarState} data-mobile-nav={mobileOpen ? "open" : "closed"}>
      <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
        Skip to content
      </a>
      <aside className="sidebar" id="sidebar" aria-label="Main">
        <div className="sidebar-head">
          <BrandMark />
          <div className="brand-text">
            <div className="brand-name">eztraefik</div>
            <div className="brand-version">{version}</div>
          </div>
        </div>
        <nav className="nav" aria-label="Main navigation">
          {NAV.map((g, gi) => (
            <div className="nav-group" key={gi}>
              {g.group && (
                <div className="nav-group-label" id={`g-${gi}`}>
                  {g.group}
                </div>
              )}
              <ul aria-labelledby={g.group ? `g-${gi}` : undefined}>
                {g.items.map(item => {
                  const c = item.attentionKind ? counts[item.attentionKind] : undefined;
                  return (
                    <li key={item.page}>
                      <a className="nav-item" href={`#${item.page}`} aria-current={page === item.page ? "page" : undefined} data-tooltip={item.label}>
                        <item.icon aria-hidden="true" />
                        <span className="nav-label">{item.label}</span>
                        {c && (
                          <span className={`nav-count${c.danger ? " is-danger" : ""}`} aria-label={`${c.n} need${c.n === 1 ? "s" : ""} attention`}>
                            {c.n}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <a className="sidebar-foot" href="#traefik" data-tooltip={t ? `Traefik ${t.version || ""} ${running ? "running" : "not reachable"}` : "Checking Traefik"}>
          <span className={`status-dot${!t ? " is-neutral" : running ? "" : " is-danger"}`} aria-hidden="true" />
          <div className="foot-text">
            <strong>{t?.version ? `Traefik ${t.version}` : "Traefik"}</strong>
            {!t ? "Checking..." : running ? "Running" : t.status.exists ? "Not reachable" : "Not created yet"}
          </div>
        </a>
      </aside>
      {mobile && mobileOpen && <div className="scrim is-open" onClick={() => setMobileOpen(false)} />}

      <div className="main-col">
        <header className="topbar">
          <button
            className="icon-btn sidebar-toggle"
            type="button"
            aria-controls="sidebar"
            aria-expanded={mobile ? mobileOpen : !collapsed}
            aria-label={toggleLabel}
            data-tooltip={toggleLabel}
            data-tooltip-side="bottom"
            onClick={() => (mobile ? setMobileOpen(o => !o) : setCollapsed(c => !c))}
          >
            <svg className="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect className="ti-panel" x="3" y="4" width="6" height="16" rx="2" />
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
              <line className="ti-divider" x1="9" y1="4" x2="9" y2="20" />
              <path className="ti-chevron" d="M15.5 9.5 13 12l2.5 2.5" />
            </svg>
          </button>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol>
              {meta?.group && <li>{meta.group}</li>}
              <li>
                <span aria-current="page">{meta?.label ?? "Not found"}</span>
              </li>
            </ol>
          </nav>
          <div className="topbar-spacer" />
          <button className="btn btn-ghost btn-sm" type="button" onClick={toggleTheme} aria-label={`Switch to ${effective === "dark" ? "light" : "dark"} theme`}>
            {effective === "dark" ? <Sun className="icon-sm" aria-hidden="true" /> : <Moon className="icon-sm" aria-hidden="true" />}
            <span className="theme-label">{effective === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onSignOut} aria-label={`Sign out ${user}`} data-tooltip={`Signed in as ${user}`} data-tooltip-side="bottom">
            <LogOut className="icon-sm" aria-hidden="true" />
            <span className="theme-label">Sign out</span>
          </button>
        </header>
        <main id="main" className="content" tabIndex={-1}>
          <PageTransition page={page}>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

// PageTransition fades the old page out (90ms) and lets the new page's sections rise in, staggered.
function PageTransition({ page, children }: { page: string; children: ReactNode }) {
  const [shown, setShown] = useState({ page, children });
  const [phase, setPhase] = useState<"enter" | "leave">("enter");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (page === shown.page) {
      setShown({ page, children });
      return;
    }
    if (reducedMotion()) {
      setShown({ page, children });
      return;
    }
    setPhase("leave");
    const t = setTimeout(() => {
      setShown({ page, children });
      setPhase("enter");
      window.scrollTo({ top: 0 });
      document.getElementById("main")?.focus({ preventScroll: true });
    }, 90);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, children]);
  useLayoutEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>(":scope > *").forEach((el, i) => el.style.setProperty("--i", String(Math.min(i, 6))));
  }, [shown.page]);
  return (
    <div key={shown.page} ref={ref} className={`page ${phase === "enter" ? "is-entering" : "is-leaving"}`}>
      {shown.children}
    </div>
  );
}

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

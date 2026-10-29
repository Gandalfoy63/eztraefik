// Docs: docs/03 - Features/Overview.md
import { Activity, ArrowRight, CircleAlert, CircleCheck, Plus, Route as RouteIcon, Server, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { api, type HistoryEntry, type Point, type TraefikStatus } from "../api";
import { Badge, Empty, ErrorBox, SkeletonRows } from "../ui/feedback";
import { PageHeader } from "../ui/Page";
import { Sparkline } from "../ui/LineChart";
import { shortTime, useLoad } from "../ui/hooks";
import { navigate } from "../app/router";
import { Relations } from "./Relations";

interface OverviewData {
  traefik: { status: TraefikStatus; version: string; reachable: boolean };
  counts: Record<string, number>;
  protocols: Record<string, number>;
  managedRoutes: number;
  attention: { severity: "warning" | "danger"; kind: string; title: string; detail: string; link: string }[];
  recent: HistoryEntry[];
  traffic: Point[];
  metrics: { lastOk: string; error?: string };
}

export function Overview() {
  const { data, error, loading, reload } = useLoad(() => api.get<OverviewData>("/overview"), [], 10000);
  const newRoute = (
    <button className="btn btn-primary" type="button" onClick={() => navigate("routes", { new: "1" })}>
      <Plus aria-hidden="true" />
      New route
    </button>
  );
  if (error && !data) return <><PageHeader title="Overview" action={newRoute} /><ErrorBox message={error} onRetry={reload} /></>;
  if (loading && !data) return <><PageHeader title="Overview" action={newRoute} /><div className="card card-body"><SkeletonRows rows={6} /></div></>;
  const d = data!;
  const c = d.counts;
  const lastMin = d.traffic.slice(-6, -1);
  const rps = lastMin.length ? lastMin.reduce((s, p) => s + p.requests, 0) / (lastMin.length * 60) : 0;
  const proto = d.protocols;
  const protoText = ["http", "tcp", "udp"].filter(p => proto[p]).map(p => `${proto[p]} ${p.toUpperCase()}`).join(", ") || "None managed yet";
  const sev = d.attention.filter(a => a.severity === "danger").length;

  return (
    <>
      <PageHeader title="Overview" description={d.traefik.reachable ? `What Traefik ${d.traefik.version} is serving right now.` : "Traefik is not reachable. Check the Traefik page."} action={newRoute} />

      <div className="grid stats">
        <a className="card stat" href="#routes">
          <span className="stat-label"><RouteIcon className="icon-sm" aria-hidden="true" />Routes</span>
          <span className="stat-value">{c.routers ?? d.managedRoutes}</span>
          <span className="stat-meta">{protoText}</span>
        </a>
        <a className="card stat" href="#services">
          <span className="stat-label"><Server className="icon-sm" aria-hidden="true" />Services</span>
          <span className="stat-value">{c.services ?? 0}</span>
          <span className={`stat-meta${c.servicesDown ? " is-danger" : ""}`}>{c.servicesDown ? `${c.servicesDown} with servers down` : c.services ? "All servers up" : "None yet"}</span>
        </a>
        <a className="card stat" href="#certificates">
          <span className="stat-label"><ShieldCheck className="icon-sm" aria-hidden="true" />Certificates</span>
          <span className="stat-value">{c.certificates ?? 0}</span>
          <span className={`stat-meta${c.certsExpiring ? " is-warning" : ""}`}>{c.certsExpiring ? `${c.certsExpiring} expire within 14 days` : "None expiring soon"}</span>
        </a>
        <a className="card stat" href="#stats">
          <span className="stat-label"><Activity className="icon-sm" aria-hidden="true" />Requests</span>
          <span className="stat-value">{rps < 10 ? rps.toFixed(2) : rps.toFixed(1)}<small>/s</small></span>
          <Sparkline data={d.traffic.map(p => p.requests)} label="Requests per minute over the last hour" />
        </a>
      </div>

      <div className="grid two-col">
        <section className="card">
          <div className="card-head">
            <h2>Needs attention</h2>
            {d.attention.length > 0 ? <Badge tone={sev ? "danger" : "warning"}>{d.attention.length} {d.attention.length === 1 ? "issue" : "issues"}</Badge> : <Badge tone="success">All good</Badge>}
          </div>
          {d.attention.length === 0 ? (
            <Empty icon={CircleCheck} title="Nothing needs attention">Routes, services and certificates look healthy.</Empty>
          ) : (
            <ul className="list">
              {d.attention.slice(0, 8).map((a, i) => {
                const Icon = a.kind === "certificate" ? ShieldAlert : a.severity === "danger" ? CircleAlert : TriangleAlert;
                return (
                  <li className="list-row" key={i}>
                    <span className={`sev is-${a.severity}`}><Icon className="icon-sm" aria-hidden="true" /></span>
                    <div className="grow"><div className="title">{a.title}</div><div className="sub">{a.detail}</div></div>
                    <a className="btn btn-secondary btn-sm" href={a.link}>View</a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>Recent changes</h2><a className="btn btn-ghost btn-sm" href="#settings?tab=history">History</a></div>
          {d.recent.length === 0 ? (
            <Empty icon={RouteIcon} title="No changes yet" />
          ) : (
            <ul className="list">
              {d.recent.map(h => (
                <li className="list-row" key={h.id}>
                  <span className="change-time">{shortTime(h.time)}</span>
                  <div className="grow"><div className="title">{h.message}</div><div className="sub">by {h.user}</div></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Traffic paths</h2>
          <a className="btn btn-ghost btn-sm" href="#routes">All routes<ArrowRight className="icon-sm" aria-hidden="true" /></a>
        </div>
        <Relations limit={6} />
      </section>
    </>
  );
}

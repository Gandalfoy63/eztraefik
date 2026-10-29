// Docs: docs/03 - Features/Relations.md
// Traffic path strips built from Traefik's /api/rawdata: entrypoint, route, middlewares, service, servers.
import { ChevronRight, Route as RouteIcon } from "lucide-react";
import { api } from "../api";
import { Badge, Empty, ErrorBox, SkeletonRows } from "../ui/feedback";
import { useLoad } from "../ui/hooks";

interface Raw {
  routers?: Record<string, RawRouter>;
  tcpRouters?: Record<string, RawRouter>;
  udpRouters?: Record<string, RawRouter>;
  services?: Record<string, RawService>;
  tcpServices?: Record<string, RawService>;
  udpServices?: Record<string, RawService>;
}
interface RawRouter {
  entryPoints: string[];
  middlewares?: string[];
  service: string;
  rule?: string;
  status: string;
  error?: string[];
}
interface RawService {
  loadBalancer?: { servers?: { url?: string; address?: string }[] };
  serverStatus?: Record<string, string>;
  status: string;
}

const bare = (n: string) => n.replace(/@[^@]+$/, "");
const providerOf = (n: string) => (n.includes("@") ? n.slice(n.lastIndexOf("@") + 1) : "");

export function Relations({ limit, router }: { limit?: number; router?: string }) {
  const { data, error, loading, reload } = useLoad(() => api.get<Raw>("/runtime"), [], 15000);
  if (error && !data) return <div className="card-body"><ErrorBox title="Traefik is not reachable." message={error} onRetry={reload} /></div>;
  if (loading && !data) return <div className="card-body"><SkeletonRows rows={3} /></div>;
  const raw = data!;
  const rows: { name: string; proto: string; r: RawRouter; svc?: RawService }[] = [];
  for (const [proto, routers, services] of [
    ["http", raw.routers, raw.services],
    ["tcp", raw.tcpRouters, raw.tcpServices],
    ["udp", raw.udpRouters, raw.udpServices],
  ] as const) {
    for (const [name, r] of Object.entries(routers ?? {})) {
      if (name.endsWith("@internal") || name.endsWith("-redirect@file")) continue;
      if (router && bare(name) !== router) continue;
      const prov = providerOf(name);
      const svcKey = r.service.includes("@") ? r.service : `${r.service}@${prov}`;
      rows.push({ name, proto, r, svc: services?.[svcKey] });
    }
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  if (!rows.length) return <Empty icon={RouteIcon} title="No traffic paths yet">Create a route and its path from port to app shows up here.</Empty>;
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="flows">
      {shown.map(({ name, proto, r, svc }) => {
        const servers = svc?.loadBalancer?.servers?.map(s => s.url || s.address || "") ?? [];
        const down = Object.values(svc?.serverStatus ?? {}).filter(s => s !== "UP").length;
        return (
          <div className="flow" role="list" aria-label={`Traffic path for ${bare(name)}`} key={name}>
            <a className="flow-node" role="listitem" href="#entrypoints">
              <span className="flow-kind">Entrypoint</span>
              <span className="flow-name">{r.entryPoints.join(", ")}</span>
              <span className="flow-detail">{proto.toUpperCase()}</span>
            </a>
            <span className="flow-arrow" aria-hidden="true"><ChevronRight className="icon-sm" /></span>
            <a className="flow-node" role="listitem" href="#routes">
              <span className="flow-kind">Route</span>
              <span className="flow-name">{bare(name)} {r.error?.length ? <Badge tone="danger">Error</Badge> : null}</span>
              <span className="flow-detail" title={r.rule}>{r.rule || "all traffic"}</span>
            </a>
            {(r.middlewares?.length ?? 0) > 0 && (
              <>
                <span className="flow-arrow" aria-hidden="true"><ChevronRight className="icon-sm" /></span>
                <a className="flow-node" role="listitem" href="#middlewares">
                  <span className="flow-kind">Middlewares</span>
                  <span className="flow-name">{r.middlewares!.length} applied</span>
                  <span className="flow-detail">{r.middlewares!.map(bare).join(", ")}</span>
                </a>
              </>
            )}
            <span className="flow-arrow" aria-hidden="true"><ChevronRight className="icon-sm" /></span>
            <a className="flow-node" role="listitem" href="#services">
              <span className="flow-kind">Service</span>
              <span className="flow-name">{bare(r.service)} {down > 0 && <Badge tone="danger">{down} down</Badge>}</span>
              <span className="flow-detail">{servers.length ? servers.join(", ") : svc ? "composite" : "missing"}</span>
            </a>
          </div>
        );
      })}
      {limit && rows.length > limit && <p className="hint flows-more">{rows.length - limit} more on the Routes page.</p>}
    </div>
  );
}

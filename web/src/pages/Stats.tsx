// Docs: docs/03 - Features/Stats.md, docs/05 - UI-UX/Charts.md
// One measure per chart (requests, client errors, server errors, latency). The code split is a text summary,
// because a four-color status split failed the palette validator (see the Charts note).
import { useState } from "react";
import { ChartLine, Table2 } from "lucide-react";
import { api, type Point } from "../api";
import { Button, Empty, ErrorBox, SkeletonRows } from "../ui/feedback";
import { Segmented } from "../ui/controls";
import { Card, PageHeader } from "../ui/Page";
import { LineChart } from "../ui/LineChart";
import { timeAgo, useLoad } from "../ui/hooks";

interface StatsData {
  key: string;
  range: string;
  stepSeconds: number;
  points: Point[];
  keys: string[];
  status: { lastOk: string; error?: string; openConnections: Record<string, number> };
}

const label = (k: string) => (k === "total" ? "All traffic" : k.replace(/^(\w+):/, (_, a) => a.charAt(0).toUpperCase() + a.slice(1) + " ").replace(/@\w+$/, ""));
const num = (v: number) => (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));
const ms = (s: number) => (s >= 1 ? s.toFixed(1) + " s" : Math.round(s * 1000) + " ms");

export function Stats() {
  const [key, setKey] = useState("total");
  const [range, setRange] = useState<"15m" | "1h" | "24h" | "7d">("1h");
  const [table, setTable] = useState(false);
  const { data, error, loading, reload } = useLoad(() => api.get<StatsData>(`/stats?key=${encodeURIComponent(key)}&range=${range}`), [key, range], 30000);
  const pts = data?.points ?? [];
  const step = data?.stepSeconds ?? 60;
  const sum = (f: (p: Point) => number) => pts.reduce((s, p) => s + f(p), 0);
  const total = sum(p => p.requests);
  const pct = (n: number) => (total ? ((n / total) * 100).toFixed(1) + "%" : "0%");
  const stale = data?.status.lastOk ? Date.now() - Date.parse(data.status.lastOk) > 60000 : true;
  const keys = data?.keys.filter(k => !k.startsWith("entrypoint:traefik")) ?? [];

  return (
    <>
      <PageHeader title="Stats" description={data?.status.lastOk && !data.status.lastOk.startsWith("0001") ? `From Traefik's metrics, updated ${timeAgo(data.status.lastOk)}${stale ? ". Data is stale: Traefik is not answering." : "."}` : "From Traefik's metrics. Waiting for the first scrape."} />
      <div className="filters">
        <div className="field inline-field">
          <label className="label" htmlFor="st-key">Show</label>
          <select className="select" id="st-key" value={key} onChange={e => setKey(e.target.value)}>
            <option value="total">All traffic</option>
            {["entrypoint", "router", "service"].map(g => {
              const ks = keys.filter(k => k.startsWith(g + ":"));
              return ks.length ? <optgroup key={g} label={g === "router" ? "Routes" : g === "service" ? "Services" : "Entrypoints"}>{ks.map(k => <option key={k} value={k}>{label(k)}</option>)}</optgroup> : null;
            })}
          </select>
        </div>
        <Segmented label="Time range" value={range} onChange={setRange} options={[{ value: "15m", label: "15 min" }, { value: "1h", label: "1 hour" }, { value: "24h", label: "24 hours" }, { value: "7d", label: "7 days" }]} />
        <div className="topbar-spacer" />
        <Button size="sm" variant="ghost" icon={table ? ChartLine : Table2} onClick={() => setTable(!table)}>{table ? "Show charts" : "Show as table"}</Button>
      </div>
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? <div className="card card-body"><SkeletonRows rows={6} /></div> : total === 0 && data ? (
        <section className="card"><Empty icon={ChartLine} title="No traffic in this range">Requests appear here a minute after they happen. Collection started when eztraefik started.</Empty></section>
      ) : data && (
        <>
          <div className="grid stats">
            <div className="card stat"><span className="stat-label">Requests</span><span className="stat-value">{num(total)}</span><span className="stat-meta">{num(total / Math.max(1, pts.length * step))} per second on average</span></div>
            <div className="card stat"><span className="stat-label">Success (2xx, 3xx)</span><span className="stat-value">{pct(sum(p => p.c2xx + p.c3xx))}</span><span className="stat-meta">{num(sum(p => p.c2xx))} 2xx, {num(sum(p => p.c3xx))} 3xx</span></div>
            <div className="card stat"><span className="stat-label">Client errors (4xx)</span><span className="stat-value">{pct(sum(p => p.c4xx))}</span><span className="stat-meta">{num(sum(p => p.c4xx))} requests</span></div>
            <div className="card stat"><span className="stat-label">Server errors (5xx)</span><span className={`stat-value${sum(p => p.c5xx) > 0 ? " is-danger" : ""}`}>{pct(sum(p => p.c5xx))}</span><span className="stat-meta">{num(sum(p => p.c5xx))} requests</span></div>
          </div>
          {table ? (
            <Card title={`${label(key)}, per ${step / 60} min`} flush>
              <div className="table-wrap"><table>
                <thead><tr><th scope="col">Time</th><th scope="col">Requests</th><th scope="col">4xx</th><th scope="col">5xx</th><th scope="col">Mean latency</th><th scope="col">p95 latency</th></tr></thead>
                <tbody>{[...pts].reverse().filter(p => p.requests > 0).map(p => (
                  <tr key={p.t}><td className="mono-sm">{new Date(p.t * 1000).toLocaleString()}</td><td>{num(p.requests)}</td><td>{num(p.c4xx)}</td><td>{num(p.c5xx)}</td><td>{p.requests ? ms(p.durSum / p.requests) : "-"}</td><td>{p.p95 ? ms(p.p95) : "-"}</td></tr>
                ))}</tbody>
              </table></div>
            </Card>
          ) : (
            <div className="grid chart-grid">
              <Card title="Requests per second"><LineChart label="Requests per second" data={pts.map(p => ({ t: p.t, v: p.requests / step }))} format={num} summary={`Total ${num(total)} requests.`} /></Card>
              <Card title="p95 latency"><LineChart label="95th percentile latency" data={pts.map(p => ({ t: p.t, v: p.p95 }))} format={ms} /></Card>
              <Card title="Client errors (4xx) per minute"><LineChart label="Client errors per minute" data={pts.map(p => ({ t: p.t, v: (p.c4xx / step) * 60 }))} format={num} height={140} /></Card>
              <Card title="Server errors (5xx) per minute"><LineChart label="Server errors per minute" data={pts.map(p => ({ t: p.t, v: (p.c5xx / step) * 60 }))} format={num} height={140} /></Card>
            </div>
          )}
          {Object.keys(data.status.openConnections).length > 0 && (
            <p className="hint">Open connections now: {Object.entries(data.status.openConnections).map(([k, v]) => `${k} ${v}`).join(", ")}.</p>
          )}
        </>
      )}
    </>
  );
}

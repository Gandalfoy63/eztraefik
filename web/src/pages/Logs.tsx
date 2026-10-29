// Docs: docs/03 - Features/Logs.md
import { useState } from "react";
import { Pause, Play, ScrollText, Search } from "lucide-react";
import { api } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows } from "../ui/feedback";
import { Segmented } from "../ui/controls";
import { useLoad } from "../ui/hooks";
import { PageHeader } from "../ui/Page";

interface Line { time: string; level: string; message: string }
interface Access { time: string; client: string; method: string; host: string; path: string; status: number; router: string; service: string; durationMs: number; size: number }

export function Logs({ params }: { params: URLSearchParams }) {
  const [tab, setTab] = useState<"access" | "traefik">(params.get("tab") === "traefik" ? "traefik" : "access");
  const [paused, setPaused] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const access = useLoad(() => api.get<{ entries: Access[]; enabled: boolean }>(`/logs/access?limit=300&q=${encodeURIComponent(q)}&status=${status}`), [q, status, tab], tab === "access" && !paused ? 5000 : 0);
  const tlog = useLoad(() => api.get<{ lines: Line[] }>("/logs/traefik?tail=400"), [tab], tab === "traefik" && !paused ? 5000 : 0);
  const lines = (tlog.data?.lines ?? []).filter(l => (!level || l.level === level) && (!q || l.message.toLowerCase().includes(q.toLowerCase()))).reverse();

  return (
    <>
      <PageHeader title="Logs" description="Requests going through Traefik, and Traefik's own messages."
        action={<Button icon={paused ? Play : Pause} onClick={() => setPaused(!paused)}>{paused ? "Resume live" : "Pause"}</Button>} />
      <div className="filters">
        <Segmented label="Log" value={tab} onChange={setTab} options={[{ value: "access", label: "Access log" }, { value: "traefik", label: "Traefik log" }]} />
        <div className="search">
          <label className="sr-only" htmlFor="lg-q">Filter logs</label>
          <Search aria-hidden="true" />
          <input className="input" id="lg-q" type="search" placeholder={tab === "access" ? "Host, path or client IP" : "Text in the message"} value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {tab === "access" ? (
          <select className="select narrow" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option><option value="2">2xx</option><option value="3">3xx</option><option value="4">4xx</option><option value="5">5xx</option>
          </select>
        ) : (
          <select className="select narrow" aria-label="Level" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">All levels</option>{["DEBUG", "INFO", "WARN", "ERROR"].map(l => <option key={l}>{l}</option>)}
          </select>
        )}
      </div>
      <section className="card">
        {tab === "access" ? (
          access.error && !access.data ? <div className="card-body"><ErrorBox message={access.error} onRetry={access.reload} /></div> : !access.data ? <div className="card-body"><SkeletonRows rows={8} /></div> : !access.data.enabled ? (
            <Empty icon={ScrollText} title="Access log is off">Turn it on in Traefik settings, then apply.</Empty>
          ) : !access.data.entries.length ? (
            <Empty icon={ScrollText} title="No requests yet">{q || status ? "Nothing matches the filter." : "Requests show up here as they arrive."}</Empty>
          ) : (
            <div className="table-wrap"><table className="log-table">
              <thead><tr><th scope="col">Time</th><th scope="col">Status</th><th scope="col">Request</th><th scope="col" className="col-optional">Route</th><th scope="col" className="col-optional">Client</th><th scope="col">Time taken</th></tr></thead>
              <tbody>{access.data.entries.map((e, i) => (
                <tr key={i}>
                  <td className="mono-sm nowrap">{new Date(e.time).toLocaleTimeString()}</td>
                  <td><Badge tone={e.status >= 500 ? "danger" : e.status >= 400 ? "warning" : "success"} mono>{e.status}</Badge></td>
                  <td className="mono-sm"><span className="muted">{e.method}</span> {e.host}{e.path}</td>
                  <td className="col-optional muted">{e.router.replace(/@.*/, "") || "none"}</td>
                  <td className="col-optional mono-sm muted">{e.client}</td>
                  <td className="mono-sm">{e.durationMs < 1 ? "<1" : Math.round(e.durationMs)} ms</td>
                </tr>
              ))}</tbody>
            </table></div>
          )
        ) : tlog.error && !tlog.data ? <div className="card-body"><ErrorBox message={tlog.error} onRetry={tlog.reload} /></div> : !tlog.data ? <div className="card-body"><SkeletonRows rows={8} /></div> : !lines.length ? (
          <Empty icon={ScrollText} title="No log lines">{q || level ? "Nothing matches the filter." : "Traefik has not logged anything yet."}</Empty>
        ) : (
          <ol className="log-lines" aria-label="Traefik log, newest first">
            {lines.map((l, i) => (
              <li key={i}><span className="mono-sm muted nowrap">{l.time ? new Date(l.time).toLocaleTimeString() : ""}</span><Badge tone={l.level === "ERROR" || l.level === "FATAL" ? "danger" : l.level === "WARN" ? "warning" : "neutral"} mono>{l.level}</Badge><span className="mono-sm log-msg">{l.message}</span></li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

// Docs: docs/03 - Features/Docker.md
import { useState } from "react";
import { ChevronRight, Container, Link2, Plus, Search } from "lucide-react";
import { api, type ContainerInfo } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows, useToast } from "../ui/feedback";
import { PageHeader } from "../ui/Page";
import { useLoad } from "../ui/hooks";
import { SortTh, useSort } from "../ui/sort";
import { navigate } from "../app/router";

const routedBy = (c: ContainerInfo) => {
  const labels = Object.keys(c.traefikLabels).filter(k => /^traefik\.(http|tcp|udp)\.routers\.[^.]+\.rule$/.test(k)).map(k => `${k.split(".")[3]} (labels)`);
  return [...c.routes, ...labels].join(", ");
};
const STANDALONE = "Standalone";

export function Docker() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get<{ containers: ContainerInfo[]; network: string }>("/docker/containers"), [], 15000);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const connect = async (c: ContainerInfo) => {
    setBusy(c.id);
    try {
      await api.post(`/docker/containers/${c.id}/connect`);
      toast(`${c.name} joined the ${data?.network} network.`);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const rows = (data?.containers ?? []).filter(c => !q || (c.name + c.image + (c.stack ?? "")).toLowerCase().includes(q.toLowerCase()));
  const sort = useSort(rows, { name: c => c.name, state: c => c.state, ports: c => c.exposedPorts[0], routed: routedBy, network: c => (c.reachable ? 0 : 1) }, "name");
  // Stacks A to Z, containers without one last. Inside a stack, rows keep the order of the column sort.
  const stacks = [...new Set(rows.map(c => c.stack || STANDALONE))].sort((a, b) => (a === STANDALONE ? 1 : b === STANDALONE ? -1 : a.localeCompare(b, undefined, { numeric: true })));
  const toggleStack = (s: string) => setClosed(c => { const n = new Set(c); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  return (
    <>
      <PageHeader title="Docker" description={data ? `Containers on this host. Traefik reaches the ones on the ${data.network} network.` : "Containers on this host."} />
      {error && !data && <ErrorBox title="Docker is not reachable." message={error} onRetry={reload} />}
      <section className="card">
        <div className="toolbar">
          <div className="search">
            <label className="sr-only" htmlFor="dk-search">Search containers</label>
            <Search aria-hidden="true" />
            <input className="input" id="dk-search" type="search" placeholder="Search by name or image" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
        {loading && !data ? <div className="card-body"><SkeletonRows rows={6} /></div> : !rows.length ? (
          <Empty icon={Container} title={q ? "No containers match" : "No containers"}>{q ? "Try another name." : "Start a container and it shows up here."}</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><SortTh sort={sort} col="name">Container</SortTh><SortTh sort={sort} col="state">State</SortTh><SortTh sort={sort} col="ports" className="col-optional">Ports</SortTh><SortTh sort={sort} col="routed" className="col-optional">Routed by</SortTh><SortTh sort={sort} col="network">Traefik network</SortTh><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              {stacks.map(stack => {
                const list = sort.rows.filter(c => (c.stack || STANDALONE) === stack);
                const running = list.filter(c => c.state === "running").length;
                const isOpen = !closed.has(stack);
                return (
              <tbody className="stack-group" key={stack}>
                <tr className="stack-row">
                  <th colSpan={6} scope="rowgroup">
                    <button type="button" className="stack-toggle" aria-expanded={isOpen} onClick={() => toggleStack(stack)}>
                      <ChevronRight aria-hidden="true" />{stack}<span className="muted">{running} of {list.length} running</span>
                    </button>
                  </th>
                </tr>
                {isOpen && list.map(c => {
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="row-text">{c.name}</span> {c.role === "traefik" && <Badge tone="accent" dot={false}>Traefik</Badge>}
                        <div className="sub mono-sm">{c.image}</div>
                      </td>
                      <td><Badge tone={c.state === "running" ? "success" : c.state === "exited" ? "neutral" : "warning"}>{c.state}</Badge></td>
                      <td className="col-optional mono-sm muted">{c.exposedPorts.join(", ") || "None"}</td>
                      <td className="col-optional muted">
                        {routedBy(c) || "Nothing"}
                      </td>
                      <td>{c.reachable ? <Badge tone="success">Connected</Badge> : c.role === "traefik" ? <Badge tone="success">Is Traefik</Badge> : (
                        <Button size="sm" icon={Link2} busy={busy === c.id} busyLabel="Connecting" onClick={() => connect(c)} aria-label={`Connect ${c.name} to the Traefik network`}>Connect</Button>
                      )}</td>
                      <td className="actions">
                        {c.role !== "traefik" && c.state === "running" && (
                          <button className="icon-btn" type="button" aria-label={`New route to ${c.name}`} data-tooltip="New route to this container" data-tooltip-side="bottom"
                            onClick={() => navigate("routes", { new: "1", container: c.name, port: String(c.exposedPorts[0] ?? "") })}><Plus className="icon-sm" aria-hidden="true" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
                );
              })}
            </table>
          </div>
        )}
        {data && <div className="table-foot"><span>{rows.length} containers in {stacks.filter(s => s !== STANDALONE).length} stacks</span><span>Docker label routes appear on the Routes page, read-only.</span></div>}
      </section>
    </>
  );
}

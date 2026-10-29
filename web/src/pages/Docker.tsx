// Docs: docs/03 - Features/Docker.md
import { useState } from "react";
import { Container, Link2, Plus, Search } from "lucide-react";
import { api, type ContainerInfo } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows, useToast } from "../ui/feedback";
import { PageHeader } from "../ui/Page";
import { useLoad } from "../ui/hooks";
import { navigate } from "../app/router";

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
  const rows = (data?.containers ?? []).filter(c => !q || (c.name + c.image).toLowerCase().includes(q.toLowerCase()));
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
              <thead><tr><th scope="col">Container</th><th scope="col">State</th><th scope="col" className="col-optional">Ports</th><th scope="col" className="col-optional">Routed by</th><th scope="col">Traefik network</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {rows.map(c => {
                  const labelRouters = Object.keys(c.traefikLabels).filter(k => /^traefik\.(http|tcp|udp)\.routers\.[^.]+\.rule$/.test(k)).map(k => k.split(".")[3]);
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="row-text">{c.name}</span> {c.role === "traefik" && <Badge tone="accent" dot={false}>Traefik</Badge>}
                        <div className="sub mono-sm">{c.image}</div>
                      </td>
                      <td><Badge tone={c.state === "running" ? "success" : c.state === "exited" ? "neutral" : "warning"}>{c.state}</Badge></td>
                      <td className="col-optional mono-sm muted">{c.exposedPorts.join(", ") || "None"}</td>
                      <td className="col-optional muted">
                        {[...c.routes.map(r => r), ...labelRouters.map(r => `${r} (labels)`)].join(", ") || "Nothing"}
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
            </table>
          </div>
        )}
        {data && <div className="table-foot"><span>{rows.length} containers</span><span>Docker label routes appear on the Routes page, read-only.</span></div>}
      </section>
    </>
  );
}

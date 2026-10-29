// Docs: docs/03 - Features/Routes.md
import { useEffect, useState } from "react";
import { Container, Pencil, Plus, Route as RouteIcon, Search, SearchX, Trash2 } from "lucide-react";
import { api, type Route, type RouteItem, type RuntimeRouter, type SaveResult } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows, statusTone, useToast, type Tone } from "../ui/feedback";
import { Segmented, Switch } from "../ui/controls";
import { ConfirmDialog } from "../ui/Modal";
import { PageHeader } from "../ui/Page";
import { useLoad } from "../ui/hooks";
import { clearParams } from "../app/router";
import { RouteModal } from "./RouteModal";

interface RoutesData {
  routes: RouteItem[];
  external: RuntimeRouter[];
  traefikReachable: boolean;
}

function statusOf(r: RouteItem): { tone: Tone; text: string } {
  if (!r.enabled) return { tone: "neutral", text: "Disabled" };
  if (!r.runtime) return { tone: "warning", text: "Not loaded yet" };
  if (r.runtime.errors?.length) return { tone: "danger", text: "Error" };
  return { tone: statusTone(r.runtime.status), text: r.runtime.status === "enabled" ? "Active" : r.runtime.status };
}

const targetText = (r: Route) =>
  r.target.kind === "service" ? `service ${r.target.service}` : `${r.target.kind === "docker" ? r.target.container : r.target.address}:${r.target.port}`;

export function Routes({ params }: { params: URLSearchParams }) {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get<RoutesData>("/routes"), [], 15000);
  const [q, setQ] = useState("");
  const [proto, setProto] = useState<"all" | "http" | "tcp" | "udp">("all");
  const [modal, setModal] = useState<{ open: boolean; editing: Route | null; host?: string; container?: string; port?: number }>({ open: false, editing: null });
  const [toDelete, setToDelete] = useState<Route | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // #routes?new=1&host=x opens the window prefilled (from Domains, Overview, Docker).
  useEffect(() => {
    if (params.get("new")) {
      setModal({ open: true, editing: null, host: params.get("host") || undefined, container: params.get("container") || undefined, port: Number(params.get("port")) || undefined });
      clearParams("routes");
    }
  }, [params]);

  const toggle = async (r: Route) => {
    setBusyId(r.id);
    try {
      const res = await api.put<SaveResult>(`/routes/${r.id}`, { ...r, enabled: !r.enabled });
      toast(`Route ${r.name} ${r.enabled ? "disabled" : "enabled"}.`);
      if (res.warnings?.length) toast(res.warnings.join(" "), "warning");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };
  const remove = async () => {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await api.del(`/routes/${toDelete.id}`);
      toast(`Route ${toDelete.name} deleted.`);
      setToDelete(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const match = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase());
  const rows = (data?.routes ?? []).filter(r => (proto === "all" || r.protocol === proto) && (!q || match(r.name) || match(r.rule) || match(targetText(r))));
  const ext = (data?.external ?? []).filter(r => (proto === "all" || r.protocol === proto) && (!q || match(r.name) || match(r.rule || "")));
  const action = (
    <button className="btn btn-primary" type="button" onClick={() => setModal({ open: true, editing: null })}>
      <Plus aria-hidden="true" />New route
    </button>
  );

  return (
    <>
      <PageHeader title="Routes" description="Rules that send incoming traffic to a container, an address or a service." action={action} />
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      {data && !data.traefikReachable && <div className="alert is-warning" role="status"><Search aria-hidden="true" /><div><strong>Traefik is not reachable.</strong> <span className="muted">Statuses are unknown until it is back.</span></div></div>}
      <section className="card">
        <div className="toolbar">
          <div className="search">
            <label className="sr-only" htmlFor="route-search">Search routes</label>
            <Search aria-hidden="true" />
            <input className="input" id="route-search" type="search" placeholder="Search by name, domain or destination" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Segmented label="Protocol" value={proto} onChange={setProto} options={[{ value: "all", label: "All" }, { value: "http", label: "HTTP" }, { value: "tcp", label: "TCP" }, { value: "udp", label: "UDP" }]} />
        </div>
        {loading && !data ? (
          <div className="card-body"><SkeletonRows rows={5} /></div>
        ) : !data?.routes.length ? (
          <Empty icon={RouteIcon} title="No routes yet" action={action}>A route sends a domain to one of your apps. Create the first one.</Empty>
        ) : !rows.length ? (
          <Empty icon={SearchX} title="No routes match" action={<Button onClick={() => { setQ(""); setProto("all"); }}>Clear filters</Button>}>Try another name or domain, or clear the protocol filter.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col" className="col-rule">Rule</th>
                  <th scope="col" className="col-optional">Forwarding to</th>
                  <th scope="col" className="col-optional">HTTPS</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Enabled</span></th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const s = statusOf(r);
                  return (
                    <tr key={r.id}>
                      <td>
                        <button className="row-link" type="button" onClick={() => setModal({ open: true, editing: r })}>{r.name}</button>{" "}
                        <Badge tone="accent" dot={false} mono>{r.protocol.toUpperCase()}</Badge>
                        <span className="rule rule-inline">{r.rule || "all traffic"}</span>
                      </td>
                      <td className="col-rule"><span className="rule">{r.rule || "all traffic"}</span></td>
                      <td className="col-optional muted mono-sm">{targetText(r)}</td>
                      <td className="col-optional muted">{r.tls.enabled ? (r.tls.mode === "passthrough" ? "Passthrough" : "Yes") : "No"}</td>
                      <td>
                        <span title={r.runtime?.errors?.join("\n")}><Badge tone={s.tone}>{s.text}</Badge></span>
                      </td>
                      <td className="actions">
                        <Switch checked={r.enabled} onChange={() => toggle(r)} label={`${r.enabled ? "Disable" : "Enable"} ${r.name}`} disabled={busyId === r.id} />
                      </td>
                      <td className="actions nowrap">
                        <button className="icon-btn" type="button" aria-label={`Edit ${r.name}`} data-tooltip="Edit" data-tooltip-side="bottom" onClick={() => setModal({ open: true, editing: r })}><Pencil className="icon-sm" aria-hidden="true" /></button>
                        <button className="icon-btn" type="button" aria-label={`Delete ${r.name}`} data-tooltip="Delete" data-tooltip-side="bottom" onClick={() => setToDelete(r)}><Trash2 className="icon-sm" aria-hidden="true" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && data.routes.length > 0 && <div className="table-foot"><span>{rows.length} of {data.routes.length} routes</span><span>Refreshes every 15 s</span></div>}
      </section>

      {ext.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>From Docker labels and other providers</h2>
            <span className="hint">Read-only. Edit the container labels to change them.</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Name</th><th scope="col" className="col-rule">Rule</th><th scope="col" className="col-optional">Service</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {ext.map(r => (
                  <tr key={r.name + r.provider}>
                    <td><span className="row-text">{r.name}</span> <Badge dot={false} mono>{r.provider}</Badge><span className="rule rule-inline">{r.rule}</span></td>
                    <td className="col-rule"><span className="rule">{r.rule}</span></td>
                    <td className="col-optional muted">{r.service}</td>
                    <td><span title={r.errors?.join("\n")}><Badge tone={statusTone(r.status, r.errors)}>{r.errors?.length ? "Error" : r.status}</Badge></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot"><span><Container className="icon-sm inline-icon" aria-hidden="true" /> Containers need the label <span className="mono">traefik.enable=true</span> to show up here.</span></div>
        </section>
      )}

      <RouteModal open={modal.open} editing={modal.editing} prefillHost={modal.host} prefillContainer={modal.container} prefillPort={modal.port} onClose={() => setModal(m => ({ ...m, open: false }))} onSaved={reload} />
      <ConfirmDialog open={!!toDelete} title={`Delete route ${toDelete?.name}?`} confirmLabel="Delete route" danger busy={busyId === toDelete?.id} onConfirm={remove} onClose={() => setToDelete(null)}>
        <p>Traffic for <span className="mono">{toDelete?.hosts.join(", ") || toDelete?.name}</span> stops reaching the app right away. You can restore it from Settings, History.</p>
      </ConfirmDialog>
    </>
  );
}

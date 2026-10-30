// Docs: docs/03 - Features/Services.md
import { useEffect, useState } from "react";
import { Pencil, Plus, Server, Trash2, X } from "lucide-react";
import { api, ApiError, type Protocol, type RuntimeService, type SaveResult, type Service } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows, statusTone, useToast } from "../ui/feedback";
import { Field, Segmented, SettingRow, TagInput, invalid } from "../ui/controls";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { PageHeader } from "../ui/Page";
import { useLoad } from "../ui/hooks";
import { SortTh, useSort } from "../ui/sort";

interface Data {
  services: Service[];
  runtime: RuntimeService[];
  traefikReachable: boolean;
}

const KINDS = [
  { value: "loadbalancer", label: "Load balancer" },
  { value: "weighted", label: "Weighted split" },
  { value: "failover", label: "Failover" },
  { value: "mirroring", label: "Mirroring" },
] as const;

const blank = (): Service => ({ id: "", name: "", protocol: "http", kind: "loadbalancer", servers: [], weighted: [], healthCheck: { path: "", interval: "10s", timeout: "3s" }, sticky: false });

function ServiceModal({ open, onClose, editing, names, onSaved }: { open: boolean; onClose: () => void; editing: Service | null; names: string[]; onSaved: () => void }) {
  const toast = useToast();
  const [s, setS] = useState<Service>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      const base = editing ? structuredClone(editing) : blank();
      base.healthCheck ||= { path: "", interval: "10s", timeout: "3s" };
      base.weighted ||= [];
      setS(base);
      setErrors({});
    }
  }, [open, editing]);
  const set = (p: Partial<Service>) => setS(x => ({ ...x, ...p }));
  const others = names.filter(n => n !== s.name);
  const save = async () => {
    setBusy(true);
    setErrors({});
    const body = { ...s, healthCheck: s.healthCheck?.path ? s.healthCheck : undefined };
    try {
      const res = await (editing ? api.put<SaveResult>(`/services/${editing.id}`, body) : api.post<SaveResult>("/services", body));
      toast(`Service ${s.name} saved.`);
      if (res.warnings?.length) toast(res.warnings.join(" "), "warning");
      onSaved();
      onClose();
    } catch (e) {
      const ae = e as ApiError;
      setErrors({ [ae.field || "_"]: ae.message });
    } finally {
      setBusy(false);
    }
  };
  const refSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <select className="select" aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Choose a service</option>
      {others.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  );
  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${editing.name}` : "New service"} description="A backend routes can share: several servers, a traffic split or a fallback."
      footer={<>{errors._ && <span className="error foot-error">{errors._}</span>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" busy={busy} busyLabel="Saving" onClick={save}>Save service</Button></>}>
      <form className="modal-body" onSubmit={e => { e.preventDefault(); save(); }} noValidate>
        <div className="field-row">
          <Field label="Name" htmlFor="sv-name" error={errors.name}>
            <input className="input mono" {...invalid("sv-name", errors.name)} placeholder="e.g. api-pool" value={s.name} onChange={e => set({ name: e.target.value.toLowerCase() })} />
          </Field>
          <Field label="Protocol">
            <Segmented<Protocol> label="Protocol" value={s.protocol} onChange={protocol => set({ protocol, servers: [] })} options={[{ value: "http", label: "HTTP" }, { value: "tcp", label: "TCP" }, { value: "udp", label: "UDP" }]} />
          </Field>
        </div>
        <Field label="Type">
          <Segmented label="Service type" value={s.kind} onChange={kind => set({ kind })} options={KINDS.filter(k => s.protocol === "http" || k.value === "loadbalancer" || k.value === "weighted").map(k => ({ ...k }))} />
        </Field>
        {s.kind === "loadbalancer" && (
          <>
            <Field label="Servers" htmlFor="sv-servers" error={errors.servers} hint={s.protocol === "http" ? "Full URLs, like http://10.0.0.5:8080. Traffic is spread between them." : "host:port, like 10.0.0.5:5432."}>
              <TagInput id="sv-servers" values={s.servers} onChange={servers => set({ servers })} placeholder={s.protocol === "http" ? "http://10.0.0.5:8080" : "10.0.0.5:5432"} invalidMsg={errors.servers} />
            </Field>
            {s.protocol === "http" && (
              <>
                <div className="field-row three">
                  <Field label="Health check path" htmlFor="sv-hc" optional hint="Servers failing it get no traffic.">
                    <input className="input mono" {...invalid("sv-hc")} placeholder="/health" value={s.healthCheck?.path || ""} onChange={e => set({ healthCheck: { ...s.healthCheck!, path: e.target.value } })} />
                  </Field>
                  <Field label="Every" htmlFor="sv-hci"><input className="input mono" {...invalid("sv-hci")} value={s.healthCheck?.interval || ""} onChange={e => set({ healthCheck: { ...s.healthCheck!, interval: e.target.value } })} /></Field>
                  <Field label="Timeout" htmlFor="sv-hct"><input className="input mono" {...invalid("sv-hct")} value={s.healthCheck?.timeout || ""} onChange={e => set({ healthCheck: { ...s.healthCheck!, timeout: e.target.value } })} /></Field>
                </div>
                <SettingRow title="Sticky sessions" description="A visitor keeps hitting the same server (cookie)." checked={!!s.sticky} onChange={sticky => set({ sticky })} />
                <SettingRow title="Skip TLS verification" description="For backends with self-signed certificates on https://." checked={!!s.insecureSkipVerify} onChange={insecureSkipVerify => set({ insecureSkipVerify })} />
              </>
            )}
          </>
        )}
        {s.kind === "weighted" && (
          <Field label="Split traffic between" error={errors.weighted} hint="Weights are relative: 3 and 1 send 75% and 25%.">
            <div className="ref-rows">
              {(s.weighted ?? []).map((w, i) => (
                <div className="ref-row" key={i}>
                  {refSelect(w.service, v => set({ weighted: s.weighted!.map((x, j) => (j === i ? { ...x, service: v } : x)) }), `Service ${i + 1}`)}
                  <input className="input mono" aria-label={`Weight ${i + 1}`} inputMode="numeric" value={w.weight} onChange={e => set({ weighted: s.weighted!.map((x, j) => (j === i ? { ...x, weight: +e.target.value.replace(/\D/g, "") } : x)) })} />
                  <button className="icon-btn" type="button" aria-label={`Remove service ${i + 1}`} data-tooltip="Remove" onClick={() => set({ weighted: s.weighted!.filter((_, j) => j !== i) })}><X className="icon-sm" aria-hidden="true" /></button>
                </div>
              ))}
              <Button size="sm" icon={Plus} onClick={() => set({ weighted: [...(s.weighted ?? []), { service: "", weight: 1 }] })}>Add service</Button>
            </div>
          </Field>
        )}
        {s.kind === "failover" && (
          <div className="field-row">
            <Field label="Main service" error={errors.failover}>{refSelect(s.failover?.service || "", v => set({ failover: { service: v, fallback: s.failover?.fallback || "" } }), "Main service")}</Field>
            <Field label="Fallback when main is down">{refSelect(s.failover?.fallback || "", v => set({ failover: { service: s.failover?.service || "", fallback: v } }), "Fallback service")}</Field>
          </div>
        )}
        {s.kind === "mirroring" && (
          <>
            <Field label="Main service" error={errors.mirroring} hint="Answers the visitor.">{refSelect(s.mirroring?.service || "", v => set({ mirroring: { service: v, mirrors: s.mirroring?.mirrors ?? [] } }), "Main service")}</Field>
            <Field label="Copy traffic to" hint="Percent of requests copied. Their answers are ignored.">
              <div className="ref-rows">
                {(s.mirroring?.mirrors ?? []).map((m, i) => (
                  <div className="ref-row" key={i}>
                    {refSelect(m.service, v => set({ mirroring: { ...s.mirroring!, mirrors: s.mirroring!.mirrors.map((x, j) => (j === i ? { ...x, service: v } : x)) } }), `Mirror ${i + 1}`)}
                    <input className="input mono" aria-label={`Percent ${i + 1}`} inputMode="numeric" value={m.weight} onChange={e => set({ mirroring: { ...s.mirroring!, mirrors: s.mirroring!.mirrors.map((x, j) => (j === i ? { ...x, weight: +e.target.value.replace(/\D/g, "") } : x)) } })} />
                    <button className="icon-btn" type="button" aria-label={`Remove mirror ${i + 1}`} data-tooltip="Remove" onClick={() => set({ mirroring: { ...s.mirroring!, mirrors: s.mirroring!.mirrors.filter((_, j) => j !== i) } })}><X className="icon-sm" aria-hidden="true" /></button>
                  </div>
                ))}
                <Button size="sm" icon={Plus} onClick={() => set({ mirroring: { service: s.mirroring?.service || "", mirrors: [...(s.mirroring?.mirrors ?? []), { service: "", weight: 10 }] } })}>Add mirror</Button>
              </div>
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}

const serversText = (s: Service) => (s.kind === "loadbalancer" ? s.servers.join(", ") : s.kind === "weighted" ? s.weighted?.map(w => `${w.service} (${w.weight})`).join(", ") : s.kind === "failover" ? `${s.failover?.service}, then ${s.failover?.fallback}` : `${s.mirroring?.service} + ${s.mirroring?.mirrors.length} mirror(s)`);

export function Services() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get<Data>("/services"), [], 15000);
  const [modal, setModal] = useState<{ open: boolean; editing: Service | null }>({ open: false, editing: null });
  const [toDelete, setToDelete] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);
  const names = Array.from(new Set([...(data?.services.map(s => s.name) ?? []), ...(data?.runtime.filter(r => r.provider === "file").map(r => r.name) ?? [])]));
  const sort = useSort(data?.services ?? [], { name: s => s.name, kind: s => KINDS.find(k => k.value === s.kind)?.label, servers: serversText }, "name");
  const runtimeSort = useSort(data?.runtime ?? [], { name: r => r.name, servers: r => r.servers[0] ?? r.type, used: r => r.usedBy?.map(u => u.replace(/@.*/, "")).join(", "), status: r => (r.errors?.length ? "Error" : r.status) }, "name");
  const action = <button className="btn btn-primary" type="button" onClick={() => setModal({ open: true, editing: null })}><Plus aria-hidden="true" />New service</button>;
  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.del(`/services/${toDelete.id}`);
      toast(`Service ${toDelete.name} deleted.`);
      setToDelete(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader title="Services" description="Where routes send traffic. Routes to one container or address get their own service automatically." action={action} />
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      <section className="card">
        <div className="card-head"><h2>Shared services</h2><span className="hint">Several servers, splits and fallbacks you created.</span></div>
        {loading && !data ? <div className="card-body"><SkeletonRows /></div> : !data?.services.length ? (
          <Empty icon={Server} title="No shared services" action={action}>Create one when a route needs several servers, a canary split or a fallback.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><SortTh sort={sort} col="name">Name</SortTh><SortTh sort={sort} col="kind">Type</SortTh><SortTh sort={sort} col="servers" className="col-optional">Servers or services</SortTh><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {sort.rows.map(s => (
                  <tr key={s.id}>
                    <td><button className="row-link" type="button" onClick={() => setModal({ open: true, editing: s })}>{s.name}</button> <Badge tone="accent" dot={false} mono>{s.protocol.toUpperCase()}</Badge></td>
                    <td className="muted">{KINDS.find(k => k.value === s.kind)?.label}</td>
                    <td className="col-optional muted mono-sm">
                      {serversText(s)}
                    </td>
                    <td className="actions nowrap">
                      <button className="icon-btn" type="button" aria-label={`Edit ${s.name}`} data-tooltip="Edit" data-tooltip-side="bottom" onClick={() => setModal({ open: true, editing: s })}><Pencil className="icon-sm" aria-hidden="true" /></button>
                      <button className="icon-btn" type="button" aria-label={`Delete ${s.name}`} data-tooltip="Delete" data-tooltip-side="bottom" onClick={() => setToDelete(s)}><Trash2 className="icon-sm" aria-hidden="true" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h2>Health in Traefik</h2><span className="hint">Every service Traefik runs, from all providers.</span></div>
        {!data ? <div className="card-body"><SkeletonRows /></div> : !data.traefikReachable ? (
          <div className="card-body"><ErrorBox title="Traefik is not reachable." message="Server health is unknown." onRetry={reload} /></div>
        ) : !data.runtime.length ? (
          <Empty icon={Server} title="No services in Traefik yet" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><SortTh sort={runtimeSort} col="name">Service</SortTh><SortTh sort={runtimeSort} col="servers">Servers</SortTh><SortTh sort={runtimeSort} col="used" className="col-optional">Used by</SortTh><SortTh sort={runtimeSort} col="status">Status</SortTh></tr></thead>
              <tbody>
                {runtimeSort.rows.map(r => {
                  const st = Object.entries(r.serverStatus ?? {});
                  const down = st.filter(([, v]) => v !== "UP").length;
                  return (
                    <tr key={r.name + r.provider}>
                      <td><span className="row-text">{r.name}</span> <Badge dot={false} mono>{r.provider}</Badge></td>
                      <td>
                        <ul className="server-list">
                          {(r.servers.length ? r.servers : [r.type || "composite"]).map(s => {
                            const state = r.serverStatus?.[s];
                            return <li key={s}><span className={`status-dot${state && state !== "UP" ? " is-danger" : state ? "" : " is-neutral"}`} aria-hidden="true" /><span className="mono-sm">{s}</span>{state && state !== "UP" && <span className="sr-only"> down</span>}</li>;
                          })}
                        </ul>
                      </td>
                      <td className="col-optional muted">{r.usedBy?.map(u => u.replace(/@.*/, "")).join(", ") || "Nothing"}</td>
                      <td><Badge tone={down ? "danger" : statusTone(r.status, r.errors)}>{down ? `${down} of ${st.length} down` : r.errors?.length ? "Error" : r.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ServiceModal open={modal.open} editing={modal.editing} names={names} onClose={() => setModal(m => ({ ...m, open: false }))} onSaved={reload} />
      <ConfirmDialog open={!!toDelete} title={`Delete service ${toDelete?.name}?`} confirmLabel="Delete service" danger busy={busy} onConfirm={remove} onClose={() => setToDelete(null)}>
        <p>eztraefik blocks this if a route or another service still uses it.</p>
      </ConfirmDialog>
    </>
  );
}

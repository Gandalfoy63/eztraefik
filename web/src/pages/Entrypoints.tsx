// Docs: docs/03 - Features/Entrypoints.md
import { useEffect, useState } from "react";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { ApiError, type Entrypoint } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows, useToast } from "../ui/feedback";
import { Field, Segmented, SettingRow, TagInput, invalid } from "../ui/controls";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { PageHeader } from "../ui/Page";
import { PendingBanner, saveTraefik, useTraefik } from "./traefikConfig";

const blank = (): Entrypoint => ({ name: "", port: 0, protocol: "tcp", hostPort: 0, redirectTo: "", http3: false, trustedIPs: [], defaultResolver: "" });

export function Entrypoints() {
  const toast = useToast();
  const { data, error, loading, reload } = useTraefik();
  const [edit, setEdit] = useState<{ open: boolean; index: number }>({ open: false, index: -1 });
  const [e, setE] = useState<Entrypoint>(blank);
  const [publish, setPublish] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<number | null>(null);
  const cfg = data?.config;

  useEffect(() => {
    if (!edit.open || !cfg) return;
    const base = edit.index >= 0 ? structuredClone(cfg.entrypoints[edit.index]) : blank();
    setE(base);
    setPublish(edit.index < 0 || base.hostPort > 0);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

  const persist = async (entrypoints: Entrypoint[], msg: string) => {
    setBusy(true);
    setErrors({});
    try {
      await saveTraefik({ ...cfg!, entrypoints });
      toast(msg);
      setEdit({ open: false, index: -1 });
      setToDelete(null);
      reload();
    } catch (err) {
      const ae = err as ApiError;
      setErrors({ _: ae.message });
      if (toDelete !== null) toast(ae.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    const next = { ...e, hostPort: publish ? e.hostPort || e.port : 0 };
    const list = [...cfg!.entrypoints];
    if (edit.index >= 0) list[edit.index] = next;
    else list.push(next);
    persist(list, `Entrypoint ${next.name} saved. Apply it on the Traefik page.`);
  };

  const action = <button className="btn btn-primary" type="button" onClick={() => setEdit({ open: true, index: -1 })} disabled={!cfg}><Plus aria-hidden="true" />New entrypoint</button>;
  const others = cfg?.entrypoints.filter((_, i) => i !== edit.index) ?? [];

  return (
    <>
      <PageHeader title="Entrypoints" description="The ports Traefik listens on. Routes pick one or more of them." action={action} />
      <PendingBanner pending={data?.pending} />
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      <section className="card">
        {loading && !data ? <div className="card-body"><SkeletonRows /></div> : !cfg?.entrypoints.length ? (
          <Empty icon={DoorOpen} title="No entrypoints" action={action}>Add at least one port, usually 80 and 443.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Name</th><th scope="col">Port in Traefik</th><th scope="col">Published on host</th><th scope="col" className="col-optional">Options</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {cfg.entrypoints.map((x, i) => (
                  <tr key={x.name}>
                    <td><button className="row-link" type="button" onClick={() => setEdit({ open: true, index: i })}>{x.name}</button> <Badge tone="accent" dot={false} mono>{x.protocol.toUpperCase()}</Badge></td>
                    <td className="mono-sm">:{x.port}</td>
                    <td className="mono-sm">{x.hostPort ? `:${x.hostPort}` : <span className="muted">Not published</span>}</td>
                    <td className="col-optional muted">{[x.redirectTo && `Redirects to ${x.redirectTo}`, x.defaultResolver && `Certificates from ${x.defaultResolver}`, x.http3 && "HTTP/3", x.trustedIPs?.length && "Trusted proxies"].filter(Boolean).join(", ") || "None"}</td>
                    <td className="actions nowrap">
                      <button className="icon-btn" type="button" aria-label={`Edit ${x.name}`} data-tooltip="Edit" data-tooltip-side="bottom" onClick={() => setEdit({ open: true, index: i })}><Pencil className="icon-sm" aria-hidden="true" /></button>
                      <button className="icon-btn" type="button" aria-label={`Delete ${x.name}`} data-tooltip="Delete" data-tooltip-side="bottom" onClick={() => setToDelete(i)}><Trash2 className="icon-sm" aria-hidden="true" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-foot"><span>Port <span className="mono">8080</span> inside Traefik is reserved for its API, used by eztraefik.</span></div>
      </section>

      <Modal open={edit.open} onClose={() => setEdit({ open: false, index: -1 })} title={edit.index >= 0 ? `Edit ${cfg?.entrypoints[edit.index]?.name}` : "New entrypoint"} description="A port Traefik listens on, for HTTP, TCP or UDP traffic."
        footer={<>{errors._ && <span className="error foot-error">{errors._}</span>}<Button onClick={() => setEdit({ open: false, index: -1 })}>Cancel</Button><Button variant="primary" busy={busy} busyLabel="Saving" onClick={save}>Save entrypoint</Button></>}>
        <form className="modal-body" onSubmit={ev => { ev.preventDefault(); save(); }} noValidate>
          <div className="field-row">
            <Field label="Name" htmlFor="ep-name" hint="Used by routes, like websecure or postgres.">
              <input className="input mono" {...invalid("ep-name")} placeholder="e.g. postgres" value={e.name} onChange={ev => setE({ ...e, name: ev.target.value.toLowerCase() })} />
            </Field>
            <Field label="Protocol">
              <Segmented label="Protocol" value={e.protocol} onChange={protocol => setE({ ...e, protocol })} options={[{ value: "tcp", label: "TCP (and HTTP)" }, { value: "udp", label: "UDP" }]} />
            </Field>
          </div>
          <div className="field-row">
            <Field label="Port inside Traefik" htmlFor="ep-port">
              <input className="input mono" {...invalid("ep-port")} inputMode="numeric" placeholder="5432" value={e.port || ""} onChange={ev => setE({ ...e, port: +ev.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Port on the host" htmlFor="ep-host" hint={publish ? "Visitors connect to this port. Usually the same." : "Not reachable from outside the Docker network."}>
              <input className="input mono" {...invalid("ep-host")} inputMode="numeric" placeholder={String(e.port || "")} disabled={!publish} value={publish ? e.hostPort || "" : ""} onChange={ev => setE({ ...e, hostPort: +ev.target.value.replace(/\D/g, "") })} />
            </Field>
          </div>
          <SettingRow title="Publish on the host" description="Opens the port on this machine so other devices can reach it." checked={publish} onChange={setPublish} />
          {e.protocol === "tcp" && (
            <>
              <Field label="Redirect HTTP visitors to" htmlFor="ep-redirect" optional hint="Every request on this port is redirected to HTTPS on that entrypoint.">
                <select className="select" id="ep-redirect" value={e.redirectTo || ""} onChange={ev => setE({ ...e, redirectTo: ev.target.value })}>
                  <option value="">No redirect</option>
                  {others.filter(o => o.protocol === "tcp").map(o => <option key={o.name} value={o.name}>{o.name} (:{o.hostPort || o.port})</option>)}
                </select>
              </Field>
              <Field label="Issue certificates for every route on this port" htmlFor="ep-res" optional>
                <select className="select" id="ep-res" value={e.defaultResolver || ""} onChange={ev => setE({ ...e, defaultResolver: ev.target.value })}>
                  <option value="">Only for routes that ask</option>
                  {cfg?.resolvers.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                </select>
              </Field>
              <SettingRow title="HTTP/3" description="Also listens on UDP for QUIC. Needs HTTPS." checked={!!e.http3} onChange={http3 => setE({ ...e, http3 })} />
              <Field label="Trusted proxies" htmlFor="ep-trusted" optional hint="IPs or ranges whose X-Forwarded-* headers Traefik keeps, for example a CDN or load balancer in front.">
                <TagInput id="ep-trusted" values={e.trustedIPs ?? []} onChange={trustedIPs => setE({ ...e, trustedIPs })} placeholder="10.0.0.0/8" />
              </Field>
            </>
          )}
        </form>
      </Modal>
      <ConfirmDialog open={toDelete !== null} title={`Delete entrypoint ${toDelete !== null ? cfg?.entrypoints[toDelete]?.name : ""}?`} confirmLabel="Delete entrypoint" danger busy={busy}
        onConfirm={() => persist(cfg!.entrypoints.filter((_, i) => i !== toDelete), "Entrypoint deleted. Apply it on the Traefik page.")} onClose={() => setToDelete(null)}>
        <p>Routes using it must be changed first. The port closes when Traefik is recreated.</p>
      </ConfirmDialog>
    </>
  );
}

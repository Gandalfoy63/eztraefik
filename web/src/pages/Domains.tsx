// Docs: docs/03 - Features/Domains.md
import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Globe, Plus, Trash2 } from "lucide-react";
import { api, ApiError, type Cert, type DomainInfo, type Resolver } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows, Spinner, useToast } from "../ui/feedback";
import { Field, SettingRow, invalid } from "../ui/controls";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { PageHeader } from "../ui/Page";
import { daysUntil, useLoad } from "../ui/hooks";
import { navigate } from "../app/router";
import { covers } from "../ui/certs";


function DNSCheck({ name }: { name: string }) {
  const { data, loading } = useLoad(() => api.get<{ resolves: boolean; addresses: string[] }>(`/domains/${encodeURIComponent(name)}/dns`), [name]);
  if (loading) return <Spinner label="Checking DNS" />;
  return data?.resolves ? (
    <span className="inline-status"><CircleCheck className="icon-sm ok" aria-hidden="true" /><span className="mono-sm">{data.addresses.slice(0, 2).join(", ")}</span></span>
  ) : (
    <span className="inline-status"><CircleAlert className="icon-sm bad" aria-hidden="true" />No DNS record</span>
  );
}

export function Domains() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get<{ domains: DomainInfo[]; certificates: Cert[] }>("/domains"));
  const [resolvers, setResolvers] = useState<Resolver[]>([]);
  const [open, setOpen] = useState(false);
  const [d, setD] = useState({ name: "", resolver: "", wildcard: false });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ resolvers: Resolver[] }>("/certificates").then(r => setResolvers(r.resolvers)).catch(() => {});
  }, []);
  const save = async () => {
    setBusy(true);
    setErr({});
    try {
      await api.post("/domains", d);
      toast(`Domain ${d.name} added.`);
      setOpen(false);
      reload();
    } catch (e) {
      const ae = e as ApiError;
      setErr({ [ae.field || "_"]: ae.message });
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/domains/${encodeURIComponent(toDelete!)}`);
      toast(`Domain ${toDelete} removed. Its routes are unchanged.`);
      setToDelete(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const action = <button className="btn btn-primary" type="button" onClick={() => { setD({ name: "", resolver: resolvers[0]?.name || "", wildcard: false }); setErr({}); setOpen(true); }}><Plus aria-hidden="true" />Add domain</button>;
  const certFor = (host: string) => data?.certificates.find(c => (c.domains.length ? c.domains : [c.main]).some(n => covers(n, host)));
  const dnsResolvers = resolvers.filter(r => r.challenge === "dns");

  return (
    <>
      <PageHeader title="Domains" description="Every domain your routes answer on, with its DNS and certificate." action={action} />
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? <div className="card card-body"><SkeletonRows /></div> : !data?.domains.length ? (
        <section className="card"><Empty icon={Globe} title="No domains yet" action={action}>Add a domain, or create a route: its domain shows up here.</Empty></section>
      ) : (
        data.domains.map(dom => (
          <section className="card" key={dom.name}>
            <div className="card-head">
              <h2 className="mono">{dom.name} {dom.wildcard && <Badge tone="accent" dot={false}>Wildcard</Badge>} {!dom.explicit && <Badge dot={false}>From routes</Badge>}</h2>
              <div className="card-actions">
                <Button size="sm" icon={Plus} onClick={() => navigate("routes", { new: "1", host: dom.name })}>Add route on this domain</Button>
                {dom.explicit && <button className="icon-btn" type="button" aria-label={`Remove ${dom.name}`} data-tooltip="Remove domain" data-tooltip-side="bottom" onClick={() => setToDelete(dom.name)}><Trash2 className="icon-sm" aria-hidden="true" /></button>}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th scope="col">Host</th><th scope="col">DNS</th><th scope="col">Certificate</th><th scope="col" className="col-optional">Routes</th></tr></thead>
                <tbody>
                  {(dom.hosts.length ? dom.hosts : [dom.name]).map(h => {
                    const c = certFor(h);
                    const days = c ? daysUntil(c.notAfter) : 0;
                    return (
                      <tr key={h}>
                        <td className="mono-sm">{h}</td>
                        <td><DNSCheck name={h} /></td>
                        <td>{c ? <Badge tone={days <= 3 ? "danger" : days <= 14 ? "warning" : "success"}>{days < 0 ? "Expired" : `Valid, ${days} days left`}</Badge> : <Badge>None yet</Badge>}</td>
                        <td className="col-optional muted">{dom.routes.length ? dom.routes.join(", ") : "None"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {dom.resolver && <div className="table-foot"><span>New certificates from <span className="mono">{dom.resolver}</span>{dom.wildcard ? `, as a wildcard for *.${dom.name}` : ""}.</span></div>}
          </section>
        ))
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add domain" description="Group routes under a domain and choose how its certificates are issued." width={500}
        footer={<>{err._ && <span className="error foot-error">{err._}</span>}<Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" busy={busy} busyLabel="Adding" onClick={save}>Add domain</Button></>}>
        <form className="modal-body" onSubmit={e => { e.preventDefault(); save(); }} noValidate>
          <Field label="Domain" htmlFor="dm-name" error={err.name} hint="Like example.com, without www or *.">
            <input className="input mono" {...invalid("dm-name", err.name)} placeholder="example.com" value={d.name} onChange={e => setD({ ...d, name: e.target.value.toLowerCase().trim() })} />
          </Field>
          <Field label="Certificates from" htmlFor="dm-res" error={err.resolver} optional>
            <select className="select" id="dm-res" value={d.resolver} onChange={e => setD({ ...d, resolver: e.target.value })}>
              <option value="">Decide per route</option>
              {resolvers.map(r => <option key={r.name} value={r.name}>{r.name} ({r.challenge.toUpperCase()} challenge)</option>)}
            </select>
          </Field>
          <SettingRow title="Wildcard certificate" description={dnsResolvers.length ? `One certificate for *.${d.name || "example.com"}. Needs a DNS challenge resolver.` : "Needs a resolver with the DNS challenge. Add one on the Certificates page."}
            checked={d.wildcard} onChange={wildcard => setD({ ...d, wildcard })} disabled={!dnsResolvers.length} />
          {err.wildcard && <span className="error">{err.wildcard}</span>}
        </form>
      </Modal>
      <ConfirmDialog open={!!toDelete} title={`Remove ${toDelete}?`} confirmLabel="Remove domain" danger busy={busy} onConfirm={remove} onClose={() => setToDelete(null)}>
        <p>Routes on this domain keep working. Only the grouping and its default resolver are removed.</p>
      </ConfirmDialog>
    </>
  );
}

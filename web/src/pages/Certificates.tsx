// Docs: docs/03 - Features/Certificates.md
// Resolvers (how certificates are issued), issued ACME certificates, and uploaded ones.
import { useEffect, useState, type ChangeEvent } from "react";
import { Pencil, Plus, ShieldCheck, Trash2, Upload } from "lucide-react";
import { api, ApiError, type Cert, type EnvVar, type Resolver } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows, useToast } from "../ui/feedback";
import { Field, Segmented, invalid } from "../ui/controls";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { Card, PageHeader } from "../ui/Page";
import { daysUntil, useLoad } from "../ui/hooks";
import { PendingBanner, saveTraefik, useTraefik } from "./traefikConfig";

const blankResolver = (): Resolver => ({ name: "", email: "", challenge: "http", httpEntrypoint: "web", dnsProvider: "", caServer: "", caCertPEM: "" });

export function Certificates() {
  const toast = useToast();
  const certs = useLoad(() => api.get<{ certificates: Cert[] }>("/certificates"), [], 30000);
  const traefik = useTraefik();
  const cfg = traefik.data?.config;
  const [resModal, setResModal] = useState<{ open: boolean; index: number }>({ open: false, index: -1 });
  const [res, setRes] = useState<Resolver>(blankResolver);
  const [dnsEnv, setDnsEnv] = useState<EnvVar[]>([]);
  const [upload, setUpload] = useState(false);
  const [up, setUp] = useState({ name: "", cert: "", key: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<{ kind: "resolver" | "cert"; id: string; label: string } | null>(null);

  useEffect(() => {
    if (!resModal.open || !cfg) return;
    setRes(resModal.index >= 0 ? structuredClone(cfg.resolvers[resModal.index]) : blankResolver());
    setDnsEnv([]);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resModal]);

  const saveResolver = async () => {
    setBusy(true);
    setErrors({});
    const list = [...cfg!.resolvers];
    if (resModal.index >= 0) list[resModal.index] = res;
    else list.push(res);
    const env = [...cfg!.env.filter(e => !dnsEnv.some(d => d.key === e.key)), ...dnsEnv.filter(d => d.key)];
    try {
      await saveTraefik({ ...cfg!, resolvers: list, env });
      toast(`Resolver ${res.name} saved. Apply it on the Traefik page.`);
      setResModal({ open: false, index: -1 });
      traefik.reload();
    } catch (e) {
      const ae = e as ApiError;
      setErrors({ _: ae.message });
    } finally {
      setBusy(false);
    }
  };
  const saveUpload = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api.post("/certificates", up);
      toast("Certificate uploaded. Traefik serves it for matching domains now.");
      setUpload(false);
      certs.reload();
    } catch (e) {
      const ae = e as ApiError;
      setErrors({ [ae.field || "_"]: ae.message });
    } finally {
      setBusy(false);
    }
  };
  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    try {
      if (del.kind === "cert") {
        await api.del(`/certificates/${del.id}`);
        certs.reload();
      } else {
        await saveTraefik({ ...cfg!, resolvers: cfg!.resolvers.filter(r => r.name !== del.id) });
        traefik.reload();
      }
      toast(`${del.label} deleted.`);
      setDel(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const readFile = (k: "cert" | "key") => (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) f.text().then(t => setUp(u => ({ ...u, [k]: t })));
  };
  const tcpEntrypoints = cfg?.entrypoints.filter(e => e.protocol === "tcp") ?? [];

  return (
    <>
      <PageHeader title="Certificates" description="How HTTPS certificates are issued, and every certificate Traefik can serve."
        action={<button className="btn btn-primary" type="button" onClick={() => setResModal({ open: true, index: -1 })} disabled={!cfg}><Plus aria-hidden="true" />New resolver</button>} />
      <PendingBanner pending={traefik.data?.pending} />
      {traefik.error && !cfg && <ErrorBox message={traefik.error} onRetry={traefik.reload} />}

      <Card title="Resolvers" actions={<span className="hint">Routes pick one to get a certificate automatically.</span>} flush>
        {!cfg ? <div className="card-body"><SkeletonRows rows={2} /></div> : !cfg.resolvers.length ? (
          <Empty icon={ShieldCheck} title="No resolver yet">Add Let's Encrypt to get free certificates for your domains.</Empty>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th scope="col">Name</th><th scope="col">Challenge</th><th scope="col" className="col-optional">Server</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{cfg.resolvers.map((r, i) => (
              <tr key={r.name}>
                <td><button className="row-link" type="button" onClick={() => setResModal({ open: true, index: i })}>{r.name}</button></td>
                <td className="muted">{r.challenge === "dns" ? `DNS (${r.dnsProvider})` : r.challenge === "tls" ? "TLS-ALPN" : `HTTP on ${r.httpEntrypoint || "web"}`}</td>
                <td className="col-optional muted mono-sm">{r.caServer || "Let's Encrypt"}</td>
                <td className="actions nowrap">
                  <button className="icon-btn" type="button" aria-label={`Edit ${r.name}`} data-tooltip="Edit" data-tooltip-side="bottom" onClick={() => setResModal({ open: true, index: i })}><Pencil className="icon-sm" aria-hidden="true" /></button>
                  <button className="icon-btn" type="button" aria-label={`Delete ${r.name}`} data-tooltip="Delete" data-tooltip-side="bottom" onClick={() => setDel({ kind: "resolver", id: r.name, label: `Resolver ${r.name}` })}><Trash2 className="icon-sm" aria-hidden="true" /></button>
                </td>
              </tr>))}
            </tbody></table></div>
        )}
      </Card>

      <Card title="Certificates" actions={<Button size="sm" icon={Upload} onClick={() => { setUp({ name: "", cert: "", key: "" }); setErrors({}); setUpload(true); }}>Upload certificate</Button>} flush>
        {certs.error && !certs.data ? <div className="card-body"><ErrorBox message={certs.error} onRetry={certs.reload} /></div> : !certs.data ? <div className="card-body"><SkeletonRows /></div> : !certs.data.certificates.length ? (
          <Empty icon={ShieldCheck} title="No certificates yet">They appear here once a route with HTTPS gets its first visit, or after an upload.</Empty>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th scope="col">Domains</th><th scope="col">Source</th><th scope="col">Expires</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{certs.data.certificates.map(c => {
              const d = daysUntil(c.notAfter);
              return (
                <tr key={c.id}>
                  <td className="mono-sm">{(c.domains.length ? c.domains : [c.main]).join(", ")}</td>
                  <td className="muted">{c.source === "acme" ? `${c.resolver}, ${c.issuer}` : `Uploaded${c.name ? ": " + c.name : ""}`}</td>
                  <td><Badge tone={d < 0 || d <= 3 ? "danger" : d <= 14 ? "warning" : "success"}>{d < 0 ? "Expired" : `${new Date(c.notAfter).toLocaleDateString()}, ${d} days`}</Badge></td>
                  <td className="actions">{c.source === "uploaded" && <button className="icon-btn" type="button" aria-label={`Delete certificate ${c.main}`} data-tooltip="Delete" data-tooltip-side="bottom" onClick={() => setDel({ kind: "cert", id: c.id, label: `Certificate ${c.main}` })}><Trash2 className="icon-sm" aria-hidden="true" /></button>}</td>
                </tr>
              );
            })}</tbody></table></div>
        )}
        <div className="table-foot"><span>ACME certificates renew automatically 30 days before they expire.</span></div>
      </Card>

      <Modal open={resModal.open} onClose={() => setResModal({ open: false, index: -1 })} title={resModal.index >= 0 ? `Edit ${res.name}` : "New resolver"} description="An ACME account that issues certificates, usually Let's Encrypt."
        footer={<>{errors._ && <span className="error foot-error">{errors._}</span>}<Button onClick={() => setResModal({ open: false, index: -1 })}>Cancel</Button><Button variant="primary" busy={busy} busyLabel="Saving" onClick={saveResolver}>Save resolver</Button></>}>
        <form className="modal-body" onSubmit={e => { e.preventDefault(); saveResolver(); }} noValidate>
          <div className="field-row">
            <Field label="Name" htmlFor="rs-name" hint="Routes refer to it, like letsencrypt.">
              <input className="input mono" {...invalid("rs-name")} placeholder="letsencrypt" value={res.name} onChange={e => setRes({ ...res, name: e.target.value.toLowerCase() })} disabled={resModal.index >= 0} />
            </Field>
            <Field label="Email" htmlFor="rs-email" hint="For expiry notices.">
              <input className="input" type="email" {...invalid("rs-email")} value={res.email} onChange={e => setRes({ ...res, email: e.target.value })} />
            </Field>
          </div>
          <Field label="Challenge" hint={res.challenge === "http" ? "The CA visits http://your-domain/.well-known/... Port 80 must be reachable." : res.challenge === "tls" ? "The CA connects on port 443." : "eztraefik's Traefik creates a DNS record. Works behind firewalls and for wildcards."}>
            <Segmented label="Challenge" value={res.challenge} onChange={challenge => setRes({ ...res, challenge })} options={[{ value: "http", label: "HTTP" }, { value: "tls", label: "TLS-ALPN" }, { value: "dns", label: "DNS" }]} />
          </Field>
          {res.challenge === "http" && (
            <Field label="Entrypoint for the challenge" htmlFor="rs-ep">
              <select className="select" id="rs-ep" value={res.httpEntrypoint || "web"} onChange={e => setRes({ ...res, httpEntrypoint: e.target.value })}>
                {tcpEntrypoints.map(e => <option key={e.name} value={e.name}>{e.name} (:{e.hostPort || e.port})</option>)}
              </select>
            </Field>
          )}
          {res.challenge === "dns" && (
            <>
              <Field label="DNS provider code" htmlFor="rs-dns" hint={<>Traefik's provider code, like cloudflare, ovh, route53. See the <a href="https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/#providers" target="_blank" rel="noreferrer">provider list</a>.</>}>
                <input className="input mono" {...invalid("rs-dns")} placeholder="cloudflare" value={res.dnsProvider || ""} onChange={e => setRes({ ...res, dnsProvider: e.target.value.trim() })} />
              </Field>
              <Field label="Provider credentials" hint="Stored as secret environment variables of the Traefik container. Existing ones are on the Traefik page.">
                <div className="ref-rows">
                  {dnsEnv.map((v, i) => (
                    <div className="ref-row" key={i}>
                      <input className="input mono" aria-label={`Variable ${i + 1} name`} placeholder="CF_DNS_API_TOKEN" value={v.key} onChange={e => setDnsEnv(dnsEnv.map((x, j) => (j === i ? { ...x, key: e.target.value.trim() } : x)))} />
                      <input className="input mono" aria-label={`Variable ${i + 1} value`} type="password" autoComplete="off" value={v.value} onChange={e => setDnsEnv(dnsEnv.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                    </div>
                  ))}
                  <Button size="sm" icon={Plus} onClick={() => setDnsEnv([...dnsEnv, { key: "", value: "", secret: true }])}>Add variable</Button>
                </div>
              </Field>
            </>
          )}
          <details className="advanced spaced" open={!!res.caServer}>
            <summary>Private ACME server</summary>
            <div className="spaced">
              <Field label="ACME directory URL" htmlFor="rs-ca" optional hint="Empty means Let's Encrypt production. Staging: https://acme-staging-v02.api.letsencrypt.org/directory">
                <input className="input mono" {...invalid("rs-ca")} value={res.caServer || ""} onChange={e => setRes({ ...res, caServer: e.target.value.trim() })} />
              </Field>
              <Field label="CA certificate (PEM)" htmlFor="rs-capem" optional hint="Only for servers signed by a private CA, like step-ca or Pebble.">
                <textarea className="input mono textarea" {...invalid("rs-capem")} rows={4} value={res.caCertPEM || ""} onChange={e => setRes({ ...res, caCertPEM: e.target.value })} spellCheck={false} />
              </Field>
            </div>
          </details>
        </form>
      </Modal>

      <Modal open={upload} onClose={() => setUpload(false)} title="Upload certificate" description="For certificates from another CA or an internal one. Traefik serves it for the domains it covers."
        footer={<>{errors._ && <span className="error foot-error">{errors._}</span>}<Button onClick={() => setUpload(false)}>Cancel</Button><Button variant="primary" busy={busy} busyLabel="Uploading" onClick={saveUpload} disabled={!up.cert || !up.key}>Upload</Button></>}>
        <form className="modal-body" onSubmit={e => { e.preventDefault(); saveUpload(); }} noValidate>
          <Field label="Name" htmlFor="up-name" optional><input className="input" {...invalid("up-name")} placeholder="Internal CA wildcard" value={up.name} onChange={e => setUp({ ...up, name: e.target.value })} /></Field>
          <Field label="Certificate (PEM)" htmlFor="up-cert" error={errors.cert} hint="Include the intermediate chain after the certificate.">
            <textarea className="input mono textarea" {...invalid("up-cert", errors.cert)} rows={5} value={up.cert} onChange={e => setUp({ ...up, cert: e.target.value })} spellCheck={false} placeholder="-----BEGIN CERTIFICATE-----" />
            <input type="file" accept=".pem,.crt,.cer" onChange={readFile("cert")} aria-label="Load certificate from a file" className="file-input" />
          </Field>
          <Field label="Private key (PEM)" htmlFor="up-key">
            <textarea className="input mono textarea" {...invalid("up-key")} rows={5} value={up.key} onChange={e => setUp({ ...up, key: e.target.value })} spellCheck={false} placeholder="-----BEGIN PRIVATE KEY-----" />
            <input type="file" accept=".pem,.key" onChange={readFile("key")} aria-label="Load key from a file" className="file-input" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} title={`Delete ${del?.label}?`} confirmLabel="Delete" danger busy={busy} onConfirm={confirmDelete} onClose={() => setDel(null)}>
        <p>{del?.kind === "resolver" ? "Routes using it must be changed first. Issued certificates stay until they expire." : "Routes using this certificate fall back to another matching one, or Traefik's default."}</p>
      </ConfirmDialog>
    </>
  );
}

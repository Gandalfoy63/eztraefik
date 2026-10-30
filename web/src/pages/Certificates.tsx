// Docs: docs/03 - Features/Certificates.md
// Resolvers (how certificates are issued), issued ACME certificates, and uploaded ones.
import { useEffect, useState, type ChangeEvent } from "react";
import { Pencil, Plus, ShieldCheck, Trash2, Upload } from "lucide-react";
import { api, ApiError, type Cert, type DomainInfo, type EnvVar, type Resolver, type Route } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows, useToast } from "../ui/feedback";
import { Combobox, Field, Segmented, StepSlider, TagInput, invalid } from "../ui/controls";
import { DNS_PROVIDERS } from "../ui/dnsProviders";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { Card, PageHeader } from "../ui/Page";
import { daysUntil, useLoad } from "../ui/hooks";
import { SortTh, useSort } from "../ui/sort";
import { PendingBanner, saveTraefik, useTraefik } from "./traefikConfig";
import { ResolverChecks } from "./ResolverChecks";

const blankResolver = (): Resolver => ({ name: "", email: "", challenge: "http", httpEntrypoint: "web", dnsProvider: "", caServer: "", caCertPEM: "" });

const PROPAGATION_STEPS = [0, 10, 30, 60, 120, 180, 300, 600, 900, 1800];
const PROVIDER_OPTIONS = DNS_PROVIDERS.map(p => ({ value: p.code, label: p.name }));
const challengeText = (r: Resolver) => (r.challenge === "dns" ? `DNS (${r.dnsProvider})` : r.challenge === "tls" ? "TLS-ALPN" : `HTTP on ${r.httpEntrypoint || "web"}`);
const certSource = (c: Cert) => (c.source === "acme" ? `${c.resolver}, ${c.issuer}` : `Uploaded${c.name ? ": " + c.name : ""}`);
const DOMAIN_RE = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
// A wildcard entry also covers the domain itself, so example.com and *.example.com together are one domain.
const domainTags = (list: DomainInfo[], resolver: string) => list.filter(d => d.explicit && d.resolver === resolver).map(d => (d.wildcard ? "*." : "") + d.name);
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const providerVars = (code?: string) => DNS_PROVIDERS.find(p => p.code === code)?.env ?? [];

export function Certificates() {
  const toast = useToast();
  const certs = useLoad(() => api.get<{ certificates: Cert[] }>("/certificates"), [], 30000);
  const traefik = useTraefik();
  const domainList = useLoad(() => api.get<{ domains: DomainInfo[] }>("/domains"), []);
  const [resDomains, setResDomains] = useState<string[]>([]);
  const [checks, setChecks] = useState<{ name: string; domains: string[] } | null>(null);
  const cfg = traefik.data?.config;
  const [resModal, setResModal] = useState<{ open: boolean; index: number }>({ open: false, index: -1 });
  const [res, setRes] = useState<Resolver>(blankResolver);
  const [dnsEnv, setDnsEnv] = useState<EnvVar[]>([]);
  const [upload, setUpload] = useState(false);
  const [up, setUp] = useState({ name: "", cert: "", key: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<{ kind: "resolver" | "cert"; id: string; label: string; match: (r: Route) => boolean } | null>(null);
  const [affected, setAffected] = useState<string[] | null>(null);

  useEffect(() => {
    if (!resModal.open || !cfg) return;
    setRes(resModal.index >= 0 ? structuredClone(cfg.resolvers[resModal.index]) : blankResolver());
    const editing = resModal.index >= 0 ? cfg.resolvers[resModal.index] : null;
    setDnsEnv(providerVars(editing?.dnsProvider).map(key => ({ key, value: "", secret: true })));
    setResDomains(editing ? domainTags(domainList.data?.domains ?? [], editing.name) : []);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resModal]);

  // Which routes a delete takes the certificate from, shown before confirming.
  useEffect(() => {
    setAffected(null);
    if (!del) return;
    api.get<{ routes: Route[] }>("/routes").then(x => setAffected(x.routes.filter(del.match).map(r => r.name))).catch(() => setAffected([]));
  }, [del]);

  // Choosing a provider opens the variables it needs, keeping what was typed for the same name.
  const setProvider = (dnsProvider: string) => {
    setRes(r => ({ ...r, dnsProvider }));
    const known = DNS_PROVIDERS.flatMap(p => p.env);
    const extras = dnsEnv.filter(v => !known.includes(v.key));
    setDnsEnv([...providerVars(dnsProvider).map(key => dnsEnv.find(v => v.key === key) ?? { key, value: "", secret: true }), ...extras]);
  };
  const setChallenge = (challenge: Resolver["challenge"]) => {
    setRes(r => ({ ...r, challenge }));
    if (challenge === "dns" && !res.dnsProvider) setProvider("cloudflare");
  };
  const isSet = (key: string) => !!cfg?.env.some(e => e.key === key);

  const saveResolver = async () => {
    const name = slug(res.name);
    const saved: Resolver = { ...res, name };
    if (res.challenge !== "dns") {
      saved.dnsProvider = "";
      saved.propagationSeconds = undefined;
    }
    const badDomain = resDomains.find(d => !DOMAIN_RE.test(d));
    if (badDomain) {
      setErrors({ domains: `${badDomain} doesn't look like a domain, for example example.com.` });
      return;
    }
    if (res.challenge !== "dns" && resDomains.some(d => d.startsWith("*."))) {
      setErrors({ domains: "A wildcard like *.example.com needs the DNS challenge." });
      return;
    }
    if (res.challenge === "dns") {
      const provider = DNS_PROVIDERS.find(p => p.code === res.dnsProvider);
      const filled = (k: string) => isSet(k) || dnsEnv.some(v => v.key === k && v.value);
      const extra = dnsEnv.some(v => !provider?.env.includes(v.key) && v.key && v.value);
      // Where the list is exact every variable is needed; elsewhere lego may list alternatives, so one is enough.
      const missing = extra ? [] : provider?.sure ? provider.env.filter(k => !filled(k)) : provider?.env.length && !provider.env.some(filled) ? provider.env : [];
      if (missing.length) {
        setErrors(Object.fromEntries(missing.map(k => ["env-" + k, provider?.sure ? "Needed for the DNS challenge." : "Fill in at least one of these."])));
        return;
      }
    }
    setBusy(true);
    setErrors({});
    const list = [...cfg!.resolvers];
    if (resModal.index >= 0) list[resModal.index] = saved;
    else list.push(saved);
    // An empty value keeps what is stored, so only typed values replace a variable.
    const typed = res.challenge === "dns" ? dnsEnv.filter(d => d.key && d.value) : [];
    const env = [...cfg!.env.filter(e => !typed.some(d => d.key === e.key)), ...typed];
    try {
      await saveTraefik({ ...cfg!, resolvers: list, env });
      // Domains are saved after the resolver they point to exists. One taken off this resolver stays as a domain, without a resolver.
      const wanted = new Map<string, boolean>();
      for (const d of resDomains) wanted.set(d.replace(/^\*\./, ""), d.startsWith("*.") || !!wanted.get(d.replace(/^\*\./, "")));
      for (const [domain, wildcard] of wanted) await api.post("/domains", { name: domain, resolver: name, wildcard });
      for (const old of domainTags(domainList.data?.domains ?? [], name)) {
        const domain = old.replace(/^\*\./, "");
        if (!wanted.has(domain)) await api.post("/domains", { name: domain, resolver: "", wildcard: false });
      }
      domainList.reload();
      setChecks({ name, domains: resDomains });
      setResModal({ open: false, index: -1 });
      traefik.reload();
    } catch (e) {
      const ae = e as ApiError;
      setErrors({ _: ae.message });
      if (resModal.index < 0 && !name) setErrors({ name: "Enter a name." });
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
        traefik.reload();
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
  const resSort = useSort((cfg?.resolvers ?? []).map((r, i) => ({ r, i })), { name: x => x.r.name, domains: x => domainTags(domainList.data?.domains ?? [], x.r.name).join(", "), challenge: x => challengeText(x.r), server: x => x.r.caServer || "Let's Encrypt" }, "name");
  const certSort = useSort(certs.data?.certificates ?? [], { domains: c => c.main, source: certSource, expires: c => daysUntil(c.notAfter) }, "domains");
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
            <thead><tr><SortTh sort={resSort} col="name">Name</SortTh><SortTh sort={resSort} col="domains">Domains</SortTh><SortTh sort={resSort} col="challenge">Challenge</SortTh><SortTh sort={resSort} col="server" className="col-optional">Server</SortTh><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{resSort.rows.map(({ r, i }) => (
              <tr key={r.name}>
                <td><button className="row-link" type="button" onClick={() => setResModal({ open: true, index: i })}>{r.name}</button></td>
                <td className="muted mono-sm">{domainTags(domainList.data?.domains ?? [], r.name).join(", ") || "Any"}</td>
                <td className="muted">{challengeText(r)}</td>
                <td className="col-optional muted mono-sm">{r.caServer || "Let's Encrypt"}</td>
                <td className="actions nowrap">
                  <button className="icon-btn" type="button" aria-label={`Edit ${r.name}`} data-tooltip="Edit" data-tooltip-side="bottom" onClick={() => setResModal({ open: true, index: i })}><Pencil className="icon-sm" aria-hidden="true" /></button>
                  <button className="icon-btn" type="button" aria-label={`Delete ${r.name}`} data-tooltip="Delete" data-tooltip-side="bottom" onClick={() => setDel({ kind: "resolver", id: r.name, label: `Resolver ${r.name}`, match: x => x.tls.resolver === r.name })}><Trash2 className="icon-sm" aria-hidden="true" /></button>
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
            <thead><tr><SortTh sort={certSort} col="domains">Domains</SortTh><SortTh sort={certSort} col="source">Source</SortTh><SortTh sort={certSort} col="expires">Expires</SortTh><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{certSort.rows.map(c => {
              const d = daysUntil(c.notAfter);
              return (
                <tr key={c.id}>
                  <td className="mono-sm">{(c.domains.length ? c.domains : [c.main]).join(", ")}</td>
                  <td className="muted">{certSource(c)}</td>
                  <td><Badge tone={d < 0 || d <= 3 ? "danger" : d <= 14 ? "warning" : "success"}>{d < 0 ? "Expired" : `${new Date(c.notAfter).toLocaleDateString()}, ${d} days`}</Badge></td>
                  <td className="actions">{c.source === "uploaded" && <button className="icon-btn" type="button" aria-label={`Delete certificate ${c.main}`} data-tooltip="Delete" data-tooltip-side="bottom" onClick={() => setDel({ kind: "cert", id: c.id, label: `Certificate ${c.main}`, match: x => x.tls.mode === "existing" && x.tls.domain === c.main && !x.tls.resolver })}><Trash2 className="icon-sm" aria-hidden="true" /></button>}</td>
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
            <Field label="Name" htmlFor="rs-name" error={errors.name} hint={resModal.index < 0 && slug(res.name) && slug(res.name) !== res.name ? <>Saved as <span className="mono">{slug(res.name)}</span>.</> : "Routes refer to it by this name."}>
              <input className="input" {...invalid("rs-name", errors.name)} placeholder="My Website" value={res.name} onChange={e => setRes({ ...res, name: e.target.value })} disabled={resModal.index >= 0} />
            </Field>
            <Field label="Email" htmlFor="rs-email" hint="For expiry notices.">
              <input className="input" type="email" {...invalid("rs-email")} value={res.email} onChange={e => setRes({ ...res, email: e.target.value })} />
            </Field>
          </div>
          <Field label="Domains" htmlFor="rs-domains" optional error={errors.domains} hint={<>Like <span className="mono">example.com</span>, or <span className="mono">*.example.com</span> for it and every subdomain (needs the DNS challenge). The certificate is requested when a route on the domain gets its first visit.</>}>
            <TagInput id="rs-domains" values={resDomains} onChange={setResDomains} placeholder="e.g. example.com" invalidMsg={errors.domains} normalize={s => s.trim().toLowerCase()} />
          </Field>
          <Field label="Challenge" hint={res.challenge === "http" ? "The CA visits http://your-domain/.well-known/... Port 80 must be reachable." : res.challenge === "tls" ? "The CA connects on port 443." : "eztraefik's Traefik creates a DNS record. Works behind firewalls and for wildcards."}>
            <Segmented label="Challenge" value={res.challenge} onChange={setChallenge} options={[{ value: "http", label: "HTTP" }, { value: "tls", label: "TLS-ALPN" }, { value: "dns", label: "DNS" }]} />
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
              <Field label="DNS Provider" htmlFor="rs-dns" hint="Pick from the list, or type any code Traefik supports.">
                <Combobox id="rs-dns" label="DNS Provider" value={res.dnsProvider || ""} onChange={v => setProvider(v.trim())} options={PROVIDER_OPTIONS} placeholder="Type to search" />
              </Field>
              {dnsEnv.map((v, i) => providerVars(res.dnsProvider).includes(v.key) ? (
                <Field key={v.key} label={<span className="mono">{v.key}</span>} htmlFor={`rs-env-${v.key}`} error={errors["env-" + v.key]}>
                  <input className="input mono" {...invalid(`rs-env-${v.key}`, errors["env-" + v.key])} type="password" autoComplete="off" placeholder={isSet(v.key) ? "Already set. Leave empty to keep it." : undefined} value={v.value} onChange={e => setDnsEnv(dnsEnv.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                </Field>
              ) : (
                <div className="ref-row field" key={i}>
                  <input className="input mono" aria-label={`Variable ${i + 1} name`} placeholder="VARIABLE_NAME" value={v.key} onChange={e => setDnsEnv(dnsEnv.map((x, j) => (j === i ? { ...x, key: e.target.value.trim() } : x)))} />
                  <input className="input mono" aria-label={`Variable ${i + 1} value`} type="password" autoComplete="off" value={v.value} onChange={e => setDnsEnv(dnsEnv.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                </div>
              ))}
              <div className="dns-foot">
              <p className="hint">{DNS_PROVIDERS.find(p => p.code === res.dnsProvider && !p.sure && p.env.length > 1) ? "This provider may accept one sign-in or another: fill in the ones your account uses. " : ""}Stored as secret variables of the Traefik container.</p>
              <Button size="sm" icon={Plus} onClick={() => setDnsEnv([...dnsEnv, { key: "", value: "", secret: true }])}>Add Variable</Button>
              </div>
            </>
          )}
          <details className="advanced spaced" open={!!res.caServer || !!res.propagationSeconds}>
            <summary>Advanced</summary>
            <div className="spaced">
              {res.challenge === "dns" && (
                <StepSlider id="rs-propagation" label="Propagation Seconds" unit="s" steps={PROPAGATION_STEPS} format={v => (v ? `${v} seconds` : "Check Right Away")}
                  hint="How long to wait after creating the DNS record before checking it. Raise it if certificates fail because your provider is slow to publish records."
                  value={res.propagationSeconds ?? 0} onChange={v => setRes({ ...res, propagationSeconds: Math.round(v) || undefined })} />
              )}
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

      {checks && <ResolverChecks name={checks.name} domains={checks.domains} onClose={() => { setChecks(null); certs.reload(); domainList.reload(); }} onApplied={traefik.reload} />}

      <ConfirmDialog open={!!del} title={`Delete ${del?.label}?`} confirmLabel="Delete" danger busy={busy} onConfirm={confirmDelete} onClose={() => setDel(null)}>
        {affected === null ? <p className="muted">Checking which routes use it...</p> : affected.length > 0 ? (
          <>
            <p>It is removed from {affected.length === 1 ? "this route" : `these ${affected.length} routes`}. The {affected.length === 1 ? "route stays" : "routes stay"} on HTTPS, with another resolver if there is one, otherwise Traefik's default certificate, which browsers warn about.</p>
            <ul className="mono-sm">{affected.map(n => <li key={n}>{n}</li>)}</ul>
          </>
        ) : <p>No route uses it.</p>}
        {del?.kind === "resolver" && <p>Issued certificates stay until they expire. Entrypoints and domains using this resolver lose it too.</p>}
      </ConfirmDialog>
    </>
  );
}

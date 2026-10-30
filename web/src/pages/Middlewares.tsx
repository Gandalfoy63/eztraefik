// Docs: docs/03 - Features/Middlewares.md
// Reference: docs/00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/overview.md
import { useEffect, useState } from "react";
import { Layers, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, ApiError, type Middleware, type RuntimeMiddleware, type SaveResult } from "../api";
import { Badge, Button, Empty, ErrorBox, SkeletonRows, statusTone, useToast } from "../ui/feedback";
import { CheckChips, Field, Segmented, SettingRow, TagInput, invalid } from "../ui/controls";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { PageHeader } from "../ui/Page";
import { useLoad } from "../ui/hooks";
import { SortTh, useSort } from "../ui/sort";

type Kind = "text" | "number" | "bool" | "list" | "kv" | "users" | "middlewares";
interface FieldDef {
  key: string;
  label: string;
  kind: Kind;
  hint?: string;
  placeholder?: string;
}
interface TypeDef {
  type: string;
  label: string;
  group: string;
  what: string;
  fields?: FieldDef[];
}

// One sentence per type, grouped by purpose. Types without fields use the JSON editor.
const TYPES: TypeDef[] = [
  { type: "basicAuth", label: "Basic auth", group: "Security", what: "Asks for a username and password before the app.", fields: [
    { key: "users", label: "Users", kind: "users", hint: "Passwords are hashed (apr1) before they are saved." },
    { key: "realm", label: "Realm", kind: "text", placeholder: "traefik" },
    { key: "removeHeader", label: "Remove the Authorization header before the app", kind: "bool" }] },
  { type: "ipAllowList", label: "IP allow list", group: "Security", what: "Only lets these IPs or ranges through.", fields: [
    { key: "sourceRange", label: "Allowed IPs or ranges", kind: "list", placeholder: "192.168.1.0/24", hint: "CIDR ranges or single IPs." }] },
  { type: "forwardAuth", label: "Forward auth", group: "Security", what: "Asks another service (Authelia, Authentik...) whether to allow the request.", fields: [
    { key: "address", label: "Auth service URL", kind: "text", placeholder: "http://authelia:9091/api/verify?rd=https://auth.example.com" },
    { key: "trustForwardHeader", label: "Trust X-Forwarded headers", kind: "bool" },
    { key: "authResponseHeaders", label: "Headers copied from the auth answer", kind: "list", placeholder: "Remote-User" }] },
  { type: "digestAuth", label: "Digest auth", group: "Security", what: "Username and password with digest hashing." },
  { type: "passTLSClientCert", label: "Pass client certificate", group: "Security", what: "Sends the client's TLS certificate info to the app." },
  { type: "redirectScheme", label: "Redirect to HTTPS", group: "Redirects and paths", what: "Sends http:// visitors to https://.", fields: [
    { key: "scheme", label: "Scheme", kind: "text", placeholder: "https" },
    { key: "port", label: "Port", kind: "text", placeholder: "443", hint: "Only when HTTPS is not on 443." },
    { key: "permanent", label: "Permanent (301)", kind: "bool" }] },
  { type: "redirectRegex", label: "Redirect with a pattern", group: "Redirects and paths", what: "Rewrites the URL with a regular expression and redirects.", fields: [
    { key: "regex", label: "Pattern", kind: "text", placeholder: "^https://www\\.(.*)" },
    { key: "replacement", label: "Replacement", kind: "text", placeholder: "https://${1}" },
    { key: "permanent", label: "Permanent (301)", kind: "bool" }] },
  { type: "stripPrefix", label: "Strip path prefix", group: "Redirects and paths", what: "Removes a path prefix before the app sees it: /app/x becomes /x.", fields: [
    { key: "prefixes", label: "Prefixes", kind: "list", placeholder: "/app" }] },
  { type: "addPrefix", label: "Add path prefix", group: "Redirects and paths", what: "Adds a prefix to every path.", fields: [{ key: "prefix", label: "Prefix", kind: "text", placeholder: "/api" }] },
  { type: "replacePath", label: "Replace path", group: "Redirects and paths", what: "Replaces the whole path.", fields: [{ key: "path", label: "New path", kind: "text", placeholder: "/" }] },
  { type: "replacePathRegex", label: "Replace path with a pattern", group: "Redirects and paths", what: "Rewrites the path with a regular expression.", fields: [
    { key: "regex", label: "Pattern", kind: "text", placeholder: "^/old/(.*)" }, { key: "replacement", label: "Replacement", kind: "text", placeholder: "/new/$1" }] },
  { type: "stripPrefixRegex", label: "Strip prefix with a pattern", group: "Redirects and paths", what: "Removes prefixes matching a regular expression.", fields: [{ key: "regex", label: "Patterns", kind: "list", placeholder: "/user/[a-z]+" }] },
  { type: "headers", label: "Headers", group: "Headers", what: "Adds or removes request and response headers, security headers and CORS.", fields: [
    { key: "customRequestHeaders", label: "Request headers sent to the app", kind: "kv", hint: "An empty value removes the header." },
    { key: "customResponseHeaders", label: "Response headers sent to the visitor", kind: "kv" },
    { key: "stsSeconds", label: "HSTS max-age (seconds)", kind: "number", placeholder: "31536000" },
    { key: "frameDeny", label: "Block embedding in frames", kind: "bool" },
    { key: "contentTypeNosniff", label: "X-Content-Type-Options: nosniff", kind: "bool" },
    { key: "accessControlAllowOriginList", label: "CORS allowed origins", kind: "list", placeholder: "https://app.example.com" }] },
  { type: "contentType", label: "Content type", group: "Headers", what: "Controls Content-Type auto-detection." },
  { type: "rateLimit", label: "Rate limit", group: "Traffic control", what: "Limits requests per client.", fields: [
    { key: "average", label: "Average requests per period", kind: "number", placeholder: "100" },
    { key: "burst", label: "Burst", kind: "number", placeholder: "50" },
    { key: "period", label: "Period", kind: "text", placeholder: "1s" }] },
  { type: "inFlightReq", label: "Concurrent requests limit", group: "Traffic control", what: "Limits requests handled at the same time.", fields: [{ key: "amount", label: "Maximum at once", kind: "number", placeholder: "10" }] },
  { type: "retry", label: "Retry", group: "Traffic control", what: "Retries failed requests on another server.", fields: [
    { key: "attempts", label: "Attempts", kind: "number", placeholder: "3" }, { key: "initialInterval", label: "Wait before retrying", kind: "text", placeholder: "100ms" }] },
  { type: "circuitBreaker", label: "Circuit breaker", group: "Traffic control", what: "Stops sending traffic to a failing service for a while.", fields: [
    { key: "expression", label: "Trip when", kind: "text", placeholder: "NetworkErrorRatio() > 0.30" }] },
  { type: "buffering", label: "Buffering", group: "Traffic control", what: "Limits request and response body sizes." },
  { type: "compress", label: "Compression", group: "Other", what: "Compresses responses (gzip, brotli, zstd).", fields: [] },
  { type: "errors", label: "Error pages", group: "Other", what: "Shows a custom page for error status codes." },
  { type: "grpcWeb", label: "gRPC-Web", group: "Other", what: "Converts gRPC-Web requests to gRPC." },
  { type: "chain", label: "Chain", group: "Other", what: "Applies several middlewares in order, under one name.", fields: [{ key: "middlewares", label: "Middlewares, in order", kind: "middlewares" }] },
];
const TCP_TYPES: TypeDef[] = [
  { type: "ipAllowList", label: "IP allow list", group: "TCP", what: "Only lets these IPs or ranges connect.", fields: [{ key: "sourceRange", label: "Allowed IPs or ranges", kind: "list", placeholder: "10.0.0.0/8" }] },
  { type: "inFlightConn", label: "Connection limit", group: "TCP", what: "Limits open connections per client IP.", fields: [{ key: "amount", label: "Maximum connections", kind: "number", placeholder: "10" }] },
];
const HUB = ["API key", "JWT", "HMAC", "OpenID Connect", "OPA", "WAF", "LDAP", "OAuth 2"];

function UsersField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const add = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<{ user: string }>("/tools/htpasswd", { username: u, password: p });
      onChange([...value.filter(x => !x.startsWith(u + ":")), r.user]);
      setU("");
      setP("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <ul className="plain-list user-list">
        {value.map(x => (
          <li key={x}><Lock className="icon-sm" aria-hidden="true" /><span className="mono">{x.split(":")[0]}</span>
            <button className="icon-btn" type="button" aria-label={`Remove ${x.split(":")[0]}`} data-tooltip="Remove" onClick={() => onChange(value.filter(y => y !== x))}><X className="icon-sm" aria-hidden="true" /></button></li>
        ))}
      </ul>
      <div className="ref-row">
        <input className="input" aria-label="New username" placeholder="Username" value={u} onChange={e => setU(e.target.value)} autoComplete="off" />
        <input className="input" aria-label="New password" placeholder="Password" type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="new-password" />
        <Button size="sm" busy={busy} onClick={add} disabled={!u || !p}>Add user</Button>
      </div>
      {err && <span className="error">{err}</span>}
    </div>
  );
}

export function KVField({ value, onChange, addLabel = "Add header" }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void; addLabel?: string }) {
  const entries = Object.entries(value);
  const update = (list: [string, string][]) => onChange(Object.fromEntries(list));
  return (
    <div className="ref-rows">
      {entries.map(([k, v], i) => (
        <div className="ref-row" key={i}>
          <input className="input mono" aria-label={`Header name ${i + 1}`} value={k} onChange={e => update(entries.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
          <input className="input mono" aria-label={`Header value ${i + 1}`} value={v} onChange={e => update(entries.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
          <button className="icon-btn" type="button" aria-label={`Remove header ${k}`} data-tooltip="Remove" onClick={() => update(entries.filter((_, j) => j !== i))}><X className="icon-sm" aria-hidden="true" /></button>
        </div>
      ))}
      <Button size="sm" icon={Plus} onClick={() => onChange({ ...value, [`X-Header-${entries.length + 1}`]: "" })}>{addLabel}</Button>
    </div>
  );
}

function MiddlewareModal({ open, onClose, editing, all, onSaved }: { open: boolean; onClose: () => void; editing: Middleware | null; all: Middleware[]; onSaved: () => void }) {
  const toast = useToast();
  const [m, setM] = useState<Middleware>({ id: "", name: "", protocol: "http", type: "", config: {} });
  const [json, setJson] = useState("{}");
  const [jsonMode, setJsonMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const base = editing ? structuredClone(editing) : { id: "", name: "", protocol: "http" as const, type: "", config: {} };
    setM(base);
    setJson(JSON.stringify(base.config, null, 2));
    setErrors({});
    const def = (base.protocol === "tcp" ? TCP_TYPES : TYPES).find(t => t.type === base.type);
    setJsonMode(!!base.type && !def?.fields);
  }, [open, editing]);
  const types = m.protocol === "tcp" ? TCP_TYPES : TYPES;
  const def = types.find(t => t.type === m.type);
  const setCfg = (k: string, v: unknown) => setM(x => {
    const config = { ...x.config };
    if (v === "" || v === undefined || (Array.isArray(v) && !v.length) || (typeof v === "object" && v && !Array.isArray(v) && !Object.keys(v).length)) delete config[k];
    else config[k] = v;
    return { ...x, config };
  });
  const save = async () => {
    let body = m;
    if (jsonMode) {
      try {
        body = { ...m, config: JSON.parse(json || "{}") };
      } catch (e) {
        setErrors({ config: "This is not valid JSON: " + (e as Error).message });
        return;
      }
    }
    setBusy(true);
    setErrors({});
    try {
      const res = await (editing ? api.put<SaveResult>(`/middlewares/${editing.id}`, body) : api.post<SaveResult>("/middlewares", body));
      toast(`Middleware ${m.name} saved.`);
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
  const groups = Array.from(new Set(types.map(t => t.group)));
  return (
    <Modal open={open} onClose={onClose} width={680} title={editing ? `Edit ${editing.name}` : "New middleware"} description="Changes requests before they reach the app. Attach it to routes in the route window."
      footer={<>{errors._ && <span className="error foot-error">{errors._}</span>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" busy={busy} busyLabel="Saving" onClick={save} disabled={!m.type}>Save middleware</Button></>}>
      <form className="modal-body" onSubmit={e => { e.preventDefault(); save(); }} noValidate>
        <div className="field-row">
          <Field label="Name" htmlFor="mw-name" error={errors.name}>
            <input className="input mono" {...invalid("mw-name", errors.name)} placeholder="e.g. office-only" value={m.name} onChange={e => setM({ ...m, name: e.target.value.toLowerCase() })} />
          </Field>
          <Field label="For">
            <Segmented label="Protocol" value={m.protocol} onChange={protocol => setM({ ...m, protocol, type: "", config: {} })} options={[{ value: "http", label: "HTTP routes" }, { value: "tcp", label: "TCP routes" }]} />
          </Field>
        </div>
        {!editing && (
          <Field label="Type" error={errors.type}>
            <div className="type-picker">
              {groups.map(g => (
                <div key={g} className="type-group">
                  <div className="spec-label">{g}</div>
                  <div className="type-grid">
                    {types.filter(t => t.group === g).map(t => (
                      <label key={t.type} className="choice compact">
                        <input type="radio" name="mw-type" checked={m.type === t.type} onChange={() => { setM({ ...m, type: t.type, config: {} }); setJson("{}"); setJsonMode(!t.fields); }} />
                        <span><span className="title">{t.label}</span><br /><span className="sub">{t.what}</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {m.protocol === "http" && <p className="hint">Need Traefik Hub, not available on Traefik Proxy: {HUB.join(", ")}.</p>}
            </div>
          </Field>
        )}
        {def && (
          <div className="form-section">
            <div className="section-head">
              <h3>{def.label} <span className="mono muted">{def.type}</span></h3>
              {def.fields && <Button size="sm" variant="ghost" onClick={() => { if (!jsonMode) setJson(JSON.stringify(m.config, null, 2)); else { try { setM({ ...m, config: JSON.parse(json) }); } catch { /* keep */ } } setJsonMode(!jsonMode); }}>{jsonMode ? "Use the form" : "Edit as JSON"}</Button>}
            </div>
            {jsonMode ? (
              <Field label="Options (JSON)" htmlFor="mw-json" error={errors.config} hint="Same keys as Traefik's dynamic configuration for this middleware.">
                <textarea className="input mono textarea" {...invalid("mw-json", errors.config)} rows={10} value={json} onChange={e => setJson(e.target.value)} spellCheck={false} />
              </Field>
            ) : def.fields!.length === 0 ? (
              <p className="muted">No options needed.</p>
            ) : (
              <>
                {errors.config && <span className="error">{errors.config}</span>}
                {def.fields!.map(f => {
                  const v = m.config[f.key];
                  const id = `mw-${f.key}`;
                  switch (f.kind) {
                    case "bool":
                      return <SettingRow key={f.key} title={f.label} checked={!!v} onChange={b => setCfg(f.key, b || undefined)} />;
                    case "list":
                      return <Field key={f.key} label={f.label} htmlFor={id} hint={f.hint}><TagInput id={id} values={(v as string[]) ?? []} onChange={x => setCfg(f.key, x)} placeholder={f.placeholder} /></Field>;
                    case "kv":
                      return <Field key={f.key} label={f.label} hint={f.hint}><KVField value={(v as Record<string, string>) ?? {}} onChange={x => setCfg(f.key, x)} /></Field>;
                    case "users":
                      return <Field key={f.key} label={f.label} hint={f.hint}><UsersField value={(v as string[]) ?? []} onChange={x => setCfg(f.key, x)} /></Field>;
                    case "middlewares":
                      return <Field key={f.key} label={f.label}><CheckChips label={f.label} values={(v as string[]) ?? []} onChange={x => setCfg(f.key, x)} options={all.filter(x => x.protocol === m.protocol && x.name !== m.name).map(x => ({ value: x.name, label: x.name }))} /></Field>;
                    case "number":
                      return <Field key={f.key} label={f.label} htmlFor={id} hint={f.hint}><input className="input mono" {...invalid(id)} inputMode="numeric" placeholder={f.placeholder} value={(v as number) ?? ""} onChange={e => setCfg(f.key, e.target.value === "" ? undefined : +e.target.value.replace(/[^\d.]/g, ""))} /></Field>;
                    default:
                      return <Field key={f.key} label={f.label} htmlFor={id} hint={f.hint}><input className="input mono" {...invalid(id)} placeholder={f.placeholder} value={(v as string) ?? ""} onChange={e => setCfg(f.key, e.target.value)} /></Field>;
                  }
                })}
              </>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}

export function Middlewares() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get<{ middlewares: Middleware[]; runtime: RuntimeMiddleware[]; traefikReachable: boolean }>("/middlewares"), [], 15000);
  const [modal, setModal] = useState<{ open: boolean; editing: Middleware | null }>({ open: false, editing: null });
  const [toDelete, setToDelete] = useState<Middleware | null>(null);
  const [busy, setBusy] = useState(false);
  const action = <button className="btn btn-primary" type="button" onClick={() => setModal({ open: true, editing: null })}><Plus aria-hidden="true" />New middleware</button>;
  const rt = (name: string) => data?.runtime.find(r => r.name === name && r.provider === "file");
  const label = (m: Middleware) => [...TYPES, ...TCP_TYPES].find(t => t.type === m.type)?.label ?? m.type;
  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.del(`/middlewares/${toDelete.id}`);
      toast(`Middleware ${toDelete.name} deleted.`);
      setToDelete(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const external = data?.runtime.filter(r => r.provider !== "file") ?? [];
  const usedBy = (m: Middleware) => rt(m.name)?.usedBy?.map(u => u.replace(/@.*/, "")).join(", ");
  const statusText = (m: Middleware) => { const r = rt(m.name); return r ? (r.errors?.length ? "Error" : r.status) : "Unknown"; };
  const sort = useSort(data?.middlewares ?? [], { name: m => m.name, type: label, used: usedBy, status: statusText }, "name");
  const extSort = useSort(external, { name: r => r.name, type: r => r.type, status: r => r.status }, "name");
  return (
    <>
      <PageHeader title="Middlewares" description="Auth, redirects, headers and limits applied to routes." action={action} />
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      <section className="card">
        {loading && !data ? <div className="card-body"><SkeletonRows /></div> : !data?.middlewares.length ? (
          <Empty icon={Layers} title="No middlewares yet" action={action}>Middlewares change requests before they reach a service, for example to add a password or allow only your IPs.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><SortTh sort={sort} col="name">Name</SortTh><SortTh sort={sort} col="type">Type</SortTh><SortTh sort={sort} col="used" className="col-optional">Used by</SortTh><SortTh sort={sort} col="status">Status</SortTh><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {sort.rows.map(m => {
                  const r = rt(m.name);
                  return (
                    <tr key={m.id}>
                      <td><button className="row-link" type="button" onClick={() => setModal({ open: true, editing: m })}>{m.name}</button> <Badge tone="accent" dot={false} mono>{m.protocol.toUpperCase()}</Badge></td>
                      <td className="muted">{label(m)}</td>
                      <td className="col-optional muted">{r?.usedBy?.map(u => u.replace(/@.*/, "")).join(", ") || "No route yet"}</td>
                      <td><span title={r?.errors?.join("\n")}><Badge tone={r ? statusTone(r.status, r.errors) : "neutral"}>{r ? (r.errors?.length ? "Error" : r.status) : "Unknown"}</Badge></span></td>
                      <td className="actions nowrap">
                        <button className="icon-btn" type="button" aria-label={`Edit ${m.name}`} data-tooltip="Edit" data-tooltip-side="bottom" onClick={() => setModal({ open: true, editing: m })}><Pencil className="icon-sm" aria-hidden="true" /></button>
                        <button className="icon-btn" type="button" aria-label={`Delete ${m.name}`} data-tooltip="Delete" data-tooltip-side="bottom" onClick={() => setToDelete(m)}><Trash2 className="icon-sm" aria-hidden="true" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {external.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>From other providers</h2><span className="hint">Read-only, for example from Docker labels.</span></div>
          <div className="table-wrap"><table><thead><tr><SortTh sort={extSort} col="name">Name</SortTh><SortTh sort={extSort} col="type">Type</SortTh><SortTh sort={extSort} col="status">Status</SortTh></tr></thead><tbody>
            {extSort.rows.map(r => <tr key={r.name + r.provider}><td><span className="row-text">{r.name}</span> <Badge dot={false} mono>{r.provider}</Badge></td><td className="muted">{r.type}</td><td><Badge tone={statusTone(r.status, r.errors)}>{r.status}</Badge></td></tr>)}
          </tbody></table></div>
        </section>
      )}
      <MiddlewareModal open={modal.open} editing={modal.editing} all={data?.middlewares ?? []} onClose={() => setModal(m => ({ ...m, open: false }))} onSaved={reload} />
      <ConfirmDialog open={!!toDelete} title={`Delete middleware ${toDelete?.name}?`} confirmLabel="Delete middleware" danger busy={busy} onConfirm={remove} onClose={() => setToDelete(null)}>
        <p>eztraefik blocks this while a route still uses it.</p>
      </ConfirmDialog>
    </>
  );
}

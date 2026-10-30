// Docs: docs/03 - Features/Routes.md
// New / edit route window. Tabs: Common (name, domain, forwarding to, more options) and Certificates.
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Container, Network, Server } from "lucide-react";
import { api, ApiError, type Cert, type ContainerInfo, type Middleware, type Protocol, type Route, type Service, type TraefikConfig, type SaveResult } from "../api";
import { Button, useToast } from "../ui/feedback";
import { CheckChips, Field, Segmented, SettingRow, TagInput, invalid } from "../ui/controls";
import { Modal, TabPanel, Tabs } from "../ui/Modal";
import { covers } from "../ui/certs";
import { RouteSettingsPanel, SETTING_FIELDS, settingsCount } from "./RouteSettings";

const emptyRoute = (): Route => ({
  id: "", name: "", protocol: "http", hosts: [], pathPrefix: "", rawRule: "", entrypoints: [],
  target: { kind: "docker", container: "", address: "", port: undefined, scheme: "http" },
  middlewares: [], tls: { enabled: true, mode: "resolver", resolver: "", domain: "", redirect: true }, priority: 0, enabled: true,
});

interface Ctx {
  containers: ContainerInfo[];
  certs: Cert[];
  traefik: TraefikConfig;
  services: Service[];
  middlewares: Middleware[];
}

const FIELD_TAB: Record<string, string> = { ...Object.fromEntries(SETTING_FIELDS.map(f => [f, "common"])), name: "common", hosts: "common", target: "common", port: "common", pathPrefix: "common", entrypoints: "common", middlewares: "common", tls: "certs" };

export function RouteModal({ open, onClose, editing, prefillHost, prefillContainer, prefillPort, onSaved }: { open: boolean; onClose: () => void; editing: Route | null; prefillHost?: string; prefillContainer?: string; prefillPort?: number; onSaved: () => void }) {
  const toast = useToast();
  const [r, setR] = useState<Route>(emptyRoute);
  const [tab, setTab] = useState("common");
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [ctxError, setCtxError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [yaml, setYaml] = useState("");
  const [more, setMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = editing ? structuredClone(editing) : emptyRoute();
    if (!editing && prefillHost) base.hosts = [prefillHost];
    if (!editing && prefillContainer) {
      base.target = { ...base.target, kind: "docker", container: prefillContainer, port: prefillPort };
      base.name = prefillContainer.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    }
    setR(base);
    setTab("common");
    setErrors({});
    setMore(!!editing && (editing.protocol !== "http" || !!editing.pathPrefix || editing.middlewares.length > 0 || !!editing.rawRule));
    setShowSettings(settingsCount(editing?.settings) > 0);
    setCtxError(null);
    Promise.all([
      api.get<{ containers: ContainerInfo[] }>("/docker/containers").catch(() => ({ containers: [] })),
      api.get<{ certificates: Cert[] }>("/certificates"),
      api.get<{ config: TraefikConfig }>("/traefik"),
      api.get<{ services: Service[] }>("/services"),
      api.get<{ middlewares: Middleware[] }>("/middlewares"),
    ])
      .then(([c, ce, t, s, m]) => setCtx({ containers: c.containers.filter(x => x.role !== "traefik"), certs: ce.certificates, traefik: t.config, services: s.services, middlewares: m.middlewares }))
      .catch(e => setCtxError(e.message));
  }, [open, editing, prefillHost, prefillContainer, prefillPort]);

  const set = (patch: Partial<Route>) => setR(x => ({ ...x, ...patch }));
  const setTarget = (patch: Partial<Route["target"]>) => setR(x => ({ ...x, target: { ...x.target, ...patch } }));
  const setTLS = (patch: Partial<Route["tls"]>) => setR(x => ({ ...x, tls: { ...x.tls, ...patch } }));

  // Live generated config, debounced.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      api.post<{ yaml: string }>("/routes/preview", r).then(x => setYaml(x.yaml)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [r, open]);

  const resolvers = ctx?.traefik.resolvers ?? [];
  const eps = (ctx?.traefik.entrypoints ?? []).filter(e => (r.protocol === "udp") === (e.protocol === "udp"));
  const matching = useMemo(() => {
    if (!ctx || !r.hosts.length) return [];
    // A certificate a resolver already issued for exactly these hosts belongs to that resolver's option, not a separate choice.
    return ctx.certs.filter(c => r.hosts.every(h => (c.domains.length ? c.domains : [c.main]).some(n => covers(n, h))) && !(c.source === "acme" && r.hosts.includes(c.main)));
  }, [ctx, r.hosts]);
  const issued = (resolver: string) => ctx?.certs.find(c => c.source === "acme" && c.resolver === resolver && r.hosts.includes(c.main));
  const otherCount = (ctx?.certs.length ?? 0) - matching.length;
  const container = ctx?.containers.find(c => c.name === r.target.container);

  const certChoice = r.tls.mode === "existing" ? "existing:" + r.tls.domain : r.tls.mode === "passthrough" ? "passthrough" : "resolver:" + (r.tls.resolver || resolvers[0]?.name || "");

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = await (editing ? api.put<SaveResult>(`/routes/${editing.id}`, r) : api.post<SaveResult>("/routes", r));
      toast(`Route ${r.name} ${editing ? "saved" : "created"}.`);
      if (res.warnings?.length) toast(res.warnings.join(" "), "warning");
      onSaved();
      onClose();
    } catch (e) {
      const ae = e as ApiError;
      const field = ae.field || "";
      setErrors({ [field || "_"]: ae.message });
      if (FIELD_TAB[field]) setTab(FIELD_TAB[field]);
      if (["pathPrefix", "entrypoints", "middlewares"].includes(field)) setMore(true);
      if (SETTING_FIELDS.includes(field)) setShowSettings(true);
    } finally {
      setBusy(false);
    }
  };

  const tabErr = (t: string) => Object.keys(errors).some(k => FIELD_TAB[k] === t);
  const targetError = errors.target || errors.port;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.name}` : "New route"}
      description="Send a domain to a container or an address on your network."
      footer={
        <>
          {errors._ && <span className="error foot-error">{errors._}</span>}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" busy={busy} busyLabel={editing ? "Saving" : "Creating"} onClick={save} disabled={!ctx}>
            {editing ? "Save route" : "Create route"}
          </Button>
        </>
      }
    >
      <Tabs
        label="Route settings"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "common", label: "Common", hasError: tabErr("common") },
          { id: "certs", label: "Certificates", hasError: tabErr("certs") },
        ]}
      />
      <form className="modal-body" onSubmit={e => { e.preventDefault(); save(); }} noValidate>
        {ctxError && <p className="error">Could not load containers and certificates: {ctxError}</p>}
        <TabPanel id="common" active={tab}>
          <Field label="Name" htmlFor="rt-name" error={errors.name} hint="Lowercase letters, numbers and dashes.">
            <input className="input mono" {...invalid("rt-name", errors.name)} placeholder="e.g. grafana" autoComplete="off" value={r.name} onChange={e => set({ name: e.target.value.toLowerCase() })} />
          </Field>
          {r.protocol !== "udp" && (
            <Field label={r.protocol === "tcp" ? "Domain (TLS SNI)" : "Domain"} htmlFor="rt-hosts" error={errors.hosts}
              hint={r.protocol === "tcp" ? "Leave empty to accept every connection on the port." : "Its DNS record must point to this server. Add several with Enter."}>
              <TagInput id="rt-hosts" values={r.hosts} onChange={hosts => set({ hosts })} placeholder="e.g. grafana.example.com" invalidMsg={errors.hosts} normalize={s => s.trim().toLowerCase()} />
            </Field>
          )}

          <fieldset className="field">
            <legend className="label">Forwarding to</legend>
            <Segmented
              label="Destination type"
              value={r.target.kind}
              onChange={kind => setTarget({ kind })}
              options={[
                { value: "docker", label: "Docker container", icon: Container },
                { value: "ip", label: "IP address", icon: Network },
                ...(ctx?.services.some(s => s.protocol === r.protocol) ? [{ value: "service" as const, label: "Service", icon: Server }] : []),
              ]}
            />
            {r.target.kind === "service" ? (
              <select className="select" {...invalid("rt-service", errors.target)} value={r.target.service || ""} onChange={e => setTarget({ service: e.target.value })} aria-label="Service">
                <option value="">Choose a service</option>
                {ctx?.services.filter(s => s.protocol === r.protocol).map(s => <option key={s.id} value={s.name}>{s.name} ({s.kind})</option>)}
              </select>
            ) : (
              <div className="target-row">
                <div className="target-host">
                  {r.target.kind === "docker" ? (
                    <select
                      className="select"
                      {...invalid("rt-container", errors.target)}
                      aria-label="Container"
                      value={r.target.container || ""}
                      onChange={e => {
                        const c = ctx?.containers.find(x => x.name === e.target.value);
                        setTarget({ container: e.target.value, port: r.target.port || c?.exposedPorts[0] });
                      }}
                    >
                      <option value="">{ctx ? (ctx.containers.length ? "Choose a container" : "No containers found") : "Loading containers"}</option>
                      {ctx?.containers.map(c => (
                        <option key={c.id} value={c.name}>{c.name}{c.state !== "running" ? ` (${c.state})` : ""}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="input mono" {...invalid("rt-ip", errors.target)} aria-label="IP address or hostname" placeholder="e.g. 192.168.1.20" autoComplete="off" value={r.target.address || ""} onChange={e => setTarget({ address: e.target.value.trim() })} />
                  )}
                </div>
                <span className="target-sep mono" aria-hidden="true">:</span>
                <div className="target-port">
                  <input className="input mono" {...invalid("rt-port", errors.port)} aria-label="Port" placeholder="Port" inputMode="numeric" value={r.target.port ?? ""} onChange={e => setTarget({ port: e.target.value ? +e.target.value.replace(/\D/g, "") : undefined })} list="rt-ports" />
                  {container && <datalist id="rt-ports">{container.exposedPorts.map(p => <option key={p} value={p} />)}</datalist>}
                </div>
              </div>
            )}
            {targetError ? (
              <span className="error">{targetError}</span>
            ) : (
              <span className="hint">
                {r.target.kind === "docker"
                  ? container && !container.reachable
                    ? `${container.name} is not on the Traefik network yet. eztraefik connects it when you save.`
                    : "Traefik reaches the container on the shared Docker network."
                  : r.target.kind === "ip"
                    ? "Any address Traefik can reach, on your network or outside it."
                    : "A service with several servers or a traffic split, from the Services page."}
              </span>
            )}
          </fieldset>

          <details className="advanced more-options" open={more} onToggle={e => setMore((e.target as HTMLDetailsElement).open)}>
            <summary><ChevronRight aria-hidden="true" />More options: protocol, ports, path, middlewares</summary>
            <div className="more-body">
              <Field label="Protocol" htmlFor="rt-proto">
                <Segmented<Protocol>
                  label="Protocol"
                  value={r.protocol}
                  onChange={protocol => set({ protocol, entrypoints: [], middlewares: [], tls: { ...r.tls, mode: "resolver", enabled: protocol !== "udp" && r.tls.enabled } })}
                  options={[{ value: "http", label: "HTTP" }, { value: "tcp", label: "TCP" }, { value: "udp", label: "UDP" }]}
                />
              </Field>
              <Field label="Entrypoints (ports)" error={errors.entrypoints} hint={r.protocol === "http" ? "Empty picks websecure with HTTPS, web without." : "Pick the port this route listens on. Add ports in Entrypoints."}>
                {eps.length ? (
                  <CheckChips label="Entrypoints" values={r.entrypoints} onChange={entrypoints => set({ entrypoints })}
                    options={eps.map(e => ({ value: e.name, label: <>{e.name} <span className="mono">:{e.hostPort || e.port}{e.protocol === "udp" ? "/udp" : ""}</span></> }))} />
                ) : (
                  <p className="hint">No {r.protocol === "udp" ? "UDP" : "TCP"} entrypoint yet. <a href="#entrypoints">Add one in Entrypoints.</a></p>
                )}
              </Field>
              {r.protocol === "http" && (
                <>
                  <Field label="Path prefix" htmlFor="rt-path" error={errors.pathPrefix} optional hint="Only requests starting with this path, for example /api.">
                    <input className="input mono" {...invalid("rt-path", errors.pathPrefix)} placeholder="/" value={r.pathPrefix || ""} onChange={e => set({ pathPrefix: e.target.value })} />
                  </Field>
                  {r.target.kind !== "service" && (
                    <SettingRow title="The app itself uses HTTPS" description="Traefik connects to it with https://." checked={r.target.scheme === "https"} onChange={v => setTarget({ scheme: v ? "https" : "http" })} />
                  )}
                </>
              )}
              {r.protocol !== "udp" && (
                <Field label="Middlewares" error={errors.middlewares} hint="Applied in this order. Create them on the Middlewares page." optional>
                  {(ctx?.middlewares.filter(m => m.protocol === r.protocol).length ?? 0) > 0 ? (
                    <CheckChips label="Middlewares" values={r.middlewares} onChange={middlewares => set({ middlewares })}
                      options={ctx!.middlewares.filter(m => m.protocol === r.protocol).map(m => ({ value: m.name, label: <>{m.name} <span className="mono">{m.type}</span></> }))} />
                  ) : (
                    <p className="hint">None yet. <a href="#middlewares">Create one</a>.</p>
                  )}
                </Field>
              )}
              {r.protocol !== "udp" && (
                <Field label="Custom rule" htmlFor="rt-rule" optional hint="Replaces the rule built from domain and path. Traefik rule syntax.">
                  <input className="input mono" {...invalid("rt-rule")} placeholder="Host(`a.example.com`) && Header(`X-Env`, `beta`)" value={r.rawRule || ""} onChange={e => set({ rawRule: e.target.value })} />
                </Field>
              )}
              {r.protocol !== "udp" && (
                <Field label="Priority" htmlFor="rt-prio" optional hint="Higher wins when two rules match. Empty means automatic (longer rules win).">
                  <input className="input mono" {...invalid("rt-prio")} inputMode="numeric" value={r.priority || ""} onChange={e => set({ priority: +e.target.value.replace(/\D/g, "") || 0 })} style={{ maxWidth: 140 }} />
                </Field>
              )}
            </div>
          </details>

          {r.protocol === "http" && (
            <details className="advanced more-options" open={showSettings} onToggle={e => setShowSettings((e.target as HTMLDetailsElement).open)}>
              <summary>
                <ChevronRight aria-hidden="true" />Route Settings: Uploads, Timeouts, Headers, Access
                {settingsCount(r.settings) > 0 && <span className="badge is-accent">{settingsCount(r.settings)} on</span>}
              </summary>
              <div className="more-body">
                <RouteSettingsPanel value={r.settings ?? {}} onChange={settings => set({ settings })} forwards={r.target.kind !== "service"} errors={errors} />
              </div>
            </details>
          )}
        </TabPanel>

        <TabPanel id="certs" active={tab}>
          {r.protocol === "udp" ? (
            <p className="muted">UDP routes don't use TLS.</p>
          ) : (
            <>
              <SettingRow title="Serve over HTTPS" description={r.protocol === "tcp" ? "Traefik terminates TLS, or passes it through to the app." : "Recommended for anything reachable from the internet."} checked={r.tls.enabled} onChange={enabled => setTLS({ enabled })} />
              <fieldset className="cert-fieldset" disabled={!r.tls.enabled}>
                <legend className="label">Certificate</legend>
                <div className="cert-list">
                  {matching.map(c => {
                    const value = "existing:" + c.main;
                    const days = Math.floor((Date.parse(c.notAfter) - Date.now()) / 86400000);
                    return (
                      <label className="choice" key={c.id}>
                        <input type="radio" name="cert" checked={certChoice === value} onChange={() => setTLS({ mode: "existing", domain: c.main, resolver: c.resolver || "" })} />
                        <span className="grow">
                          <span className="title mono">{c.domains.join(", ") || c.main}</span>
                          {days <= 14 ? <span className="badge is-warning">Expires in {days} days</span> : <span className="badge is-success">Covers this domain</span>}
                          <br />
                          <span className="sub">{c.source === "acme" ? `Issued by ${c.issuer} (${c.resolver})` : `Uploaded${c.name ? ": " + c.name : ""}`}, expires {new Date(c.notAfter).toLocaleDateString()}</span>
                        </span>
                      </label>
                    );
                  })}
                  {resolvers.map(res => (
                    <label className="choice" key={res.name}>
                      <input type="radio" name="cert" checked={certChoice === "resolver:" + res.name} onChange={() => setTLS({ mode: "resolver", resolver: res.name, domain: "" })} />
                      <span className="grow">
                        {issued(res.name) ? (
                          <>
                            <span className="title">Keep using the issued certificate{resolvers.length > 1 ? ` from ${res.name}` : ""}</span> <span className="badge is-success">Issued</span>
                            <br />
                            <span className="sub">Renewed automatically, expires {new Date(issued(res.name)!.notAfter).toLocaleDateString()}.</span>
                          </>
                        ) : (
                          <>
                            <span className="title">Generate a new certificate{resolvers.length > 1 ? ` with ${res.name}` : ""}</span>
                            <br />
                            <span className="sub">
                              {res.caServer ? `ACME server ${res.caServer}` : "Let's Encrypt"} issues one{r.hosts[0] ? <> for <span className="mono">{r.hosts.join(", ")}</span></> : ""} on the first visit, usually in under a minute.
                            </span>
                          </>
                        )}
                      </span>
                    </label>
                  ))}
                  {r.protocol === "tcp" && (
                    <label className="choice">
                      <input type="radio" name="cert" checked={certChoice === "passthrough"} onChange={() => setTLS({ mode: "passthrough" })} />
                      <span className="grow"><span className="title">Pass TLS through</span><br /><span className="sub">The app terminates TLS itself. Traefik only reads the SNI name.</span></span>
                    </label>
                  )}
                  {!resolvers.length && !matching.length && r.protocol === "http" && (
                    <p className="hint">No certificate resolver yet. <a href="#certificates">Add Let's Encrypt on the Certificates page</a>, or Traefik serves its default self-signed certificate.</p>
                  )}
                </div>
                {errors.tls && <span className="error">{errors.tls}</span>}
                <p className="hint cert-other">
                  {!r.hosts.length ? "Enter a domain in Common to see the certificates that cover it." : otherCount > 0 ? `${otherCount} other certificate${otherCount > 1 ? "s" : ""} on this host ${otherCount > 1 ? "don't" : "doesn't"} cover this domain.` : ""}
                </p>
              </fieldset>
              {r.protocol === "http" && (
                <SettingRow title="Redirect HTTP to HTTPS" description={<>Visitors on <span className="mono">http://</span> are sent to <span className="mono">https://</span>.</>} checked={r.tls.redirect} onChange={redirect => setTLS({ redirect })} disabled={!r.tls.enabled} />
              )}
            </>
          )}
        </TabPanel>

        <details className="advanced config-details">
          <summary><ChevronRight aria-hidden="true" />Generated config</summary>
          <pre className="code-block" aria-live="polite">{yaml}</pre>
        </details>
      </form>
    </Modal>
  );
}

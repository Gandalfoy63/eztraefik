// Docs: docs/03 - Features/Import from NPM.md
// Import from Nginx Proxy Manager: connect, review what each host becomes, import, then switch traffic (and back).
import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, CircleCheck, Import, KeyRound, PlugZap, TriangleAlert, Undo2 } from "lucide-react";
import { api, ApiError } from "../api";
import { Badge, Button, ErrorBox, SkeletonRows, useToast } from "../ui/feedback";
import { Field, invalid } from "../ui/controls";
import { ConfirmDialog } from "../ui/Modal";
import { Card, PageHeader } from "../ui/Page";
import { shortTime, useLoad } from "../ui/hooks";

interface Item {
  id: string;
  kind: "proxy" | "location" | "redirect" | "stream" | "notfound";
  source: string;
  action: "import" | "skip";
  reason?: string;
  name?: string;
  target?: string;
  tls?: string;
  notes: string[];
  passwords?: string[];
}
interface Plan {
  items: Item[];
  resolver?: { name: string; email: string; challenge: string };
  resolverName?: string;
  warnings: string[];
}
interface Detected {
  name: string;
  image: string;
  state: string;
  httpPort: number;
  httpsPort: number;
  adminPort: number;
  suggestedUrl: string;
}
interface Migration {
  source: string;
  npmContainer: string;
  importedAt: string;
  imported: number;
  switchedAt?: string;
  streamPorts: Record<string, number>;
}
interface Status {
  detected: Detected[];
  migration?: Migration;
  connected: boolean;
  url: string;
  plan?: Plan;
}

const KIND: Record<Item["kind"], string> = { proxy: "Proxy host", location: "Location", redirect: "Redirection", stream: "Stream", notfound: "404 host" };

export function ImportNPM() {
  const toast = useToast();
  const status = useLoad(() => api.get<Status>("/migrate/npm"));
  const s = status.data;
  const npmHere = s?.detected[0];
  const [conn, setConn] = useState({ url: "", email: "", password: "", code: "", challenge: "", container: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ imported: number; failed: { ID: string; Source: string; Error: string }[] | null; warnings: string[] | null } | null>(null);
  const [confirm, setConfirm] = useState<"" | "switch" | "back">("");

  useEffect(() => {
    if (!s) return;
    setConn(c => ({ ...c, url: c.url || npmHere?.suggestedUrl || "", container: npmHere?.name || "" }));
    if (s.plan && !plan) applyPlan(s.plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  const applyPlan = (p: Plan) => {
    setPlan(p);
    setSelected(sel => {
      const importable = p.items.filter(i => i.action === "import").map(i => i.id);
      // Keep the user's choices across re-plans; new importable items start selected.
      return sel.size ? new Set(importable.filter(id => sel.has(id) || !plan?.items.some(o => o.id === id && o.action === "import"))) : new Set(importable);
    });
  };

  const connect = async () => {
    setBusy("connect");
    setErrors({});
    try {
      const r = await api.post<{ needs2fa?: boolean; challenge?: string; plan?: Plan; version?: string; warnings?: string[] }>("/migrate/npm/connect", conn);
      if (r.needs2fa) {
        setConn(c => ({ ...c, challenge: r.challenge || "" }));
        setErrors({ code: "" });
      } else if (r.plan) {
        setPlan(null);
        setSelected(new Set());
        applyPlan(r.plan);
        toast(`Read the configuration of NPM ${r.version}.`);
        r.warnings?.forEach(w => toast(w, "warning"));
        setConn(c => ({ ...c, password: "", code: "", challenge: "" }));
      }
    } catch (e) {
      const ae = e as ApiError;
      setErrors({ [ae.field || "_"]: ae.message });
    } finally {
      setBusy("");
    }
  };

  const replan = async () => {
    setBusy("plan");
    try {
      const r = await api.post<{ plan: Plan }>("/migrate/npm/plan", { passwords, resolverEmail: email });
      applyPlan(r.plan);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  };

  const doImport = async () => {
    setBusy("import");
    try {
      const r = await api.post<NonNullable<typeof result>>("/migrate/npm/import", { items: [...selected], passwords, resolverEmail: email });
      setResult(r);
      toast(`Imported ${r.imported} item${r.imported === 1 ? "" : "s"} from NPM.`);
      if (r.warnings?.length) toast(r.warnings.join(" "), "warning");
      const st = await api.post<{ plan: Plan }>("/migrate/npm/plan", { passwords, resolverEmail: email });
      setPlan(st.plan);
      setSelected(new Set());
      status.reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  };

  const doSwitch = async (back: boolean) => {
    setBusy(back ? "back" : "switch");
    try {
      await api.post(back ? "/migrate/npm/switch-back" : "/migrate/npm/switch");
      toast(back ? "NPM is serving traffic again." : "Traefik now serves the traffic NPM used to.");
      setConfirm("");
      status.reload();
    } catch (e) {
      toast((e as Error).message, "error");
      setConfirm("");
      status.reload();
    } finally {
      setBusy("");
    }
  };

  const needPasswords = useMemo(() => Array.from(new Set(plan?.items.flatMap(i => i.passwords ?? []) ?? [])), [plan]);
  const needEmail = !!plan?.items.some(i => i.reason?.includes("no email is known"));
  const importable = plan?.items.filter(i => i.action === "import") ?? [];
  const counts = plan ? { import: importable.length, skip: plan.items.length - importable.length } : null;
  const m = s?.migration;

  return (
    <>
      <PageHeader title="Import from Nginx Proxy Manager" description="Read your NPM hosts, review what each one becomes, import them, then move NPM's ports to Traefik. NPM is never changed or deleted." />
      {status.error && !s && <ErrorBox message={status.error} onRetry={status.reload} />}

      <Card title={<h2><span className="step-num">1</span>Connect to NPM</h2>}>
        {!s ? <SkeletonRows rows={3} /> : (
          <form onSubmit={e => { e.preventDefault(); connect(); }} noValidate className="narrow-form wide">
            {npmHere ? (
              <p className="hint spaced-bottom">
                Found <span className="mono">{npmHere.name}</span> on this host ({npmHere.state}), publishing {[npmHere.httpPort && `HTTP ${npmHere.httpPort}`, npmHere.httpsPort && `HTTPS ${npmHere.httpsPort}`, npmHere.adminPort && `admin ${npmHere.adminPort}`].filter(Boolean).join(", ")}.
                Access list passwords are copied from it, and traffic can be switched over at the end.
              </p>
            ) : (
              <p className="hint spaced-bottom">No NPM container on this Docker host. You can still import from an NPM elsewhere; the switch-over then happens on that machine.</p>
            )}
            <Field label="NPM admin address" htmlFor="npm-url" error={errors.url} hint="The address you open NPM's admin panel on, usually port 81.">
              <input className="input mono" {...invalid("npm-url", errors.url)} placeholder="http://192.0.2.10:81" value={conn.url} onChange={e => setConn({ ...conn, url: e.target.value.trim() })} />
            </Field>
            {!conn.challenge ? (
              <div className="field-row">
                <Field label="NPM email" htmlFor="npm-email">
                  <input className="input" type="email" autoComplete="off" {...invalid("npm-email")} value={conn.email} onChange={e => setConn({ ...conn, email: e.target.value })} />
                </Field>
                <Field label="NPM password" htmlFor="npm-pass" error={errors.password} hint="Used once to read the config, not stored.">
                  <input className="input" type="password" autoComplete="off" {...invalid("npm-pass", errors.password)} value={conn.password} onChange={e => setConn({ ...conn, password: e.target.value })} />
                </Field>
              </div>
            ) : (
              <Field label="Two-factor code" htmlFor="npm-code" error={errors.code || null} hint="Your NPM account uses two-factor authentication. Enter the code from your app.">
                <input className="input mono" inputMode="numeric" autoComplete="one-time-code" {...invalid("npm-code", errors.code)} value={conn.code} onChange={e => setConn({ ...conn, code: e.target.value.replace(/\s/g, "") })} style={{ maxWidth: 200 }} />
              </Field>
            )}
            {errors._ && <span className="error">{errors._}</span>}
            <div className="form-actions start">
              <Button variant="primary" type="submit" icon={PlugZap} busy={busy === "connect"} busyLabel="Reading NPM" disabled={!conn.url || (!conn.challenge && (!conn.email || !conn.password))}>
                {conn.challenge ? "Verify and read" : plan ? "Read again" : "Read configuration"}
              </Button>
              {s.connected && <span className="hint">Connected to {s.url}</span>}
            </div>
          </form>
        )}
      </Card>

      {plan && (
        <section className="card">
          <div className="card-head">
            <h2><span className="step-num">2</span>Review</h2>
            <div className="card-actions">
              <Badge tone="success">{counts!.import} can be imported</Badge>
              {counts!.skip > 0 && <Badge>{counts!.skip} skipped</Badge>}
            </div>
          </div>
          {plan.warnings.length > 0 && <div className="card-body"><div className="alert is-warning"><TriangleAlert aria-hidden="true" /><div>{plan.warnings.map((w, i) => <p key={i}>{w}</p>)}</div></div></div>}
          {plan.items.length === 0 ? (
            <div className="card-body"><p className="muted">NPM has no hosts, redirections or streams.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th scope="col" className="check-col">
                      <input type="checkbox" aria-label="Select all importable items" checked={importable.length > 0 && importable.every(i => selected.has(i.id))}
                        onChange={e => setSelected(e.target.checked ? new Set(importable.map(i => i.id)) : new Set())} />
                    </th>
                    <th scope="col">In NPM</th>
                    <th scope="col">Becomes in eztraefik</th>
                    <th scope="col" className="col-optional">HTTPS</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.items.map(it => (
                    <tr key={it.id} className={it.action === "skip" ? "is-skipped" : ""}>
                      <td className="check-col">
                        <input type="checkbox" aria-label={`Import ${it.source}`} disabled={it.action !== "import"} checked={selected.has(it.id)}
                          onChange={e => setSelected(sel => { const n = new Set(sel); if (e.target.checked) n.add(it.id); else n.delete(it.id); return n; })} />
                      </td>
                      <td>
                        <div className="mono-sm">{it.source}</div>
                        <span className="sub">{KIND[it.kind]}</span>
                      </td>
                      <td>
                        {it.action === "import" ? (
                          <>
                            <div>Route <span className="mono">{it.name}</span> <span className="muted">to</span> <span className="mono-sm">{it.target}</span></div>
                          </>
                        ) : (
                          <div className="muted">{it.reason}</div>
                        )}
                        {it.notes.length > 0 && (
                          <ul className="note-list">{it.notes.map((n, i) => <li key={i}><TriangleAlert className="icon-sm" aria-hidden="true" />{n}</li>)}</ul>
                        )}
                      </td>
                      <td className="col-optional muted">{it.tls || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(needPasswords.length > 0 || needEmail) && (
            <div className="card-body form-section">
              {needPasswords.length > 0 && (
                <>
                  <h3><KeyRound className="icon-sm inline-icon" aria-hidden="true" />Passwords for protected hosts</h3>
                  <p className="hint">NPM does not give passwords out{npmHere ? ", and they could not be read from its container" : ""}. Set them here, or the protected hosts are skipped so they never go public.</p>
                  <div className="pw-grid">
                    {needPasswords.map(k => (
                      <Field key={k} label={<>User <span className="mono">{k.split("/").slice(1).join("/")}</span></>} htmlFor={`pw-${k}`}>
                        <input className="input" type="password" autoComplete="new-password" {...invalid(`pw-${k}`)} value={passwords[k] || ""} onChange={e => setPasswords({ ...passwords, [k]: e.target.value })} />
                      </Field>
                    ))}
                  </div>
                </>
              )}
              {needEmail && (
                <Field label="Email for Let's Encrypt" htmlFor="npm-le-email" hint="NPM's certificates don't say which email they used. Traefik needs one for its own certificates.">
                  <input className="input" type="email" {...invalid("npm-le-email")} value={email} onChange={e => setEmail(e.target.value)} style={{ maxWidth: 360 }} />
                </Field>
              )}
              <div className="form-actions start"><Button busy={busy === "plan"} busyLabel="Checking" onClick={replan}>Update review</Button></div>
            </div>
          )}

          <div className="table-foot import-foot">
            <span>
              {plan.resolver ? <>Creates resolver <span className="mono">{plan.resolver.name}</span> ({plan.resolver.challenge.toUpperCase()} challenge, {plan.resolver.email}). </> : null}
              New ports and resolvers wait on the Traefik page until applied; the switch-over below applies them.
            </span>
            <Button variant="primary" icon={Import} busy={busy === "import"} busyLabel="Importing" disabled={!selected.size} onClick={doImport}>
              Import {selected.size} item{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </section>
      )}

      {result && (result.failed?.length ?? 0) > 0 && (
        <div className="alert is-warning" role="status">
          <TriangleAlert aria-hidden="true" />
          <div><strong>{result.failed!.length} item{result.failed!.length === 1 ? "" : "s"} could not be imported.</strong>
            <ul className="plain-list">{result.failed!.map(f => <li key={f.ID} className="muted"><span className="mono-sm">{f.Source}</span>: {f.Error}</li>)}</ul>
          </div>
        </div>
      )}

      {m && (
        <Card title={<h2><span className="step-num">3</span>Switch traffic</h2>}>
          <p className="muted">
            Last import: {m.imported} item{m.imported === 1 ? "" : "s"} from <span className="mono">{m.source}</span> on {shortTime(m.importedAt)}. <a href="#routes">See them in Routes.</a>
          </p>
          {!m.npmContainer ? (
            <p className="spaced">NPM runs on another machine. When you are ready, stop it there, point your router or DNS at this host, and give Traefik ports 80 and 443 on the Entrypoints page.</p>
          ) : m.switchedAt ? (
            <div className="switch-state">
              <div className="alert is-success-soft"><CircleCheck aria-hidden="true" /><div><strong>Traefik serves the traffic since {shortTime(m.switchedAt)}.</strong> <span className="muted">NPM ({m.npmContainer}) is stopped, not deleted. Its config is unchanged.</span></div></div>
              <Button icon={Undo2} onClick={() => setConfirm("back")}>Switch back to NPM</Button>
            </div>
          ) : (
            <div className="switch-state">
              <p>
                Traefik takes the ports NPM publishes{npmHere ? ` (${[npmHere.httpPort, npmHere.httpsPort].filter(Boolean).join(", ")}${Object.keys(m.streamPorts || {}).length ? " and the stream ports" : ""})` : ""}.
                NPM is stopped, not deleted. If Traefik does not start, NPM is started again automatically.
              </p>
              <Button variant="primary" icon={ArrowRightLeft} onClick={() => setConfirm("switch")}>Switch traffic to Traefik</Button>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog open={confirm === "switch"} title="Switch traffic from NPM to Traefik?" confirmLabel="Stop NPM and switch" danger busy={busy === "switch"} onConfirm={() => doSwitch(false)} onClose={() => setConfirm("")}>
        <p>Sites are down for a few seconds while NPM stops and Traefik is recreated on its ports. Let's Encrypt certificates are requested on the first visit after the switch. You can switch back at any time.</p>
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "back"} title="Switch back to NPM?" confirmLabel="Start NPM again" busy={busy === "back"} onConfirm={() => doSwitch(true)} onClose={() => setConfirm("")}>
        <p>Traefik gives the ports back and NPM starts again. The imported routes stay in eztraefik, so you can switch again later.</p>
      </ConfirmDialog>
    </>
  );
}

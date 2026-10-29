// Docs: docs/03 - Features/Onboarding.md
// First-run wizard. Every step has Back and Skip (skip keeps the defaults), and validates before Continue.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Box, CircleAlert, CircleCheck, Container, Lock, TriangleAlert } from "lucide-react";
import { api, ApiError, type EnvVar } from "../api";
import { Button, Spinner } from "../ui/feedback";
import { Field, SettingRow, invalid } from "../ui/controls";
import { BrandMark } from "../app/Shell";

interface Check {
  docker: { ok: boolean; version?: string; containers?: number; networks?: number; error?: string };
  existingTraefik?: { name: string; image: string; state: string }[];
  usedPorts?: Record<string, string>;
  defaults: { httpPort: number; httpsPort: number; image: string; caServer: string; caCertPEM: string; devMode: boolean };
}

const STEPS = ["Welcome", "Docker", "Traefik", "Ports", "Domain", "Certificates", "Account", "Review"];
const DNS_PROVIDERS = [
  { id: "cloudflare", label: "Cloudflare", env: ["CF_DNS_API_TOKEN"] },
  { id: "ovh", label: "OVH", env: ["OVH_ENDPOINT", "OVH_APPLICATION_KEY", "OVH_APPLICATION_SECRET", "OVH_CONSUMER_KEY"] },
  { id: "route53", label: "AWS Route 53", env: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"] },
  { id: "digitalocean", label: "DigitalOcean", env: ["DO_AUTH_TOKEN"] },
  { id: "gandiv5", label: "Gandi", env: ["GANDIV5_PERSONAL_ACCESS_TOKEN"] },
  { id: "hetzner", label: "Hetzner", env: ["HETZNER_API_KEY"] },
  { id: "duckdns", label: "Duck DNS", env: ["DUCKDNS_TOKEN"] },
];

export function Onboarding({ devMode, onDone }: { devMode: boolean; onDone: () => void }) {
  const [check, setCheck] = useState<Check | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false); // setup stored; only the Traefik start failed
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [f, setF] = useState({
    image: "traefik:v3.7.16", replaceName: "", httpPort: 80, httpsPort: 443, redirect: true, domain: "",
    certMode: "http" as "http" | "dns" | "none", email: "", dnsProvider: "cloudflare", dnsEnv: {} as Record<string, string>,
    caServer: "", caCertPEM: "", username: "admin", password: "", password2: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }));

  const loadCheck = () => {
    setCheckError(null);
    api.get<Check>("/onboarding/check").then(c => {
      setCheck(c);
      setF(s => ({ ...s, httpPort: c.defaults.httpPort, httpsPort: c.defaults.httpsPort, image: c.defaults.image, caServer: c.defaults.caServer, caCertPEM: c.defaults.caCertPEM }));
    }).catch(e => setCheckError(e.message));
  };
  useEffect(loadCheck, []);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  const used = check?.usedPorts ?? {};
  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 1 && !check?.docker.ok) e.docker = "eztraefik can't reach Docker yet.";
    if (s === 3) {
      for (const [k, v] of [["httpPort", f.httpPort], ["httpsPort", f.httpsPort]] as const) {
        if (!(v >= 1 && v <= 65535)) e[k] = "Port must be between 1 and 65535.";
        else if (used[v] && used[v] !== f.replaceName) e[k] = `Port ${v} is already used by ${used[v]}.`;
      }
      if (f.httpPort === f.httpsPort) e.httpsPort = "Use a different port than HTTP.";
    }
    if (s === 4 && f.domain && !/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(f.domain.trim())) e.domain = "Enter a domain like example.com.";
    if (s === 5 && f.certMode !== "none") {
      if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter an email address. Let's Encrypt sends expiry notices to it.";
      if (f.certMode === "dns") {
        const p = DNS_PROVIDERS.find(x => x.id === f.dnsProvider)!;
        for (const k of p.env) if (!f.dnsEnv[k]) e["env-" + k] = "Required for this provider.";
      }
    }
    if (s === 6) {
      if (!f.username.trim()) e.username = "Choose a username.";
      if (f.password.length < 12) e.password = "Use at least 12 characters.";
      else if (f.password !== f.password2) e.password2 = "The passwords don't match.";
    }
    return e;
  };

  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.querySelector<HTMLElement>(`#ob-${Object.keys(e)[0]}`);
      first?.focus();
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else if (saved) {
      window.location.hash = "traefik";
      onDone();
    } else finish();
  };

  const finish = async () => {
    setBusy(true);
    setApplyError(null);
    const p = DNS_PROVIDERS.find(x => x.id === f.dnsProvider)!;
    const dnsEnv: EnvVar[] = f.certMode === "dns" ? p.env.map(k => ({ key: k, value: f.dnsEnv[k] || "", secret: true })) : [];
    try {
      const res = await api.post<{ applied: boolean; error?: string }>("/onboarding/complete", {
        httpPort: f.httpPort, httpsPort: f.httpsPort, redirect: f.redirect, image: f.image, replaceName: f.replaceName,
        domain: f.domain.trim(), certMode: f.certMode, email: f.email.trim(), dnsProvider: f.certMode === "dns" ? f.dnsProvider : "",
        dnsEnv, caServer: f.caServer, caCertPEM: f.caCertPEM, username: f.username.trim(), password: f.password,
      });
      if (!res.applied) {
        setSaved(true);
        setApplyError(res.error || "Traefik did not start.");
        setBusy(false);
        return;
      }
      window.location.hash = "overview";
      onDone();
    } catch (err) {
      const ae = err as ApiError;
      setApplyError(ae.message);
      if (ae.field) setErrors({ [ae.field]: ae.message });
      setBusy(false);
    }
  };

  const err = (k: string) => errors[k];
  const provider = DNS_PROVIDERS.find(x => x.id === f.dnsProvider)!;

  const body = () => {
    switch (step) {
      case 0:
        return (
          <ul className="list card">
            {[
              [Container, "Check Docker", "eztraefik manages containers through the Docker socket."],
              [Box, "Create the Traefik container", "With the ports, domain and certificates you choose."],
              [Lock, "Create your account", "Only you can open this panel."],
            ].map(([Icon, t, s]: any) => (
              <li className="list-row" key={t}>
                <span className="sev is-neutral"><Icon className="icon-sm" aria-hidden="true" /></span>
                <div className="grow"><div className="title">{t}</div><div className="sub">{s}</div></div>
              </li>
            ))}
          </ul>
        );
      case 1:
        if (checkError) return <div className="alert is-danger" role="alert"><CircleAlert aria-hidden="true" /><div className="grow"><strong>Could not check Docker.</strong> <span className="muted">{checkError}</span></div><Button size="sm" onClick={loadCheck}>Try again</Button></div>;
        if (!check) return <Spinner label="Checking Docker" />;
        return check.docker.ok ? (
          <div className="card">
            <div className="check-row card-pad"><span className="sev is-success"><CircleCheck className="icon-sm" aria-hidden="true" /></span><div className="grow"><div className="title">Connected to Docker {check.docker.version}</div><div className="sub mono">/var/run/docker.sock</div></div></div>
            <div className="check-row card-pad"><span className="sev is-success"><CircleCheck className="icon-sm" aria-hidden="true" /></span><div className="grow"><div className="title">{check.docker.containers} containers, {check.docker.networks} networks</div><div className="sub">You will see them in Docker after setup.</div></div></div>
          </div>
        ) : (
          <div className="alert is-danger" role="alert" id="ob-docker" tabIndex={-1}>
            <CircleAlert aria-hidden="true" />
            <div className="grow">
              <strong>Docker is not reachable.</strong> <span className="muted">Mount the socket into eztraefik: <span className="mono">-v /var/run/docker.sock:/var/run/docker.sock</span>. Error: {check.docker.error}</span>
            </div>
            <Button size="sm" onClick={loadCheck}>Check again</Button>
          </div>
        );
      case 2:
        return (
          <>
            {check?.existingTraefik?.length ? (
              <fieldset className="field">
                <legend className="label">Traefik already runs on this host</legend>
                <div className="choice-grid">
                  <label className="choice"><input type="radio" name="ob-existing" checked={f.replaceName === ""} onChange={() => set("replaceName", "")} /><span><span className="title">Keep it running</span><br /><span className="sub">Use other ports for the new Traefik.</span></span></label>
                  {check.existingTraefik.map(c => (
                    <label className="choice" key={c.name}><input type="radio" name="ob-existing" checked={f.replaceName === c.name} onChange={() => set("replaceName", c.name)} /><span><span className="title">Replace <span className="mono">{c.name}</span></span><br /><span className="sub">It is stopped and kept, not deleted. {c.image}</span></span></label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="muted">No other Traefik container found. eztraefik will create one named <span className="mono">traefik</span>.</p>
            )}
            <Field label="Traefik image" htmlFor="ob-image" hint="The version to run. You can change it later on the Traefik page.">
              <input className="input mono" {...invalid("ob-image")} value={f.image} onChange={e => set("image", e.target.value)} style={{ maxWidth: 320 }} />
            </Field>
          </>
        );
      case 3:
        return (
          <>
            {Object.keys(used).length > 0 && (
              <p className="hint">Ports already published on this host: {Object.entries(used).map(([p, c]) => `${p} (${c})`).join(", ")}.</p>
            )}
            <div className="field-row">
              <Field label="HTTP port" htmlFor="ob-httpPort" error={err("httpPort")} hint="Usually 80.">
                <input className="input mono" inputMode="numeric" {...invalid("ob-httpPort", err("httpPort"))} value={f.httpPort || ""} onChange={e => set("httpPort", +e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="HTTPS port" htmlFor="ob-httpsPort" error={err("httpsPort")} hint="Usually 443.">
                <input className="input mono" inputMode="numeric" {...invalid("ob-httpsPort", err("httpsPort"))} value={f.httpsPort || ""} onChange={e => set("httpsPort", +e.target.value.replace(/\D/g, ""))} />
              </Field>
            </div>
            <div className="spaced"><SettingRow title="Redirect HTTP to HTTPS" description="Recommended. Visitors on http:// are sent to https://." checked={f.redirect} onChange={v => set("redirect", v)} /></div>
            <p className="hint spaced">Add custom ports like 5432 or 25565 later in Entrypoints.</p>
          </>
        );
      case 4:
        return (
          <Field label="Domain" htmlFor="ob-domain" error={err("domain")} hint="The domain you will serve apps on, like example.com. Add more later in Domains." optional>
            <input className="input mono" {...invalid("ob-domain", err("domain"))} placeholder="e.g. example.com" value={f.domain} onChange={e => set("domain", e.target.value.toLowerCase())} style={{ maxWidth: 420 }} />
          </Field>
        );
      case 5:
        return (
          <>
            <div className="choice-grid" role="radiogroup" aria-label="Certificate method">
              {([
                ["http", "Let's Encrypt, HTTP challenge", "Simplest. Needs the HTTP port reachable from the internet."],
                ["dns", "Let's Encrypt, DNS challenge", "Works behind a firewall and for wildcards. Needs a DNS provider token."],
                ["none", "Decide later", "Routes stay on HTTP until you add a certificate resolver."],
              ] as const).map(([v, t, s]) => (
                <label className="choice" key={v}><input type="radio" name="ob-cert" checked={f.certMode === v} onChange={() => set("certMode", v)} /><span><span className="title">{t}</span><br /><span className="sub">{s}</span></span></label>
              ))}
            </div>
            {f.certMode !== "none" && (
              <div className="spaced" style={{ maxWidth: 480 }}>
                <Field label="Email for Let's Encrypt" htmlFor="ob-email" error={err("email")} hint="Used only for expiry notices.">
                  <input className="input" type="email" {...invalid("ob-email", err("email"))} placeholder="you@example.com" value={f.email} onChange={e => set("email", e.target.value)} />
                </Field>
                {f.certMode === "dns" && (
                  <>
                    <Field label="DNS provider" htmlFor="ob-provider">
                      <select className="select" id="ob-provider" value={f.dnsProvider} onChange={e => set("dnsProvider", e.target.value)}>
                        {DNS_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </Field>
                    {provider.env.map(k => (
                      <Field key={k} label={<span className="mono">{k}</span>} htmlFor={`ob-env-${k}`} error={err("env-" + k)}>
                        <input className="input mono" type="password" autoComplete="off" {...invalid(`ob-env-${k}`, err("env-" + k))} value={f.dnsEnv[k] || ""} onChange={e => set("dnsEnv", { ...f.dnsEnv, [k]: e.target.value })} />
                      </Field>
                    ))}
                    <p className="hint">Other providers: add the resolver later on the Certificates page.</p>
                  </>
                )}
                <details className="advanced spaced" open={!!f.caServer}>
                  <summary><ArrowRight className="icon-sm" aria-hidden="true" />Advanced: private ACME server</summary>
                  <div className="spaced">
                    <Field label="ACME directory URL" htmlFor="ob-ca" hint={devMode ? "Dev environment: Pebble, a test CA. Certificates are not trusted by browsers." : "Leave empty for Let's Encrypt."} optional>
                      <input className="input mono" {...invalid("ob-ca")} value={f.caServer} onChange={e => set("caServer", e.target.value)} placeholder="https://acme.example.com/directory" />
                    </Field>
                    {f.caServer && <p className="hint">{f.caCertPEM ? "The CA certificate for this server is loaded." : "Paste the CA certificate on the Certificates page if the server uses a private CA."}</p>}
                  </div>
                </details>
              </div>
            )}
          </>
        );
      case 6:
        return (
          <div style={{ maxWidth: 420 }}>
            <Field label="Username" htmlFor="ob-username" error={err("username")}>
              <input className="input" autoComplete="username" {...invalid("ob-username", err("username"))} value={f.username} onChange={e => set("username", e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="ob-password" error={err("password")} hint="At least 12 characters.">
              <input className="input" type="password" autoComplete="new-password" {...invalid("ob-password", err("password"))} value={f.password} onChange={e => set("password", e.target.value)} />
            </Field>
            <Field label="Repeat password" htmlFor="ob-password2" error={err("password2")}>
              <input className="input" type="password" autoComplete="new-password" {...invalid("ob-password2", err("password2"))} value={f.password2} onChange={e => set("password2", e.target.value)} />
            </Field>
          </div>
        );
      default:
        return (
          <>
            <dl className="summary card">
              <div><dt>Traefik</dt><dd className="mono">{f.image}</dd></div>
              {f.replaceName && <div><dt>Replaces</dt><dd><span className="mono">{f.replaceName}</span> (stopped, kept)</dd></div>}
              <div><dt>Ports</dt><dd className="mono">HTTP {f.httpPort}, HTTPS {f.httpsPort}{f.redirect ? ", HTTP redirects to HTTPS" : ""}</dd></div>
              <div><dt>Domain</dt><dd className="mono">{f.domain || "none yet"}</dd></div>
              <div><dt>Certificates</dt><dd>{f.certMode === "none" ? "Decide later" : `Let's Encrypt, ${f.certMode.toUpperCase()} challenge${f.caServer ? ` (${f.caServer})` : ""}`}</dd></div>
              <div><dt>Account</dt><dd>{f.username}</dd></div>
            </dl>
            {applyError && (
              <div className="alert is-danger spaced" role="alert">
                <TriangleAlert aria-hidden="true" />
                <div><strong>Setup saved, but Traefik did not start.</strong> <span className="muted">{applyError}</span><br /><span className="hint">You can fix it on the Traefik page after signing in.</span></div>
              </div>
            )}
          </>
        );
    }
  };

  const leads = [
    "A few questions and Traefik will be running on this host. You can change every answer later.",
    "eztraefik needs the Docker socket to create Traefik and see your containers.",
    "eztraefik creates and owns the Traefik container, so every setting is editable here.",
    "Where Traefik listens for visitors.",
    "Optional. Routes get their own domains when you create them.",
    "How HTTPS certificates are issued.",
    "Sign in with this to open eztraefik.",
    "This is what will be created.",
  ];

  return (
    <div className="onboarding is-open" role="main">
      <div className="ob-shell">
        <div className="ob-top">
          <div className="brand"><BrandMark /><span className="brand-name">eztraefik setup</span></div>
          {devMode && <span className="badge is-warning">Dev environment</span>}
        </div>
        <ol className="steps" aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? "is-done" : ""} aria-current={i === step ? "step" : undefined}>{s}</li>
          ))}
        </ol>
        <div className="ob-panel">
          <div className="ob-step is-entering" key={step}>
            <h1 ref={titleRef} tabIndex={-1}>{step === 0 ? "Set up eztraefik" : STEPS[step]}</h1>
            <p className="lead">{leads[step]}</p>
            {body()}
          </div>
          <div className="ob-actions">
            <Button onClick={() => setStep(step - 1)} disabled={step === 0 || busy || saved} icon={ArrowLeft}>Back</Button>
            <div className="spacer" />
            {step > 0 && step < STEPS.length - 2 && step !== 1 && (
              <Button variant="ghost" onClick={() => { setErrors({}); setStep(step + 1); }}>Skip this step</Button>
            )}
            <Button variant="primary" onClick={next} busy={busy} busyLabel="Starting Traefik" disabled={step === 1 && !check?.docker.ok}>
              {step === 0 ? "Start" : step === STEPS.length - 1 ? (saved ? "Open the Traefik page" : "Create Traefik") : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

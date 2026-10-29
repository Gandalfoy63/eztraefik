// Docs: docs/03 - Features/Traefik Container.md
// The one place where the Traefik container is recreated (applied) or restarted.
import { useEffect, useState } from "react";
import { Box, Eye, EyeOff, Plus, RotateCw, Save, X } from "lucide-react";
import { api, ApiError, type EnvVar, type TraefikConfig } from "../api";
import { Button, ErrorBox, SkeletonRows, useToast } from "../ui/feedback";
import { Field, SettingRow, invalid } from "../ui/controls";
import { ConfirmDialog } from "../ui/Modal";
import { Card, CodeBlock, PageHeader } from "../ui/Page";
import { timeAgo } from "../ui/hooks";
import { PendingBanner, saveTraefik, useTraefik } from "./traefikConfig";

export function TraefikPage() {
  const toast = useToast();
  const { data, error, reload } = useTraefik(10000);
  const [cfg, setCfg] = useState<TraefikConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"" | "save" | "apply" | "restart">("");
  const [confirm, setConfirm] = useState<"" | "apply" | "restart">("");
  const [flagsText, setFlagsText] = useState("");
  const [show, setShow] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (data && !dirty) {
      setCfg(structuredClone(data.config));
      setFlagsText(data.config.extraFlags.join("\n"));
    }
  }, [data, dirty]);
  const set = (p: Partial<TraefikConfig>) => {
    setCfg(c => ({ ...c!, ...p }));
    setDirty(true);
  };
  const setEnv = (env: EnvVar[]) => set({ env });

  const save = async () => {
    setBusy("save");
    setErrors({});
    try {
      await saveTraefik({ ...cfg!, extraFlags: flagsText.split("\n").map(s => s.trim()).filter(Boolean) });
      toast("Traefik settings saved. Apply them to recreate the container.");
      setDirty(false);
      reload();
    } catch (e) {
      const ae = e as ApiError;
      setErrors({ [ae.field || "_"]: ae.message });
    } finally {
      setBusy("");
    }
  };
  const run = async (what: "apply" | "restart") => {
    setBusy(what);
    try {
      await api.post(`/traefik/${what}`);
      toast(what === "apply" ? "Traefik was recreated with the new settings." : "Traefik restarted.");
      setConfirm("");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
      setConfirm("");
    } finally {
      setBusy("");
    }
  };

  if (error && !data) return <><PageHeader title="Traefik" /><ErrorBox message={error} onRetry={reload} /></>;
  if (!data || !cfg) return <><PageHeader title="Traefik" /><div className="card card-body"><SkeletonRows rows={6} /></div></>;
  const st = data.status;
  const needsCreate = !st.exists;
  const diff = data.diff;

  return (
    <>
      <PageHeader title="Traefik" description="The Traefik container eztraefik runs: version, settings and environment variables."
        action={
          <div className="btn-row">
            {st.exists && <Button icon={RotateCw} onClick={() => setConfirm("restart")} disabled={!!busy}>Restart</Button>}
            <Button variant="primary" icon={Box} onClick={() => setConfirm("apply")} disabled={dirty || !!busy}>{needsCreate ? "Create Traefik" : "Apply settings"}</Button>
          </div>
        } />
      {dirty && <div className="alert is-warning" role="status"><Save aria-hidden="true" /><div className="grow"><strong>Unsaved changes.</strong> <span className="muted">Save them first, then apply.</span></div></div>}
      <PendingBanner pending={data.pending} onTraefikPage />
      {st.exists && !st.managed && <div className="alert is-warning" role="status"><Box aria-hidden="true" /><div><strong>This container was not created by eztraefik.</strong> <span className="muted">Apply replaces it with a managed one and keeps the old one stopped under another name.</span></div></div>}

      <div className="grid stats">
        <div className="card stat"><span className="stat-label">Container</span><span className="stat-value small">{st.exists ? (st.running ? "Running" : st.state) : "Not created"}</span><span className="stat-meta">{st.exists ? <span className="mono">{cfg.containerName}</span> : "Use Create Traefik"}</span></div>
        <div className="card stat"><span className="stat-label">Version</span><span className="stat-value small">{data.version?.Version ?? "Unknown"}</span><span className="stat-meta mono">{st.image || cfg.image}</span></div>
        <div className="card stat"><span className="stat-label">Started</span><span className="stat-value small">{st.running ? timeAgo(st.startedAt) : "-"}</span><span className="stat-meta">{st.managed ? "Managed by eztraefik" : st.exists ? "Not created by eztraefik" : ""}</span></div>
        <div className="card stat"><span className="stat-label">Settings</span><span className="stat-value small">{data.pending ? "Pending" : "Applied"}</span><span className={`stat-meta${data.pending ? " is-warning" : ""}`}>{data.pending ? "Waiting for Apply" : "Container matches the settings"}</span></div>
      </div>
      {data.statusError && <ErrorBox title="Docker error." message={data.statusError} />}

      {data.pending && diff && (
        <Card title="What Apply changes">
          <ul className="diff-list">
            {diff.imageFrom !== diff.imageTo && <li className="is-add mono-sm">image {diff.imageFrom} {"->"} {diff.imageTo}</li>}
            {(diff.removedFlags ?? []).map(f => <li key={"rf" + f} className="is-del mono-sm"><span className="sr-only">Removed: </span>{f}</li>)}
            {(diff.addedFlags ?? []).map(f => <li key={"af" + f} className="is-add mono-sm"><span className="sr-only">Added: </span>{f}</li>)}
            {(diff.removedEnv ?? []).map(f => <li key={"re" + f} className="is-del mono-sm"><span className="sr-only">Removed: </span>{f}</li>)}
            {(diff.addedEnv ?? []).map(f => <li key={"ae" + f} className="is-add mono-sm"><span className="sr-only">Added: </span>{f}</li>)}
          </ul>
        </Card>
      )}

      <form onSubmit={e => { e.preventDefault(); save(); }} noValidate className="stack">
        <Card title="Container">
          <div className="field-row three">
            <Field label="Image" htmlFor="tr-image" error={errors.image} hint="For example traefik:v3.7.16.">
              <input className="input mono" {...invalid("tr-image", errors.image)} value={cfg.image} onChange={e => set({ image: e.target.value.trim() })} />
            </Field>
            <Field label="Container name" htmlFor="tr-name" error={errors.containerName}>
              <input className="input mono" {...invalid("tr-name", errors.containerName)} value={cfg.containerName} onChange={e => set({ containerName: e.target.value.trim() })} />
            </Field>
            <Field label="Docker network" htmlFor="tr-net" error={errors.network} hint="Containers on it are reachable.">
              <input className="input mono" {...invalid("tr-net", errors.network)} value={cfg.network} onChange={e => set({ network: e.target.value.trim() })} />
            </Field>
          </div>
          <div className="field-row three">
            <Field label="Log level" htmlFor="tr-log">
              <select className="select" id="tr-log" value={cfg.logLevel} onChange={e => set({ logLevel: e.target.value })}>
                {["DEBUG", "INFO", "WARN", "ERROR"].map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Publish the Traefik dashboard on port" htmlFor="tr-dash" error={errors.dashboardPort} optional hint="Unprotected. Only for trusted networks.">
              <input className="input mono" {...invalid("tr-dash", errors.dashboardPort)} inputMode="numeric" value={cfg.dashboardPort || ""} onChange={e => set({ dashboardPort: +e.target.value.replace(/\D/g, "") || 0 })} />
            </Field>
          </div>
          <SettingRow title="Access log" description="Records every request. Needed for the Logs page." checked={cfg.accessLog} onChange={accessLog => set({ accessLog })} />
          <SettingRow title="Docker labels" description="Read routes from traefik.* labels on containers." checked={cfg.dockerProvider} onChange={dockerProvider => set({ dockerProvider })} />
          <SettingRow title="Expose every container by default" description="Off: only containers with traefik.enable=true get label routes." checked={cfg.exposedByDefault} onChange={exposedByDefault => set({ exposedByDefault })} disabled={!cfg.dockerProvider} />
        </Card>

        <Card title="Environment variables" actions={<span className="hint">DNS provider tokens, TZ, anything Traefik reads from its environment.</span>}>
          {errors.env && <span className="error">{errors.env}</span>}
          <div className="ref-rows">
            {cfg.env.map((v, i) => (
              <div className="ref-row env-row" key={i}>
                <input className="input mono" aria-label={`Variable ${i + 1} name`} value={v.key} placeholder="NAME" onChange={e => setEnv(cfg.env.map((x, j) => (j === i ? { ...x, key: e.target.value.trim() } : x)))} />
                <input className="input mono" aria-label={`Variable ${i + 1} value`} type={v.secret && !show[i] ? "password" : "text"} autoComplete="off" value={v.value}
                  placeholder={v.secret ? "Stored. Type to replace" : "value"} onChange={e => setEnv(cfg.env.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <label className="check compact-check"><input type="checkbox" checked={v.secret} onChange={e => setEnv(cfg.env.map((x, j) => (j === i ? { ...x, secret: e.target.checked } : x)))} />Secret</label>
                {v.secret && <button className="icon-btn" type="button" aria-label={show[i] ? `Hide ${v.key}` : `Show ${v.key}`} data-tooltip={show[i] ? "Hide" : "Show"} onClick={() => setShow({ ...show, [i]: !show[i] })}>{show[i] ? <EyeOff className="icon-sm" aria-hidden="true" /> : <Eye className="icon-sm" aria-hidden="true" />}</button>}
                <button className="icon-btn" type="button" aria-label={`Remove ${v.key || "variable"}`} data-tooltip="Remove" onClick={() => setEnv(cfg.env.filter((_, j) => j !== i))}><X className="icon-sm" aria-hidden="true" /></button>
              </div>
            ))}
            <Button size="sm" icon={Plus} onClick={() => setEnv([...cfg.env, { key: "", value: "", secret: false }])}>Add variable</Button>
          </div>
        </Card>

        <Card title="Extra flags" actions={<span className="hint">Any Traefik option not covered above, one per line.</span>}>
          <Field label="Flags" htmlFor="tr-flags" error={errors.extraFlags} hint={<>For example <span className="mono">--serverstransport.insecureskipverify=true</span>. Option names are in the Traefik docs.</>}>
            <textarea className="input mono textarea" {...invalid("tr-flags", errors.extraFlags)} rows={4} value={flagsText} onChange={e => { setFlagsText(e.target.value); setDirty(true); }} spellCheck={false} />
          </Field>
        </Card>

        <div className="form-actions">
          {errors._ && <span className="error">{errors._}</span>}
          <Button onClick={() => { setDirty(false); setErrors({}); }} disabled={!dirty}>Discard changes</Button>
          <Button variant="primary" type="submit" busy={busy === "save"} busyLabel="Saving" disabled={!dirty}>Save settings</Button>
        </div>
      </form>

      <Card title="Generated command" actions={<span className="hint">What the container runs with. Secrets are hidden.</span>}>
        <CodeBlock label="Traefik flags">{data.flags.join("\n")}</CodeBlock>
        {data.env.length > 0 && <div className="spaced"><CodeBlock label="Environment">{data.env.join("\n")}</CodeBlock></div>}
      </Card>

      <ConfirmDialog open={confirm === "apply"} title={needsCreate ? "Create the Traefik container?" : "Recreate Traefik with the new settings?"} confirmLabel={needsCreate ? "Create Traefik" : "Recreate Traefik"}
        busy={busy === "apply"} onConfirm={() => run("apply")} onClose={() => setConfirm("")}>
        <p>{needsCreate ? "eztraefik pulls the image if needed and starts Traefik." : "Traffic stops for a few seconds while the container is replaced. If the new one fails to start, the current one comes back."}</p>
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "restart"} title="Restart Traefik?" confirmLabel="Restart Traefik" busy={busy === "restart"} onConfirm={() => run("restart")} onClose={() => setConfirm("")}>
        <p>Traffic stops for a few seconds. Settings are not changed.</p>
      </ConfirmDialog>
    </>
  );
}

// Docs: docs/03 - Features/Config History.md, docs/03 - Features/Auth.md
import { useState, type ChangeEvent } from "react";
import { Download, History, RotateCcw, Upload } from "lucide-react";
import { api, ApiError, type HistoryEntry } from "../api";
import { Button, Empty, ErrorBox, SkeletonRows, useToast } from "../ui/feedback";
import { Field, invalid } from "../ui/controls";
import { ConfirmDialog, Modal, TabPanel, Tabs } from "../ui/Modal";
import { Card, CodeBlock, PageHeader } from "../ui/Page";
import { shortTime, useLoad } from "../ui/hooks";

function HistoryTab() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get<{ entries: HistoryEntry[] }>("/history"));
  const [view, setView] = useState<{ entry: HistoryEntry; yaml: string } | null>(null);
  const [rollback, setRollback] = useState<HistoryEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const open = async (e: HistoryEntry) => {
    try {
      const r = await api.get<{ yaml: string }>(`/history/${e.id}`);
      setView({ entry: e, yaml: r.yaml });
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };
  const doRollback = async () => {
    setBusy(true);
    try {
      await api.post(`/history/${rollback!.id}/rollback`);
      toast(`Restored the config from ${shortTime(rollback!.time)}. Traefik settings, if changed, need Apply.`);
      setRollback(null);
      setView(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <SkeletonRows rows={6} />;
  if (!data?.entries.length) return <Empty icon={History} title="No history yet">Every change you save is kept here, so you can go back.</Empty>;
  return (
    <>
      <ul className="list history-list">
        {data.entries.map((e, i) => (
          <li className="list-row" key={e.id}>
            <span className="change-time wide">{shortTime(e.time)}</span>
            <div className="grow"><div className="title">{e.message}</div><div className="sub">by {e.user}{i === 0 ? ", current" : ""}</div></div>
            <Button size="sm" variant="ghost" onClick={() => open(e)}>View</Button>
            {i > 0 && <Button size="sm" icon={RotateCcw} onClick={() => setRollback(e)}>Restore</Button>}
          </li>
        ))}
      </ul>
      <Modal open={!!view} onClose={() => setView(null)} title={view ? view.entry.message : ""} description={view ? `${shortTime(view.entry.time)}, by ${view.entry.user}. The Traefik config this version produced.` : ""} width={760}
        footer={<Button onClick={() => setView(null)}>Close</Button>}>
        <div className="modal-body"><CodeBlock label="Dynamic config">{view?.yaml ?? ""}</CodeBlock></div>
      </Modal>
      <ConfirmDialog open={!!rollback} title="Restore this version?" confirmLabel="Restore version" busy={busy} onConfirm={doRollback} onClose={() => setRollback(null)}>
        <p>Routes, services, middlewares, domains and Traefik settings go back to how they were on {rollback ? shortTime(rollback.time) : ""}. The restore itself is a new history entry, so you can undo it.</p>
      </ConfirmDialog>
    </>
  );
}

function AccountTab() {
  const toast = useToast();
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (f.next !== f.again) {
      setErr({ again: "The new passwords don't match." });
      return;
    }
    setBusy(true);
    setErr({});
    try {
      await api.put("/account/password", { current: f.current, next: f.next });
      toast("Password changed. Other sessions were signed out.");
      setF({ current: "", next: "", again: "" });
    } catch (e) {
      const ae = e as ApiError;
      setErr({ [ae.field || "_"]: ae.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="narrow-form" onSubmit={e => { e.preventDefault(); save(); }} noValidate>
      <Field label="Current password" htmlFor="pw-cur" error={err.current}><input className="input" type="password" autoComplete="current-password" {...invalid("pw-cur", err.current)} value={f.current} onChange={e => setF({ ...f, current: e.target.value })} /></Field>
      <Field label="New password" htmlFor="pw-new" error={err.next} hint="At least 12 characters."><input className="input" type="password" autoComplete="new-password" {...invalid("pw-new", err.next)} value={f.next} onChange={e => setF({ ...f, next: e.target.value })} /></Field>
      <Field label="Repeat new password" htmlFor="pw-again" error={err.again}><input className="input" type="password" autoComplete="new-password" {...invalid("pw-again", err.again)} value={f.again} onChange={e => setF({ ...f, again: e.target.value })} /></Field>
      {err._ && <span className="error">{err._}</span>}
      <div className="form-actions start"><Button variant="primary" type="submit" busy={busy} busyLabel="Saving" disabled={!f.current || !f.next}>Change password</Button></div>
    </form>
  );
}

function BackupTab() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<unknown>(null);
  const exportCfg = async () => {
    const data = await api.get<unknown>("/export");
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `eztraefik-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(t => {
      try {
        setPending(JSON.parse(t));
      } catch {
        toast("This file is not valid JSON.", "error");
      }
    });
    e.target.value = "";
  };
  const doImport = async () => {
    setBusy(true);
    try {
      await api.post("/import", pending);
      toast("Config imported. Apply Traefik settings if they changed.");
      setPending(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      <div className="setting-row">
        <div><div className="label">Export</div><div className="hint">Everything except your account, as one JSON file. It contains secret environment values: keep it safe.</div></div>
        <Button icon={Download} onClick={exportCfg}>Export config</Button>
      </div>
      <div className="setting-row">
        <div><div className="label">Import</div><div className="hint">Replaces routes, services, middlewares, domains and Traefik settings with the file's. The current config stays in history.</div></div>
        <label className="btn btn-secondary file-btn"><Upload aria-hidden="true" />Import file<input type="file" accept="application/json,.json" onChange={pick} className="sr-only" /></label>
      </div>
      <ConfirmDialog open={!!pending} title="Replace the current config?" confirmLabel="Import and replace" danger busy={busy} onConfirm={doImport} onClose={() => setPending(null)}>
        <p>The current config is kept in history, so you can restore it.</p>
      </ConfirmDialog>
    </div>
  );
}

export function SettingsPage({ params }: { params: URLSearchParams }) {
  const [tab, setTab] = useState(params.get("tab") || "history");
  return (
    <>
      <PageHeader title="Settings" description="History of changes, your account, and backups. The theme switch is in the top bar." />
      <section className="card">
        <Tabs label="Settings" value={tab} onChange={setTab} tabs={[{ id: "history", label: "History" }, { id: "account", label: "Account" }, { id: "backup", label: "Backup" }]} />
        <div className="card-body">
          <TabPanel id="history" active={tab}><HistoryTab /></TabPanel>
          <TabPanel id="account" active={tab}><AccountTab /></TabPanel>
          <TabPanel id="backup" active={tab}><BackupTab /></TabPanel>
        </div>
      </section>
      <Card title="Generated dynamic config" actions={<span className="hint">The file Traefik reads, written on every change.</span>}>
        <DynamicConfig />
      </Card>
    </>
  );
}

function DynamicConfig() {
  const { data, error } = useLoad(() => api.get<{ yaml: string }>("/config/dynamic"));
  if (error) return <ErrorBox message={error} />;
  return data ? <CodeBlock label="ezt.yml">{data.yaml}</CodeBlock> : <SkeletonRows />;
}

// Docs: docs/03 - Features/Certificates.md
// Hard refresh of certificates: the warning before it, and its progress.
import { useState } from "react";
import { CircleAlert, CircleCheck, RotateCcw } from "lucide-react";
import { api } from "../api";
import { Button, Spinner, useToast } from "../ui/feedback";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { useLoad } from "../ui/hooks";

export interface RefreshStatus {
  started: boolean;
  backup: boolean;
  deleted: number;
  running?: boolean;
  progress?: { total: number; done: string[]; failed: { host: string; reason: string }[]; waiting: string[] };
}

export function HardRefreshWarning({ open, busy, onConfirm, onClose }: { open: boolean; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <ConfirmDialog open={open} title="Delete and renew all certificates?" confirmLabel="Delete and Renew All" danger busy={busy} onConfirm={onConfirm} onClose={onClose}>
      <p>Every certificate issued by a resolver is deleted, and Traefik requests new ones. Uploaded certificates stay.</p>
      <ul>
        <li><strong>All your sites go down for a few seconds</strong> while Traefik restarts.</li>
        <li><strong>Browsers then warn on each site</strong> until its new certificate arrives. With many sites this can take several minutes.</li>
        <li><strong>Let's Encrypt limits renewals:</strong> 5 identical certificates a week, and 5 failures an hour per domain. Repeating this can lock you out for days.</li>
        <li><strong>A domain that can't get a certificate today loses the one it has.</strong> Fix DNS and resolvers first.</li>
      </ul>
      <p>A backup is kept, and you can put the old certificates back if they haven't expired.</p>
    </ConfirmDialog>
  );
}

export function HardRefreshProgress({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { data, reload } = useLoad(() => api.get<RefreshStatus>("/certificates/refresh"), [], 3000);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = data?.progress;
  const handled = p ? p.done.length + p.failed.length : 0;
  const restore = async () => {
    setBusy(true);
    try {
      await api.post("/certificates/refresh/restore");
      toast("The previous certificates are back.");
      onChanged();
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
      reload();
    } finally {
      setBusy(false);
      setConfirmRestore(false);
    }
  };
  return (
    <>
      <Modal open onClose={onClose} title="Renewing all certificates" description={data ? `${data.deleted} deleted. Traefik is requesting new ones. You can close this window, it keeps going.` : undefined}
        footer={<>{data?.backup && <Button icon={RotateCcw} onClick={() => setConfirmRestore(true)}>Restore Previous Certificates</Button>}<Button variant="primary" onClick={onClose}>Close</Button></>}>
        <div className="modal-body">
          {!p ? <Spinner label="Checking progress" /> : (
            <>
              <div className="refresh-count">
                <strong>{p.done.length} of {p.total} issued</strong>
                <span className="muted">{p.failed.length > 0 ? `${p.failed.length} failed, ` : ""}{p.waiting.length} waiting</span>
              </div>
              <progress className="refresh-bar" max={p.total || 1} value={p.done.length} aria-label={`${p.done.length} of ${p.total} certificates issued`} />
              <p className="hint" role="status">
                {data?.running ? `${handled} of ${p.total} answered so far. Some DNS providers, like DuckDNS, only handle one at a time, so this can take a while.`
                  : p.waiting.length ? `No answer for ${p.waiting.length} after 30 minutes. See the Logs page.`
                  : p.failed.length ? "Finished, with failures. Traefik retries when a route changes or it restarts." : "All certificates are renewed."}
              </p>
              {p.failed.length > 0 && (
                <ul className="check-rows spaced">
                  {p.failed.map(f => <li key={f.host} className="check-row"><span className="mono-sm">{f.host}</span><br /><span className="inline-status"><CircleAlert className="icon-sm bad" aria-hidden="true" />{f.reason}</span></li>)}
                </ul>
              )}
              {p.total > 0 && p.done.length === p.total && <p className="inline-status spaced"><CircleCheck className="icon-sm ok" aria-hidden="true" />Done.</p>}
            </>
          )}
        </div>
      </Modal>
      <ConfirmDialog open={confirmRestore} title="Put the previous certificates back?" confirmLabel="Restore" busy={busy} onConfirm={restore} onClose={() => setConfirmRestore(false)}>
        <p>Traefik restarts, so your sites go down for a few seconds. Certificates issued during this refresh are replaced by the backup.</p>
      </ConfirmDialog>
    </>
  );
}

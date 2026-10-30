// Docs: docs/03 - Features/Route Settings.md
// Named settings of an HTTP route: no Traefik keys, every option has a written-out label.
import type { RouteSettings } from "../api";
import { Field, SettingRow, StepSlider, TagInput, invalid } from "../ui/controls";
import { KVField } from "./Middlewares";

const MB = 1024 * 1024;
const UPLOAD_STEPS = [0, 1, 5, 10, 25, 50, 100, 250, 500, 1024, 2048, 5120, 10240];
const TIMEOUT_STEPS = [0, 5, 10, 30, 60, 120, 300, 600, 1800, 3600];

const formatSize = (mb: number) => (mb === 0 ? "No Limit" : mb >= 1024 ? `${+(mb / 1024).toFixed(2)} GB` : `${mb} MB`);
const formatTime = (s: number) => (s === 0 ? "Traefik Default" : s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

// Field names the server can report an error on: the route window opens this panel for them.
export const SETTING_FIELDS = ["maxBodyBytes", "connectTimeout", "responseTimeout", "allowedIPs", "requestHeaders", "responseHeaders", "rewritePattern", "redirectPattern"];

// settingsCount counts the settings that are on, shown on the closed panel. Pairs count once.
export function settingsCount(s?: RouteSettings) {
  if (!s) return 0;
  const on = [s.maxBodyBytes, s.connectTimeout, s.responseTimeout, s.skipCertificateCheck, s.hidePublicDomain, s.compress, s.blockFrames, s.blockSniffing, s.allowedIPs?.length, s.rewritePattern, s.redirectPattern];
  return on.filter(Boolean).length + Object.keys(s.requestHeaders ?? {}).length + Object.keys(s.responseHeaders ?? {}).length;
}

export function RouteSettingsPanel({ value: s, onChange, forwards, errors }: { value: RouteSettings; onChange: (v: RouteSettings) => void; forwards: boolean; errors: Record<string, string> }) {
  const set = (patch: Partial<RouteSettings>) => onChange({ ...s, ...patch });
  return (
    <>
      <h3 className="spec-label">Uploads</h3>
      <StepSlider id="rs-upload" label="Max Upload Size" unit="MB" steps={UPLOAD_STEPS} format={formatSize} error={errors.maxBodyBytes}
        hint="Larger requests get a 413 error. With a limit, Traefik holds each request until it has arrived in full."
        value={s.maxBodyBytes ? +(s.maxBodyBytes / MB).toFixed(2) : 0} onChange={mb => set({ maxBodyBytes: Math.round(mb * MB) || undefined })} />

      <h3 className="spec-label">Access</h3>
      <Field label="Allowed IP Addresses" htmlFor="rs-ips" optional error={errors.allowedIPs} hint="Only these addresses or ranges reach the app. Empty allows everyone.">
        <TagInput id="rs-ips" values={s.allowedIPs ?? []} onChange={allowedIPs => set({ allowedIPs })} placeholder="e.g. 192.168.1.0/24" invalidMsg={errors.allowedIPs} />
      </Field>

      {forwards && (
        <>
          <h3 className="spec-label">Connection To The App</h3>
          <StepSlider id="rs-connect" label="Connect Timeout" unit="s" steps={TIMEOUT_STEPS} format={formatTime} error={errors.connectTimeout}
            hint="How long Traefik tries to reach the app before giving up." value={s.connectTimeout ?? 0} onChange={v => set({ connectTimeout: Math.round(v) || undefined })} />
          <StepSlider id="rs-response" label="Response Timeout" unit="s" steps={TIMEOUT_STEPS} format={formatTime} error={errors.responseTimeout}
            hint="How long the app can take to start answering. The default has no limit." value={s.responseTimeout ?? 0} onChange={v => set({ responseTimeout: Math.round(v) || undefined })} />
          <SettingRow title="Send Public Domain To App" description="Off sends the app's own address as the Host header. Some external services need this." checked={!s.hidePublicDomain} onChange={v => set({ hidePublicDomain: !v || undefined })} />
          <SettingRow title="Skip App Certificate Check" description="For apps on HTTPS with a self-signed certificate. Traefik no longer verifies who it talks to." checked={!!s.skipCertificateCheck} onChange={v => set({ skipCertificateCheck: v || undefined })} />
        </>
      )}

      <h3 className="spec-label">Responses</h3>
      <SettingRow title="Compress Responses" description="Smaller pages over gzip, Brotli or Zstandard." checked={!!s.compress} onChange={v => set({ compress: v || undefined })} />
      <SettingRow title="Block Embedding In Frames" description="Other sites can't show this app inside a frame." checked={!!s.blockFrames} onChange={v => set({ blockFrames: v || undefined })} />
      <SettingRow title="Block Content Type Sniffing" description="Browsers must follow the file type the app declares." checked={!!s.blockSniffing} onChange={v => set({ blockSniffing: v || undefined })} />

      <h3 className="spec-label">Headers</h3>
      <Field label="Headers Sent To The App" optional error={errors.requestHeaders} hint="Header name, then value. An empty value removes the header.">
        <KVField value={s.requestHeaders ?? {}} onChange={requestHeaders => set({ requestHeaders })} addLabel="Add Header" />
      </Field>
      <Field label="Headers Sent To The Visitor" optional error={errors.responseHeaders} hint="Header name, then value. An empty value removes the header.">
        <KVField value={s.responseHeaders ?? {}} onChange={responseHeaders => set({ responseHeaders })} addLabel="Add Header" />
      </Field>

      <h3 className="spec-label">Paths And Redirects</h3>
      <div className="field-row">
        <Field label="Rewrite Path From" htmlFor="rs-rw-from" optional error={errors.rewritePattern} hint="A regular expression on the path.">
          <input className="input mono" {...invalid("rs-rw-from", errors.rewritePattern)} placeholder="^/api/(.*)$" value={s.rewritePattern ?? ""} onChange={e => set({ rewritePattern: e.target.value || undefined })} />
        </Field>
        <Field label="Rewrite Path To" htmlFor="rs-rw-to" optional hint="What the app receives.">
          <input className="input mono" {...invalid("rs-rw-to")} placeholder="/${1}" value={s.rewriteTarget ?? ""} onChange={e => set({ rewriteTarget: e.target.value || undefined })} />
        </Field>
      </div>
      <div className="field-row">
        <Field label="Redirect Visitors From" htmlFor="rs-rd-from" optional error={errors.redirectPattern} hint="A regular expression on the full URL.">
          <input className="input mono" {...invalid("rs-rd-from", errors.redirectPattern)} placeholder="^https://old\.example\.com/(.*)$" value={s.redirectPattern ?? ""} onChange={e => set({ redirectPattern: e.target.value || undefined })} />
        </Field>
        <Field label="Redirect Visitors To" htmlFor="rs-rd-to" optional hint="The address they land on.">
          <input className="input mono" {...invalid("rs-rd-to")} placeholder="https://new.example.com/${1}" value={s.redirectTarget ?? ""} onChange={e => set({ redirectTarget: e.target.value || undefined })} />
        </Field>
      </div>
      <SettingRow title="Permanent Redirect" description="Browsers remember it (301). Leave off while testing." checked={!!s.redirectPermanent} disabled={!s.redirectPattern} onChange={v => set({ redirectPermanent: v || undefined })} />
    </>
  );
}

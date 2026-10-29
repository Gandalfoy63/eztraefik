// Docs: docs/05 - UI-UX/Components.md
// Toasts, badges, empty / error / loading states.
import { createContext, useCallback, useContext, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, TriangleAlert, X, type LucideIcon } from "lucide-react";

type ToastKind = "success" | "error" | "warning";
interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
  leaving?: boolean;
}

const ToastCtx = createContext<(text: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = useCallback((id: number) => {
    setToasts(t => t.map(x => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 160);
  }, []);
  const push = useCallback(
    (text: string, kind: ToastKind = "success") => {
      const id = Date.now() + Math.random();
      setToasts(t => [...t, { id, kind, text }]);
      setTimeout(() => remove(id), kind === "success" ? 5000 : 9000);
    },
    [remove],
  );
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => {
          const Icon = t.kind === "success" ? CircleCheck : t.kind === "warning" ? TriangleAlert : CircleAlert;
          return (
            <div key={t.id} className={`toast is-${t.kind}${t.leaving ? " is-leaving" : ""}`}>
              <Icon aria-hidden="true" />
              <span className="grow">{t.text}</span>
              <button className="icon-btn" type="button" aria-label="Dismiss" onClick={() => remove(t.id)}>
                <X className="icon-sm" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export type Tone = "success" | "warning" | "danger" | "accent" | "neutral";

export function Badge({ tone = "neutral", dot = true, children, mono }: { tone?: Tone; dot?: boolean; children: ReactNode; mono?: boolean }) {
  return <span className={`badge${tone !== "neutral" ? " is-" + tone : ""}${dot ? "" : " no-dot"}${mono ? " proto" : ""}`}>{children}</span>;
}

// statusTone maps Traefik's object status to a badge tone.
export function statusTone(status?: string, errors?: string[] | null): Tone {
  if (errors && errors.length) return "danger";
  if (status === "enabled") return "success";
  if (status === "warning") return "warning";
  if (status === "disabled") return "danger";
  return "neutral";
}

export function Empty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorBox({ title = "Something went wrong.", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="alert is-danger" role="alert">
      <CircleAlert aria-hidden="true" />
      <div className="grow">
        <strong>{title}</strong> <span className="muted">{message}</span>
      </div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Warnings({ items }: { items?: string[] | null }) {
  if (!items || !items.length) return null;
  return (
    <div className="alert is-warning" role="status">
      <TriangleAlert aria-hidden="true" />
      <div>
        <strong>Traefik reported a problem.</strong>
        <ul className="plain-list">
          {items.map((w, i) => (
            <li key={i} className="muted">
              {w}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="spinner" role="status">
      <LoaderCircle className="spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${90 - ((i * 17) % 35)}%` }} />
      ))}
    </div>
  );
}

// Button with a loading state. `busy` swaps the label and blocks double submits.
export function Button({
  variant = "secondary", size, busy, busyLabel, icon: Icon, children, className = "", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm";
  busy?: boolean;
  busyLabel?: string;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      {...rest}
      className={`btn btn-${variant}${size ? " btn-" + size : ""}${busy ? " is-loading" : ""} ${className}`}
      disabled={rest.disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : Icon ? <Icon aria-hidden="true" /> : null}
      <span className="btn-label">{busy && busyLabel ? busyLabel : children}</span>
    </button>
  );
}

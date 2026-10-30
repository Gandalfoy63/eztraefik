// Docs: docs/05 - UI-UX/Components.md
// Centered window with optional tabs, focus trap, Esc to close, and a confirm dialog built on it.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./feedback";

export function Modal({
  open, onClose, title, description, children, footer, width = 620, labelledBy,
}: { open: boolean; onClose: () => void; title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number; labelledBy?: string }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const titleId = labelledBy || "modal-title-" + title.replace(/\W+/g, "-").toLowerCase();

  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement as HTMLElement;
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    } else if (mounted) {
      setShown(false);
      const t = setTimeout(() => setMounted(false), 160);
      lastFocus.current?.focus?.();
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted || !open) return;
    const t = setTimeout(() => {
      const first = boxRef.current?.querySelector<HTMLElement>("[data-autofocus], input:not([disabled]), select, textarea");
      (first || boxRef.current)?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      // An open dropdown inside the window takes Escape first.
      if (e.key === "Escape" && (e.target as HTMLElement).getAttribute?.("aria-expanded") === "true") return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && boxRef.current) {
        const f = [...boxRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, summary, [tabindex="0"]')].filter(
          el => el.offsetParent !== null && el.tabIndex !== -1,
        );
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [mounted, onClose]);

  if (!mounted) return null;
  return (
    <>
      <div className={`scrim${shown ? " is-open" : ""}`} onClick={onClose} />
      <div className={`modal-layer${shown ? " is-open" : " is-closing"}`} onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={boxRef} tabIndex={-1} style={{ width: `min(${width}px, 100%)` }}>
          <div className="modal-head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p className="hint">{description}</p>}
            </div>
            <button className="icon-btn" type="button" onClick={onClose} aria-label="Close" data-tooltip="Close (Esc)" data-tooltip-side="bottom">
              <X aria-hidden="true" />
            </button>
          </div>
          {children}
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      </div>
    </>
  );
}

export interface TabDef {
  id: string;
  label: string;
  hasError?: boolean;
}

// Tabs with a sliding indicator (transform only). The panels are rendered by the caller.
export function Tabs({ tabs, value, onChange, label }: { tabs: TabDef[]; value: string; onChange: (id: string) => void; label: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState("");
  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    if (el) setIndicator(`translateX(${el.offsetLeft}px) scaleX(${el.offsetWidth})`);
  }, [value, tabs.length]);
  const idx = tabs.findIndex(t => t.id === value);
  return (
    <div className="tabs" role="tablist" aria-label={label} ref={listRef}>
      {tabs.map(t => (
        <button
          key={t.id}
          data-tab={t.id}
          className="tab"
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-controls={`panel-${t.id}`}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={e => {
            const n = ({ ArrowRight: idx + 1, ArrowLeft: idx - 1, Home: 0, End: tabs.length - 1 } as Record<string, number>)[e.key];
            if (n === undefined) return;
            e.preventDefault();
            const next = tabs[(n + tabs.length) % tabs.length];
            onChange(next.id);
            (listRef.current?.querySelector(`[data-tab="${next.id}"]`) as HTMLElement)?.focus();
          }}
        >
          {t.label}
          {t.hasError && <span className="tab-dot" aria-label="has errors" />}
        </button>
      ))}
      <span className="tab-indicator" aria-hidden="true" style={{ transform: indicator }} />
    </div>
  );
}

export function TabPanel({ id, active, children }: { id: string; active: string; children: ReactNode }) {
  if (id !== active) return null;
  return (
    <div className="tabpanel is-entering" role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>
      {children}
    </div>
  );
}

// ConfirmDialog for destructive or disruptive actions. The confirm button says exactly what happens.
export function ConfirmDialog({
  open, title, children, confirmLabel, danger, busy, onConfirm, onClose,
}: { open: boolean; title: string; children: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={460}
      footer={
        <>
          <Button onClick={onClose} data-autofocus>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="modal-body confirm-body">{children}</div>
    </Modal>
  );
}

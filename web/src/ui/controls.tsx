// Docs: docs/05 - UI-UX/Components.md
// Form controls: labeled field with hint or error, switch, segmented radio group, tag input.
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CircleAlert, X, type LucideIcon } from "lucide-react";

export function Field({
  label, hint, error, optional, children, htmlFor, className = "",
}: { label: ReactNode; hint?: ReactNode; error?: string | null; optional?: boolean; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={`field ${className}`}>
      <label className="label" htmlFor={htmlFor}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      {children}
      {error ? (
        <span className="error" id={htmlFor ? htmlFor + "-msg" : undefined}>
          <CircleAlert aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className="hint" id={htmlFor ? htmlFor + "-msg" : undefined}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

// inputProps wires aria-invalid and aria-describedby for an input inside <Field>.
export function invalid(id: string, error?: string | null) {
  return { id, "aria-invalid": error ? true : undefined, "aria-describedby": id + "-msg" } as const;
}

export function Switch({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; id?: string }) {
  return (
    <span className="switch">
      <button type="button" role="switch" id={id} aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />
    </span>
  );
}

// SettingRow: label and description on the left, a switch on the right.
export function SettingRow({ title, description, checked, onChange, disabled }: { title: string; description?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="setting-row">
      <div>
        <div className="label">{title}</div>
        {description && <div className="hint">{description}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, label,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: LucideIcon }[]; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={el => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={e => onKey(e, i)}
        >
          {o.icon && <o.icon className="icon-sm" aria-hidden="true" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// TagInput edits a list of short values (domains, IPs). Enter, comma or space adds; Backspace on empty removes the last.
export function TagInput({
  values, onChange, placeholder, id, mono = true, invalidMsg, normalize = (s: string) => s.trim(),
}: { values: string[]; onChange: (v: string[]) => void; placeholder?: string; id?: string; mono?: boolean; invalidMsg?: string | null; normalize?: (s: string) => string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const parts = draft.split(/[\s,]+/).map(normalize).filter(Boolean);
    if (parts.length) onChange([...values, ...parts.filter(p => !values.includes(p))]);
    setDraft("");
  };
  return (
    <div className={`tag-input${invalidMsg ? " is-invalid" : ""}`} onClick={e => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}>
      {values.map(v => (
        <span key={v} className={`tag${mono ? " mono" : ""}`}>
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter(x => x !== v))}>
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id={id}
        className={mono ? "mono" : ""}
        value={draft}
        placeholder={values.length ? "" : placeholder}
        aria-invalid={invalidMsg ? true : undefined}
        aria-describedby={id ? id + "-msg" : undefined}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === "," || e.key === " ") {
            if (draft.trim()) {
              e.preventDefault();
              commit();
            } else if (e.key === "Enter") e.preventDefault();
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
      />
    </div>
  );
}

export function useFieldId(prefix: string) {
  return prefix + "-" + useId().replace(/:/g, "");
}

// CheckChips: multi-select as labeled checkboxes.
export function CheckChips({ options, values, onChange, label }: { options: { value: string; label: ReactNode }[]; values: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="check-list" role="group" aria-label={label}>
      {options.map(o => (
        <label key={o.value} className="check">
          <input
            type="checkbox"
            checked={values.includes(o.value)}
            onChange={e => onChange(e.target.checked ? [...values, o.value] : values.filter(v => v !== o.value))}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

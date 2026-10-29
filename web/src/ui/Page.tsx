// Docs: docs/05 - UI-UX/Components.md
import type { ReactNode } from "react";

// PageHeader: one title, one line of description, one primary action at the top right.
export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", flush }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {typeof title === "string" ? <h2>{title}</h2> : title}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {flush ? children : <div className="card-body">{children}</div>}
    </section>
  );
}

export function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <pre className="code-block" aria-label={label} tabIndex={0}>
      {children}
    </pre>
  );
}

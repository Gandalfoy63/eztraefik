// Docs: docs/03 - Features/Certificates.md
// Shown after saving a resolver: offers to apply it to Traefik now, and checks each of its domains.
import { useState } from "react";
import { CircleAlert, CircleCheck, Clock, Plus, RotateCw } from "lucide-react";
import { api, type Cert, type DomainInfo } from "../api";
import { Badge, Button, Spinner } from "../ui/feedback";
import { Modal } from "../ui/Modal";
import { covers } from "../ui/certs";
import { daysUntil, useLoad } from "../ui/hooks";
import { navigate } from "../app/router";
import { useTraefik } from "./traefikConfig";

type Row = { icon: "ok" | "bad" | "wait"; text: string };

function Status({ icon, text }: Row) {
  const Icon = icon === "ok" ? CircleCheck : icon === "bad" ? CircleAlert : Clock;
  return <span className="inline-status"><Icon className={`icon-sm ${icon === "wait" ? "muted" : icon}`} aria-hidden="true" />{text}</span>;
}

function DomainCheck({ tag, info, certs, stamp }: { tag: string; info?: DomainInfo; certs: Cert[]; stamp: number }) {
  const name = tag.replace(/^\*\./, "");
  const dns = useLoad(() => api.get<{ resolves: boolean; addresses: string[] }>(`/domains/${encodeURIComponent(name)}/dns`), [name, stamp]);
  // A wildcard certificate has to cover the wildcard itself, not only the bare domain.
  const cert = certs.find(c => (c.domains.length ? c.domains : [c.main]).some(n => (tag.startsWith("*.") ? n === tag : covers(n, name))));
  const days = cert ? daysUntil(cert.notAfter) : 0;
  const routes = info?.routes.length ?? 0;
  return (
    <li className="check-row">
      <div className="check-row-head">
        <span className="mono">{tag}</span>
        {!routes && !cert && <Button size="sm" icon={Plus} onClick={() => navigate("routes", { new: "1", host: name })}>Add Route</Button>}
      </div>
      <dl className="check-facts">
        <dt>DNS</dt>
        <dd>{dns.loading && !dns.data ? <Spinner label="Checking DNS" /> : dns.data?.resolves
          ? <Status icon="ok" text={`Points to ${dns.data.addresses.slice(0, 2).join(", ")}. Check that this is your server.`} />
          : <Status icon="bad" text="No DNS record yet. Point this name at your server." />}</dd>
        <dt>Certificate</dt>
        <dd>{cert ? <Status icon={days < 0 ? "bad" : "ok"} text={days < 0 ? "Expired" : `Issued, ${days} days left`} />
          : routes ? <Status icon="wait" text={`Requested on the first visit to ${routes === 1 ? "its route" : `one of its ${routes} routes`}.`} />
          : <Status icon="wait" text="Requested once a route on this domain gets its first visit." />}</dd>
      </dl>
    </li>
  );
}

export function ResolverChecks({ name, domains, onClose, onApplied }: { name: string; domains: string[]; onClose: () => void; onApplied: () => void }) {
  const [stamp, setStamp] = useState(0);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const traefik = useTraefik();
  const list = useLoad(() => api.get<{ domains: DomainInfo[]; certificates: Cert[] }>("/domains"), [stamp], 15000);
  const t = traefik.data;
  const recheck = () => {
    setStamp(s => s + 1);
    traefik.reload();
  };
  const apply = async () => {
    setApplying(true);
    setApplyError(null);
    try {
      await api.post("/traefik/apply");
      onApplied();
      recheck();
    } catch (e) {
      setApplyError((e as Error).message);
    } finally {
      setApplying(false);
    }
  };
  const needsApply = !!t && (t.pending || !t.status.exists);
  return (
    <Modal open onClose={onClose} title={`Resolver ${name} saved`} description="Apply it to Traefik, then check that its domains are ready."
      footer={<><Button icon={RotateCw} onClick={recheck}>Check Again</Button><Button variant="primary" onClick={onClose}>Done</Button></>}>
      <div className="modal-body">
        <div className="setting-row">
          <div>
            <div className="label">Traefik</div>
            {!t ? <Spinner label="Checking Traefik" /> : applying ? <div className="hint">Recreating Traefik...</div>
              : needsApply ? <div className="hint">{t.status.exists ? "This resolver isn't active yet. Applying recreates Traefik, so your routes stop answering for a few seconds." : "Traefik isn't created yet. This creates it with this resolver."}</div>
              : <Status icon="ok" text="This resolver is active." />}
            {applyError && <span className="error"><CircleAlert aria-hidden="true" />{applyError}</span>}
          </div>
          {needsApply && <Button variant="primary" busy={applying} busyLabel="Applying" onClick={apply}>{t?.status.exists ? "Apply Now" : "Create Traefik"}</Button>}
        </div>
        <h3 className="spec-label check-title">Domains</h3>
        {domains.length ? (
          <ul className="check-rows">
            {domains.map(tag => <DomainCheck key={tag} tag={tag} stamp={stamp} info={list.data?.domains.find(d => d.name === tag.replace(/^\*\./, ""))} certs={list.data?.certificates ?? []} />)}
          </ul>
        ) : <p className="hint"><Badge dot={false}>Any domain</Badge> This resolver has no domain of its own. Routes can still pick it.</p>}
      </div>
    </Modal>
  );
}

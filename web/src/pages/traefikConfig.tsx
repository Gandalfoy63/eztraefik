// Docs: docs/03 - Features/Traefik Container.md
// Shared access to the Traefik install config, used by Traefik, Entrypoints and Certificates pages.
// Saving stores the config; applying (recreating the container) happens only on the Traefik page.
import { RotateCw } from "lucide-react";
import { api, type TraefikConfig, type TraefikStatus } from "../api";
import { useLoad } from "../ui/hooks";

export interface TraefikData {
  config: TraefikConfig;
  status: TraefikStatus;
  statusError?: string;
  version: { Version: string; startDate: string } | null;
  pending: boolean;
  flags: string[];
  env: string[];
  diff?: { addedFlags: string[] | null; removedFlags: string[] | null; addedEnv: string[] | null; removedEnv: string[] | null; imageFrom: string; imageTo: string };
}

export function useTraefik(poll = 0) {
  return useLoad(() => api.get<TraefikData>("/traefik"), [], poll);
}

export async function saveTraefik(config: TraefikConfig) {
  return api.put<{ config: TraefikConfig }>("/traefik", config);
}

// PendingBanner tells the user that saved settings wait for a Traefik restart, and where to apply them.
export function PendingBanner({ pending, onTraefikPage }: { pending?: boolean; onTraefikPage?: boolean }) {
  if (!pending) return null;
  return (
    <div className="alert is-warning pending-banner" role="status">
      <RotateCw aria-hidden="true" />
      <div className="grow">
        <strong>Saved, not applied yet.</strong>{" "}
        <span className="muted">These settings take effect when Traefik is recreated (a few seconds of downtime).</span>
      </div>
      {!onTraefikPage && <a className="btn btn-secondary btn-sm" href="#traefik">Review and apply</a>}
    </div>
  );
}

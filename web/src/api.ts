// Docs: docs/06 - API/API Overview.md
// Typed client for eztraefik's REST API. Mutations send X-EZT, which the server requires (CSRF guard).

export class ApiError extends Error {
  status: number;
  field?: string;
  constructor(status: number, message: string, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(method !== "GET" ? { "X-EZT": "1" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth")) onUnauthorized();
    throw new ApiError(res.status, data?.error || `Request failed (${res.status}).`, data?.field);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => call<T>("GET", p),
  post: <T>(p: string, b?: unknown) => call<T>("POST", p, b ?? {}),
  put: <T>(p: string, b: unknown) => call<T>("PUT", p, b),
  del: <T>(p: string) => call<T>("DELETE", p),
};

// ---------- Types (mirror server/internal/store/model.go) ----------

export type Protocol = "http" | "tcp" | "udp";

export interface Entrypoint {
  name: string;
  port: number;
  protocol: "tcp" | "udp";
  hostPort: number;
  redirectTo?: string;
  http3?: boolean;
  trustedIPs?: string[];
  defaultResolver?: string;
}

export interface Resolver {
  name: string;
  email: string;
  challenge: "http" | "tls" | "dns";
  httpEntrypoint?: string;
  dnsProvider?: string;
  caServer?: string;
  caCertPEM?: string;
}

export interface EnvVar {
  key: string;
  value: string;
  secret: boolean;
}

export interface TraefikConfig {
  image: string;
  containerName: string;
  network: string;
  entrypoints: Entrypoint[];
  resolvers: Resolver[];
  env: EnvVar[];
  extraFlags: string[];
  logLevel: string;
  accessLog: boolean;
  dockerProvider: boolean;
  exposedByDefault: boolean;
  dashboardPort: number;
}

export interface Target {
  kind: "docker" | "ip" | "service";
  container?: string;
  address?: string;
  port?: number;
  scheme?: "http" | "https";
  service?: string;
}

export interface RouteTLS {
  enabled: boolean;
  mode: "resolver" | "existing" | "passthrough";
  resolver?: string;
  domain?: string;
  redirect: boolean;
}

export interface Route {
  id: string;
  name: string;
  protocol: Protocol;
  hosts: string[];
  pathPrefix?: string;
  rawRule?: string;
  entrypoints: string[];
  target: Target;
  middlewares: string[];
  tls: RouteTLS;
  priority?: number;
  enabled: boolean;
  updatedAt?: string;
  settings?: RouteSettings;
}

export interface RouteSettings {
  maxBodyBytes?: number;
  connectTimeout?: number;
  responseTimeout?: number;
  skipCertificateCheck?: boolean;
  hidePublicDomain?: boolean;
  compress?: boolean;
  blockFrames?: boolean;
  blockSniffing?: boolean;
  allowedIPs?: string[];
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  rewritePattern?: string;
  rewriteTarget?: string;
  redirectPattern?: string;
  redirectTarget?: string;
  redirectPermanent?: boolean;
}

export interface RuntimeRouter {
  name: string;
  provider: string;
  protocol: Protocol;
  rule: string;
  entryPoints: string[];
  service: string;
  middlewares: string[] | null;
  tls: boolean;
  status: string;
  errors: string[] | null;
}

export interface RouteItem extends Route {
  rule: string;
  runtime?: RuntimeRouter;
}

export interface Service {
  id: string;
  name: string;
  protocol: Protocol;
  kind: "loadbalancer" | "weighted" | "failover" | "mirroring";
  servers: string[];
  weighted?: { service: string; weight: number }[];
  failover?: { service: string; fallback: string };
  mirroring?: { service: string; mirrors: { service: string; weight: number }[] };
  healthCheck?: { path: string; interval: string; timeout: string };
  sticky?: boolean;
  passHostHeader?: boolean;
  insecureSkipVerify?: boolean;
}

export interface RuntimeService {
  name: string;
  provider: string;
  protocol: Protocol;
  type: string;
  status: string;
  servers: string[];
  serverStatus: Record<string, string> | null;
  usedBy: string[] | null;
  errors: string[] | null;
}

export interface Middleware {
  id: string;
  name: string;
  protocol: "http" | "tcp";
  type: string;
  config: Record<string, any>;
}

export interface RuntimeMiddleware {
  name: string;
  provider: string;
  protocol: string;
  type: string;
  status: string;
  usedBy: string[] | null;
  errors: string[] | null;
}

export interface Cert {
  id: string;
  source: "acme" | "uploaded";
  resolver?: string;
  main: string;
  domains: string[];
  issuer: string;
  notAfter: string;
  name?: string;
}

export interface DomainInfo {
  name: string;
  explicit: boolean;
  resolver?: string;
  wildcard: boolean;
  hosts: string[];
  routes: string[];
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  networks: string[];
  ports: { IP?: string; PrivatePort: number; PublicPort?: number; Type: string }[];
  traefikLabels: Record<string, string>;
  reachable: boolean;
  role?: string;
  routes: string[];
  exposedPorts: number[];
}

export interface HistoryEntry {
  id: number;
  time: string;
  message: string;
  user: string;
}

export interface Point {
  t: number;
  requests: number;
  c2xx: number;
  c3xx: number;
  c4xx: number;
  c5xx: number;
  durSum: number;
  p95: number;
}

export interface TraefikStatus {
  exists: boolean;
  running: boolean;
  state: string;
  startedAt: string;
  image: string;
  id: string;
  configHash: string;
  managed: boolean;
}

export interface Meta {
  version: string;
  onboarded: boolean;
  signedIn: boolean;
  user: string;
  devMode: boolean;
}

export interface SaveResult {
  warnings?: string[] | null;
}

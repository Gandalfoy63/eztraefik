// Docs: docs/03 - Features/Certificates.md
// covers reports whether a certificate name (possibly *.wildcard, one level deep) matches a host.
export function covers(name: string, host: string): boolean {
  name = name.toLowerCase();
  host = host.toLowerCase();
  if (name === host) return true;
  if (name.startsWith("*.")) {
    const suffix = name.slice(1);
    return host.endsWith(suffix) && !host.slice(0, -suffix.length).includes(".");
  }
  return false;
}

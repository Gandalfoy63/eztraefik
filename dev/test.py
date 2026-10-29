#!/usr/bin/env python3
# Docs: docs/08 - Deployment/Dev Environment.md
# End-to-end test of eztraefik in the dev environment. Drives the real API, then sends real traffic through
# the Traefik container eztraefik created, using fake domains (*.ezt.test) resolved to this host.
#
#   docker compose -f dev/compose.yml up -d --build
#   python3 dev/test.py            # fresh environment: runs the setup wizard through the API first
#
# Standard library only. Exit code 0 means every check passed.
import http.cookiejar, json, os, socket, ssl, sys, time, urllib.error, urllib.request

UI = os.environ.get("EZT_URL", "http://127.0.0.1:5181")
HOST_IP = os.environ.get("EZT_HOST_IP", "127.0.0.1")  # where Traefik's published ports are
def _lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.0.2.1", 9))  # no packet is sent; this only picks the outgoing interface
        return s.getsockname()[0]
    finally:
        s.close()


LAN_IP = os.environ.get("EZT_LAN_IP") or _lan_ip()  # the "IP address" target: a port published on this host
HTTP, HTTPS, TCP_PORT, UDP_PORT = 18080, 18443, 15432, 15353
USER, PASSWORD = "admin", "dev-password-1234"

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
results = []


def api(method, path, body=None, ok=(200,)):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(UI + "/api/v1" + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if method != "GET":
        req.add_header("X-EZT", "1")
    try:
        with opener.open(req, timeout=120) as r:
            status, raw = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    out = json.loads(raw or b"{}")
    if status not in ok:
        raise RuntimeError(f"{method} {path} -> {status}: {out}")
    return out


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"  ({detail})" if detail and not cond else ""))


def https_get(host, path="/", auth=None, port=HTTPS):
    """GET through Traefik with SNI and Host set to the fake domain, like curl --resolve."""
    ctx = ssl.create_default_context(cafile=None)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with socket.create_connection((HOST_IP, port), timeout=10) as raw:
        with ctx.wrap_socket(raw, server_hostname=host) as s:
            cert = s.getpeercert(binary_form=True)
            hdr = f"GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n"
            if auth:
                import base64
                hdr += "Authorization: Basic " + base64.b64encode(auth.encode()).decode() + "\r\n"
            s.sendall((hdr + "\r\n").encode())
            data = b""
            while chunk := s.recv(65536):
                data += chunk
    head, _, body = data.partition(b"\r\n\r\n")
    status = int(head.split()[1])
    return status, body.decode(errors="replace"), cert


def http_get(host, path="/"):
    with socket.create_connection((HOST_IP, HTTP), timeout=10) as s:
        s.sendall(f"GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n".encode())
        data = b""
        while chunk := s.recv(65536):
            data += chunk
    head = data.split(b"\r\n\r\n")[0].decode()
    loc = next((l.split(": ", 1)[1] for l in head.split("\r\n") if l.lower().startswith("location:")), "")
    return int(head.split()[1]), loc


def issuer_of(der):
    # Minimal: Pebble's intermediate CN contains "Pebble". Search the DER bytes instead of parsing ASN.1.
    return "Pebble" if b"Pebble" in der else "other"


def wait(what, fn, timeout=90):
    end = time.time() + timeout
    last = None
    while time.time() < end:
        try:
            v = fn()
            if v:
                return v
        except Exception as e:  # noqa: BLE001 - retry until timeout
            last = e
        time.sleep(2)
    raise RuntimeError(f"timed out waiting for {what}: {last}")


def main():
    print(f"eztraefik at {UI}, Traefik on {HOST_IP}:{HTTP}/{HTTPS}, LAN IP {LAN_IP}")
    meta = api("GET", "/meta")
    print(f"version {meta['version']}, onboarded={meta['onboarded']}")

    print("\n1. Setup wizard")
    if not meta["onboarded"]:
        chk = api("GET", "/onboarding/check")
        check("Docker reachable from eztraefik", chk["docker"]["ok"])
        check("Dev defaults offered (fake ports, Pebble)", chk["defaults"]["httpPort"] == HTTP and "pebble" in chk["defaults"]["caServer"])
        res = api("POST", "/onboarding/complete", {
            "httpPort": HTTP, "httpsPort": HTTPS, "redirect": True, "image": "traefik:v3.7.16", "domain": "ezt.test",
            "certMode": "http", "email": "dev@ezt.test", "caServer": chk["defaults"]["caServer"], "caCertPEM": chk["defaults"]["caCertPEM"],
            "username": USER, "password": PASSWORD,
        })
        check("Setup created and started Traefik", res.get("applied"), res.get("error", ""))
    else:
        api("POST", "/auth/login", {"username": USER, "password": PASSWORD})
        check("Signed in", True)
    wait("Traefik API", lambda: api("GET", "/overview")["traefik"]["reachable"])
    check("Traefik reachable through its internal API", True)

    print("\n2. Custom ports (TCP 15432, UDP 15353)")
    t = api("GET", "/traefik")["config"]
    names = [e["name"] for e in t["entrypoints"]]
    if "pg" not in names:
        t["entrypoints"] += [{"name": "pg", "port": 5432, "protocol": "tcp", "hostPort": TCP_PORT},
                             {"name": "dns", "port": 53, "protocol": "udp", "hostPort": UDP_PORT}]
        api("PUT", "/traefik", t)
        check("New entrypoints wait for Apply", api("GET", "/traefik")["pending"])
    else:
        check("Custom entrypoints already configured (repeat run)", True)
    api("POST", "/traefik/apply")
    wait("Traefik after apply", lambda: api("GET", "/overview")["traefik"]["reachable"])
    check("Traefik recreated, nothing pending", not api("GET", "/traefik")["pending"])

    print("\n3. Middleware, service and routes")
    existing = {r["name"]: r for r in api("GET", "/routes")["routes"]}
    for r in existing.values():
        api("DELETE", f"/routes/{r['id']}")
    for m in api("GET", "/middlewares")["middlewares"]:
        api("DELETE", f"/middlewares/{m['id']}")
    for s in api("GET", "/services")["services"]:
        api("DELETE", f"/services/{s['id']}")
    user = api("POST", "/tools/htpasswd", {"username": "alice", "password": "secret-pass"})["user"]
    check("Basic auth password hashed as apr1", user.startswith("alice:$apr1$"))
    api("POST", "/middlewares", {"name": "team-only", "protocol": "http", "type": "basicAuth", "config": {"users": [user]}})
    api("POST", "/services", {"name": "pool", "protocol": "http", "kind": "loadbalancer",
                              "servers": ["http://ezt-dev-app-a:80", "http://ezt-dev-app-b:80"]})
    tls = {"enabled": True, "mode": "resolver", "resolver": "acme", "redirect": True}
    routes = [
        {"name": "app-a", "protocol": "http", "hosts": ["a.ezt.test"], "target": {"kind": "docker", "container": "ezt-dev-app-a", "port": 80}, "tls": tls},
        {"name": "app-c", "protocol": "http", "hosts": ["c.ezt.test"], "target": {"kind": "docker", "container": "ezt-dev-app-c", "port": 80}, "tls": tls},
        {"name": "external", "protocol": "http", "hosts": ["ext.ezt.test"], "target": {"kind": "ip", "address": LAN_IP, "port": 18090}, "tls": tls},
        {"name": "secure", "protocol": "http", "hosts": ["secure.ezt.test"], "target": {"kind": "docker", "container": "ezt-dev-app-b", "port": 80}, "tls": tls, "middlewares": ["team-only"]},
        {"name": "pool", "protocol": "http", "hosts": ["pool.ezt.test"], "target": {"kind": "service", "service": "pool"}, "tls": tls},
        {"name": "plain", "protocol": "http", "hosts": ["plain.ezt.test"], "target": {"kind": "docker", "container": "ezt-dev-app-a", "port": 80}, "tls": {"enabled": False, "mode": "resolver", "redirect": False}},
        {"name": "pg", "protocol": "tcp", "hosts": [], "entrypoints": ["pg"], "target": {"kind": "docker", "container": "ezt-dev-tcp-echo", "port": 8080}, "tls": {"enabled": False, "mode": "resolver", "redirect": False}},
        {"name": "dns", "protocol": "udp", "entrypoints": ["dns"], "target": {"kind": "docker", "container": "ezt-dev-udp-echo", "port": 8080}, "tls": {"enabled": False, "mode": "resolver", "redirect": False}},
    ]
    # A plain HTTP route can't live on an entrypoint that redirects everything: eztraefik must refuse it.
    # Make sure web redirects (as after setup) so the test also works on an environment it already ran on.
    t = api("GET", "/traefik")["config"]
    for e in t["entrypoints"]:
        if e["name"] == "web":
            e["redirectTo"] = "websecure"
    api("PUT", "/traefik", t)
    plain = next(r for r in routes if r["name"] == "plain")
    err = api("POST", "/routes", {**plain, "entrypoints": [], "middlewares": [], "enabled": True}, ok=(422,))
    check("Plain HTTP route refused while web redirects everything", err.get("field") == "entrypoints")
    t = api("GET", "/traefik")["config"]
    for e in t["entrypoints"]:
        if e["name"] == "web":
            e["redirectTo"] = ""  # rely on per-route redirects instead
    api("PUT", "/traefik", t)
    api("POST", "/traefik/apply")
    wait("Traefik after apply", lambda: api("GET", "/overview")["traefik"]["reachable"])
    warnings = []
    for r in routes:
        r.setdefault("entrypoints", [])
        r.setdefault("middlewares", [])
        r["enabled"] = True
        out = api("POST", "/routes", r)
        warnings += out.get("warnings") or []
    check("8 routes saved without Traefik errors", not warnings, "; ".join(warnings))
    bad = api("POST", "/routes", {"name": "Bad Name", "protocol": "http", "hosts": ["x.ezt.test"], "target": {"kind": "docker", "container": "x", "port": 80}, "tls": tls, "entrypoints": [], "middlewares": [], "enabled": True}, ok=(422,))
    check("Invalid name rejected with a field error", bad.get("field") == "name")

    print("\n4. Traffic through Traefik")
    status, body, cert = wait("HTTPS on a.ezt.test", lambda: (lambda r: r if r[0] == 200 and issuer_of(r[2]) == "Pebble" else None)(https_get("a.ezt.test")), 120)
    check("HTTPS a.ezt.test reaches container app-a", "Name: app-a" in body)
    check("Certificate issued by the ACME server (Pebble)", issuer_of(cert) == "Pebble")
    status, body, _ = https_get("c.ezt.test")
    check("Container not on the network was connected and is reached", status == 200 and "Name: app-c" in body, f"{status}")
    status, body, _ = https_get("ext.ezt.test")
    check(f"IP address target {LAN_IP}:18090 is reached", status == 200 and "Name: external-api" in body, f"{status}")
    status, _, _ = https_get("secure.ezt.test")
    check("Basic auth blocks without password (401)", status == 401, f"{status}")
    status, body, _ = https_get("secure.ezt.test", auth="alice:secret-pass")
    check("Basic auth lets alice in", status == 200 and "Name: app-b" in body, f"{status}")
    names = {https_get("pool.ezt.test")[1].split("\n")[0] for _ in range(6)}
    check("Load-balanced service spreads requests over 2 servers", len(names) == 2, str(names))
    code, loc = http_get("a.ezt.test", "/x")
    check("HTTP redirects to HTTPS on the published port 18443", code in (301, 308) and loc.startswith("https://a.ezt.test:18443/x"), f"{code} {loc}")
    with socket.create_connection((HOST_IP, HTTP), timeout=10) as s:
        s.sendall(b"GET / HTTP/1.1\r\nHost: plain.ezt.test\r\nConnection: close\r\n\r\n")
        plain = s.recv(65536).decode(errors="replace")
    check("Plain HTTP route answers without TLS", " 200 " in plain.split("\r\n")[0] and "app-a" in plain)
    with socket.create_connection((HOST_IP, TCP_PORT), timeout=10) as s:
        s.sendall(b"WHO\n")
        tcp = s.recv(4096).decode(errors="replace")
    check("TCP port 15432 reaches the TCP backend", "tcp-echo" in tcp or "Hostname" in tcp, tcp[:80])
    u = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    u.settimeout(5)
    udp = ""
    for _ in range(3):
        try:
            u.sendto(b"WHO", (HOST_IP, UDP_PORT))
            udp = u.recvfrom(4096)[0].decode(errors="replace")
            break
        except socket.timeout:
            continue
    check("UDP port 15353 reaches the UDP backend", "udp-echo" in udp or "Hostname" in udp, udp[:80])

    print("\n5. Relations, certificates, domains, stats, logs, history")
    raw = api("GET", "/runtime")
    check("Relations: router app-a@file uses service app-a@file", raw["routers"].get("app-a@file", {}).get("service") == "app-a")
    certs = api("GET", "/certificates")["certificates"]
    check("Issued certificates are listed with expiry", any(c["main"] == "a.ezt.test" and c["notAfter"] for c in certs), str([c["main"] for c in certs]))
    doms = api("GET", "/domains")["domains"]
    check("Domain ezt.test groups its hosts", any(d["name"] == "ezt.test" and "a.ezt.test" in d["hosts"] for d in doms))
    for _ in range(20):
        https_get("a.ezt.test")
    st = wait("stats", lambda: (lambda s: s if sum(p["requests"] for p in s["points"]) > 0 else None)(api("GET", "/stats?key=total&range=15m")), 90)
    check("Stats count requests", sum(p["requests"] for p in st["points"]) > 0)
    acc = api("GET", "/logs/access?limit=50")
    check("Access log has entries", len(acc["entries"]) > 0)
    tl = api("GET", "/logs/traefik?tail=50")
    check("Traefik log is readable", len(tl["lines"]) > 0)
    hist = api("GET", "/history")["entries"]
    check("Every change is in history", len(hist) >= 10)
    ov = api("GET", "/overview")
    check("Overview counts routers", ov["counts"].get("routers", 0) >= 8, str(ov["counts"]))
    plain_route = next(r for r in api("GET", "/routes")["routes"] if r["name"] == "plain")
    plain_route["enabled"] = False
    api("PUT", f"/routes/{plain_route['id']}", plain_route)
    time.sleep(1.5)
    with socket.create_connection((HOST_IP, HTTP), timeout=10) as s:
        s.sendall(b"GET / HTTP/1.1\r\nHost: plain.ezt.test\r\nConnection: close\r\n\r\n")
        off = s.recv(4096).decode(errors="replace").split("\r\n")[0]
    check("Disabled route stops answering (404)", " 404 " in off, off)

    failed = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(failed)} of {len(results)} checks passed.")
    if failed:
        print("Failed: " + "; ".join(failed))
        sys.exit(1)


if __name__ == "__main__":
    main()

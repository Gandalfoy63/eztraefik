#!/usr/bin/env python3
# Docs: docs/08 - Deployment/Dev Environment.md, docs/03 - Features/Import from NPM.md
# End-to-end test of the import from Nginx Proxy Manager, against the dev NPM (profile "npm"):
# seed NPM, check it serves, import everything into eztraefik, switch NPM's ports to Traefik,
# check the same requests now go through Traefik, then switch back to NPM.
#
#   docker compose -f dev/compose.yml --profile npm up -d --build
#   python3 dev/test.py        # once, sets up eztraefik
#   python3 dev/test_npm.py
import json, os, socket, ssl, subprocess, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test as base  # noqa: E402  (reuses its API client, checks and HTTP helpers)

NPM = "http://127.0.0.1:28081"
NPM_USER, NPM_PASS = "dev@ezt.test", "dev-password-1234"
HTTP, HTTPS, STREAM = 28080, 28443, 26432
HERE = os.path.dirname(os.path.abspath(__file__))


def npm(method, path, body=None, tok=None, multipart=None):
    data, ctype = None, "application/json"
    if multipart:
        boundary = "ezt-boundary"
        parts = []
        for name, (fname, content) in multipart.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{fname}"\r\n\r\n{content}\r\n')
        data, ctype = ("".join(parts) + f"--{boundary}--\r\n").encode(), f"multipart/form-data; boundary={boundary}"
    elif body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(NPM + "/api" + path, data=data, method=method)
    req.add_header("Content-Type", ctype)
    if tok:
        req.add_header("Authorization", "Bearer " + tok)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or b"{}")


def seed():
    """Gives the dev NPM a first admin and a sample config (once)."""
    if not npm("GET", "/")["setup"]:
        npm("POST", "/users", {"name": "Dev Admin", "nickname": "dev", "email": NPM_USER, "roles": ["admin"], "is_disabled": False,
                               "auth": {"type": "password", "secret": NPM_PASS}})
    tok = npm("POST", "/tokens", {"identity": NPM_USER, "secret": NPM_PASS})["token"]
    if npm("GET", "/nginx/proxy-hosts", tok=tok):
        return tok
    key, crt = os.path.join(HERE, ".npm-test-key.pem"), os.path.join(HERE, ".npm-test-cert.pem")
    subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt, "-days", "200",
                    "-subj", "/CN=*.npm.test", "-addext", "subjectAltName=DNS:*.npm.test,DNS:npm.test"], check=True, capture_output=True)
    cert = npm("POST", "/nginx/certificates", {"provider": "other", "nice_name": "Internal wildcard", "domain_names": [], "meta": {}}, tok)
    npm("POST", f"/nginx/certificates/{cert['id']}/upload", tok=tok,
        multipart={"certificate": ("cert.pem", open(crt).read()), "certificate_key": ("key.pem", open(key).read())})
    os.remove(key), os.remove(crt)
    acl = npm("POST", "/nginx/access-lists", {"name": "Team", "satisfy_any": False, "pass_auth": False, "items": [{"username": "alice", "password": "secret-pass"}],
                                              "clients": [{"address": "all", "directive": "allow"}]}, tok)
    common = {"ssl_forced": False, "hsts_enabled": False, "hsts_subdomains": False, "http2_support": False, "block_exploits": False, "caching_enabled": False,
              "allow_websocket_upgrade": True, "advanced_config": "", "meta": {}}
    npm("POST", "/nginx/proxy-hosts", {**common, "domain_names": ["a.npm.test"], "forward_scheme": "http", "forward_host": "ezt-dev-app-a", "forward_port": 80,
                                      "access_list_id": 0, "certificate_id": 0, "block_exploits": True,
                                      "locations": [{"path": "/api", "forward_scheme": "http", "forward_host": "ezt-dev-app-b", "forward_port": 80, "advanced_config": ""}]}, tok)
    npm("POST", "/nginx/proxy-hosts", {**common, "domain_names": ["secure.npm.test"], "forward_scheme": "http", "forward_host": "ezt-dev-app-b", "forward_port": 80,
                                      "access_list_id": acl["id"], "certificate_id": cert["id"], "ssl_forced": True, "hsts_enabled": True, "locations": []}, tok)
    npm("POST", "/nginx/redirection-hosts", {"domain_names": ["old.npm.test"], "forward_scheme": "https", "forward_domain_name": "a.npm.test", "forward_http_code": 301,
                                             "preserve_path": True, "certificate_id": 0, "ssl_forced": False, "hsts_enabled": False, "hsts_subdomains": False,
                                             "http2_support": False, "block_exploits": False, "advanced_config": "", "meta": {}}, tok)
    npm("POST", "/nginx/streams", {"incoming_port": 6432, "forwarding_host": "ezt-dev-tcp-echo", "forwarding_port": 8080, "tcp_forwarding": True, "udp_forwarding": False, "meta": {}}, tok)
    npm("POST", "/nginx/dead-hosts", {"domain_names": ["gone.npm.test"], "certificate_id": 0, "ssl_forced": False, "hsts_enabled": False, "hsts_subdomains": False,
                                      "http2_support": False, "advanced_config": "", "meta": {}}, tok)
    time.sleep(3)  # NPM reloads nginx
    return tok


def traffic(label):
    """The same requests before and after the switch must give the same answers."""
    base.HOST_IP, base.HTTP, base.HTTPS = "127.0.0.1", HTTP, HTTPS
    with socket.create_connection(("127.0.0.1", HTTP), timeout=10) as s:
        s.sendall(b"GET /x HTTP/1.1\r\nHost: a.npm.test\r\nConnection: close\r\n\r\n")
        a = b""
        while c := s.recv(65536):
            a += c
    base.check(f"{label}: a.npm.test reaches app-a", b"Name: app-a" in a, a[:60])
    with socket.create_connection(("127.0.0.1", HTTP), timeout=10) as s:
        s.sendall(b"GET /api/users HTTP/1.1\r\nHost: a.npm.test\r\nConnection: close\r\n\r\n")
        b = s.recv(65536)
    base.check(f"{label}: a.npm.test/api reaches app-b (custom location)", b"Name: app-b" in b, b[:60])
    st, _, cert = base.https_get("secure.npm.test", port=HTTPS)
    base.check(f"{label}: secure.npm.test asks for a password (401)", st == 401, str(st))
    st, body, _ = base.https_get("secure.npm.test", auth="alice:secret-pass", port=HTTPS)
    base.check(f"{label}: alice gets in with her NPM password", st == 200 and "Name: app-b" in body, str(st))
    base.check(f"{label}: secure.npm.test serves the uploaded *.npm.test certificate", b"npm.test" in cert)
    code, loc = base.http_get("old.npm.test", "/page")
    base.check(f"{label}: old.npm.test redirects to https://a.npm.test/page", code == 301 and loc == "https://a.npm.test/page", f"{code} {loc}")
    with socket.create_connection(("127.0.0.1", STREAM), timeout=10) as s:
        s.sendall(b"WHO\n")
        t = s.recv(4096)
    base.check(f"{label}: stream port {STREAM} reaches the TCP backend", b"tcp-echo" in t or b"Hostname" in t, t[:60])


def main():
    # A previous run may have left traffic on Traefik with NPM stopped: switch back first.
    base.api("POST", "/auth/login", {"username": base.USER, "password": base.PASSWORD})
    if (base.api("GET", "/migrate/npm").get("migration") or {}).get("switchedAt"):
        base.api("POST", "/migrate/npm/switch-back")
    base.wait("NPM API", lambda: npm("GET", "/"), 120)
    print("1. Seed the dev NPM")
    seed()
    base.wait("NPM serving", lambda: b"app-a" in urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{HTTP}/", headers={"Host": "a.npm.test"}), timeout=5).read(), 60)
    traffic("NPM")

    print("\n2. Import into eztraefik")
    # Remove routes from a previous run of this test, so the import is fresh.
    for r in base.api("GET", "/routes")["routes"]:
        if any(h.endswith(".npm.test") for h in r["hosts"]) or r["name"].startswith("npm-"):
            base.api("DELETE", f"/routes/{r['id']}")
    st = base.api("GET", "/migrate/npm")
    det = next((d for d in st["detected"] if d["name"] == "ezt-dev-npm"), None)
    base.check("NPM container detected with its ports", det and det["httpPort"] == HTTP and det["adminPort"] == 28081, str(det))
    res = base.api("POST", "/migrate/npm/connect", {"url": det["suggestedUrl"], "email": NPM_USER, "password": NPM_PASS, "container": det["name"]})
    plan = res["plan"]
    items = {i["id"]: i for i in plan["items"]}
    print("   plan: " + ", ".join(f"{i['id']}={i['action']}" for i in plan["items"]))
    bad = base.api("POST", "/migrate/npm/connect", {"url": det["suggestedUrl"], "email": NPM_USER, "password": "wrong"}, ok=(422,))
    base.check("Wrong NPM password is refused under the password field", bad.get("field") == "password")
    sec = next(i for i in plan["items"] if i["source"] == "secure.npm.test")
    base.check("Access list password hash copied from the NPM container", sec["action"] == "import" and not sec.get("passwords"), str(sec))
    base.check("404 host skipped with a reason", any(i["kind"] == "notfound" and i["action"] == "skip" for i in plan["items"]))
    base.check("Custom location becomes its own route", any(i["kind"] == "location" and i["action"] == "import" for i in plan["items"]))
    plan = base.api("POST", "/migrate/npm/plan", {})["plan"]
    chosen = [i["id"] for i in plan["items"] if i["action"] == "import"]
    out = base.api("POST", "/migrate/npm/import", {"items": chosen})
    base.check(f"Imported {len(chosen)} items without failures", out["imported"] == len(chosen) and not out["failed"], str(out))
    t = base.api("GET", "/traefik")["config"]
    ep = next((e for e in t["entrypoints"] if e["name"] == "npm-tcp-6432"), None)
    base.check("Stream entrypoint created, not published before the switch", ep and ep["hostPort"] == 0, str(ep))
    base.check("NPM still serves the traffic after the import", b"Name: app-a" in urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{HTTP}/", headers={"Host": "a.npm.test"}), timeout=5).read())

    print("\n3. Switch traffic to Traefik")
    base.api("POST", "/migrate/npm/switch")
    state = subprocess.run(["docker", "inspect", "-f", "{{.State.Running}}", "ezt-dev-npm"], capture_output=True, text=True).stdout.strip()
    base.check("NPM stopped (kept)", state == "false", state)
    base.wait("Traefik on NPM's ports", lambda: b"app-a" in urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{HTTP}/", headers={"Host": "a.npm.test"}), timeout=5).read(), 60)
    srv = urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{HTTP}/", headers={"Host": "a.npm.test"}), timeout=5).read()
    base.check("Requests now go through Traefik", b"X-Forwarded-Server" in srv)
    traffic("Traefik")

    print("\n4. Switch back to NPM")
    base.api("POST", "/migrate/npm/switch-back")
    base.wait("NPM back", lambda: b"app-a" in urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{HTTP}/", headers={"Host": "a.npm.test"}), timeout=5).read(), 90)
    srv = urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{HTTP}/", headers={"Host": "a.npm.test"}), timeout=5).read()
    base.check("NPM serves again, Traefik released the ports", b"X-Forwarded-Server" not in srv)
    t = base.api("GET", "/traefik")["config"]
    web = next(e for e in t["entrypoints"] if e["name"] == "web")
    base.check("Traefik back on its own ports (18080)", web["hostPort"] == 18080, str(web))

    failed = [n for n, ok in base.results if not ok]
    print(f"\n{len(base.results) - len(failed)} of {len(base.results)} checks passed.")
    if failed:
        print("Failed: " + "; ".join(failed))
        sys.exit(1)


if __name__ == "__main__":
    main()

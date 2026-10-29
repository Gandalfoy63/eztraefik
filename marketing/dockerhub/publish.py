#!/usr/bin/env python3
# Docs: docs/08 - Deployment/Docker Hub Page.md
"""Sets the Docker Hub repository's short description and overview through the Docker Hub API.

Needs a Docker Hub personal access token with Read & Write scope (hub.docker.com > Account settings > Personal access tokens):
  DOCKERHUB_USERNAME=gandasdevstudio DOCKERHUB_TOKEN=dckr_pat_... python3 marketing/dockerhub/publish.py
Optional IMAGE_BASE_URL: a public URL of marketing/logo/final, for example
  https://raw.githubusercontent.com/<user>/eztraefik/main/marketing/logo/final;
without it the overview is text only. --dry-run prints the overview instead of sending it.
"""
import json, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get("DOCKERHUB_REPO", "gandasdevstudio/eztraefik")
base = os.environ.get("IMAGE_BASE_URL", "").rstrip("/")

md = open(os.path.join(HERE, "overview.template.md")).read()
# PNG, not SVG: raw.githubusercontent.com serves SVG as text/plain, which browsers won't show in an <img>.
md = md.replace("{{LOGO}}", f'<img src="{base}/png/lockup/lockup-light-256h.png" alt="eztraefik" width="420">' if base else "# eztraefik")
desc = open(os.path.join(HERE, "description.txt")).read().strip()
if len(desc) > 100:
    sys.exit(f"description is {len(desc)} characters; Docker Hub allows 100")
if "--dry-run" in sys.argv:
    print(desc, "\n", md)
    sys.exit(0)


def call(method, url, body, token=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method=method, headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or b"{}")


user, token = os.environ.get("DOCKERHUB_USERNAME"), os.environ.get("DOCKERHUB_TOKEN")
if not user or not token:
    sys.exit("Set DOCKERHUB_USERNAME and DOCKERHUB_TOKEN (a personal access token with Read & Write scope).")
jwt = call("POST", "https://hub.docker.com/v2/users/login", {"username": user, "password": token})["token"]
out = call("PATCH", f"https://hub.docker.com/v2/repositories/{REPO}/", {"description": desc, "full_description": md}, jwt)
print(f"updated {REPO}: description {len(out.get('description', ''))} chars, overview {len(out.get('full_description', ''))} chars")

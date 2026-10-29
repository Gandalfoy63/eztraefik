# Docs: docs/04 - Architecture/Code Map.md, CLAUDE.md (section 2, Linking)
# Usage: python3 tools/check_docs.py   (run before every commit; prints OK when the vault is clean)
"""Vault check: broken wikilinks, missing backlinks among our notes, orphans, emoji, broken relative file links."""
import os, re, sys
root = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))); docs = os.path.join(root, "docs")
notes = {}
for d, _, fs in os.walk(docs):
    for f in fs:
        if f.endswith(".md"):
            p = os.path.join(d, f); notes[os.path.relpath(p, docs)[:-3]] = open(p, encoding="utf-8").read()
DL = "00 - Downloaded Docs/"
def resolve(src, target):
    target = target.split("#")[0].split("|")[0].strip()
    if target in notes: return target
    base = os.path.dirname(src)
    cand = os.path.normpath(os.path.join(base, target))
    if cand in notes: return cand
    m = [k for k in notes if k.endswith("/" + target) or k == target]
    return m[0] if len(m) == 1 else None
out = {k: set() for k in notes}; bad = []
emoji = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
for k, t in notes.items():
    if emoji.search(t): bad.append(f"EMOJI {k}")
    if k.startswith(DL) and not k.endswith("README"): continue  # third-party pages: not checked
    for m in re.finditer(r"\[\[([^\]]+)\]\]", t):
        r = resolve(k, m.group(1))
        if r is None: bad.append(f"BROKEN {k} -> {m.group(1)}")
        else: out[k].add(r)
    for m in re.finditer(r"\]\((\.\.?/[^)#]+)", t):
        p = os.path.normpath(os.path.join(docs, os.path.dirname(k), m.group(1)))
        if not os.path.exists(p): bad.append(f"FILE {k} -> {m.group(1)}")
ours = [k for k in notes if not k.startswith(DL) or k.endswith("README")]
for a in ours:
    if not notes[a].startswith("---"): bad.append(f"NOFRONT {a}")
    for b in out[a]:
        if b in ours and a not in out[b]: bad.append(f"NOBACK {b} should link {a}")
inbound = {b for a in ours for b in out[a]}
for a in ours:
    if a != "Home" and a not in inbound: bad.append(f"ORPHAN {a}")
# Code -> note: every "Docs: docs/..." comment in our source must name existing notes.
code_dirs = ["server", "web/src", "web/index.html", "web/vite.config.ts", "preview", "dev", "tools", "Dockerfile", "deploy", "marketing/logo/build", "marketing/dockerhub"]
code_files = 0
for cd in code_dirs:
    base = os.path.join(root, cd)
    paths = [base] if os.path.isfile(base) else [os.path.join(d, f) for d, _, fs in os.walk(base) if "node_modules" not in d and "/dist" not in d and "vendor" not in d for f in fs]
    for path in paths:
        if not path.endswith((".go", ".ts", ".tsx", ".css", ".html", ".js", ".py", ".sh", ".yml", "Dockerfile")):
            continue
        try:
            head = open(path, encoding="utf-8").read(600)
        except (OSError, UnicodeDecodeError):
            continue
        m = re.search(r"Docs: (.+)", head)
        if not m:
            continue
        code_files += 1
        for ref in re.findall(r"docs/[^,*\n]+?\.md", m.group(1)):
            if not os.path.exists(os.path.join(root, ref)):
                bad.append(f"CODEREF {os.path.relpath(path, root)} -> {ref}")
print("\n".join(sorted(set(bad))) or "OK", f"\n{len(ours)} own notes, {len(notes)} total, {code_files} code files with a Docs: comment")

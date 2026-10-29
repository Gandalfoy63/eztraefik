#!/usr/bin/env python3
# Docs: docs/04 - Architecture/Code Map.md, CLAUDE.md (section 2, Linking)
# Keeps code line links in the vault correct. A link whose text is a symbol name, like
#   [saveRoute](../../server/internal/api/routes.go#L120-L170)
# is re-pointed to where that symbol is defined now (Go func/type, TS function/const/interface).
# Usage: python3 tools/relink.py          rewrite stale links
#        python3 tools/relink.py --check  only report them (exit 1 if any)
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
LINK = re.compile(r"\[`?([A-Za-z_][\w.]*)`?\]\(((?:\.\./)+[^)#\s]+)#L(\d+)(?:-L(\d+))?\)")


def find(path, symbol):
    lines = open(path, encoding="utf-8").read().split("\n")
    name = symbol.split(".")[-1]
    pats = [rf"^func (\([^)]*\) )?{re.escape(name)}[\[(]", rf"^type {re.escape(name)}\b",
            rf"^(export )?(async )?function {re.escape(name)}\b", rf"^(export )?(const|let|interface|type|class) {re.escape(name)}\b",
            rf"^def {re.escape(name)}\("]
    for i, l in enumerate(lines):
        if any(re.match(p, l) for p in pats):
            if not l.rstrip().endswith(("{", "(", "[", ":")):
                return i + 1, i + 1
            for j in range(i + 1, len(lines)):
                if re.match(r"^[}\])]", lines[j]) or (l.startswith("def ") and lines[j] and not lines[j][0].isspace()):
                    return i + 1, (j + 1 if not l.startswith("def ") else j)
            return i + 1, len(lines)
    return None


def main():
    check = "--check" in sys.argv
    stale = 0
    for d, _, fs in os.walk(DOCS):
        if "00 - Downloaded Docs" in d:
            continue
        for f in fs:
            if not f.endswith(".md"):
                continue
            p = os.path.join(d, f)
            text = open(p, encoding="utf-8").read()

            def fix(m):
                nonlocal stale
                sym, rel, a, b = m.group(1), m.group(2), int(m.group(3)), int(m.group(4) or m.group(3))
                target = os.path.normpath(os.path.join(d, rel))
                if not os.path.isfile(target):
                    print(f"MISSING FILE {os.path.relpath(p, ROOT)}: {rel}")
                    stale += 1
                    return m.group(0)
                r = find(target, sym)
                if r is None:
                    return m.group(0)  # not a symbol link (for example a CSS section): left as written
                if r != (a, b):
                    stale += 1
                    print(f"{'STALE' if check else 'FIXED'} {os.path.relpath(p, ROOT)}: {sym} L{a}-L{b} -> L{r[0]}-L{r[1]}")
                return m.group(0).replace(f"#L{m.group(3)}" + (f"-L{m.group(4)}" if m.group(4) else ""), f"#L{r[0]}-L{r[1]}")

            new = LINK.sub(fix, text)
            if new != text and not check:
                open(p, "w", encoding="utf-8").write(new)
    if check and stale:
        sys.exit(1)
    print("OK" if not stale else f"{stale} link(s) {'stale' if check else 'updated'}")


if __name__ == "__main__":
    main()

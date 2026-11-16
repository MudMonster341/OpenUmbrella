#!/usr/bin/env python3
"""extract — turn the Open Peeps parts into plain canvas path data.

    python tools/peeps/extract.py [--out films/<slug>/peeps.json]

Reads `external_tools/art_style/react-peeps/src/peeps/**` and writes one JSON
file of raw SVG path data per part, so our canvas engine can draw a real
character with `Path2D` and no React, no build step and no runtime dependency.

Licensing, because it decides whether this may ship:
  * The **artwork** is Open Peeps by Pablo Stanley — **CC0**. Public domain,
    commercial use fine, attribution not required.
  * The **port** we read it from is `CeamKrier/react-peeps` — **MIT**,
    Copyright (c) 2020-present Emre Çakır. We extract art data rather than
    code, but the port is credited in docs/REPO_REGISTRY.md regardless.
Both are permissive, so unlike our narration voice this does not make a film
non-commercial.

Why this exists: every shot in reel-02 containing a person looked crude,
because people were drawn from ellipses and rounded rectangles in canvas.
33 named expressions and 53 hairstyles fix that by construction - and
"the character cannot act, two expressions hard-swapped" was a named
film-critic failure.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "external_tools", "art_style", "react-peeps", "src", "peeps")
PARTS = ["face", "hair", "head", "facialHair", "accessories", "pose"]

# <path d='...' ... /> with the attributes we care about, in any order
PATH_RE = re.compile(r"<path\b([^>]*?)/?>", re.S)
ATTR_RE = re.compile(r"(\w+)\s*=\s*(?:'([^']*)'|\"([^\"]*)\"|\{([^}]*)\})", re.S)


def attrs(blob: str) -> dict:
    out = {}
    for m in ATTR_RE.finditer(blob):
        k = m.group(1)
        v = m.group(2) or m.group(3) or m.group(4) or ""
        out[k] = v.strip()
    return out


def colour(v: str) -> str | None:
    """React props become literal colours; anything dynamic becomes None."""
    if not v:
        return None
    v = v.strip().strip("'\"")
    if v.startswith("#") or v.lower() in ("none", "white", "black"):
        return v
    if "strokeColor" in v or "{" in v:
        return None          # the caller decides
    return v if re.match(r"^[a-zA-Z]+$", v) else None


def read_component(path: str) -> list[dict]:
    try:
        txt = open(path, encoding="utf-8").read()
    except OSError:
        return []
    shapes = []
    for m in PATH_RE.finditer(txt):
        a = attrs(m.group(1))
        d = a.get("d", "")
        if not d or len(d) < 8:
            continue
        shapes.append({
            "d": re.sub(r"\s+", " ", d).strip(),
            "fill": colour(a.get("fill", "")),
            "stroke": colour(a.get("stroke", "")),
            "sw": a.get("strokeWidth") or a.get("stroke-width") or None,
            "lc": a.get("strokeLinecap") or None,
            "lj": a.get("strokeLinejoin") or None,
        })
    return shapes


def walk(part_dir: str) -> dict:
    """A part is either Name.tsx files or Name/index.tsx directories."""
    out = {}
    if not os.path.isdir(part_dir):
        return out
    for entry in sorted(os.listdir(part_dir)):
        name, ext = os.path.splitext(entry)
        if name in ("index", "types", "z_options"):
            continue
        full = os.path.join(part_dir, entry)
        if os.path.isdir(full):
            cand = os.path.join(full, "index.tsx")
            shapes = read_component(cand) if os.path.isfile(cand) else []
            for sub in sorted(os.listdir(full)):
                if sub.endswith(".tsx") and sub != "index.tsx":
                    out[f"{name}/{os.path.splitext(sub)[0]}"] = read_component(
                        os.path.join(full, sub))
            if shapes:
                out[name] = shapes
        elif ext == ".tsx":
            s = read_component(full)
            if s:
                out[name] = s
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "tools", "peeps", "peeps.json"))
    args = ap.parse_args()

    if not os.path.isdir(SRC):
        sys.exit(f"extract: no react-peeps checkout at {SRC}\n"
                 "It is gitignored; re-clone it from docs/REPO_REGISTRY.md.")

    data, total = {}, 0
    for p in PARTS:
        data[p] = walk(os.path.join(SRC, p))
        n = sum(len(v) for v in data[p].values())
        total += n
        print(f"  {p:14} {len(data[p]):3d} variants, {n:5d} paths")

    if total == 0:
        sys.exit("extract: parsed zero paths — the upstream layout changed.")

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    size = os.path.getsize(args.out) / 1024
    print(f"extract: wrote {args.out}  ({size:.0f} KB, {total} paths)")


if __name__ == "__main__":
    main()

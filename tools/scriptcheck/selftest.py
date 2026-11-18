#!/usr/bin/env python3
"""selftest.py — proves each scriptcheck rule added 2026-11-18 fires on a PLANTED fault, and stays quiet on the clean script.

    python tools/scriptcheck/selftest.py

It copies the first script under films/ that declares loops and passes cleanly, plants one fault per test, and checks that the expected
rule id appears. Standard library only; writes only to a temp folder. The script's text stays local (rule 10): this file
names no story words; it edits the copy by structure (line index, key), never by quoting a line.
"""
import copy, json, os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scriptcheck as sc  # noqa: E402

def _base():
    import glob
    for p in sorted(glob.glob(os.path.join(sc.ROOT, "films", "*", "*_script.json"))):
        try:
            if "loops" in json.load(open(p, encoding="utf-8")) and not sc.check(p)[1]: return p
        except Exception:
            continue
    return ""


BASE = _base()
fails, ran = [], []


def run(d):
    p = os.path.join(tempfile.mkdtemp(prefix="scriptcheck_selftest_"), "x_script.json")
    json.dump(d, open(p, "w", encoding="utf-8"))
    _, F, W, _ = sc.check(p)
    return F, W


def expect(name, d, rule, where="F"):
    F, W = run(d); hit = [m for m in (F if where == "F" else W) if m.startswith(rule)]
    ran.append(name); ok = bool(hit)
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {'caught: ' + hit[0][:110] if ok else 'NOT caught; got ' + str([m[:40] for m in F + W])}")
    if not ok: fails.append(name)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if not BASE: print("selftest: no clean script with loops under films/ (local-only story files); skipped"); return 0
    clean = json.load(open(BASE, encoding="utf-8"))
    F, _ = run(clean)
    new = [m for m in F if m[:2] in ("H1", "H2", "H3", "H4", "P1", "P2", "P3")]
    ran.append("clean"); print(f"{'PASS' if not new else 'FAIL'}  clean script: {len(new)} new-rule failures {new[:2]}")
    if new: fails.append("clean")

    d = copy.deepcopy(clean); d["hook"]["elements"].pop("contrast")
    expect("H1 a hook with no contrast", d, "H1")
    d = copy.deepcopy(clean); a, b = d["hook"]["elements"]["contrast"].split("/"); d["hook"]["elements"]["contrast"] = a + "/ zzqq"
    expect("H1 a contrast side that is not in the first 25 words", d, "H1")
    d = copy.deepcopy(clean); d["lines"][0]["say"], d["lines"][1]["say"] = d["lines"][1]["say"], d["lines"][0]["say"]
    d["hook"]["elements"] = {k: v for k, v in d["hook"]["elements"].items()}
    d["lines"] = d["lines"][:1] + [dict(d["lines"][1], say="Nothing at all happens here today, really, nothing whatsoever, still nothing.")] * 3 + d["lines"][1:]
    expect("H1 elements pushed past word 25 by filler", d, "H1")
    d = copy.deepcopy(clean); d["loops"] = [lp for lp in d["loops"] if lp["open"] != d["lines"][0]["id"]]
    expect("H3 no question open on line 1", d, "H3")
    d = copy.deepcopy(clean); d["loops"] = [dict(lp, close=lp["close"] or d["lines"][-1]["id"]) for lp in d["loops"]]
    expect("H3 every loop closed (no cliffhanger)", d, "H3")
    d = copy.deepcopy(clean); d["loops"] = d["loops"][:1]
    expect("H3 a stretch with no open question", d, "H3")
    expect("H4 only one question by 8 s", d, "H4", where="W")
    d = copy.deepcopy(clean); d["pace_budget"]["hook"] = 0.5
    expect("P1 a section over its budget", d, "P1")
    d = copy.deepcopy(clean); filler = dict(d["lines"][20], say="I wait and wait and wait and keep on waiting there.")
    d["lines"] = d["lines"][:21] + [dict(filler, id=f"X{k}") for k in range(3)] + d["lines"][21:]
    expect("P2 a long stretch with nothing new", d, "P2")
    d = copy.deepcopy(clean); d["lines"][0]["say"] = d["lines"][0]["say"].rstrip(".") + " and then much later on that same long night."
    expect("P3 a long hook sentence", d, "P3")
    d = copy.deepcopy(clean)
    for k in range(10, 14): d["lines"][k]["say"] = "One two three four five six. Seven eight nine ten eleven twelve."
    expect("P3 a droning rhythm (same length four times)", d, "P3", where="W")

    print(f"SELFTEST {'PASS' if not fails else 'FAIL'}: {len(ran)} tests" + (f", failed: {', '.join(fails)}" if fails else ""))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

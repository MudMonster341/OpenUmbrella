#!/usr/bin/env python3
"""selftest.py — proves each scriptcheck rule added 2026-11-18 fires on a PLANTED fault, and stays quiet on the clean script.

    python tools/scriptcheck/selftest.py

It copies the first script under films/ that declares loops and passes cleanly, plants one fault per test, and checks that the expected
rule id appears. Standard library only; writes only to a temp folder. The script's text stays local (rule 10): this file
names no story words; it edits the copy by structure (line index, key), never by quoting a line.
"""
import copy, json, os, re, sys, tempfile

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


def run(d, earlier=None):
    tmp = tempfile.mkdtemp(prefix="scriptcheck_selftest_"); p = os.path.join(tmp, "x_script.json")
    if earlier is not None: json.dump(earlier, open(os.path.join(tmp, "a_script.json"), "w", encoding="utf-8"))
    json.dump(d, open(p, "w", encoding="utf-8"))
    _, F, W, _ = sc.check(p)
    return F, W


def expect(name, d, rule, where="F", earlier=None):
    F, W = run(d, earlier); hit = [m for m in (F if where == "F" else W) if m.startswith(rule)]
    ran.append(name); ok = bool(hit)
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {'caught: ' + hit[0][:110] if ok else 'NOT caught; got ' + str([m[:40] for m in F + W])}")
    if not ok: fails.append(name)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if not BASE: print("selftest: no clean script with loops under films/ (local-only story files); skipped"); return 0
    clean = json.load(open(BASE, encoding="utf-8"))
    F, _ = run(clean)
    new = [m for m in F if m[:2] in ("H1", "H2", "H3", "H4", "P1", "P2", "P3", "N1", "N2", "R4", "L5", "L6", "S6", "T6", "T7", "K3", "A5")]
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
    d = copy.deepcopy(clean); m = len(d["lines"]) // 2; filler = dict(d["lines"][m], say="I wait and wait and wait and keep on waiting there.")
    d["lines"] = d["lines"][:m + 1] + [dict(filler, id=f"X{k}") for k in range(3)] + d["lines"][m + 1:]
    expect("P2 a long stretch with nothing new", d, "P2")
    d = copy.deepcopy(clean); d["lines"][0]["say"] = d["lines"][0]["say"].rstrip(".") + " and then much later on that same long night."
    expect("P3 a long hook sentence", d, "P3")
    d = copy.deepcopy(clean)
    for k in range(3, 7): d["lines"][k]["say"] = "One two three four five six. Seven eight nine ten eleven twelve."
    expect("P3 a droning rhythm (same length four times)", d, "P3", where="W")

    d = copy.deepcopy(clean); d["no_repeat"] = d.get("no_repeat", []) + [d["lines"][4]["picture"].split()[1]]
    expect("R1 a line showing an earlier part's scene", d, "R1")
    d = copy.deepcopy(clean); d.pop("no_repeat", None)
    expect("R1 no no_repeat list declared", d, "R1")
    d = copy.deepcopy(clean); w = d["lines"][5]["picture"].split()[1]; d["show_once"] = [w]; d["lines"][-3]["picture"] += " " + w
    expect("R2 one event shown on two lines", d, "R2")

    # 2026-11-18 (the user's notes on v7.1 and v8): characters defined, a goal, not too complicated, length, no earlier events, speed
    chars = [n for n, c in clean.get("characters", {}).items() if c.get("role") != "narrator"]
    if chars:
        n0 = chars[-1]
        d = copy.deepcopy(clean); d["characters"][n0]["role"] = "zzqq cousin"
        expect("C1 an introduction that never says who they are", d, "C1")
        d = copy.deepcopy(clean); d["characters"][n0]["introduced"] = d["lines"][-2]["id"]
        expect("C1 a character named long before being introduced", d, "C1")
        d = copy.deepcopy(clean); d["characters"][n0]["role"] = "her little brother"; d["cast"][n0]["height_vs_lead"] = 1.05
        expect("C2 a younger brother as tall as the lead", d, "C2")
        d = copy.deepcopy(clean); d["cast"].pop(n0)
        expect("C2 a character with no cast spec", d, "C2")
        d = copy.deepcopy(clean); d["limits"]["characters"] = 1
        expect("K2 too many characters", d, "K2")
    d = copy.deepcopy(clean); d["goal"]["line"] = d["lines"][-3]["id"]
    expect("G1 the goal arrives late", d, "G1")
    d = copy.deepcopy(clean); d["goal"]["target"] = 987654
    expect("G1 the target is never on screen", d, "G1")
    d = copy.deepcopy(clean); d["lines"][1]["screen"] = d["lines"][1]["screen"] + ["11 22 33 44 55"]
    expect("K1 number soup in the first 15 s", d, "K1")
    d = copy.deepcopy(clean); d["target_s"] = [5, 10]
    expect("S5 outside the length target (now a FAIL)", d, "S5")
    d = copy.deepcopy(clean); prev = {"events": ["zzqq tram"], "lines": []}
    expect("R3 an earlier part's event missing from no_repeat", d, "R3", earlier=prev)
    import wave as _w
    tmpa = tempfile.mkdtemp(prefix="scriptcheck_voice_")
    for i, secs in (("A1", 2.0), ("A2", 3.0)):
        with _w.open(os.path.join(tmpa, i + ".wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(bytes(2 * int(16000 * secs)))
    r = sc.voice_rate(tmpa, [{"id": "A1", "say": "one two three four five six seven"}, {"id": "A2", "say": "eight nine ten eleven twelve thirteen fourteen fifteen"}])
    ran.append("A4"); ok = r is not None and abs(r - 3.0) < 1e-9 and sc.speed_ok(3.0, 3.1) and not sc.speed_ok(3.6, 3.1)
    print(f"{'PASS' if ok else 'FAIL'}  A4 voice_rate reads 15 words / 5 s = {r}; 3.0 vs 3.1 ok, 3.6 vs 3.1 refused")
    if not ok: fails.append("A4")

    # 2026-11-18, docs/SCRIPT_PLAYBOOK.md: the playbook's measurable rules (N, R4, L5/L6, S6, T6/T7, K3, A5)
    dil = [x["id"] for x in clean["lines"] if x["job"] == clean["jobs_order"][-2]]
    card = re.findall(r"[A-Za-z]{3,}", " ".join(clean["lines"][-1]["screen"] + clean["lines"][-1]["caption"]))
    def say2(i): return " ".join(next(x for x in clean["lines"] if x["id"] == i)["say"].split()[:2])
    if len(dil) >= 2 and len(card) >= 2:
        good = {"answers": [{"word": card[-2], "line": dil[0], "says": say2(dil[0]), "cost": "x"},
                            {"word": card[-1], "line": dil[1], "says": say2(dil[1]), "cost": "y"}], "shape": "zzqq shape"}
        d = copy.deepcopy(clean); d["ending"] = good; F2, _ = run(d); nf = [m for m in F2 if m[:2] in ("N1", "N2")]
        ran.append("N clean"); print(f"{'PASS' if not nf else 'FAIL'}  N1/N2 a well-formed ending passes: {nf[:1]}")
        if nf: fails.append("N clean")
        d = copy.deepcopy(clean); d["ending"] = copy.deepcopy(good); d["ending"]["answers"][1]["line"] = dil[0]
        expect("N1 both answers on one line", d, "N1")
        d = copy.deepcopy(clean); d["ending"] = copy.deepcopy(good); d["ending"]["answers"][0]["says"] = "zzqq qqzz"
        expect("N1 an answer its line never says", d, "N1")
        d = copy.deepcopy(clean); d["ending"] = copy.deepcopy(good); d["ending"]["answers"][1]["word"] = "ZZQQ"
        expect("N2 an end card that names one answer", d, "N2")
    d = copy.deepcopy(clean); d["schema"] = 2; d.pop("ending", None)
    expect("N1 schema 2 with no ending declared (FAIL, not warn)", d, "N1")
    d = copy.deepcopy(clean); d["hook"]["device"] = "zzqq clock"
    expect("R4 the hook device of an earlier part", d, "R4", earlier={"events": [], "lines": [], "hook": {"device": "ZZQQ clock"}})
    d["allow_repeat"] = {"hook device": "the user's call"}
    F2, W2 = run(d, {"events": [], "lines": [], "hook": {"device": "zzqq clock"}})
    ok = any(m.startswith("R4") and "(allowed:" in m for m in W2) and not any(m.startswith("R4") for m in F2)
    ran.append("R4 allowed"); print(f"{'PASS' if ok else 'FAIL'}  R4 an allowed repeat warns and does not fail")
    if not ok: fails.append("R4 allowed")
    if clean.get("ledger"):
        d = copy.deepcopy(clean)
        expect("L5 a ledger that does not start where the last part ended", d, "L5",
               earlier={"events": [], "lines": [], "ledger": {"start": clean["ledger"]["start"] + 7, "steps": [], "prices": [1]}})
        expect("L6 a price below the last part's highest", d, "L6",
               earlier={"events": [], "lines": [], "ledger": {"start": clean["ledger"]["start"], "steps": [], "prices": [10 ** 9]}})
    tdir = tempfile.mkdtemp(prefix="scriptcheck_timing_")
    def tfile(name, lines, end=60.0):
        caps = [{"t": 0.0, "dur": 0.1, "line": x["id"], "word": w} for x in lines for w in x["say"].split()]
        p = os.path.join(tdir, name); open(p, "w", encoding="utf-8").write("export const TIMING = " + json.dumps({"end": end, "captions": caps}) + ";\n"); return p
    slow = tfile("slow.js", [{"id": "L01", "say": "one two three"}], end=30.0)
    expect("S6 a pace far from the last part's measured one", copy.deepcopy(clean), "S6",
           earlier={"events": [], "lines": [{"id": "L01", "say": "one two three"}], "timing": slow})
    d = copy.deepcopy(clean); d["lines"][2]["say"] = d["lines"][2]["say"].rstrip(".") + " by the till."
    expect("T6 a regional word a stranger may not follow", d, "T6")
    d = copy.deepcopy(clean); d["lines"][2]["say"] = "Last time, " + d["lines"][2]["say"]
    expect("T7 a line that tells a cold viewer they missed the last part", d, "T7")
    d = copy.deepcopy(clean); d["clock"] = ["1:00"]; d["lines"][3]["screen"] = d["lines"][3]["screen"] + ["7:45"]
    expect("K3 a clock time that is not on the story clock", d, "K3")
    same = tfile("same.js", clean["lines"]); swapped = copy.deepcopy(clean["lines"]); swapped[0]["say"], swapped[1]["say"] = swapped[1]["say"], swapped[0]["say"]
    other = tfile("other.js", swapped)
    ok = sc.timing_mismatch(same, clean["lines"]) == [] and sc.timing_mismatch(other, clean["lines"])[:2] == [clean["lines"][0]["id"], clean["lines"][1]["id"]]
    ran.append("A5 match"); print(f"{'PASS' if ok else 'FAIL'}  A5 timing_mismatch: its own words match, two swapped lines are named")
    if not ok: fails.append("A5 match")
    d = copy.deepcopy(clean); d["timing"] = other
    expect("A5 a timing file built from other words (ERR-0023/0024)", d, "A5")

    print(f"SELFTEST {'PASS' if not fails else 'FAIL'}: {len(ran)} tests" + (f", failed: {', '.join(fails)}" if fails else ""))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

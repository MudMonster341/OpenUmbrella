"""scriptcheck.py - one checker for every story-reel script, in one uniform format (JSON).

    python tools/scriptcheck/scriptcheck.py films/<slug>/<part>_script.json          # quiet: failures, warnings, one summary
    python tools/scriptcheck/scriptcheck.py films/<slug>/<part>_script.json --md     # also print the STORY.md table + ledger
    python tools/scriptcheck/scriptcheck.py --all                                    # every films/*/*_script.json

Built 2026-11-18 because each script had its own ad-hoc checker. Every check names its source:
  T  = text (GOAL T1, STORY_TEMPLATE rules)       S = structure (reel-scripter, STORY_TEMPLATE section 5)
  V  = the virality skill's 8-point hook checklist A = audio (the user's 0.5 s silence rule, 2026-11-16)
  L  = ledger / arithmetic (the series' rules)     M = the publish filter (CLAUDE.md rule 10)
Checks that need a render (pixel size, motion, frame-0 content) are only checked as DECLARED in the file; the
render gates (check_direction, autoreview) measure them. Exit 1 on any FAIL. Standard library only.

The format (all keys required unless marked optional):
{
 "title": str, "style_doc": "market_research_and_intelligence/styles/<style>.md",
 "pace_wps": float, "pace_source": str, "target_s": [lo, hi],
 "limits": {"spoken_words_per_line": 14, "screen_words": 7, "max_pause_s": 0.5, "first_word_s": 0.5, "claim_s": [1.2, 1.6]},
 "names": [str],                       # story names that must be in the publish filter
 "hook": {"first_word_s": float, "claim_word": str, "frame0": str, "frame0_moving": bool, "recognisable": str,
          "biggest_share": float, "event": str, "event_s": float, "mute": str, "about_viewer": "yes" | "n/a: <why>"},
 "lines": [{"id": "L01", "say": str, "job": str, "picture": str, "reuse": str, "scene": str,
            "caption": [str], "screen": [str], "meter": int | null}],
 "jobs_order": [str],                  # the allowed sequence of jobs, e.g. ["hook","setup","E1","E2","E3","dilemma","end card"]
 "ledger": {"start": int, "steps": [{"after": "L01", "change": int, "why": str}], "prices": [int],
            "spoken": [{"line": "L02", "phrase": str, "value": int}], "asserts": [{"expr": str, "why": str}]},   # optional
 "delivery": "path/to/delivery.json" | null, "allow_pause": {"<line id>": seconds}   # optional
}
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def words(s):
    return [t for t in str(s).split() if re.search(r"[A-Za-z0-9]", t)]


def norm(s):
    return [re.sub(r"[^a-z0-9']", "", w.lower()) for w in words(s)]


def scenes_from(style_doc):
    try:
        txt = open(os.path.join(ROOT, style_doc), encoding="utf-8").read()
    except OSError:
        return None
    sec = txt.split("Scene vocabulary", 1)[-1].split("\n## ", 1)[0]
    return set(re.findall(r"^\|\s*`([a-z]+)`", sec, re.M))


def markers():
    try:
        rx = [l.strip() for l in open(os.path.join(ROOT, "tools/publish/story_markers.txt"), encoding="utf-8")
              if l.strip() and not l.startswith("#")]
        return [re.compile(r, re.I) for r in rx]
    except OSError:
        return None


def check(path):
    d = json.load(open(path, encoding="utf-8"))
    F, W = [], []
    lim = d["limits"]; L = d["lines"]; ids = [x["id"] for x in L]
    total = sum(len(words(x["say"])) for x in L)
    # ---- T: text
    vocab = scenes_from(d["style_doc"])
    if vocab is None: W.append(f"T4 style doc not found: {d['style_doc']}")
    for x in L:
        n = len(words(x["say"]))
        if n > lim["spoken_words_per_line"]: F.append(f"T1 {x['id']}: {n} spoken words > {lim['spoken_words_per_line']}")
        sw = len(words(" ".join(x["caption"] + x["screen"])))
        if sw > lim["screen_words"]: F.append(f"T2 {x['id']}: {sw} words on screen > {lim['screen_words']}")
        if not x["picture"].strip() or norm(x["picture"]) == norm(x["say"]): F.append(f"T3 {x['id']}: no picture that is not the line")
        if vocab and x["scene"] not in vocab: F.append(f"T4 {x['id']}: scene '{x['scene']}' not in the style's vocabulary")
        if not x.get("reuse", "").strip(): F.append(f"T5 {x['id']}: reuse column empty (name the set/insert)")
    # ---- S: structure (reel-scripter: hook first, a payoff, one ending; template: escalations change kind)
    order = d["jobs_order"]; seen = [x["job"] for x in L]
    if seen[0] != order[0]: F.append(f"S1 the first line's job is '{seen[0]}', not '{order[0]}'")
    if seen[-1] != order[-1]: F.append(f"S2 the last line's job is '{seen[-1]}', not '{order[-1]}'")
    pos = [order.index(j) if j in order else -1 for j in seen]
    if -1 in pos: F.append(f"S3 unknown job(s): {sorted(set(j for j in seen if j not in order))}")
    elif any(b < a for a, b in zip(pos, pos[1:])): F.append("S3 jobs out of order: " + " > ".join(seen))
    missing = [j for j in order if j not in seen]
    if missing: F.append(f"S4 sections missing: {missing}")
    secs = total / d["pace_wps"]; lo, hi = d["target_s"]
    if not lo <= secs <= hi: W.append(f"S5 ~{secs:.0f} s at {d['pace_wps']} words/s, outside the {lo}-{hi} s target")
    # ---- V: the virality hook checklist (as declared; the render gates measure the frames)
    h = d["hook"]; first = L[0]["say"]
    if not h.get("frame0_moving"): F.append("V1 frame 0 is not declared moving")
    if not h.get("recognisable", "").strip(): F.append("V2 nothing recognisable declared at frame 0")
    if h.get("biggest_share", 0) < 0.40: F.append(f"V3 biggest element {h.get('biggest_share', 0):.0%} < 40% of the frame")
    if h.get("event_s", 99) > 3.0: F.append(f"V4 the extraordinary event lands at {h.get('event_s')} s, after 3 s")
    # V4b (2026-11-18, a posted reel's 30% skip rate): the event must be one the virality skill names, not a notification or a
    # title. The skill's list: it explodes, burns, breaks, builds itself, collapses, or a number races and locks.
    EVENTS = ("explod", "burn", "break", "shatter", "smash", "crash", "build", "collaps", "races", "rewind", "runs backward")
    if not any(k in h.get("event", "").lower() for k in EVENTS):
        F.append(f"V4b the first-3-s event '{h.get('event')}' is none of the skill's (explodes, burns, breaks, builds, collapses, a number races and locks)")
    toks = norm(first); cw = re.sub(r"[^a-z0-9']", "", h["claim_word"].lower())
    if cw not in toks: F.append(f"V5 claim word '{h['claim_word']}' is not in line 1")
    else:
        # 'lands' = the claim word is on screen at some moment inside the window. Measured caption times when the part has a
        # timing file (its "timing": path), else the pace estimate: start = first word + index/pace, one word long.
        t0 = t1 = None
        if d.get("timing"):
            try:
                tx = open(os.path.join(ROOT, d["timing"]), encoding="utf-8").read()
                caps = json.loads(tx[tx.index("{"):tx.rindex("}") + 1])["captions"]
                for i, c in enumerate(caps):
                    if c["line"] == L[0]["id"] and re.sub(r"[^a-z0-9']", "", c["word"].lower()) == cw:
                        t0 = c.get("t", c.get("t0")); t1 = caps[i + 1].get("t", caps[i + 1].get("t0")) if i + 1 < len(caps) else t0 + 0.3
                        break
            except (OSError, ValueError, KeyError) as e:
                W.append(f"V5 timing file unreadable ({e}); using the pace estimate")
        how = "measured"
        if t0 is None:
            t0 = h["first_word_s"] + toks.index(cw) / d["pace_wps"]; t1 = t0 + 1 / d["pace_wps"]; how = f"estimated at {d['pace_wps']} words/s"
        a, b = lim["claim_s"]
        if t1 < a or t0 > b: F.append(f"V5 the claim is on screen {t0:.2f}-{t1:.2f} s ({how}), not inside {a}-{b} s")
    if h["first_word_s"] > lim["first_word_s"]: F.append(f"V6 first word at {h['first_word_s']} s > {lim['first_word_s']} s")
    if not h.get("mute", "").strip() or not (L[0]["caption"] or L[0]["screen"]): F.append("V7 line 1 has nothing on screen for mute")
    if not str(h.get("about_viewer", "")).startswith(("yes", "n/a:")): F.append("V8 'about the viewer' neither yes nor a stated n/a")
    elif h["about_viewer"].startswith("n/a"): W.append("V8 " + h["about_viewer"])
    # ---- H: hook craft, from the hook-structure study (2026-11-18, research/reels/ig-hooks-*/HOOK_LESSONS.md, one creator's
    # framework, mapped to a story: who, what happens to/through them, the end state at stake, and a contrast of two states)
    first25 = " ".join(norm(" ".join(x["say"] for x in L)) [:25])
    el = h.get("elements")
    if not el: F.append("H1 hook.elements not declared (who, act, end, contrast: phrases from the first 25 spoken words)")
    else:
        pos_el = {}
        for k in ("who", "act", "end", "contrast"):
            v = el.get(k)
            if not v: F.append(f"H1 hook element '{k}' missing: the hook has no {dict(who='subject', act='action', end='end state', contrast='contrast')[k]}"); continue
            parts = [p.strip() for p in v.split("/")] if k == "contrast" else [v]
            if k == "contrast" and len(parts) != 2: F.append(f"H1 contrast '{v}' is not two states 'A / B'"); continue
            for p in parts:
                ph = " ".join(norm(p))
                if not ph or (" " + ph + " ") not in (" " + first25 + " "): F.append(f"H1 hook element {k} '{p}' is not in the first 25 spoken words")
                else: pos_el.setdefault(k, (" " + first25 + " ").index(" " + ph + " "))
        if all(k in pos_el for k in ("who", "act", "end")) and not pos_el["who"] <= pos_el["act"] <= pos_el["end"]:
            W.append("H2 hook elements not in the taught order who <= act <= end (a story may invert it; say why in the script)")
    # H3 open loops: at every line from the first to the last, the viewer holds at least one unanswered question; the last one
    # stays open past the end (the cliffhanger). Each loop: {"q", "open": line id, "close": line id or null}
    loops = d.get("loops")
    if not loops: F.append("H3 no open loops declared ('loops': [{q, open, close}])")
    else:
        ix = {i: n for n, i in enumerate(ids)}
        bad_ids = [l2 for lp in loops for l2 in (lp["open"], lp.get("close")) if l2 and l2 not in ix]
        if bad_ids: F.append(f"H3 loops name unknown lines {bad_ids}")
        else:
            span = [(ix[lp["open"]], ix[lp["close"]] if lp.get("close") else len(L)) for lp in loops]
            gaps = [ids[n] for n in range(len(L)) if not any(a <= n < b for a, b in span)]
            if gaps: F.append(f"H3 no question open during {gaps}: the viewer has nothing to wait for there")
            if min(a for a, _ in span) != 0: F.append("H3 no loop opens on line 1")
            if not any(lp.get("close") is None for lp in loops): F.append("H3 every loop closes: nothing left open for the next part")
            t_line = []; tt = h["first_word_s"]
            for x in L: t_line.append(tt); tt += len(words(x["say"])) / d["pace_wps"]
            by8 = sum(1 for a, _ in span if t_line[a] <= 8.0)
            if by8 < 2: W.append(f"H4 only {by8} question(s) open by ~8 s; a second hook (a new question) by then holds the swipe")
    # ---- P: pacing budget (the user 2026-11-18: 'maybe pacing ... needs more work'; Part 1's 30% skip)
    t_est = {}; tt = h["first_word_s"]
    for x in L: t_est[x["id"]] = (tt, tt + len(words(x["say"])) / d["pace_wps"]); tt = t_est[x["id"]][1]
    for job, cap in d.get("pace_budget", {}).items():
        secs_job = sum(b - a for i, (a, b) in t_est.items() if next(y["job"] for y in L if y["id"] == i) == job)
        if secs_job > cap: F.append(f"P1 section '{job}' runs ~{secs_job:.1f} s > its {cap} s budget")
    if not d.get("pace_budget"): W.append("P1 no pace_budget declared (seconds per section)")
    # P2: the longest stretch with nothing new. A line is a turn if the meter moves on it, a loop opens or closes on it, a
    # number is spoken, or the job changes.
    opens = {lp["open"] for lp in loops or []} | {lp.get("close") for lp in loops or [] if lp.get("close")}
    NUMW = set("one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty sixty hundred thousand".split())
    run_s, worst_run, run_ids, worst_ids, prev_m, prev_job = 0.0, 0.0, [], [], None, None
    for x in L:
        a, b = t_est[x["id"]]
        turn = (x["id"] in opens or x["job"] != prev_job or (x.get("meter") is not None and x["meter"] != prev_m)
                or any(w in NUMW or w.isdigit() for w in norm(x["say"])))
        if turn: run_s, run_ids = 0.0, []
        run_s += b - a; run_ids.append(x["id"])
        if run_s > worst_run: worst_run, worst_ids = run_s, list(run_ids)
        prev_m = x.get("meter") if x.get("meter") is not None else prev_m; prev_job = x["job"]
    cap = lim.get("max_still_s", 8.0)
    if worst_run > cap: F.append(f"P2 ~{worst_run:.1f} s with nothing new ({'-'.join([worst_ids[0], worst_ids[-1]])}) > {cap} s")
    # P3 sentence shape: hook sentences short, no sentence long, rhythm varied (4 sentences in a row within 1 word = a drone)
    sents = [(x["id"], x["job"], s) for x in L for s in re.split(r"(?<=[.?!])\s+", x["say"].strip()) if words(s)]
    hs = lim.get("hook_sentence_words", 7); ms = lim.get("sentence_words", 12)
    for i, j, s in sents:
        n = len(words(s))
        if j == order[0] and n > hs: F.append(f"P3 {i}: hook sentence of {n} words > {hs}: '{s}'")
        elif n > ms: F.append(f"P3 {i}: sentence of {n} words > {ms}: '{s}'")
    ln = [len(words(s)) for _, _, s in sents]
    for k in range(len(ln) - 3):
        if max(ln[k:k + 4]) - min(ln[k:k + 4]) <= 1:
            W.append(f"P3 four sentences in a row of {min(ln[k:k + 4])}-{max(ln[k:k + 4])} words from {sents[k][0]}: vary the rhythm"); break
    # ---- L: ledger
    g = d.get("ledger")
    after, end = {}, None
    if g:
        v = g["start"]
        for s in g["steps"]:
            if s["after"] not in ids: F.append(f"L1 ledger step after unknown line {s['after']}")
            v += s["change"]; after[s["after"]] = v
        cur = g["start"]
        for x in L:
            cur = after.get(x["id"], cur)
            if x.get("meter") is not None and x["meter"] != cur: F.append(f"L1 {x['id']}: meter {x['meter']:,} != ledger {cur:,}")
        end = cur
        p = g.get("prices", [])
        if any(b <= a for a, b in zip(p, p[1:])): F.append("L2 prices are not always rising")
        changes = {s["after"]: s["change"] for s in g["steps"]}
        for sp in g.get("spoken", []):
            line = next((x["say"] for x in L if x["id"] == sp["line"]), "")
            if sp["phrase"].lower() not in line.lower(): F.append(f"L3 {sp['line']} does not say '{sp['phrase']}'")
            if sp["value"] not in changes.values() and sp["value"] not in p: F.append(f"L3 {sp['line']} says {sp['value']}, which no step or price has")
        env = {"start": g["start"], "end": end, "after": after, "prices": p, "changes": changes, "line": {x["id"]: x["say"] for x in L}}
        for a in g.get("asserts", []):
            try:
                ok = eval(a["expr"], {"__builtins__": {"sum": sum, "int": int, "abs": abs, "len": len}}, env)
            except Exception as e:
                ok = False; a = dict(a, why=a["why"] + f" (error: {e})")
            if not ok: F.append(f"L4 {a['why']}  [{a['expr']}]")
    # ---- A: audio, from the delivery file once the script is voiced
    dl = d.get("delivery")
    if not dl: W.append("A  not voiced yet: no delivery file, audio checks skipped")
    else:
        dd = json.load(open(os.path.join(ROOT, dl), encoding="utf-8"))
        lines = dd.get("lines", dd); lines = lines if isinstance(lines, list) else list(lines.values())
        byid = {x["id"]: x for x in lines}; allow = d.get("allow_pause", {})
        for x in L:
            y = byid.get(x["id"])
            if not y: F.append(f"A2 {x['id']}: not in the delivery file"); continue
            segs = y.get("segments") or [y]
            if norm(" ".join(s.get("text", "") for s in segs)) != norm(x["say"]): F.append(f"A2 {x['id']}: delivery text != script")
            for s in segs:
                pa = s.get("pause_after", 0) or 0
                if pa > max(lim["max_pause_s"], allow.get(x["id"], 0)): F.append(f"A1 {x['id']}: pause {pa} s > {lim['max_pause_s']} s")
        # A3: emotion from the WAVs (tools/autoreview/emotion.py; numpy; provisional limits, so warnings). The WAVs sit in
        # <delivery dir>/audio/<id>.wav
        try:
            sys.path.insert(0, os.path.join(ROOT, "tools", "autoreview")); import emotion
            for c in emotion.run(os.path.join(ROOT, os.path.dirname(dl), "audio"), os.path.join(ROOT, dl))[0]:
                if not c["pass"]: W.append(f"A3 {c['id']} {c['name']}: {c['value']}")
        except ImportError as e:
            W.append(f"A3 emotion check skipped ({e})")
    # ---- M: the publish filter knows the story
    mk = markers()
    if mk is None: W.append("M  tools/publish/story_markers.txt not found")
    else:
        for n in d.get("names", []):
            if not any(r.search(n) for r in mk): F.append(f"M1 name '{n}' is not in story_markers.txt")
        if not any(r.search(L[0]["say"]) for r in mk): W.append("M2 line 1 matches no story marker")
    worst = max(len(words(" ".join(x["caption"] + x["screen"]))) for x in L)
    return d, F, W, dict(lines=len(L), words=total, secs=secs, worst=worst, end=end, after=after)


def md(d, r):
    out = ["| # | Line (exactly as spoken) | Job | On screen — in words, not the text of the line | Reuses | Scene | Caption | Screen words | Meter |",
           "|---|---|---|---|---|---|---|---|---|"]
    for x in d["lines"]:
        n = len(words(" ".join(x["caption"] + x["screen"])))
        items = " ; ".join([" ".join(x["caption"])] * bool(x["caption"]) + [" ".join(x["screen"])] * bool(x["screen"]))
        m = f"{x['meter']:,}" if x.get("meter") is not None else "—"
        out.append(f"| {x['id']} | {x['say']} | {x['job']} | {x['picture']} | {x['reuse']} | `{x['scene']}` | {' '.join(x['caption']) or '—'} | {n}: {items} | {m} |")
    g = d.get("ledger")
    if g:
        out += ["", "| After | Change | Days | Why |", "|---|---|---|---|", f"| start | — | {g['start']:,} | |"]
        v = g["start"]
        for s in g["steps"]:
            v += s["change"]; out.append(f"| {s['after']} | {s['change']:+,} | {v:,} | {s['why']} |")
    return "\n".join(out)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    paths = sorted(glob.glob(os.path.join(ROOT, "films", "*", "*_script.json"))) if "--all" in sys.argv else args
    if not paths: print(__doc__); return 2
    bad = 0
    for p in paths:
        d, F, W, r = check(p)
        if "--md" in sys.argv: print(md(d, r))
        for f in F: print("FAIL", f)
        for w in W: print("warn", w)
        end = f", ends at {r['end']:,}" if r["end"] is not None else ""
        print(f"{'PASS' if not F else 'FAIL'} {os.path.relpath(p, ROOT)}: {r['lines']} lines, {r['words']} words, ~{r['secs']:.0f} s, worst screen {r['worst']}/{d['limits']['screen_words']}{end}, {len(F)} fail, {len(W)} warn")
        bad += bool(F)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

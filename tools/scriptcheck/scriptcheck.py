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
Added 2026-11-18 with docs/SCRIPT_PLAYBOOK.md (required when the script says "schema": 2; a warning in older scripts):
 "schema": 2, "hook": {..., "device": "stakes clock" | "open loop" | ...},
 "ending": {"answers": [{"word": "<vote word on the end card>", "line": "L16", "says": "<phrase spoken there>", "cost": str}] x 2,
            "shape": "<e.g. save or let fall>"},
 "clock": ["8:09", ...],                                  # every clock time shown or said (K3)
 "allow_words": [str], "allow_repeat": {"hook device" | "ending shape": "<why, who, when>"}   # optional escapes, each with a reason
Families added: N ending (N1 both halves, N2 the end card names both), R4 a new shape per part, L5/L6 the ledger across parts,
S6 a measured pace, T6 plain words, T7 nothing a cold viewer missed, K3 the story clock, A5 the timing file's words (ERR-0023/0024).
"""
import glob, json, os, re, sys, wave

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


def voice_rate(audio_dir, lines):
    """spoken words / seconds of the line WAVs (<id>.wav); None when none exist. Standard library only."""
    secs = n = 0
    for x in lines:
        f = os.path.join(audio_dir, x["id"] + ".wav")
        if os.path.exists(f):
            with wave.open(f) as w: secs += w.getnframes() / w.getframerate()
            n += len(words(x["say"]))
    return n / secs if secs else None


def speed_ok(rate, ref, tol=0.08):
    return abs(rate / ref - 1) <= tol


def timing_words(path):
    """{line id: [normalised caption words]} from a generated timing file (timing.js / timing_p2.js / a JSON with 'captions')."""
    tx = open(path, encoding="utf-8").read()
    out = {}
    for c in json.loads(tx[tx.index("{"):tx.rindex("}") + 1])["captions"]:
        out.setdefault(c["line"], []).extend(w for w in norm(c["word"]) if w)
    return out


def timing_mismatch(path, lines):
    """line ids whose timing-file words differ from the script's spoken words, plus ids the timing has and the script lacks.
    [] = the timing file was built from these lines (A5, guard G12; ERR-0023, ERR-0024)."""
    tw = timing_words(path); ids = [x["id"] for x in lines]
    return [x["id"] for x in lines if tw.get(x["id"], []) != [w for w in norm(x["say"]) if w]] + sorted(set(tw) - set(ids))


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
    if not lo <= secs <= hi: F.append(f"S5 ~{secs:.0f} s at {d['pace_wps']} words/s, outside the {lo}-{hi} s target")
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
    # ---- R: no repeats (the user 2026-11-18: "NO REPEAT OF SCENES FROM THE FIRST REEL ... REPEAT SPOILS THE REEL"; "old man came
    # twice"). 'no_repeat': phrases naming an earlier part's scenes, events and stamps; any line that says, shows or reuses one fails.
    # And no event phrase may appear in the pictures of two different lines (the same scene shown twice inside a part).
    nr = d.get("no_repeat")
    if nr is None: F.append("R1 no 'no_repeat' list (the earlier parts' scenes, events and times this part must not show again)")
    else:
        for x in L:
            blob = " ".join([x["say"], x["picture"], x.get("reuse", "")]).lower()
            hit = [p for p in nr if p.lower() in blob]
            if hit: F.append(f"R1 {x['id']} repeats an earlier part: {hit}")
    for ev in d.get("show_once", []):
        where = [x["id"] for x in L if ev.lower() in x["picture"].lower()]
        if len(where) > 1: F.append(f"R2 the event '{ev}' is shown in {where}: show it once")
    # R3: every event an EARLIER part declares is on this part's no_repeat list (so nobody has to remember them)
    sib = sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(path)), "*_script.json")))
    me = os.path.abspath(path)
    for q in (sib[:sib.index(me)] if me in sib else []):
        ev = json.load(open(q, encoding="utf-8")).get("events")
        if ev is None: W.append(f"R3 {os.path.basename(q)} declares no 'events'"); continue
        miss = [e for e in ev if not any(e.lower() in n.lower() for n in (nr or []))]
        if miss: F.append(f"R3 events of {os.path.basename(q)} missing from no_repeat: {miss}")
    total_s = max(b for _, b in t_est.values())
    # ---- C: characters defined (the user 2026-11-18: "the story is very vague, define who, characters etc properly")
    ch = d.get("characters")
    if ch is None: F.append("C1 no 'characters' declared ({name: {role, introduced}})")
    else:
        def said(n, x): return re.search(rf"\b{re.escape(n)}\b", x["say"] + " " + " ".join(x["screen"]))
        for n in d.get("names", []):
            if " " in n or n.isupper(): continue
            if any(said(n, x) for x in L) and n not in ch: F.append(f"C1 '{n}' appears but is not in characters")
        for n, c in ch.items():
            if c.get("role") == "narrator": continue
            iid = c.get("introduced")
            if iid not in ids: F.append(f"C1 {n}: introduced line '{iid}' unknown"); continue
            k = ids.index(iid); first = next((i for i, x in enumerate(L) if said(n, x)), None)
            if first is not None and first < k - 1: F.append(f"C1 {n} is named at {ids[first]}, before being introduced at {iid}")
            near = norm(" ".join(L[j]["say"] for j in range(k, min(k + 2, len(L)))))
            noun = (norm(c.get("role", "")) or [""])[-1]
            if n.lower() not in near or noun not in near:
                F.append(f"C1 {n}: {iid} (or the next line) does not say the name and who they are (the role's noun '{noun}')")
    # ---- G: a goal, early, tracked (the user 2026-11-18: "no goal we are going towards")
    goal = d.get("goal")
    if not goal or goal.get("line") not in t_est: F.append("G1 no 'goal' declared, or its line is unknown")
    else:
        tg = t_est[goal["line"]][0]
        if tg > 0.30 * total_s: F.append(f"G1 the goal arrives at ~{tg:.0f} s, after the first 30% (~{0.3 * total_s:.0f} s)")
        if goal.get("target"):
            tgt = f"{goal['target']:,}"; k = ids.index(goal["line"])
            shown = [x["id"] for x in L[k:] if tgt in " ".join(x["screen"])]
            if len(shown) < 3: F.append(f"G1 the target {tgt} is on screen in {len(shown)} lines from {goal['line']} (>= 3, so it can be tracked)")
    # ---- K: not too complicated (the user 2026-11-18: "too complicated unnecessarily"; critic: "number soup")
    nums = set()
    for x in L:
        if t_est[x["id"]][0] < 15.0:
            nums |= {"clock" if ":" in t else re.sub(r"[^0-9]", "", t) for t in " ".join(x["screen"]).split() if re.sub(r"[^0-9]", "", t)}
    if len(nums) > lim.get("numbers_first15", 4): F.append(f"K1 {len(nums)} different numbers on screen in the first 15 s {sorted(nums)} > {lim.get('numbers_first15', 4)}")
    # C2 (the user 2026-11-18: "he must be younger brother so shorter, and so on"): every on-screen character has a cast spec
    # the build is checked against: height relative to the lead, age, look. A younger sibling is shorter than the lead.
    cast = d.get("cast")
    for n, c in (ch or {}).items():
        cs = (cast or {}).get(n)
        if not cs or not all(k in cs for k in ("height_vs_lead", "age", "look")):
            F.append(f"C2 {n}: no cast spec (height_vs_lead, age, look) for the build to be checked against"); continue
        if re.search(r"\b(little|younger|kid)\b", c.get("role", ""), re.I) and not cs["height_vs_lead"] < 1.0:
            F.append(f"C2 {n} is '{c['role']}' but height_vs_lead {cs['height_vs_lead']} is not below the lead's 1.0")
        if not 0.5 <= cs["height_vs_lead"] <= 1.2: F.append(f"C2 {n}: height_vs_lead {cs['height_vs_lead']} outside 0.5-1.2")
    nch = len([n for n, c in (ch or {}).items()])
    if nch > lim.get("characters", 4): F.append(f"K2 {nch} characters > {lim.get('characters', 4)} for one part")
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
    # ---- 2026-11-18, docs/SCRIPT_PLAYBOOK.md: the playbook's rules that can be measured. A script with "schema": 2 must declare
    # the keys they read (FAIL); an older script gets a warning, so parts approved before these rules are not re-gated by them.
    strict = d.get("schema", 1) >= 2
    def need(m): (F if strict else W).append(m)
    earlier = sib[:sib.index(me)] if me in sib else []
    def load(q): return json.load(open(q, encoding="utf-8"))
    def phrase_in(p, s): ph = " ".join(w for w in norm(p) if w); return bool(ph) and (" " + ph + " ") in (" " + " ".join(norm(s)) + " ")
    # N1/N2 the ending (STORY P2.19: "both halves of the choice said plainly"; P2.20 #7: the end card named one answer and tilted
    # the vote). "ending": {"answers": [{"word": <the vote word>, "line": id, "says": <phrase spoken there>, "cost": str}] x 2, "shape"}
    en = d.get("ending")
    if not en: need("N1 no 'ending' declared ({answers: two of {word, line, says, cost}, shape})")
    else:
        ans = en.get("answers", [])
        if len(ans) != 2: F.append(f"N1 the ending declares {len(ans)} answers, not 2")
        else:
            if ans[0].get("line") == ans[1].get("line"): F.append("N1 both answers sit on one line: give each half its own line")
            for a_ in ans:
                x = next((y for y in L if y["id"] == a_.get("line")), None)
                if not x: F.append(f"N1 answer '{a_.get('word')}': line {a_.get('line')} unknown"); continue
                if x["job"] != order[-2]: F.append(f"N1 answer '{a_['word']}' is on {x['id']} ({x['job']}), not in the '{order[-2]}' section")
                if not phrase_in(a_.get("says", ""), x["say"]): F.append(f"N1 {x['id']} does not say its half: '{a_.get('says')}'")
                if not str(a_.get("cost", "")).strip(): F.append(f"N1 answer '{a_['word']}' states no cost")
            card = " ".join(L[-1]["screen"] + L[-1]["caption"]).upper()
            miss = [a_["word"] for a_ in ans if not re.search(rf"\b{re.escape(a_['word'].upper())}\b", card)]
            if miss: F.append(f"N2 the end card does not name {miss}: name both answers, or it tilts the vote")
    # R4 a new shape each part (STORY P2.5 #18, P2.20 #14: the hook device and the ending's shape repeated Part 1). A repeat the user
    # chose is declared in "allow_repeat": {"hook device" | "ending shape": "<why, who, when>"} and warns instead.
    mine = {"hook device": h.get("device"), "ending shape": (en or {}).get("shape")}
    for k, v in mine.items():
        if not v: need(f"R4 no {k} declared (hook.device, ending.shape), so a repeat of an earlier part's cannot be caught")
    for q in earlier:
        qd = load(q)
        for k, v in (("hook device", qd.get("hook", {}).get("device")), ("ending shape", (qd.get("ending") or {}).get("shape"))):
            if v and mine[k] and v.strip().lower() == mine[k].strip().lower():
                why = d.get("allow_repeat", {}).get(k)
                (W if why else F).append(f"R4 the {k} '{v}' repeats {os.path.basename(q)}" + (f" (allowed: {why})" if why else ""))
    # L5/L6 rules that hold across parts (STORY 7b B1, 7c #1: the price arithmetic broke at a seam). This part's ledger starts where
    # the previous part's ended, and no price falls below the previous part's highest ("each costs more", as a viewer heard it).
    if g and earlier:
        qg = load(earlier[-1]).get("ledger")
        if qg:
            qend = qg["start"] + sum(s["change"] for s in qg["steps"])
            if g["start"] != qend: F.append(f"L5 the ledger starts at {g['start']:,}; {os.path.basename(earlier[-1])} ended at {qend:,}")
            if qg.get("prices") and g.get("prices") and min(g["prices"]) < max(qg["prices"]):
                F.append(f"L6 a price of {min(g['prices']):,} is below {os.path.basename(earlier[-1])}'s highest, {max(qg['prices']):,}")
    # S6 the length is estimated at a MEASURED pace (STORY 7c/7e: the template's assumed 2.5 words/s put Part 1 at ~96 s; the voice
    # measured 3.43 words/s on the timeline). Within 8% of the previous timed part's words / timeline seconds.
    ref_pace = None
    for q in earlier[::-1]:
        qd = load(q)
        if qd.get("timing"):
            try:
                tx = open(os.path.join(ROOT, qd["timing"]), encoding="utf-8").read()
                ref_pace = sum(len(words(x["say"])) for x in qd["lines"]) / json.loads(tx[tx.index("{"):tx.rindex("}") + 1])["end"]; break
            except (OSError, ValueError, KeyError, ZeroDivisionError) as e:
                W.append(f"S6 {os.path.basename(q)}'s timing unreadable ({e})")
    if ref_pace and not speed_ok(d["pace_wps"], ref_pace):
        F.append(f"S6 pace_wps {d['pace_wps']} vs {ref_pace:.2f} words/s measured on the previous part's timeline (> 8% apart)")
    elif not ref_pace and not re.search(r"\d", d.get("pace_source", "")): need("S6 pace_source names no measurement (words in seconds)")
    # T6 plain words (ERR-0011: four critic rounds passed regional words a listener could not follow; SCRIPT_V8_DRAFT section 5).
    # T7 nothing that tells a cold viewer they missed something (STORY P2.15 #4). A word the story needs goes in "allow_words".
    allow = {w.lower() for w in d.get("allow_words", [])}
    PLAIN = {"till": "the counter", "kerb": "the road", "pavement": "the street", "fortnight": "two weeks", "queue": "a line"}
    COLD = ("last time", "previously", "as you know", "as i said", "remember when")
    for x in L:
        hit = [f"{w} (say {PLAIN[w]})" for w in norm(x["say"]) if w in PLAIN and w not in allow]
        if hit: F.append(f"T6 {x['id']}: regional or jargon word {hit}; a stranger hears it once")
        if x["job"] != order[-1]:
            cold = [p for p in COLD if phrase_in(p, x["say"]) and p not in allow]
            if cold: F.append(f"T7 {x['id']} says {cold}: it tells a new viewer they missed the earlier part")
    # K3 every clock time shown or said is on the part's story clock (the user, 2026-11-16: "message comes at what time and what
    # time does he get up, all should be documented and thought out"). "clock": ["8:09", ...]
    times = sorted({(x["id"], t) for x in L for t in re.findall(r"\b\d{1,2}:\d\d\b", " ".join([x["say"], x["picture"]] + x["screen"]))})
    clock = d.get("clock")
    if times and clock is None: need(f"K3 clock times {sorted({t for _, t in times})} on screen, but no 'clock' declared")
    elif clock is not None:
        off = [f"{i} {t}" for i, t in times if t not in clock]
        if off: F.append(f"K3 times not on the story clock: {off}")
    # A5 the timing file speaks this part's words (ERR-0023, ERR-0024: a parser read another part's rows by line id)
    if d.get("timing"):
        try:
            bad_t = timing_mismatch(os.path.join(ROOT, d["timing"]), L)
            if bad_t: F.append(f"A5 {d['timing']} differs from the script's words on {bad_t[:6]}: built from another part's text?")
        except (OSError, ValueError, KeyError) as e:
            F.append(f"A5 timing file unreadable ({e})")
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
        # A4 (the user 2026-11-18: "speak in the same speed as last time"): voiced words per second of WAV, against the
        # previous part's own WAVs measured the same way; within 8%
        r = voice_rate(os.path.join(ROOT, os.path.dirname(dl), "audio"), L)
        prev = [q for q in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(path)), "*_script.json"))) if q < os.path.abspath(path)]
        ref = None
        for q in prev[::-1]:
            qd = json.load(open(q, encoding="utf-8"))
            if qd.get("delivery"):
                ref = voice_rate(os.path.join(ROOT, os.path.dirname(qd["delivery"]), "audio"), qd["lines"]); break
        if r and ref and not speed_ok(r, ref): F.append(f"A4 voice speed {r:.2f} words/s vs the previous part's {ref:.2f} (> 8% apart)")
        elif r and not ref: W.append(f"A4 voice speed {r:.2f} words/s (no earlier voiced part to compare)")
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

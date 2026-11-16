#!/usr/bin/env python3
"""freellm - send one prompt to a free LLM endpoint, falling over to the next on failure.

Ours. Standard library only. Provider data comes from the list cloned at
external_tools/research/awesome-free-llm-apis (CC0); the table below is a small hand-picked
subset of it, checked 2026-11-13. Limits and model ids go stale - see README.md.

    python tools/freellm/freellm.py "Say hello"
    python tools/freellm/freellm.py --file prompt.txt --system "You are a script critic."
    python tools/freellm/freellm.py --list

The answer goes to stdout. Which provider answered, and every failure on the way, go to stderr.
Exit code 0 = an answer was printed. 1 = every provider failed. 2 = bad usage.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

# name, base URL, model, env var holding the key (None = works with no key),
# logs: True when the list says the route may log or train on prompts.
PROVIDERS = [
    {"name": "ovh", "base": "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
     "model": "Mistral-Small-3.2-24B-Instruct-2506", "key_env": None, "logs": False,
     "note": "keyless, 2 requests/minute per model, EU-hosted"},
    {"name": "llm7", "base": "https://api.llm7.io/v1",
     "model": "mistral-Nemo-Instruct-2407", "key_env": None, "logs": False,
     "note": "keyless; anonymous limits undocumented"},
    {"name": "groq", "base": "https://api.groq.com/openai/v1",
     "model": "openai/gpt-oss-120b", "key_env": "GROQ_API_KEY", "logs": False,
     "note": "needs a free key; 30 requests/minute, 1,000/day"},
    {"name": "kilo", "base": "https://api.kilo.ai/api/gateway",
     "model": "kilo-auto/free", "key_env": None, "logs": True,
     "note": "keyless, 200 requests/hour; may route to providers that log prompts"},
    {"name": "openrouter", "base": "https://openrouter.ai/api/v1",
     "model": "openrouter/free", "key_env": "OPENROUTER_API_KEY", "logs": True,
     "note": "needs a free key; 50 requests/day; free routes may log prompts for training"},
    {"name": "gemini", "base": "https://generativelanguage.googleapis.com/v1beta/openai",
     "model": "gemini-2.5-flash", "key_env": "GEMINI_API_KEY", "logs": True,
     "note": "needs a free key; free-tier prompts may be used to improve Google products"},
]

RETRYABLE = {408, 409, 425, 429, 500, 502, 503, 504}


def load_env(path):
    """Read KEY=VALUE lines from a .env file into os.environ without overriding what is set."""
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def call(p, messages, max_tokens, temperature, timeout):
    """One request. Returns (text, None) or (None, reason)."""
    body = {"model": p["model"], "messages": messages,
            "max_tokens": max_tokens, "temperature": temperature}
    headers = {"Content-Type": "application/json", "User-Agent": "freellm/1"}
    if p["key_env"]:
        headers["Authorization"] = "Bearer " + os.environ[p["key_env"]]
    req = urllib.request.Request(p["base"] + "/chat/completions",
                                 data=json.dumps(body).encode("utf-8"),
                                 headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:200].replace("\n", " ")
        kind = "retryable" if e.code in RETRYABLE else "refused"
        return None, "HTTP %d (%s): %s" % (e.code, kind, detail)
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return None, "network: %s" % e
    except ValueError:
        return None, "reply was not JSON"
    try:
        choice = data["choices"][0]
        text = (choice["message"].get("content") or "").strip()
    except (KeyError, IndexError, TypeError, AttributeError):
        return None, "unexpected reply shape: %s" % json.dumps(data)[:200]
    if not text:
        # Seen 2026-11-13: a reasoning model returned HTTP 200 with every token spent on
        # thinking and no answer. An empty answer is a failure, not a success.
        return None, "empty answer (finish_reason=%s) - a reasoning model may need more --max-tokens" \
            % choice.get("finish_reason")
    if choice.get("finish_reason") == "length":
        print("[freellm] WARNING: answer was cut off at --max-tokens", file=sys.stderr)
    return text, None


def main():
    ap = argparse.ArgumentParser(description="One prompt to a free LLM, with fallback.")
    ap.add_argument("prompt", nargs="?", help="the prompt (or use --file, or pipe stdin)")
    ap.add_argument("--file", help="read the prompt from this file")
    ap.add_argument("--system", help="system message")
    ap.add_argument("--provider", help="comma-separated provider names, in the order to try")
    ap.add_argument("--model", help="override the model id (only with a single --provider)")
    ap.add_argument("--max-tokens", type=int, default=1500)
    ap.add_argument("--temperature", type=float, default=0.7)
    ap.add_argument("--timeout", type=int, default=90)
    ap.add_argument("--allow-logging", action="store_true",
                    help="also use providers that may log or train on prompts")
    ap.add_argument("--list", action="store_true", help="show providers and exit")
    a = ap.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    load_env(os.path.join(root, ".env"))

    if a.list:
        for p in PROVIDERS:
            key = "no key needed" if not p["key_env"] else (
                "key set" if os.environ.get(p["key_env"]) else "NO KEY (%s)" % p["key_env"])
            print("%-11s %-38s %-22s %s%s" % (p["name"], p["model"], key,
                                              "[may log prompts] " if p["logs"] else "", p["note"]))
        return 0

    if a.file:
        with open(a.file, encoding="utf-8") as fh:
            prompt = fh.read()
    elif a.prompt:
        prompt = a.prompt
    elif not sys.stdin.isatty():
        prompt = sys.stdin.read()
    else:
        ap.error("give a prompt, --file, or pipe text in")
    if not prompt.strip():
        ap.error("the prompt is empty")

    chain = PROVIDERS
    if a.provider:
        names = [n.strip() for n in a.provider.split(",") if n.strip()]
        known = {p["name"]: p for p in PROVIDERS}
        bad = [n for n in names if n not in known]
        if bad:
            ap.error("unknown provider(s): %s" % ", ".join(bad))
        chain = [dict(known[n]) for n in names]
    if a.model:
        if len(chain) != 1 or not a.provider:
            ap.error("--model needs exactly one --provider")
        chain[0]["model"] = a.model

    messages = ([{"role": "system", "content": a.system}] if a.system else []) + \
               [{"role": "user", "content": prompt}]

    tried = 0
    for p in chain:
        if p["logs"] and not a.allow_logging:
            print("[freellm] skip %s: may log or train on prompts (use --allow-logging)" % p["name"],
                  file=sys.stderr)
            continue
        if p["key_env"] and not os.environ.get(p["key_env"]):
            print("[freellm] skip %s: no %s in the environment or .env" % (p["name"], p["key_env"]),
                  file=sys.stderr)
            continue
        tried += 1
        t0 = time.time()
        text, err = call(p, messages, a.max_tokens, a.temperature, a.timeout)
        dt = time.time() - t0
        if text is not None:
            print("[freellm] answered by %s / %s in %.1fs" % (p["name"], p["model"], dt), file=sys.stderr)
            sys.stdout.buffer.write((text + "\n").encode("utf-8"))
            return 0
        print("[freellm] %s failed after %.1fs: %s" % (p["name"], dt, err), file=sys.stderr)

    print("[freellm] no answer: %d provider(s) tried, all failed" % tried, file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())

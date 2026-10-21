#!/usr/bin/env python3
"""Smoke test of a running video stack, as a visitor who isn't signed in (no account needed).

  python3 jellyfin/tests/smoke.py [BASE]   default http://127.0.0.1:8098/kodai1994/ (the live gateway)

deploy.sh runs it after every deploy. Checks the page and its security headers, that the
services answer, and that nothing members-only is reachable without signing in.
"""
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8098/kodai1994/").rstrip("/") + "/"
ROOT = BASE.split("/kodai1994/")[0]
fails = 0


def get(url, headers=None):
    req = urllib.request.Request(url, headers=dict({"User-Agent": "kodai-smoke-test"}, **(headers or {})))
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.headers, r.read(4096)
    except urllib.error.HTTPError as e:
        with e:
            return e.code, e.headers, e.read(4096)


def check(name, ok, detail=""):
    global fails
    fails += not ok
    print(("ok    " if ok else "FAIL  ") + name + (f" ({detail})" if detail and not ok else ""))


st, h, body = get(BASE)
check("the page loads", st == 200, st)
csp = h.get("Content-Security-Policy", "")
check("Content-Security-Policy: no inline script", "script-src 'self'" in csp and "'unsafe-inline'" not in csp.split("script-src")[1].split(";")[0], csp[:80])
check("not shown in frames", h.get("X-Frame-Options") == "DENY")
check("not indexed", "noindex" in (h.get("X-Robots-Tag") or ""))
check("no inline script in the page", b"<script>" not in body)
check("community service answers", get(BASE + "api/health")[0] == 200)
check("signed out: no member data", get(BASE + "api/me")[0] == 401)
check("signed out: the session says so", get(BASE + "api/session")[2].startswith(b'{"signedIn": false'))
try:   # a write without the page's X-Kodai header (as another site's form would send) is refused
    urllib.request.urlopen(urllib.request.Request(BASE + "api/comments", data=b"{}", method="POST", headers={"User-Agent": "kodai-smoke-test"}), timeout=20).close(); st = 200
except urllib.error.HTTPError as e:
    st = e.code; e.close()
check("writes need the page's header", st == 400, st)
for path in ("hls/ready.json", "faces/x.jpg", "memories/x.pdf"):
    st = get(BASE + path)[0]
    check(f"members only: /{path}", st in (401, 403), st)
for path in ("jf/UserViews", "jf/Users", "jf/System/Info"):
    st = get(BASE + path)[0]
    check(f"Jellyfin through /jf/ refused when signed out: {path}", st in (401, 403, 404), st)
for path in ("/videos/x/stream", "/Items/x/Download", "/web/index.html"):
    st = get(ROOT + path)[0]
    check(f"Jellyfin's own playback/download blocked: {path}", st == 404, st)
print("smoke test: " + ("passed" if not fails else f"{fails} FAILED"))
sys.exit(1 if fails else 0)

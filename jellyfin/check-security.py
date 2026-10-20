#!/usr/bin/env python3
"""Probe the video gateway: nothing private may be reachable without a member's sign-in.

    python3 -I jellyfin/check-security.py                          # local gateway
    python3 -I jellyfin/check-security.py https://videos.yajur.ai  # through the tunnel

Uses the admin credentials in the stack folder to find a real item ID and get a valid
token, then checks that:
  - Jellyfin's own stream/download/web endpoints are blocked (404) in every disguise,
    even with a valid token (members watch the HLS copies instead);
  - members-only files under /kodai1994/hls/ need the kodai_auth cookie (401 without);
  - item images and listings need a token; the community API needs a member.
Exits non-zero if anything leaks.
"""
import http.client, json, os, sys, urllib.parse, urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8098").rstrip("/")
STACK = os.environ.get("VIDEOS_STACK_DIR", os.path.expanduser("~/services/yajur-videos"))
AUTH = 'MediaBrowser Client="yajur-security-check", Device="cli", DeviceId="yajur-security-check", Version="1.0"'
# Cloudflare's Browser Integrity Check rejects Python's default User-Agent (error 1010).
UA = "yajur-security-check/1.0"


def api(method, path, body=None, token=None):
    headers = {"Authorization": AUTH + (f', Token="{token}"' if token else ""), "User-Agent": UA}
    data = json.dumps(body).encode() if body is not None else None
    if data: headers["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, method=method, headers=headers), timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def status(path, headers=None):
    u = urllib.parse.urlsplit(BASE)
    conn = (http.client.HTTPSConnection if u.scheme == "https" else http.client.HTTPConnection)(u.netloc, timeout=30)
    conn.putrequest("GET", path, skip_accept_encoding=True)  # send the path byte-for-byte
    conn.putheader("User-Agent", UA)
    for k, v in (headers or {}).items(): conn.putheader(k, v)
    conn.putheader("Range", "bytes=0-99")
    conn.endheaders()
    r = conn.getresponse(); r.read(); conn.close()
    return r.status


creds = dict(l.split(": ", 1) for l in open(os.path.join(STACK, "admin-credentials.txt")).read().splitlines() if ": " in l)
tok = api("POST", "/Users/AuthenticateByName", {"Username": creds["username"].strip(), "Pw": creds["password"].strip()})["AccessToken"]
items = api("GET", "/Items?Recursive=true&IncludeItemTypes=Video,Movie&Limit=1", token=tok)["Items"]
if not items:
    sys.exit("No videos in any library yet; nothing to probe.")
i = items[0]["Id"]
H = {"Authorization": AUTH + f', Token="{tok}"'}
COOKIE = {"Cookie": f"kodai_auth={tok}"}

checks = [  # (label, path, headers, allowed statuses)
    *[("blocked", p, h, {404}) for p in [
        f"/Videos/{i}/stream?static=true", f"/videos/{i}/stream?static=true", f"/VIDEOS/{i}/STREAM?static=true",
        f"//Videos/{i}/stream?static=true", f"/Videos/{i}/stream.mp4?static=true", f"/%56ideos/{i}/stream?static=true",
        f"/Videos/{i}/master.m3u8", f"/Audio/{i}/stream?static=true", f"/Items/{i}/Download", f"/Items/{i}/File",
        f"/Videos/{i}/{i}/Subtitles/0/Stream.vtt", "/web/", "/web", "/WEB/index.html",
    ] for h in (None, H)],
    ("needs cookie", "/kodai1994/hls/ready.json", None, {401}),
    ("needs cookie", "/kodai1994/hls/backdrop.jpg", None, {401}),
    ("needs cookie", "/kodai1994/hls/photos/photos.json", None, {401}),
    ("needs cookie", "/kodai1994/hls/backdrop.jpg", {"Cookie": "kodai_auth=deadbeefdeadbeefdeadbeefdeadbeef"}, {401}),
    ("needs cookie", "/KODAI1994/HLS/backdrop.jpg", None, {401, 404}),
    ("needs cookie", "/kodai1994/hls/../hls/backdrop.jpg", None, {401}),
    ("needs token", f"/Items/{i}/Images/Primary", None, {401}),
    ("needs token", f"/Items/{i}", None, {401}),
    ("needs token", "/Items?Recursive=true", None, {401}),
    ("needs member", "/kodai1994/api/me", None, {401}),
    ("needs member", "/kodai1994/api/comments?target=photo:01", {"X-Kodai-Token": tok}, {401}),
    ("member ok", "/kodai1994/hls/backdrop.jpg", COOKIE, {200, 206}),
    ("member ok", "/kodai1994/hls/ready.json", COOKIE, {200, 206}),
    ("member ok", "/kodai1994/api/me", COOKIE, {200}),
    ("member ok", f"/Items/{i}/Images/Primary?ApiKey={tok}", None, {200}),
]

problems = 0
print(f"Probing {BASE} with item {i}\n")
for label, path, headers, want in checks:
    s = status(path, headers)
    ok = s in want; problems += not ok
    shown = path.replace(tok, "<token>")
    extra = " (with token)" if headers is H else (" (member cookie)" if headers is COOKIE else "")
    print(f"{'ok  ' if ok else 'LEAK'} {s}  {label:12s} {shown}{extra}")
print("\nNothing private is reachable without a member's sign-in." if not problems else f"\n{problems} problem(s): see LEAK lines.")
sys.exit(1 if problems else 0)

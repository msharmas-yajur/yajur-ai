#!/usr/bin/env python3
"""Probe the video gateway: media must be unreachable without a valid Jellyfin token.

    python3 -I jellyfin/check-security.py                          # local gateway
    python3 -I jellyfin/check-security.py https://videos.yajur.ai  # through the tunnel

Uses the admin credentials in the stack folder to find a real item ID and get a valid
token, then requests that item's stream and image in many disguises (case, slashes,
encoding, bogus keys) without one. Exits non-zero if anything leaks.
"""
import http.client, json, os, sys, urllib.parse, urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8098").rstrip("/")
STACK = os.environ.get("VIDEOS_STACK_DIR", os.path.expanduser("~/services/yajur-videos"))
AUTH = 'MediaBrowser Client="yajur-security-check", Device="cli", DeviceId="yajur-security-check", Version="1.0"'


def api(method, path, body=None, token=None):
    headers = {"Authorization": AUTH + (f', Token="{token}"' if token else "")}
    data = json.dumps(body).encode() if body is not None else None
    if data: headers["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, method=method, headers=headers), timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def status(path, headers=None):
    u = urllib.parse.urlsplit(BASE)
    conn = (http.client.HTTPSConnection if u.scheme == "https" else http.client.HTTPConnection)(u.netloc, timeout=30)
    conn.putrequest("GET", path, skip_accept_encoding=True)  # send the path byte-for-byte
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

deny = [
    f"/Videos/{i}/stream?static=true", f"/videos/{i}/stream?static=true", f"/VIDEOS/{i}/STREAM?static=true",
    f"//Videos/{i}/stream?static=true", f"/Videos/{i}/stream.mp4?static=true", f"/%56ideos/{i}/stream?static=true",
    f"/web/../Videos/{i}/stream?static=true", f"/./Videos/{i}/stream?static=true",
    f"/Videos/{i}/stream?static=true&ApiKey=deadbeefdeadbeefdeadbeefdeadbeef", f"/Videos/{i}/stream?static=true&ApiKey=",
    f"/Audio/{i}/stream?static=true", f"/Items/{i}/Images/Primary", f"/items/{i}/images/primary",
    f"/Videos/{i}/{i}/Subtitles/0/Stream.vtt", f"/Videos/{i}/{i}/Attachments/0",
    f"/Items/{i}", f"/Items?Recursive=true",
]
allow = [(f"/Videos/{i}/stream?static=true&ApiKey={tok}", None),
         (f"/Items/{i}/Images/Primary?ApiKey={tok}", None),
         (f"/Videos/{i}/stream?static=true", {"Authorization": AUTH + f', Token="{tok}"'})]

problems = 0
print(f"Probing {BASE} with item {i}\n")
for p in deny:
    s = status(p); ok = s in (400, 401, 403, 404); problems += not ok
    print(f"{'ok  ' if ok else 'LEAK'} {s}  {p}")
for p, h in allow:
    s = status(p, h); ok = s in (200, 206); problems += not ok
    print(f"{'ok  ' if ok else 'FAIL'} {s}  {p.replace(tok, '<token>')}{'  (Authorization header)' if h else ''}")
print("\nAll media requires a valid token." if not problems else f"\n{problems} problem(s) — see LEAK/FAIL lines.")
sys.exit(1 if problems else 0)

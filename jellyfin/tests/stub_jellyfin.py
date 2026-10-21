#!/usr/bin/env python3
"""A stand-in for Jellyfin, for the tests and the staging stack (tests/staging.sh).

Implements just what the Kodai 1994 page, the gateway and the community service ask
Jellyfin for: sign-in, /Users/Me, the library check (/Items/<library>), the library's
items, playback sessions, sign-out, password changes, and creating accounts (approving
access requests). Accounts live in memory; every restart starts from USERS below.

Env: PORT (8096), LIBRARY_ID, ITEMS (a JSON file: [{"Name", "RunTimeTicks"}]; made by
staging.sh from the real recordings), STUB_PASSWORD (password of the built-in accounts).
"""
import hashlib
import json
import os
import re
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LIBRARY_ID = os.environ.get("LIBRARY_ID", "0" * 32)
PASSWORD = os.environ.get("STUB_PASSWORD", "test-password")
lock = threading.Lock()
# username → {Id, Name, Password, IsAdministrator, library}
USERS = {}
TOKENS = {}   # token → username


def add_user(name, password, admin=False, library=True):
    # ids stay the same across restarts, so profiles in the database keep matching
    USERS[name] = {"Id": hashlib.md5(name.encode()).hexdigest(), "Name": name, "Password": password, "IsAdministrator": admin, "library": library}
    return USERS[name]


add_user("admin", PASSWORD, admin=True)
add_user("member@example.com", PASSWORD)
add_user("other@example.com", PASSWORD)
add_user("outsider@example.com", PASSWORD, library=False)   # an account without the Kodai library
# Fixed tokens, so tests can act as someone without signing in (as an API key would)
for _name, _tok in (("admin", "a" * 32), ("member@example.com", "b" * 32), ("other@example.com", "c" * 32),
                    ("outsider@example.com", "d" * 32)):
    TOKENS[_tok] = _name

try:
    with open(os.environ.get("ITEMS", "")) as f:
        ITEMS = json.load(f)
except (OSError, ValueError):
    ITEMS = [{"Name": "1994-04-14 - April 14th - Discourse (Tamil New Year)", "RunTimeTicks": 36000000000}]
for i, it in enumerate(ITEMS):
    it.setdefault("Id", f"{i + 1:032x}")
    it.setdefault("Type", "Movie")
    it.setdefault("DateCreated", "2026-10-01T00:00:00.0000000Z")
    it.setdefault("ImageTags", {})


def token_of(headers):
    auth = headers.get("Authorization", "")
    m = re.search(r'Token="([^"]*)"', auth)
    return m.group(1) if m else ""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def reply(self, status, body=None):
        raw = b"" if body is None else json.dumps(body).encode()
        self.send_response(status)
        if raw:
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return {}

    def user(self):
        with lock:
            name = TOKENS.get(token_of(self.headers)) or (TOKENS.get(self.query().get("ApiKey", "")))
            return USERS.get(name) if name else None

    def query(self):
        qs = self.path.partition("?")[2]
        return dict(p.split("=", 1) for p in qs.split("&") if "=" in p)

    def public(self, u):
        return {"Id": u["Id"], "Name": u["Name"], "Policy": {"IsAdministrator": u["IsAdministrator"], "EnabledFolders": [LIBRARY_ID]}}

    def route(self, method):
        path = self.path.partition("?")[0]
        if method == "GET" and path == "/health":
            return self.reply(200, {"ok": True})
        if method == "POST" and path == "/Users/AuthenticateByName":
            b = self.body()
            with lock:
                u = USERS.get(str(b.get("Username", "")))
                if not u or u["Password"] != b.get("Pw"):
                    return self.reply(401)
                tok = secrets.token_hex(16)
                TOKENS[tok] = u["Name"]
            return self.reply(200, {"AccessToken": tok, "User": self.public(u)})
        u = self.user()
        if not u:
            return self.reply(401)
        if method == "GET" and path == "/Users/Me":
            return self.reply(200, self.public(u))
        if method == "GET" and path == f"/Items/{LIBRARY_ID}":
            return self.reply(200, {"Id": LIBRARY_ID, "Name": "Kodai 1994"}) if u["library"] else self.reply(404)
        if method == "GET" and path == "/UserViews":
            return self.reply(200, {"Items": [{"Id": LIBRARY_ID, "Name": "Kodai 1994"}] if u["library"] else []})
        if method == "GET" and path == "/Items":
            items = [dict(it, UserData={"PlaybackPositionTicks": 0}) for it in ITEMS] if u["library"] else []
            return self.reply(200, {"Items": items, "TotalRecordCount": len(items)})
        if method == "POST" and re.fullmatch(r"/Items/[0-9a-f]+/PlaybackInfo", path):
            return self.reply(200, {"MediaSources": [{"Id": path.split("/")[2]}], "PlaySessionId": secrets.token_hex(8)})
        if method == "POST" and path in ("/Sessions/Playing", "/Sessions/Playing/Progress", "/Sessions/Playing/Stopped"):
            return self.reply(204)
        if method == "POST" and path == "/Sessions/Logout":
            with lock:
                TOKENS.pop(token_of(self.headers), None)
            return self.reply(204)
        m = re.fullmatch(r"/Users/([0-9a-f]{32})/Password", path)
        if method == "POST" and m:
            b = self.body()
            if m.group(1) != u["Id"]:
                return self.reply(403)
            if b.get("CurrentPw") != u["Password"]:
                return self.reply(403)
            u["Password"] = b.get("NewPw", "")
            return self.reply(204)
        # admin: accounts (approving access requests)
        if not u["IsAdministrator"]:
            return self.reply(403)
        if method == "GET" and path == "/Users":
            return self.reply(200, [self.public(x) for x in USERS.values()])
        if method == "POST" and path == "/Users/New":
            b = self.body()
            with lock:
                nu = add_user(b["Name"], b.get("Password", ""))
            return self.reply(200, self.public(nu))
        m = re.fullmatch(r"/Users/([0-9a-f]{32})(/Policy)?", path)
        if m:
            target = next((x for x in USERS.values() if x["Id"] == m.group(1)), None)
            if not target:
                return self.reply(404)
            if method == "GET":
                return self.reply(200, self.public(target))
            if method == "POST" and m.group(2):
                target["library"] = LIBRARY_ID in (self.body().get("EnabledFolders") or [])
                return self.reply(204)
        return self.reply(404)

    def do_GET(self): self.route("GET")
    def do_POST(self): self.route("POST")


if __name__ == "__main__":
    ThreadingHTTPServer.daemon_threads = True
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", 8096))), Handler).serve_forever()

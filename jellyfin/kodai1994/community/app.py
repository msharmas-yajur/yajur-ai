#!/usr/bin/env python3
"""Kodai 1994 community service: comments, display names, and access requests.

Runs behind the gateway at /kodai1994/api/ (the gateway strips that prefix). Uses only
the standard library and stores everything in SQLite at $DATA_DIR/community.db.

Identity: the gateway forwards the member's Jellyfin token (the kodai_auth cookie) as
X-Kodai-Token, overwriting anything the browser sent. Every request re-checks the token
with Jellyfin (/Users/Me) and that the user can see the Kodai library, so only
signed-in members can read or write, and comments are always attributed to the account
that posted them. Admin actions (approving access requests) run with the admin's own
token; this service holds no Jellyfin credentials of its own.

Email (optional; set SMTP_* in the stack's .env): a new access request emails
ADMIN_EMAIL with a link to review it, and approving one emails the sign-in details to
the person who asked. Without SMTP settings nothing is sent and the admin copies the
details from the page instead.

Routes (JSON):
  GET    /me                       who am I, my display name, am I admin
  PUT    /me                       {displayName}
  GET    /comments?target=...      comments on video:<slug> or photo:<id>
  GET    /counts                   {target: number of comments}
  POST   /comments                 {target, body, position?}  position = seconds into a video
  DELETE /comments/<id>            own comment, or any comment for the admin
  POST   /access-requests          {name, email, message?}    public: the sign-in page's form
  GET    /admin/requests           pending requests (admin)
  POST   /admin/requests/<id>/approve   creates the account, returns its password (admin)
  POST   /admin/requests/<id>/reject    (admin)
"""
import json
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

JELLYFIN = os.environ.get("JELLYFIN_URL", "http://jellyfin:8096")
LIBRARY_ID = os.environ["KODAI_LIBRARY_ID"]
LIBRARY_NAME = os.environ.get("KODAI_LIBRARY_NAME", "Kodai 1994")
DB_PATH = os.path.join(os.environ.get("DATA_DIR", "/data"), "community.db")
SITE_URL = os.environ.get("SITE_URL", "https://videos.yajur.ai/kodai1994/")
CLIENT = 'MediaBrowser Client="Kodai 1994 community", Device="server", DeviceId="kodai-community", Version="1.0"'
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT") or 587)
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
MAIL_FROM = os.environ.get("MAIL_FROM") or SMTP_USER
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")

TARGET = re.compile(r"^(video:[a-z0-9-]{1,120}|photo:[0-9]{2,3})$")
EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$")
CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
LOGIN_ATTEMPTS = 5          # same policy as add-viewer.py
MAX_PENDING_REQUESTS = 200  # cap on unreviewed access requests


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clean(text, limit, multiline=False):
    text = CONTROL.sub("", str(text or ""))
    if not multiline:
        text = " ".join(text.split())
    return text.strip()[:limit]


# ── Email
def mail_enabled():
    return bool(SMTP_HOST and MAIL_FROM)


def send_mail(to, subject, body):
    """Send a plain-text email; returns True on success. Never raises."""
    if not mail_enabled() or not to:
        return False
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = f"Kodai 1994 <{MAIL_FROM}>", to, subject
    msg.set_content(body)
    try:
        ctx = ssl.create_default_context()
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=20)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20)
            server.starttls(context=ctx)
        with server:
            if SMTP_USER:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except (OSError, smtplib.SMTPException) as e:
        print(f"email to {to} failed: {type(e).__name__}", flush=True)
        return False


def send_mail_later(to, subject, body):
    threading.Thread(target=send_mail, args=(to, subject, body), daemon=True).start()


# ── Storage
db_lock = threading.Lock()
db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.row_factory = sqlite3.Row
db.executescript("""
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS profiles (
    user_id      TEXT PRIMARY KEY,
    username     TEXT NOT NULL,
    display_name TEXT,
    updated_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY,
    target      TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    body        TEXT NOT NULL,
    position_s  INTEGER,
    created_at  TEXT NOT NULL,
    deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS comments_by_target ON comments (target, created_at);
CREATE TABLE IF NOT EXISTS access_requests (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    message     TEXT,
    ip          TEXT,
    created_at  TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    decided_at  TEXT,
    decided_by  TEXT,
    username    TEXT
);
""")


def query(sql, args=()):
    with db_lock:
        return [dict(r) for r in db.execute(sql, args).fetchall()]


def execute(sql, args=()):
    with db_lock:
        cur = db.execute(sql, args)
        db.commit()
        return cur.lastrowid


# ── Jellyfin
def jellyfin(method, path, token, body=None):
    headers = {"Authorization": f'{CLIENT}, Token="{token}"'}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(JELLYFIN + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


identity_cache, identity_lock = {}, threading.Lock()


def identify(token):
    """Jellyfin user behind a token, if they may use the Kodai library; cached 60 s."""
    if not token or not re.fullmatch(r"[A-Za-z0-9]{16,128}", token):
        return None
    with identity_lock:
        hit = identity_cache.get(token)
        if hit and hit[0] > time.time():
            return hit[1]
    try:
        me = jellyfin("GET", "/Users/Me", token)
        jellyfin("GET", f"/Items/{LIBRARY_ID}", token)  # 404 unless they can see the library
        who = {"id": me["Id"], "username": me["Name"], "isAdmin": bool(me.get("Policy", {}).get("IsAdministrator"))}
    except (urllib.error.URLError, KeyError, ValueError):
        who = None
    with identity_lock:
        identity_cache[token] = (time.time() + 60, who)
        if len(identity_cache) > 5000:
            identity_cache.clear()
    if who:
        execute("INSERT INTO profiles (user_id, username, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(user_id) DO UPDATE SET username = excluded.username", (who["id"], who["username"], now()))
    return who


# ── Rate limits (in memory; reset on restart, which is fine for abuse control)
buckets, bucket_lock = {}, threading.Lock()


def allow(key, limit, window):
    t = time.time()
    with bucket_lock:
        hits = [h for h in buckets.get(key, []) if h > t - window]
        if len(hits) >= limit:
            buckets[key] = hits
            return False
        hits.append(t)
        buckets[key] = hits
        return True


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


class Handler(BaseHTTPRequestHandler):
    server_version = "kodai-community"
    sys_version = ""

    def log_message(self, fmt, *args):  # no request logging: paths carry nothing useful, bodies are private
        pass

    # ── plumbing
    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "private, no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > 16384:
            raise ApiError(413, "That's too long.")
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            raise ApiError(400, "The request wasn't valid JSON.")
        if not isinstance(data, dict):
            raise ApiError(400, "The request wasn't a JSON object.")
        return data

    def member(self):
        who = identify(self.headers.get("X-Kodai-Token", ""))
        if not who:
            raise ApiError(401, "Sign in to continue.")
        return who

    def admin(self):
        who = self.member()
        if not who["isAdmin"]:
            raise ApiError(403, "Only the administrator can do that.")
        return who

    def handle_any(self, method):
        try:
            # Writes need a header a form or another site can't send (with SameSite=Strict
            # on the cookie, this blocks cross-site request forgery).
            if method != "GET" and self.headers.get("X-Kodai") != "1":
                raise ApiError(400, "Missing X-Kodai header.")
            path, _, qs = self.path.partition("?")
            params = dict(p.split("=", 1) for p in qs.split("&") if "=" in p)
            for pattern, fn in ROUTES.get(method, []):
                m = re.fullmatch(pattern, path)
                if m:
                    return self.send_json(*fn(self, params, *m.groups()))
            raise ApiError(404, "Not found.")
        except ApiError as e:
            self.send_json(e.status, {"error": e.message})
        except Exception:  # never leak internals
            self.send_json(500, {"error": "Something went wrong on the server. Try again in a moment."})

    def do_GET(self): self.handle_any("GET")
    def do_POST(self): self.handle_any("POST")
    def do_PUT(self): self.handle_any("PUT")
    def do_DELETE(self): self.handle_any("DELETE")

    # ── routes
    def get_me(self, params):
        who = self.member()
        row = query("SELECT display_name FROM profiles WHERE user_id = ?", (who["id"],))
        return 200, {"id": who["id"], "username": who["username"], "isAdmin": who["isAdmin"],
                     "displayName": row[0]["display_name"] if row else None}

    def put_me(self, params):
        who = self.member()
        name = clean(self.read_json().get("displayName"), 60)
        if len(name) < 2:
            raise ApiError(400, "Enter the name you'd like others to see, at least 2 characters.")
        execute("UPDATE profiles SET display_name = ?, updated_at = ? WHERE user_id = ?", (name, now(), who["id"]))
        return 200, {"displayName": name}

    def get_comments(self, params):
        who = self.member()
        target = urllib.parse.unquote(params.get("target", ""))
        if not TARGET.match(target):
            raise ApiError(400, "Unknown video or photo.")
        rows = query("SELECT c.id, c.user_id, c.body, c.position_s, c.created_at, "
                     "COALESCE(p.display_name, p.username, 'Member') AS author "
                     "FROM comments c LEFT JOIN profiles p ON p.user_id = c.user_id "
                     "WHERE c.target = ? AND c.deleted_at IS NULL ORDER BY c.created_at, c.id", (target,))
        return 200, [{"id": r["id"], "author": r["author"], "body": r["body"], "position": r["position_s"],
                      "createdAt": r["created_at"], "mine": r["user_id"] == who["id"],
                      "canDelete": r["user_id"] == who["id"] or who["isAdmin"]} for r in rows]

    def get_counts(self, params):
        self.member()
        rows = query("SELECT target, COUNT(*) AS n FROM comments WHERE deleted_at IS NULL GROUP BY target")
        return 200, {r["target"]: r["n"] for r in rows}

    def post_comment(self, params):
        who = self.member()
        data = self.read_json()
        target, body = str(data.get("target", "")), clean(data.get("body"), 2000, multiline=True)
        if not TARGET.match(target):
            raise ApiError(400, "Unknown video or photo.")
        if not body:
            raise ApiError(400, "Write something before posting.")
        if not query("SELECT display_name FROM profiles WHERE user_id = ? AND display_name IS NOT NULL", (who["id"],)):
            raise ApiError(409, "Choose the name others will see before posting.")
        if not allow(("comment", who["id"]), 6, 60):
            raise ApiError(429, "You're posting quickly. Wait a minute and try again.")
        pos = data.get("position")
        pos = int(pos) if isinstance(pos, (int, float)) and target.startswith("video:") and 0 <= pos < 86400 else None
        cid = execute("INSERT INTO comments (target, user_id, body, position_s, created_at) VALUES (?, ?, ?, ?, ?)",
                      (target, who["id"], body, pos, now()))
        return 201, {"id": cid}

    def delete_comment(self, params, cid):
        who = self.member()
        row = query("SELECT user_id FROM comments WHERE id = ? AND deleted_at IS NULL", (int(cid),))
        if not row:
            raise ApiError(404, "That comment was already removed.")
        if row[0]["user_id"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "You can only delete your own comments.")
        execute("UPDATE comments SET deleted_at = ? WHERE id = ?", (now(), int(cid)))
        return 200, {"deleted": int(cid)}

    def post_access_request(self, params):
        ip = self.headers.get("X-Client-IP", "") or self.client_address[0]
        data = self.read_json()
        if data.get("website"):  # hidden field: only bots fill it in
            return 202, {"ok": True}
        name, email = clean(data.get("name"), 80), clean(data.get("email"), 254).lower()
        message = clean(data.get("message"), 500, multiline=True)
        if len(name) < 2:
            raise ApiError(400, "Enter your name.")
        if not EMAIL.match(email):
            raise ApiError(400, "Enter a valid email address, for example name@example.com.")
        if not allow(("request", ip), 3, 3600):
            raise ApiError(429, "Too many requests from this connection. Try again in an hour.")
        if query("SELECT 1 FROM access_requests WHERE email = ? AND status = 'pending'", (email,)):
            return 202, {"ok": True}
        if query("SELECT COUNT(*) AS n FROM access_requests WHERE status = 'pending'")[0]["n"] >= MAX_PENDING_REQUESTS:
            raise ApiError(503, "Requests are paused for now. Ask the person who shared this link.")
        execute("INSERT INTO access_requests (name, email, message, ip, created_at) VALUES (?, ?, ?, ?, ?)",
                (name, email, message, ip, now()))
        send_mail_later(ADMIN_EMAIL, f"Kodai 1994: {name} is asking for access",
                        f"{name} <{email}> asked for access to the Kodai 1994 recordings.\n\n"
                        + (f"Their message:\n{message}\n\n" if message else "")
                        + f"Approve or reject it here (sign in as the administrator):\n{SITE_URL}#requests\n\n"
                        "Approving creates their account and emails them their sign-in details.\n")
        return 202, {"ok": True}

    def get_requests(self, params):
        self.admin()
        return 200, query("SELECT id, name, email, message, created_at AS createdAt FROM access_requests "
                          "WHERE status = 'pending' ORDER BY created_at")

    def approve_request(self, params, rid):
        who = self.admin()
        token = self.headers.get("X-Kodai-Token", "")
        req = query("SELECT * FROM access_requests WHERE id = ? AND status = 'pending'", (int(rid),))
        if not req:
            raise ApiError(404, "That request was already handled.")
        req = req[0]
        users = jellyfin("GET", "/Users", token)
        if any(u["Name"].lower() == req["email"] for u in users):
            raise ApiError(409, f"{req['email']} already has an account. Reject this request, or reset their password with add-viewer.py.")
        password = secrets.token_urlsafe(9)
        user = jellyfin("POST", "/Users/New", token, {"Name": req["email"], "Password": password})
        policy = jellyfin("GET", f"/Users/{user['Id']}", token)["Policy"]
        policy.update({  # keep in step with add-viewer.py
            "IsAdministrator": False, "IsDisabled": False, "IsHidden": True,
            "EnableAllFolders": False, "EnabledFolders": [LIBRARY_ID],
            "EnableContentDownloading": False, "EnablePublicSharing": False,
            "EnableRemoteAccess": True, "EnableMediaPlayback": True,
            "EnableLiveTvAccess": False, "EnableLiveTvManagement": False,
            "EnableRemoteControlOfOtherUsers": False, "EnableSharedDeviceControl": False,
            "EnableContentDeletion": False, "EnableCollectionManagement": False, "EnableSubtitleManagement": False,
            "LoginAttemptsBeforeLockout": LOGIN_ATTEMPTS,
        })
        jellyfin("POST", f"/Users/{user['Id']}/Policy", token, policy)
        execute("INSERT INTO profiles (user_id, username, display_name, updated_at) VALUES (?, ?, ?, ?) "
                "ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name",
                (user["Id"], req["email"], req["name"], now()))
        execute("UPDATE access_requests SET status = 'approved', decided_at = ?, decided_by = ?, username = ? WHERE id = ?",
                (now(), who["username"], req["email"], int(rid)))
        emailed = send_mail(req["email"], "Your sign-in for the Kodai 1994 recordings",
                            f"Hello {req['name']},\n\n"
                            "Your request was approved. You can now watch the Kodai 1994 recordings and see the photographs.\n\n"
                            f"Link:     {SITE_URL}\nUsername: {req['email']}\nPassword: {password}\n\n"
                            "After signing in, you can choose a new password under Account.\n"
                            "Please keep these details to yourself; the recordings are shared privately.\n")
        return 200, {"name": req["name"], "username": req["email"], "password": password, "link": SITE_URL, "emailed": emailed}

    def reject_request(self, params, rid):
        who = self.admin()
        if not query("SELECT 1 FROM access_requests WHERE id = ? AND status = 'pending'", (int(rid),)):
            raise ApiError(404, "That request was already handled.")
        execute("UPDATE access_requests SET status = 'rejected', decided_at = ?, decided_by = ? WHERE id = ?",
                (now(), who["username"], int(rid)))
        return 200, {"rejected": int(rid)}


ROUTES = {
    "GET": [(r"/me", Handler.get_me), (r"/comments", Handler.get_comments), (r"/counts", Handler.get_counts),
            (r"/admin/requests", Handler.get_requests)],
    "PUT": [(r"/me", Handler.put_me)],
    "POST": [(r"/comments", Handler.post_comment), (r"/access-requests", Handler.post_access_request),
             (r"/admin/requests/(\d+)/approve", Handler.approve_request),
             (r"/admin/requests/(\d+)/reject", Handler.reject_request)],
    "DELETE": [(r"/comments/(\d+)", Handler.delete_comment)],
}

if __name__ == "__main__":
    ThreadingHTTPServer.daemon_threads = True
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()

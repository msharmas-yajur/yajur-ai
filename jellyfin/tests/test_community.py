#!/usr/bin/env python3
"""Tests of the community service (kodai1994/community/app.py) over HTTP.

Starts tests/stub_jellyfin.py and app.py on free ports with an empty database in a
temporary folder, then talks to app.py as the gateway would (X-Kodai-Token = the member's
token). No Docker and nothing live is touched; deploy.sh runs these before installing.

  python3 jellyfin/tests/test_community.py [-v] [TestClass.test_name ...]
"""
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, "..", "kodai1994", "community", "app.py")
LIB = "f" * 32
ADMIN, MEMBER, OTHER, OUTSIDER = "a" * 32, "b" * 32, "c" * 32, "d" * 32   # stub_jellyfin.py's fixed tokens
PASSWORD = "test-password"
procs, base = [], None


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def wait_up(url):
    for _ in range(400):   # up to 20 s: a busy machine (ffmpeg in the recording tests) starts it slowly
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except urllib.error.HTTPError:
            return
        except OSError:
            time.sleep(0.05)
    raise RuntimeError("didn't start: " + url)


def setUpModule():
    global base, tmp
    tmp = tempfile.TemporaryDirectory()
    for d in ("data", "uploads", "memories", "captions"):
        os.makedirs(os.path.join(tmp.name, d))
    jport, aport = free_port(), free_port()
    env = dict(os.environ, PORT=str(jport), LIBRARY_ID=LIB, STUB_PASSWORD=PASSWORD)
    procs.append(subprocess.Popen([sys.executable, "-I", os.path.join(HERE, "stub_jellyfin.py")], env=env))
    wait_up(f"http://127.0.0.1:{jport}/health")
    env = dict(os.environ, PORT=str(aport), KODAI_LIBRARY_ID=LIB, JELLYFIN_URL=f"http://127.0.0.1:{jport}",
               DATA_DIR=os.path.join(tmp.name, "data"), UPLOAD_DIR=os.path.join(tmp.name, "uploads"),
               MEMORY_DIR=os.path.join(tmp.name, "memories"), CAPTION_DIR=os.path.join(tmp.name, "captions"),
               JELLYFIN_API_KEY=ADMIN, SMTP_HOST="")
    with open(os.path.join(tmp.name, "app.log"), "w") as log:
        procs.append(subprocess.Popen([sys.executable, "-I", APP], env=env, stdout=log, stderr=subprocess.STDOUT))
    base = f"http://127.0.0.1:{aport}"
    wait_up(base + "/health")


def tearDownModule():
    for p in procs:
        p.terminate(); p.wait()
    if os.environ.get("SHOW_LOG"):
        print(open(os.path.join(tmp.name, "app.log")).read())
    tmp.cleanup()


def call(method, path, body=None, token=MEMBER, headers=None, raw=None, ctype=None):
    """→ (status, json, response headers)"""
    h = {"X-Kodai": "1"} if method != "GET" else {}
    if token:
        h["X-Kodai-Token"] = token
    data = None
    if raw is not None:
        data = raw; h["Content-Type"] = ctype or "application/octet-stream"
    elif body is not None:
        data = json.dumps(body).encode(); h["Content-Type"] = "application/json"
    h.update(headers or {})
    req = urllib.request.Request(base + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read() or b"null"), r.headers
    except urllib.error.HTTPError as e:
        with e:
            return e.code, json.loads(e.read() or b"null"), e.headers


def named(token, name):
    st, _, _ = call("PUT", "/me", {"displayName": name}, token=token)
    assert st == 200


class Basics(unittest.TestCase):
    def test_health_is_open(self):
        st, body, _ = call("GET", "/health", token=None)
        self.assertEqual((st, body), (200, {"ok": True}))

    def test_signed_out_is_refused(self):
        self.assertEqual(call("GET", "/me", token=None)[0], 401)
        self.assertEqual(call("GET", "/me", token="x" * 32)[0], 401)

    def test_other_libraries_members_are_refused(self):
        self.assertEqual(call("GET", "/me", token=OUTSIDER)[0], 401)

    def test_writes_need_the_page_header(self):
        st, body, _ = call("POST", "/comments", {"target": "video:x", "body": "hi"}, headers={"X-Kodai": "0"})
        self.assertEqual(st, 400)

    def test_unknown_route(self):
        self.assertEqual(call("GET", "/nope")[0], 404)


class Session(unittest.TestCase):
    def sign_in(self, user="member@example.com", password=PASSWORD, remember=False, ip="203.0.113.1"):
        return call("POST", "/session", {"username": user, "password": password, "remember": remember}, token=None,
                    headers={"X-Client-IP": ip})

    def test_sign_in_sets_httponly_cookie(self):
        st, body, h = self.sign_in(remember=True)
        self.assertEqual(st, 200)
        self.assertEqual(body["name"], "member@example.com")
        c = h["Set-Cookie"]
        for part in ("kodai_auth=", "HttpOnly", "SameSite=Strict", "Path=/kodai1994/", "Max-Age=", "Secure"):
            self.assertIn(part, c)
        token = c.split("kodai_auth=")[1].split(";")[0]
        self.assertEqual(call("GET", "/me", token=token)[0], 200)
        self.assertNotIn("token", json.dumps(body).lower())

    def test_session_cookie_without_remember(self):
        st, _, h = self.sign_in(remember=False, ip="203.0.113.2")
        self.assertEqual(st, 200)
        self.assertNotIn("Max-Age", h["Set-Cookie"])

    def test_wrong_password(self):
        st, body, h = self.sign_in(password="nope", ip="203.0.113.3")
        self.assertEqual(st, 401)
        self.assertIsNone(h.get("Set-Cookie"))

    def test_failed_sign_ins_are_limited_but_good_ones_are_not(self):
        for _ in range(12):
            self.assertEqual(self.sign_in(ip="203.0.113.9")[0], 200)
        for _ in range(10):
            self.sign_in(user="other@example.com", password="nope", ip="203.0.113.10")
        self.assertEqual(self.sign_in(user="member@example.com", ip="203.0.113.10")[0], 429)

    def test_account_without_the_library(self):
        st, _, h = self.sign_in(user="outsider@example.com", ip="203.0.113.4")
        self.assertEqual(st, 403)
        self.assertIsNone(h.get("Set-Cookie"))

    def test_get_session(self):
        self.assertEqual(call("GET", "/session", token=None)[1], {"signedIn": False})
        st, body, _ = call("GET", "/session", token=MEMBER)
        self.assertTrue(body["signedIn"])

    def test_sign_out_ends_the_token(self):
        st, _, h = self.sign_in(ip="203.0.113.5")
        token = h["Set-Cookie"].split("kodai_auth=")[1].split(";")[0]
        st, _, h = call("DELETE", "/session", token=token)
        self.assertEqual(st, 200)
        self.assertIn("Max-Age=0", h["Set-Cookie"])
        self.assertEqual(call("GET", "/session", token=token)[1], {"signedIn": False})

    def test_upgrade_sets_the_same_token_httponly(self):
        st, body, h = call("POST", "/session/upgrade", {"remember": True}, token=MEMBER)
        self.assertEqual(st, 200)
        self.assertIn(f"kodai_auth={MEMBER};", h["Set-Cookie"])
        self.assertIn("HttpOnly", h["Set-Cookie"])
        self.assertEqual(call("POST", "/session/upgrade", {}, token="x" * 32)[0], 401)


class Audit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        named(MEMBER, "Member One"); named(OTHER, "Other Two"); named(ADMIN, "The Admin")

    def test_only_moderators_see_the_log(self):
        self.assertEqual(call("GET", "/admin/audit")[0], 403)
        self.assertEqual(call("GET", "/admin/audit", token=ADMIN)[0], 200)

    def test_removing_someone_elses_comment_is_logged(self):
        st, c, _ = call("POST", "/comments", {"target": "photo:12", "body": "A comment to remove"}, token=OTHER)
        self.assertEqual(st, 201)
        self.assertEqual(call("DELETE", f"/comments/{c['id']}")[0], 403)   # not theirs
        self.assertEqual(call("DELETE", f"/comments/{c['id']}", token=ADMIN)[0], 200)
        log = call("GET", "/admin/audit", token=ADMIN)[1]["items"]
        hit = [a for a in log if a["target"] == f"comment:{c['id']}"]
        self.assertEqual(hit[0]["action"], "comment.delete.other")
        self.assertEqual(hit[0]["actor"], "The Admin")
        self.assertIn("A comment to remove", hit[0]["detail"])

    def test_rename_is_logged(self):
        st, p, _ = call("POST", "/people", {"name": "Audit Person"})
        call("PUT", f"/people/{p['id']}", {"name": "Audit Person Renamed"}, token=ADMIN)
        log = call("GET", "/admin/audit", token=ADMIN)[1]["items"]
        self.assertTrue(any(a["action"] == "person.rename" and "Audit Person → Audit Person Renamed" in a["detail"] for a in log))

    def test_paging(self):
        for i in range(3):
            st, p, _ = call("POST", "/people", {"name": f"Paged {i}"})
            call("DELETE", f"/people/{p['id']}")
        page1 = call("GET", "/admin/audit?limit=2", token=ADMIN)[1]
        self.assertEqual(len(page1["items"]), 2); self.assertTrue(page1["more"])
        page2 = call("GET", f"/admin/audit?limit=2&before={page1['items'][-1]['id']}", token=ADMIN)[1]
        self.assertLess(page2["items"][0]["id"], page1["items"][-1]["id"])


class Clips(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        named(MEMBER, "Member One"); named(OTHER, "Other Two"); named(ADMIN, "The Admin")
        cls.person = call("POST", "/people", {"name": "Clip Person"})[1]["id"]

    def make(self, token=MEMBER, **kw):
        body = dict(dict(target="video:1994-05-02-may-2nd-picnic", title="The song at the lake", start=61.24, end=95), **kw)
        return call("POST", "/clips", body, token=token)

    def test_make_list_and_read(self):
        st, c, _ = self.make(note="Everyone joins in", people=[self.person])
        self.assertEqual(st, 201, c)
        self.assertEqual((c["start"], c["end"], c["title"], c["author"]), (61.2, 95, "The song at the lake", "Member One"))
        self.assertEqual([p["name"] for p in c["people"]], ["Clip Person"])
        listed = call("GET", "/clips?target=video:1994-05-02-may-2nd-picnic")[1]
        self.assertIn(c["id"], [x["id"] for x in listed])
        self.assertIn(c["id"], [x["id"] for x in call("GET", "/clips")[1]])
        self.assertEqual(call("GET", f"/clips/{c['id']}")[1]["note"], "Everyone joins in")
        counts = call("GET", "/marker-counts")[1]["video:1994-05-02-may-2nd-picnic"]
        self.assertGreaterEqual(counts["clip"], 1)

    def test_bad_ranges(self):
        self.assertEqual(self.make(start=10, end=10)[0], 400)
        self.assertEqual(self.make(start=10, end=11)[0], 400)            # too short
        self.assertEqual(self.make(start=0, end=3600)[0], 400)           # too long
        self.assertEqual(call("POST", "/clips", {"target": "photo:12", "title": "x x", "start": 0, "end": 5})[0], 400)

    def test_only_the_maker_or_a_moderator_changes_it(self):
        c = self.make()[1]
        self.assertEqual(call("PUT", f"/clips/{c['id']}", {"title": "Mine now"}, token=OTHER)[0], 403)
        st, c2, _ = call("PUT", f"/clips/{c['id']}", {"title": "Renamed", "end": 100})
        self.assertEqual((st, c2["title"], c2["end"], c2["start"]), (200, "Renamed", 100, 61.2))
        self.assertEqual(call("DELETE", f"/clips/{c['id']}", token=OTHER)[0], 403)
        self.assertEqual(call("DELETE", f"/clips/{c['id']}", token=ADMIN)[0], 200)
        self.assertEqual(call("GET", f"/clips/{c['id']}")[0], 404)
        log = call("GET", "/admin/audit", token=ADMIN)[1]["items"]
        self.assertTrue(any(a["action"] == "clip.delete.other" and a["target"] == f"clip:{c['id']}" for a in log))

    def test_reactions_comments_and_feed(self):
        c = self.make()[1]
        st, rx, _ = call("POST", "/reactions", {"kind": "clip", "id": c["id"], "emoji": "❤️"}, token=OTHER)
        self.assertEqual((st, rx["counts"]), (200, {"❤️": 1}))
        st, _, _ = call("POST", "/comments", {"target": f"clip:{c['id']}", "body": "Lovely"}, token=OTHER)
        self.assertEqual(st, 201)
        mine = call("GET", "/notifications")[1]["items"]
        self.assertTrue(any(n["target"] == f"clip:{c['id']}" and n["kind"] == "reaction" for n in mine))
        self.assertTrue(any(n["target"] == f"clip:{c['id']}" and n["kind"] == "comment_on_memory" for n in mine))
        feed = call("GET", "/activity")[1]["items"]
        self.assertTrue(any(i["type"] == "clip" and i["id"] == c["id"] for i in feed))
        self.assertEqual(call("GET", "/clips/" + str(c["id"]))[1]["comments"], 1)


class Search(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        named(MEMBER, "Member One")
        cls.p = call("POST", "/people", {"name": "Premkumar Sastry"})[1]["id"]
        call("POST", "/memories", {"kind": "article", "title": "Walking to the lake", "body": "We walked around Kodaikanal lake at dawn, singing **bhajans** all the way.",
                                   "links": [], "people": [cls.p]})
        call("POST", "/comments", {"target": "photo:21", "body": "The café near Coaker's Walk"})
        call("POST", "/markers", {"target": "video:1994-05-02-may-2nd-picnic", "kind": "chapter", "title": "Boat ride", "position": 300})
        call("POST", "/markers", {"target": "video:1994-05-02-may-2nd-picnic", "kind": "event", "people": [cls.p], "position": 320})
        call("POST", "/clips", {"target": "video:1994-05-02-may-2nd-picnic", "title": "Rowing back", "start": 400, "end": 430})
        call("POST", "/photo-tags", {"photo": "21", "person": cls.p})

    def search(self, q):
        st, r, _ = call("GET", "/search?q=" + urllib.request.quote(q))
        self.assertEqual(st, 200)
        return r

    def test_word_beginnings_any_order(self):
        r = self.search("prem")
        self.assertEqual([x["name"] for x in r["people"]], ["Premkumar Sastry"])
        self.assertTrue(r["moments"] and r["moments"][0]["kind"] == "event")
        self.assertEqual(r["photos"][0]["photo"], "21")
        self.assertEqual(self.search("sastry prem")["people"][0]["name"], "Premkumar Sastry")

    def test_memory_body_with_markup_and_snippet(self):
        r = self.search("bhajan lake")
        self.assertEqual(r["memories"][0]["title"], "Walking to the lake")
        self.assertIn("bhajans", r["memories"][0]["excerpt"])
        self.assertNotIn("**", r["memories"][0]["excerpt"])

    def test_accents_and_other_kinds(self):
        self.assertTrue(self.search("cafe")["comments"])
        self.assertEqual(self.search("boat")["moments"][0]["title"], "Boat ride")
        self.assertEqual(self.search("rowing")["clips"][0]["title"], "Rowing back")

    def test_index_follows_changes(self):
        p = call("POST", "/people", {"name": "Zebulon Quixote"})[1]["id"]
        self.assertTrue(self.search("zebul")["people"])
        call("DELETE", f"/people/{p}")
        self.assertFalse(self.search("zebul")["people"])

    def test_odd_input(self):
        for q in ('"', "*", "a", "NEAR(", "))", "-x", "x OR"):
            self.assertEqual(call("GET", "/search?q=" + urllib.request.quote(q))[0], 200, q)


@unittest.skipUnless(subprocess.run(["which", "ffmpeg"], capture_output=True).returncode == 0, "needs ffmpeg")
class Recordings(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        named(MEMBER, "Member One")
        cls.dir = tempfile.mkdtemp(dir=tmp.name)
        cls.video = os.path.join(cls.dir, "v.webm")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=3",
                        "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:v", "libvpx", "-b:v", "300k", "-c:a", "libopus", cls.video], check=True)

    def upload(self, path, ctype):
        with open(path, "rb") as f:
            return call("POST", "/memory-media", raw=f.read(), ctype=ctype)

    def prepare(self):
        """Run media-queue.py on the test database, as its timer would."""
        env = dict(os.environ, REC_SRC=os.path.join(tmp.name, "uploads", "recordings"), REC_OUT=os.path.join(tmp.name, "memories", "rec"),
                   DB_PATH=os.path.join(tmp.name, "data", "community.db"))
        r = subprocess.run([sys.executable, "-I", os.path.join(HERE, "..", "kodai1994", "media-queue.py")], env=env, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        return r.stdout

    def test_record_share_and_play(self):
        st, up, _ = self.upload(self.video, "video/webm")
        self.assertEqual((st, up["status"]), (201, "pending"), up)
        st, m, _ = call("POST", "/memories", {"kind": "recording", "title": "What I remember", "body": "", "media": up["media"], "links": [], "people": []})
        self.assertEqual(st, 201, m)
        self.assertEqual(call("GET", f"/memories/{m['id']}")[1]["media"]["status"], "pending")
        self.assertIn("ready", self.prepare())
        md = call("GET", f"/memories/{m['id']}")[1]["media"]
        self.assertEqual((md["status"], md["kind"]), ("ready", "video"))
        self.assertTrue(md["src"].startswith("/kodai1994/memories/rec/") and md["src"].endswith(".mp4"))
        self.assertTrue(md["poster"].endswith(".jpg"))
        self.assertAlmostEqual(md["duration"], 3, delta=0.5)
        out = os.path.join(tmp.name, "memories", md["src"].split("/memories/")[1])
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name", "-of", "csv=p=0", out], capture_output=True, text=True).stdout.split()
        self.assertEqual(sorted(probe), ["aac", "h264"])
        feed = call("GET", "/activity")[1]["items"]
        self.assertTrue(any(i["type"] == "memory" and i["memoryKind"] == "recording" for i in feed))
        # the same recording can't be shared twice
        self.assertEqual(call("POST", "/memories", {"kind": "recording", "title": "Again", "media": up["media"], "links": []})[0], 409)

    def test_only_my_recordings(self):
        st, up, _ = self.upload(self.video, "audio/webm")
        self.assertEqual(call("GET", f"/memory-media/{up['media']}", token=OTHER)[0], 404)
        self.assertEqual(call("POST", "/memories", {"kind": "recording", "title": "Not mine", "media": up["media"], "links": []}, token=OTHER)[0], 400)

    def test_wrong_files_are_refused(self):
        self.assertEqual(call("POST", "/memory-media", raw=b"%PDF-1.4 not a recording", ctype="audio/webm")[0], 415)
        self.assertEqual(call("POST", "/memory-media", raw=b"x" * 100, ctype="application/zip")[0], 415)
        self.assertEqual(call("POST", "/memories", {"kind": "recording", "title": "Nothing", "links": []})[0], 400)

    def test_unreadable_recording_fails_gently(self):
        bad = os.path.join(self.dir, "bad.webm")
        with open(bad, "wb") as f:
            f.write(b"\x1a\x45\xdf\xa3" + os.urandom(2000))
        st, up, _ = self.upload(bad, "audio/webm")
        self.assertEqual(st, 201)
        self.assertIn("FAILED", self.prepare())
        md = call("GET", f"/memory-media/{up['media']}")[1]
        self.assertEqual(md["status"], "failed")
        self.assertIn("couldn't be read", md["message"])


class Migration(unittest.TestCase):
    def test_old_check_constraints_are_widened(self):
        """A database made before clips and recordings: its CHECKs are rebuilt at start, rows kept."""
        import sqlite3
        d = tempfile.mkdtemp(dir=tmp.name)
        db = sqlite3.connect(os.path.join(d, "community.db"))
        db.executescript("""
            CREATE TABLE reactions (kind TEXT NOT NULL CHECK (kind IN ('memory', 'comment')), target_id INTEGER NOT NULL,
                user_id TEXT NOT NULL, emoji TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (kind, target_id, user_id, emoji));
            INSERT INTO reactions VALUES ('memory', 1, 'u', 'x', 't');
            CREATE TABLE memories (id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('article', 'notes')), title TEXT NOT NULL,
                body TEXT NOT NULL DEFAULT '', file TEXT, user_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT, deleted_at TEXT);
            INSERT INTO memories (kind, title, user_id, created_at) VALUES ('article', 'Old one', 'u', 't');""")
        db.commit(); db.close()
        port = free_port()
        env = dict(os.environ, PORT=str(port), KODAI_LIBRARY_ID=LIB, JELLYFIN_URL="http://127.0.0.1:9", DATA_DIR=d)
        pr = subprocess.Popen([sys.executable, "-I", APP], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        try:
            wait_up(f"http://127.0.0.1:{port}/health")
        finally:
            pr.terminate(); pr.wait()
        db = sqlite3.connect(os.path.join(d, "community.db"))
        self.assertEqual(db.execute("SELECT COUNT(*) FROM reactions").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT title FROM memories").fetchone()[0], "Old one")
        db.execute("INSERT INTO reactions VALUES ('clip', 1, 'u', 'x', 't')")
        db.execute("INSERT INTO memories (kind, title, user_id, created_at) VALUES ('recording', 'New', 'u', 't')")
        self.assertEqual(db.execute("PRAGMA integrity_check").fetchone()[0], "ok")


if __name__ == "__main__":
    unittest.main(verbosity=2 if "-v" in sys.argv else 1, argv=[a for a in sys.argv if a != "-v"])

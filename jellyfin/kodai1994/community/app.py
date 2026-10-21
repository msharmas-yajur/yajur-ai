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

Sign-in: the page never holds the Jellyfin token. POST /session signs in with Jellyfin
and sets it as the kodai_auth cookie (HttpOnly, SameSite=Strict, Path=/kodai1994/), which
the gateway turns into the Authorization header for /kodai1994/jf/ (the few Jellyfin
calls the page makes), /kodai1994/hls/ and this service. Script on the page can't read it.

Routes (JSON):
  POST   /session                  {username, password, remember}  sign in; sets the cookie
  GET    /session                  {signedIn, userId?, name?}: is this browser signed in
  DELETE /session                  sign out (Jellyfin forgets the token); clears the cookie
  POST   /session/upgrade          {remember}  a session from before HttpOnly cookies: the cookie the
                                   page set itself is set again, HttpOnly (same token)
  GET    /health                   {ok}: the service and its database answer (monitoring)
  GET    /admin/audit?before=ID    the audit log, newest first (admin)
  GET    /admin/status             monitor.py's latest checks of the stack (admin)
  GET    /me                       who am I, my display name, am I admin
  GET    /activity?before=ISO      the Home page: newest-first activity (memories, chapters, events,
                                   comments, uploaded photos, new names, members joining), my
                                   previous visit (seenAt), collection totals, faces to review
  POST   /activity/seen            remember that I've looked (for "new since your last visit")
  GET    /notifications            my notifications (newest first) and how many are unread
  POST   /notifications/read       {ids?}  mark them read (all when no ids)
  POST   /reactions                {kind: "memory"|"comment"|"clip", id, emoji}  toggle my reaction (🙏 ❤️ 😊)
  GET    /search?q=...             people, memories, comments, chapters and events, clips, photos (by who's
                                   tagged) and what was said (transcripts) matching every word of q, as
                                   word beginnings (full-text index; best matches first)
  GET    /identify/challenge?n=5   a few likely face matches to confirm on Home
  PUT    /people/<id>/member       {claim: true|false}  "this is me": link my account to my 1994 self
  PUT    /memories/<id>/feature    {on: true|false}  pin a memory to the top of Home (admin/moderator)

  GET    /members                  everyone who has joined: display name, joined, last active,
                                   contributions (never their email)
  PUT    /me                       {displayName}
  GET    /comments?target=...      comments on video:<slug> or photo:<id>
  GET    /counts                   {target: number of comments}
  POST   /comments                 {target, body, position?}  position = seconds into a video
  DELETE /comments/<id>            own comment, or any comment for the admin
  GET    /clips?target=video:...   clips (highlights: a stretch of a recording with a title), by time; without
                                   target, everyone's newest first
  GET    /clips/<id>               one clip
  POST   /clips                    {target, title, start, end, note?, people?: [person ids]}
  PUT    /clips/<id>               {title?, start?, end?, note?, people?}  (its maker, or a moderator)
  DELETE /clips/<id>               (its maker, or a moderator)
  GET    /markers?target=video:...  chapters and tagged events on a video, by time
  GET    /marker-counts            {target: {chapter: n, event: n}} for every video with markers
  GET    /people                   everyone on the people list (who appears in the recordings)
  POST   /people                   {name}  add a name; 409 with the existing entry if already listed
  PUT    /people/<id>              {name}  rename (admin)
  DELETE /people/<id>              remove (admin, or the member who added it)
  GET    /people/<id>              profile: the person, the photos they're tagged in, and per
                                   video only the events they're tagged in
  GET    /photo-tags               {photoId: [{tagId, personId, name, canRemove}]}
  POST   /photo-tags               {photo, person}  tag someone in a photo
  DELETE /photo-tags/<tagId>       untag (whoever tagged, or the admin)
  GET    /photo-faces?photo=ID     marked 1994 faces in a photo: [{id, personId, name, box, canRemove}]
  POST   /photo-faces              {photo, person, box: {x, y, w, h}}  (fractions of the photo, 0-1)
                                   marks that person's face; also tags them in the photo
  DELETE /photo-faces/<id>         unmark (whoever marked it, or the admin)
  PUT    /people/<id>/portrait     {face: id}  choose which marked face is their 1994 portrait
  POST   /markers                  chapter: {target, kind: "chapter", title, position}
                                   event:   {target, kind: "event", people: [person ids], position}
                                   (an event's name is its people's names, comma-separated)
  PUT    /markers/<id>             {title?, people?, position?, kind?}  own marker, or any for the admin
  DELETE /markers/<id>             own marker, or any for the admin
  GET    /memories?target=...      memories (articles and PDF notes), newest first; with target
                                   (video:<slug> or photo:<id>) only those tagged to it; with
                                   person=<id> only those that person is tagged in
  GET    /memories/<id>            one memory in full, with what it's tagged to
  POST   /memory-files             body: a PDF (up to 25 MB) → {file}, to attach to a notes memory
  POST   /memory-media             body: an audio or video recording (up to 95 MB; webm, ogg, mp4/m4a/mov, mp3,
                                   wav) → {media, status}, for a recording memory. media-queue.py (on the
                                   host) makes the copy members play, in MEMORY_DIR/rec/
  GET    /memory-media/<id>        {status: pending|ready|failed, ...} of one of my recordings
  POST   /memories                 {kind: "article"|"notes"|"recording", title, body, file? (notes), media? (recording),
                                    links: [{target, position?}],
                                    people?: [person ids]}
  PUT    /memories/<id>            {title?, body?, links?, people?}  (its author, or the admin)
  DELETE /memories/<id>            (its author, or the admin)
  POST   /photo-uploads            body: the image (image/jpeg, png or webp, up to 15 MB); the
                                   worker (faceid/worker.py) adds it to the Photos page
  GET    /photo-uploads            uploaded photos: who added them, and any still being processed
  DELETE /photo-uploads/<id>       remove an uploaded photo (whoever added it, or the admin)
  GET    /identify/runs            latest identification run per video/photo, with review counts
  POST   /identify/runs            {target}  queue face identification (faceid/worker.py runs it)
  DELETE /identify/runs/<id>       cancel a queued or running run (whoever started it, or the admin)
  GET    /identify/suggestions?target=...   the latest run and its suggested faces, best guess first
  POST   /identify/suggestions/<id>   {action: "confirm", person?} | {action: "reject"} | {action: "undo"}
                                   confirm (person = the right one if the guess was wrong) adds the
                                   person to an event at that moment (video) or marks the face (photo);
                                   kind "check" (a hand mark that looks like someone else): confirm
                                   moves the mark to that person, reject keeps it
  POST   /identify/clear           {photo}  set the photo's hand marks aside and identify it afresh (moderators)
  POST   /identify/restore         {photo}  put the marks set aside back (moderators)
  PUT    /people/<id>/detect       {detect: true|false}  whether identification looks for this face (moderators)
  GET    /captions?target=video:SLUG   the recording's transcript: {lines: [{id, start, end, language, text, textEn,
                                   edited}], run, description, canEdit}. Lines come from captions/worker.py
                                   (Whisper, on this machine); moderators correct them
  GET    /captions.vtt?target=video:SLUG&lang=orig|en   the same as WebVTT, for the player's CC menu
  GET    /captions/status          {target: {lines, language}} for every recording with a transcript
  POST   /captions/runs            {target} | {all: true}  queue transcription (moderators)
  DELETE /captions/runs/<id>       cancel a queued or running one (moderators)
  PUT    /captions/lines/<id>      {text?, textEn?, hidden?}  correct a line (moderators)
  PUT    /descriptions             {target, text}  a recording's description (moderators); describe.py
                                   suggests one from the transcript when an Anthropic key is set
  GET    /sound-sections?target=video:SLUG   the recording's outdoor parts: {sections: [{id, start, end, kind}], canEdit}
  POST   /sound-sections           {target, start, end}  mark an outdoor part (moderators); audio.sh brings the voice forward there
  DELETE /sound-sections/<id>      remove one (moderators)
  POST   /access-requests          {name, email, message?}    public: the sign-in page's form
  GET    /admin/requests           pending requests (admin)
  POST   /admin/requests/<id>/approve   creates the account, returns its password (admin)
  POST   /admin/requests/<id>/reject    (admin)
  GET    /admin/moderators         members who moderate the site (Jellyfin administrators only)
  PUT    /admin/moderators/<user>  make a member a moderator; DELETE removes them
  ("admin" above means a Jellyfin administrator or a moderator; moderators can't manage
  moderators, and approve requests through JELLYFIN_API_KEY)
"""
import hashlib
import json
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import threading
import time
import traceback
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
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/uploads")   # originals of uploaded photos (never served)
MAX_UPLOAD = 15 * 1024 * 1024
MEMORY_DIR = os.environ.get("MEMORY_DIR", "/memories")   # PDFs attached to memories (served members-only)
MAX_PDF = 25 * 1024 * 1024
MAX_ARTICLE = 60000                                      # characters
REC_DIR = os.path.join(UPLOAD_DIR, "recordings")         # recordings members make, as sent (never served)
MAX_MEDIA = 95 * 1024 * 1024                             # Cloudflare's free plan takes requests up to 100 MB
# Recording memories: content type → (extension, audio|video, does the start look like it)
MEDIA_TYPES = {
    "audio/webm": ("webm", "audio", lambda b: b.startswith(b"\x1a\x45\xdf\xa3")),
    "video/webm": ("webm", "video", lambda b: b.startswith(b"\x1a\x45\xdf\xa3")),
    "audio/ogg": ("ogg", "audio", lambda b: b.startswith(b"OggS")),
    "audio/mp4": ("m4a", "audio", lambda b: b[4:8] == b"ftyp"),
    "audio/x-m4a": ("m4a", "audio", lambda b: b[4:8] == b"ftyp"),
    "video/mp4": ("mp4", "video", lambda b: b[4:8] == b"ftyp"),
    "video/quicktime": ("mov", "video", lambda b: b[4:8] in (b"ftyp", b"wide", b"moov", b"mdat")),
    "audio/mpeg": ("mp3", "audio", lambda b: b.startswith(b"ID3") or b[:1] == b"\xff"),
    "audio/wav": ("wav", "audio", lambda b: b.startswith(b"RIFF") and b[8:12] == b"WAVE"),
    "audio/x-wav": ("wav", "audio", lambda b: b.startswith(b"RIFF") and b[8:12] == b"WAVE"),
}
IMAGE_TYPES = {"image/jpeg": ("jpg", (b"\xff\xd8\xff",)), "image/png": ("png", (b"\x89PNG\r\n\x1a\n",)),
               "image/webp": ("webp", (b"RIFF",))}
SITE_URL = os.environ.get("SITE_URL", "https://videos.yajur.ai/kodai1994/")
CLIENT = 'MediaBrowser Client="Kodai 1994 community", Device="server", DeviceId="kodai-community", Version="1.0"'
# Sign-ins are made as the member's browser (the page's client name and its device id), so
# Jellyfin's Devices list shows one entry per browser, as before.
PAGE_CLIENT, PAGE_VERSION = "Yajur Kodai 1994", "2.0.0"
COOKIE = "kodai_auth"
COOKIE_PATH = "/kodai1994/"
REMEMBER_S = 30 * 24 * 3600   # "Keep me signed in": the cookie lasts 30 days (Jellyfin's token doesn't expire)
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT") or 587)
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
MAIL_FROM = os.environ.get("MAIL_FROM") or SMTP_USER
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")
# Jellyfin API key, used only to create the account when a moderator approves a request
# (administrators approve with their own sign-in). Optional; kept in the stack's .env.
JELLYFIN_API_KEY = os.environ.get("JELLYFIN_API_KEY", "")

TARGET = re.compile(r"^(video:[a-z0-9-]{1,120}|photo:[0-9]{2,3}|memory:[0-9]{1,9}|clip:[0-9]{1,9})$")  # what comments attach to
LINK_TARGET = re.compile(r"^(video:[a-z0-9-]{1,120}|photo:[0-9]{2,3})$")              # what memories are tagged to
VIDEO_TARGET = re.compile(r"^video:[a-z0-9-]{1,120}$")
PHOTO_ID = re.compile(r"^[0-9]{2,3}$")
EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$")
CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
LOGIN_ATTEMPTS = 5          # same policy as add-viewer.py
MAX_PENDING_REQUESTS = 200  # cap on unreviewed access requests
AUDIT_KEEP_DAYS = 365       # audit log entries older than this are removed


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
        # The server's reply explains failures (e.g. "Username and Password not accepted");
        # it never contains the password.
        print(f"email to {to} failed: {type(e).__name__}: {e}", flush=True)
        return False


def send_mail_later(to, subject, body, then=None):
    """Send in the background; then(ok) is called with the result (e.g. to record it)."""
    def run():
        ok = send_mail(to, subject, body)
        if then:
            then(ok)
    threading.Thread(target=run, daemon=True).start()


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
CREATE TABLE IF NOT EXISTS markers (
    id          INTEGER PRIMARY KEY,
    target      TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('chapter', 'event')),
    title       TEXT NOT NULL,
    position_s  INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS markers_by_target ON markers (target, position_s);
CREATE TABLE IF NOT EXISTS people (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    name_key    TEXT NOT NULL,          -- lower-case, single-spaced: catches duplicates
    added_by    TEXT NOT NULL,          -- Jellyfin user id
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    deleted_at  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS people_by_key ON people (name_key) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS marker_people (   -- who is tagged in an event, in the order they were added
    marker_id   INTEGER NOT NULL,
    person_id   INTEGER NOT NULL,
    ord         INTEGER NOT NULL,
    PRIMARY KEY (marker_id, person_id)
);
CREATE INDEX IF NOT EXISTS marker_people_by_person ON marker_people (person_id);
CREATE TABLE IF NOT EXISTS photo_people (     -- who is tagged in which photo (photo ids from photos.json)
    id          INTEGER PRIMARY KEY,
    photo_id    TEXT NOT NULL,
    person_id   INTEGER NOT NULL,
    added_by    TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS photo_people_unique ON photo_people (photo_id, person_id);
CREATE INDEX IF NOT EXISTS photo_people_by_person ON photo_people (person_id);
CREATE TABLE IF NOT EXISTS photo_faces (      -- labelled 1994 faces: a box on a photo + who it is
    id          INTEGER PRIMARY KEY,
    photo_id    TEXT NOT NULL,
    person_id   INTEGER NOT NULL,
    x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,   -- fractions of width/height
    added_by    TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS photo_faces_one_per_photo ON photo_faces (photo_id, person_id);
CREATE INDEX IF NOT EXISTS photo_faces_by_person ON photo_faces (person_id);
-- Face identification (faceid/worker.py fills runs and suggestions; members review them here)
CREATE TABLE IF NOT EXISTS identify_runs (
    id           INTEGER PRIMARY KEY,
    target       TEXT NOT NULL,                     -- video:<slug> or photo:<id>
    status       TEXT NOT NULL DEFAULT 'queued',    -- queued, running, done, failed, cancelled
    progress     REAL NOT NULL DEFAULT 0,           -- 0-1
    message      TEXT,
    refs         INTEGER,                           -- reference faces used, and for how many people
    people       INTEGER,
    requested_by TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    started_at   TEXT,
    finished_at  TEXT
);
CREATE INDEX IF NOT EXISTS identify_runs_by_target ON identify_runs (target, id);
CREATE TABLE IF NOT EXISTS identify_suggestions (
    id              INTEGER PRIMARY KEY,
    run_id          INTEGER NOT NULL,
    target          TEXT NOT NULL,
    start_s REAL, end_s REAL, frame_s REAL,         -- video: on screen from/to, and the frame shown
    x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,   -- face box, fractions
    person_id       INTEGER,                        -- best guess; NULL = not recognised
    score           REAL,
    alternatives    TEXT,                           -- JSON [{personId, score}], best first
    cluster         INTEGER,                        -- unrecognised faces that look alike share one
    crop            TEXT NOT NULL,                  -- face image, under /kodai1994/faces/
    embedding       BLOB,                           -- confirmed ones become references for later runs
    face_px         REAL,
    status          TEXT NOT NULL DEFAULT 'pending',   -- pending, confirmed, rejected
    final_person_id INTEGER,
    reviewed_by     TEXT,
    reviewed_at     TEXT,
    marker_id       INTEGER,                        -- the event this moment went into
    marker_added    INTEGER NOT NULL DEFAULT 0,     -- 1 if confirming added the person to it
    face_id         INTEGER,                        -- photo face mark / tag created by confirming
    tag_id          INTEGER,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS identify_suggestions_by_target ON identify_suggestions (target, status);
CREATE TABLE IF NOT EXISTS sound_sections (    -- outdoor stretches of a recording: audio.sh brings the voice forward there
    id          INTEGER PRIMARY KEY,                 -- (indoors, the rest, the sound is levelled and evened)
    target      TEXT NOT NULL,                       -- video:<slug>
    start_s     REAL NOT NULL,
    end_s       REAL NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'outdoor',
    added_by    TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sound_sections_by_target ON sound_sections (target, start_s);
CREATE TABLE IF NOT EXISTS photo_faces_cleared (  -- hand marks set aside by "Clear marks and re-run", to restore
    id          INTEGER PRIMARY KEY,
    photo_id    TEXT NOT NULL,
    person_id   INTEGER NOT NULL,
    x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,
    added_by    TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    was_portrait INTEGER NOT NULL DEFAULT 0,
    cleared_by  TEXT NOT NULL,
    cleared_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS photo_faces_cleared_by_photo ON photo_faces_cleared (photo_id);
CREATE TABLE IF NOT EXISTS identify_refs (       -- worker cache: embedding of each marked photo face
    face_id   INTEGER PRIMARY KEY,
    x REAL, y REAL, w REAL, h REAL,
    embedding BLOB
);
-- Photos members upload on the Photos page (faceid/worker.py processes them)
CREATE TABLE IF NOT EXISTS photo_uploads (
    id          INTEGER PRIMARY KEY,
    user_id     TEXT NOT NULL,
    file        TEXT NOT NULL,                  -- original, under UPLOAD_DIR
    sha256      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',   -- pending, ready, failed, remove, removed
    photo_id    TEXT,                           -- its id in photos.json once ready
    message     TEXT,
    created_at  TEXT NOT NULL,
    processed_at TEXT,
    removed_at  TEXT,
    removed_by  TEXT
);
CREATE INDEX IF NOT EXISTS photo_uploads_by_status ON photo_uploads (status);
-- Memories: long-form articles and PDF notes, tagged to recordings and photos
CREATE TABLE IF NOT EXISTS memories (
    id          INTEGER PRIMARY KEY,
    kind        TEXT NOT NULL CHECK (kind IN ('article', 'notes', 'recording')),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',       -- the article, or the comment on the notes
    file        TEXT,                           -- notes: the PDF, under MEMORY_DIR
    user_id     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    deleted_at  TEXT
);
CREATE TABLE IF NOT EXISTS memory_links (
    memory_id   INTEGER NOT NULL,
    target      TEXT NOT NULL,                  -- video:<slug> or photo:<id>
    position_s  INTEGER,                        -- a moment in the video, if given
    ord         INTEGER NOT NULL,
    PRIMARY KEY (memory_id, target)
);
CREATE INDEX IF NOT EXISTS memory_links_by_target ON memory_links (target);
CREATE TABLE IF NOT EXISTS memory_people (      -- who a memory is about / who appears in it
    memory_id   INTEGER NOT NULL,
    person_id   INTEGER NOT NULL,
    ord         INTEGER NOT NULL,
    PRIMARY KEY (memory_id, person_id)
);
CREATE INDEX IF NOT EXISTS memory_people_by_person ON memory_people (person_id);
CREATE TABLE IF NOT EXISTS memory_files (       -- uploaded PDFs, so only the uploader can attach one
    file        TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    size        INTEGER NOT NULL,
    created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memory_media (       -- recordings for recording memories (media-queue.py prepares them)
    id          INTEGER PRIMARY KEY,
    user_id     TEXT NOT NULL,
    kind        TEXT NOT NULL,                  -- audio, video (as sent; video without a picture becomes audio)
    original    TEXT NOT NULL,                  -- as sent, under REC_DIR
    mime        TEXT,
    size        INTEGER NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',   -- pending, ready, failed
    file        TEXT,                           -- the copy members play, under MEMORY_DIR (rec/<name>.mp4 or .m4a)
    poster      TEXT,                           -- video: a frame, under MEMORY_DIR
    duration_s  REAL,
    message     TEXT,
    created_at  TEXT NOT NULL,
    processed_at TEXT
);
CREATE TABLE IF NOT EXISTS reactions (           -- 🙏 ❤️ 😊 on memories and comments
    kind        TEXT NOT NULL CHECK (kind IN ('memory', 'comment', 'clip')),
    target_id   INTEGER NOT NULL,
    user_id     TEXT NOT NULL,
    emoji       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (kind, target_id, user_id, emoji)
);
CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY,
    user_id     TEXT NOT NULL,                  -- who it's for
    kind        TEXT NOT NULL,                  -- comment_on_memory, comment_thread, reaction, tagged_memory, tagged_event, tagged_photo
    actor_id    TEXT NOT NULL,
    target      TEXT,                           -- video:/photo:/memory: it's about
    ref_id      INTEGER,                        -- the comment, memory or event
    position_s  INTEGER,
    detail      TEXT,                           -- e.g. the emoji, or a title
    created_at  TEXT NOT NULL,
    read_at     TEXT
);
CREATE INDEX IF NOT EXISTS notifications_by_user ON notifications (user_id, created_at);
CREATE TABLE IF NOT EXISTS moderators (         -- members who may moderate the site (see identify)
    user_id     TEXT PRIMARY KEY,               -- Jellyfin user id
    added_by    TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
-- Captions: what was said in each recording (captions/worker.py fills these from the
-- queue; moderators correct lines), and a short description of each recording
CREATE TABLE IF NOT EXISTS caption_runs (
    id           INTEGER PRIMARY KEY,
    target       TEXT NOT NULL,                     -- video:<slug>
    status       TEXT NOT NULL DEFAULT 'queued',    -- queued, running, done, failed, cancelled
    progress     REAL NOT NULL DEFAULT 0,
    message      TEXT,
    language     TEXT,
    model        TEXT,
    requested_by TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    started_at   TEXT,
    finished_at  TEXT
);
CREATE INDEX IF NOT EXISTS caption_runs_by_target ON caption_runs (target, id);
CREATE TABLE IF NOT EXISTS caption_lines (
    id          INTEGER PRIMARY KEY,
    target      TEXT NOT NULL,
    start_s     REAL NOT NULL,
    end_s       REAL NOT NULL,
    language    TEXT,                           -- as spoken (Whisper's code: en, te, hi, ...)
    text        TEXT NOT NULL,
    text_en     TEXT,                           -- in English, when it was said in another language
    confidence  REAL,                           -- Whisper's average log-probability
    source      TEXT NOT NULL DEFAULT 'whisper',
    hidden      INTEGER NOT NULL DEFAULT 0,     -- a moderator took it out (wrong, or not speech)
    edited_by   TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS caption_lines_by_target ON caption_lines (target, start_s);
CREATE TABLE IF NOT EXISTS video_descriptions (
    target      TEXT PRIMARY KEY,
    text        TEXT NOT NULL,
    source      TEXT NOT NULL,                  -- claude (suggested from the transcript), moderator
    updated_by  TEXT,
    updated_at  TEXT NOT NULL
);
-- Clips: a stretch of a recording members can name, share and react to
CREATE TABLE IF NOT EXISTS clips (
    id          INTEGER PRIMARY KEY,
    target      TEXT NOT NULL,                  -- video:<slug>
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    note        TEXT,
    start_s     REAL NOT NULL,
    end_s       REAL NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS clips_by_target ON clips (target, start_s);
CREATE TABLE IF NOT EXISTS clip_people (        -- who is in a clip
    clip_id     INTEGER NOT NULL,
    person_id   INTEGER NOT NULL,
    ord         INTEGER NOT NULL,
    PRIMARY KEY (clip_id, person_id)
);
CREATE INDEX IF NOT EXISTS clip_people_by_person ON clip_people (person_id);
-- Who did what, for moderators and the administrator: approvals, moderators, removals,
-- renames, sign-ins. Kept a year (pruned at start). Never holds passwords or tokens.
CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY,
    at          TEXT NOT NULL,
    user_id     TEXT,                           -- Jellyfin user id of who did it (NULL: a visitor)
    actor       TEXT,                           -- their name at the time
    action      TEXT NOT NULL,                  -- e.g. comment.delete, request.approve, signin.fail
    target      TEXT,                           -- what it was done to: comment:12, video:<slug>, ...
    detail      TEXT,                           -- a short description (a title, an excerpt, a name)
    ip          TEXT
);
CREATE INDEX IF NOT EXISTS audit_log_by_at ON audit_log (at);
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


# Members: first seen, last active, and when they last looked at the activity stream.
_prof_cols = [r[1] for r in db.execute("PRAGMA table_info(profiles)").fetchall()]
for _col in ("created_at", "last_seen_at", "activity_seen_at"):
    if _col not in _prof_cols:
        db.execute(f"ALTER TABLE profiles ADD COLUMN {_col} TEXT")
for _col, _type in (("person_id", "INTEGER"),):   # their 1994 self
    if _col not in _prof_cols:
        db.execute(f"ALTER TABLE profiles ADD COLUMN {_col} {_type}")
_mem_cols = [r[1] for r in db.execute("PRAGMA table_info(memories)").fetchall()]
for _col in ("featured_at", "featured_by"):
    if _col not in _mem_cols:
        db.execute(f"ALTER TABLE memories ADD COLUMN {_col} TEXT")
if "media_id" not in _mem_cols:   # a recording memory's recording (memory_media)
    db.execute("ALTER TABLE memories ADD COLUMN media_id INTEGER")
db.commit()
# Whether each access request's emails went out: the notice to ADMIN_EMAIL and, once
# approved, the sign-in details to the person (NULL = not attempted, 0 = failed, 1 = sent).
_req_cols = [r[1] for r in db.execute("PRAGMA table_info(access_requests)").fetchall()]
for _col in ("notice_emailed", "credentials_emailed"):
    if _col not in _req_cols:
        db.execute(f"ALTER TABLE access_requests ADD COLUMN {_col} INTEGER")
db.commit()
if "portrait_face" not in [r[1] for r in db.execute("PRAGMA table_info(people)").fetchall()]:
    db.execute("ALTER TABLE people ADD COLUMN portrait_face INTEGER")  # chosen 1994 face; NULL = first marked
    db.commit()
if "no_detect" not in [r[1] for r in db.execute("PRAGMA table_info(people)").fetchall()]:
    # 1 = identification leaves this face out (someone in nearly every photo): tagged by hand only
    db.execute("ALTER TABLE people ADD COLUMN no_detect INTEGER NOT NULL DEFAULT 0")
    db.commit()
# Hand marks and identification kept in step (photos):
#   kind 'face'   a detected face; mark_id set = settled by a face marked by hand on it
#   kind 'check'  a hand mark (mark_id, as mark_person_id) that looks like someone else (person_id)
_sug_cols = [r[1] for r in db.execute("PRAGMA table_info(identify_suggestions)").fetchall()]
for _col, _type in (("kind", "TEXT NOT NULL DEFAULT 'face'"), ("mark_id", "INTEGER"), ("mark_person_id", "INTEGER")):
    if _col not in _sug_cols:
        db.execute(f"ALTER TABLE identify_suggestions ADD COLUMN {_col} {_type}")
db.commit()


def widen_check(table, old, new):
    """Rebuild a table whose CHECK lists fewer values than the schema above now allows.
    Same columns, rows and indexes; one transaction, so a failure leaves it as it was."""
    sql = db.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)).fetchone()[0]
    if new in sql or old not in sql:
        return
    indexes = [r[0] for r in db.execute("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL", (table,))]
    new_sql = re.sub(rf"^CREATE TABLE \"?{table}\"?", f"CREATE TABLE {table}__new", sql.replace(old, new), count=1)
    db.commit()
    try:
        db.execute("BEGIN")
        db.execute(new_sql)
        db.execute(f"INSERT INTO {table}__new SELECT * FROM {table}")
        db.execute(f"DROP TABLE {table}")
        db.execute(f"ALTER TABLE {table}__new RENAME TO {table}")
        for ix in indexes:
            db.execute(ix)
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise
    print(now(), f"migrated {table}: {old} → {new}", flush=True)


widen_check("reactions", "CHECK (kind IN ('memory', 'comment'))", "CHECK (kind IN ('memory', 'comment', 'clip'))")
widen_check("memories", "CHECK (kind IN ('article', 'notes'))", "CHECK (kind IN ('article', 'notes', 'recording'))")
db.execute("DELETE FROM audit_log WHERE at < datetime('now', ?)", (f"-{AUDIT_KEEP_DAYS} days",))
db.commit()


# ── Search: a full-text index (SQLite FTS5) of what members wrote and named, rebuilt when
# something changed (this service's writes, or the workers': data_version tells). The
# transcripts' lines (kind 'line') are many and rarely change: they're indexed apart, when
# the transcripts change. Words match as beginnings ("prem" finds Premkumar), accents ignored.
db.executescript("""
CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
    kind UNINDEXED, ref UNINDEXED, title, body, tokenize = 'unicode61 remove_diacritics 2', prefix = '2 3');
""")
search_state = {"dirty": True, "version": None, "lines": None}


def table_exists(name):
    return bool(db.execute("SELECT 1 FROM sqlite_master WHERE name = ?", (name,)).fetchone())


def plain(text):
    """Text of a memory without its markup (**bold**, lists, headings)."""
    return " ".join(re.sub(r"[*#>_`]|^\s*(?:\d+\.|-)\s", " ", str(text or ""), flags=re.M).split())


def refresh_search():
    """Bring the index up to date; cheap when nothing changed. Call with db_lock held."""
    version = db.execute("PRAGMA data_version").fetchone()[0]
    if search_state["dirty"] or version != search_state["version"]:
        docs = []
        for r in db.execute("SELECT id, name FROM people WHERE deleted_at IS NULL"):
            docs.append(("person", r[0], r[1], ""))
        names = {}
        for r in db.execute("SELECT mp.memory_id, pe.name FROM memory_people mp JOIN people pe ON pe.id = mp.person_id AND pe.deleted_at IS NULL"):
            names.setdefault(r[0], []).append(r[1])
        for r in db.execute("SELECT id, title, body FROM memories WHERE deleted_at IS NULL"):
            docs.append(("memory", r[0], r[1], plain(r[2]) + " " + " ".join(names.get(r[0], []))))
        for r in db.execute("SELECT id, body FROM comments WHERE deleted_at IS NULL"):
            docs.append(("comment", r[0], "", r[1]))
        names = {}
        for r in db.execute("SELECT mp.marker_id, pe.name FROM marker_people mp JOIN people pe ON pe.id = mp.person_id AND pe.deleted_at IS NULL ORDER BY mp.ord"):
            names.setdefault(r[0], []).append(r[1])
        for r in db.execute("SELECT id, kind, title FROM markers WHERE deleted_at IS NULL"):
            docs.append((r[1], r[0], ", ".join(names[r[0]]) if r[1] == "event" and names.get(r[0]) else r[2], ""))
        names = {}
        for r in db.execute("SELECT pp.photo_id, pe.name FROM photo_people pp JOIN people pe ON pe.id = pp.person_id AND pe.deleted_at IS NULL ORDER BY pp.id"):
            names.setdefault(r[0], []).append(r[1])
        for photo, ns in names.items():
            docs.append(("photo", photo, "", ", ".join(ns)))
        if table_exists("clips"):
            for r in db.execute("SELECT id, title, note FROM clips WHERE deleted_at IS NULL"):
                docs.append(("clip", r[0], r[1], r[2] or ""))
        db.execute("DELETE FROM search_fts WHERE kind != 'line'")
        db.executemany("INSERT INTO search_fts (kind, ref, title, body) VALUES (?, ?, ?, ?)", docs)
        lines_sig = db.execute("SELECT COUNT(*), MAX(updated_at) FROM caption_lines").fetchone() if table_exists("caption_lines") else None
        if lines_sig != search_state["lines"]:
            db.execute("DELETE FROM search_fts WHERE kind = 'line'")
            if lines_sig:
                db.execute("INSERT INTO search_fts (kind, ref, title, body) SELECT 'line', id, '', "
                           "text || CASE WHEN text_en IS NOT NULL AND text_en != text THEN ' ' || text_en ELSE '' END "
                           "FROM caption_lines WHERE hidden = 0")
            search_state["lines"] = lines_sig
        db.commit()
        search_state["dirty"] = False
        search_state["version"] = db.execute("PRAGMA data_version").fetchone()[0]


def search_terms(q):
    """The words of q (at most 8), lower-case, for an FTS5 query: every one, as a word beginning."""
    words = re.findall(r"\w+", q.lower())[:8]
    return words, " ".join('"%s"*' % w for w in words)


def search_hits(match, kind, limit):
    """[(ref, snippet)] of one kind, best first. snippet: the body around the match ('' if none)."""
    with db_lock:
        refresh_search()
        return [(r[0], r[1]) for r in db.execute(
            "SELECT ref, snippet(search_fts, 3, '', '', '…', 18) FROM search_fts WHERE search_fts MATCH ? AND kind = ? "
            "ORDER BY bm25(search_fts, 0, 0, 4, 1) LIMIT ?", (match, kind, limit))]


def fmt_clock(s):
    s = int(s)
    return f"{s // 3600}:{s // 60 % 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def covered(a, b):
    """Share of the smaller box (x, y, w, h fractions) that the two overlap: a tight detected
    face inside a loose hand-drawn box is the same face even though they differ in size."""
    ix = max(0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1]))
    return ix * iy / (min(a[2] * a[3], b[2] * b[3]) or 1e-9)


SAME_FACE = 0.5   # covered() above this: two boxes are the same face


def query(sql, args=()):
    with db_lock:
        return [dict(r) for r in db.execute(sql, args).fetchall()]


def execute(sql, args=()):
    with db_lock:
        cur = db.execute(sql, args)
        db.commit()
        search_state["dirty"] = True
        return cur.lastrowid


def log(*parts):
    """One line on stdout (docker logs / journal): errors and notable events, never bodies or tokens."""
    print(now(), *parts, flush=True)



def audit(who, action, target=None, detail=None, ip=None):
    """Record an action in the audit log; never raises (the action itself already happened)."""
    try:
        actor = None
        if who:
            row = query("SELECT display_name FROM profiles WHERE user_id = ?", (who["id"],))
            actor = (row[0]["display_name"] if row and row[0]["display_name"] else None) or who.get("username")
        execute("INSERT INTO audit_log (at, user_id, actor, action, target, detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (now(), who["id"] if who else None, actor, action, target, clean(detail, 300) if detail else None, ip))
    except Exception:
        log("audit failed:", action, target, traceback.format_exc(limit=2).replace("\n", " | "))


def plural_s(n, word):
    return f"{n} {word}" + ("" if n == 1 else "s")


def excerpt(text, n=120):
    text = " ".join(re.sub(r"[*#>_]", "", str(text or "")).split())
    return text if len(text) <= n else text[:n - 1] + "…"


# ── Reactions
EMOJIS = ("🙏", "❤️", "😊")


def reactions_for(kind, ids, user_id):
    out = {}
    if ids:
        for r in query("SELECT target_id, emoji, COUNT(*) AS n, SUM(user_id = ?) AS mine FROM reactions WHERE kind = ? AND target_id IN (%s) "
                       "GROUP BY target_id, emoji" % ",".join("?" * len(ids)), (user_id, kind, *ids)):
            o = out.setdefault(r["target_id"], {"counts": {}, "mine": []})
            o["counts"][r["emoji"]] = r["n"]
            if r["mine"]:
                o["mine"].append(r["emoji"])
    return out


# ── Notifications
def notify(user_id, kind, actor_id, target=None, ref_id=None, position=None, detail=None):
    """One notification; never to the person who did it, and not twice for the same thing."""
    if not user_id or user_id == actor_id:
        return
    if query("SELECT 1 FROM notifications WHERE user_id = ? AND kind = ? AND actor_id = ? AND IFNULL(ref_id, 0) = IFNULL(?, 0) "
             "AND IFNULL(target, '') = IFNULL(?, '') AND IFNULL(detail, '') = IFNULL(?, '')", (user_id, kind, actor_id, ref_id, target, detail)):
        return
    execute("INSERT INTO notifications (user_id, kind, actor_id, target, ref_id, position_s, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, kind, actor_id, target, ref_id, position, detail, now()))


def notify_tagged(actor_id, person_ids, kind, target=None, ref_id=None, position=None, detail=None):
    """Members who linked themselves to one of these 1994 people hear that they were tagged."""
    ids = [i for i in person_ids if isinstance(i, int)]
    if not ids:
        return
    for r in query("SELECT user_id FROM profiles WHERE person_id IN (%s)" % ",".join("?" * len(ids)), ids):
        notify(r["user_id"], kind, actor_id, target, ref_id, position, detail)


# ── Jellyfin
def jellyfin(method, path, token, body=None, auth=None, ip=None):
    headers = {"Authorization": auth or f'{CLIENT}, Token="{token}"'}
    if ip:
        headers["X-Forwarded-For"] = ip
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
        server_admin = bool(me.get("Policy", {}).get("IsAdministrator"))
        # isAdmin: may moderate everything on the site (edit/delete anyone's content, approve
        # access requests): Jellyfin administrators and the members they made moderators.
        # isServerAdmin: a Jellyfin administrator; only they manage moderators.
        moderator = bool(query("SELECT 1 FROM moderators WHERE user_id = ?", (me["Id"],)))
        who = {"id": me["Id"], "username": me["Name"], "isAdmin": server_admin or moderator,
               "isServerAdmin": server_admin, "isModerator": moderator and not server_admin}
    except (urllib.error.URLError, KeyError, ValueError):
        who = None
    with identity_lock:
        identity_cache[token] = (time.time() + 60, who)
        if len(identity_cache) > 5000:
            identity_cache.clear()
    if who:
        t = now()
        execute("INSERT INTO profiles (user_id, username, updated_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?) "
                "ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, last_seen_at = excluded.last_seen_at, "
                "created_at = COALESCE(profiles.created_at, excluded.created_at)", (who["id"], who["username"], t, t, t))
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


def failures(key, window):
    """How many times allow() was called for key in the last window seconds (without counting this one)."""
    t = time.time()
    with bucket_lock:
        return sum(1 for h in buckets.get(key, []) if h > t - window)


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


class Handler(BaseHTTPRequestHandler):
    server_version = "kodai-community"
    sys_version = ""

    # No access log (paths and bodies are members' private business). Failures and slow
    # requests are logged by handle_any, with the route's pattern instead of the path.
    def log_message(self, fmt, *args):
        pass

    SLOW_S = 3

    # ── plumbing
    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        for c in getattr(self, "cookies_out", ()):
            self.send_header("Set-Cookie", c)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "private, no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_text(self, status, text, ctype):
        body = text.encode()
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "private, no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self, limit=16384):
        length = int(self.headers.get("Content-Length") or 0)
        if length > limit:
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
        """Administrators and moderators (see identify)."""
        who = self.member()
        if not who["isAdmin"]:
            raise ApiError(403, "Only the administrator or a moderator can do that.")
        return who

    def server_admin(self):
        who = self.member()
        if not who["isServerAdmin"]:
            raise ApiError(403, "Only the administrator can do that.")
        return who

    def handle_any(self, method):
        started, route = time.monotonic(), "?"
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
                    route = pattern
                    out = fn(self, params, *m.groups())
                    if len(out) == 3:   # (status, text, content type)
                        return self.send_text(*out)
                    return self.send_json(*out)
            raise ApiError(404, "Not found.")
        except ApiError as e:
            self.send_json(e.status, {"error": e.message})
        except (BrokenPipeError, ConnectionResetError):
            log("client went away:", method, route)
        except urllib.error.URLError as e:   # Jellyfin didn't answer, or refused
            ref = secrets.token_hex(3)
            log(f"error {ref}: {method} {route}: Jellyfin: {e}")
            self.send_json(502, {"error": f"The video server didn't answer. Try again in a moment. (ref {ref})"})
        except Exception:  # never leak internals; the log has them, under the reference shown
            ref = secrets.token_hex(3)
            log(f"error {ref}: {method} {route}\n" + traceback.format_exc())
            try:
                self.send_json(500, {"error": f"Something went wrong on the server. Try again in a moment. (ref {ref})"})
            except OSError:
                pass
        finally:
            took = time.monotonic() - started
            if took > self.SLOW_S:
                log(f"slow: {method} {route} took {took:.1f} s")

    def do_GET(self): self.handle_any("GET")
    def do_POST(self): self.handle_any("POST")
    def do_PUT(self): self.handle_any("PUT")
    def do_DELETE(self): self.handle_any("DELETE")

    # ── sign-in (see the top of this file)
    def client_ip(self):
        return self.headers.get("X-Client-IP", "") or self.client_address[0]

    def set_auth_cookie(self, token, remember):
        c = f"{COOKIE}={token}; Path={COOKIE_PATH}; HttpOnly; SameSite=Strict"
        if self.headers.get("X-Client-IP"):   # through Cloudflare, so HTTPS (staging and local tests are plain HTTP)
            c += "; Secure"
        if remember:
            c += f"; Max-Age={REMEMBER_S}"
        self.cookies_out = [c]

    def clear_auth_cookie(self):
        self.cookies_out = [f"{COOKIE}=; Path={COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=0"]

    def device(self):
        """The browser's device id (kodai_device cookie, set by the page), for Jellyfin's Devices list."""
        m = re.search(r"(?:^|;\s*)kodai_device=([A-Za-z0-9-]{8,64})(?:;|$)", self.headers.get("Cookie", ""))
        return m.group(1) if m else "kodai-browser"

    def post_session(self, params):
        data = self.read_json()
        username, password = clean(data.get("username"), 254), str(data.get("password") or "")[:256]
        if not username or not password:
            raise ApiError(400, "Enter your username and password.")
        ip = self.client_ip()
        # Jellyfin locks an account after 5 wrong passwords; this stops one connection trying many
        # accounts. Only failed attempts count.
        if failures(("signin", ip), 600) >= 10 or failures(("signin-user", username.lower()), 600) >= 10:
            raise ApiError(429, "Too many sign-in attempts. Wait ten minutes and try again.")
        agent = re.sub(r'[^A-Za-z0-9 ._-]', "", self.headers.get("X-Kodai-Device-Name", "") or "Browser")[:40] or "Browser"
        auth = f'MediaBrowser Client="{PAGE_CLIENT}", Device="{agent}", DeviceId="{self.device()}", Version="{PAGE_VERSION}"'
        try:
            r = jellyfin("POST", "/Users/AuthenticateByName", None, {"Username": username, "Pw": password}, auth=auth, ip=ip)
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403):
                allow(("signin", ip), 10 ** 6, 600); allow(("signin-user", username.lower()), 10 ** 6, 600)   # count the failure
                audit(None, "signin.fail", f"user:{username.lower()}", None, ip)
                raise ApiError(401, "That username and password don’t match. Check them and try again.")
            raise
        token = r["AccessToken"]
        who = identify(token)
        if not who:
            raise ApiError(403, f"This account can’t open the {LIBRARY_NAME} recordings. Ask whoever sent you the link to check your access.")
        self.set_auth_cookie(token, bool(data.get("remember")))
        audit(who, "signin", f"user:{who['id']}", None, ip)
        return 200, {"userId": who["id"], "name": who["username"]}

    def get_session(self, params):
        """Whether this browser is signed in (the page can't read its cookie): 200 either way."""
        who = identify(self.headers.get("X-Kodai-Token", ""))
        return 200, {"signedIn": True, "userId": who["id"], "name": who["username"]} if who else {"signedIn": False}

    def delete_session(self, params):
        token = self.headers.get("X-Kodai-Token", "")
        who = identify(token) if token else None
        if who:
            try:
                jellyfin("POST", "/Sessions/Logout", token)
            except (urllib.error.URLError, ValueError):
                pass
            with identity_lock:
                identity_cache.pop(token, None)
        self.clear_auth_cookie()
        return 200, {"signedOut": True}

    def post_session_upgrade(self, params):
        token = self.headers.get("X-Kodai-Token", "")
        who = identify(token)
        if not who:
            raise ApiError(401, "Sign in to continue.")
        self.set_auth_cookie(token, bool(self.read_json().get("remember")))
        return 200, {"userId": who["id"], "name": who["username"]}

    # ── routes
    def get_health(self, params):
        """For monitoring (monitor.py, the compose healthcheck): the database answers. Open to anyone; says nothing else."""
        query("SELECT 1")
        return 200, {"ok": True}

    def get_me(self, params):
        who = self.member()
        row = query("SELECT display_name, person_id FROM profiles WHERE user_id = ?", (who["id"],))
        return 200, {"id": who["id"], "username": who["username"], "isAdmin": who["isAdmin"],
                     "isServerAdmin": who["isServerAdmin"], "isModerator": who["isModerator"],
                     "displayName": row[0]["display_name"] if row else None,
                     "personId": row[0]["person_id"] if row else None}

    def put_me(self, params):
        who = self.member()
        data = self.read_json()
        out = {}
        if "displayName" in data or not out:
            name = clean(data.get("displayName"), 60)
            if len(name) < 2:
                raise ApiError(400, "Enter the name you'd like others to see, at least 2 characters.")
            execute("UPDATE profiles SET display_name = ?, updated_at = ? WHERE user_id = ?", (name, now(), who["id"]))
            out["displayName"] = name
        return 200, out

    def get_comments(self, params):
        who = self.member()
        target = urllib.parse.unquote(params.get("target", ""))
        if not TARGET.match(target):
            raise ApiError(400, "Unknown video or photo.")
        rows = query("SELECT c.id, c.user_id, c.body, c.position_s, c.created_at, "
                     "COALESCE(p.display_name, p.username, 'Member') AS author "
                     "FROM comments c LEFT JOIN profiles p ON p.user_id = c.user_id "
                     "WHERE c.target = ? AND c.deleted_at IS NULL ORDER BY c.created_at, c.id", (target,))
        rx = reactions_for("comment", [r["id"] for r in rows], who["id"])
        return 200, [{"id": r["id"], "author": r["author"], "body": r["body"], "position": r["position_s"],
                      "createdAt": r["created_at"], "mine": r["user_id"] == who["id"],
                      "reactions": rx.get(r["id"], {"counts": {}, "mine": []}),
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
        told = set()
        if target.startswith(("memory:", "clip:")):   # the memory's author, the clip's maker
            kind, _, oid = target.partition(":")
            owner = query(f"SELECT user_id FROM {'memories' if kind == 'memory' else 'clips'} WHERE id = ?", (int(oid),))
            if owner:
                notify(owner[0]["user_id"], "comment_on_memory", who["id"], target, cid, pos); told.add(owner[0]["user_id"])
        # everyone else who commented on the same video/photo/memory
        for r in query("SELECT DISTINCT user_id FROM comments WHERE target = ? AND deleted_at IS NULL AND user_id != ? LIMIT 30", (target, who["id"])):
            if r["user_id"] not in told:
                notify(r["user_id"], "comment_thread", who["id"], target, cid, pos)
        return 201, {"id": cid}

    def delete_comment(self, params, cid):
        who = self.member()
        row = query("SELECT user_id, target, body FROM comments WHERE id = ? AND deleted_at IS NULL", (int(cid),))
        if not row:
            raise ApiError(404, "That comment was already removed.")
        if row[0]["user_id"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "You can only delete your own comments.")
        execute("UPDATE comments SET deleted_at = ? WHERE id = ?", (now(), int(cid)))
        audit(who, "comment.delete" + ("" if row[0]["user_id"] == who["id"] else ".other"), f"comment:{cid}",
              f"on {row[0]['target']}: {excerpt(row[0]['body'])}")
        return 200, {"deleted": int(cid)}

    # ── chapters and tagged events
    def need_name(self, who):
        if not query("SELECT 1 FROM profiles WHERE user_id = ? AND display_name IS NOT NULL", (who["id"],)):
            raise ApiError(409, "Choose the name others will see before adding.")

    @staticmethod
    def chapter_title(data):
        title = clean(data.get("title"), 100)
        if len(title) < 2:
            raise ApiError(400, "Give the chapter a short title, at least 2 characters.")
        return title

    @staticmethod
    def position(data):
        pos = data.get("position")
        if not isinstance(pos, (int, float)) or not 0 <= pos < 86400:
            raise ApiError(400, "Enter a time within the recording, like 1:02:10.")
        return int(pos)

    @staticmethod
    def tagged_people(data):
        """Validated person rows for an event, in the order given."""
        ids = data.get("people")
        if not isinstance(ids, list) or not ids:
            raise ApiError(400, "Tag at least one person who appears at this moment.")
        if len(ids) > 20:
            raise ApiError(400, "Tag at most 20 people in one event.")
        seen, rows = set(), []
        for i in ids:
            if not isinstance(i, int) or i in seen:
                raise ApiError(400, "That list of people isn't valid. Reload the page and try again.")
            seen.add(i)
            r = query("SELECT id, name FROM people WHERE id = ? AND deleted_at IS NULL", (i,))
            if not r:
                raise ApiError(400, "Someone you tagged was removed from the People list. Reload the page and try again.")
            rows.append(r[0])
        return rows

    @staticmethod
    def event_title(rows):
        return ", ".join(r["name"] for r in rows)[:500]

    @staticmethod
    def link_people(mid, rows):
        execute("DELETE FROM marker_people WHERE marker_id = ?", (mid,))
        for i, r in enumerate(rows):
            execute("INSERT INTO marker_people (marker_id, person_id, ord) VALUES (?, ?, ?)", (mid, r["id"], i))

    def get_markers(self, params):
        who = self.member()
        target = urllib.parse.unquote(params.get("target", ""))
        if not VIDEO_TARGET.match(target):
            raise ApiError(400, "Unknown video.")
        rows = query("SELECT m.id, m.user_id, m.kind, m.title, m.position_s, m.created_at, "
                     "COALESCE(p.display_name, p.username, 'Member') AS author "
                     "FROM markers m LEFT JOIN profiles p ON p.user_id = m.user_id "
                     "WHERE m.target = ? AND m.deleted_at IS NULL ORDER BY m.position_s, m.id", (target,))
        tags = {}
        for t in query("SELECT mp.marker_id, pe.id, pe.name FROM marker_people mp "
                       "JOIN people pe ON pe.id = mp.person_id AND pe.deleted_at IS NULL "
                       "JOIN markers m ON m.id = mp.marker_id AND m.target = ? AND m.deleted_at IS NULL "
                       "ORDER BY mp.marker_id, mp.ord", (target,)):
            tags.setdefault(t["marker_id"], []).append({"id": t["id"], "name": t["name"]})
        out = []
        for r in rows:
            people = tags.get(r["id"], [])
            # Events show their people's current names, so renames on the People list carry through.
            title = ", ".join(x["name"] for x in people) if (r["kind"] == "event" and people) else r["title"]
            out.append({"id": r["id"], "kind": r["kind"], "title": title, "people": people, "position": r["position_s"],
                        "author": r["author"], "createdAt": r["created_at"], "mine": r["user_id"] == who["id"],
                        "canEdit": r["user_id"] == who["id"] or who["isAdmin"]})
        return 200, out

    def get_marker_counts(self, params):
        self.member()
        out = {}
        for r in query("SELECT target, kind, COUNT(*) AS n FROM markers WHERE deleted_at IS NULL GROUP BY target, kind "
                       "UNION ALL SELECT target, 'clip', COUNT(*) FROM clips WHERE deleted_at IS NULL GROUP BY target"):
            out.setdefault(r["target"], {"chapter": 0, "event": 0, "clip": 0})[r["kind"]] = r["n"]
        return 200, out

    def post_marker(self, params):
        who = self.member()
        data = self.read_json()
        target = str(data.get("target", ""))
        if not VIDEO_TARGET.match(target):
            raise ApiError(400, "Unknown video.")
        kind = str(data.get("kind", ""))
        if kind not in ("chapter", "event"):
            raise ApiError(400, "Choose Chapter or Event.")
        pos = self.position(data)
        people = self.tagged_people(data) if kind == "event" else None
        title = self.event_title(people) if people else self.chapter_title(data)
        self.need_name(who)
        if not allow(("marker", who["id"]), 20, 60):
            raise ApiError(429, "You're adding quickly. Wait a minute and try again.")
        mid = execute("INSERT INTO markers (target, user_id, kind, title, position_s, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                      (target, who["id"], kind, title, pos, now()))
        if people:
            self.link_people(mid, people)
            notify_tagged(who["id"], [r["id"] for r in people], "tagged_event", target, mid, pos)
        return 201, {"id": mid}

    def own_marker(self, who, mid):
        row = query("SELECT user_id FROM markers WHERE id = ? AND deleted_at IS NULL", (int(mid),))
        if not row:
            raise ApiError(404, "That marker was already removed.")
        if row[0]["user_id"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "You can only change markers you added.")

    def put_marker(self, params, mid):
        who = self.member()
        data = self.read_json()
        self.own_marker(who, mid)
        current = query("SELECT kind FROM markers WHERE id = ?", (int(mid),))[0]
        kind = str(data.get("kind", current["kind"]))
        if kind not in ("chapter", "event"):
            raise ApiError(400, "Choose Chapter or Event.")
        sets = {"kind": kind}
        if "position" in data:
            sets["position_s"] = self.position(data)
        if kind == "event":
            if "people" in data or current["kind"] != "event":
                people = self.tagged_people(data)
                sets["title"] = self.event_title(people)
                self.link_people(int(mid), people)
                tgt = query("SELECT target FROM markers WHERE id = ?", (int(mid),))[0]["target"]
                notify_tagged(who["id"], [r["id"] for r in people], "tagged_event", tgt, int(mid), sets.get("position_s"))
        else:
            if "title" in data or current["kind"] != "chapter":
                sets["title"] = self.chapter_title(data)
            execute("DELETE FROM marker_people WHERE marker_id = ?", (int(mid),))
        cols = ", ".join(f"{k} = ?" for k in sets)  # keys are fixed names above, never user input
        execute(f"UPDATE markers SET {cols}, updated_at = ? WHERE id = ?", (*sets.values(), now(), int(mid)))
        return 200, {"id": int(mid)}

    def delete_marker(self, params, mid):
        who = self.member()
        self.own_marker(who, mid)
        m = query("SELECT kind, title, target, position_s, user_id FROM markers WHERE id = ?", (int(mid),))[0]
        execute("UPDATE markers SET deleted_at = ? WHERE id = ?", (now(), int(mid)))
        audit(who, f"{m['kind']}.delete" + ("" if m["user_id"] == who["id"] else ".other"), f"marker:{mid}",
              f"{m['title']} at {fmt_clock(m['position_s'])} in {m['target']}")
        return 200, {"deleted": int(mid)}

    # ── clips: a stretch of a recording with a title (and who's in it), to share and react to
    CLIP_MIN_S, CLIP_MAX_S = 2, 20 * 60
    CLIP_SQL = ("SELECT c.*, COALESCE(p.display_name, 'A member') AS author FROM clips c "
                "LEFT JOIN profiles p ON p.user_id = c.user_id WHERE c.deleted_at IS NULL ")

    @staticmethod
    def clip_people(ids):
        out = {}
        if ids:
            for r in query("SELECT cp.clip_id, pe.id, pe.name FROM clip_people cp JOIN people pe ON pe.id = cp.person_id AND pe.deleted_at IS NULL "
                           "WHERE cp.clip_id IN (%s) ORDER BY cp.clip_id, cp.ord" % ",".join("?" * len(ids)), ids):
                out.setdefault(r["clip_id"], []).append({"id": r["id"], "name": r["name"]})
        return out

    def clip_row(self, who, r, people=None, rx=None, comments=None):
        if people is None:
            people = self.clip_people([r["id"]])
        if rx is None:
            rx = reactions_for("clip", [r["id"]], who["id"])
        return {"id": r["id"], "target": r["target"], "title": r["title"], "note": r["note"] or "",
                "start": r["start_s"], "end": r["end_s"], "people": people.get(r["id"], []),
                "reactions": rx.get(r["id"], {"counts": {}, "mine": []}),
                "comments": (comments or {}).get(f"clip:{r['id']}", 0),
                "author": r["author"], "createdAt": r["created_at"], "mine": r["user_id"] == who["id"],
                "canEdit": r["user_id"] == who["id"] or who["isAdmin"]}

    def clip_rows(self, who, rows):
        ids = [r["id"] for r in rows]
        people, rx = self.clip_people(ids), reactions_for("clip", ids, who["id"])
        counts = {r["target"]: r["n"] for r in query("SELECT target, COUNT(*) AS n FROM comments WHERE deleted_at IS NULL "
                                                     "AND target LIKE 'clip:%' GROUP BY target")}
        return [self.clip_row(who, r, people, rx, counts) for r in rows]

    def clip_fields(self, data, current=None):
        """Validated (title, note, start, end, people or None) from a request; current = the clip being changed."""
        cur = current or {}
        title = clean(data.get("title", cur.get("title")), 120)
        if len(title) < 2:
            raise ApiError(400, "Give the clip a title, at least 2 characters.")
        note = clean(data.get("note", cur.get("note") or ""), 1000, multiline=True)
        try:
            start = float(data.get("start", cur.get("start_s")))
            end = float(data.get("end", cur.get("end_s")))
        except (TypeError, ValueError):
            raise ApiError(400, "Set where the clip starts and ends.")
        if not 0 <= start < end <= 86400:
            raise ApiError(400, "The clip has to end after it starts.")
        if end - start < self.CLIP_MIN_S:
            raise ApiError(400, f"Make the clip at least {self.CLIP_MIN_S} seconds long.")
        if end - start > self.CLIP_MAX_S:
            raise ApiError(400, f"Keep a clip under {self.CLIP_MAX_S // 60} minutes. Add chapters for longer parts.")
        people = None
        if "people" in data:
            people = data.get("people") or []
            if not isinstance(people, list) or len(people) > 20:
                raise ApiError(400, "Tag at most 20 people in a clip.")
            for i in people:
                if not isinstance(i, int) or not query("SELECT 1 FROM people WHERE id = ? AND deleted_at IS NULL", (i,)):
                    raise ApiError(400, "Someone you tagged was removed from the People list. Reload the page and try again.")
            people = list(dict.fromkeys(people))
        return title, note, round(start, 1), round(end, 1), people

    @staticmethod
    def set_clip_people(cid, ids):
        execute("DELETE FROM clip_people WHERE clip_id = ?", (cid,))
        for i, pid in enumerate(ids):
            execute("INSERT INTO clip_people (clip_id, person_id, ord) VALUES (?, ?, ?)", (cid, pid, i))

    def get_clips(self, params):
        who = self.member()
        target = urllib.parse.unquote(params.get("target", ""))
        if target:
            if not VIDEO_TARGET.match(target):
                raise ApiError(400, "Unknown video.")
            rows = query(self.CLIP_SQL + "AND c.target = ? ORDER BY c.start_s, c.id", (target,))
        else:
            rows = query(self.CLIP_SQL + "ORDER BY c.created_at DESC, c.id DESC LIMIT 300")
        return 200, self.clip_rows(who, rows)

    def get_clip(self, params, cid):
        who = self.member()
        rows = query(self.CLIP_SQL + "AND c.id = ?", (int(cid),))
        if not rows:
            raise ApiError(404, "That clip was removed.")
        return 200, self.clip_rows(who, rows)[0]

    def post_clip(self, params):
        who = self.member()
        data = self.read_json()
        target = str(data.get("target", ""))
        if not VIDEO_TARGET.match(target):
            raise ApiError(400, "Unknown video.")
        title, note, start, end, people = self.clip_fields(data)
        self.need_name(who)
        if not allow(("clip", who["id"]), 30, 3600):
            raise ApiError(429, "You've made a lot of clips. Wait a while and try again.")
        cid = execute("INSERT INTO clips (target, user_id, title, note, start_s, end_s, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                      (target, who["id"], title, note or None, start, end, now()))
        if people:
            self.set_clip_people(cid, people)
            notify_tagged(who["id"], people, "tagged_clip", f"clip:{cid}", cid, int(start), title)
        return 201, self.clip_rows(who, query(self.CLIP_SQL + "AND c.id = ?", (cid,)))[0]

    def own_clip(self, who, cid):
        row = query("SELECT * FROM clips WHERE id = ? AND deleted_at IS NULL", (int(cid),))
        if not row:
            raise ApiError(404, "That clip was removed.")
        if row[0]["user_id"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "Only the person who made this clip, or a moderator, can change it.")
        return row[0]

    def put_clip(self, params, cid):
        who = self.member()
        data = self.read_json()
        cur = self.own_clip(who, cid)
        title, note, start, end, people = self.clip_fields(data, cur)
        execute("UPDATE clips SET title = ?, note = ?, start_s = ?, end_s = ?, updated_at = ? WHERE id = ?",
                (title, note or None, start, end, now(), int(cid)))
        if people is not None:
            self.set_clip_people(int(cid), people)
            notify_tagged(who["id"], people, "tagged_clip", f"clip:{cid}", int(cid), int(start), title)
        return 200, self.clip_rows(who, query(self.CLIP_SQL + "AND c.id = ?", (int(cid),)))[0]

    def delete_clip(self, params, cid):
        who = self.member()
        cur = self.own_clip(who, cid)
        execute("UPDATE clips SET deleted_at = ? WHERE id = ?", (now(), int(cid)))
        audit(who, "clip.delete" + ("" if cur["user_id"] == who["id"] else ".other"), f"clip:{cid}",
              f"{cur['title']} ({fmt_clock(cur['start_s'])}–{fmt_clock(cur['end_s'])} in {cur['target']})")
        return 200, {"deleted": int(cid)}

    # ── captions: transcripts from captions/worker.py, corrected by moderators
    @staticmethod
    def caption_run_row(r):
        return {"id": r["id"], "status": r["status"], "progress": r["progress"], "message": r["message"], "language": r["language"],
                "createdAt": r["created_at"], "finishedAt": r["finished_at"]} if r else None

    def video_target(self, params):
        target = urllib.parse.unquote(params.get("target", ""))
        if not VIDEO_TARGET.match(target):
            raise ApiError(400, "Unknown video.")
        return target

    def get_captions(self, params):
        who = self.member()
        target = self.video_target(params)
        lines = query("SELECT id, start_s, end_s, language, text, text_en, edited_by FROM caption_lines WHERE target = ? AND hidden = 0 "
                      "ORDER BY start_s, id", (target,))
        run = query("SELECT * FROM caption_runs WHERE target = ? ORDER BY id DESC LIMIT 1", (target,))
        place = None
        if run and run[0]["status"] in ("queued", "running"):
            queue = [r["id"] for r in query("SELECT id FROM caption_runs WHERE status IN ('queued', 'running') ORDER BY status = 'running' DESC, id")]
            place = queue.index(run[0]["id"]) if run[0]["id"] in queue else None
        desc = query("SELECT text, source, updated_at FROM video_descriptions WHERE target = ?", (target,))
        out_run = self.caption_run_row(run[0] if run else None)
        if out_run:
            out_run["place"] = place
        return 200, {"lines": [{"id": r["id"], "start": r["start_s"], "end": r["end_s"], "language": r["language"], "text": r["text"],
                                "textEn": r["text_en"], "edited": bool(r["edited_by"])} for r in lines],
                     "run": out_run, "canEdit": who["isAdmin"],
                     "description": {"text": desc[0]["text"], "source": desc[0]["source"], "updatedAt": desc[0]["updated_at"]} if desc else None}

    @staticmethod
    def vtt_time(t):
        ms = int(round(t * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}.{ms % 1000:03d}"

    def get_captions_vtt(self, params):
        self.member()
        target = self.video_target(params)
        english = params.get("lang") == "en"
        out = ["WEBVTT", ""]
        for r in query("SELECT start_s, end_s, text, text_en, language FROM caption_lines WHERE target = ? AND hidden = 0 ORDER BY start_s, id", (target,)):
            text = (r["text_en"] or (r["text"] if (r["language"] or "en") == "en" else "")) if english else r["text"]
            text = " ".join((text or "").replace("-->", "→").split())
            if text:   # on screen at most 8 s: Whisper's line can run on across a pause
                end = min(max(r["end_s"], r["start_s"] + 0.5), r["start_s"] + 8)
                out += [f"{self.vtt_time(r['start_s'])} --> {self.vtt_time(end)}", text, ""]
        return 200, "\n".join(out), "text/vtt; charset=utf-8"

    def get_captions_status(self, params):
        self.member()
        out = {}
        for r in query("SELECT target, COUNT(*) AS n, MAX(language) AS language, SUM(text_en IS NOT NULL) AS en FROM caption_lines "
                       "WHERE hidden = 0 GROUP BY target"):
            out[r["target"]] = {"lines": r["n"], "language": r["language"], "english": bool(r["en"]) or r["language"] == "en"}
        for r in query("SELECT target, status, progress FROM caption_runs WHERE id IN (SELECT MAX(id) FROM caption_runs GROUP BY target) "
                       "AND status IN ('queued', 'running')"):
            out.setdefault(r["target"], {"lines": 0})["run"] = {"status": r["status"], "progress": r["progress"]}
        for r in query("SELECT target, text FROM video_descriptions"):
            out.setdefault(r["target"], {"lines": 0})["description"] = r["text"]
        return 200, out

    def post_caption_run(self, params):
        who = self.admin()
        data = self.read_json()
        if data.get("all"):
            slugs = data.get("targets") or []
            if not isinstance(slugs, list) or not all(isinstance(t, str) and VIDEO_TARGET.match(t) for t in slugs):
                raise ApiError(400, "That list of recordings isn't valid.")
        else:
            target = str(data.get("target", ""))
            if not VIDEO_TARGET.match(target):
                raise ApiError(400, "Unknown video.")
            slugs = [target]
        queued = []
        for t in slugs:
            if query("SELECT 1 FROM caption_runs WHERE target = ? AND status IN ('queued', 'running')", (t,)):
                continue
            if data.get("all") and query("SELECT 1 FROM caption_lines WHERE target = ? LIMIT 1", (t,)):
                continue   # "all" means the ones without a transcript
            execute("INSERT INTO caption_runs (target, requested_by, created_at) VALUES (?, ?, ?)", (t, who["id"], now()))
            queued.append(t)
        if queued:
            audit(who, "caption.queue", queued[0] if len(queued) == 1 else None, plural_s(len(queued), "recording"))
        return 201, {"queued": queued}

    def cancel_caption_run(self, params, rid):
        who = self.admin()
        row = query("SELECT target, status FROM caption_runs WHERE id = ?", (int(rid),))
        if not row or row[0]["status"] not in ("queued", "running"):
            raise ApiError(404, "That one already finished.")
        execute("UPDATE caption_runs SET status = 'cancelled', finished_at = ? WHERE id = ?", (now(), int(rid)))
        return 200, {"cancelled": int(rid)}

    def put_caption_line(self, params, lid):
        who = self.admin()
        data = self.read_json()
        row = query("SELECT * FROM caption_lines WHERE id = ?", (int(lid),))
        if not row:
            raise ApiError(404, "That line was replaced by a newer transcript. Reload the page.")
        r = row[0]
        text = clean(data.get("text", r["text"]), 600)
        text_en = clean(data["textEn"], 600) or None if "textEn" in data else r["text_en"]
        hidden = 1 if data.get("hidden") else 0 if "hidden" in data else r["hidden"]
        if not text and not hidden:
            raise ApiError(400, "Write what was said, or take the line out.")
        execute("UPDATE caption_lines SET text = ?, text_en = ?, hidden = ?, edited_by = ?, updated_at = ? WHERE id = ?",
                (text or r["text"], text_en, hidden, who["id"], now(), int(lid)))
        audit(who, "caption.edit", r["target"], f"at {fmt_clock(r['start_s'])}: " + ("taken out" if hidden else excerpt(text, 100)))
        return 200, {"id": int(lid), "text": text or r["text"], "textEn": text_en, "hidden": bool(hidden)}

    def put_description(self, params):
        who = self.admin()
        data = self.read_json()
        target = str(data.get("target", ""))
        if not VIDEO_TARGET.match(target):
            raise ApiError(400, "Unknown video.")
        text = clean(data.get("text"), 1200, multiline=True)
        if not text:
            execute("DELETE FROM video_descriptions WHERE target = ?", (target,))
        else:
            execute("INSERT INTO video_descriptions (target, text, source, updated_by, updated_at) VALUES (?, ?, 'moderator', ?, ?) "
                    "ON CONFLICT(target) DO UPDATE SET text = excluded.text, source = 'moderator', updated_by = excluded.updated_by, "
                    "updated_at = excluded.updated_at", (target, text, who["id"], now()))
        audit(who, "description.edit", target, excerpt(text, 100) if text else "removed")
        return 200, {"target": target, "text": text or None}

    # ── indoor / outdoor sound (moderators mark the outdoor stretches; audio.sh follows them)
    def get_sound_sections(self, params):
        who = self.member()
        target = urllib.parse.unquote(params.get("target", ""))
        if not VIDEO_TARGET.match(target):
            raise ApiError(400, "Unknown video.")
        rows = query("SELECT s.id, s.start_s, s.end_s, s.kind, COALESCE(p.display_name, p.username, 'A moderator') AS author "
                     "FROM sound_sections s LEFT JOIN profiles p ON p.user_id = s.added_by WHERE s.target = ? ORDER BY s.start_s", (target,))
        return 200, {"sections": [{"id": r["id"], "start": r["start_s"], "end": r["end_s"], "kind": r["kind"], "author": r["author"]} for r in rows],
                     "canEdit": who["isAdmin"]}

    def post_sound_section(self, params):
        who = self.admin()
        data = self.read_json()
        target = str(data.get("target", ""))
        if not VIDEO_TARGET.match(target):
            raise ApiError(400, "Unknown video.")
        try:
            start, end = float(data.get("start")), float(data.get("end"))
        except (TypeError, ValueError):
            raise ApiError(400, "Give the start and end of the outdoor part.")
        if not (0 <= start < end <= 24 * 3600):
            raise ApiError(400, "The end has to come after the start.")
        if end - start < 5:
            raise ApiError(400, "Mark at least 5 seconds.")
        for r in query("SELECT start_s, end_s FROM sound_sections WHERE target = ? AND start_s < ? AND end_s > ?", (target, end, start)):
            raise ApiError(409, f"That overlaps the outdoor part {fmt_clock(r['start_s'])}–{fmt_clock(r['end_s'])}. Remove it first, or mark around it.")
        sid = execute("INSERT INTO sound_sections (target, start_s, end_s, kind, added_by, created_at) VALUES (?, ?, ?, 'outdoor', ?, ?)",
                      (target, round(start, 1), round(end, 1), who["id"], now()))
        audit(who, "sound.outdoor.add", target, f"{fmt_clock(start)}–{fmt_clock(end)}")
        return 201, {"id": sid}

    def delete_sound_section(self, params, sid):
        who = self.admin()
        row = query("SELECT target, start_s, end_s FROM sound_sections WHERE id = ?", (int(sid),))
        if not row:
            raise ApiError(404, "That part was already removed.")
        execute("DELETE FROM sound_sections WHERE id = ?", (int(sid),))
        audit(who, "sound.outdoor.delete", row[0]["target"], f"{fmt_clock(row[0]['start_s'])}–{fmt_clock(row[0]['end_s'])}")
        return 200, {"deleted": int(sid)}

    # ── people who appear in the recordings
    @staticmethod
    def person_name(data):
        name = clean(data.get("name"), 80)
        if len(name) < 2:
            raise ApiError(400, "Enter a name, at least 2 characters.")
        return name, " ".join(name.lower().split())

    def person_row(self, who, r):
        return {"id": r["id"], "name": r["name"], "addedBy": r["adder"], "createdAt": r["created_at"],
                "photos": r.get("photos", 0), "moments": r.get("moments", 0),
                "portrait": ({"faceId": r["pf_id"], "photo": r["pf_photo"], "box": {"x": r["pf_x"], "y": r["pf_y"], "w": r["pf_w"], "h": r["pf_h"]}}
                             if r.get("pf_id") else None),
                "mine": r["added_by"] == who["id"], "canEdit": who["isAdmin"],
                "member": r.get("member_name"), "isMe": r.get("member_id") == who["id"],
                "canDelete": who["isAdmin"] or r["added_by"] == who["id"], "noDetect": bool(r.get("no_detect"))}

    PEOPLE_SQL = ("SELECT pe.id, pe.name, pe.added_by, pe.created_at, pe.no_detect, COALESCE(p.display_name, p.username, 'Member') AS adder, "
                  "(SELECT COUNT(*) FROM photo_people pp WHERE pp.person_id = pe.id) AS photos, "
                  "(SELECT COUNT(*) FROM marker_people mp JOIN markers m ON m.id = mp.marker_id AND m.deleted_at IS NULL "
                  " WHERE mp.person_id = pe.id) AS moments, "
                  "pf.id AS pf_id, pf.photo_id AS pf_photo, pf.x AS pf_x, pf.y AS pf_y, pf.w AS pf_w, pf.h AS pf_h, "
                  "(SELECT COALESCE(m.display_name, 'A member') FROM profiles m WHERE m.person_id = pe.id LIMIT 1) AS member_name, "
                  "(SELECT m.user_id FROM profiles m WHERE m.person_id = pe.id LIMIT 1) AS member_id "
                  "FROM people pe LEFT JOIN profiles p ON p.user_id = pe.added_by "
                  # portrait: the chosen face, else the first one marked
                  "LEFT JOIN photo_faces pf ON pf.id = COALESCE(pe.portrait_face, "
                  " (SELECT MIN(f.id) FROM photo_faces f WHERE f.person_id = pe.id)) AND pf.person_id = pe.id "
                  "WHERE pe.deleted_at IS NULL")

    def get_people(self, params):
        who = self.member()
        rows = query(self.PEOPLE_SQL + " ORDER BY pe.name_key")
        return 200, [self.person_row(who, r) for r in rows]

    def post_person(self, params):
        who = self.member()
        name, key = self.person_name(self.read_json())
        existing = query(self.PEOPLE_SQL + " AND pe.name_key = ?", (key,))
        if existing:
            return 409, {"error": f"{existing[0]['name']} is already on the list.", "person": self.person_row(who, existing[0])}
        if not allow(("person", who["id"]), 15, 60):
            raise ApiError(429, "You're adding quickly. Wait a minute and try again.")
        pid = execute("INSERT INTO people (name, name_key, added_by, created_at) VALUES (?, ?, ?, ?)", (name, key, who["id"], now()))
        return 201, self.person_row(who, query(self.PEOPLE_SQL + " AND pe.id = ?", (pid,))[0])

    def put_person(self, params, pid):
        who = self.admin()
        name, key = self.person_name(self.read_json())
        if not query("SELECT 1 FROM people WHERE id = ? AND deleted_at IS NULL", (int(pid),)):
            raise ApiError(404, "That name was already removed.")
        clash = query("SELECT name FROM people WHERE name_key = ? AND id != ? AND deleted_at IS NULL", (key, int(pid)))
        if clash:
            raise ApiError(409, f"{clash[0]['name']} is already on the list.")
        old = query("SELECT name FROM people WHERE id = ?", (int(pid),))[0]["name"]
        execute("UPDATE people SET name = ?, name_key = ?, updated_at = ? WHERE id = ?", (name, key, now(), int(pid)))
        if old != name:
            audit(who, "person.rename", f"person:{pid}", f"{old} → {name}")
        return 200, {"id": int(pid), "name": name}

    def delete_person(self, params, pid):
        who = self.member()
        row = query("SELECT added_by, name FROM people WHERE id = ? AND deleted_at IS NULL", (int(pid),))
        if not row:
            raise ApiError(404, "That name was already removed.")
        if row[0]["added_by"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "Only the administrator or the person who added a name can remove it.")
        execute("UPDATE people SET deleted_at = ? WHERE id = ?", (now(), int(pid)))
        audit(who, "person.delete", f"person:{pid}", row[0]["name"])
        return 200, {"deleted": int(pid)}

    def get_person(self, params, pid):
        who = self.member()
        rows = query(self.PEOPLE_SQL + " AND pe.id = ?", (int(pid),))
        if not rows:
            raise ApiError(404, "That person isn't on the list any more.")
        photos = [r["photo_id"] for r in query("SELECT photo_id FROM photo_people WHERE person_id = ? ORDER BY photo_id", (int(pid),))]
        events = query("SELECT m.id, m.target, m.position_s FROM marker_people mp "
                       "JOIN markers m ON m.id = mp.marker_id AND m.deleted_at IS NULL "
                       "WHERE mp.person_id = ? ORDER BY m.target, m.position_s", (int(pid),))
        names = {}
        if events:
            ids = [e["id"] for e in events]
            for t in query("SELECT mp.marker_id, pe.name FROM marker_people mp JOIN people pe ON pe.id = mp.person_id "
                           "AND pe.deleted_at IS NULL WHERE mp.marker_id IN (%s) ORDER BY mp.marker_id, mp.ord" % ",".join("?" * len(ids)), ids):
                names.setdefault(t["marker_id"], []).append(t["name"])
        videos = {}
        for e in events:
            videos.setdefault(e["target"], []).append({"id": e["id"], "position": e["position_s"], "title": ", ".join(names.get(e["id"], []))})
        faces = [{"id": f["id"], "photo": f["photo_id"], "box": {"x": f["x"], "y": f["y"], "w": f["w"], "h": f["h"]},
                  "markedBy": f["marker"], "canRemove": who["isAdmin"] or f["added_by"] == who["id"]}
                 for f in query("SELECT f.*, COALESCE(p.display_name, p.username, 'Member') AS marker FROM photo_faces f "
                                "LEFT JOIN profiles p ON p.user_id = f.added_by WHERE f.person_id = ? ORDER BY f.id", (int(pid),))]
        memories = [{"id": m["id"], "kind": m["kind"], "title": m["title"], "author": m["author"], "createdAt": m["created_at"]}
                    for m in query(self.MEMORY_SQL + "AND m.id IN (SELECT memory_id FROM memory_people WHERE person_id = ?) "
                                   "ORDER BY m.created_at DESC", (int(pid),))]
        clips = [self.clip_row(who, r) for r in query(self.CLIP_SQL + "AND c.id IN (SELECT clip_id FROM clip_people WHERE person_id = ?) "
                                                     "ORDER BY c.target, c.start_s", (int(pid),))]
        return 200, {"person": self.person_row(who, rows[0]), "photos": photos, "faces": faces,
                     "videos": [{"target": t, "events": ev} for t, ev in videos.items()], "memories": memories, "clips": clips}

    # ── people tagged in photos
    def get_photo_tags(self, params):
        who = self.member()
        out = {}
        for r in query("SELECT pp.id, pp.photo_id, pp.person_id, pp.added_by, pe.name FROM photo_people pp "
                       "JOIN people pe ON pe.id = pp.person_id AND pe.deleted_at IS NULL ORDER BY pp.photo_id, pp.id"):
            out.setdefault(r["photo_id"], []).append({"tagId": r["id"], "personId": r["person_id"], "name": r["name"],
                                                      "canRemove": who["isAdmin"] or r["added_by"] == who["id"]})
        return 200, out

    def post_photo_tag(self, params):
        who = self.member()
        data = self.read_json()
        photo, person = str(data.get("photo", "")), data.get("person")
        if not PHOTO_ID.match(photo):
            raise ApiError(400, "Unknown photo.")
        if not isinstance(person, int) or not query("SELECT 1 FROM people WHERE id = ? AND deleted_at IS NULL", (person,)):
            raise ApiError(400, "That person isn't on the People list. Reload the page and try again.")
        if not allow(("phototag", who["id"]), 40, 60):
            raise ApiError(429, "You're tagging quickly. Wait a minute and try again.")
        hit = query("SELECT id FROM photo_people WHERE photo_id = ? AND person_id = ?", (photo, person))
        if hit:
            return 200, {"tagId": hit[0]["id"]}
        tid = execute("INSERT INTO photo_people (photo_id, person_id, added_by, created_at) VALUES (?, ?, ?, ?)",
                      (photo, person, who["id"], now()))
        notify_tagged(who["id"], [person], "tagged_photo", "photo:" + photo)
        return 201, {"tagId": tid}

    def delete_photo_tag(self, params, tid):
        who = self.member()
        row = query("SELECT pp.added_by, pp.photo_id, pe.name FROM photo_people pp LEFT JOIN people pe ON pe.id = pp.person_id "
                    "WHERE pp.id = ?", (int(tid),))
        if not row:
            raise ApiError(404, "That tag was already removed.")
        if row[0]["added_by"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "Only the person who added this tag, or the administrator, can remove it.")
        execute("DELETE FROM photo_people WHERE id = ?", (int(tid),))
        audit(who, "photo.untag", f"photo:{row[0]['photo_id']}", row[0]["name"])
        return 200, {"deleted": int(tid)}

    # ── 1994 faces marked on photos (labelled examples for later automatic tagging)
    def get_photo_faces(self, params):
        who = self.member()
        photo = params.get("photo", "")
        if not PHOTO_ID.match(photo):
            raise ApiError(400, "Unknown photo.")
        rows = query("SELECT f.*, pe.name FROM photo_faces f JOIN people pe ON pe.id = f.person_id AND pe.deleted_at IS NULL "
                     "WHERE f.photo_id = ? ORDER BY f.id", (photo,))
        return 200, [{"id": r["id"], "personId": r["person_id"], "name": r["name"],
                      "box": {"x": r["x"], "y": r["y"], "w": r["w"], "h": r["h"]},
                      "canRemove": who["isAdmin"] or r["added_by"] == who["id"]} for r in rows]

    def post_photo_face(self, params):
        who = self.member()
        data = self.read_json()
        photo, person, box = str(data.get("photo", "")), data.get("person"), data.get("box") or {}
        if not PHOTO_ID.match(photo):
            raise ApiError(400, "Unknown photo.")
        if not isinstance(person, int) or not query("SELECT 1 FROM people WHERE id = ? AND deleted_at IS NULL", (person,)):
            raise ApiError(400, "That person isn't on the People list. Reload the page and try again.")
        try:
            x, y, w, h = (float(box[k]) for k in ("x", "y", "w", "h"))
        except (KeyError, TypeError, ValueError):
            raise ApiError(400, "Draw a box around the face first.")
        if not (0 <= x < 1 and 0 <= y < 1 and 0.005 <= w <= 1 and 0.005 <= h <= 1 and x + w <= 1.0001 and y + h <= 1.0001):
            raise ApiError(400, "That box isn't inside the photo. Draw it again.")
        if not allow(("face", who["id"]), 40, 60):
            raise ApiError(429, "You're marking quickly. Wait a minute and try again.")
        clash = [r for r in query("SELECT f.x, f.y, f.w, f.h, pe.name FROM photo_faces f JOIN people pe ON pe.id = f.person_id "
                                  "WHERE f.photo_id = ? AND f.person_id != ?", (photo, person))
                 if covered((x, y, w, h), (r["x"], r["y"], r["w"], r["h"])) > SAME_FACE]
        if clash:
            raise ApiError(409, f"This face is already marked as {clash[0]['name']}. Remove that mark first if it's wrong.")
        existing = query("SELECT id, added_by FROM photo_faces WHERE photo_id = ? AND person_id = ?", (photo, person))
        if existing:
            if existing[0]["added_by"] != who["id"] and not who["isAdmin"]:
                raise ApiError(409, "This person's face is already marked in this photo by someone else.")
            execute("UPDATE photo_faces SET x = ?, y = ?, w = ?, h = ?, created_at = ? WHERE id = ?",
                    (x, y, w, h, now(), existing[0]["id"]))
            fid = existing[0]["id"]
        else:
            fid = execute("INSERT INTO photo_faces (photo_id, person_id, x, y, w, h, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                          (photo, person, x, y, w, h, who["id"], now()))
        # A marked face means they're in the photo.
        if not query("SELECT 1 FROM photo_people WHERE photo_id = ? AND person_id = ?", (photo, person)):
            execute("INSERT INTO photo_people (photo_id, person_id, added_by, created_at) VALUES (?, ?, ?, ?)",
                    (photo, person, who["id"], now()))
        self.settle_by_mark(who, photo, fid, person, (x, y, w, h))
        notify_tagged(who["id"], [person], "tagged_photo", "photo:" + photo)
        return 201, {"id": fid}

    @staticmethod
    def settle_by_mark(who, photo, fid, person, box):
        """A face marked by hand answers the identification suggestions on that face."""
        # A moved mark gets checked again on the next run.
        execute("DELETE FROM identify_suggestions WHERE kind = 'check' AND status = 'pending' AND mark_id = ?", (fid,))
        for s in query("SELECT id, x, y, w, h FROM identify_suggestions WHERE target = ? AND kind = 'face' AND status = 'pending'",
                       ("photo:" + photo,)):
            if covered(box, (s["x"], s["y"], s["w"], s["h"])) > SAME_FACE:
                execute("UPDATE identify_suggestions SET status = 'confirmed', final_person_id = ?, reviewed_by = ?, reviewed_at = ?, "
                        "mark_id = ? WHERE id = ?", (person, who["id"], now(), fid, s["id"]))

    @staticmethod
    def unsettle_mark(fid):
        """A mark was removed: what it answered goes back to review, its checks go."""
        execute("DELETE FROM identify_suggestions WHERE kind = 'check' AND mark_id = ?", (fid,))
        execute("UPDATE identify_suggestions SET status = 'pending', final_person_id = NULL, reviewed_by = NULL, reviewed_at = NULL, "
                "mark_id = NULL, face_id = NULL, tag_id = NULL WHERE kind = 'face' AND (mark_id = ? OR face_id = ?)", (fid, fid))

    def delete_photo_face(self, params, fid):
        who = self.member()
        row = query("SELECT f.added_by, f.photo_id, pe.name FROM photo_faces f LEFT JOIN people pe ON pe.id = f.person_id "
                    "WHERE f.id = ?", (int(fid),))
        if not row:
            raise ApiError(404, "That face was already unmarked.")
        if row[0]["added_by"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "Only the person who marked this face, or the administrator, can remove it.")
        execute("DELETE FROM photo_faces WHERE id = ?", (int(fid),))
        audit(who, "face.unmark", f"photo:{row[0]['photo_id']}", row[0]["name"])
        execute("UPDATE people SET portrait_face = NULL WHERE portrait_face = ?", (int(fid),))
        self.unsettle_mark(int(fid))
        return 200, {"deleted": int(fid)}

    def put_portrait(self, params, pid):
        who = self.member()
        face = self.read_json().get("face")
        row = query("SELECT added_by, person_id FROM photo_faces WHERE id = ?", (face,)) if isinstance(face, int) else []
        if not row or row[0]["person_id"] != int(pid):
            raise ApiError(400, "Choose one of this person's marked faces.")
        if row[0]["added_by"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "Only the person who marked this face, or the administrator, can make it the portrait.")
        execute("UPDATE people SET portrait_face = ? WHERE id = ?", (face, int(pid)))
        return 200, {"portrait": face}

    # ── Home: activity stream, members, totals
    TEST_USER = "(p.username LIKE 'zz-%' OR p.username = 'kodai-test')"
    NAME = "COALESCE(p.display_name, 'A member')"   # never the username: it's their email

    def get_activity(self, params):
        who = self.member()
        before = urllib.parse.unquote(params.get("before", "")) or "9999"
        try:
            limit = max(1, min(80, int(params.get("limit", 40))))
        except ValueError:
            limit = 40
        J = "LEFT JOIN profiles p ON p.user_id = "
        T, N = self.TEST_USER, self.NAME
        items = []
        for r in query(f"SELECT c.id, c.created_at AS at, {N} AS actor, c.target, c.body, c.position_s FROM comments c {J}c.user_id "
                       f"WHERE c.deleted_at IS NULL AND c.created_at < ? AND NOT {T} ORDER BY c.created_at DESC LIMIT ?", (before, limit)):
            items.append({"type": "comment", "at": r["at"], "actor": r["actor"], "target": r["target"],
                          "excerpt": " ".join(r["body"].split())[:180], "position": r["position_s"], "id": r["id"]})
        for r in query(f"SELECT m.id, m.created_at AS at, {N} AS actor, m.target, m.kind, m.title, m.position_s, "
                       "(SELECT GROUP_CONCAT(name, ', ') FROM (SELECT pe.name FROM marker_people mp JOIN people pe ON pe.id = mp.person_id "
                       " WHERE mp.marker_id = m.id ORDER BY mp.ord)) AS names "
                       f"FROM markers m {J}m.user_id WHERE m.deleted_at IS NULL AND m.created_at < ? AND NOT {T} "
                       "ORDER BY m.created_at DESC LIMIT ?", (before, limit)):
            items.append({"type": r["kind"], "at": r["at"], "actor": r["actor"], "target": r["target"],
                          "title": r["names"] or r["title"] if r["kind"] == "event" else r["title"], "position": r["position_s"], "id": r["id"]})
        for r in query(f"SELECT m.id, m.created_at AS at, {N} AS actor, m.kind, m.title, m.body, "
                       "(SELECT target FROM memory_links l WHERE l.memory_id = m.id ORDER BY ord LIMIT 1) AS target, "
                       "(SELECT position_s FROM memory_links l WHERE l.memory_id = m.id ORDER BY ord LIMIT 1) AS position "
                       f"FROM memories m {J}m.user_id WHERE m.deleted_at IS NULL AND m.created_at < ? AND NOT {T} "
                       "ORDER BY m.created_at DESC LIMIT ?", (before, limit)):
            items.append({"type": "memory", "at": r["at"], "actor": r["actor"], "memoryId": r["id"], "memoryKind": r["kind"],
                          "title": r["title"], "excerpt": " ".join(re.sub(r"[*#>]", "", r["body"]).split())[:180],
                          "target": r["target"], "position": r["position"]})
        for r in query(f"SELECT c.id, c.created_at AS at, {N} AS actor, c.target, c.title, c.start_s, c.end_s FROM clips c {J}c.user_id "
                       f"WHERE c.deleted_at IS NULL AND c.created_at < ? AND NOT {T} ORDER BY c.created_at DESC LIMIT ?", (before, limit)):
            items.append({"type": "clip", "at": r["at"], "actor": r["actor"], "target": r["target"], "title": r["title"],
                          "position": int(r["start_s"]), "end": r["end_s"], "id": r["id"]})
        for r in query(f"SELECT u.photo_id, u.created_at AS at, {N} AS actor FROM photo_uploads u {J}u.user_id "
                       f"WHERE u.status = 'ready' AND u.created_at < ? AND NOT {T} ORDER BY u.created_at DESC LIMIT ?", (before, limit)):
            items.append({"type": "photo", "at": r["at"], "actor": r["actor"], "target": "photo:" + r["photo_id"]})
        for r in query(f"SELECT pe.id, pe.name, pe.created_at AS at, {N} AS actor FROM people pe {J}pe.added_by "
                       f"WHERE pe.deleted_at IS NULL AND pe.added_by != 'seed' AND pe.created_at < ? AND NOT {T} "
                       "ORDER BY pe.created_at DESC LIMIT ?", (before, limit)):
            items.append({"type": "person", "at": r["at"], "actor": r["actor"], "personId": r["id"], "title": r["name"]})
        for r in query(f"SELECT a.decided_at AS at, COALESCE(p.display_name, a.name) AS actor FROM access_requests a "
                       "LEFT JOIN profiles p ON p.username = a.email WHERE a.status = 'approved' AND a.decided_at < ? "
                       "ORDER BY a.decided_at DESC LIMIT ?", (before, limit)):
            items.append({"type": "joined", "at": r["at"], "actor": r["actor"]})
        items.sort(key=lambda x: x["at"] or "", reverse=True)
        items = items[:limit]
        mine = query("SELECT activity_seen_at FROM profiles WHERE user_id = ?", (who["id"],))
        totals = {
            "memories": query("SELECT COUNT(*) AS n FROM memories WHERE deleted_at IS NULL")[0]["n"],
            "comments": query("SELECT COUNT(*) AS n FROM comments WHERE deleted_at IS NULL")[0]["n"],
            "chapters": query("SELECT COUNT(*) AS n FROM markers WHERE deleted_at IS NULL AND kind = 'chapter'")[0]["n"],
            "events": query("SELECT COUNT(*) AS n FROM markers WHERE deleted_at IS NULL AND kind = 'event'")[0]["n"],
            "clips": query("SELECT COUNT(*) AS n FROM clips WHERE deleted_at IS NULL")[0]["n"],
            "people": query("SELECT COUNT(*) AS n FROM people WHERE deleted_at IS NULL")[0]["n"],
            "faces": query("SELECT COUNT(*) AS n FROM photo_faces")[0]["n"],
            "members": query(f"SELECT COUNT(*) AS n FROM profiles p WHERE NOT {T} AND p.username != 'yajur-admin'")[0]["n"],
        }
        help_ = {"pending": query("SELECT COUNT(*) AS n FROM identify_suggestions WHERE status = 'pending'")[0]["n"],
                 "likely": query("SELECT COUNT(*) AS n FROM identify_suggestions WHERE status = 'pending' AND score >= 0.35")[0]["n"]}
        feat = query(f"SELECT m.id, m.title, m.kind, m.body, {self.NAME} AS author, m.featured_at FROM memories m "
                     "LEFT JOIN profiles p ON p.user_id = m.user_id WHERE m.deleted_at IS NULL AND m.featured_at IS NOT NULL "
                     "ORDER BY m.featured_at DESC LIMIT 1")
        featured = None
        if feat:
            f = feat[0]
            featured = {"id": f["id"], "title": f["title"], "kind": f["kind"], "author": f["author"],
                        "excerpt": " ".join(re.sub(r"[*#>]", "", f["body"]).split())[:420],
                        "links": self.links_for([f["id"]]).get(f["id"], [])}
        return 200, {"items": items, "seenAt": mine[0]["activity_seen_at"] if mine else None, "featured": featured, "week": self.this_week(),
                     "more": len(items) == limit, "totals": totals, "identify": help_}

    def this_week(self):
        """The last seven days at a glance, for the "This week" section on Home."""
        from datetime import timedelta
        since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(timespec="seconds")
        T = self.TEST_USER
        def n(sql):
            return query(sql, (since,))[0]["n"]
        counts = {
            "memories": n(f"SELECT COUNT(*) AS n FROM memories m LEFT JOIN profiles p ON p.user_id = m.user_id WHERE m.deleted_at IS NULL AND m.created_at >= ? AND NOT {T}"),
            "photos": n(f"SELECT COUNT(*) AS n FROM photo_uploads u LEFT JOIN profiles p ON p.user_id = u.user_id WHERE u.status = 'ready' AND u.created_at >= ? AND NOT {T}"),
            "comments": n(f"SELECT COUNT(*) AS n FROM comments c LEFT JOIN profiles p ON p.user_id = c.user_id WHERE c.deleted_at IS NULL AND c.created_at >= ? AND NOT {T}"),
            "chapters": n(f"SELECT COUNT(*) AS n FROM markers k LEFT JOIN profiles p ON p.user_id = k.user_id WHERE k.deleted_at IS NULL AND k.kind = 'chapter' AND k.created_at >= ? AND NOT {T}"),
            "events": n(f"SELECT COUNT(*) AS n FROM markers k LEFT JOIN profiles p ON p.user_id = k.user_id WHERE k.deleted_at IS NULL AND k.kind = 'event' AND k.created_at >= ? AND NOT {T}"),
            "faces": n("SELECT COUNT(*) AS n FROM identify_suggestions WHERE status = 'confirmed' AND reviewed_at >= ?"),
            "clips": n(f"SELECT COUNT(*) AS n FROM clips k LEFT JOIN profiles p ON p.user_id = k.user_id WHERE k.deleted_at IS NULL AND k.created_at >= ? AND NOT {T}"),
            "members": n("SELECT COUNT(*) AS n FROM access_requests WHERE status = 'approved' AND decided_at >= ?"),
        }
        memories = [{"id": r["id"], "title": r["title"], "author": r["author"]} for r in query(
            f"SELECT m.id, m.title, {self.NAME} AS author FROM memories m LEFT JOIN profiles p ON p.user_id = m.user_id "
            f"WHERE m.deleted_at IS NULL AND m.created_at >= ? AND NOT {T} ORDER BY m.created_at DESC LIMIT 4", (since,))]
        # who added the most this week (memories, photos, comments, chapters/events, confirmed faces)
        active = query(f"""SELECT {self.NAME} AS name, COUNT(*) AS n FROM (
                SELECT user_id AS uid FROM memories WHERE deleted_at IS NULL AND created_at >= :s
                UNION ALL SELECT user_id FROM photo_uploads WHERE status = 'ready' AND created_at >= :s
                UNION ALL SELECT user_id FROM comments WHERE deleted_at IS NULL AND created_at >= :s
                UNION ALL SELECT user_id FROM markers WHERE deleted_at IS NULL AND created_at >= :s
                UNION ALL SELECT user_id FROM clips WHERE deleted_at IS NULL AND created_at >= :s
                UNION ALL SELECT reviewed_by FROM identify_suggestions WHERE status = 'confirmed' AND reviewed_at >= :s
            ) x JOIN profiles p ON p.user_id = x.uid WHERE NOT {T} AND p.username != 'yajur-admin'
            GROUP BY x.uid ORDER BY n DESC LIMIT 3""".replace(":s", "?"), (since,) * 6)
        return {"since": since, "counts": counts, "memories": memories, "active": [{"name": r["name"], "count": r["n"]} for r in active]}

    def post_activity_seen(self, params):
        who = self.member()
        execute("UPDATE profiles SET activity_seen_at = ? WHERE user_id = ?", (now(), who["id"]))
        return 200, {"ok": True}

    def get_members(self, params):
        self.member()
        T = self.TEST_USER
        rows = query("SELECT p.user_id, p.display_name, p.last_seen_at, p.person_id, "
                     "COALESCE((SELECT a.decided_at FROM access_requests a WHERE a.email = p.username AND a.status = 'approved'), p.created_at) AS joined, "
                     "(SELECT COUNT(*) FROM comments c WHERE c.user_id = p.user_id AND c.deleted_at IS NULL) AS comments, "
                     "(SELECT COUNT(*) FROM memories m WHERE m.user_id = p.user_id AND m.deleted_at IS NULL) AS memories, "
                     "(SELECT COUNT(*) FROM markers k WHERE k.user_id = p.user_id AND k.deleted_at IS NULL AND k.kind = 'chapter') AS chapters, "
                     "(SELECT COUNT(*) FROM markers k WHERE k.user_id = p.user_id AND k.deleted_at IS NULL AND k.kind = 'event') AS events, "
                     "(SELECT COUNT(*) FROM photo_uploads u WHERE u.user_id = p.user_id AND u.status = 'ready') AS photos, "
                     "(SELECT COUNT(*) FROM photo_faces f WHERE f.added_by = p.user_id) AS faces, "
                     "(SELECT COUNT(*) FROM clips k WHERE k.user_id = p.user_id AND k.deleted_at IS NULL) AS clips, "
                     "EXISTS (SELECT 1 FROM moderators mo WHERE mo.user_id = p.user_id) AS moderator, "
                     # earliest trace of them, for members who predate the joined/first-seen records
                     "(SELECT MIN(t) FROM (SELECT MIN(created_at) AS t FROM comments WHERE user_id = p.user_id "
                     " UNION ALL SELECT MIN(created_at) FROM markers WHERE user_id = p.user_id "
                     " UNION ALL SELECT MIN(created_at) FROM photo_uploads WHERE user_id = p.user_id "
                     " UNION ALL SELECT MIN(created_at) FROM photo_faces WHERE added_by = p.user_id "
                     " UNION ALL SELECT MIN(created_at) FROM people WHERE added_by = p.user_id)) AS first_trace "
                     f"FROM profiles p WHERE NOT {T} AND p.username != 'yajur-admin'")
        def joined(r):
            ts = [t for t in (r["joined"], r["first_trace"]) if t]
            return min(ts) if ts else None
        out = [{"name": r["display_name"] or "A member", "joined": joined(r), "lastSeen": r["last_seen_at"], "personId": r["person_id"],
                "moderator": bool(r["moderator"]),
                "contributions": {k: r[k] for k in ("comments", "memories", "chapters", "events", "photos", "faces", "clips")}} for r in rows]
        out.sort(key=lambda m: m["lastSeen"] or "", reverse=True)
        return 200, out

    # ── notifications
    def get_notifications(self, params):
        who = self.member()
        rows = query("SELECT n.*, COALESCE(p.display_name, 'A member') AS actor, "
                     "(SELECT title FROM memories m WHERE n.target = 'memory:' || m.id) AS memory_title, "
                     "(SELECT title FROM clips k WHERE n.target = 'clip:' || k.id) AS clip_title "
                     "FROM notifications n LEFT JOIN profiles p ON p.user_id = n.actor_id "
                     "WHERE n.user_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 40", (who["id"],))
        unread = query("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", (who["id"],))[0]["n"]
        return 200, {"unread": unread, "items": [{"id": r["id"], "kind": r["kind"], "actor": r["actor"], "target": r["target"],
                                                  "refId": r["ref_id"], "position": r["position_s"], "detail": r["detail"],
                                                  "memoryTitle": r["memory_title"], "clipTitle": r["clip_title"],
                                                  "at": r["created_at"], "read": bool(r["read_at"])} for r in rows]}

    def read_notifications(self, params):
        who = self.member()
        ids = self.read_json().get("ids")
        if isinstance(ids, list) and ids:
            ids = [i for i in ids if isinstance(i, int)][:200]
            execute("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL AND id IN (%s)" % ",".join("?" * len(ids)),
                    (now(), who["id"], *ids))
        else:
            execute("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", (now(), who["id"]))
        return 200, {"ok": True}

    # ── reactions
    def post_reaction(self, params):
        who = self.member()
        data = self.read_json()
        kind, tid, emoji = str(data.get("kind", "")), data.get("id"), str(data.get("emoji", ""))
        if kind not in ("memory", "comment", "clip") or not isinstance(tid, int) or emoji not in EMOJIS:
            raise ApiError(400, "That reaction isn't valid.")
        table = {"memory": "memories", "comment": "comments", "clip": "clips"}[kind]
        owner = query(f"SELECT user_id FROM {table} WHERE id = ? AND deleted_at IS NULL", (tid,))
        if not owner:
            raise ApiError(404, "That was removed.")
        if not allow(("react", who["id"]), 60, 60):
            raise ApiError(429, "Slow down a little.")
        if query("SELECT 1 FROM reactions WHERE kind = ? AND target_id = ? AND user_id = ? AND emoji = ?", (kind, tid, who["id"], emoji)):
            execute("DELETE FROM reactions WHERE kind = ? AND target_id = ? AND user_id = ? AND emoji = ?", (kind, tid, who["id"], emoji))
        else:
            execute("INSERT INTO reactions (kind, target_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)", (kind, tid, who["id"], emoji, now()))
            target = (f"memory:{tid}" if kind == "memory" else f"clip:{tid}" if kind == "clip"
                      else query("SELECT target FROM comments WHERE id = ?", (tid,))[0]["target"])
            notify(owner[0]["user_id"], "reaction", who["id"], target, tid, None, f"{kind}:{emoji}")
        return 200, reactions_for(kind, [tid], who["id"]).get(tid, {"counts": {}, "mine": []})

    # ── search
    def get_search(self, params):
        who = self.member()
        q = clean(urllib.parse.unquote_plus(params.get("q", "")), 80)
        words, match = search_terms(q)
        out = {"q": q, "terms": words, "people": [], "memories": [], "comments": [], "moments": [], "clips": [], "photos": [], "said": []}
        if not words or len(q) < 2:
            return 200, out
        def ids(kind, limit):
            hits = search_hits(match, kind, limit)
            return [h[0] for h in hits], {h[0]: h[1] for h in hits}
        def ordered(rows, order, key="id"):
            by = {r[key]: r for r in rows}
            return [by[i] for i in order if i in by]
        def qmarks(lst):
            return ",".join("?" * len(lst))

        found, _ = ids("person", 10)
        if found:
            out["people"] = [{"id": r["id"], "name": r["name"]} for r in ordered(
                query(f"SELECT id, name FROM people WHERE deleted_at IS NULL AND id IN ({qmarks(found)})", found), found)]
        found, snip = ids("memory", 10)
        if found:
            out["memories"] = [{"id": r["id"], "title": r["title"], "kind": r["kind"], "author": r["author"],
                                "excerpt": snip.get(r["id"]) or excerpt(plain(r["body"]), 200)} for r in ordered(
                query(self.MEMORY_SQL + f"AND m.id IN ({qmarks(found)})", found), found)]
        found, snip = ids("comment", 10)
        if found:
            out["comments"] = [{"id": r["id"], "target": r["target"], "position": r["position_s"], "author": r["author"],
                                "excerpt": snip.get(r["id"]) or excerpt(r["body"], 200)} for r in ordered(query(
                f"SELECT c.id, c.target, c.position_s, c.body, {self.NAME} AS author FROM comments c LEFT JOIN profiles p ON p.user_id = c.user_id "
                f"WHERE c.deleted_at IS NULL AND c.id IN ({qmarks(found)})", found), found)]
        chapters, _ = ids("chapter", 15)
        events, _ = ids("event", 15)
        found = chapters + events
        if found:
            rows = query("SELECT m.id, m.kind, m.title, m.target, m.position_s, (SELECT GROUP_CONCAT(name, ', ') FROM (SELECT pe.name FROM marker_people mp "
                         " JOIN people pe ON pe.id = mp.person_id AND pe.deleted_at IS NULL WHERE mp.marker_id = m.id ORDER BY mp.ord)) AS names "
                         f"FROM markers m WHERE m.deleted_at IS NULL AND m.id IN ({qmarks(found)}) ORDER BY m.target, m.position_s", found)
            out["moments"] = [{"id": r["id"], "kind": r["kind"], "title": r["names"] or r["title"], "target": r["target"], "position": r["position_s"]}
                              for r in rows][:15]
        if table_exists("clips"):
            found, _ = ids("clip", 10)
            if found:
                out["clips"] = [self.clip_row(who, r) for r in ordered(query(self.CLIP_SQL + f"AND c.id IN ({qmarks(found)})", found), found)]
        found, snip = ids("photo", 12)
        out["photos"] = [{"photo": str(f), "people": snip.get(f) or ""} for f in found]
        if table_exists("caption_lines"):
            found, snip = ids("line", 20)
            if found:
                out["said"] = [{"id": r["id"], "target": r["target"], "start": r["start_s"], "end": r["end_s"], "language": r["language"],
                                "text": r["text"], "textEn": r["text_en"]} for r in ordered(query(
                    f"SELECT id, target, start_s, end_s, language, text, text_en FROM caption_lines WHERE hidden = 0 AND id IN ({qmarks(found)})", found), found)]
        return 200, out

    # ── today's challenge: a few likely matches to confirm on Home
    def get_challenge(self, params):
        who = self.member()
        try:
            n = max(1, min(8, int(params.get("n", 5))))
        except ValueError:
            n = 5
        rows = query("SELECT s.*, NULL AS reviewer, pe.name AS person_name FROM identify_suggestions s JOIN people pe ON pe.id = s.person_id "
                     "AND pe.deleted_at IS NULL WHERE s.status = 'pending' AND s.kind = 'face' AND s.score >= 0.35 ORDER BY RANDOM() LIMIT ?", (n,))
        out = []
        for r in rows:
            row = self.suggestion_row(who, r)
            row["target"] = r["target"]; row["personName"] = r["person_name"]
            pf = query("SELECT photo_id, x, y, w, h FROM photo_faces WHERE id = COALESCE((SELECT portrait_face FROM people WHERE id = ?), "
                       "(SELECT MIN(id) FROM photo_faces WHERE person_id = ?))", (r["person_id"], r["person_id"]))
            row["portrait"] = {"photo": pf[0]["photo_id"], "box": {k: pf[0][k] for k in "xywh"}} if pf else None
            out.append(row)
        return 200, out

    # ── "this is me": a member and their 1994 self
    # ── a fresh identification run on a photo: hand marks set aside, then restorable
    def photo_target(self, data):
        photo = str(data.get("photo", ""))
        if not PHOTO_ID.match(photo):
            raise ApiError(400, "Unknown photo.")
        if query("SELECT 1 FROM identify_runs WHERE target = ? AND status IN ('queued', 'running')", ("photo:" + photo,)):
            raise ApiError(409, "This photo is being identified now. Wait for the run to finish.")
        return photo

    def post_identify_clear(self, params):
        """Set the photo's hand marks aside, forget its identification answers, and identify it afresh.
        Who is tagged in the photo stays as it is."""
        who = self.admin()
        photo = self.photo_target(self.read_json())
        marks = query("SELECT f.*, (SELECT 1 FROM people pe WHERE pe.portrait_face = f.id) AS portrait FROM photo_faces f "
                      "WHERE f.photo_id = ?", (photo,))
        for m in marks:
            execute("INSERT INTO photo_faces_cleared (photo_id, person_id, x, y, w, h, added_by, created_at, was_portrait, cleared_by, cleared_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (photo, m["person_id"], m["x"], m["y"], m["w"], m["h"], m["added_by"],
                                                               m["created_at"], 1 if m["portrait"] else 0, who["id"], now()))
            execute("UPDATE people SET portrait_face = NULL WHERE portrait_face = ?", (m["id"],))
            execute("DELETE FROM identify_refs WHERE face_id = ?", (m["id"],))
        execute("DELETE FROM photo_faces WHERE photo_id = ?", (photo,))
        execute("DELETE FROM identify_suggestions WHERE target = ?", ("photo:" + photo,))
        rid = execute("INSERT INTO identify_runs (target, requested_by, created_at) VALUES (?, ?, ?)", ("photo:" + photo, who["id"], now()))
        audit(who, "identify.clear", "photo:" + photo, plural_s(len(marks), "mark") + " set aside")
        return 200, {"cleared": len(marks), "runId": rid}

    def post_identify_restore(self, params):
        """Put the hand marks set aside back, except where that face or person is marked again since."""
        who = self.admin()
        photo = self.photo_target(self.read_json())
        restored = skipped = 0
        for c in query("SELECT * FROM photo_faces_cleared WHERE photo_id = ? ORDER BY id", (photo,)):
            box = (c["x"], c["y"], c["w"], c["h"])
            now_marks = query("SELECT person_id, x, y, w, h FROM photo_faces WHERE photo_id = ?", (photo,))
            if any(m["person_id"] == c["person_id"] or covered(box, (m["x"], m["y"], m["w"], m["h"])) > SAME_FACE for m in now_marks) \
                    or not query("SELECT 1 FROM people WHERE id = ? AND deleted_at IS NULL", (c["person_id"],)):
                skipped += 1
            else:
                fid = execute("INSERT INTO photo_faces (photo_id, person_id, x, y, w, h, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                              (photo, c["person_id"], *box, c["added_by"], c["created_at"]))
                if c["was_portrait"]:
                    execute("UPDATE people SET portrait_face = ? WHERE id = ? AND portrait_face IS NULL", (fid, c["person_id"]))
                if not query("SELECT 1 FROM photo_people WHERE photo_id = ? AND person_id = ?", (photo, c["person_id"])):
                    execute("INSERT INTO photo_people (photo_id, person_id, added_by, created_at) VALUES (?, ?, ?, ?)",
                            (photo, c["person_id"], c["added_by"], now()))
                self.settle_by_mark(who, photo, fid, c["person_id"], box)
                restored += 1
            execute("DELETE FROM photo_faces_cleared WHERE id = ?", (c["id"],))
        audit(who, "identify.restore", "photo:" + photo, f"{restored} restored, {skipped} skipped")
        return 200, {"restored": restored, "skipped": skipped}

    def put_person_detect(self, params, pid):
        """Whether identification looks for this person's face (off for someone in nearly every photo)."""
        who = self.admin()
        detect = bool(self.read_json().get("detect"))
        if not query("SELECT 1 FROM people WHERE id = ? AND deleted_at IS NULL", (int(pid),)):
            raise ApiError(404, "That person isn't on the list any more.")
        execute("UPDATE people SET no_detect = ?, updated_at = ? WHERE id = ?", (0 if detect else 1, now(), int(pid)))
        removed = 0
        if not detect:   # their unreviewed guesses go; the next runs leave their face out
            removed = len(query("SELECT id FROM identify_suggestions WHERE status = 'pending' AND (person_id = ? OR mark_person_id = ?)",
                                (int(pid), int(pid))))
            execute("DELETE FROM identify_suggestions WHERE status = 'pending' AND (person_id = ? OR mark_person_id = ?)", (int(pid), int(pid)))
        audit(who, "person.detect." + ("on" if detect else "off"), f"person:{pid}",
              query("SELECT name FROM people WHERE id = ?", (int(pid),))[0]["name"])
        return 200, {"personId": int(pid), "detect": detect, "removed": removed}

    def put_person_member(self, params, pid):
        who = self.member()
        claim = bool(self.read_json().get("claim"))
        if not query("SELECT 1 FROM people WHERE id = ? AND deleted_at IS NULL", (int(pid),)):
            raise ApiError(404, "That person isn't on the list any more.")
        if claim:
            other = query("SELECT user_id FROM profiles WHERE person_id = ? AND user_id != ?", (int(pid), who["id"]))
            if other:
                raise ApiError(409, "Another member has already said this is them. Ask the administrator if that's wrong.")
            execute("UPDATE profiles SET person_id = ? WHERE user_id = ?", (int(pid), who["id"]))
        else:
            mine = query("SELECT 1 FROM profiles WHERE user_id = ? AND person_id = ?", (who["id"], int(pid)))
            if mine:
                execute("UPDATE profiles SET person_id = NULL WHERE user_id = ?", (who["id"],))
            elif who["isAdmin"]:   # moderators can undo a wrong claim
                execute("UPDATE profiles SET person_id = NULL WHERE person_id = ?", (int(pid),))
                audit(who, "person.unclaim.other", f"person:{pid}", query("SELECT name FROM people WHERE id = ?", (int(pid),))[0]["name"])
            else:
                raise ApiError(403, "Only that member, or a moderator, can undo this.")
        return 200, {"personId": int(pid), "claimed": claim}

    # ── featured memory
    def put_memory_feature(self, params, mid):
        who = self.admin()
        on = bool(self.read_json().get("on"))
        if not query("SELECT 1 FROM memories WHERE id = ? AND deleted_at IS NULL", (int(mid),)):
            raise ApiError(404, "That memory was removed.")
        if on:
            execute("UPDATE memories SET featured_at = ?, featured_by = ? WHERE id = ?", (now(), who["id"], int(mid)))
        else:
            execute("UPDATE memories SET featured_at = NULL, featured_by = NULL WHERE id = ?", (int(mid),))
        audit(who, "memory.feature." + ("on" if on else "off"), f"memory:{mid}", query("SELECT title FROM memories WHERE id = ?", (int(mid),))[0]["title"])
        return 200, {"id": int(mid), "featured": on}

    # ── memories: articles and PDF notes
    @staticmethod
    def memory_links(data):
        links = data.get("links", [])
        if not isinstance(links, list) or len(links) > 60:
            raise ApiError(400, "Tag at most 60 recordings and photos.")
        out, seen = [], set()
        for l in links:
            target = str((l or {}).get("target", "")) if isinstance(l, dict) else ""
            if not LINK_TARGET.match(target):
                raise ApiError(400, "One of the tagged recordings or photos isn't valid. Reload the page and try again.")
            if target in seen:
                continue
            seen.add(target)
            pos = l.get("position")
            pos = int(pos) if isinstance(pos, (int, float)) and target.startswith("video:") and 0 <= pos < 86400 else None
            out.append((target, pos))
        return out

    @staticmethod
    def memory_people_ids(data):
        ids = data.get("people", [])
        if not isinstance(ids, list) or len(ids) > 60:
            raise ApiError(400, "Tag at most 60 people in one memory.")
        out = []
        for i in ids:
            if not isinstance(i, int) or i in out:
                raise ApiError(400, "That list of people isn't valid. Reload the page and try again.")
            if not query("SELECT 1 FROM people WHERE id = ? AND deleted_at IS NULL", (i,)):
                raise ApiError(400, "Someone you tagged was removed from the People list. Reload the page and try again.")
            out.append(i)
        return out

    @staticmethod
    def set_memory_people(mid, ids):
        execute("DELETE FROM memory_people WHERE memory_id = ?", (mid,))
        for i, pid in enumerate(ids):
            execute("INSERT INTO memory_people (memory_id, person_id, ord) VALUES (?, ?, ?)", (mid, pid, i))

    @staticmethod
    def people_for(ids):
        out = {}
        if ids:
            for r in query("SELECT mp.memory_id, pe.id, pe.name FROM memory_people mp JOIN people pe ON pe.id = mp.person_id "
                           "AND pe.deleted_at IS NULL WHERE mp.memory_id IN (%s) ORDER BY mp.memory_id, mp.ord" % ",".join("?" * len(ids)), ids):
                out.setdefault(r["memory_id"], []).append({"id": r["id"], "name": r["name"]})
        return out

    @staticmethod
    def memory_text(data, kind):
        title = clean(data.get("title"), 140)
        if len(title) < 2:
            raise ApiError(400, "Give it a title, at least 2 characters.")
        body = clean(data.get("body"), MAX_ARTICLE, multiline=True)
        if kind == "article" and len(body) < 20:
            raise ApiError(400, "Write a little more: at least a sentence or two.")
        return title, body

    def memory_row(self, who, r, links, full, people=None, rx=None):
        body = r["body"]
        return {"id": r["id"], "kind": r["kind"], "title": r["title"], "people": (people or {}).get(r["id"], []),
                "reactions": (rx or {}).get(r["id"], {"counts": {}, "mine": []}), "featured": bool(r.get("featured_at")),
                "canFeature": who["isAdmin"],
                "body": body if full else None,
                "excerpt": (body[:280].rsplit(" ", 1)[0] + "…") if len(body) > 280 else body,
                "words": len(body.split()), "pdf": f"/kodai1994/memories/{r['file']}" if r["file"] else None,
                "media": self.media_info(r.get("media_id")),
                "author": r["author"], "createdAt": r["created_at"], "updatedAt": r["updated_at"],
                "links": links.get(r["id"], []), "mine": r["user_id"] == who["id"],
                "canEdit": r["user_id"] == who["id"] or who["isAdmin"]}

    @staticmethod
    def media_info(mid, raw=None):
        """What the page needs to play a recording memory's recording."""
        if not mid:
            return None
        r = raw or (query("SELECT * FROM memory_media WHERE id = ?", (mid,)) or [None])[0]
        if not r:
            return None
        return {"id": r["id"], "kind": r["kind"], "status": r["status"], "duration": r["duration_s"],
                "src": f"/kodai1994/memories/{r['file']}" if r["status"] == "ready" and r["file"] else None,
                "poster": f"/kodai1994/memories/{r['poster']}" if r["status"] == "ready" and r["poster"] else None,
                "message": r["message"] if r["status"] == "failed" else None}

    def post_memory_media(self, params):
        who = self.member()
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if ctype not in MEDIA_TYPES:
            raise ApiError(415, "Choose a sound or video recording (for example MP3, M4A, MP4 or WebM).")
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            raise ApiError(400, "That recording is empty.")
        if length > MAX_MEDIA:
            raise ApiError(413, "That recording is too large (95 MB at most). Record a shorter one, or trim it first.")
        self.need_name(who)
        if not allow(("media", who["id"]), 20, 3600):
            raise ApiError(429, "You've added a lot of recordings. Wait a while and try again.")
        if query("SELECT COUNT(*) AS n FROM memory_media WHERE status = 'pending'")[0]["n"] >= 50:
            raise ApiError(503, "Lots of recordings are waiting to be prepared. Try again in a few minutes.")
        ext, kind, looks = MEDIA_TYPES[ctype]
        os.makedirs(REC_DIR, exist_ok=True)
        name = f"{secrets.token_hex(12)}.{ext}"
        path, left, first = os.path.join(REC_DIR, name), length, b""
        try:   # to disk as it arrives: recordings are large
            with open(path, "wb") as f:
                while left:
                    chunk = self.rfile.read(min(left, 1 << 20))
                    if not chunk:
                        raise ApiError(400, "The recording didn't arrive whole. Try again.")
                    if not first:
                        first = chunk[:16]
                        if not looks(first):
                            raise ApiError(415, "That file isn't the kind of recording it says it is.")
                    f.write(chunk); left -= len(chunk)
        except BaseException:
            os.remove(path)
            raise
        mid = execute("INSERT INTO memory_media (user_id, kind, original, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                      (who["id"], kind, name, ctype, length, now()))
        return 201, {"media": mid, "status": "pending"}

    def get_memory_media(self, params, mid):
        who = self.member()
        r = query("SELECT * FROM memory_media WHERE id = ? AND user_id = ?", (int(mid), who["id"]))
        if not r:
            raise ApiError(404, "That recording isn't yours, or was removed.")
        return 200, self.media_info(r[0]["id"], r[0])

    MEMORY_SQL = ("SELECT m.*, COALESCE(p.display_name, p.username, 'Member') AS author FROM memories m "
                  "LEFT JOIN profiles p ON p.user_id = m.user_id WHERE m.deleted_at IS NULL ")

    @staticmethod
    def links_for(ids):
        out = {}
        if ids:
            for l in query("SELECT memory_id, target, position_s FROM memory_links WHERE memory_id IN (%s) ORDER BY memory_id, ord"
                           % ",".join("?" * len(ids)), ids):
                out.setdefault(l["memory_id"], []).append({"target": l["target"], "position": l["position_s"]})
        return out

    def get_memories(self, params):
        who = self.member()
        target = urllib.parse.unquote(params.get("target", ""))
        person = params.get("person", "")
        if target:
            if not LINK_TARGET.match(target):
                raise ApiError(400, "Unknown video or photo.")
            rows = query(self.MEMORY_SQL + "AND m.id IN (SELECT memory_id FROM memory_links WHERE target = ?) ORDER BY m.created_at DESC", (target,))
        elif person:
            if not person.isdigit():
                raise ApiError(400, "Unknown person.")
            rows = query(self.MEMORY_SQL + "AND m.id IN (SELECT memory_id FROM memory_people WHERE person_id = ?) ORDER BY m.created_at DESC", (int(person),))
        else:
            rows = query(self.MEMORY_SQL + "ORDER BY m.created_at DESC")
        links = self.links_for([r["id"] for r in rows])
        people = self.people_for([r["id"] for r in rows])
        rx = reactions_for("memory", [r["id"] for r in rows], who["id"])
        counts = {r["target"]: r["n"] for r in query("SELECT target, COUNT(*) AS n FROM comments WHERE deleted_at IS NULL AND target LIKE 'memory:%' GROUP BY target")}
        out = []
        for r in rows:
            row = self.memory_row(who, r, links, False, people, rx)
            row["comments"] = counts.get(f"memory:{r['id']}", 0)
            out.append(row)
        return 200, out

    def get_memory(self, params, mid):
        who = self.member()
        rows = query(self.MEMORY_SQL + "AND m.id = ?", (int(mid),))
        if not rows:
            raise ApiError(404, "That memory was removed.")
        return 200, self.memory_row(who, rows[0], self.links_for([int(mid)]), True, self.people_for([int(mid)]),
                                    reactions_for("memory", [int(mid)], who["id"]))

    def post_memory_file(self, params):
        who = self.member()
        if (self.headers.get("Content-Type") or "").split(";")[0].strip().lower() != "application/pdf":
            raise ApiError(415, "Choose a PDF file.")
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            raise ApiError(400, "That file is empty.")
        if length > MAX_PDF:
            raise ApiError(413, "That PDF is too large (25 MB at most).")
        self.need_name(who)
        if not allow(("pdf", who["id"]), 20, 3600):
            raise ApiError(429, "You've added a lot of files. Wait a while and try again.")
        data = self.rfile.read(length)
        if not data.startswith(b"%PDF-"):
            raise ApiError(415, "That file isn't a PDF.")
        name = f"{secrets.token_hex(16)}.pdf"
        os.makedirs(MEMORY_DIR, exist_ok=True)
        with open(os.path.join(MEMORY_DIR, name), "wb") as f:
            f.write(data)
        execute("INSERT INTO memory_files (file, user_id, size, created_at) VALUES (?, ?, ?, ?)", (name, who["id"], length, now()))
        return 201, {"file": name}

    def post_memory(self, params):
        who = self.member()
        data = self.read_json(limit=256 * 1024)
        kind = str(data.get("kind", ""))
        if kind not in ("article", "notes", "recording"):
            raise ApiError(400, "Choose Article, Notes or Recording.")
        title, body = self.memory_text(data, kind)
        links = self.memory_links(data)
        people = self.memory_people_ids(data)
        file = None
        if kind == "notes":
            file = str(data.get("file", ""))
            if not query("SELECT 1 FROM memory_files WHERE file = ? AND user_id = ?", (file, who["id"])):
                raise ApiError(400, "Add the PDF first.")
            if query("SELECT 1 FROM memories WHERE file = ?", (file,)):
                raise ApiError(409, "That PDF is already shared.")
        media = None
        if kind == "recording":
            media = data.get("media")
            row = query("SELECT status FROM memory_media WHERE id = ? AND user_id = ?", (media, who["id"])) if isinstance(media, int) else []
            if not row:
                raise ApiError(400, "Record or choose the recording first.")
            if row[0]["status"] == "failed":
                raise ApiError(400, "That recording couldn't be prepared. Record it again, or choose another file.")
            if query("SELECT 1 FROM memories WHERE media_id = ? AND deleted_at IS NULL", (media,)):
                raise ApiError(409, "That recording is already shared.")
        self.need_name(who)
        if not allow(("memory", who["id"]), 20, 3600):
            raise ApiError(429, "You've shared a lot today. Wait a while and try again.")
        mid = execute("INSERT INTO memories (kind, title, body, file, media_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                      (kind, title, body, file, media, who["id"], now()))
        self.set_memory_links(mid, links)
        self.set_memory_people(mid, people)
        notify_tagged(who["id"], people, "tagged_memory", f"memory:{mid}", mid, None, title)
        return 201, {"id": mid}

    @staticmethod
    def set_memory_links(mid, links):
        execute("DELETE FROM memory_links WHERE memory_id = ?", (mid,))
        for i, (target, pos) in enumerate(links):
            execute("INSERT INTO memory_links (memory_id, target, position_s, ord) VALUES (?, ?, ?, ?)", (mid, target, pos, i))

    def own_memory(self, who, mid):
        row = query("SELECT user_id, kind FROM memories WHERE id = ? AND deleted_at IS NULL", (int(mid),))
        if not row:
            raise ApiError(404, "That memory was removed.")
        if row[0]["user_id"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "Only the person who shared this, or the administrator, can change it.")
        return row[0]

    def put_memory(self, params, mid):
        who = self.member()
        data = self.read_json(limit=256 * 1024)
        row = self.own_memory(who, mid)
        if "title" in data or "body" in data:
            current = query("SELECT title, body FROM memories WHERE id = ?", (int(mid),))[0]
            title, body = self.memory_text({"title": data.get("title", current["title"]), "body": data.get("body", current["body"])}, row["kind"])
            execute("UPDATE memories SET title = ?, body = ?, updated_at = ? WHERE id = ?", (title, body, now(), int(mid)))
        if "links" in data:
            self.set_memory_links(int(mid), self.memory_links(data))
            execute("UPDATE memories SET updated_at = ? WHERE id = ?", (now(), int(mid)))
        if "people" in data:
            ids = self.memory_people_ids(data)
            self.set_memory_people(int(mid), ids)
            notify_tagged(who["id"], ids, "tagged_memory", f"memory:{mid}", int(mid), None,
                          query("SELECT title FROM memories WHERE id = ?", (int(mid),))[0]["title"])
            execute("UPDATE memories SET updated_at = ? WHERE id = ?", (now(), int(mid)))
        return 200, {"id": int(mid)}

    def delete_memory(self, params, mid):
        who = self.member()
        self.own_memory(who, mid)
        # Soft delete: the PDF stays on disk (and in the backup), off the page.
        m = query("SELECT title, user_id FROM memories WHERE id = ?", (int(mid),))[0]
        execute("UPDATE memories SET deleted_at = ? WHERE id = ?", (now(), int(mid)))
        audit(who, "memory.delete" + ("" if m["user_id"] == who["id"] else ".other"), f"memory:{mid}", m["title"])
        return 200, {"deleted": int(mid)}

    # ── photos uploaded by members
    def post_photo_upload(self, params):
        who = self.member()
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if ctype not in IMAGE_TYPES:
            raise ApiError(415, "Choose a photo: JPEG, PNG or WebP.")
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            raise ApiError(400, "That file is empty.")
        if length > MAX_UPLOAD:
            raise ApiError(413, "That photo is too large (15 MB at most).")
        self.need_name(who)
        if not allow(("upload", who["id"]), 60, 3600):
            raise ApiError(429, "You've added a lot of photos. Wait a while and try again.")
        if query("SELECT COUNT(*) AS n FROM photo_uploads WHERE status = 'pending'")[0]["n"] >= 200:
            raise ApiError(503, "Lots of photos are waiting to be added. Try again in a few minutes.")
        data = self.rfile.read(length)
        ext, magics = IMAGE_TYPES[ctype]
        if not data.startswith(magics) or (ext == "webp" and data[8:12] != b"WEBP"):
            raise ApiError(415, "That file isn't a JPEG, PNG or WebP photo.")
        digest = hashlib.sha256(data).hexdigest()
        dup = query("SELECT photo_id FROM photo_uploads WHERE sha256 = ? AND status IN ('pending', 'ready')", (digest,))
        if dup:
            raise ApiError(409, "This photo has already been added.")
        name = f"{secrets.token_hex(12)}.{ext}"
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(os.path.join(UPLOAD_DIR, name), "wb") as f:
            f.write(data)
        uid = execute("INSERT INTO photo_uploads (user_id, file, sha256, created_at) VALUES (?, ?, ?, ?)", (who["id"], name, digest, now()))
        return 201, {"id": uid, "status": "pending"}

    def get_photo_uploads(self, params):
        who = self.member()
        rows = query("SELECT u.id, u.user_id, u.status, u.photo_id, u.message, u.created_at, "
                     "COALESCE(p.display_name, p.username, 'Member') AS uploader FROM photo_uploads u "
                     "LEFT JOIN profiles p ON p.user_id = u.user_id WHERE u.status IN ('pending', 'ready', 'failed') "
                     "AND (u.status != 'failed' OR u.user_id = ?) ORDER BY u.id", (who["id"],))
        return 200, [{"id": r["id"], "status": r["status"], "photoId": r["photo_id"], "message": r["message"],
                      "uploadedBy": r["uploader"], "createdAt": r["created_at"], "mine": r["user_id"] == who["id"],
                      "canRemove": r["user_id"] == who["id"] or who["isAdmin"]} for r in rows]

    def delete_photo_upload(self, params, uid):
        who = self.member()
        row = query("SELECT user_id, status, photo_id FROM photo_uploads WHERE id = ?", (int(uid),))
        if not row or row[0]["status"] in ("remove", "removed"):
            raise ApiError(404, "That photo was already removed.")
        if row[0]["user_id"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "Only the person who added this photo, or the administrator, can remove it.")
        # The worker takes it off the page and deletes its web copies; the original stays on disk.
        status = "remove" if row[0]["status"] == "ready" else "removed"
        execute("UPDATE photo_uploads SET status = ?, removed_at = ?, removed_by = ? WHERE id = ?", (status, now(), who["id"], int(uid)))
        audit(who, "photo.remove" + ("" if row[0]["user_id"] == who["id"] else ".other"),
              f"photo:{row[0]['photo_id']}" if row[0]["photo_id"] else f"upload:{uid}")
        if row[0]["photo_id"]:
            pid = row[0]["photo_id"]
            execute("UPDATE people SET portrait_face = NULL WHERE portrait_face IN (SELECT id FROM photo_faces WHERE photo_id = ?)", (pid,))
            execute("DELETE FROM photo_faces WHERE photo_id = ?", (pid,))
            execute("DELETE FROM photo_people WHERE photo_id = ?", (pid,))
            execute("DELETE FROM identify_suggestions WHERE target = ? AND status = 'pending'", ("photo:" + pid,))
        return 200, {"removed": int(uid)}

    # ── face identification: queue runs, review what the worker suggests
    EVENT_MERGE_S = 3    # people confirmed within this many seconds share one event
    DUPLICATE_S = 10     # already tagged this close to the moment: don't tag again

    @staticmethod
    def run_row(r, counts=None):
        return {"id": r["id"], "target": r["target"], "status": r["status"], "progress": r["progress"],
                "message": r["message"], "refs": r["refs"], "people": r["people"], "createdAt": r["created_at"],
                "finishedAt": r["finished_at"], "requestedBy": r.get("requester"),
                "counts": counts or {"pending": 0, "confirmed": 0, "rejected": 0}}

    RUNS_SQL = ("SELECT r.*, COALESCE(p.display_name, p.username, 'Member') AS requester FROM identify_runs r "
                "LEFT JOIN profiles p ON p.user_id = r.requested_by ")

    @staticmethod
    def review_counts(target=None):
        out = {}
        sql = "SELECT target, status, COUNT(*) AS n FROM identify_suggestions "
        for r in query(sql + ("WHERE target = ? " if target else "") + "GROUP BY target, status", (target,) if target else ()):
            out.setdefault(r["target"], {"pending": 0, "confirmed": 0, "rejected": 0})[r["status"]] = r["n"]
        return out

    @staticmethod
    def queue_place(row):
        queue = [r["id"] for r in query("SELECT id FROM identify_runs WHERE status IN ('queued', 'running') ORDER BY id")]
        if row and row["id"] in queue:
            row["place"] = queue.index(row["id"])  # 0 = running now
        return row

    def get_identify_runs(self, params):
        self.member()
        counts = self.review_counts()
        rows = query(self.RUNS_SQL + "WHERE r.id IN (SELECT MAX(id) FROM identify_runs GROUP BY target)")
        return 200, [self.queue_place(self.run_row(r, counts.get(r["target"]))) for r in rows]

    def post_identify_run(self, params):
        who = self.member()
        target = str(self.read_json().get("target", ""))
        if not TARGET.match(target):
            raise ApiError(400, "Choose a video or photo.")
        if query("SELECT 1 FROM identify_runs WHERE target = ? AND status IN ('queued', 'running')", (target,)):
            raise ApiError(409, "This one is already being identified. Its results will appear here.")
        if not allow(("identify", who["id"]), 10, 3600):
            raise ApiError(429, "You've started a lot of runs. Wait a while and try again.")
        rid = execute("INSERT INTO identify_runs (target, requested_by, created_at) VALUES (?, ?, ?)", (target, who["id"], now()))
        row = self.run_row(query(self.RUNS_SQL + "WHERE r.id = ?", (rid,))[0], self.review_counts(target).get(target))
        return 201, self.queue_place(row)

    def cancel_identify_run(self, params, rid):
        who = self.member()
        row = query("SELECT requested_by, status FROM identify_runs WHERE id = ?", (int(rid),))
        if not row or row[0]["status"] not in ("queued", "running"):
            raise ApiError(404, "That run already finished.")
        if row[0]["requested_by"] != who["id"] and not who["isAdmin"]:
            raise ApiError(403, "Only the person who started this run, or the administrator, can cancel it.")
        execute("UPDATE identify_runs SET status = 'cancelled', finished_at = ? WHERE id = ?", (now(), int(rid)))
        if row[0]["requested_by"] != who["id"]:
            audit(who, "identify.cancel.other", f"run:{rid}")
        return 200, {"cancelled": int(rid)}

    @staticmethod
    def suggestion_row(who, r):
        return {"id": r["id"], "runId": r["run_id"], "start": r["start_s"], "end": r["end_s"], "frame": r["frame_s"],
                "box": {"x": r["x"], "y": r["y"], "w": r["w"], "h": r["h"]}, "personId": r["person_id"], "score": r["score"],
                "alternatives": json.loads(r["alternatives"] or "[]"), "cluster": r["cluster"], "facePx": r["face_px"],
                "crop": "/kodai1994/faces/" + r["crop"], "status": r["status"], "finalPersonId": r["final_person_id"],
                "reviewedBy": r["reviewer"], "reviewedAt": r["reviewed_at"], "markerId": r["marker_id"],
                "kind": r["kind"], "markPersonId": r["mark_person_id"],
                "byHand": r["kind"] == "face" and r["mark_id"] is not None,   # settled by a face marked by hand
                "canUndo": r["status"] != "pending" and not (r["kind"] == "face" and r["mark_id"] is not None)
                           and (r["reviewed_by"] == who["id"] or who["isAdmin"])}

    def get_identify_suggestions(self, params):
        who = self.member()
        target = urllib.parse.unquote(params.get("target", ""))
        if not TARGET.match(target):
            raise ApiError(400, "Choose a video or photo.")
        run = query(self.RUNS_SQL + "WHERE r.target = ? ORDER BY r.id DESC LIMIT 1", (target,))
        rows = query("SELECT s.*, COALESCE(p.display_name, p.username) AS reviewer FROM identify_suggestions s "
                     "LEFT JOIN profiles p ON p.user_id = s.reviewed_by WHERE s.target = ? "
                     "ORDER BY s.person_id IS NULL, s.score DESC, s.cluster, s.face_px DESC", (target,))
        out = self.queue_place(self.run_row(run[0], self.review_counts(target).get(target))) if run else None
        cleared = None
        if target.startswith("photo:"):
            c = query("SELECT COUNT(*) AS n, MAX(c.cleared_at) AS at, COALESCE(p.display_name, p.username, 'A moderator') AS by "
                      "FROM photo_faces_cleared c LEFT JOIN profiles p ON p.user_id = c.cleared_by WHERE c.photo_id = ?", (target[len("photo:"):],))[0]
            cleared = {"count": c["n"], "at": c["at"], "by": c["by"]} if c["n"] else None
        return 200, {"run": out, "suggestions": [self.suggestion_row(who, r) for r in rows],
                     "cleared": cleared, "canClear": who["isAdmin"]}

    def marker_people_rows(self, mid):
        return query("SELECT pe.id, pe.name FROM marker_people mp JOIN people pe ON pe.id = mp.person_id "
                     "WHERE mp.marker_id = ? ORDER BY mp.ord", (mid,))

    def confirm_video(self, who, s, person):
        """The event this moment goes into, and whether the person was added to it."""
        start = int(s["start_s"] or 0)
        near = query("SELECT m.id FROM markers m JOIN marker_people mp ON mp.marker_id = m.id "
                     "WHERE m.target = ? AND m.kind = 'event' AND m.deleted_at IS NULL AND mp.person_id = ? "
                     "AND ABS(m.position_s - ?) <= ?", (s["target"], person, start, self.DUPLICATE_S))
        if near:  # already tagged at this moment
            return near[0]["id"], 0
        # Join an event made from identification at (almost) the same moment, so people seen
        # together end up in one event, as members tag them by hand. Events members added
        # themselves are left as they are.
        joinable = query("SELECT m.id FROM markers m WHERE m.target = ? AND m.kind = 'event' AND m.deleted_at IS NULL "
                         "AND ABS(m.position_s - ?) <= ? AND m.id IN (SELECT marker_id FROM identify_suggestions "
                         "WHERE marker_added = 1) AND (SELECT COUNT(*) FROM marker_people WHERE marker_id = m.id) < 20 "
                         "ORDER BY ABS(m.position_s - ?) LIMIT 1", (s["target"], start, self.EVENT_MERGE_S, start))
        if joinable:
            mid = joinable[0]["id"]
        else:
            mid = execute("INSERT INTO markers (target, user_id, kind, title, position_s, created_at) VALUES (?, ?, 'event', '', ?, ?)",
                          (s["target"], who["id"], start, now()))
        rows = self.marker_people_rows(mid) + query("SELECT id, name FROM people WHERE id = ?", (person,))
        self.link_people(mid, rows)
        execute("UPDATE markers SET title = ?, updated_at = ? WHERE id = ?", (self.event_title(rows), now(), mid))
        notify_tagged(who["id"], [person], "tagged_event", s["target"], mid, start)
        return mid, 1

    def undo_video(self, s):
        mid = s["marker_id"]
        if not mid or not s["marker_added"]:
            return
        rows = [r for r in self.marker_people_rows(mid) if r["id"] != s["final_person_id"]]
        self.link_people(mid, rows)
        if rows:
            execute("UPDATE markers SET title = ?, updated_at = ? WHERE id = ?", (self.event_title(rows), now(), mid))
        else:
            execute("UPDATE markers SET deleted_at = ? WHERE id = ?", (now(), mid))

    @staticmethod
    def confirm_photo(who, s, person):
        """Mark the face and tag the photo, unless that's already done; returns what was created."""
        photo = s["target"][len("photo:"):]
        box = (s["x"], s["y"], s["w"], s["h"])
        for m in query("SELECT f.person_id, f.x, f.y, f.w, f.h, pe.name FROM photo_faces f JOIN people pe ON pe.id = f.person_id "
                       "WHERE f.photo_id = ?", (photo,)):
            same = covered(box, (m["x"], m["y"], m["w"], m["h"])) > SAME_FACE
            if same and m["person_id"] != person:
                raise ApiError(409, f"This face is already marked as {m['name']}. Remove that mark on the photo first if it's wrong.")
            if not same and m["person_id"] == person:
                raise ApiError(409, f"{m['name']} is already marked on another face in this photo. Choose someone else, "
                                    "or remove that mark on the photo first.")
        face_id = tag_id = None
        if not query("SELECT 1 FROM photo_faces WHERE photo_id = ? AND person_id = ?", (photo, person)):
            face_id = execute("INSERT INTO photo_faces (photo_id, person_id, x, y, w, h, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                              (photo, person, s["x"], s["y"], s["w"], s["h"], who["id"], now()))
        if not query("SELECT 1 FROM photo_people WHERE photo_id = ? AND person_id = ?", (photo, person)):
            tag_id = execute("INSERT INTO photo_people (photo_id, person_id, added_by, created_at) VALUES (?, ?, ?, ?)",
                             (photo, person, who["id"], now()))
        notify_tagged(who["id"], [person], "tagged_photo", s["target"])
        return face_id, tag_id

    @staticmethod
    def recheck_photo(who, s, person):
        """A hand mark that looked like someone else: move it to the person chosen."""
        photo, old = s["target"][len("photo:"):], s["mark_person_id"]
        mark = query("SELECT id, person_id FROM photo_faces WHERE id = ?", (s["mark_id"],))
        if not mark or mark[0]["person_id"] != old:
            raise ApiError(409, "That face mark changed since. Reload the page.")
        if person == old:
            return None
        if query("SELECT 1 FROM photo_faces WHERE photo_id = ? AND person_id = ?", (photo, person)):
            name = query("SELECT name FROM people WHERE id = ?", (person,))[0]["name"]
            raise ApiError(409, f"{name} is already marked on another face in this photo. Remove that mark on the photo first.")
        execute("UPDATE photo_faces SET person_id = ?, added_by = ?, created_at = ? WHERE id = ?", (person, who["id"], now(), s["mark_id"]))
        execute("UPDATE people SET portrait_face = NULL WHERE portrait_face = ?", (s["mark_id"],))
        execute("DELETE FROM photo_people WHERE photo_id = ? AND person_id = ?", (photo, old))
        tag_id = None
        if not query("SELECT 1 FROM photo_people WHERE photo_id = ? AND person_id = ?", (photo, person)):
            tag_id = execute("INSERT INTO photo_people (photo_id, person_id, added_by, created_at) VALUES (?, ?, ?, ?)",
                             (photo, person, who["id"], now()))
        notify_tagged(who["id"], [person], "tagged_photo", s["target"])
        return tag_id

    @staticmethod
    def undo_recheck(s):
        if s["final_person_id"] in (None, s["mark_person_id"]):
            return
        photo = s["target"][len("photo:"):]
        if query("SELECT 1 FROM photo_faces WHERE photo_id = ? AND person_id = ?", (photo, s["mark_person_id"])):
            raise ApiError(409, "The first name is now marked on another face in this photo, so this can't be undone here.")
        execute("UPDATE photo_faces SET person_id = ? WHERE id = ? AND person_id = ?", (s["mark_person_id"], s["mark_id"], s["final_person_id"]))
        if s["tag_id"]:
            execute("DELETE FROM photo_people WHERE id = ?", (s["tag_id"],))
        if not query("SELECT 1 FROM photo_people WHERE photo_id = ? AND person_id = ?", (photo, s["mark_person_id"])):
            execute("INSERT INTO photo_people (photo_id, person_id, added_by, created_at) VALUES (?, ?, ?, ?)",
                    (photo, s["mark_person_id"], s["reviewed_by"], now()))

    @staticmethod
    def undo_photo(s):
        if s["face_id"]:
            execute("DELETE FROM photo_faces WHERE id = ?", (s["face_id"],))
            execute("UPDATE people SET portrait_face = NULL WHERE portrait_face = ?", (s["face_id"],))
        if s["tag_id"]:
            execute("DELETE FROM photo_people WHERE id = ?", (s["tag_id"],))

    def review_suggestion(self, params, sid):
        who = self.member()
        data = self.read_json()
        action = str(data.get("action", ""))
        if action not in ("confirm", "reject", "undo"):
            raise ApiError(400, "Choose Confirm, Not them, or Undo.")
        if not allow(("review", who["id"]), 120, 60):
            raise ApiError(429, "You're reviewing quickly. Wait a minute and try again.")
        rows = query("SELECT * FROM identify_suggestions WHERE id = ?", (int(sid),))
        if not rows:
            raise ApiError(404, "That suggestion was replaced by a newer run. Reload the page.")
        s = rows[0]
        is_video = s["target"].startswith("video:")
        if action == "undo":
            if s["status"] == "pending":
                return 200, {"id": s["id"], "status": "pending"}
            if s["reviewed_by"] != who["id"] and not who["isAdmin"]:
                raise ApiError(403, "Only the person who reviewed this, or the administrator, can undo it.")
            if s["kind"] == "face" and s["mark_id"] is not None:
                raise ApiError(409, "This was answered by a face marked by hand. Change it on the photo.")
            if s["status"] == "confirmed":
                if s["kind"] == "check":
                    self.undo_recheck(s)
                else:
                    self.undo_video(s) if is_video else self.undo_photo(s)
            execute("UPDATE identify_suggestions SET status = 'pending', final_person_id = NULL, reviewed_by = NULL, reviewed_at = NULL, "
                    "marker_id = NULL, marker_added = 0, face_id = NULL, tag_id = NULL WHERE id = ?", (s["id"],))
            return 200, {"id": s["id"], "status": "pending"}
        if s["status"] != "pending":
            raise ApiError(409, "Someone already reviewed this one. Reload the page to see their answer.")
        if action == "reject":
            execute("UPDATE identify_suggestions SET status = 'rejected', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
                    (who["id"], now(), s["id"]))
            return 200, {"id": s["id"], "status": "rejected"}
        person = data.get("person", s["person_id"])
        if not isinstance(person, int) or not query("SELECT 1 FROM people WHERE id = ? AND deleted_at IS NULL", (person,)):
            raise ApiError(400, "Choose who this is from the People list.")
        if s["kind"] == "check":
            tag_id = self.recheck_photo(who, s, person)
            execute("UPDATE identify_suggestions SET status = 'confirmed', final_person_id = ?, reviewed_by = ?, reviewed_at = ?, "
                    "tag_id = ? WHERE id = ?", (person, who["id"], now(), tag_id, s["id"]))
        elif is_video:
            self.need_name(who)
            mid, added = self.confirm_video(who, s, person)
            execute("UPDATE identify_suggestions SET status = 'confirmed', final_person_id = ?, reviewed_by = ?, reviewed_at = ?, "
                    "marker_id = ?, marker_added = ? WHERE id = ?", (person, who["id"], now(), mid, added, s["id"]))
        else:
            face_id, tag_id = self.confirm_photo(who, s, person)
            execute("UPDATE identify_suggestions SET status = 'confirmed', final_person_id = ?, reviewed_by = ?, reviewed_at = ?, "
                    "face_id = ?, tag_id = ? WHERE id = ?", (person, who["id"], now(), face_id, tag_id, s["id"]))
        return 200, {"id": s["id"], "status": "confirmed"}

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
        rid = execute("INSERT INTO access_requests (name, email, message, ip, created_at) VALUES (?, ?, ?, ?, ?)",
                (name, email, message, ip, now()))
        send_mail_later(ADMIN_EMAIL, f"Kodai 1994: {name} is asking for access",
                        f"{name} <{email}> asked for access to the Kodai 1994 recordings.\n\n"
                        + (f"Their message:\n{message}\n\n" if message else "")
                        + f"Approve or reject it here (sign in as the administrator):\n{SITE_URL}#requests\n\n"
                        "Approving creates their account and emails them their sign-in details.\n",
                        then=lambda ok: execute("UPDATE access_requests SET notice_emailed = ? WHERE id = ?", (int(ok), rid)))
        return 202, {"ok": True}

    def get_requests(self, params):
        self.admin()
        return 200, query("SELECT id, name, email, message, created_at AS createdAt FROM access_requests "
                          "WHERE status = 'pending' ORDER BY created_at")

    def approve_request(self, params, rid):
        who = self.admin()
        # Creating the account needs Jellyfin admin rights: an administrator's own token, or
        # for a moderator the service's API key (JELLYFIN_API_KEY). Either way the account is
        # created as an ordinary member of the Kodai library only (policy below).
        token = self.headers.get("X-Kodai-Token", "") if who["isServerAdmin"] else JELLYFIN_API_KEY
        if not token:
            raise ApiError(503, "Moderators can't approve requests yet: the administrator needs to finish setting it up.")
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
        execute("UPDATE access_requests SET credentials_emailed = ? WHERE id = ?", (int(emailed), int(rid)))
        audit(who, "request.approve", f"request:{rid}", f"{req['name']} <{req['email']}>" + ("" if emailed else " (not emailed)"))
        return 200, {"name": req["name"], "username": req["email"], "password": password, "link": SITE_URL, "emailed": emailed}

    def reject_request(self, params, rid):
        who = self.admin()
        req = query("SELECT name, email FROM access_requests WHERE id = ? AND status = 'pending'", (int(rid),))
        if not req:
            raise ApiError(404, "That request was already handled.")
        execute("UPDATE access_requests SET status = 'rejected', decided_at = ?, decided_by = ? WHERE id = ?",
                (now(), who["username"], int(rid)))
        audit(who, "request.reject", f"request:{rid}", f"{req[0]['name']} <{req[0]['email']}>")
        return 200, {"rejected": int(rid)}

    @staticmethod
    def member_name(uid):
        r = query("SELECT COALESCE(display_name, username) AS n FROM profiles WHERE user_id = ?", (uid,))
        return r[0]["n"] if r else uid

    # ── audit log (moderators and the administrator)
    def get_audit(self, params):
        self.admin()
        try:
            before = int(params.get("before", 0)) or 2 ** 62
            limit = max(1, min(200, int(params.get("limit", 50))))
        except ValueError:
            raise ApiError(400, "That page of the log isn't valid.")
        rows = query("SELECT id, at, actor, action, target, detail FROM audit_log WHERE id < ? ORDER BY id DESC LIMIT ?", (before, limit))
        return 200, {"items": rows, "more": len(rows) == limit}

    # ── how the stack is doing (monitor.py writes this file every 5 minutes)
    def get_status(self, params):
        self.admin()
        try:
            with open(os.path.join(os.path.dirname(DB_PATH), ".monitor-state.json")) as f:
                state = json.load(f)
        except (OSError, ValueError):
            return 200, {"at": None, "checks": []}
        return 200, {"at": state.get("at"), "checks": [{"label": c.get("label", k), "ok": c.get("ok", True), "detail": c.get("detail", ""),
                                                        "since": c.get("since") if not c.get("ok", True) else None}
                                                       for k, c in state.get("checks", {}).items()]}

    # ── moderators (administrator only)
    def get_moderators(self, params):
        self.server_admin()
        return 200, query("SELECT m.user_id AS id, COALESCE(p.display_name, p.username) AS name, p.username, m.created_at AS since "
                          "FROM moderators m LEFT JOIN profiles p ON p.user_id = m.user_id ORDER BY name")

    def put_moderator(self, params, uid):
        who = self.server_admin()
        if not query("SELECT 1 FROM profiles WHERE user_id = ?", (uid,)):
            raise ApiError(404, "That member hasn't signed in yet.")
        execute("INSERT OR IGNORE INTO moderators (user_id, added_by, created_at) VALUES (?, ?, ?)", (uid, who["id"], now()))
        audit(who, "moderator.add", f"user:{uid}", self.member_name(uid))
        with identity_lock:
            identity_cache.clear()   # takes effect at their next request
        return 200, {"moderator": uid}

    def delete_moderator(self, params, uid):
        who = self.server_admin()
        execute("DELETE FROM moderators WHERE user_id = ?", (uid,))
        audit(who, "moderator.remove", f"user:{uid}", self.member_name(uid))
        with identity_lock:
            identity_cache.clear()
        return 200, {"removed": uid}


ROUTES = {
    "GET": [(r"/session", Handler.get_session), (r"/me", Handler.get_me), (r"/comments", Handler.get_comments), (r"/counts", Handler.get_counts),
            (r"/markers", Handler.get_markers), (r"/marker-counts", Handler.get_marker_counts),
            (r"/clips", Handler.get_clips), (r"/clips/(\d+)", Handler.get_clip),
            (r"/captions", Handler.get_captions), (r"/captions\.vtt", Handler.get_captions_vtt), (r"/captions/status", Handler.get_captions_status),
            (r"/people", Handler.get_people), (r"/people/(\d+)", Handler.get_person), (r"/photo-tags", Handler.get_photo_tags),
            (r"/photo-faces", Handler.get_photo_faces),
            (r"/identify/runs", Handler.get_identify_runs), (r"/identify/suggestions", Handler.get_identify_suggestions),
            (r"/photo-uploads", Handler.get_photo_uploads),
            (r"/memories", Handler.get_memories), (r"/memories/(\d+)", Handler.get_memory),
            (r"/memory-media/(\d+)", Handler.get_memory_media),
            (r"/activity", Handler.get_activity), (r"/members", Handler.get_members),
            (r"/notifications", Handler.get_notifications), (r"/search", Handler.get_search),
            (r"/identify/challenge", Handler.get_challenge), (r"/sound-sections", Handler.get_sound_sections),
            (r"/admin/requests", Handler.get_requests), (r"/admin/moderators", Handler.get_moderators),
            (r"/admin/audit", Handler.get_audit), (r"/admin/status", Handler.get_status), (r"/health", Handler.get_health)],
    "PUT": [(r"/me", Handler.put_me), (r"/clips/(\d+)", Handler.put_clip),
            (r"/captions/lines/(\d+)", Handler.put_caption_line), (r"/descriptions", Handler.put_description), (r"/people/(\d+)/member", Handler.put_person_member), (r"/people/(\d+)/detect", Handler.put_person_detect),
            (r"/memories/(\d+)/feature", Handler.put_memory_feature), (r"/admin/moderators/([0-9a-f]{32})", Handler.put_moderator), (r"/memories/(\d+)", Handler.put_memory), (r"/markers/(\d+)", Handler.put_marker), (r"/people/(\d+)", Handler.put_person),
            (r"/people/(\d+)/portrait", Handler.put_portrait)],
    "POST": [(r"/session", Handler.post_session), (r"/session/upgrade", Handler.post_session_upgrade),
             (r"/comments", Handler.post_comment), (r"/clips", Handler.post_clip), (r"/captions/runs", Handler.post_caption_run), (r"/markers", Handler.post_marker), (r"/people", Handler.post_person),
             (r"/photo-tags", Handler.post_photo_tag), (r"/photo-faces", Handler.post_photo_face),
             (r"/identify/runs", Handler.post_identify_run), (r"/identify/suggestions/(\d+)", Handler.review_suggestion),
             (r"/sound-sections", Handler.post_sound_section),
             (r"/identify/clear", Handler.post_identify_clear), (r"/identify/restore", Handler.post_identify_restore),
             (r"/photo-uploads", Handler.post_photo_upload),
             (r"/memories", Handler.post_memory), (r"/memory-files", Handler.post_memory_file),
             (r"/memory-media", Handler.post_memory_media),
             (r"/activity/seen", Handler.post_activity_seen),
             (r"/notifications/read", Handler.read_notifications), (r"/reactions", Handler.post_reaction),
             (r"/access-requests", Handler.post_access_request),
             (r"/admin/requests/(\d+)/approve", Handler.approve_request),
             (r"/admin/requests/(\d+)/reject", Handler.reject_request)],
    "DELETE": [(r"/session", Handler.delete_session), (r"/admin/moderators/([0-9a-f]{32})", Handler.delete_moderator),
               (r"/comments/(\d+)", Handler.delete_comment), (r"/clips/(\d+)", Handler.delete_clip),
               (r"/captions/runs/(\d+)", Handler.cancel_caption_run), (r"/markers/(\d+)", Handler.delete_marker),
               (r"/sound-sections/(\d+)", Handler.delete_sound_section),
               (r"/people/(\d+)", Handler.delete_person), (r"/photo-tags/(\d+)", Handler.delete_photo_tag),
               (r"/photo-faces/(\d+)", Handler.delete_photo_face), (r"/identify/runs/(\d+)", Handler.cancel_identify_run),
               (r"/photo-uploads/(\d+)", Handler.delete_photo_upload), (r"/memories/(\d+)", Handler.delete_memory)],
}

if __name__ == "__main__":
    ThreadingHTTPServer.daemon_threads = True
    log("community service started")
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", 8000))), Handler).serve_forever()

# Private Video Library: videos.yajur.ai

Videos and photos stay on this machine. [Jellyfin](https://jellyfin.org) holds the member
accounts and the library; a small gateway (Caddy) serves the collection page and its
media to signed-in members only; a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
publishes it all at `https://videos.yajur.ai` without opening any router ports.

| URL | What it is | Source |
|---|---|---|
| `https://videos.yajur.ai/kodai1994/` | The **Kodai 1994** collection: Timeline, Gallery and Photos views, resume, comments, account | `kodai1994/site/index.html` |
| `https://yajur.ai/videos/` | General library page on the main site (no playback through the gateway any more, see below) | `videos.html` (GitHub Pages) |
| `http://127.0.0.1:8099` | Jellyfin's own UI, for the admin, **on this machine only** | Jellyfin |

```
Browser ──https──▶ Cloudflare ──tunnel──▶ cloudflared ──▶ gateway (Caddy :80)
   /kodai1994/                 page (static)
   /kodai1994/brand/           logo + favicon (public)
   /kodai1994/hls/             HLS streams, thumbnails, photos   ── members only (cookie → Jellyfin check)
   /kodai1994/api/             comments, names, access requests  ──▶ community (Python + SQLite)
   /Users, /Items, /Sessions…  Jellyfin API (sign-in, listings, progress)   ──▶ Jellyfin :8096
   /Videos, /Audio, /web, …/Download, …/File    blocked (404)
```

## Security model

- **Accounts are Jellyfin users.** Each member sees only the libraries they were given
  (one: Kodai 1994). Five wrong passwords lock an account. Tokens are per user and device.
- **The token never reaches the page.** Signing in goes through the community service
  (`POST /kodai1994/api/session`), which signs in with Jellyfin and sets the token as the
  `kodai_auth` cookie: `HttpOnly` (script can't read it), `Path=/kodai1994/`,
  `SameSite=Strict`, `Secure`, 30 days with "Keep me signed in". The page's few Jellyfin
  calls go to `/kodai1994/jf/`, where the gateway adds the token from the cookie and allows
  only those calls (library listing, playback position, password change); anything else
  there is 404. Sessions from before this kept the token in browser storage; the page moves
  them over on the next visit (`POST /api/session/upgrade`) without signing anyone out.
- **Content Security Policy.** Pages may run script only from this site and cdnjs (Video.js
  and PDF.js, each pinned with a Subresource Integrity hash); no inline script, no `eval`.
  The sign-in page's WebGL library (`ogl`) is kept in `site/vendor/` rather than loaded from
  jsDelivr. A cross-site script injection would have no token to steal.
- **Members-only media.** For every request under
  `/kodai1994/hls/` the gateway asks Jellyfin `GET /Items/<Kodai library>` with that token
  and serves the file only on `200` (404 for users without the library, 401 for bad
  tokens). Responses are `Cache-Control: private, no-store`, so Cloudflare never caches them
  (verified: `cf-cache-status: DYNAMIC`, and a request without the cookie still gets 401
  right after a member's request).
- **No file to download.** The page plays HLS (short segments) through Video.js; there is no
  single MP4 URL. Jellyfin's own stream/download endpoints (`/Videos`, `/Audio`,
  `/Items/*/Download`, `/Items/*/File`) and its web UI are **blocked at the gateway**, in any
  case or slash variant, even with a valid token. Jellyfin 12.2 would otherwise serve
  streams and images to anyone with an item ID, and IDs derive from file paths (which this
  public repo contains). The player hides download, picture-in-picture and the context
  menu, and overlays "kodai1994" and the date as a moving watermark (videos and photos).
  It no longer shows the viewer's name, so a screen recording isn't traceable to a member.
  A determined member can still capture the segments or record the screen; there is no
  DRM. Invite people you trust.
- **Audit log.** Approvals, rejections, moderator changes, sign-ins (and wrong passwords,
  with the IP), and every removal, rename, caption correction or face-finding change is
  recorded (`audit_log`, kept a year). Moderators see it under *Account → Recent actions*.
  Server errors are logged with a short reference (`docker logs yajur-kodai-community`) that
  the member's error message shows, so a report like "ref 3fa9c1" finds the traceback.
- **Never point the tunnel, a Tailscale Funnel path, or anything public at Jellyfin's
  port.** The tunnel's service must be `http://gateway:80`. Host ports are `127.0.0.1` only.
- **Unlisted.** Nothing on yajur.ai links here; `robots.txt` disallows everything and every
  response carries `X-Robots-Tag: noindex, nofollow, noarchive`. The URL isn't secret
  (this repo is public); the login is the protection.
- `python3 -I jellyfin/check-security.py [https://videos.yajur.ai]` probes all of this.

## Members: requests, approval, comments

- **Request access.** The sign-in page has a *Request access* form (name, email, optional
  message). It's rate-limited (3 an hour per IP, 200 pending at most) and has a honeypot
  field for bots.
- **Approve.** Sign in to the page as `yajur-admin`; *Account* shows a badge with the number
  of waiting requests. *Approve* creates the Jellyfin user (username = their email, Kodai
  library only, downloads off, lockout 5), sets their comment name from the request, and
  emails them their sign-in details (if email is set up; the password is also shown once
  on screen with a *Copy message* button). *Reject* drops the request.
- **Email** (optional, `.env`): a new request emails `ADMIN_EMAIL` with a link to
  `…/kodai1994/#requests`, which opens the review panel after sign-in; approving emails the
  person. Any SMTP service works, e.g. Google Workspace (`smtp.gmail.com:587`, the
  Workspace address + an [App Password](https://myaccount.google.com/apppasswords)) or
  Resend (`smtp.resend.com:465`, user `resend`, an API key as password, after verifying
  the sending domain). Empty `SMTP_HOST` = nothing is sent.
- **Comments.** Under every video and beside every photo. A video comment can be linked to
  the moment being watched; clicking `at 1:02:10` jumps there. Members choose the name
  others see (*Account → Your name on comments*) and can delete their own comments; the
  admin can delete any. Stored in `~/services/yajur-videos/community-data/community.db`.
- **Chapters & events.** Beside each video (below it on phones), members add *chapters*
  (where a section starts) and *events* (one tagged moment) at the current time or a typed
  time. They're listed by time with who added them, filterable, shown as ticks on the seek
  bar, and the current chapter is highlighted; clicking one jumps there. People edit or
  delete their own; the admin can delete any. Stored with the comments (`markers` table).
- **People.** A *People* tab lists everyone who appears in the recordings and photos
  (`people` table; the names live only in the database, never in this public repo). Members
  add themselves (*Add me as …*) or anyone they recognise; a name can't be listed twice
  (case and spacing ignored). The admin renames or removes names; members can remove names
  they added.
- **Tagging people in events.** An *Event* has no typed title: members press **+**, type a
  name, and pick from the People list (arrow keys + Enter, or click); each pick becomes a chip
  with × to remove. Several people per event; the event's name is their names, comma-separated,
  and follows renames on the People list (`marker_people` links events to people). A name
  that isn't listed can be added to People from the same menu. Chapters keep a typed title.
  Events typed before tagging keep their text until edited; editing pre-selects any listed
  names found in it.
- **Tagging people in photos.** The photo viewer has *People in this photo* above the comments,
  with the same + / type-ahead / chip picker; each tag saves immediately (`photo_people`).
  Whoever added a tag, or the admin, can remove it.
- **Profile pages.** Each name on the People tab opens that person's page (`#person/<id>`,
  shareable): the photos they're tagged in (the viewer steps through just those) and, per
  video, only the events they're tagged in; clicking a moment plays from that time. People
  cards show "N photos, N moments".
- **1994 faces.** In the photo viewer, *Mark faces* lets members drag a box around a face and
  pick who it is (`photo_faces`: photo, person, box as fractions of the photo, who marked it).
  Marking also tags the person in the photo. The first marked face, or the one chosen with
  *Use as portrait*, is the person's 1994 portrait on their People card and profile; the
  profile's *Faces from 1994* lists every marked face. These boxes are the labelled examples
  for automatic face matching later. Whoever marked a face, or the admin, can remove it.
- **Zoom.** Photo viewer and video player: − / + / Fit, mouse wheel (Ctrl + wheel on video),
  pinch on phones, drag to move when zoomed. While marking faces, a Draw / Move switch
  chooses what dragging does; boxes drawn while zoomed land in the right place.
- **Enhanced photos.** `kodai1994/enhance-photos.sh` makes 2× copies with Real-ESRGAN
  (`~/tools/realesrgan`, general upscaling only, no face restoration) in
  `~/media/kodai1994-hls/photos-enhanced/`. The photo viewer has an *Enhanced / Original*
  switch (Enhanced by default, remembered per device; falls back to the original when a
  photo has no enhanced copy). Before/after page: `/kodai1994/enhance-compare.html`.
- **Identify faces** (`/kodai1994/identify.html`, linked from the library). Any member picks
  a recording or photo and presses *Identify faces*; the `faceid` container
  (`kodai1994/faceid/worker.py`) runs the queue one at a time, capped at 4 CPU cores. It
  finds faces (2 frames a second for video, grouped into on-screen stretches), compares
  them with every marked 1994 face plus every video face already confirmed, and lists
  suggestions grouped by person. Members confirm, reject (*Not them*), pick someone else,
  or name unrecognised faces; every decision shows who made it and can be undone by them
  or the admin. Confirming in a recording adds the person to an event at that moment
  (people confirmed within 3 s share one event); on a photo it marks the face and tags the
  photo. Nothing changes until someone confirms. Running again skips faces already
  reviewed. Models: InsightFace `buffalo_l` (`det_10g.onnx`, `w600k_r50.onnx`;
  non-commercial licence) in `FACEID_MODELS` (`~/tools/faceid/models`). Check accuracy on
  the marked faces with `docker exec yajur-kodai-faceid python3 -I /app/worker.py --eval`
  (2026-10-20: right person first 58 times out of 66, across photos).
- **Memories** (*Memories* tab; a link is `#memory/<id>`). Members *Write a memory* (a
  long-form article with light formatting: blank line = paragraph, `## ` heading, `- `
  list, `> ` quote, `**bold**`, `*italic*`; turned into elements, never raw HTML) or
  *Share notes (PDF)* (up to 25 MB, with a comment), and tag recordings (optionally at a
  moment) and photos. A memory shows its tagged recordings and photos (opening them at that
  moment); the player and photo viewer list the memories tagged to them, with *Write about
  this*. PDFs are previewed with PDF.js (pages drawn as images; scripts in the PDF never
  run) and served members-only from `~/media/kodai1994-memories/` with a `sandbox` policy.
  Others can comment on a memory; its author or the admin can edit or delete it (deleting
  hides it; the PDF stays on disk and in the backup).
- **Recorded memories.** *Record a memory* (Memories tab, or beside the player and photo
  viewer, tagged to that moment) records the member's voice or a video in the browser (up to
  10 minutes), or takes a recording from the device (MP3, M4A, MP4, MOV, WebM, Ogg, WAV; up to
  95 MB, Cloudflare's limit). It's tagged like any memory and can be commented on and reacted
  to. `kodai1994/media-queue.py` (systemd timer, every minute) makes the copy members play:
  H.264/AAC MP4 or AAC M4A, levelled, with a poster frame, in `~/media/kodai1994-memories/rec/`
  (members only). The recording as sent stays in `~/media/kodai1994-uploads/recordings/`.
- **Clips.** Beside the player, *Add → Clip* names a stretch of a recording (start, end, title,
  optionally who's in it). A clip plays from its start and pauses at its end (Replay, Keep
  watching), shows as a band on the seek bar, has a link (`#clip/<id>`, *Copy link*),
  reactions and comments, and is listed under *Videos → Clips*, on Home and on the profiles
  of the people in it. Its maker or a moderator edits or deletes it.
- **Captions and transcripts.** `kodai1994/captions/worker.py` (container `captions`, no
  network, 6 cores) writes down what is said, with Whisper large-v3-turbo on this machine:
  the audio never leaves it. A moderator presses *Transcript → Make a transcript* under a
  video (or *Transcribe every recording without one*); the queue runs one recording at a
  time, about 3–4× faster than real time. The player's CC menu then offers *Original (as
  spoken)*; the transcript under the video marks the line being said, follows along,
  searches, and jumps to a line when clicked. Whisper mishears names and singing, so lines
  it's unsure of are left out, and moderators correct or remove lines (✎; corrections
  survive a new transcript). The pilot (Oct 2026) found these tapes mostly English
  conversation and Q&A; Whisper's Telugu, and its translation into English, were unusable,
  so English captions for Telugu parts need another service (Sarvam, or Claude on the
  transcript; see `tasks/kodai1994-captions-plan.md`). Model: `worker.py --download` into
  `CAPTIONS_MODELS` (default `~/services/yajur-videos/captions-models`).
- **Descriptions.** Each recording can have a short description (under its title, on its
  card). Moderators write or edit it; `kodai1994/describe.py` suggests one from the
  transcript with Claude (`claude-opus-5-5`) once `ANTHROPIC_API_KEY` is in `.env`
  (nightly timer; the transcript is sent to Anthropic; `--dry-run` shows what would be).
- **Search** (`/`): a full-text index (SQLite FTS5) of people, memories (text and who's in
  them), comments, chapters, events, clips, photos (by who's tagged) and what was said in
  the transcripts. Every word must match as a word beginning, in any order, accents ignored
  ("prem sast" finds Premkumar Sastry); best matches first, with the matching passage.
- **Moderators.** A Jellyfin administrator can make members moderators
  (`PUT /kodai1994/api/admin/moderators/<user id>`, `DELETE` to remove; table
  `moderators`). Moderators can do everything the administrator can *on the site*: edit or
  delete anyone's comments, chapters, events, memories, faces, tags and uploads, manage the
  People list, review identification, and approve or reject access requests (the account is
  created with `JELLYFIN_API_KEY` from `.env`, always as an ordinary member). They get no
  Jellyfin admin rights: no server settings, accounts or passwords, and they can't manage
  moderators. Request notices still go to `ADMIN_EMAIL` only.
- **Passwords.** Members change theirs under *Account*. The admin can still create or reset
  accounts from a shell:

```bash
python3 -I jellyfin/add-viewer.py priya@example.com            # create (or reset password)
python3 -I jellyfin/add-viewer.py priya@example.com --disable  # cut off access
```

## How it's deployed on this machine

Everything runs from **`~/services/yajur-videos/`**, not from the git checkout, so
switching branches or deleting a worktree never affects it. `jellyfin/deploy.sh` copies
the compose file, Caddyfile, page, and service code there, installs the processing
service, and recreates the gateway and community containers. Run it after any change here.

| Path | Contents |
|---|---|
| `~/services/yajur-videos/.env` | `MEDIA_DIR`, `PUID`/`PGID`, `CLOUDFLARE_TUNNEL_TOKEN`, `KODAI_LIBRARY_ID`, email settings (mode 600) |
| `~/services/yajur-videos/admin-credentials.txt` | Jellyfin admin username + password (mode 600) |
| `~/services/yajur-videos/config/` | Jellyfin users, password hashes, library database. **Back up.** |
| `~/services/yajur-videos/community-data/` | Comments, display names, access requests (SQLite). **Back up.** |
| `~/media/kodai1994/` | Web MP4s (Jellyfin's library: metadata, durations, resume) |
| `~/media/kodai1994-hls/` | HLS streams + thumbnails per video, `ready.json`, the backdrop photo, `photos/` (members only) |
| `~/media/kodai1994-brand/` | Logo and favicon (public; kept out of the repo) |
| `~/media/kodai1994-identify/` | Face crops for the Identify page (members only) |
| `~/tools/faceid/models/` | Face detection + recognition models for the `faceid` worker |
| `~/services/yajur-videos/captions-models/` | Whisper large-v3-turbo for the `captions` worker (1.6 GB) |
| `~/media/kodai1994-memories/rec/` | Playable copies of recorded memories (members only) |

| Port (localhost only) | Service |
|---|---|
| `127.0.0.1:8099` | Jellyfin. Not 8096: a Tailscale Funnel path on this host forwards public traffic to 8096. |
| `127.0.0.1:8098` | Gateway. `http://127.0.0.1:8098/kodai1994/` previews the page locally. |

## The Kodai 1994 collection

**Processing** runs as the systemd user service `kodai1994-processing` (survives logout and
reboot; exits when everything is done), strictly **one encoder at a time** so the machine
stays responsive: package any converted video that has no HLS yet, convert the next
source video, repeat. Videos appear on the page one by one.

```bash
systemctl --user status kodai1994-processing
journalctl --user -u kodai1994-processing -f        # "converted 9/18, ready to watch 4/18"
```

- `kodai1994/transcode.sh`: VHS captures in `~/Downloads/Kodai - 1994` (left untouched) →
  H.264/AAC MP4 (`hqdn3d` denoise, CRF 23, ~1.4 Mbit/s at 640×480). Names become
  `YYYY-MM-DD - Title.mp4`; duplicates are skipped and two filename typos fixed
  ("May 3rd 1995" → 1994, per the file's own title tag; "Mahajn" → "Mahajan").
- `kodai1994/package-hls.sh`: each MP4 → HLS with two renditions, `hi` (the MP4's stream,
  copied) and `lo` (480×360, ~0.4 Mbit/s, keyframes aligned with `hi`), plus a still for the
  page and storyboard sprites (a frame every 10 s) for the seek-bar previews. The player
  (Video.js 8, from cdnjs) starts on `lo` and steps up when the connection allows; it
  offers playback speed, keyboard shortcuts, and full screen that keeps the watermark.
- `kodai1994/prepare-photos.sh`: the folder's JPEGs → `~/media/kodai1994-hls/photos/`
  (duplicates skipped, EXIF/GPS stripped, display size + thumbnail, `photos.json`). Run it
  by hand after adding photos. It also writes 320 px square crops to
  `~/media/kodai1994-brand/spiral/` for the photo spiral on the sign-in page. Those are
  **public** (the sign-in page shows them before anyone signs in); the full-size photos stay
  members-only. `PUBLIC= prepare-photos.sh` skips them. The spiral paints them as CSS
  backgrounds (no `<img>` to save) and blocks right-click, drag and long-press saving;
  a screenshot can still capture what's on screen.
- **Sign-in page backgrounds**: on desktop, `site/pattern-waves.js` (a vanilla port of React
  Bits' PatternWaves; WebGL2 via `ogl` 1.0.11, kept in `site/vendor/`) draws a mist-green "silk" dot
  surface behind the helix and form, with cursor ripples; it pauses when the sign-in screen
  is hidden. Tablets and phones skip it and show the helix behind the form instead.

## Video stabilization

`kodai1994/stabilize.sh "<web mp4>"` steadies a shaky recording for the members' stream
(ffmpeg vidstab, two passes; ~30 min per hour of video), repackages its HLS and swaps it
in. Frame times don't change, so chapters, events and faces stay aligned. The original HLS
folder is kept in `~/media/kodai1994-replaced/hls/<slug>` (undo: move it back); Jellyfin's
MP4 is untouched.

`kodai1994-stabilize.timer` runs `stabilize-queue.sh` nightly at 00:30: one recording at a
time, skipping finished ones, starting nothing new after 05:59, until all are done.
Per-video logs: `~/media/kodai1994-stabilized/log-<slug>.txt`; a failure leaves
`failed-<slug>` there (delete it to retry). Progress:
`journalctl --user -u kodai1994-stabilize.service`.

## Backup (Google Drive)

`kodai1994/backup.sh` runs nightly at about 03:00 (`kodai1994-backup.timer`, a systemd
user timer installed by `deploy.sh`) and copies to the Drive folder in `BACKUP_FOLDER_ID`
through the rclone remote `BACKUP_REMOTE`:

| From | To (in the Drive folder) |
|---|---|
| `BACKUP_SOURCE`: the original videos and photos | the folder itself, same file names |
| `~/media/kodai1994-uploads/`: photos members uploaded (originals, kept even after removal from the page) | `Uploaded photos/` |
| `~/media/kodai1994-uploads/recordings/`: recorded memories, as sent | `Recorded memories/` |
| `~/media/kodai1994-memories/`: PDF notes | `Memories/` |
| a snapshot of `community-data/community.db` (comments, people, faces, events, clips, transcripts, identify reviews) | `Site data/community-YYYY-MM-DD.db`, last 30 days |
| the stack: Jellyfin's `config/` (accounts, password hashes, library) with consistent database snapshots, `.env`, `Caddyfile`, `docker-compose.yml`, **encrypted** with `BACKUP_PASSPHRASE` (gpg, AES-256) | `Site data/stack-YYYY-MM-DD.tar.gz.gpg`, last 30 days |

It only adds: files already on Drive under the same name are left alone and nothing is
deleted there, except snapshots older than 30 days. Not backed up because they're rebuilt
from the originals: HLS streams, web MP4s, thumbnails, face crops, the playable copies of
recorded memories. **Keep `BACKUP_PASSPHRASE` somewhere other than this machine** (a password
manager): without it the stack archive can't be opened.

**Restore test.** `kodai1994/restore-test.py` (monthly, `kodai1994-restore-test.timer`)
downloads the newest database snapshot and stack archive, checks them (SQLite integrity,
tables as full as the live ones, the archive decrypts, Jellyfin's database is intact with
its accounts, `.env` is there), and checks with `rclone check` that every original,
uploaded photo, recording and PDF is on Drive at the same size. It restores nothing. A
failure alerts (see Monitoring); the last result is in `community-data/.restore-test.json`.

Run them now: `systemctl --user start kodai1994-backup.service` /
`kodai1994-restore-test.service`; logs with `journalctl --user -u …`. To restore the
database, stop the community container and copy a snapshot over `community-data/community.db`.
To restore the stack: `gpg -d stack-….tar.gz.gpg | tar -xz -C ~/services/yajur-videos`.

## Monitoring and alerts

`kodai1994/monitor.py` runs every 5 minutes (`kodai1994-monitor.timer`) and checks the
containers (compose health checks on the gateway and community service), the site on this
machine and from outside through the tunnel, that every recording's playlist lists its video,
disk space, the last backup (36 h) and restore test, failed `kodai1994-*` jobs, and recorded
memories waiting too long. A check failing twice in a row is emailed to `ADMIN_EMAIL` (the
stack's SMTP settings) and, if `NTFY_URL` is set, posted to ntfy; recovery is reported too.
Every `kodai1994-*` job also alerts the moment it fails, with its last log lines
(`OnFailure=kodai1994-alert@…`). Moderators see the latest checks under *Account → How the
site is doing*. Test the alerts: `~/services/yajur-videos/kodai1994/bin/monitor.py --test`.

## Tests and staging

- `python3 jellyfin/tests/test_community.py`: the community service over HTTP against a
  stand-in Jellyfin (`tests/stub_jellyfin.py`), with an empty database: sign-in and the
  HttpOnly cookie, permissions, the audit log, clips, search, recordings (with ffmpeg),
  the database migration. No Docker, nothing live. **`deploy.sh` runs it first and stops if
  it fails** (`SKIP_TESTS=1` to override).
- `python3 jellyfin/tests/smoke.py [BASE]`: the running site as a visitor: security headers,
  services answering, nothing members-only reachable signed out. `deploy.sh` runs it after.
- `jellyfin/tests/staging.sh up` starts a staging copy at `http://127.0.0.1:8097/kodai1994/`:
  this checkout's gateway, page and community service on a copy of the live database, the
  live streams read-only, the stand-in Jellyfin (accounts `admin`, `member@example.com`,
  password `test-password`). `CAPTIONS=1` adds the captions worker. `staging.sh down` stops it.
- `python3 jellyfin/tests/e2e.py`: the page in Chrome (Playwright) against staging: sign-in
  and security, playback, the old-session move, clips, recording a memory with a fake
  camera, captions, search, the audit panel, the other pages. Any page error or CSP
  violation fails it.

## Capacity (measured 2026-10-20)

The server side is not the limit: 100 simulated viewers streaming at 3× real time through
the gateway gave 0 errors, segment latency median 30 ms (p95 44 ms), negligible CPU. The
limit is this machine's internet path: it's on a USB network adapter with ~16–34 Mbit/s
upload, and **through the Cloudflare tunnel a single connection gets ~1 Mbit/s and all
viewers together ~7–9 Mbit/s** (QUIC and http2 alike). At the `lo` rendition that is
roughly **15–20 simultaneous viewers**. For ~100 at once, serve the HLS files from
Cloudflare R2 behind a small Worker that does the same membership check (the segments are
static files, so nothing else changes), or move the stack to a host with a real uplink.

## Operating notes

- **Sign-in burst**: Jellyfin checks passwords one at a time, so 100 people signing in in
  the same second wait up to ~20 s; "Keep me signed in" avoids it.
- **Adding videos**: add the source file and a line to the map in `transcode.sh`, then
  `systemctl --user restart kodai1994-processing`.
- **Filenames containing "sample" are skipped** by Jellyfin (treated as trailers).
- **Updating images**: bump tags in `docker-compose.yml`, `docker compose pull` in
  `~/services/yajur-videos`, then `jellyfin/deploy.sh`.
- **yajur.ai/videos/**: that page plays through Jellyfin's stream endpoints, which the
  gateway now blocks, so it can list but not play. Kodai members should use
  `videos.yajur.ai/kodai1994/`.
- **Cloudflare terms**: self-serve plans aren't meant for heavy video through the proxy; a
  small private audience is the intended use. R2/Stream is the path if usage grows.

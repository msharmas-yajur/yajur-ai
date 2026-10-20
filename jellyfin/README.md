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
- **Members-only media.** At sign-in the page sets a `kodai_auth` cookie (the Jellyfin
  token; `Path=/kodai1994/`, `SameSite=Strict`, `Secure`). For every request under
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
  menu, and overlays the viewer's name and the date as a moving watermark (videos and
  photos), so a screen recording is traceable. A determined member can still capture the
  segments or record the screen; there is no DRM. Invite people you trust.
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
  Bits' PatternWaves; WebGL2 via `ogl` 1.0.11 from jsDelivr) draws a mist-green "silk" dot
  surface behind the helix and form, with cursor ripples; it pauses when the sign-in screen
  is hidden. Tablets and phones skip it and show the helix behind the form instead.

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

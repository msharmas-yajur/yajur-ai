# Private Video Library: videos.yajur.ai

Videos stay on this machine. [Jellyfin](https://jellyfin.org) streams them and checks
who may watch what. A [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
publishes the stack at `https://videos.yajur.ai` without opening any router ports.

Two front ends sign in against the same Jellyfin accounts:

| URL | What it is | Source |
|---|---|---|
| `https://videos.yajur.ai/kodai1994/` | The **Kodai 1994** collection: grouped by month, poster cards, resume where you left off | `kodai1994/site/index.html` (served by the gateway) |
| `https://yajur.ai/videos/` | General library page on the main site: search, sort, quality picker | `videos.html` (GitHub Pages) |
| `http://127.0.0.1:8099` | Jellyfin's own UI, for the admin (on this machine) | Jellyfin |

```
Browser ──https──▶ Cloudflare edge ──tunnel──▶ cloudflared ──▶ gateway (Caddy :80)
                                                                 ├─ /kodai1994/*  static page
                                                                 ├─ /             → /kodai1994/
                                                                 └─ everything else ─▶ Jellyfin :8096 ──▶ MEDIA_DIR (read-only)
```

**Where security comes from.** The pages are static and never see or check passwords.
Jellyfin checks listings, playback info, and account requests. Each member's account can
see only the libraries it was given (`add-viewer.py` grants exactly one). Tokens are per
user and per device and can be revoked.

**The gateway is part of the security boundary.** Jellyfin 12.2 serves video/audio
streams, subtitles, attachments, and item images to *anyone* who knows the item ID (its
OpenAPI marks them anonymous), and item IDs are derived from file paths, which this public
repo contains. The gateway therefore runs `forward_auth` on those paths
(case-insensitive, any slash/encoding variant) and lets a request through only if its
token (`Authorization` header or `ApiKey=` query) is valid. So:

- **Through the gateway, every listing, stream, and image returns `401` without a valid token.**
  Directly against Jellyfin (`127.0.0.1:8099`), streams and images are open.
- **Never point the tunnel, a Tailscale Funnel/serve path, or anything else public at
  Jellyfin's port.** The tunnel's service must be `gateway:80`. Both host ports are bound
  to `127.0.0.1`.
- Pages must put `&ApiKey=<token>` on `<img>` and stream URLs (they can't send headers).
  Jellyfin's own `/web/` UI doesn't, so through `videos.yajur.ai/web/` it shows no
  thumbnails. For administration use <http://127.0.0.1:8099> on this machine.

**Playback on every device.** The pages ask Jellyfin what each browser can play. H.264/AAC
MP4 streams directly; anything else (MKV, HEVC, AC3, …) is transcoded on the fly to HLS
(native on Safari/iOS, hls.js elsewhere). The Kodai collection is pre-encoded to H.264, so
it always direct-plays and the server does no transcoding.

---

**Unlisted.** Nothing on yajur.ai links to `videos.yajur.ai`; the link is shared privately.
The gateway serves `robots.txt` with `Disallow: /` and adds `X-Robots-Tag: noindex, nofollow,
noarchive` to every response (Jellyfin's pages included), and the Kodai page also carries a
`noindex` meta tag. This repo is public, so the URL itself is not secret; access control is
the login.

## How it's deployed on this machine

The stack runs from **`~/services/yajur-videos/`**, not from the git checkout, so switching
branches or deleting a worktree never affects it. `deploy.sh` copies `docker-compose.yml`,
`Caddyfile`, and `kodai1994/site/` there and runs `docker compose up -d`.

| Path | Contents |
|---|---|
| `~/services/yajur-videos/.env` | `MEDIA_DIR`, `PUID`/`PGID`, `CLOUDFLARE_TUNNEL_TOKEN` (mode 600) |
| `~/services/yajur-videos/admin-credentials.txt` | Jellyfin admin username + password (mode 600) |
| `~/services/yajur-videos/config/` | Jellyfin users, password hashes, library database. **Back this up.** |
| `~/media/kodai1994/` | The encoded Kodai videos and their `-poster.jpg` cards |

| Port (localhost only) | Service |
|---|---|
| `127.0.0.1:8099` | Jellyfin (admin from this machine). Not 8096: a Tailscale Funnel path on this host already forwards public traffic to `127.0.0.1:8096`. |
| `127.0.0.1:8098` | Gateway (what the tunnel serves). `http://127.0.0.1:8098/kodai1994/` previews the page locally. |

After changing anything in `jellyfin/`, run `jellyfin/deploy.sh` again.

## One-time setup

### 1. Configure and start locally

```bash
jellyfin/deploy.sh          # first run creates ~/services/yajur-videos/.env from .env.example
$EDITOR ~/services/yajur-videos/.env   # MEDIA_DIR=/home/msharma/media, PUID/PGID from `id -u`/`id -g`
jellyfin/deploy.sh          # without a tunnel token it starts jellyfin + gateway only (not public)
```

### 2. Jellyfin first run

Done once via the API (equivalent to the wizard at <http://127.0.0.1:8099>):
admin user `yajur-admin`, remote access on, library **Kodai 1994** = Home Videos at
`/media/kodai1994` with real-time monitoring, and these hardening settings:

| Setting | Where (Dashboard → …) | Value |
|---|---|---|
| CORS hosts | **Networking**, or `config/config/system.xml` → `<CorsHosts>` | `https://yajur.ai` only (the default is `*`). The Kodai page is same-origin and needs no entry. |
| Known proxies | **Networking** → Known proxies | `gateway`, so lockout and logs see real client IPs (the gateway forwards Cloudflare's `Cf-Connecting-IP`) |
| Login lockout | Each user → **Profile** → "Failed login tries before user is locked out" | `5` (set by `add-viewer.py`) |
| Hide users on login screen | Each user → **Profile** | on |
| Downloads | Each viewer → **Profile** → "Allow media downloading" | off |

### 3. Publish with a Cloudflare Tunnel (the yajur.ai zone is already on Cloudflare)

1. Go to <https://one.dash.cloudflare.com> → **Networks → Tunnels → Create a tunnel** →
   choose **Cloudflared** and name it `yajur-videos`.
2. On the "Install connector" step, copy the token (the long string after `--token`) into
   `CLOUDFLARE_TUNNEL_TOKEN` in `~/services/yajur-videos/.env`. Don't install anything else.
3. **Public hostname**: subdomain `videos`, domain `yajur.ai`, service `HTTP` → `gateway:80`.
4. Run `jellyfin/deploy.sh` again; it now starts cloudflared too. Check with
   `docker logs yajur-cloudflared` for "Registered tunnel connection".
5. Confirm media is still locked down through Cloudflare:
   `python3 -I jellyfin/check-security.py https://videos.yajur.ai` (every line must be `ok`).

## Invite and remove members

```bash
python3 -I jellyfin/add-viewer.py priya                      # Kodai 1994 access only
python3 -I jellyfin/add-viewer.py priya                      # again = reset password
python3 -I jellyfin/add-viewer.py priya --disable            # cut off access
python3 -I jellyfin/add-viewer.py ravi --library "Other"     # a different library
```

It prints the link, username, and a generated password to send to the person. Members can
change their password in Jellyfin's UI (`/web/` → profile). To revoke a single device
instead, use **Dashboard → Devices**.

---

## The Kodai 1994 collection

Source: the digitised VHS captures in `~/Downloads/Kodai - 1994` (left untouched).
`kodai1994/transcode.sh` converts them to `~/media/kodai1994/`:

- MPEG-4 Part 2 (which browsers can't play) → H.264/AAC MP4 with `+faststart`, light
  `hqdn3d` denoise, CRF 23 (~1.4 Mbps at 640×480).
- Names become `YYYY-MM-DD - Title.mp4`; the page sorts and groups by that prefix and
  shows the part after it.
- Each capture's embedded portrait title card becomes `<name>-poster.jpg`.
- Exact duplicates in the source folder are skipped, and two filename typos are fixed
  ("May 3rd 1995" → 1994, per the file's own title tag; "Mahajn" → "Mahajan").

Re-running it skips finished files. Progress log: `~/media/kodai1994-transcode.log`.

---

## Operating notes

- **Adding videos**: copy files into a library folder under `MEDIA_DIR`. Real-time
  monitoring picks them up; otherwise Dashboard → Libraries → **Scan All Libraries**.
  A new collection = a new subfolder + a new library + `add-viewer.py --library`.
- **Filenames containing "sample" are skipped.** Jellyfin treats them as trailer samples.
- **Downloads can't be fully prevented.** "Allow media downloading" off hides Jellyfin's
  download button, but anyone who can stream a video can save the stream. Only invite
  people you trust with the recordings.
- **Updating**: bump the image tags in `docker-compose.yml`, then `jellyfin/deploy.sh`
  (run `docker compose pull` in `~/services/yajur-videos` first).
- **Cloudflare terms**: Cloudflare's self-serve plans aren't meant for serving large
  volumes of video through the proxy. A small private audience is the intended use here.
  If usage grows, move the media to Cloudflare Stream or R2, or serve through Tailscale
  Funnel instead.
- **yajur.ai/videos/ config**: that page reads the server URL from `jellyfin_url` in `_config.yml`.

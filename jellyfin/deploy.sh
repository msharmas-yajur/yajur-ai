#!/usr/bin/env bash
# Install or update the running video stack from this checkout.
#
# The stack runs from a fixed folder (default ~/services/yajur-videos) rather than from
# the git checkout, so switching branches or deleting a worktree never touches it.
# Jellyfin's users and library data (config/, cache/) and .env live only in that folder.
#
# Usage: jellyfin/deploy.sh [up|config]   (default: up)
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
DEST=${VIDEOS_STACK_DIR:-"$HOME/services/yajur-videos"}

# The community service's tests (tests/test_community.py: no Docker, nothing live touched)
# must pass before anything is installed. SKIP_TESTS=1 skips them, for emergencies.
if [ "${SKIP_TESTS:-}" != 1 ]; then
  python3 -I "$HERE/tests/test_community.py" || { echo "tests failed: nothing deployed (SKIP_TESTS=1 to deploy anyway)" >&2; exit 1; }
fi

# Create the data folders as this user; if Docker creates them they are root-owned
# and Jellyfin (running as PUID) cannot write to them.
mkdir -p "$DEST/kodai1994/community" "$DEST/config" "$DEST/cache" "$DEST/community-data"
# Restarting the gateway or the community service cuts off requests in flight (an upload
# in progress gets a 502), so each is restarted further down only if its file changed.
changed() { ! cmp -s "$1" "$2"; }
restart=()
changed "$HERE/Caddyfile" "$DEST/Caddyfile" && restart+=(gateway)
changed "$HERE/kodai1994/community/app.py" "$DEST/kodai1994/community/app.py" && restart+=(community)
# cp, not install: these are bind-mounted as single files, and replacing the file
# (new inode) would leave a running container reading the old one.
cp "$HERE/kodai1994/community/app.py" "$DEST/kodai1994/community/app.py"
cp "$HERE/docker-compose.yml" "$HERE/Caddyfile" "$DEST/"
mkdir -p "$DEST/kodai1994/faceid" "$DEST/kodai1994/captions"
cp "$HERE/kodai1994/faceid/Dockerfile" "$HERE/kodai1994/faceid/worker.py" "$DEST/kodai1994/faceid/"
cp "$HERE/kodai1994/captions/Dockerfile" "$HERE/kodai1994/captions/worker.py" "$DEST/kodai1994/captions/"
# Update in place: replacing the folder would leave the running gateway's bind mount
# pointing at the deleted directory.
# Copy over the old files first, then remove ones that no longer exist, so the page is
# never briefly missing while members are using it.
mkdir -p "$DEST/kodai1994/site"
cp -r "$HERE/kodai1994/site/." "$DEST/kodai1994/site/"
(cd "$DEST/kodai1994/site" && find . -type f) | while IFS= read -r f; do
  [ -e "$HERE/kodai1994/site/$f" ] || rm -f "$DEST/kodai1994/site/$f"
done
# Cloudflare keeps scripts and stylesheets in browsers for 4 hours, whatever the gateway says
# (the pages themselves aren't kept). So the pages ask for the shared ones by a name that
# changes with their content: an update reaches everyone at once, an unchanged file stays cached.
# Every script and stylesheet, wherever it's named (pages, and scripts importing scripts):
# the ones others import come first, so a change to them changes their importers' names too.
(cd "$DEST/kodai1994/site" && ls vendor/*.js pattern-waves.js; ls *.js *.css | grep -vx pattern-waves.js) | while IFS= read -r a; do
  v=$(sha1sum "$DEST/kodai1994/site/$a" | cut -c1-10)
  sed -i -E "s#((/kodai1994/)?${a//./\\.})(\?v=[0-9a-f]+)?([\"'])#\1?v=$v\4#g" "$DEST"/kodai1994/site/*.html "$DEST"/kodai1994/site/*.js
done

# Monitoring: kodai1994/monitor.py every 5 minutes, and an alert whenever a kodai1994-* job
# fails (their units name kodai1994-alert@ as OnFailure). Installed first, so they can.
mkdir -p "$DEST/kodai1994/bin" "$HOME/.config/systemd/user"
install -m 755 "$HERE/kodai1994/monitor.py" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-monitor.service" "$HERE/kodai1994/kodai1994-monitor.timer" "$HERE/kodai1994/kodai1994-alert@.service" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable --now kodai1994-monitor.timer >/dev/null 2>&1

# Kodai 1994 processing pipeline: scripts + systemd user service (runs until all
# videos are converted and packaged; resumes after reboot).
mkdir -p "$DEST/kodai1994/bin" "$HOME/.config/systemd/user"
install -m 755 "$HERE/kodai1994/transcode.sh" "$HERE/kodai1994/package-hls.sh" "$HERE/kodai1994/process.sh" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-processing.service" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable kodai1994-processing.service >/dev/null 2>&1
# start is a no-op while it's running; restart it by hand to pick up script changes.
systemctl --user start kodai1994-processing.service

# Nightly video stabilization, one recording at a time, until all are done
# (kodai1994/stabilize-queue.sh; finished ones are skipped, so it's safe to leave on).
install -m 755 "$HERE/kodai1994/stabilize.sh" "$HERE/kodai1994/stabilize-queue.sh" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-stabilize.service" "$HERE/kodai1994/kodai1994-stabilize.timer" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable --now kodai1994-stabilize.timer >/dev/null 2>&1

# Hourly: each recording's three sounds (Enhanced, Voice focus, Original) kept up to date
# (kodai1994/audio-queue.sh; up-to-date ones are skipped, so it's safe to leave on).
install -m 755 "$HERE/kodai1994/audio.sh" "$HERE/kodai1994/audio-queue.sh" "$HERE/kodai1994/sound-sections.py" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-audio.service" "$HERE/kodai1994/kodai1994-audio.timer" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable --now kodai1994-audio.timer >/dev/null 2>&1

# Every minute: recorded memories members add are made ready to play (kodai1994/media-queue.py).
install -m 755 "$HERE/kodai1994/media-queue.py" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-media.service" "$HERE/kodai1994/kodai1994-media.timer" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable --now kodai1994-media.timer >/dev/null 2>&1

# Nightly: descriptions of new transcripts, written by Claude (kodai1994/describe.py), once
# ANTHROPIC_API_KEY is in .env. Until then nothing is sent anywhere.
install -m 755 "$HERE/kodai1994/describe.py" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-describe.service" "$HERE/kodai1994/kodai1994-describe.timer" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
if grep -qE '^ANTHROPIC_API_KEY=.+' "$DEST/.env" 2>/dev/null; then
  [ -x "$DEST/kodai1994/venv-describe/bin/python3" ] || python3 -m venv "$DEST/kodai1994/venv-describe"
  "$DEST/kodai1994/venv-describe/bin/pip" install -q 'anthropic>=1,<2'
  systemctl --user enable --now kodai1994-describe.timer >/dev/null 2>&1
fi

# Monthly: check the Drive backup can be read back (kodai1994/restore-test.py).
install -m 755 "$HERE/kodai1994/restore-test.py" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-restore-test.service" "$HERE/kodai1994/kodai1994-restore-test.timer" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload

# Nightly backup to Google Drive (kodai1994/backup.sh), once it's configured in .env.
install -m 755 "$HERE/kodai1994/backup.sh" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-backup.service" "$HERE/kodai1994/kodai1994-backup.timer" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
if grep -qE '^BACKUP_FOLDER_ID=.+' "$DEST/.env" 2>/dev/null; then
  systemctl --user enable --now kodai1994-backup.timer kodai1994-restore-test.timer >/dev/null 2>&1
fi

if [ ! -f "$DEST/.env" ]; then
  install -m 600 "$HERE/.env.example" "$DEST/.env"
  echo "Created $DEST/.env from .env.example — fill it in, then re-run." >&2
  exit 1
fi

cd "$DEST"
if [ "${1:-up}" = config ]; then exec docker compose config; fi
# The faceid worker's output folder, created as this user (see above).
MEDIA_DIR=$(sed -n 's/^MEDIA_DIR=//p' .env)
mkdir -p "$MEDIA_DIR/kodai1994-identify" "$MEDIA_DIR/kodai1994-uploads" "$MEDIA_DIR/kodai1994-memories"
# Without a tunnel token, run locally only (gateway on 127.0.0.1:8098).
if grep -qE '^CLOUDFLARE_TUNNEL_TOKEN=.+' .env; then
  docker compose up -d --remove-orphans
else
  echo "No CLOUDFLARE_TUNNEL_TOKEN yet: starting jellyfin + gateway only (not public)." >&2
  docker compose up -d --remove-orphans jellyfin gateway
fi
# Compose can't see changes inside mounted files, and the gateway's admin API (live
# reload) is off, so recreate a container whose mounted config/code changed (and only
# then: see `restart` above). Page changes need no restart: the site folder is live.
if [ ${#restart[@]} -gt 0 ]; then
  echo "restarting: ${restart[*]}" >&2
  docker compose up -d --force-recreate --no-deps "${restart[@]}"
fi
# The worker's code is baked into its image: rebuild it (quick when only worker.py changed).
if grep -qE '^FACEID_MODELS=.+' .env; then
  docker compose --profile faceid up -d --build --no-deps faceid
fi
# The captions worker, once its model is there (see kodai1994/captions/worker.py --download).
CAPTIONS_MODELS=$(sed -n 's/^CAPTIONS_MODELS=//p' .env); CAPTIONS_MODELS=${CAPTIONS_MODELS:-$DEST/captions-models}
if [ -f "$CAPTIONS_MODELS/large-v3-turbo/model.bin" ]; then
  docker compose --profile captions up -d --build --no-deps captions
fi
docker compose ps
# The deployed site, as a visitor (tests/smoke.py); a restarted service may need a moment.
sleep 3
python3 -I "$HERE/tests/smoke.py" || echo "SMOKE TEST FAILED: check the site (journalctl, docker compose logs)" >&2

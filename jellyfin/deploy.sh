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
mkdir -p "$DEST/kodai1994/faceid"
cp "$HERE/kodai1994/faceid/Dockerfile" "$HERE/kodai1994/faceid/worker.py" "$DEST/kodai1994/faceid/"
# Update in place: replacing the folder would leave the running gateway's bind mount
# pointing at the deleted directory.
# Copy over the old files first, then remove ones that no longer exist, so the page is
# never briefly missing while members are using it.
mkdir -p "$DEST/kodai1994/site"
cp -r "$HERE/kodai1994/site/." "$DEST/kodai1994/site/"
(cd "$DEST/kodai1994/site" && find . -type f) | while IFS= read -r f; do
  [ -e "$HERE/kodai1994/site/$f" ] || rm -f "$DEST/kodai1994/site/$f"
done

# Kodai 1994 processing pipeline: scripts + systemd user service (runs until all
# videos are converted and packaged; resumes after reboot).
mkdir -p "$DEST/kodai1994/bin" "$HOME/.config/systemd/user"
install -m 755 "$HERE/kodai1994/transcode.sh" "$HERE/kodai1994/package-hls.sh" "$HERE/kodai1994/process.sh" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-processing.service" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable kodai1994-processing.service >/dev/null 2>&1
# start is a no-op while it's running; restart it by hand to pick up script changes.
systemctl --user start kodai1994-processing.service

# Nightly backup to Google Drive (kodai1994/backup.sh), once it's configured in .env.
install -m 755 "$HERE/kodai1994/backup.sh" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-backup.service" "$HERE/kodai1994/kodai1994-backup.timer" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
if grep -qE '^BACKUP_FOLDER_ID=.+' "$DEST/.env" 2>/dev/null; then
  systemctl --user enable --now kodai1994-backup.timer >/dev/null 2>&1
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
docker compose ps

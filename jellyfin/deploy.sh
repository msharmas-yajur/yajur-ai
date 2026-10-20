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
# cp, not install: these are bind-mounted as single files, and replacing the file
# (new inode) would leave a running container reading the old one.
cp "$HERE/kodai1994/community/app.py" "$DEST/kodai1994/community/app.py"
cp "$HERE/docker-compose.yml" "$HERE/Caddyfile" "$DEST/"
# Update in place: replacing the folder would leave the running gateway's bind mount
# pointing at the deleted directory.
mkdir -p "$DEST/kodai1994/site"
find "$DEST/kodai1994/site" -mindepth 1 -delete
cp -r "$HERE/kodai1994/site/." "$DEST/kodai1994/site/"

# Kodai 1994 processing pipeline: scripts + systemd user service (runs until all
# videos are converted and packaged; resumes after reboot).
mkdir -p "$DEST/kodai1994/bin" "$HOME/.config/systemd/user"
install -m 755 "$HERE/kodai1994/transcode.sh" "$HERE/kodai1994/package-hls.sh" "$HERE/kodai1994/process.sh" "$DEST/kodai1994/bin/"
install -m 644 "$HERE/kodai1994/kodai1994-processing.service" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable kodai1994-processing.service >/dev/null 2>&1
# start is a no-op while it's running; restart it by hand to pick up script changes.
systemctl --user start kodai1994-processing.service

if [ ! -f "$DEST/.env" ]; then
  install -m 600 "$HERE/.env.example" "$DEST/.env"
  echo "Created $DEST/.env from .env.example — fill it in, then re-run." >&2
  exit 1
fi

cd "$DEST"
if [ "${1:-up}" = config ]; then exec docker compose config; fi
# Without a tunnel token, run locally only (gateway on 127.0.0.1:8098).
if grep -qE '^CLOUDFLARE_TUNNEL_TOKEN=.+' .env; then
  docker compose up -d --remove-orphans
else
  echo "No CLOUDFLARE_TUNNEL_TOKEN yet: starting jellyfin + gateway only (not public)." >&2
  docker compose up -d --remove-orphans jellyfin gateway
fi
# Compose can't see changes inside mounted files, and the gateway's admin API (live
# reload) is off, so recreate the two containers whose config/code lives in this repo.
docker compose up -d --force-recreate --no-deps gateway community
docker compose ps

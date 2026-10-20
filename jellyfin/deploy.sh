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
mkdir -p "$DEST/kodai1994" "$DEST/config" "$DEST/cache"
install -m 644 "$HERE/docker-compose.yml" "$HERE/Caddyfile" "$DEST/"
# Update in place: replacing the folder would leave the running gateway's bind mount
# pointing at the deleted directory.
mkdir -p "$DEST/kodai1994/site"
find "$DEST/kodai1994/site" -mindepth 1 -delete
cp -r "$HERE/kodai1994/site/." "$DEST/kodai1994/site/"

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
docker compose ps

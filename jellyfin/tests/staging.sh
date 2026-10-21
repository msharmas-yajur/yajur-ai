#!/usr/bin/env bash
# Staging copy of the video stack at http://127.0.0.1:8097/kodai1994/ (tests/staging/docker-compose.yml).
#
#   tests/staging.sh up        start it on a fresh copy of the live database (or restart it)
#   tests/staging.sh keep      restart it, keeping staging's own database
#   tests/staging.sh down      stop it and remove its containers
#
# Sign in as admin, member@example.com or other@example.com, password test-password
# (tests/stub_jellyfin.py). Nothing here writes to the live stack.
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
STACK=${VIDEOS_STACK_DIR:-"$HOME/services/yajur-videos"}
export STAGING_DIR=${STAGING_DIR:-"$HOME/.cache/kodai-staging"}
env_get() { sed -n "s/^$1=//p" "$STACK/.env" | tail -1; }
export MEDIA_DIR=$(env_get MEDIA_DIR) KODAI_LIBRARY_ID=$(env_get KODAI_LIBRARY_ID)
export PUID=$(id -u) PGID=$(id -g) STUB_ADMIN_TOKEN=$(printf 'a%.0s' {1..32})
compose() { docker compose -f "$HERE/staging/docker-compose.yml" "$@"; }

case "${1:-up}" in
down) compose down; exit ;;
up|keep) ;;
*) echo "usage: $0 [up|keep|down]" >&2; exit 2 ;;
esac

mkdir -p "$STAGING_DIR"/{data,uploads,memories,captions}
if [ "${1:-up}" = up ] || [ ! -f "$STAGING_DIR/data/community.db" ]; then
  compose stop community 2>/dev/null || true
  rm -f "$STAGING_DIR"/data/community.db*
  python3 -I -c 'import sqlite3, sys; s = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True); d = sqlite3.connect(sys.argv[2]); s.backup(d); d.close()' \
    "$STACK/community-data/community.db" "$STAGING_DIR/data/community.db"
fi
# The library as Jellyfin lists it: the recordings' names and lengths
python3 -I - "$MEDIA_DIR/kodai1994" "$STAGING_DIR/items.json" <<'EOF'
import json, os, subprocess, sys
src, out = sys.argv[1:]
items = []
for name in sorted(os.listdir(src)):
    if not name.endswith(".mp4"):
        continue
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(src, name)],
                         capture_output=True, text=True).stdout.strip()
    items.append({"Name": name[:-4], "RunTimeTicks": int(float(dur or 0) * 1e7)})
json.dump(items, open(out, "w"))
EOF
compose up -d --force-recreate
if [ "${CAPTIONS:-}" = 1 ]; then compose --profile captions up -d --force-recreate captions; fi
echo "staging: http://127.0.0.1:8097/kodai1994/  (admin / member@example.com, password test-password)"

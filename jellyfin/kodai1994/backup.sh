#!/usr/bin/env bash
# Kodai 1994: nightly backup to a Google Drive folder (rclone).
#
#   SOURCE          the original videos and photos  →  the folder itself (same names)
#   uploads         photos members added on the page →  Uploaded photos/
#   memories        PDFs members shared as notes      →  Memories/ (articles are in the database)
#   community.db    comments, people, face marks, events, identify reviews
#                   (a consistent snapshot)           →  Site data/community-YYYY-MM-DD.db
#
# Copy only, never sync: nothing on Drive is deleted when it disappears here, and files
# already on Drive under the same name are left alone. The one exception is database
# snapshots older than KEEP_DAYS, which are removed (to Drive's trash).
# What isn't backed up, because it's rebuilt from the originals: the HLS streams, the web
# MP4s, thumbnails, face crops. Jellyfin's config (password hashes) stays off Drive.
#
# Settings come from the stack's .env (see .env.example):
#   BACKUP_REMOTE     rclone remote, e.g. gdrive:
#   BACKUP_FOLDER_ID  the Drive folder's id (the last part of its URL)
#   BACKUP_SOURCE     the folder with the original videos and photos
# Usage: jellyfin/kodai1994/backup.sh   (the kodai1994-backup.timer runs it nightly)
set -euo pipefail

STACK=${VIDEOS_STACK_DIR:-"$HOME/services/yajur-videos"}
env_get() { sed -n "s/^$1=//p" "$STACK/.env" | tail -1; }
REMOTE=$(env_get BACKUP_REMOTE); FOLDER=$(env_get BACKUP_FOLDER_ID); SOURCE=$(env_get BACKUP_SOURCE)
MEDIA_DIR=$(env_get MEDIA_DIR)
KEEP_DAYS=${KEEP_DAYS:-30}
[ -n "$REMOTE" ] && [ -n "$FOLDER" ] && [ -n "$SOURCE" ] || { echo "Set BACKUP_REMOTE, BACKUP_FOLDER_ID and BACKUP_SOURCE in $STACK/.env" >&2; exit 1; }

rc() { rclone --drive-root-folder-id "$FOLDER" --stats-one-line --stats 5m "$@"; }
# Drive allows two folders with one name; create them once, up front, so parallel
# uploads don't each make their own.
rc mkdir "$REMOTE/Uploaded photos"
rc mkdir "$REMOTE/Memories"
rc mkdir "$REMOTE/Site data"

echo "== originals: $SOURCE"
rc copy "$SOURCE" "$REMOTE" --ignore-existing --max-depth 1

echo "== uploaded photos"
rc copy "$MEDIA_DIR/kodai1994-uploads" "$REMOTE/Uploaded photos" --ignore-existing

echo "== memories (PDF notes)"
rc copy "$MEDIA_DIR/kodai1994-memories" "$REMOTE/Memories" --ignore-existing

echo "== community database"
snap=$(mktemp -d)
trap 'rm -rf "$snap"' EXIT
name="community-$(date +%F).db"
# SQLite's backup API: a consistent copy while the service keeps writing.
python3 -I -c 'import sqlite3, sys; s = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True); d = sqlite3.connect(sys.argv[2]); s.backup(d); d.close()' \
  "$STACK/community-data/community.db" "$snap/$name"
rc copyto "$snap/$name" "$REMOTE/Site data/$name"
rc delete "$REMOTE/Site data" --min-age "${KEEP_DAYS}d" --include 'community-*.db'
# Safety net: merge any same-named folders (files are never touched in skip mode).
rc dedupe --dedupe-mode skip "$REMOTE" --max-depth 1

echo "backup finished $(date -Is)"

#!/usr/bin/env bash
# Kodai 1994: nightly backup to a Google Drive folder (rclone).
#
#   SOURCE          the original videos and photos  →  the folder itself (same names)
#   uploads         photos members added on the page →  Uploaded photos/
#   recordings      recorded memories, as sent        →  Recorded memories/
#   memories        PDFs members shared as notes      →  Memories/ (articles are in the database)
#   community.db    comments, people, face marks, events, clips, transcripts, identify
#                   reviews (a consistent snapshot)   →  Site data/community-YYYY-MM-DD.db
#   the stack       Jellyfin's config (accounts and their password hashes, the library),
#                   .env, Caddyfile, docker-compose.yml: encrypted with BACKUP_PASSPHRASE
#                   (gpg, AES-256)                    →  Site data/stack-YYYY-MM-DD.tar.gz.gpg
#
# Copy only, never sync: nothing on Drive is deleted when it disappears here, and files
# already on Drive under the same name are left alone. The one exception is snapshots in
# Site data older than KEEP_DAYS, which are removed (to Drive's trash).
# What isn't backed up, because it's rebuilt from the originals: the HLS streams, the web
# MP4s, thumbnails, face crops, the playable copies of recorded memories.
# restore-test.sh checks, monthly, that the newest snapshots can be read back.
# Restoring the stack: gpg -d stack-….tar.gz.gpg | tar -xz -C ~/services/yajur-videos
#
# Settings come from the stack's .env (see .env.example):
#   BACKUP_REMOTE     rclone remote, e.g. gdrive:
#   BACKUP_FOLDER_ID  the Drive folder's id (the last part of its URL)
#   BACKUP_SOURCE     the folder with the original videos and photos
#   BACKUP_PASSPHRASE encrypts the stack archive; keep a copy outside this machine (without
#                     it the archive can't be opened). Unset: the stack isn't backed up.
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
rc mkdir "$REMOTE/Recorded memories"
rc mkdir "$REMOTE/Memories"
rc mkdir "$REMOTE/Site data"

echo "== originals: $SOURCE"
rc copy "$SOURCE" "$REMOTE" --ignore-existing --max-depth 1

echo "== uploaded photos"
rc copy "$MEDIA_DIR/kodai1994-uploads" "$REMOTE/Uploaded photos" --ignore-existing --exclude 'recordings/**'

echo "== recorded memories"
if [ -d "$MEDIA_DIR/kodai1994-uploads/recordings" ]; then
  rc copy "$MEDIA_DIR/kodai1994-uploads/recordings" "$REMOTE/Recorded memories" --ignore-existing
fi

echo "== memories (PDF notes)"
rc copy "$MEDIA_DIR/kodai1994-memories" "$REMOTE/Memories" --ignore-existing --exclude 'rec/**'

echo "== community database"
snap=$(mktemp -d)
trap 'rm -rf "$snap"' EXIT
name="community-$(date +%F).db"
# SQLite's backup API: a consistent copy while the service keeps writing.
python3 -I -c 'import sqlite3, sys; s = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True); d = sqlite3.connect(sys.argv[2]); s.backup(d); d.close()' \
  "$STACK/community-data/community.db" "$snap/$name"
rc copyto "$snap/$name" "$REMOTE/Site data/$name"

echo "== the stack (Jellyfin's config, .env), encrypted"
PASS=$(env_get BACKUP_PASSPHRASE)
if [ -z "$PASS" ]; then
  echo "BACKUP_PASSPHRASE isn't set in $STACK/.env: the stack isn't backed up" >&2
  stack_missing=1
else
  # A copy of config/ with each database as a consistent snapshot (Jellyfin keeps writing),
  # its log left out; then .env, Caddyfile and docker-compose.yml beside it.
  mkdir -p "$snap/stack"
  (cd "$STACK" && tar -c --exclude='./config/log' --exclude='*.db-wal' --exclude='*.db-shm' ./config .env Caddyfile docker-compose.yml) | tar -x -C "$snap/stack"
  (cd "$STACK" && find config -name '*.db') | while IFS= read -r db; do
    python3 -I -c 'import sqlite3, sys; s = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True); d = sqlite3.connect(sys.argv[2]); s.backup(d); d.close()' \
      "$STACK/$db" "$snap/stack/$db.snap" && mv "$snap/stack/$db.snap" "$snap/stack/$db"
  done
  sname="stack-$(date +%F).tar.gz.gpg"
  tar -cz -C "$snap/stack" . | gpg --batch --yes --quiet --pinentry-mode loopback --symmetric --cipher-algo AES256 --passphrase-fd 3 -o "$snap/$sname" 3<<<"$PASS"
  rc copyto "$snap/$sname" "$REMOTE/Site data/$sname"
fi
rc delete "$REMOTE/Site data" --min-age "${KEEP_DAYS}d" --include 'community-*.db' --include 'stack-*.tar.gz.gpg'
# Safety net: merge any same-named folders (files are never touched in skip mode).
rc dedupe --dedupe-mode skip "$REMOTE" --max-depth 1

echo "backup finished $(date -Is)"
# A marker monitor.py reads: when the last backup finished in full
date -Is > "$STACK/community-data/.backup-ok"
if [ -n "${stack_missing:-}" ]; then exit 3; fi   # the rest worked; the alert says what's missing

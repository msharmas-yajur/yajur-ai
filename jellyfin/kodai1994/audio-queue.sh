#!/usr/bin/env bash
# Kodai 1994: keep every recording's sounds up to date (Enhanced, Voice focus, Original), one at
# a time. Run hourly by kodai1994-audio.timer: a recording is (re)built when it has never been
# done, when stabilize.sh has just replaced its stream, or when its outdoor parts were marked
# or changed in the player. Up-to-date recordings are skipped in a moment.
#
# Shares a lock with stabilize-queue.sh, so the two never swap the same folder at once: if a
# stabilization is running, this run steps aside and the next hour picks up. A recording that
# failed leaves a "failed-<slug>" note in WORK and is skipped until the note is deleted.
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
HLS=${HLS:-"$HOME/media/kodai1994-hls"}
WORK=${WORK:-"$HOME/media/kodai1994-audio"}
LOCK=${LOCK:-"$HOME/media/.kodai1994-media.lock"}
mkdir -p "$WORK"
exec 9>"$LOCK"
flock -n 9 || { echo "stabilization running: trying again next hour"; exit 0; }

for d in "$HLS"/*/; do
  s=$(basename "$d")
  [ -f "$d/master.m3u8" ] || continue
  [ -f "$WORK/failed-$s" ] && { echo "skip (failed before; see $WORK/failed-$s): $s"; continue; }
  if ! "$HERE/audio.sh" "$s" > "$WORK/log-$s.txt" 2>&1; then
    { date -Is; tail -20 "$WORK/log-$s.txt"; } > "$WORK/failed-$s"
    echo "FAILED: $s (details in $WORK/failed-$s)"
  else
    grep -v ' skip ' "$WORK/log-$s.txt" | tail -1
  fi
  rm -rf "${WORK:?}/$s"
done
exit 0

#!/usr/bin/env bash
# Kodai 1994: clean the sound of every recording that isn't done yet, one at a time.
#
# Run nightly by kodai1994-stabilize.service, after stabilize-queue.sh (a recording it has
# just stabilized comes back with its original sound, and is cleaned here). Skips folders
# with audio.json (done) and any that failed before (a "failed-<slug>" note in WORK; delete
# it to try again). Each recording takes a few minutes: only the sound is re-encoded.
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
HLS=${HLS:-"$HOME/media/kodai1994-hls"}
WORK=${WORK:-"$HOME/media/kodai1994-audio"}
mkdir -p "$WORK"

for d in "$HLS"/*/; do
  s=$(basename "$d")
  [ -f "$d/master.m3u8" ] || continue
  [ -f "$d/audio.json" ] && continue
  [ -f "$WORK/failed-$s" ] && { echo "skip (failed before; see $WORK/failed-$s): $s"; continue; }
  if ! "$HERE/audio.sh" "$s" > "$WORK/log-$s.txt" 2>&1; then
    { date -Is; tail -20 "$WORK/log-$s.txt"; } > "$WORK/failed-$s"
    echo "FAILED: $s (details in $WORK/failed-$s)"
  else
    tail -1 "$WORK/log-$s.txt"
  fi
  rm -rf "${WORK:?}/$s"
done
exit 0

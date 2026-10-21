#!/usr/bin/env bash
# Kodai 1994: stabilize every recording, one at a time, a night at a time.
#
# Run nightly by kodai1994-stabilize.timer. Takes the web MP4s in SRC in order, skips any
# already stabilized (its original stream is in REPLACED) or that failed before (a
# "failed-<slug>" note in WORK; delete the note to try again), and runs stabilize.sh on
# the next one, until STOP_AFTER (hour, local time): no new recording starts after it,
# so the work stays out of the day. Picks up where it left off the next night.
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
SRC=${SRC:-"$HOME/media/kodai1994"}
WORK=${WORK:-"$HOME/media/kodai1994-stabilized"}
REPLACED=${REPLACED:-"$HOME/media/kodai1994-replaced/hls"}
STOP_AFTER=${STOP_AFTER:-5}      # last hour (0-23) in which a new recording may start
mkdir -p "$WORK"
slug() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g'; }

# Shares a lock with audio-queue.sh (hourly), so the two never swap the same folder at once:
# wait for a sound run to finish (a few minutes) rather than skip the night.
exec 9>"${LOCK:-$HOME/media/.kodai1994-media.lock}"
flock 9

left=0
while IFS= read -r -d '' mp4; do
  s=$(slug "$(basename "$mp4" .mp4)")
  [ -d "$REPLACED/$s" ] && continue
  [ -f "$WORK/failed-$s" ] && { echo "skip (failed before; see $WORK/failed-$s): $s"; continue; }
  hour=$((10#$(date +%H)))
  if [ "$hour" -gt "$STOP_AFTER" ] && [ "$hour" -lt 23 ]; then
    left=$((left + 1)); continue
  fi
  if ! "$HERE/stabilize.sh" "$mp4" > "$WORK/log-$s.txt" 2>&1; then
    { date -Is; tail -20 "$WORK/log-$s.txt"; } > "$WORK/failed-$s"
    echo "FAILED: $s (details in $WORK/failed-$s)"
  else
    tail -1 "$WORK/log-$s.txt"
    rm -rf "$WORK/src-$s"     # the stabilized MP4 is only needed until it's packaged
  fi
done < <(find "$SRC" -maxdepth 1 -name '*.mp4' -print0 | sort -z)
[ "$left" -gt 0 ] && echo "stopping for the day; $left recording(s) left for the next night"
exit 0

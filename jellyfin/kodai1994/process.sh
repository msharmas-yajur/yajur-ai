#!/usr/bin/env bash
# Supervisor for the Kodai 1994 pipeline, run by the kodai1994-processing user service.
#
# A strict queue, one encoder at a time so the machine stays responsive for viewers:
#   1. package every converted MP4 that has no HLS yet (package-hls.sh, one at a time)
#   2. convert the next source video (transcode.sh LIMIT=1)
#   3. repeat until every video is converted and packaged
# Videos appear on the page one by one as they finish. Both steps are resumable, so a
# crash, reboot, or service restart picks up where it left off.
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
SRC=${SRC:-"$HOME/Downloads/Kodai - 1994"}
MP4_DIR=${MP4_DIR:-"$HOME/media/kodai1994"}
HLS_DIR=${HLS_DIR:-"$HOME/media/kodai1994-hls"}
LOG=${LOG:-"$HOME/media/kodai1994-transcode.log"}
TOTAL=$(grep -c '\.mp4|' "$HERE/transcode.sh")  # one mapping line per source video

count() { find "$1" -mindepth "$2" -maxdepth "$2" -name "$3" 2>/dev/null | wc -l; }

while true; do
  JOBS=1 "$HERE/package-hls.sh" "$MP4_DIR" "$HLS_DIR" || echo "$(date -Is) package-hls.sh failed; retrying"

  converted=$(count "$MP4_DIR" 1 '*.mp4')
  ready=$(count "$HLS_DIR" 2 master.m3u8)
  echo "$(date -Is) converted $converted/$TOTAL, ready to watch $ready/$TOTAL"
  if [ "$ready" -ge "$TOTAL" ]; then
    echo "$(date -Is) all videos processed"
    exit 0
  fi

  if [ "$converted" -lt "$TOTAL" ]; then
    JOBS=1 LIMIT=1 "$HERE/transcode.sh" "$SRC" "$MP4_DIR" >>"$LOG" 2>&1 || { echo "$(date -Is) transcode.sh failed; retrying in 5 min"; sleep 300; }
  else
    sleep 60  # everything converted; a package step failed above, so retry shortly
  fi
done

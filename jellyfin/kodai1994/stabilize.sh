#!/usr/bin/env bash
# Kodai 1994: steady shaky recordings (ffmpeg vidstab, two passes) for the members' stream.
#
#   1. vidstabdetect measures the camera's motion frame by frame;
#   2. vidstabtransform moves each frame to cancel the shake but keep deliberate pans
#      (smoothing over ~0.8 s), zooming in just enough to hide the moving edges, plus a
#      light sharpen against the interpolation's softening;
#   3. package-hls.sh builds the streams, thumbnail and seek previews from the result,
#      which then replaces the video's HLS folder.
# Every frame keeps its time, so chapters, events and face-identification moments still
# line up. The web MP4 (Jellyfin's library file) is left as it was; the replaced HLS
# folder is kept in REPLACED so it can be put back.
#
# Usage: jellyfin/kodai1994/stabilize.sh "<web mp4>" ...      (one at a time, niced)
# Undo:  mv "$REPLACED/<slug>" "$HLS/<slug>"   (after moving the stabilized one aside)
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
HLS=${HLS:-"$HOME/media/kodai1994-hls"}
WORK=${WORK:-"$HOME/media/kodai1994-stabilized"}
REPLACED=${REPLACED:-"$HOME/media/kodai1994-replaced/hls"}
SMOOTHING=${SMOOTHING:-20}
mkdir -p "$WORK" "$REPLACED"
slug() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g'; }

for mp4 in "$@"; do
  name=$(basename "$mp4" .mp4); s=$(slug "$name")
  src="$WORK/src-$s"; mkdir -p "$src"
  echo "$(date +%T) detect    $name"
  nice -n 15 ffmpeg -v error -nostdin -y -i "$mp4" -vf "vidstabdetect=shakiness=8:accuracy=15:result=$WORK/$s.trf" -f null -
  echo "$(date +%T) transform $name"
  # Keyframe every 6 s so the copied "hi" stream still cuts into 6 s segments.
  fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$mp4" | awk -F/ '{ printf "%.0f", $1 / ($2 ? $2 : 1) }')
  nice -n 15 ffmpeg -v error -nostdin -y -i "$mp4" -map 0:v:0 -map 0:a:0 \
    -vf "vidstabtransform=input=$WORK/$s.trf:smoothing=$SMOOTHING:optzoom=1:interpol=bicubic,unsharp=5:5:0.6:3:3:0.3" \
    -c:v libx264 -preset medium -crf 18 -profile:v high -level 3.0 -pix_fmt yuv420p -threads 8 \
    -g $((fps * 6)) -keyint_min $((fps * 6)) -sc_threshold 0 -c:a copy -movflags +faststart "$src/$name.mp4"
  # Same length, frame for frame, or don't swap.
  a=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$mp4"); b=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src/$name.mp4")
  awk -v a="$a" -v b="$b" 'BEGIN { exit (a - b > 0.5 || b - a > 0.5) }' || { echo "length changed ($a vs $b): not swapping" >&2; exit 1; }
  echo "$(date +%T) package   $name"
  rm -rf "$WORK/hls-$s"; mkdir -p "$WORK/hls-$s"
  "$HERE/package-hls.sh" "$src" "$WORK/hls-$s" >/dev/null
  [ -f "$WORK/hls-$s/$s/master.m3u8" ] || { echo "packaging failed" >&2; exit 1; }
  # Swap in: the page keeps playing the old folder until this rename.
  [ -d "$REPLACED/$s" ] || mv "$HLS/$s" "$REPLACED/$s"
  rm -rf "$HLS/$s"; mv "$WORK/hls-$s/$s" "$HLS/$s"
  rm -rf "$WORK/hls-$s" "$WORK/$s.trf"
  echo "$(date +%T) done      $name  (original stream kept in $REPLACED/$s)"
done

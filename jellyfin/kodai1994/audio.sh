#!/usr/bin/env bash
# Kodai 1994: clearer sound for the members' stream. Only the audio changes: both video
# renditions are copied bit for bit and cut at the same keyframes, so chapters, events and
# face-identification moments still line up, and nothing is re-encoded but the sound.
#
#   1. clean:  80 Hz high-pass (rumble, handling, camera motor) and notches at 50/100/150/200 Hz
#              (mains hum). No broadband noise reduction: the background in these recordings is
#              crowd, wind and room, not hiss, and denoising measured no gain;
#   2. level:  one fixed gain per recording to TARGET LUFS, measured after cleaning, so every
#              recording plays as loud as the next and pauses stay as quiet as they were;
#   3. even:   gentle compression (2:1 above -24 dB), so a distant speaker is easier to follow,
#              then a limiter under full scale: the AAC encode overshoots it, by about 2 dB at
#              128 kbps (hi: ceiling -4 dB) and about 4 dB at 64 kbps (lo: ceiling -7 dB).
# Writes audio.json in the folder (what was done). The folder it replaces is kept in
# REPLACED so it can be put back.
#
# Usage: jellyfin/kodai1994/audio.sh <slug> ...        (DRY=1: build in WORK, don't swap)
# Undo:  rm -rf "$HLS/<slug>" && mv "$REPLACED/<slug>" "$HLS/<slug>"
set -euo pipefail

HLS=${HLS:-"$HOME/media/kodai1994-hls"}
WORK=${WORK:-"$HOME/media/kodai1994-audio"}
REPLACED=${REPLACED:-"$HOME/media/kodai1994-replaced/hls-audio"}
TARGET=${TARGET:--18}
VERSION=1
CLEAN="highpass=f=80:poles=2,bandreject=f=50:width_type=q:w=10,bandreject=f=100:width_type=q:w=12,bandreject=f=150:width_type=q:w=12,bandreject=f=200:width_type=q:w=12"
EVEN="acompressor=threshold=-24dB:ratio=2:attack=15:release=300:knee=6:makeup=1.5"
mkdir -p "$WORK" "$REPLACED"

dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

for s in "$@"; do
  src="$HLS/$s"
  [ -f "$src/master.m3u8" ] || { echo "no stream for $s" >&2; exit 1; }
  [ -f "$src/audio.json" ] && { echo "$(date +%T) skip      $s (sound already cleaned)"; continue; }
  echo "$(date +%T) measure   $s"
  I=$(nice -n 15 ffmpeg -nostdin -i "$src/hi/index.m3u8" -vn -af "$CLEAN,ebur128" -f null - 2>&1 | awk '/ I:/ {v=$2} END {print v}')
  awk -v i="$I" 'BEGIN { exit !(i + 0 < -5 && i + 0 > -70) }' || { echo "couldn't measure the loudness ($I)" >&2; exit 1; }
  gain=$(awk -v t="$TARGET" -v i="$I" 'BEGIN { printf "%.1f", t - i }')
  out="$WORK/$s"; rm -rf "$out"; mkdir -p "$out"
  # Everything but the two renditions (master playlist, thumbnail, storyboard seek previews) as it was.
  find "$src" -mindepth 1 -maxdepth 1 ! -name hi ! -name lo ! -name audio.json -exec cp -a {} "$out/" \;
  for r in hi lo; do
    [ -f "$src/$r/index.m3u8" ] || continue
    echo "$(date +%T) $r        $s  (gain ${gain} dB)"
    if [ "$r" = hi ]; then br=128k; lim=0.63; else br=64k; lim=0.45; fi
    mkdir -p "$out/$r"
    nice -n 15 ffmpeg -v error -nostdin -y -i "$src/$r/index.m3u8" -map 0:v:0 -map 0:a:0 -c:v copy \
      -af "$CLEAN,volume=${gain}dB,$EVEN,alimiter=limit=$lim:level=false" -ar 48000 -c:a aac -b:a "$br" \
      -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename "$out/$r/%05d.ts" "$out/$r/index.m3u8"
    # Same length and the same segments, or don't swap.
    a=$(dur "$src/$r/index.m3u8"); b=$(dur "$out/$r/index.m3u8")
    awk -v a="$a" -v b="$b" 'BEGIN { exit (a - b > 0.5 || b - a > 0.5) }' || { echo "$r length changed ($a vs $b): not swapping" >&2; exit 1; }
    n1=$(grep -c '^#EXTINF' "$src/$r/index.m3u8"); n2=$(grep -c '^#EXTINF' "$out/$r/index.m3u8")
    [ "$n1" = "$n2" ] || { echo "$r segments changed ($n1 vs $n2): not swapping" >&2; exit 1; }
  done
  printf '{"version": %d, "measuredLufs": %s, "gainDb": %s, "targetLufs": %s, "at": "%s"}\n' "$VERSION" "$I" "$gain" "$TARGET" "$(date -Is)" > "$out/audio.json"
  if [ "${DRY:-}" = 1 ]; then echo "$(date +%T) built     $s in $out (DRY: not swapped)"; continue; fi
  # Swap in: the page keeps playing the old folder until this rename.
  [ -d "$REPLACED/$s" ] || mv "$src" "$REPLACED/$s"
  rm -rf "$src"; mv "$out" "$src"
  echo "$(date +%T) done      $s  (previous stream kept in $REPLACED/$s)"
done

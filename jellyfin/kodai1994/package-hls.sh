#!/usr/bin/env bash
# Kodai 1994 collection: package each web MP4 as adaptive HLS for the collection page.
#
# The page streams HLS only (no single downloadable file), and the gateway serves the
# segments to signed-in members of the library. Two renditions let ~100 viewers share
# this machine's ~40-50 Mbit/s uplink:
#   hi  640x480  the existing H.264 stream, copied (no re-encode)    ~1.4 Mbit/s
#   lo  480x360  re-encoded, keyframes aligned with hi for switching  ~0.4 Mbit/s
#
#   SRC  folder with the web MP4s produced by transcode.sh
#   DEST HLS output, one folder per video: <slug>/{master.m3u8,hi/,lo/}
#
# Usage: jellyfin/kodai1994/package-hls.sh [SRC] [DEST]   (JOBS=n packages n videos at once; default 1)
# Safe to re-run: finished videos are skipped; work happens in ".<slug>.tmp" and is
# renamed into place only when complete. ready.json lists the finished slugs.
set -euo pipefail

SRC=${1:-"$HOME/media/kodai1994"}
DEST=${2:-"$HOME/media/kodai1994-hls"}
mkdir -p "$DEST"

# Must match slug() in site/index.html.
slug() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g'; }

# A landscape still for the page (the embedded posters are portrait title cards):
# one frame 15% of the way in, past the tape's opening.
thumb() {
  local mp4="$1" out="$2" dur
  [ -f "$out/thumb.jpg" ] && return 0
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$mp4")
  ffmpeg -v error -nostdin -y -ss "$(awk -v d="$dur" 'BEGIN { printf "%.0f", d * 0.15 }')" -i "$mp4" \
    -frames:v 1 -q:v 3 "$out/.thumb.jpg" && mv "$out/.thumb.jpg" "$out/thumb.jpg"
}

# Seek previews: one 160x120 frame every 10 s, tiled 10x10 per sheet, plus an index for
# the page's scrub bar. Decodes keyframes only, so it takes about a minute per tape.
storyboard() {
  local mp4="$1" out="$2" dur sheets
  [ -f "$out/storyboard/storyboard.json" ] && return 0
  rm -rf "$out/.storyboard"; mkdir -p "$out/.storyboard"
  nice -n 19 ffmpeg -v error -nostdin -y -skip_frame nokey -i "$mp4" -an \
    -vf "fps=1/10,scale=160:120,tile=10x10" -q:v 5 "$out/.storyboard/sb-%03d.jpg"
  sheets=$(find "$out/.storyboard" -name 'sb-*.jpg' | wc -l)
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$mp4")
  printf '{"interval":10,"cols":10,"rows":10,"width":160,"height":120,"sheets":%d,"duration":%s}\n' "$sheets" "$dur" > "$out/.storyboard/storyboard.json"
  chmod 755 "$out/.storyboard"; chmod 644 "$out/.storyboard"/*
  rm -rf "$out/storyboard"; mv "$out/.storyboard" "$out/storyboard"
}

package() {
  local mp4="$1" name slug out tmp kf
  name=$(basename "$mp4" .mp4)
  slug=$(slug "$name")
  out="$DEST/$slug"
  if [ -f "$out/master.m3u8" ]; then
    thumb "$mp4" "$out"
    storyboard "$mp4" "$out"
    return 0
  fi
  echo "hls   $name"
  tmp="$DEST/.$slug.tmp"
  rm -rf "$tmp"; mkdir -p "$tmp/hi" "$tmp/lo"

  # hi: cut the existing stream at its keyframes.
  ffmpeg -v error -nostdin -y -i "$mp4" -map 0:v:0 -map 0:a:0 -c copy \
    -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename "$tmp/hi/%05d.ts" "$tmp/hi/index.m3u8"

  # lo: keyframes only where hi has them, so every segment boundary lines up.
  kf=$(ffprobe -v error -select_streams v:0 -skip_frame nokey -show_entries frame=pts_time -of csv=p=0 "$mp4" | grep -oE '^[0-9]+(\.[0-9]+)?' | paste -sd, -)
  nice -n 19 ffmpeg -v error -nostdin -y -i "$mp4" -map 0:v:0 -map 0:a:0 \
    -vf scale=480:360 -c:v libx264 -preset medium -profile:v high -level 3.0 -pix_fmt yuv420p -threads 4 \
    -b:v 330k -maxrate 400k -bufsize 800k -g 600 -sc_threshold 0 -force_key_frames "$kf" \
    -c:a aac -b:a 64k \
    -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename "$tmp/lo/%05d.ts" "$tmp/lo/index.m3u8"

  # Lowest first so players that ignore ABR hints start on the rendition everyone can get.
  cat > "$tmp/master.m3u8" <<EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=480000,AVERAGE-BANDWIDTH=400000,RESOLUTION=480x360,CODECS="avc1.64001e,mp4a.40.2"
lo/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1900000,AVERAGE-BANDWIDTH=1450000,RESOLUTION=640x480,CODECS="avc1.64001e,mp4a.40.2"
hi/index.m3u8
EOF
  thumb "$mp4" "$tmp"
  storyboard "$mp4" "$tmp"
  mv "$tmp" "$out"
  write_ready
  echo "ready $name"
}

# Finished videos, for the page to tell "ready" from "still processing". Rewritten
# after every video (atomically, so parallel jobs can't leave a half-written file).
write_ready() {
  local tmpf
  tmpf=$(mktemp "$DEST/.ready.XXXXXX")
  find "$DEST" -mindepth 2 -maxdepth 2 -name master.m3u8 -printf '%h\n' | xargs -r -n1 basename | sort |
    python3 -I -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))' > "$tmpf"
  chmod 644 "$tmpf"
  mv "$tmpf" "$DEST/ready.json"
}

export DEST
export -f slug thumb storyboard package write_ready
find "$SRC" -maxdepth 1 -name '*.mp4' -print0 | sort -z | xargs -0 -r -n 1 -P "${JOBS:-1}" bash -c 'package "$1"' _
write_ready

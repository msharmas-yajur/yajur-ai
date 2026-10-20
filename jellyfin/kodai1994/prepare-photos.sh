#!/usr/bin/env bash
# Kodai 1994 collection: prepare the photographs for the page's Photos view.
#
# Copies every JPEG/PNG from SRC into DEST (served to signed-in members only, next to
# the HLS streams), skipping exact duplicates, stripping metadata (EXIF, GPS, phone
# model), and making two sizes per photo:
#   NN.jpg        longest edge ≤ 2048 px, for the full-screen viewer
#   NN-thumb.jpg  longest edge ≤ 640 px, for the grid
# photos.json lists them in order: alphabetical by source filename (the WhatsApp
# exports sort by the time they were sent; "KODAI1994.jpeg" sorts first).
#
# Usage: jellyfin/kodai1994/prepare-photos.sh [SRC] [DEST]
# Re-running rebuilds DEST from scratch (photos are small).
set -euo pipefail

SRC=${1:-"$HOME/Downloads/Kodai - 1994"}
DEST=${2:-"$HOME/media/kodai1994-hls/photos"}
tmp=$(mktemp -d "$(dirname "$DEST")/.photos.XXXXXX")
trap 'rm -rf "$tmp"' EXIT

declare -A seen
n=0
entries=()
while IFS= read -r -d '' f; do
  sum=$(md5sum < "$f" | cut -d' ' -f1)
  [ -n "${seen[$sum]:-}" ] && { echo "skip duplicate: $(basename "$f")"; continue; }
  seen[$sum]=1
  n=$((n + 1)); id=$(printf '%02d' "$n")
  ffmpeg -v error -nostdin -y -i "$f" -map_metadata -1 \
    -vf "scale='if(gt(iw,ih),min(2048,iw),-2)':'if(gt(iw,ih),-2,min(2048,ih))'" -q:v 3 "$tmp/$id.jpg"
  ffmpeg -v error -nostdin -y -i "$f" -map_metadata -1 \
    -vf "scale='if(gt(iw,ih),min(640,iw),-2)':'if(gt(iw,ih),-2,min(640,ih))'" -q:v 4 "$tmp/$id-thumb.jpg"
  wh=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$tmp/$id.jpg")
  entries+=("$id,$wh")
  echo "photo $id  ${wh/,/x}  $(basename "$f")"
done < <(find "$SRC" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0 | sort -z)

printf '%s\n' "${entries[@]}" | python3 -I -c '
import json, sys
out = []
for line in sys.stdin:
    if not line.strip(): continue
    pid, w, h = line.strip().split(",")
    out.append({"id": pid, "src": pid + ".jpg", "thumb": pid + "-thumb.jpg", "w": int(w), "h": int(h)})
print(json.dumps(out))' > "$tmp/photos.json"

chmod 755 "$tmp"; chmod 644 "$tmp"/*
rm -rf "$DEST.old"; [ -d "$DEST" ] && mv "$DEST" "$DEST.old"
mv "$tmp" "$DEST"; rm -rf "$DEST.old"
trap - EXIT
echo "$n photos in $DEST"

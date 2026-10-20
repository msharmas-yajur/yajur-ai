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
# It also writes small square crops (320 px, metadata stripped) to PUBLIC for the
# spiral on the sign-in page. Those are visible to anyone with the link; the full-size
# photos stay members-only. Set PUBLIC="" to skip them.
#
# Photos members uploaded on the page (ids 101 and up, added by faceid/worker.py) are kept:
# their files and photos.json entries carry over into the rebuilt DEST. They never go into
# the public spiral. After a rebuild, restart the worker (docker restart yajur-kodai-faceid)
# so it sees the new folder.
#
# Usage: jellyfin/kodai1994/prepare-photos.sh [SRC] [DEST]
# Re-running rebuilds DEST (and PUBLIC) from scratch (photos are small).
set -euo pipefail

SRC=${1:-"$HOME/Downloads/Kodai - 1994"}
DEST=${2:-"$HOME/media/kodai1994-hls/photos"}
PUBLIC=${PUBLIC-"$HOME/media/kodai1994-brand/spiral"}
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
try:  # keep photos members uploaded (ids from 101)
    out += [p for p in json.load(open(sys.argv[1])) if int(p["id"]) >= 101]
except FileNotFoundError:
    pass
print(json.dumps(out))' "$DEST/photos.json" > "$tmp/photos.json"
if [ -d "$DEST" ]; then
  find "$DEST" -maxdepth 1 -type f -regex '.*/[1-9][0-9][0-9]\(-thumb\)?\.jpg' -exec cp -p {} "$tmp/" \;
fi

chmod 755 "$tmp"; chmod 644 "$tmp"/*

# Public sign-in spiral: square crops from the thumbnails.
if [ -n "$PUBLIC" ]; then
  ptmp=$(mktemp -d "$(dirname "$PUBLIC")/.spiral.XXXXXX")
  ids=()
  for e in "${entries[@]}"; do
    id=${e%%,*}
    ffmpeg -v error -nostdin -y -i "$tmp/$id-thumb.jpg" -map_metadata -1 \
      -vf "scale=320:320:force_original_aspect_ratio=increase,crop=320:320" -q:v 5 "$ptmp/$id.jpg"
    ids+=("$id")
  done
  printf '%s\n' "${ids[@]}" | python3 -I -c 'import json,sys; print(json.dumps([l.strip() + ".jpg" for l in sys.stdin if l.strip()]))' > "$ptmp/spiral.json"
  chmod 755 "$ptmp"; chmod 644 "$ptmp"/*
  rm -rf "$PUBLIC.old"; [ -d "$PUBLIC" ] && mv "$PUBLIC" "$PUBLIC.old"
  mv "$ptmp" "$PUBLIC"; rm -rf "$PUBLIC.old"
  echo "${#ids[@]} public spiral crops in $PUBLIC"
fi

rm -rf "$DEST.old"; [ -d "$DEST" ] && mv "$DEST" "$DEST.old"
mv "$tmp" "$DEST"; rm -rf "$DEST.old"
trap - EXIT
echo "$n photos in $DEST"

#!/usr/bin/env bash
# Kodai 1994 collection: AI-upscaled copies of the photographs (Real-ESRGAN).
#
# General-purpose upscaling only (realesrgan-x4plus): it sharpens detail that's in the
# photo and cleans compression artefacts. No face restoration (GFPGAN/CodeFormer): those
# invent facial detail, which would mislead people identifying faces and would teach a
# future face matcher faces that never existed. Face boxes are stored as fractions of the
# photo, so they line up on these copies too.
#
# Reads the source photos in the same order and with the same duplicate skipping as
# prepare-photos.sh, so NN.jpg here is the same photo as photos/NN.jpg.
#   SRC   folder with the original photos (left untouched)
#   DEST  enhanced copies, NN.jpg at 2x the photo's size (members only, next to photos/)
#   ESRGAN  path to the realesrgan-ncnn-vulkan folder (binary + models/)
#
# Usage: jellyfin/kodai1994/enhance-photos.sh [SRC] [DEST]
set -euo pipefail

SRC=${1:-"$HOME/Downloads/Kodai - 1994"}
DEST=${2:-"$HOME/media/kodai1994-hls/photos-enhanced"}
ESRGAN=${ESRGAN:-"$HOME/tools/realesrgan"}
OVERRIDES=${OVERRIDES:-"$HOME/media/kodai1994-overrides"}
GPU=${GPU:-0}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$DEST"

declare -A seen
n=0
while IFS= read -r -d '' f; do
  sum=$(md5sum < "$f" | cut -d' ' -f1)
  [ -n "${seen[$sum]:-}" ] && continue
  seen[$sum]=1
  n=$((n + 1)); id=$(printf '%02d' "$n")
  # A real high-res scan replaces this photo (prepare-photos.sh OVERRIDES): better than an
  # upscale, so no enhanced copy; the viewer falls back to the photo itself.
  if [ -n "$(find "$OVERRIDES" -maxdepth 1 -type f -name "$id.*" 2>/dev/null | head -1)" ]; then
    rm -f "$DEST/$id.jpg"; echo "skip  $id (replaced by a scan)"; continue
  fi
  [ -s "$DEST/$id.jpg" ] && { echo "skip  $id"; continue; }
  wh=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f")
  w=${wh%,*}; h=${wh#*,}
  # flatten to a plain RGB PNG first (strips metadata; ESRGAN reads PNG/JPG/WebP)
  ffmpeg -v error -nostdin -y -i "$f" -map_metadata -1 -pix_fmt rgb24 "$work/in.png"
  t0=$(date +%s)
  "$ESRGAN/realesrgan-ncnn-vulkan" -i "$work/in.png" -o "$work/x4.png" -n realesrgan-x4plus -m "$ESRGAN/models" -g "$GPU" >/dev/null 2>&1
  # 4x is more than the eye or the page needs; keep 2x, downscaled with Lanczos
  ffmpeg -v error -nostdin -y -i "$work/x4.png" -vf "scale=$((w * 2)):$((h * 2)):flags=lanczos" -q:v 2 "$work/out.jpg"
  chmod 644 "$work/out.jpg"; mv "$work/out.jpg" "$DEST/$id.jpg"
  echo "photo $id  ${w}x${h} -> $((w * 2))x$((h * 2))  $(( $(date +%s) - t0 ))s  $(basename "$f")"
done < <(find "$SRC" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0 | sort -z)
chmod 755 "$DEST"
echo "$n photos; enhanced copies in $DEST"

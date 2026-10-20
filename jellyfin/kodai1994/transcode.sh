#!/usr/bin/env bash
# Kodai 1994 collection: convert the digitised VHS captures into web-ready MP4s.
#
# The source files are MPEG-4 Part 2 (640x480), which no browser plays natively.
# Converting once to H.264/AAC with +faststart lets every browser direct-play the
# files, so Jellyfin never has to transcode live and seeking is instant.
#
#   SRC  folder with the original captures (left untouched)
#   DEST Jellyfin library folder (served read-only at /media/kodai1994)
#
# Usage: jellyfin/kodai1994/transcode.sh [SRC] [DEST]
# Safe to re-run: finished files are skipped; partial output is written as
# ".name.part" (ignored by Jellyfin) and renamed only when ffmpeg succeeds.
set -euo pipefail

SRC=${1:-"$HOME/Downloads/Kodai - 1994"}
DEST=${2:-"$HOME/media/kodai1994"}
JOBS=${JOBS:-4}
mkdir -p "$DEST"

# source file (without "Kodai - " prefix)  |  published title
# Exact duplicates in the source folder ("(1)", "(2)" copies) are omitted.
# "May 3rd 1995" is a filename typo: the file's own title tag says "May 3rd 1994".
MAP=$(cat <<'EOF'
April 3rd Cassette No.2.mp4|1994-04-03 - April 3rd (Cassette No. 2)
April 6th & 7th Birla House  -  Distribution .mp4|1994-04-06 - April 6th & 7th - Birla House, Distribution
April 11th 1994.mp4|1994-04-11 - April 11th
April 14th 1994.mp4|1994-04-14 - April 14th
April 14th 1994 - Discourse (Tamil New Year).mp4|1994-04-14 - April 14th - Discourse (Tamil New Year)
April 14th & 18th (Tamil New Year & Dr. Mahajn's House).mp4|1994-04-14 - April 14th & 18th - Tamil New Year & Dr. Mahajan's House
April 14th & 18th Dr. Mahajan's, Mr. Naidu's & Mr. Mallik's House.mp4|1994-04-18 - April 14th & 18th - Dr. Mahajan's, Mr. Naidu's & Mr. Mallik's Houses
April 1994 Mr. Mallik's House & Mr. Naidu's House.mp4|1994-04 - April (date not recorded) - Mr. Mallik's & Mr. Naidu's Houses
April 21st.mp4|1994-04-21 - April 21st
April 29th.mp4|1994-04-29 - April 29th
May 1st 1994 India's Patriotic, Buddha, Buddha's Ring, Radha & Krishna Questions & Answers.mp4|1994-05-01 - May 1st - Questions & Answers (India's Patriotic, Buddha, Buddha's Ring, Radha & Krishna)
May 1st & 2nd 1994.mp4|1994-05-01 - May 1st & 2nd
May 2nd 1994.mp4|1994-05-02 - May 2nd
May 2nd 1994 Picnic.mp4|1994-05-02 - May 2nd - Picnic
May 2nd 1994 Picnic (Raj).mp4|1994-05-02 - May 2nd - Picnic (Raj)
May 2nd & 3rd (2nd Evening Discourse, 3rd Morning Discourse).mp4|1994-05-02 - May 2nd & 3rd - Evening & Morning Discourses
May 3rd 1994.mp4|1994-05-03 - May 3rd
May 3rd 1995.mp4|1994-05-03 - May 3rd (second recording)
EOF
)

convert() {
  local src="$1" title="$2" dest="$3"
  local out="$dest/$title.mp4" part="$dest/.$title.part"
  [ -s "$out" ] && { echo "skip  $title"; return 0; }
  echo "start $title"
  # Each capture carries a portrait title card as an attached picture; keep it as the poster.
  ffmpeg -v error -y -i "$src" -map 0:v:1 -frames:v 1 "$dest/$title-poster.jpg" 2>/dev/null || true
  # Light 3D denoise takes the VHS grain out (~40% smaller at the same visual quality).
  nice -n 19 ffmpeg -v error -nostdin -y -i "$src" \
    -map 0:v:0 -map 0:a:0 -map_metadata -1 -metadata title="${title#* - }" \
    -vf hqdn3d=2:1.5:4:3 -c:v libx264 -preset medium -crf 23 -profile:v high -pix_fmt yuv420p -threads 4 \
    -c:a copy -movflags +faststart -f mp4 "$part"
  mv "$part" "$out"
  echo "done  $title"
}
export -f convert

# Fail before encoding anything if a source file is missing.
while IFS='|' read -r file _; do
  [ -f "$SRC/Kodai - $file" ] || { echo "MISSING: $SRC/Kodai - $file" >&2; exit 1; }
done <<<"$MAP"

while IFS='|' read -r file title; do
  printf '%s\0%s\0' "$SRC/Kodai - $file" "$title"
done <<<"$MAP" | xargs -0 -n 2 -P "$JOBS" bash -c 'convert "$1" "$2" "'"$DEST"'"' _

echo "ALL DONE: $(ls "$DEST"/*.mp4 | wc -l) videos in $DEST"

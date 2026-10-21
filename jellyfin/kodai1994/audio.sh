#!/usr/bin/env bash
# Kodai 1994: three sounds for every recording, chosen in the player while it plays. The focus
# is the spoken word; the video is never re-encoded.
#
# The stream becomes video-only renditions (hi, lo: copied bit for bit) plus alternate audio
# (HLS EXT-X-MEDIA), a pair of bitrates for each sound:
#   orig      the original sound, copied;
#   enh       Enhanced: the right treatment at each moment, as a sound engineer would set it.
#             Indoors (the default): hum and rumble out (80 Hz high-pass; 50/100/150/200 Hz
#             notches), one gain for the whole recording to TARGET LUFS (so pauses stay as quiet
#             as they were), gentle compression (2:1 above -24 dB) so a distant speaker is
#             easier to follow. In the parts marked outdoor (table sound_sections, marked by
#             moderators in the player) the voice treatment below, with FADE s crossfades;
#   voice     Voice focus, the outdoor treatment throughout: hum out and the same gain, then the
#             voice brought forward over crowd and wind: low end cut (150 Hz), boom trimmed
#             (250 Hz), the range where words are clearest lifted (2.8 kHz), the top above 7 kHz
#             cut, and no compression, which would lift the background too.
# Both end in a limiter under full scale (the AAC encode overshoots it by about 2 dB at
# 128 kbps, 4 dB at 64 kbps). No broadband noise reduction: the background in these recordings
# is crowd, wind and room, not hiss, and denoising measured no gain. Indoor and outdoor are
# marked by people, not guessed: neither the sound nor the picture told them apart reliably.
#
# audio.json in the folder records what was done ("sig": the treatments, "partsSig": the
# outdoor parts); audio-queue.sh runs this again when either changes, rebuilding only what
# depends on it. The folder from before the first run is kept in REPLACED so it can be put back.
#
# Usage: jellyfin/kodai1994/audio.sh <slug> ...    (DRY=1: build in WORK, don't swap; FORCE=1: rebuild)
# Undo:  rm -rf "$HLS/<slug>" && mv "$REPLACED/<slug>" "$HLS/<slug>"
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
HLS=${HLS:-"$HOME/media/kodai1994-hls"}
DB=${DB:-"$HOME/services/yajur-videos/community-data/community.db"}
WORK=${WORK:-"$HOME/media/kodai1994-audio"}
REPLACED=${REPLACED:-"$HOME/media/kodai1994-replaced/hls-audio"}
TARGET=${TARGET:--18}
VERSION=2
FADE=1
CLEAN="highpass=f=80:poles=2,bandreject=f=50:width_type=q:w=10,bandreject=f=100:width_type=q:w=12,bandreject=f=150:width_type=q:w=12,bandreject=f=200:width_type=q:w=12"
ENH="acompressor=threshold=-24dB:ratio=2:attack=15:release=300:knee=6:makeup=1.5"
VOICE="highpass=f=150:poles=2,lowpass=f=7000:poles=2,equalizer=f=250:t=q:w=1:g=-3,equalizer=f=2800:t=q:w=1.2:g=5"
mkdir -p "$WORK" "$REPLACED"

dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
hls_out() { mkdir -p "$1"; printf '%s\n' -muxdelay 0 -muxpreload 0 -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename "$1/%05d.ts" "$1/index.m3u8"; }
# Timestamps exactly as they were (copied in; no mux delay added on the way out), so every
# track lines up with the video.
TS=(-copyts)

for s in "$@"; do
  src="$HLS/$s"
  [ -f "$src/master.m3u8" ] || { echo "no stream for $s" >&2; exit 1; }
  sig=$(printf '%s|%s|%s|%s|%s|%s' "$VERSION" "$TARGET" "$CLEAN" "$ENH" "$VOICE" "$FADE" | sha1sum | cut -c1-16)
  # The outdoor parts, in seconds from the start ("start end" per line)
  parts=$(python3 -I "$HERE/sound-sections.py" "$DB" "video:$s")
  nparts=$(printf '%s' "$parts" | grep -c . || true)
  psig=$(printf '%s' "$parts" | sha1sum | cut -c1-16)
  old_sig=; old_psig=; old_gain=; old_lufs=
  if [ -f "$src/audio.json" ]; then
    read -r old_sig old_psig old_gain old_lufs < <(python3 -I -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("sig") or "-", d.get("partsSig") or "-", d.get("gainDb", ""), d.get("measuredLufs", ""))' "$src/audio.json")
  fi
  if [ "$old_sig" = "$sig" ] && [ "$old_psig" = "$psig" ] && [ "${FORCE:-}" != 1 ]; then echo "$(date +%T) skip      $s (up to date)"; continue; fi
  demuxed=$([ -f "$src/a-hi-orig/index.m3u8" ] && echo 1 || echo 0)
  # Only the outdoor parts changed: just Enhanced is rebuilt.
  kinds="enh voice"; [ "$demuxed" = 1 ] && [ "$old_sig" = "$sig" ] && [ "${FORCE:-}" != 1 ] && kinds="enh"
  out="$WORK/$s"; rm -rf "$out"

  if [ "$demuxed" = 1 ]; then
    # Only the processed sounds change: the rest is linked, not copied.
    cp -al "$src" "$out"; for k in $kinds; do rm -rf "$out"/a-*-"$k"; done; rm -f "$out/audio.json"
  else
    mkdir -p "$out"
    find "$src" -mindepth 1 -maxdepth 1 ! -name hi ! -name lo ! -name master.m3u8 ! -name audio.json -exec cp -a {} "$out/" \;
    for r in hi lo; do
      [ -f "$src/$r/index.m3u8" ] || continue
      echo "$(date +%T) split     $s $r"
      mapfile -t o < <(hls_out "$out/$r");        nice -n 15 ffmpeg -v error -nostdin -y "${TS[@]}" -i "$src/$r/index.m3u8" -map 0:v:0 -c copy "${o[@]}"
      mapfile -t o < <(hls_out "$out/a-$r-orig"); nice -n 15 ffmpeg -v error -nostdin -y "${TS[@]}" -i "$src/$r/index.m3u8" -map 0:a:0 -c copy "${o[@]}"
      n1=$(grep -c '^#EXTINF' "$src/$r/index.m3u8"); n2=$(grep -c '^#EXTINF' "$out/$r/index.m3u8")
      [ "$n1" = "$n2" ] || { echo "$r segments changed ($n1 vs $n2): not swapping" >&2; exit 1; }
    done
  fi

  # One gain for the whole recording (measured once: the sound it's measured on never changes)
  if [ -n "$old_gain" ] && [ "$demuxed" = 1 ]; then gain=$old_gain; I=$old_lufs; else
    echo "$(date +%T) measure   $s"
    I=$(nice -n 15 ffmpeg -nostdin -i "$out/a-hi-orig/index.m3u8" -af "$CLEAN,ebur128" -f null - 2>&1 | awk '/ I:/ {v=$2} END {print v}')
    awk -v i="$I" 'BEGIN { exit !(i + 0 < -5 && i + 0 > -70) }' || { echo "couldn't measure the loudness ($I)" >&2; exit 1; }
    gain=$(awk -v t="$TARGET" -v i="$I" 'BEGIN { printf "%.1f", t - i }')
  fi

  for r in hi lo; do
    [ -f "$out/a-$r-orig/index.m3u8" ] || continue
    if [ "$r" = hi ]; then br=128k; lim=0.63; else br=64k; lim=0.45; fi
    for k in $kinds; do
      if [ "$k" = voice ]; then
        graph="[0:a]$CLEAN,volume=${gain}dB,$VOICE,alimiter=limit=$lim:level=false[out]"
      elif [ "$nparts" = 0 ]; then
        graph="[0:a]$CLEAN,volume=${gain}dB,$ENH,alimiter=limit=$lim:level=false[out]"
      else
        # w = how outdoor this moment is: 1 inside a marked part, 0 outside, ramping over FADE s.
        # t is the timestamp (copied from the recording): the parts are from its first one, t0.
        t0=$(ffprobe -v error -show_entries stream=start_time -of csv=p=0 "$out/a-$r-orig/00000.ts" | head -1)
        w=$(awk -v t0="$t0" -v f="$FADE" '{ e = e (e ? "+" : "") sprintf("clip(min((t-%s-%s)/%s+0.5\\,(%s-(t-%s))/%s+0.5)\\,0\\,1)", t0, $1, f, $2, t0, f) } END { print "min(1\\," e ")" }' <<< "$parts")
        graph="[0:a]$CLEAN,volume=${gain}dB,asplit=2[x][y];[x]$ENH,volume=volume=1-$w:eval=frame[i];[y]$VOICE,volume=volume=$w:eval=frame[o];[i][o]amix=inputs=2:normalize=0,alimiter=limit=$lim:level=false[out]"
      fi
      echo "$(date +%T) $k$( [ $k = enh ] && echo '  ' || echo '')     $s $r  (gain ${gain} dB$( [ $k = enh ] && echo ", $nparts outdoor parts"))"
      mapfile -t o < <(hls_out "$out/a-$r-$k")
      nice -n 15 ffmpeg -v error -nostdin -y "${TS[@]}" -i "$out/a-$r-orig/index.m3u8" \
        -filter_complex "$graph" -map "[out]" -ar 48000 -c:a aac -b:a "$br" "${o[@]}"
      a=$(dur "$out/a-$r-orig/index.m3u8"); b=$(dur "$out/a-$r-$k/index.m3u8")
      awk -v a="$a" -v b="$b" 'BEGIN { exit (a - b > 0.5 || b - a > 0.5) }' || { echo "$r $k length changed ($a vs $b): not swapping" >&2; exit 1; }
    done
  done

  # The three sounds, Enhanced first (the default); each video rendition with its bitrate's set.
  {
    echo '#EXTM3U'; echo '#EXT-X-VERSION:4'
    for r in lo hi; do
      [ -d "$out/a-$r-orig" ] || continue
      echo "#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"$r\",NAME=\"Enhanced\",LANGUAGE=\"en\",DEFAULT=YES,AUTOSELECT=YES,URI=\"a-$r-enh/index.m3u8\""
      echo "#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"$r\",NAME=\"Voice focus\",LANGUAGE=\"en\",DEFAULT=NO,AUTOSELECT=YES,URI=\"a-$r-voice/index.m3u8\""
      echo "#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"$r\",NAME=\"Original\",LANGUAGE=\"en\",DEFAULT=NO,AUTOSELECT=YES,URI=\"a-$r-orig/index.m3u8\""
    done
    # the video renditions as listed before (lowest first), now each pointing at its audio group
    awk '/^#EXT-X-STREAM-INF/ { inf = $0; sub(/,AUDIO="[a-z]+"/, "", inf); next } inf && /index\.m3u8$/ { split($0, p, "/"); print inf ",AUDIO=\"" p[1] "\""; print; inf = "" }' "$src/master.m3u8"
  } > "$out/master.m3u8"
  grep -q 'AUDIO="lo"' "$out/master.m3u8" && grep -q 'AUDIO="hi"' "$out/master.m3u8" || { echo "master playlist incomplete: not swapping" >&2; exit 1; }
  printf '{"version": %d, "sig": "%s", "partsSig": "%s", "outdoorParts": %d, "measuredLufs": %s, "gainDb": %s, "targetLufs": %s, "at": "%s"}\n' \
    "$VERSION" "$sig" "$psig" "$nparts" "$I" "$gain" "$TARGET" "$(date -Is)" > "$out/audio.json"

  if [ "${DRY:-}" = 1 ]; then echo "$(date +%T) built     $s in $out (DRY: not swapped)"; continue; fi
  # Swap in: the page keeps playing the old folder until this rename.
  [ -d "$REPLACED/$s" ] || cp -al "$src" "$REPLACED/$s"
  rm -rf "$src"; mv "$out" "$src"
  echo "$(date +%T) done      $s  (folder from before the first run kept in $REPLACED/$s)"
done

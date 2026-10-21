#!/usr/bin/env python3
"""Kodai 1994: prepare the recordings members add as memories (POST /memory-media).

Each one waiting (memory_media.status = 'pending') becomes the copy members play, in
MEDIA_DIR/kodai1994-memories/rec/ (served members-only, like the PDFs):
  video  H.264 + AAC MP4, at most 1280 wide, plus a poster frame (JPEG)
  sound  AAC M4A
both levelled to the same loudness, and cut at 10 minutes. The recording as sent stays in
MEDIA_DIR/kodai1994-uploads/recordings/ (backed up; never served).

Runs on the host (ffmpeg is here), every minute from kodai1994-media.timer; does nothing
when nothing waits. Settings from the stack's .env: MEDIA_DIR.
Usage: jellyfin/kodai1994/media-queue.py   (or with ids, to redo those)
"""
import json
import os
import secrets
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone

STACK = os.environ.get("VIDEOS_STACK_DIR", os.path.expanduser("~/services/yajur-videos"))
MAX_S = 600            # longest recording kept, seconds
LOUDNESS = "loudnorm=I=-18:TP=-2:LRA=11"


def env_get(key):
    val = ""
    with open(os.path.join(STACK, ".env")) as f:
        for line in f:
            if line.startswith(key + "="):
                val = line.split("=", 1)[1].strip()
    return val


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def run(cmd, timeout=1800):
    r = subprocess.run(["nice", "-n", "10"] + cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode:
        raise RuntimeError((r.stderr or r.stdout).strip().splitlines()[-1][:300] if (r.stderr or r.stdout).strip() else f"exit {r.returncode}")
    return r.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", path], 120)
    j = json.loads(out)
    kinds = {s.get("codec_type") for s in j.get("streams", [])}
    try:
        dur = float(j.get("format", {}).get("duration") or 0)
    except ValueError:
        dur = 0
    return kinds, dur


def prepare(row, src_dir, out_dir):
    src = os.path.join(src_dir, row["original"])
    kinds, dur = probe(src)
    if "audio" not in kinds and "video" not in kinds:
        raise RuntimeError("no sound or picture in the file")
    video = row["kind"] == "video" and "video" in kinds
    name = secrets.token_hex(16)
    os.makedirs(out_dir, exist_ok=True)
    tmp = os.path.join(out_dir, f".{name}.tmp" + (".mp4" if video else ".m4a"))
    common = ["ffmpeg", "-v", "error", "-nostdin", "-y", "-i", src, "-t", str(MAX_S)]
    audio = ["-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-af", LOUDNESS] if "audio" in kinds else ["-an"]
    try:
        if video:
            run(common + ["-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=w='min(1280,iw)':h=-2,format=yuv420p",
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-profile:v", "high", "-r", "30"]
                + audio + ["-movflags", "+faststart", "-f", "mp4", tmp])
        else:
            run(common + ["-vn"] + audio + ["-movflags", "+faststart", "-f", "mp4", tmp])
        _, out_dur = probe(tmp)
        file = f"rec/{name}.{'mp4' if video else 'm4a'}"
        poster = None
        if video:
            poster = f"rec/{name}.jpg"
            run(["ffmpeg", "-v", "error", "-nostdin", "-y", "-ss", str(min(1.0, out_dur / 2)), "-i", tmp,
                 "-frames:v", "1", "-vf", "scale=w='min(960,iw)':h=-2", "-q:v", "4", os.path.join(out_dir, f"{name}.jpg")], 120)
        os.replace(tmp, os.path.join(out_dir, os.path.basename(file)))
        return {"kind": "video" if video else "audio", "file": file, "poster": poster, "duration": round(out_dur or dur, 1)}
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def main(ids):
    # (REC_SRC, REC_OUT, DB_PATH: other folders, for tests and staging)
    media = os.environ.get("REC_SRC") or env_get("MEDIA_DIR")
    src_dir = os.environ.get("REC_SRC") or os.path.join(media, "kodai1994-uploads", "recordings")
    out_dir = os.environ.get("REC_OUT") or os.path.join(media, "kodai1994-memories", "rec")
    db = sqlite3.connect(os.environ.get("DB_PATH") or os.path.join(STACK, "community-data", "community.db"), timeout=30)
    db.row_factory = sqlite3.Row
    if not db.execute("SELECT 1 FROM sqlite_master WHERE name = 'memory_media'").fetchone():
        return 0
    rows = (db.execute("SELECT * FROM memory_media WHERE id IN (%s)" % ",".join("?" * len(ids)), ids).fetchall() if ids
            else db.execute("SELECT * FROM memory_media WHERE status = 'pending' ORDER BY id").fetchall())
    for row in rows:
        started = datetime.now()
        try:
            r = prepare(row, src_dir, out_dir)
            db.execute("UPDATE memory_media SET status = 'ready', kind = ?, file = ?, poster = ?, duration_s = ?, message = NULL, processed_at = ? WHERE id = ?",
                       (r["kind"], r["file"], r["poster"], r["duration"], now(), row["id"]))
            print(f"ready   {row['id']}: {r['kind']} {r['duration']} s → {r['file']} ({(datetime.now() - started).seconds} s)", flush=True)
        except Exception as e:   # the file couldn't be read: the member is told, and the queue moves on
            db.execute("UPDATE memory_media SET status = 'failed', message = ?, processed_at = ? WHERE id = ?",
                       ("This recording couldn't be read. Record it again, or choose another file.", now(), row["id"]))
            print(f"FAILED  {row['id']} ({row['original']}): {e}", flush=True)
        db.commit()
    return 0


if __name__ == "__main__":
    sys.exit(main([int(a) for a in sys.argv[1:]]))

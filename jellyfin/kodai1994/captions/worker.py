#!/usr/bin/env python3
"""Kodai 1994 captions worker: what was said in each recording, on this machine.

Runs the transcription queue (table caption_runs, filled by community/app.py when a
moderator presses "Make a transcript"), one recording at a time, and writes the lines to
caption_lines. Speech to text is Whisper large-v3-turbo through faster-whisper, int8 on
the CPU; nothing is sent anywhere (the container has no network).

How a recording is read (settled by a pilot on these tapes, October 2026):
  - the "Voice focus" sound (audio.sh) when there is one: speech stands out of the crowd
  - the language is sampled from 8 stretches across the recording and the most common one
    is used for the whole tape: switching language per 30 s made Whisper invent words
  - voice activity detection skips silence and music between talks
  - lines Whisper is unsure of are left out: very low confidence, likely not speech,
    repetitive (singing makes it loop), or in a script that isn't the language's
Lines a moderator corrected are kept when a recording is transcribed again.

Usage: worker.py              poll the queue forever
       worker.py --download   fetch the model into MODELS_DIR (needs the network), then exit
       worker.py --file PATH [--start S --length S]   print a transcript, for trying settings
"""
import collections
import os
import re
import sqlite3
import sys
import time
import traceback
import unicodedata
from datetime import datetime, timezone

DB_PATH = os.path.join(os.environ.get("DATA_DIR", "/data"), "community.db")
MODELS = os.environ.get("MODELS_DIR", "/models")
MODEL = os.environ.get("MODEL", "large-v3-turbo")
HLS = os.environ.get("HLS_DIR", "/media/hls")
THREADS = int(os.environ.get("THREADS") or 6)
RATE = 16000
SAMPLES, SAMPLE_S = 8, 30          # language: 8 stretches of 30 s
MIN_LOGPROB = -1.1                 # lines below this average log-probability are left out...
NO_SPEECH = 0.6                    # ...and lines Whisper thinks aren't speech, when also unsure
MAX_COMPRESSION = 2.4              # repetitive text (gzip ratio) is left out
SCRIPTS = {"en": "LATIN", "hi": "DEVANAGARI", "te": "TELUGU", "ta": "TAMIL", "kn": "KANNADA", "ml": "MALAYALAM", "mr": "DEVANAGARI"}


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def log(*a):
    print(now(), *a, flush=True)


def model_path():
    return os.path.join(MODELS, MODEL)


def load_model():
    from faster_whisper import WhisperModel
    return WhisperModel(model_path(), device="cpu", compute_type="int8", cpu_threads=THREADS)


def audio_for(slug):
    """The recording's sound to read: Voice focus, else the original, else the muxed stream."""
    for sub in ("a-hi-voice", "a-hi-orig", "hi"):
        p = os.path.join(HLS, slug, sub, "index.m3u8")
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"no stream for {slug}")


def decode(path):
    from faster_whisper import decode_audio
    return decode_audio(path, sampling_rate=RATE)


def language_of(model, audio):
    """The most common language over SAMPLES stretches with speech in them (and how sure)."""
    n = len(audio) // RATE
    votes = collections.Counter()
    for i in range(SAMPLES):
        start = int((i + 0.5) * n / SAMPLES - SAMPLE_S / 2)
        clip = audio[max(0, start) * RATE:(max(0, start) + SAMPLE_S) * RATE]
        if len(clip) < RATE * 5 or float(abs(clip).mean()) < 1e-3:
            continue
        lang, prob, _ = model.detect_language(clip)
        if prob >= 0.5:
            votes[lang] += prob
    if not votes:
        return "en", 0.0
    lang, score = votes.most_common(1)[0]
    return lang, score / sum(votes.values())


def wrong_script(text, lang):
    """True if most letters are in a script the language isn't written in (Whisper guessing)."""
    want = SCRIPTS.get(lang)
    if not want:
        return False
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return True
    other = sum(1 for c in letters if want not in unicodedata.name(c, ""))
    return other > len(letters) * 0.3


def keep(seg, lang):
    text = seg.text.strip()
    if len(re.sub(r"[\W_]", "", text)) < 2:
        return False
    if seg.avg_logprob < MIN_LOGPROB or (seg.no_speech_prob > NO_SPEECH and seg.avg_logprob < -0.7):
        return False
    if seg.compression_ratio > MAX_COMPRESSION:
        return False
    return not wrong_script(text, lang)


def transcribe(model, audio, lang, on_progress=None):
    """[(start, end, text, logprob)] for the recording, with Whisper's unsure lines left out."""
    segs, _ = model.transcribe(audio, language=lang, task="transcribe", beam_size=5, vad_filter=True,
                               vad_parameters={"min_silence_duration_ms": 700, "speech_pad_ms": 300},
                               condition_on_previous_text=False, temperature=[0.0, 0.2, 0.4])
    total = len(audio) / RATE or 1
    out, last = [], None
    for s in segs:
        if on_progress:
            on_progress(min(0.99, s.end / total))
        if not keep(s, lang):
            continue
        text = " ".join(s.text.split())
        if last and text == last[2] and s.start - last[1] < 10:   # the same words again: once is enough
            continue
        last = (round(s.start, 2), round(s.end, 2), text, round(s.avg_logprob, 3))
        out.append(last)
    return out


# ── the queue
def connect():
    db = sqlite3.connect(DB_PATH, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout = 30000")
    return db


class Cancelled(Exception):
    pass


def run_one(db, model, run):
    target = run["target"]
    slug = target.split(":", 1)[1]
    last = [0.0]

    def progress(frac, message=None):
        if frac - last[0] < 0.01 and message is None:
            return
        last[0] = frac
        db.execute("UPDATE caption_runs SET progress = ?, message = COALESCE(?, message) WHERE id = ?", (round(frac, 3), message, run["id"]))
        db.commit()
        if db.execute("SELECT status FROM caption_runs WHERE id = ?", (run["id"],)).fetchone()["status"] == "cancelled":
            raise Cancelled()

    progress(0.0, "Reading the sound")
    audio = decode(audio_for(slug))
    progress(0.01, "Finding the language")
    lang, sure = language_of(model, audio)
    db.execute("UPDATE caption_runs SET language = ?, model = ? WHERE id = ?", (lang, MODEL, run["id"]))
    progress(0.02, f"Listening ({lang})")
    t0 = time.time()
    lines = transcribe(model, audio, lang, lambda f: progress(0.02 + 0.97 * f, f"Listening ({lang})"))
    # Replace the machine's lines; keep the ones a moderator corrected (and drop machine lines over them)
    kept = db.execute("SELECT start_s, end_s FROM caption_lines WHERE target = ? AND edited_by IS NOT NULL", (target,)).fetchall()
    db.execute("DELETE FROM caption_lines WHERE target = ? AND edited_by IS NULL", (target,))
    t = now()
    rows = [(target, a, b, lang, text, text if lang == "en" else None, lp, t, t) for a, b, text, lp in lines
            if not any(k["start_s"] < b and k["end_s"] > a for k in kept)]
    db.executemany("INSERT INTO caption_lines (target, start_s, end_s, language, text, text_en, confidence, created_at, updated_at) "
                   "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)
    took = time.time() - t0
    msg = f"{len(rows)} lines ({lang}{'' if sure >= 0.7 else ', unsure'}); {len(audio) / RATE / 60:.0f} min in {took / 60:.0f} min"
    db.execute("UPDATE caption_runs SET status = 'done', progress = 1, message = ?, finished_at = ? WHERE id = ?", (msg, now(), run["id"]))
    db.commit()
    log(f"run {run['id']} {target}: {msg}")


def loop():
    while not os.path.exists(DB_PATH):
        time.sleep(5)
    db = connect()
    while not db.execute("SELECT 1 FROM sqlite_master WHERE name = 'caption_runs'").fetchone():
        time.sleep(5)   # the community service creates the tables
    db.execute("UPDATE caption_runs SET status = 'queued', progress = 0 WHERE status = 'running'")   # interrupted by a restart
    db.commit()
    model = None
    try:
        os.nice(10)   # videos keep playing smoothly while this works
    except OSError:
        pass
    while True:
        run = db.execute("SELECT * FROM caption_runs WHERE status = 'queued' ORDER BY id LIMIT 1").fetchone()
        if not run:
            time.sleep(10)
            continue
        db.execute("UPDATE caption_runs SET status = 'running', started_at = ?, progress = 0 WHERE id = ?", (now(), run["id"]))
        db.commit()
        try:
            if model is None:
                model = load_model()
            run_one(db, model, run)
        except Cancelled:
            log(f"run {run['id']} cancelled")
        except Exception as e:
            log(f"run {run['id']} failed:\n" + traceback.format_exc())
            db.rollback()
            db.execute("UPDATE caption_runs SET status = 'failed', message = ?, finished_at = ? WHERE id = ?",
                       (f"Couldn't make the transcript ({type(e).__name__}).", now(), run["id"]))
            db.commit()


def try_file(path, start=0.0, length=None):
    model = load_model()
    audio = decode(path)
    audio = audio[int(start * RATE):int((start + length) * RATE)] if length else audio[int(start * RATE):]
    lang, sure = language_of(model, audio)
    print(f"language {lang} ({sure:.2f})")
    for a, b, text, lp in transcribe(model, audio, lang):
        print(f"{a + start:8.1f} {b + start:8.1f} [{lp:5.2f}] {text}")


if __name__ == "__main__":
    if "--download" in sys.argv:
        from faster_whisper import download_model
        print(download_model(MODEL, output_dir=model_path()))
    elif "--file" in sys.argv:
        a = sys.argv
        try_file(a[a.index("--file") + 1], float(a[a.index("--start") + 1]) if "--start" in a else 0.0,
                 float(a[a.index("--length") + 1]) if "--length" in a else None)
    else:
        loop()

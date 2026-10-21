#!/usr/bin/env python3
"""Kodai 1994: suggest a short description of each recording from what is said in it.

For every recording with a transcript (caption_lines) and no description yet, Claude reads
the transcript with the recording's title, chapters and the people tagged in it, and writes
2-4 plain sentences. They go into video_descriptions as source 'claude' (the page says the
computer wrote it); moderators can change or remove any of them. One that a moderator wrote
is never replaced.

Needs ANTHROPIC_API_KEY in the stack's .env, and the anthropic package (deploy.sh puts it in
kodai1994/venv-describe once the key is set). The transcripts go to Anthropic to be read.
Usage: describe.py [--dry-run] [--redo] [video:<slug> ...]
  --dry-run  print what would be sent, send nothing
  --redo     replace descriptions the computer wrote before (never a moderator's)
"""
import os
import sqlite3
import sys
from datetime import datetime, timezone

STACK = os.environ.get("VIDEOS_STACK_DIR", os.path.expanduser("~/services/yajur-videos"))
MODEL = "claude-opus-5-5"
MAX_TRANSCRIPT = 400_000   # characters; a 2-hour tape is well under this

SYSTEM = """You write the short description shown on a recording in a private family archive:
home-video tapes from a 1994 visit to Kodaikanal, India, with Sathya Sai Baba ("Swami").
You get the tape's title and date, the chapters and people members have marked, and a
transcript the computer made from the tape's sound. The transcript has mistakes: misheard
names and words, invented lines during singing or noise.

Write 2 to 4 plain sentences saying what the recording contains: the occasions, who speaks,
what is talked about, in the order it happens. Use only what the material supports; leave out
anything the transcript seems to have misheard, and don't guess at names it garbles. No
praise, no adjectives about how special it is, no headings or lists. Answer with the
description only."""


def env():
    out = {}
    with open(os.path.join(STACK, ".env")) as f:
        for line in f:
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.rstrip("\n").split("=", 1)
                out[k.strip()] = v
    return out


def fmt(t):
    t = int(t)
    return f"{t // 3600}:{t // 60 % 60:02d}:{t % 60:02d}"


def material(db, target):
    slug = target.split(":", 1)[1]
    lines = db.execute("SELECT start_s, text FROM caption_lines WHERE target = ? AND hidden = 0 ORDER BY start_s", (target,)).fetchall()
    chapters = db.execute("SELECT position_s, title FROM markers WHERE target = ? AND kind = 'chapter' AND deleted_at IS NULL ORDER BY position_s", (target,)).fetchall()
    people = [r[0] for r in db.execute(
        "SELECT DISTINCT pe.name FROM marker_people mp JOIN markers m ON m.id = mp.marker_id AND m.deleted_at IS NULL "
        "JOIN people pe ON pe.id = mp.person_id AND pe.deleted_at IS NULL WHERE m.target = ? ORDER BY pe.name", (target,))]
    transcript = "\n".join(f"[{fmt(a)}] {t}" for a, t in lines)[:MAX_TRANSCRIPT]
    return (f"Recording: {slug}\n"
            + ("Chapters:\n" + "\n".join(f"- {fmt(p)} {t}" for p, t in chapters) + "\n" if chapters else "")
            + (f"People tagged in it: {', '.join(people)}\n" if people else "")
            + f"\nTranscript (computer-made):\n{transcript}")


def describe(client, text):
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM,
        output_config={"effort": "low"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": text}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("declined" + (f" ({response.stop_details.category})" if response.stop_details else ""))
    out = " ".join(b.text for b in response.content if b.type == "text").strip()
    if not out:
        raise RuntimeError(f"no text (stop reason {response.stop_reason})")
    return " ".join(out.split())[:1200]


def main(args):
    dry, redo = "--dry-run" in args, "--redo" in args
    only = [a for a in args if a.startswith("video:")]
    db = sqlite3.connect(os.path.join(STACK, "community-data", "community.db"), timeout=30)
    targets = [r[0] for r in db.execute("SELECT DISTINCT target FROM caption_lines WHERE hidden = 0 ORDER BY target")]
    if only:
        targets = [t for t in targets if t in only]
    have = {r[0]: r[1] for r in db.execute("SELECT target, source FROM video_descriptions")}
    todo = [t for t in targets if t not in have or (redo and have[t] == "claude")]
    if not todo:
        print("nothing to describe")
        return 0
    client = None
    if not dry:
        key = env().get("ANTHROPIC_API_KEY", "")
        if not key:
            print("ANTHROPIC_API_KEY isn't set in the stack's .env: nothing was sent", file=sys.stderr)
            return 1
        import anthropic
        client = anthropic.Anthropic(api_key=key)
    failed = 0
    for t in todo:
        text = material(db, t)
        if dry:
            print(f"===== {t}: would send {len(text):,} characters\n{text[:1500]}\n…")
            continue
        try:
            desc = describe(client, text)
        except Exception as e:
            failed += 1
            print(f"FAILED {t}: {type(e).__name__}: {e}", file=sys.stderr)
            continue
        db.execute("INSERT INTO video_descriptions (target, text, source, updated_by, updated_at) VALUES (?, ?, 'claude', NULL, ?) "
                   "ON CONFLICT(target) DO UPDATE SET text = excluded.text, source = 'claude', updated_at = excluded.updated_at "
                   "WHERE video_descriptions.source = 'claude'", (t, desc, datetime.now(timezone.utc).isoformat(timespec="seconds")))
        db.commit()
        print(f"described {t}: {desc}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

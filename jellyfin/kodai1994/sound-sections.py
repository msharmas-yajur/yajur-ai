#!/usr/bin/env python3
"""The outdoor parts of a recording, for audio.sh: one "start end" line each (seconds), in order.

Usage: sound-sections.py <community.db> video:<slug>
"""
import sqlite3
import sys

try:
    db = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
    rows = db.execute("SELECT start_s, end_s FROM sound_sections WHERE target = ? AND kind = 'outdoor' ORDER BY start_s",
                      (sys.argv[2],)).fetchall()
except sqlite3.OperationalError:   # no database, or the community service hasn't created the table yet
    rows = []
for a, b in rows:
    print(f"{a:g} {b:g}")

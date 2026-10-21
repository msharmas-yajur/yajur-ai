#!/usr/bin/env python3
"""Kodai 1994: check that the Drive backup (backup.sh) can be read back. Restores nothing.

  1. The newest community database snapshot: downloaded, SQLite's integrity check, and its
     tables hold about what the live database holds (no table empty that isn't here).
  2. The newest stack archive: downloaded, decrypted with BACKUP_PASSPHRASE, unpacked;
     Jellyfin's database passes the integrity check and has the accounts the live one has;
     .env, Caddyfile and docker-compose.yml are in it.
  3. Every original video and photo, every uploaded photo and every recorded memory is on
     Drive, at the same size (rclone check: sizes only, nothing downloaded).
  4. Snapshots are recent: the newest is at most two days old.

Writes the result to community-data/.restore-test.json (monitor.py reports it) and exits
non-zero if anything failed (kodai1994-restore-test.service then alerts).
Settings from the stack's .env: BACKUP_REMOTE, BACKUP_FOLDER_ID, BACKUP_SOURCE,
BACKUP_PASSPHRASE, MEDIA_DIR. Runs monthly from kodai1994-restore-test.timer.
"""
import json
import os
import sqlite3
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone

STACK = os.environ.get("VIDEOS_STACK_DIR", os.path.expanduser("~/services/yajur-videos"))
RCLONE = os.environ.get("RCLONE", "rclone")
MAX_AGE_DAYS = 2


def env():
    out = {}
    with open(os.path.join(STACK, ".env")) as f:
        for line in f:
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.rstrip("\n").split("=", 1)
                out[k.strip()] = v
    return out


E = env()
REMOTE, FOLDER = E.get("BACKUP_REMOTE", ""), E.get("BACKUP_FOLDER_ID", "")
results = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": str(detail)[:500]})
    print(("ok    " if ok else "FAIL  ") + name + (f": {detail}" if detail else ""), flush=True)
    return ok


def rc(*args, capture=True):
    r = subprocess.run([RCLONE, "--drive-root-folder-id", FOLDER, *args], capture_output=capture, text=True, timeout=3600)
    return r


def newest(prefix, suffix):
    r = rc("lsjson", f"{REMOTE}Site data", "--files-only")
    if r.returncode:
        raise RuntimeError(r.stderr.strip()[-300:])
    names = sorted(x["Name"] for x in json.loads(r.stdout) if x["Name"].startswith(prefix) and x["Name"].endswith(suffix))
    return names[-1] if names else None


def age_days(name):
    day = datetime.strptime(name.split("-", 1)[1][:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - day).days


def counts(path, tables):
    db = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    have = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    return {t: db.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0] for t in tables if t in have}


def integrity(path):
    return sqlite3.connect(f"file:{path}?mode=ro", uri=True).execute("PRAGMA integrity_check").fetchone()[0]


def main():
    if not (REMOTE and FOLDER):
        check("backup is configured", False, "BACKUP_REMOTE and BACKUP_FOLDER_ID aren't set in .env")
        return
    with tempfile.TemporaryDirectory(prefix="kodai-restore-test-") as tmp:
        # 1. community database
        name = newest("community-", ".db")
        if check("a community database snapshot is on Drive", name, name):
            check("it's recent", age_days(name) <= MAX_AGE_DAYS, f"{age_days(name)} days old")
            local = os.path.join(tmp, name)
            r = rc("copyto", f"{REMOTE}Site data/{name}", local)
            if check("it downloads", r.returncode == 0, r.stderr.strip()[-200:]):
                check("SQLite integrity check", integrity(local) == "ok", integrity(local))
                tables = ["profiles", "people", "comments", "markers", "memories", "photo_faces", "clips", "caption_lines"]
                live, snap = counts(os.path.join(STACK, "community-data", "community.db"), tables), counts(local, tables)
                emptied = [t for t in live if live[t] and not snap.get(t)]
                check("its tables hold what the live database holds", not emptied,
                      ", ".join(f"{t} {snap.get(t, 0)}/{live[t]}" for t in live))
        # 2. stack archive
        name = newest("stack-", ".tar.gz.gpg")
        if check("an encrypted stack archive is on Drive", name, name or "none: is BACKUP_PASSPHRASE set?"):
            check("it's recent", age_days(name) <= MAX_AGE_DAYS, f"{age_days(name)} days old")
            enc = os.path.join(tmp, name)
            r = rc("copyto", f"{REMOTE}Site data/{name}", enc)
            if check("it downloads", r.returncode == 0, r.stderr.strip()[-200:]):
                tar_path = os.path.join(tmp, "stack.tar.gz")
                d = subprocess.run(["gpg", "--batch", "--quiet", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "-o", tar_path, "-d", enc],
                                   input=E.get("BACKUP_PASSPHRASE", ""), capture_output=True, text=True)
                if check("it decrypts with BACKUP_PASSPHRASE", d.returncode == 0, d.stderr.strip()[-200:]):
                    out = os.path.join(tmp, "stack")
                    with tarfile.open(tar_path) as t:
                        t.extractall(out, filter="data")
                    for f in (".env", "Caddyfile", "docker-compose.yml"):
                        check(f"{f} is in it", os.path.isfile(os.path.join(out, f)))
                    jf = os.path.join(out, "config", "data", "jellyfin.db")
                    if check("Jellyfin's database is in it", os.path.isfile(jf)):
                        check("Jellyfin's database: integrity check", integrity(jf) == "ok", integrity(jf))
                        a = counts(jf, ["Users"]).get("Users", 0)
                        b = counts(os.path.join(STACK, "config", "data", "jellyfin.db"), ["Users"]).get("Users", 0)
                        check("it has the accounts", a and a >= b - 2, f"{a} in the archive, {b} live")
        # 3. files: on Drive at the same size (nothing is downloaded)
        media = E.get("MEDIA_DIR", "")
        for label, src, dst, extra in (("originals", E.get("BACKUP_SOURCE", ""), REMOTE, ["--max-depth", "1"]),
                                       ("uploaded photos", f"{media}/kodai1994-uploads", f"{REMOTE}Uploaded photos", ["--exclude", "recordings/**"]),
                                       ("recorded memories", f"{media}/kodai1994-uploads/recordings", f"{REMOTE}Recorded memories", []),
                                       ("PDF notes", f"{media}/kodai1994-memories", f"{REMOTE}Memories", ["--exclude", "rec/**"])):
            if not src or not os.path.isdir(src):
                continue
            r = rc("check", src, dst, "--one-way", "--size-only", *extra)
            tail = [l for l in (r.stderr or "").splitlines() if "differences found" in l or "ERROR" in l][-3:]
            check(f"{label} are all on Drive", r.returncode == 0, "; ".join(tail) or "all there")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        check("the test ran", False, f"{type(e).__name__}: {e}")
    ok = all(r["ok"] for r in results)
    report = {"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "ok": ok, "results": results}
    try:
        with open(os.path.join(STACK, "community-data", ".restore-test.json"), "w") as f:
            json.dump(report, f, indent=1)
    except OSError:
        pass
    print("restore test: " + ("passed" if ok else "FAILED"))
    sys.exit(0 if ok else 1)

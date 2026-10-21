#!/usr/bin/env python3
"""Kodai 1994: watch the video stack and say when something goes wrong, and when it's fixed.

Every 5 minutes (kodai1994-monitor.timer) it checks:
  containers   jellyfin, gateway, community, cloudflared (and the workers, if they run) are up
               and not unhealthy
  site         the page and the community service answer on this machine, and from outside
               through the Cloudflare tunnel (https://videos.yajur.ai)
  recordings   every ready recording's master.m3u8 lists its video (audio.sh once emptied one)
  disk         the media disk has room (5% and 20 GB free)
  backup       the nightly backup finished in the last 36 hours, and the monthly restore
               test passed (once they're set up)
  jobs         no kodai1994-* systemd job has failed; no recorded memory waits too long
A check that fails twice in a row is reported (email to ADMIN_EMAIL with the stack's SMTP
settings, and/or ntfy if NTFY_URL is set); so is its recovery. The state is kept in
community-data/.monitor-state.json, which the page's Account panel shows to moderators.

Usage: monitor.py                    run the checks
       monitor.py --unit-failed NAME report a failed systemd job now (kodai1994-alert@.service)
       monitor.py --test             send a test alert
"""
import json
import os
import shutil
import smtplib
import sqlite3
import ssl
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

STACK = os.environ.get("VIDEOS_STACK_DIR", os.path.expanduser("~/services/yajur-videos"))
STATE = os.path.join(STACK, "community-data", ".monitor-state.json")
PUBLIC = os.environ.get("PUBLIC_URL", "https://videos.yajur.ai/kodai1994/")
LOCAL = os.environ.get("LOCAL_URL", "http://127.0.0.1:8098/kodai1994/")
CONTAINERS = ["yajur-jellyfin", "yajur-videos-gateway", "yajur-kodai-community", "yajur-cloudflared"]
OPTIONAL = ["yajur-kodai-faceid", "yajur-kodai-captions"]   # checked only if they exist
FAILS_BEFORE_ALERT = 2


def env():
    out = {}
    try:
        with open(os.path.join(STACK, ".env")) as f:
            for line in f:
                if "=" in line and not line.lstrip().startswith("#"):
                    k, v = line.rstrip("\n").split("=", 1)
                    out[k.strip()] = v
    except OSError:
        pass
    return out


E = env()


def now():
    return datetime.now(timezone.utc)


# ── the checks: each returns (ok, detail)
def http_ok(url, timeout=15):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "kodai-monitor"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status == 200, f"{r.status}"
    except Exception as e:
        return False, f"{type(e).__name__}: {getattr(e, 'code', '') or e}"


def check_containers():
    names = CONTAINERS + [n for n in OPTIONAL if subprocess.run(["docker", "container", "inspect", n], capture_output=True).returncode == 0]
    bad = []
    for n in names:
        r = subprocess.run(["docker", "container", "inspect", "-f", "{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}", n],
                           capture_output=True, text=True)
        state = r.stdout.strip() if r.returncode == 0 else "missing"
        if not state.startswith("running") or state.endswith("unhealthy"):
            bad.append(f"{n}: {state}")
    return not bad, "; ".join(bad) or f"{len(names)} running"


def check_recordings():
    hls = os.path.join(E.get("MEDIA_DIR", ""), "kodai1994-hls")
    try:
        ready = json.load(open(os.path.join(hls, "ready.json")))
    except (OSError, ValueError) as e:
        return False, f"ready.json: {e}"
    bad = []
    for slug in ready:
        try:
            master = open(os.path.join(hls, slug, "master.m3u8")).read()
        except OSError:
            bad.append(f"{slug}: no master.m3u8"); continue
        if "#EXT-X-STREAM-INF" not in master:
            bad.append(f"{slug}: master.m3u8 lists no video")
    return not bad, "; ".join(bad) or f"{len(ready)} recordings playable"


def check_disk():
    path = E.get("MEDIA_DIR") or STACK
    u = shutil.disk_usage(path)
    free_gb, pct = u.free / 1e9, u.free / u.total * 100
    return free_gb >= 20 and pct >= 5, f"{free_gb:.0f} GB free ({pct:.0f}%) on {path}"


def check_backup():
    if not E.get("BACKUP_FOLDER_ID"):
        return True, "not set up"
    try:
        at = datetime.fromisoformat(open(os.path.join(STACK, "community-data", ".backup-ok")).read().strip())
    except (OSError, ValueError):
        # before backup.sh first leaves its marker: when systemd last saw it succeed
        r = subprocess.run(["systemctl", "--user", "show", "-p", "ExecMainStatus", "-p", "ExecMainExitTimestamp", "--timestamp=unix",
                            "kodai1994-backup.service"], capture_output=True, text=True).stdout
        props = dict(l.split("=", 1) for l in r.splitlines() if "=" in l)
        stamp = props.get("ExecMainExitTimestamp", "").lstrip("@")
        if props.get("ExecMainStatus") != "0" or not stamp.isdigit():
            return False, "no backup has finished yet"
        at = datetime.fromtimestamp(int(stamp), timezone.utc)
    age = now() - at
    return age < timedelta(hours=36), f"last finished {age.total_seconds() / 3600:.0f} h ago"


def check_restore_test():
    path = os.path.join(STACK, "community-data", ".restore-test.json")
    if not os.path.exists(path):
        return True, "not run yet"
    try:
        r = json.load(open(path))
    except (OSError, ValueError) as e:
        return False, f"unreadable: {e}"
    failed = [x["check"] for x in r.get("results", []) if not x.get("ok")]
    age = now() - datetime.fromisoformat(r["at"])
    if age > timedelta(days=40):
        return False, f"last run {age.days} days ago"
    return r.get("ok", False), ("failed: " + "; ".join(failed)) if failed else f"passed {age.days} days ago"


def check_units():
    r = subprocess.run(["systemctl", "--user", "list-units", "--failed", "--plain", "--no-legend", "kodai1994-*"], capture_output=True, text=True)
    units = [l.split()[0] for l in r.stdout.splitlines() if l.strip()]
    return not units, ", ".join(units) or "none failed"


def check_queues():
    db_path = os.path.join(STACK, "community-data", "community.db")
    try:
        db = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=10)
        old = (now() - timedelta(minutes=30)).isoformat(timespec="seconds")
        n = db.execute("SELECT COUNT(*) FROM memory_media WHERE status = 'pending' AND created_at < ?", (old,)).fetchone()[0]
    except sqlite3.Error as e:
        return True, f"skipped ({e})"
    return n == 0, f"{n} recorded memories waiting over 30 min" if n else "nothing stuck"


CHECKS = [
    ("containers", "Containers", check_containers),
    ("site-local", "Site on this machine", lambda: http_ok(LOCAL + "api/health")),
    ("page-local", "Page on this machine", lambda: http_ok(LOCAL)),
    ("site-public", "Site from outside (tunnel)", lambda: http_ok(PUBLIC + "api/health", 25)),
    ("recordings", "Recordings playable", check_recordings),
    ("disk", "Disk space", check_disk),
    ("backup", "Nightly backup", check_backup),
    ("restore-test", "Backup restore test", check_restore_test),
    ("units", "Background jobs", check_units),
    ("queues", "Recorded memories queue", check_queues),
]


# ── telling someone
def send_alert(subject, body):
    sent = []
    if E.get("SMTP_HOST") and E.get("ADMIN_EMAIL"):
        msg = EmailMessage()
        frm = E.get("MAIL_FROM") or E.get("SMTP_USER", "")
        msg["From"], msg["To"], msg["Subject"] = f"Kodai 1994 monitor <{frm}>", E["ADMIN_EMAIL"], subject
        msg.set_content(body + "\n\n— monitor.py on " + os.uname().nodename)
        try:
            port = int(E.get("SMTP_PORT") or 587)
            ctx = ssl.create_default_context()
            server = smtplib.SMTP_SSL(E["SMTP_HOST"], port, context=ctx, timeout=20) if port == 465 else smtplib.SMTP(E["SMTP_HOST"], port, timeout=20)
            with server:
                if port != 465:
                    server.starttls(context=ctx)
                if E.get("SMTP_USER"):
                    server.login(E["SMTP_USER"], E.get("SMTP_PASSWORD", ""))
                server.send_message(msg)
            sent.append("email")
        except (OSError, smtplib.SMTPException) as e:
            print(f"email failed: {type(e).__name__}: {e}", file=sys.stderr)
    if E.get("NTFY_URL"):
        try:
            req = urllib.request.Request(E["NTFY_URL"], data=body.encode(), headers={"Title": subject, "Tags": "warning"}, method="POST")
            urllib.request.urlopen(req, timeout=15).close()
            sent.append("ntfy")
        except Exception as e:
            print(f"ntfy failed: {e}", file=sys.stderr)
    print(f"ALERT ({', '.join(sent) or 'not sent: no SMTP or NTFY_URL'}): {subject}", flush=True)
    return bool(sent)


def load_state():
    try:
        return json.load(open(STATE))
    except (OSError, ValueError):
        return {"checks": {}}


def save_state(state):
    tmp = STATE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, indent=1)
    os.replace(tmp, STATE)


def run_checks():
    state = load_state()
    checks = state.setdefault("checks", {})
    problems, recovered = [], []
    for key, label, fn in CHECKS:
        try:
            ok, detail = fn()
        except Exception as e:
            ok, detail = False, f"the check broke: {type(e).__name__}: {e}"
        c = checks.setdefault(key, {"ok": True, "fails": 0, "alerted": False})
        c.update(label=label, detail=detail, at=now().isoformat(timespec="seconds"))
        if ok:
            if c.get("alerted"):
                recovered.append(f"{label}: {detail}")
            c.update(ok=True, fails=0, alerted=False)
        else:
            c["fails"] = c.get("fails", 0) + 1
            if c["ok"]:
                c["since"] = c["at"]
            c["ok"] = False
            if c["fails"] >= FAILS_BEFORE_ALERT and not c.get("alerted"):
                problems.append(f"{label}: {detail}")
                c["alerted"] = True
        print(("ok    " if ok else "FAIL  ") + f"{label}: {detail}")
    state["at"] = now().isoformat(timespec="seconds")
    save_state(state)
    if problems:
        send_alert(f"Kodai 1994: {len(problems)} problem{'s' if len(problems) > 1 else ''} — {problems[0].split(':')[0]}",
                   "These checks are failing:\n\n" + "\n".join("  • " + p for p in problems) +
                   "\n\nAll checks:\n" + "\n".join(f"  {'ok  ' if c['ok'] else 'FAIL'} {c['label']}: {c['detail']}" for c in checks.values()))
    if recovered:
        send_alert("Kodai 1994: fixed — " + recovered[0].split(":")[0], "These checks pass again:\n\n" + "\n".join("  • " + r for r in recovered))


def unit_failed(name):
    log = subprocess.run(["journalctl", "--user", "-u", name, "-n", "25", "--no-pager", "-o", "cat"], capture_output=True, text=True).stdout
    send_alert(f"Kodai 1994: {name} failed", f"The background job {name} failed. Its last log lines:\n\n{log}\n"
               f"See more: journalctl --user -u {name}\nRun it again: systemctl --user start {name}")


if __name__ == "__main__":
    if "--unit-failed" in sys.argv:
        unit_failed(sys.argv[sys.argv.index("--unit-failed") + 1])
    elif "--test" in sys.argv:
        sys.exit(0 if send_alert("Kodai 1994: test alert", "This is a test of monitor.py's alerts. Nothing is wrong.") else 1)
    else:
        run_checks()

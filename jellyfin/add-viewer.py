#!/usr/bin/env python3
"""Invite a member: create (or reset) a Jellyfin viewer who can see only one library.

    python3 -I jellyfin/add-viewer.py <username> [--library "Kodai 1994"]
    python3 -I jellyfin/add-viewer.py <username> --disable      # cut off access

Prints the username and a generated password to send to the person, along with the
link https://videos.yajur.ai/kodai1994/. Talks to Jellyfin on localhost as the admin
whose credentials deploy/setup saved in the stack folder (admin-credentials.txt).
"""
import argparse, json, os, secrets, urllib.request

STACK = os.environ.get("VIDEOS_STACK_DIR", os.path.expanduser("~/services/yajur-videos"))
BASE = os.environ.get("JELLYFIN_LOCAL", "http://127.0.0.1:8099")
AUTH = 'MediaBrowser Client="yajur-admin-cli", Device="cli", DeviceId="yajur-admin-cli", Version="1.0"'
LOGIN_ATTEMPTS = 5


def call(method, path, body=None, token=None):
    headers = {"Authorization": AUTH + (f', Token="{token}"' if token else "")}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def admin_token():
    creds = dict(line.split(": ", 1) for line in open(os.path.join(STACK, "admin-credentials.txt")).read().splitlines() if ": " in line)
    auth = call("POST", "/Users/AuthenticateByName", {"Username": creds["username"].strip(), "Pw": creds["password"].strip()})
    return auth["AccessToken"]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("username")
    ap.add_argument("--library", default="Kodai 1994")
    ap.add_argument("--disable", action="store_true", help="disable the account instead of creating it")
    args = ap.parse_args()

    tok = admin_token()
    user = next((u for u in call("GET", "/Users", token=tok) if u["Name"].lower() == args.username.lower()), None)

    if args.disable:
        if not user:
            raise SystemExit(f"No user named {args.username}")
        policy = user["Policy"]
        policy["IsDisabled"] = True
        call("POST", f"/Users/{user['Id']}/Policy", policy, tok)
        print(f"Disabled {user['Name']}. Their signed-in sessions stop working on the next request.")
        return

    lib = next((f for f in call("GET", "/Library/VirtualFolders", token=tok) if f["Name"] == args.library), None)
    if not lib:
        raise SystemExit(f"No library named {args.library!r}")

    password = secrets.token_urlsafe(9)
    if user:
        call("POST", f"/Users/{user['Id']}/Password", {"ResetPassword": True}, tok)
        call("POST", f"/Users/{user['Id']}/Password", {"CurrentPw": "", "NewPw": password}, tok)
        action = "Reset password for"
    else:
        user = call("POST", "/Users/New", {"Name": args.username, "Password": password}, tok)
        action = "Created"

    policy = call("GET", f"/Users/{user['Id']}", token=tok)["Policy"]
    policy.update({
        "IsAdministrator": False, "IsDisabled": False, "IsHidden": True,
        "EnableAllFolders": False,
        "EnabledFolders": sorted(set(policy.get("EnabledFolders") or []) | {lib["ItemId"]}),
        "EnableContentDownloading": False, "EnablePublicSharing": False,
        "EnableRemoteAccess": True, "EnableMediaPlayback": True,
        "EnableLiveTvAccess": False, "EnableLiveTvManagement": False,
        "EnableRemoteControlOfOtherUsers": False, "EnableSharedDeviceControl": False,
        "EnableContentDeletion": False, "EnableCollectionManagement": False, "EnableSubtitleManagement": False,
        "LoginAttemptsBeforeLockout": LOGIN_ATTEMPTS,
    })
    call("POST", f"/Users/{user['Id']}/Policy", policy, tok)

    print(f"{action} {user['Name']} (access: {args.library})\n")
    print(f"  Link:     https://videos.yajur.ai/kodai1994/")
    print(f"  Username: {user['Name']}")
    print(f"  Password: {password}")


if __name__ == "__main__":
    main()

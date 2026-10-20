#!/usr/bin/env bash
# Send a test email with the community service's SMTP settings (from the stack's .env).
#
# Usage: jellyfin/send-test-email.sh [to-address]   (default: ADMIN_EMAIL)
# Run jellyfin/deploy.sh first after editing .env, so the container has the new settings.
set -euo pipefail
TO=${1:-}
docker exec -e TO="$TO" yajur-kodai-community python3 -I -c '
import os, sys
sys.path.insert(0, "/app")
import app
to = os.environ.get("TO") or app.ADMIN_EMAIL
if not app.mail_enabled():
    sys.exit("Email is off: set SMTP_HOST (and SMTP_USER/SMTP_PASSWORD) in ~/services/yajur-videos/.env, then run jellyfin/deploy.sh.")
if not to:
    sys.exit("No recipient: pass an address or set ADMIN_EMAIL.")
print(f"Sending a test email from {app.MAIL_FROM} to {to} via {app.SMTP_HOST}:{app.SMTP_PORT} (signed in as {app.SMTP_USER or app.MAIL_FROM}) ...")
if app.SMTP_USER and app.MAIL_FROM.lower() != app.SMTP_USER.lower():
    print("Note: Gmail keeps this From address only if it is a verified \"Send mail as\" alias of the signed-in account; otherwise it substitutes the account address.")
ok = app.send_mail(to, "Kodai 1994: test email", "This is a test from the Kodai 1994 site. Email is working.\n")
print("Sent." if ok else "Failed (see the reason above).")
sys.exit(0 if ok else 1)
'

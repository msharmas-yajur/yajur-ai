# Kodai 1994 — Add photos from Google Drive and OneDrive

**Status:** Plan — parked, to build later (needs app registrations, see §4)
**Date:** 2026-10-20
**Branch:** `claude/secure-video-library`
**Where it lives:** `jellyfin/kodai1994/site/index.html` (Photos view upload bar), `community/app.py`

---

## 1. Goal

Members add photos from their computer/phone (already works), **from Google Drive**, or
**from OneDrive**, including whole folders and shared links, without asking the admin to
import them by hand.

## 2. Recommended design

**A. "Add from Google Drive" and "Add from OneDrive" buttons** beside *Add photos*.
- The member signs in to *their own* account in a pop-up and picks photos or folders
  (Google Picker; OneDrive File Picker v8).
- Their browser downloads the chosen files (Drive API with the picker's token; OneDrive
  `@microsoft.graph.downloadUrl`; both allow CORS) and uploads each one through the
  existing pipeline: `POST /photo-uploads`, progress rings, retry on 502/503/504,
  in-browser shrink above 15 MB / HEIC → JPEG, worker strips metadata and makes web copies
  (ids from 101 up), face identification queued.
- Private files work; this server never holds members' Google/Microsoft credentials.
- Google scope: `drive.file` via the Picker (access only to files the member picks): a
  non-sensitive scope, no Google verification review needed.
- Folders: expand to their image files (jpg, png, webp, heic, tif); skip the rest and
  say so.

**B. "Paste a link"** for a Google Drive folder or file shared as *Anyone with the link*.
- New `POST /photo-imports {url}`: accept only `drive.google.com` / `docs.google.com`
  links (never fetch arbitrary URLs: SSRF), list the folder with the Drive API + API key,
  queue each image as an upload by that member (status shown like upload tiles), and
  respect the same per-member limits (60/hour, 200 pending).
- Large files: download server-side (no 15 MB browser limit), with a sane cap
  (e.g. 150 MB per file, 2 GB per import).
- OneDrive share links: not supported server-side (Microsoft restricts anonymous access
  to shared links); the OneDrive button covers it.

**Same as today:** duplicate detection (sha256), "Added by", uploader/admin can remove,
originals kept locally and in the nightly Drive backup.

## 3. Interim

Members share a Drive folder with the admin's account; the admin imports it on the server
(done 2026-10-20 for 14 high-res scans, photos 126–139, via `photo_uploads` rows + the
worker).

## 4. What the user needs to set up first (≈ 15 minutes)

1. **Google Cloud** (free): a project; enable *Google Picker API* and *Google Drive API*;
   an **OAuth client ID** (Web) with authorised JavaScript origin `https://videos.yajur.ai`;
   an **API key** restricted to those APIs and that site; OAuth consent screen "External",
   published.
2. **Microsoft Entra / Azure** (free): an app registration (SPA) with redirect URI
   `https://videos.yajur.ai/kodai1994/` → its **client ID**.

These IDs aren't secrets (they're visible in the page by design); keep them in the stack's
`.env` and pass them to the page, not hard-coded in the public repo.

## 5. Open decisions

1. Build both Google Drive and OneDrive, or Google Drive first?
2. Per-file / per-import size caps for "Paste a link".

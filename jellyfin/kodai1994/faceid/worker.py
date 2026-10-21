#!/usr/bin/env python3
"""Kodai 1994 media worker: face identification, and photos members upload.

Runs queued identification runs (table identify_runs, written by community/app.py when a
member presses "Identify faces"), one at a time, and writes suggestions for people to
review (table identify_suggestions). Nothing here changes events, tags or face marks:
those change only when a member confirms a suggestion on the Identify page.

Models (InsightFace buffalo_l, non-commercial licence; not in the repository):
  det_10g.onnx    SCRFD face detector (boxes + 5 landmarks)
  w600k_r50.onnx  ArcFace recogniser (512-d embedding of a 112x112 aligned face)

Uploaded photos (table photo_uploads, originals in UPLOAD_DIR): each one is decoded
(which also rejects anything that isn't really an image), turned upright, re-encoded
without metadata (no GPS, no phone details) as NN.jpg (<= 2048 px) and NN-thumb.jpg
(<= 640 px) next to the folder's photos, added to photos.json with an id from 101 up
(prepare-photos.sh keeps those when it rebuilds), and queued for face identification.
Removing one takes it off photos.json and deletes its web copies; the original stays.

References: every face marked on a photo (photo_faces) plus every video face a member
confirmed. A video is read at SAMPLE_FPS; detections in consecutive frames are joined
into tracks (one person on screen for a stretch), and each track becomes one suggestion.

Usage: worker.py            poll the queue forever
       worker.py --eval     leave-one-out accuracy on the marked photo faces, then exit
"""
import json
import os
import re
import sqlite3
import sys
import time
import traceback
from datetime import datetime, timezone

import cv2
import numpy as np
import onnxruntime as ort

DB_PATH = os.path.join(os.environ.get("DATA_DIR", "/data"), "community.db")
MODELS = os.environ.get("MODELS_DIR", "/models")
HLS = os.environ.get("HLS_DIR", "/media/hls")          # photos/, photos.json
VIDEOS = os.environ.get("VIDEOS_DIR", "/media/videos")  # the library's .mp4 files
OUT = os.environ.get("OUT_DIR", "/out")                 # face crops, served at /kodai1994/faces/
THREADS = int(os.environ.get("THREADS") or 4)
PHOTOS = os.path.join(HLS, "photos")                    # mounted read-write for uploads
UPLOADS = os.environ.get("UPLOAD_DIR", "/uploads")
FIRST_UPLOAD_ID = 101    # 01-99: the folder's photos (prepare-photos.sh); 101-999: uploads

SAMPLE_FPS = 2.0
VIDEO_DET = 640          # detector input size for 640x480 video frames
PHOTO_DET = 1280         # photos have small faces in group shots
DET_THRESHOLD = 0.5
MIN_FACE_PX = 20         # smaller faces can't be recognised reliably
STRONG, POSSIBLE = 0.35, 0.20   # cosine similarity: "likely" / "possible" match (see --eval)
UNKNOWN_MIN_PX = 40      # unrecognised faces are only listed when this big...
UNKNOWN_MIN_S = 1.0      # ...and on screen this long
MAX_UNKNOWN = 200
ARCFACE_DST = np.array([[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366],
                        [41.5493, 92.3655], [70.7299, 92.2041]], dtype=np.float32)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def log(*a):
    print(*a, flush=True)


# ── Models
def session(name):
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = THREADS
    opts.inter_op_num_threads = 1
    return ort.InferenceSession(os.path.join(MODELS, name), opts, providers=["CPUExecutionProvider"])


class Detector:
    """SCRFD (det_10g): 3 strides x 2 anchors, outputs scores / box distances / landmarks."""
    def __init__(self):
        self.s = session("det_10g.onnx")
        self.inp = self.s.get_inputs()[0].name
        self.centers = {}

    def __call__(self, img, size):
        h, w = img.shape[:2]
        scale = size / max(h, w)
        nh, nw = int(round(h * scale)), int(round(w * scale))
        canvas = np.zeros((size, size, 3), dtype=np.uint8)
        canvas[:nh, :nw] = cv2.resize(img, (nw, nh))
        blob = cv2.dnn.blobFromImage(canvas, 1 / 128, (size, size), (127.5, 127.5, 127.5), swapRB=True)
        outs = self.s.run(None, {self.inp: blob})
        boxes, kpss, scores = [], [], []
        for i, stride in enumerate((8, 16, 32)):
            sc, bb, kp = (o[0] if o.ndim == 3 else o for o in (outs[i], outs[i + 3], outs[i + 6]))
            fh, fw = size // stride, size // stride
            key = (fh, fw, stride)
            if key not in self.centers:
                c = np.stack(np.mgrid[:fh, :fw][::-1], axis=-1).astype(np.float32).reshape(-1, 2) * stride
                self.centers[key] = np.repeat(c, 2, axis=0)
            c = self.centers[key]
            keep = np.where(sc[:, 0] >= DET_THRESHOLD)[0]
            if not len(keep):
                continue
            d, k, cc = bb[keep] * stride, kp[keep] * stride, c[keep]
            boxes.append(np.stack([cc[:, 0] - d[:, 0], cc[:, 1] - d[:, 1], cc[:, 0] + d[:, 2], cc[:, 1] + d[:, 3]], axis=1))
            kpss.append(np.stack([cc[:, j % 2] + k[:, j] for j in range(10)], axis=1).reshape(-1, 5, 2))
            scores.append(sc[keep, 0])
        if not boxes:
            return []
        boxes, kpss, scores = np.concatenate(boxes) / scale, np.concatenate(kpss) / scale, np.concatenate(scores)
        idx = cv2.dnn.NMSBoxes([[float(b[0]), float(b[1]), float(b[2] - b[0]), float(b[3] - b[1])] for b in boxes],
                               scores.tolist(), DET_THRESHOLD, 0.4)
        out = []
        for i in np.array(idx).reshape(-1):
            x1, y1, x2, y2 = boxes[i]
            x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
            if min(x2 - x1, y2 - y1) >= MIN_FACE_PX:
                out.append({"box": (float(x1), float(y1), float(x2), float(y2)), "kps": kpss[i], "score": float(scores[i])})
        return out


class Recogniser:
    def __init__(self):
        self.s = session("w600k_r50.onnx")
        self.inp = self.s.get_inputs()[0].name

    def __call__(self, img, faces):
        if not faces:
            return
        crops = []
        for f in faces:
            m, _ = cv2.estimateAffinePartial2D(f["kps"].astype(np.float32), ARCFACE_DST, method=cv2.LMEDS)
            crops.append(cv2.warpAffine(img, m, (112, 112), borderValue=0.0))
        blob = cv2.dnn.blobFromImages(crops, 1 / 127.5, (112, 112), (127.5, 127.5, 127.5), swapRB=True)
        embs = self.s.run(None, {self.inp: blob})[0]
        embs /= np.linalg.norm(embs, axis=1, keepdims=True) + 1e-9
        for f, e in zip(faces, embs):
            f["emb"] = e.astype(np.float32)


# ── Database (shared with community/app.py, which owns the schema)
def connect():
    db = sqlite3.connect(DB_PATH, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout = 30000")
    return db


def to_blob(e):
    return np.asarray(e, dtype=np.float32).tobytes()


def from_blob(b):
    return np.frombuffer(b, dtype=np.float32)


def photos():
    with open(os.path.join(HLS, "photos", "photos.json")) as f:
        return {p["id"]: p for p in json.load(f)}


def iou(a, b):
    ix, iy = max(0, min(a[2], b[2]) - max(a[0], b[0])), max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter + 1e-9)


def covered(a, b):
    """Share of the smaller box that the two overlap: a tight detected face inside a loose
    hand-drawn box is the same face even though their IoU is small."""
    ix, iy = max(0, min(a[2], b[2]) - max(a[0], b[0])), max(0, min(a[3], b[3]) - max(a[1], b[1]))
    return ix * iy / (min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1])) + 1e-9)


def read_photo(ph):
    img = cv2.imread(os.path.join(HLS, "photos", ph["src"]), cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"photo {ph['id']} could not be read")
    return img


def face_for_box(det, rec, img, box):
    """The detected face that best fits a hand-drawn box (fractions), with its embedding."""
    H, W = img.shape[:2]
    bx = (box[0] * W, box[1] * H, (box[0] + box[2]) * W, (box[1] + box[3]) * H)
    bw, bh = bx[2] - bx[0], bx[3] - bx[1]
    # Detect on a generous crop around the box, enlarged so small faces reach the detector.
    x1, y1 = int(max(0, bx[0] - bw)), int(max(0, bx[1] - bh))
    x2, y2 = int(min(W, bx[2] + bw)), int(min(H, bx[3] + bh))
    crop = img[y1:y2, x1:x2]
    up = max(1.0, 192 / max(bw, bh, 1))
    if up > 1:
        crop = cv2.resize(crop, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    faces = det(crop, 640)
    best, best_iou = None, 0.15
    for f in faces:
        b = f["box"]
        fb = (b[0] / up + x1, b[1] / up + y1, b[2] / up + x1, b[3] / up + y1)
        o = iou(fb, bx)
        if o > best_iou:
            best, best_iou = f, o
    if best is None:
        return None
    rec(crop, [best])
    return best["emb"]


def load_refs(db, det, rec):
    """{person_id: [embedding, ...]} from marked photo faces (cached) and confirmed video faces."""
    phs, refs, unreadable = photos(), {}, 0
    marks = db.execute("SELECT f.id, f.photo_id, f.person_id, f.x, f.y, f.w, f.h FROM photo_faces f "
                       "JOIN people p ON p.id = f.person_id AND p.deleted_at IS NULL").fetchall()
    cache = {r["face_id"]: r for r in db.execute("SELECT * FROM identify_refs")}
    images = {}
    for m in marks:
        c = cache.get(m["id"])
        if c and (c["x"], c["y"], c["w"], c["h"]) == (m["x"], m["y"], m["w"], m["h"]):
            emb = from_blob(c["embedding"]) if c["embedding"] else None
        else:
            ph = phs.get(m["photo_id"])
            if ph is None:
                continue
            if m["photo_id"] not in images:
                images[m["photo_id"]] = read_photo(ph)
            emb = face_for_box(det, rec, images[m["photo_id"]], (m["x"], m["y"], m["w"], m["h"]))
            db.execute("INSERT OR REPLACE INTO identify_refs (face_id, x, y, w, h, embedding) VALUES (?, ?, ?, ?, ?, ?)",
                       (m["id"], m["x"], m["y"], m["w"], m["h"], to_blob(emb) if emb is not None else None))
            db.commit()
        if emb is None:
            unreadable += 1
        else:
            refs.setdefault(m["person_id"], []).append(emb)
    for r in db.execute("SELECT s.final_person_id, s.embedding FROM identify_suggestions s "
                        "JOIN people p ON p.id = s.final_person_id AND p.deleted_at IS NULL "
                        "WHERE s.status = 'confirmed' AND s.embedding IS NOT NULL"):
        refs.setdefault(r["final_person_id"], []).append(from_blob(r["embedding"]))
    return refs, len(marks) - unreadable, unreadable


def rank(emb, refs):
    """[(person_id, score)] best first. Score: best match among that person's references."""
    out = [(pid, float(np.max(np.stack(es) @ emb))) for pid, es in refs.items()]
    out.sort(key=lambda x: -x[1])
    return out


def crop_face(img, box, size=160):
    x1, y1, x2, y2 = box
    cx, cy, side = (x1 + x2) / 2, (y1 + y2) / 2, max(x2 - x1, y2 - y1) * 1.6
    H, W = img.shape[:2]
    a, b = int(max(0, cx - side / 2)), int(max(0, cy - side / 2))
    c, d = int(min(W, cx + side / 2)), int(min(H, cy + side / 2))
    return cv2.resize(img[b:d, a:c], (size, size), interpolation=cv2.INTER_CUBIC if side < size else cv2.INTER_AREA)


def safe(target):
    return re.sub(r"[^a-z0-9-]", "-", target.replace(":", "-"))


# ── Runs
class Cancelled(Exception):
    pass


# ── Uploaded photos
def fit(img, edge):
    h, w = img.shape[:2]
    k = min(1.0, edge / max(h, w))
    return img if k == 1 else cv2.resize(img, (round(w * k), round(h * k)), interpolation=cv2.INTER_AREA)


def write_atomic(path, write):
    base, ext = os.path.splitext(path)
    tmp = base + ".tmp" + ext  # keep the extension: imwrite picks the format from it
    write(tmp)
    os.chmod(tmp, 0o644)
    os.replace(tmp, path)


def save_photos_json(lst):
    def w(tmp):
        with open(tmp, "w") as f:
            json.dump(lst, f)
    write_atomic(os.path.join(PHOTOS, "photos.json"), w)


def add_upload(db, u):
    img = cv2.imread(os.path.join(UPLOADS, u["file"]), cv2.IMREAD_COLOR)  # applies the EXIF rotation
    if img is None:
        raise ValueError("That file couldn't be read as a photo.")
    if min(img.shape[:2]) < 200:
        raise ValueError("That photo is too small (at least 200 pixels on each side).")
    lst = list(photos().values())
    # Never reuse a removed photo's number: comments and face marks are keyed by it.
    used = [int(r[0]) for r in db.execute("SELECT photo_id FROM photo_uploads WHERE photo_id IS NOT NULL")]
    nid = max([int(p["id"]) for p in lst if int(p["id"]) >= FIRST_UPLOAD_ID] + used + [FIRST_UPLOAD_ID - 1]) + 1
    if nid > 999:
        raise ValueError("The photo collection is full.")
    pid = str(nid)
    full = fit(img, 2048)
    # imwrite writes no metadata: EXIF, GPS and phone details are dropped here.
    write_atomic(os.path.join(PHOTOS, pid + ".jpg"), lambda t: cv2.imwrite(t, full, [cv2.IMWRITE_JPEG_QUALITY, 90]) or None)
    write_atomic(os.path.join(PHOTOS, pid + "-thumb.jpg"), lambda t: cv2.imwrite(t, fit(img, 640), [cv2.IMWRITE_JPEG_QUALITY, 85]) or None)
    # ow/oh: the original's size (the page tags photos of 4 MP and up as "High res")
    lst.append({"id": pid, "src": pid + ".jpg", "thumb": pid + "-thumb.jpg", "w": full.shape[1], "h": full.shape[0],
                "ow": img.shape[1], "oh": img.shape[0]})
    save_photos_json(lst)
    with db:
        db.execute("UPDATE photo_uploads SET status = 'ready', photo_id = ?, processed_at = ? WHERE id = ?", (pid, now(), u["id"]))
        db.execute("INSERT INTO identify_runs (target, requested_by, created_at) VALUES (?, ?, ?)", ("photo:" + pid, u["user_id"], now()))
    log(f"upload {u['id']} -> photo {pid} {full.shape[1]}x{full.shape[0]}")


def remove_upload(db, u):
    pid = u["photo_id"]
    save_photos_json([p for p in photos().values() if p["id"] != pid])
    for f in (os.path.join(PHOTOS, pid + ".jpg"), os.path.join(PHOTOS, pid + "-thumb.jpg"),
              os.path.join(HLS, "photos-enhanced", pid + ".jpg")):
        try:
            os.remove(f)
        except OSError:
            pass
    db.execute("UPDATE photo_uploads SET status = 'removed' WHERE id = ?", (u["id"],))
    db.commit()
    log(f"upload {u['id']} (photo {pid}) removed")


def process_uploads(db):
    for u in db.execute("SELECT * FROM photo_uploads WHERE status IN ('pending', 'remove') ORDER BY id").fetchall():
        try:
            (add_upload if u["status"] == "pending" else remove_upload)(db, u)
        except Exception as e:
            db.rollback()
            msg = str(e) if isinstance(e, ValueError) else "That photo couldn't be added. Try another copy of it."
            if not isinstance(e, ValueError):
                traceback.print_exc()
            db.execute("UPDATE photo_uploads SET status = 'failed', message = ?, processed_at = ? WHERE id = ?", (msg, now(), u["id"]))
            db.commit()


def progress(db, run_id, frac, message=None):
    db.execute("UPDATE identify_runs SET progress = ?, message = COALESCE(?, message) WHERE id = ?", (round(frac, 3), message, run_id))
    db.commit()
    process_uploads(db)  # new photos shouldn't wait for a long video run
    if db.execute("SELECT status FROM identify_runs WHERE id = ?", (run_id,)).fetchone()["status"] == "cancelled":
        raise Cancelled()


def decided(db, target):
    """Faces on this target that members already confirmed or rejected: not suggested again."""
    return db.execute("SELECT start_s, end_s, x, y, w, h, embedding FROM identify_suggestions "
                      "WHERE target = ? AND status IN ('confirmed', 'rejected') AND embedding IS NOT NULL", (target,)).fetchall()


def video_tracks(db, run_id, path, det, rec):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RuntimeError("the video file could not be opened")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    step = max(1, int(round(fps / SAMPLE_FPS)))
    tracks, active, n, last = [], [], 0, time.time()
    while True:
        if n % step:
            if not cap.grab():
                break
            n += 1
            continue
        ok, frame = cap.read()
        if not ok:
            break
        t = n / fps
        n += 1
        faces = det(frame, VIDEO_DET)
        rec(frame, faces)
        active = [tr for tr in active if t - tr["last_t"] <= 1.6]
        taken = set()
        for f in sorted(faces, key=lambda f: -f["score"]):
            best, best_v = None, 0
            for tr in active:
                if id(tr) in taken:
                    continue
                o, cs = iou(f["box"], tr["last_box"]), float(tr["last_emb"] @ f["emb"])
                v = o + cs if (o > 0.2 and cs > 0.25) or cs > 0.55 else 0
                if v > best_v:
                    best, best_v = tr, v
            size = min(f["box"][2] - f["box"][0], f["box"][3] - f["box"][1])
            q = f["score"] * size
            if best is None:
                best = {"start": t, "embs": [], "weights": [], "sizes": [], "best_q": -1}
                tracks.append(best)
                active.append(best)
            taken.add(id(best))
            best.update(last_t=t, last_box=f["box"], last_emb=f["emb"])
            best["embs"].append(f["emb"]); best["weights"].append(q); best["sizes"].append(size)
            if q > best["best_q"]:
                best.update(best_q=q, best_t=t, best_box=f["box"], crop=crop_face(frame, f["box"]),
                            frame_w=frame.shape[1], frame_h=frame.shape[0])
        if total and time.time() - last > 10:
            last = time.time()
            progress(db, run_id, min(0.95, n / total), f"Reading the video: {int(t // 60)} min done")
    cap.release()
    for tr in tracks:
        e = np.average(np.stack(tr["embs"]), axis=0, weights=np.array(tr["weights"]))
        tr["emb"] = (e / (np.linalg.norm(e) + 1e-9)).astype(np.float32)
        tr["end"] = tr["last_t"]
        tr["size"] = float(np.median(tr["sizes"]))
    return tracks


def run_video(db, run, det, rec, refs):
    slug = run["target"][len("video:"):]
    path = next((os.path.join(VIDEOS, f) for f in sorted(os.listdir(VIDEOS)) if f.lower().endswith((".mp4", ".mkv"))
                 and re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", os.path.splitext(f)[0].lower())) == slug), None)
    if not path:
        raise RuntimeError("this video's file wasn't found")
    tracks = video_tracks(db, run["id"], path, det, rec)
    old = decided(db, run["target"])
    items = []
    for tr in tracks:
        if any(o["start_s"] is not None and tr["start"] <= o["end_s"] + 1 and o["start_s"] - 1 <= tr["end"]
               and float(from_blob(o["embedding"]) @ tr["emb"]) > 0.5 for o in old):
            continue
        W, H = tr["frame_w"], tr["frame_h"]
        b = tr["best_box"]
        items.append({"start": tr["start"], "end": tr["end"], "frame": tr["best_t"], "emb": tr["emb"], "crop": tr["crop"],
                      "size": tr["size"], "dets": len(tr["embs"]),
                      "box": (b[0] / W, b[1] / H, (b[2] - b[0]) / W, (b[3] - b[1]) / H)})
    return items, None


def run_photo(db, run, det, rec, refs):
    pid = run["target"][len("photo:"):]
    ph = photos().get(pid)
    if not ph:
        raise RuntimeError("this photo wasn't found")
    img = read_photo(ph)
    H, W = img.shape[:2]
    progress(db, run["id"], 0.3, "Finding faces")
    faces = det(img, PHOTO_DET)
    rec(img, faces)
    box = lambda r: (r["x"] * W, r["y"] * H, (r["x"] + r["w"]) * W, (r["y"] + r["h"]) * H)
    marked = [box(r) for r in db.execute("SELECT x, y, w, h FROM photo_faces WHERE photo_id = ?", (pid,))]
    reviewed = [box(r) for r in decided(db, run["target"])]
    items, n_marked, n_reviewed = [], 0, 0
    for f in faces:
        if any(covered(f["box"], m) > 0.5 for m in marked):
            n_marked += 1
            continue
        if any(covered(f["box"], m) > 0.5 for m in reviewed):
            n_reviewed += 1
            continue
        b = f["box"]
        size = min(b[2] - b[0], b[3] - b[1])
        items.append({"start": None, "end": None, "frame": None, "emb": f["emb"], "crop": crop_face(img, b), "size": size,
                      "dets": 1, "box": (b[0] / W, b[1] / H, (b[2] - b[0]) / W, (b[3] - b[1]) / H)})
    note = f"{len(faces)} faces found: {n_marked} already marked, {n_reviewed} already reviewed, {len(items)} new"
    return items, note


def save(db, run, items, refs):
    """Rank each face against the references and store the suggestions worth reviewing."""
    folder = os.path.join(OUT, safe(run["target"]))
    os.makedirs(folder, exist_ok=True)
    known, unknown = [], []
    for it in items:
        r = rank(it["emb"], refs) if refs else []
        it["ranked"] = r[:4]
        (known if r and r[0][1] >= POSSIBLE else unknown).append(it)
    is_video = run["target"].startswith("video:")
    if is_video:
        unknown = [u for u in unknown if u["size"] >= UNKNOWN_MIN_PX and u["end"] - u["start"] >= UNKNOWN_MIN_S]
    unknown.sort(key=lambda u: -u["size"])
    unknown = unknown[:MAX_UNKNOWN]
    # Group unrecognised faces that look alike, so one name can be given to all of them.
    clusters = []
    for u in unknown:
        best, best_s = None, 0.45
        for c in clusters:
            s = float(c["centre"] @ u["emb"])
            if s > best_s:
                best, best_s = c, s
        if best is None:
            best = {"n": len(clusters) + 1, "sum": np.zeros(512, np.float32)}
            clusters.append(best)
        best["sum"] += u["emb"]
        best["centre"] = best["sum"] / (np.linalg.norm(best["sum"]) + 1e-9)
        u["cluster"] = best["n"]
    rows = []
    for i, it in enumerate(known + unknown):
        name = f"{run['id']}-{i + 1}.jpg"
        cv2.imwrite(os.path.join(folder, name), it["crop"], [cv2.IMWRITE_JPEG_QUALITY, 88])
        top = it["ranked"][0] if it["ranked"] and it["ranked"][0][1] >= POSSIBLE else None
        rows.append((run["id"], run["target"], it["start"], it["end"], it["frame"], *it["box"],
                     top[0] if top else None, top[1] if top else None,
                     json.dumps([{"personId": p, "score": round(s, 3)} for p, s in it["ranked"]]),
                     it.get("cluster"), f"{safe(run['target'])}/{name}", to_blob(it["emb"]), round(it["size"], 1), now()))
    with db:
        # A new run replaces the earlier runs' unreviewed suggestions for the same video or photo.
        db.execute("DELETE FROM identify_suggestions WHERE target = ? AND status = 'pending' AND run_id != ?", (run["target"], run["id"]))
        db.executemany("INSERT INTO identify_suggestions (run_id, target, start_s, end_s, frame_s, x, y, w, h, person_id, score, "
                       "alternatives, cluster, crop, embedding, face_px, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)
    return len(known), len(unknown)


def process(db, run, det, rec):
    progress(db, run["id"], 0.01, "Reading the marked faces")
    refs, used, unreadable = load_refs(db, det, rec)
    db.execute("UPDATE identify_runs SET refs = ?, people = ? WHERE id = ?", (sum(len(v) for v in refs.values()), len(refs), run["id"]))
    db.commit()
    items, note = (run_video if run["target"].startswith("video:") else run_photo)(db, run, det, rec, refs)
    progress(db, run["id"], 0.97, "Matching faces")
    known, unknown = save(db, run, items, refs)
    msg = f"{known} faces matched to people, {unknown} not recognised"
    if note:
        msg = f"{note} ({known} matched to people, {unknown} not recognised)" if items else f"{note}: nothing more to review"
    db.execute("UPDATE identify_runs SET status = 'done', progress = 1, message = ?, finished_at = ? WHERE id = ?", (msg, now(), run["id"]))
    db.commit()
    log(f"run {run['id']} {run['target']}: {msg}; {unreadable} marked faces in the archive too unclear to use")


def loop():
    det, rec = Detector(), Recogniser()
    db = connect()
    while not db.execute("SELECT 1 FROM sqlite_master WHERE name = 'photo_uploads'").fetchone():
        time.sleep(5)  # the community service creates the tables
    # A run interrupted by a restart goes back to the front of the queue.
    db.execute("UPDATE identify_runs SET status = 'queued', progress = 0 WHERE status = 'running'")
    db.commit()
    log("faceid worker ready")
    while True:
        process_uploads(db)
        run = db.execute("SELECT * FROM identify_runs WHERE status = 'queued' ORDER BY id LIMIT 1").fetchone()
        if not run:
            time.sleep(5)
            continue
        db.execute("UPDATE identify_runs SET status = 'running', started_at = ?, progress = 0 WHERE id = ?", (now(), run["id"]))
        db.commit()
        try:
            process(db, run, det, rec)
        except Cancelled:
            log(f"run {run['id']} cancelled")
        except Exception as e:
            traceback.print_exc()
            db.rollback()
            db.execute("UPDATE identify_runs SET status = 'failed', message = ?, finished_at = ? WHERE id = ?",
                       (f"Couldn't finish: {e}"[:300], now(), run["id"]))
            db.commit()


def evaluate():
    """For people marked on 2+ photos: does each marked face match their other marks?"""
    det, rec = Detector(), Recogniser()
    db = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    phs, images, data = photos(), {}, []
    for m in db.execute("SELECT f.id, f.photo_id, f.person_id, f.x, f.y, f.w, f.h FROM photo_faces f"):
        if m["photo_id"] not in images:
            images[m["photo_id"]] = read_photo(phs[m["photo_id"]])
        e = face_for_box(det, rec, images[m["photo_id"]], (m["x"], m["y"], m["w"], m["h"]))
        if e is not None:
            data.append((m["person_id"], m["photo_id"], e))
    log(f"{len(data)} marked faces readable")
    hits = tot = 0
    pos, neg = [], []
    for pid, photo, e in data:
        refs = {}
        for p2, ph2, e2 in data:
            if ph2 != photo:
                refs.setdefault(p2, []).append(e2)
                (pos if p2 == pid else neg).append(float(e @ e2))
        if pid not in refs:
            continue
        r = rank(e, refs)
        tot += 1
        hits += r[0][0] == pid
    log(f"top-1 across photos: {hits}/{tot}")
    for name, v in (("same person", pos), ("different people", neg)):
        v = np.array(v)
        log(f"{name}: n={len(v)} mean={v.mean():.3f} p10={np.percentile(v, 10):.3f} p50={np.median(v):.3f} p90={np.percentile(v, 90):.3f}")


if __name__ == "__main__":
    evaluate() if "--eval" in sys.argv else loop()

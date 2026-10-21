#!/usr/bin/env python3
"""Browser checks of the Kodai 1994 page (Playwright + Chrome), against staging by default.

  python3 jellyfin/tests/e2e.py                       # staging: tests/staging.sh up first
  BASE=http://127.0.0.1:8098/kodai1994/ USER=... PASS=... python3 jellyfin/tests/e2e.py

Each check prints PASS or FAIL; the exit status is the number of failures. Anything the
page logs as an error, and every Content-Security-Policy violation, fails the run.
On staging it also writes (comments, clips, memories) as the stub's member account.
"""
import json
import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://127.0.0.1:8097/kodai1994/")
USER = os.environ.get("USER_NAME", "member@example.com")
PASS = os.environ.get("PASS", "test-password")
STAGING = ":8097/" in BASE
SHOTS = os.environ.get("SHOTS", "")
results, problems = [], []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail and not ok else ""), flush=True)
    return bool(ok)


EXPECTED = []   # (status, method, path) a test is about to cause on purpose


def expected(r):
    path = "/" + r.url.split("/", 3)[3].split("?")[0]
    return any(s == r.status and m == r.request.method and path.endswith(p) for s, m, p in EXPECTED)


def watch(page):
    page.on("pageerror", lambda e: problems.append(f"pageerror: {e}"))
    # failed requests are reported with their address below, not as the console's bare line
    page.on("console", lambda m: m.type == "error" and not m.text.startswith("Failed to load resource") and problems.append(f"console: {m.text}"))
    page.on("response", lambda r: r.status >= 400 and not expected(r) and problems.append(f"HTTP {r.status} {r.request.method} {r.url}"))
    page.add_init_script("document.addEventListener('securitypolicyviolation', e => console.error('CSP blocked ' + e.blockedURI + ' (' + e.violatedDirective + ')'))")


def sign_in(page, remember=False):
    page.goto(BASE)
    page.wait_for_selector("#login-form", state="visible")
    page.fill("#user", USER); page.fill("#pass", PASS)
    if remember:
        page.check("#remember")
    page.click("#login-btn")
    page.wait_for_selector("#library-view:not([hidden])", timeout=20000)


def run(tests):
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True, args=["--autoplay-policy=no-user-gesture-required",
                                    "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
        for t in tests:
            ctx = browser.new_context(viewport={"width": 1400, "height": 900})
            page = ctx.new_page(); watch(page)
            try:
                t(page, ctx)
            except Exception as e:   # one broken test shouldn't hide the others
                check(t.__name__, False, f"{type(e).__name__}: {e}")
                if SHOTS:
                    page.screenshot(path=os.path.join(SHOTS, t.__name__ + ".png"))
            ctx.close()
        browser.close()


# ── tests
def t_sign_in_and_security(page, ctx):
    page.goto(BASE)
    page.wait_for_selector("#login-form", state="visible")
    resp = page.request.get(BASE)
    csp = resp.headers.get("content-security-policy", "")
    check("page has a Content-Security-Policy without inline script", "script-src 'self'" in csp and "unsafe-inline" not in csp.split("script-src")[1].split(";")[0])
    page.fill("#user", USER); page.fill("#pass", "wrong password")
    EXPECTED.append((401, "POST", "/api/session"))
    page.click("#login-btn")
    page.wait_for_function("() => document.getElementById('login-error').textContent.length > 0")
    check("wrong password is refused", "don’t match" in page.text_content("#login-error"), page.text_content("#login-error"))
    sign_in(page)
    cookies = {c["name"]: c for c in ctx.cookies()}
    check("token cookie is HttpOnly", cookies.get("kodai_auth", {}).get("httpOnly") is True, cookies.get("kodai_auth"))
    check("script can't read the token", "kodai_auth" not in page.evaluate("document.cookie"))
    stored = page.evaluate("localStorage.getItem('yajur-kodai-session') || sessionStorage.getItem('yajur-kodai-session')")
    check("no token kept in storage", stored and "token" not in json.loads(stored), stored)
    page.wait_for_selector(".home, .feed-filter, .home__welcome", timeout=20000)
    EXPECTED.append((404, "GET", "/jf/Users"))
    st = page.request.get(BASE + "jf/Users").status
    check("gateway refuses Jellyfin paths the page doesn't use", st == 404, st)
    st = page.request.get(BASE + "jf/UserViews").status
    check("gateway lets the page's Jellyfin calls through", st == 200, st)


def t_play(page, ctx):
    sign_in(page)
    page.evaluate("document.querySelector('[data-view=videos]').click()")
    page.wait_for_selector(".entry:not(.is-pending), .card:not(.is-pending)", timeout=20000)
    page.locator(".entry:not(.is-pending), .card:not(.is-pending)").first.click()
    page.wait_for_selector("#player:not([hidden])")
    page.wait_for_function("() => { const v = document.querySelector('#video video, video#video_html5_api'); return v && v.currentTime > 1; }", timeout=30000)
    check("a recording plays", True)
    thumbs = page.evaluate("[...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0 && i.src.includes('/jf/')).length")
    check("Jellyfin thumbnails load through the gateway", thumbs == 0, thumbs)
    page.click("#close")


def t_old_session_moves_to_httponly(page, ctx):
    """A member signed in before this change: token in localStorage and in a cookie the page set."""
    if not STAGING:
        return print("skip old-session test (staging only)")
    token = "b" * 32   # stub_jellyfin.py: a fixed token of member@example.com
    page.goto(BASE.split("/kodai1994/")[0] + "/robots.txt")
    page.evaluate(f"""localStorage.setItem('yajur-kodai-session', JSON.stringify({{token: '{token}', userId: 'x', name: '{USER}', remember: true}}));
                     document.cookie = 'kodai_auth={token}; Path=/kodai1994/; SameSite=Strict; Max-Age=600';""")
    page.goto(BASE)
    page.wait_for_selector("#library-view:not([hidden])", timeout=20000)
    cookies = {c["name"]: c for c in ctx.cookies()}
    check("old session: still signed in, cookie now HttpOnly", cookies.get("kodai_auth", {}).get("httpOnly") is True and cookies["kodai_auth"]["value"] == token)
    stored = page.evaluate("localStorage.getItem('yajur-kodai-session')")
    check("old session: token dropped from storage", "token" not in json.loads(stored), stored)


def t_identify_page(page, ctx):
    sign_in(page)
    page.goto(BASE + "identify.html")
    page.wait_for_selector("#layout:not([hidden])", timeout=20000)
    check("Identify page loads with the HttpOnly cookie", True)


def t_other_pages(page, ctx):
    """The pages outside the main app load their scripts (moved out of the pages for the CSP)."""
    sign_in(page)
    for name, ready in (("audio-compare.html", "audio, .compare, main"), ("video-compare.html", "video, main"),
                        ("enhance-compare.html", "img, main"), ("identify.html", "#layout:not([hidden])")):
        before = len(problems)
        if name == "enhance-compare.html":   # it tries every photo; only some have an enhanced copy
            EXPECTED.extend((404, "GET", f"/photos-enhanced/{i:02d}.jpg") for i in range(1, 400))
        page.goto(BASE + name)
        page.wait_for_selector(ready, timeout=20000)
        page.wait_for_load_state("networkidle")
        check(f"{name} loads without errors", len(problems) == before, problems[before:][:3])


def t_sign_out(page, ctx):
    sign_in(page, remember=True)
    page.wait_for_selector(".feed-filter", timeout=20000)   # Home has loaded: nothing still asking the server
    page.wait_for_load_state("networkidle")
    EXPECTED.extend([(401, "GET", "/thumb.jpg"), (401, "GET", "/backdrop.jpg"), (401, "GET", "/backdrop-blur.jpg")])   # still loading as we leave
    with page.expect_response(lambda r: r.url.endswith("/api/session") and r.request.method == "DELETE"):
        page.evaluate("document.getElementById('logout').click()")
    page.wait_for_selector("#login-form", state="visible")
    EXPECTED.append((401, "GET", "/api/me"))
    st = page.request.get(BASE + "api/me").status
    check("signed out: the server no longer knows us", st == 401, st)
    page.reload()
    page.wait_for_selector("#login-form", state="visible")
    check("signed out: reload shows sign-in", True)


def open_first_video(page):
    page.evaluate("document.querySelector('[data-view=videos]').click()")
    page.wait_for_selector(".subtabs button[data-mode=timeline]")
    page.click(".subtabs button[data-mode=timeline]")
    page.wait_for_selector(".entry:not(.is-pending)", timeout=20000)
    page.locator(".entry:not(.is-pending)").first.click()
    page.wait_for_selector("#player:not([hidden]) .markers__add", timeout=20000)


def t_clips(page, ctx):
    if not STAGING:
        return print("skip clips test (writes; staging only)")
    sign_in(page)
    page.request.put(BASE + "api/me", headers={"X-Kodai": "1", "Content-Type": "application/json"}, data=json.dumps({"displayName": "E2E Member"}))
    page.reload(); page.wait_for_selector("#library-view:not([hidden])")
    for c in page.request.get(BASE + "api/clips").json():   # left by an earlier run
        if c["title"].startswith("E2E clip"):
            page.request.delete(BASE + f"api/clips/{c['id']}", headers={"X-Kodai": "1"})
    open_first_video(page)
    page.click(".markers__add > button")
    page.check(".markers__add .seg input[value=clip]", force=True)
    page.fill(".markers__add input[id^=mk-title]", "E2E clip: the first minute")
    page.fill(".markers__add input[id^=mk-time]", "0:05")
    page.fill(".markers__add input[id^=mk-end]", "0:09")
    page.click(".markers__add button[type=submit]")
    page.wait_for_selector(".marker--clip:has-text('E2E clip')", timeout=10000)
    check("make a clip beside the player", True)
    check("clip shows as a band on the seek bar", page.locator(".mk-range").count() >= 1)
    page.locator(".marker--clip:has-text('E2E clip') .marker__title").click()
    page.wait_for_selector(".clipbar:not([hidden])")
    page.wait_for_selector(".clipbar__ended", timeout=30000)
    t = page.evaluate("document.querySelector('#video video, video').currentTime")
    check("clip pauses at its end", 8.5 <= t <= 10.5, t)
    page.click(".clipbar button:text-is('Keep watching')")
    check("Keep watching leaves the clip", page.locator(".clipbar").is_hidden())
    page.click("#close")
    page.evaluate("document.querySelector('[data-view=videos]').click()")
    page.click(".subtabs button[data-mode=clips]")
    page.wait_for_selector(".clip-card:has-text('E2E clip')")
    check("Clips tab lists it", True)
    cid = page.evaluate("fetch('/kodai1994/api/clips').then(r => r.json()).then(l => l.find(c => c.title.startsWith('E2E clip')).id)")
    page.goto(BASE + f"#clip/{cid}")
    page.wait_for_selector(".clipbar:not([hidden]) .clipbar__title:has-text('E2E clip')", timeout=20000)
    check("a clip's link plays it", True)
    page.request.delete(BASE + f"api/clips/{cid}", headers={"X-Kodai": "1"})


def t_record_memory(page, ctx):
    """Record a video memory with the browser's (fake) camera, share it, have it prepared, play it."""
    if not STAGING:
        return print("skip recording test (writes; staging only)")
    import subprocess
    ctx.grant_permissions(["camera", "microphone"])
    sign_in(page)
    page.request.put(BASE + "api/me", headers={"X-Kodai": "1", "Content-Type": "application/json"}, data=json.dumps({"displayName": "E2E Member"}))
    page.reload(); page.wait_for_selector("#library-view:not([hidden])")
    page.evaluate("document.querySelector('[data-view=memories]').click()")
    page.click("button:has-text('Record a memory')")
    page.fill("#mem-title", "E2E recording: the lake")
    page.click(".rec button:has-text('Record a video')")
    page.wait_for_selector(".rec__live:not([hidden])", timeout=10000)
    page.wait_for_timeout(3200)
    page.click(".rec__live button:text-is('Stop')")
    page.wait_for_selector(".rec__done:not([hidden]) video.rec__playback", timeout=10000)
    check("record a video memory in the browser", True)
    page.click("form.memory-edit button[type=submit]")
    page.wait_for_selector(".memory__media p:has-text('being prepared')", timeout=20000)
    check("shared: shown as being prepared", True)
    stg = os.path.expanduser("~/.cache/kodai-staging")
    env = dict(os.environ, REC_SRC=f"{stg}/uploads/recordings", REC_OUT=f"{stg}/memories/rec", DB_PATH=f"{stg}/data/community.db")
    out = subprocess.run([sys.executable, "-I", os.path.join(os.path.dirname(__file__), "..", "kodai1994", "media-queue.py")],
                         env=env, capture_output=True, text=True, timeout=180)
    check("media-queue prepares it", "ready" in out.stdout, out.stdout + out.stderr)
    page.wait_for_selector(".memory__media video[src*='/memories/rec/']", timeout=20000)
    page.wait_for_function("() => { const v = document.querySelector('.memory__media video'); return v && v.readyState >= 1 && v.duration > 2; }", timeout=20000)
    check("the memory page plays the prepared recording", True)
    mid = page.evaluate("fetch('/kodai1994/api/memories').then(r => r.json()).then(l => l.find(m => m.title.startsWith('E2E recording')).id)")
    page.request.delete(BASE + f"api/memories/{mid}", headers={"X-Kodai": "1"})


def t_captions(page, ctx):
    """A recording with a transcript (staging: tests/staging.sh with CAPTIONS=1 made one for Picnic (Raj))."""
    global USER
    if not STAGING:
        return print("skip captions test (staging only)")
    saved, USER = USER, "admin"
    try:
        sign_in(page)
        status = page.request.get(BASE + "api/captions/status").json()
        target = next((t for t, v in status.items() if v.get("lines")), None)
        if not check("a recording has a transcript", target, status):
            return
        slug = target.split(":", 1)[1]
        page.evaluate("document.querySelector('[data-view=videos]').click()")
        page.click(".subtabs button[data-mode=gallery]")
        check("CC badge on its card", page.locator(".card .mk-count--cc").count() >= 1)
        page.evaluate(f"document.querySelectorAll('.card').forEach(c => {{ if (c.querySelector('.mk-count--cc')) c.dataset.cc = '1'; }})")
        page.locator(".card[data-cc='1']").first.click()
        page.wait_for_selector(".transcript:not([hidden]) summary", timeout=15000)
        page.wait_for_timeout(1500)
        labels = page.evaluate("[...document.querySelectorAll('.vjs-subs-caps-button .vjs-menu-item-text, .vjs-captions-button .vjs-menu-item-text')].map(e => e.textContent.trim())")
        check("CC menu offers the original", any(l.startswith("Original (as spoken)") for l in labels), labels)
        page.click(".transcript summary")
        page.wait_for_selector(".transcript__line")
        n = page.locator(".transcript__line").count()
        check("transcript lists the lines", n >= 5, n)
        line = page.locator(".transcript__list li").nth(3)
        start = page.evaluate("t => t", page.request.get(BASE + f"api/captions?target={target}").json()["lines"][3]["start"])
        line.locator(".transcript__line").click()
        page.wait_for_timeout(1500)
        t = page.evaluate("document.querySelector('#video video, video').currentTime")
        check("a line plays from there", abs(t - start) < 3, (t, start))
        check("the line being said is marked", page.locator(".transcript__list li.is-now").count() == 1)
        # a moderator corrects a line, and it shows in the CC track too
        line.locator(".transcript__edit").click()
        page.fill(".transcript__form input", "E2E corrected line")
        page.click(".transcript__form button[type=submit]")
        page.wait_for_selector(".transcript__text:text-is('E2E corrected line')", timeout=10000)
        vtt = page.request.get(BASE + f"api/captions.vtt?target={target}&lang=orig").text()
        check("the correction is in the captions", "E2E corrected line" in vtt)
        page.fill(".transcript__tools input[type=search]", "E2E corrected")
        check("find in the transcript", page.locator(".transcript__line").count() == 1)
        page.click("#close")
        page.keyboard.press("/")
        page.fill("#search-q", "corrected line")
        page.wait_for_selector("#search-results h3:text-is('What was said')", timeout=10000)
        check("search finds what was said", True)
    finally:
        USER = saved


def t_search(page, ctx):
    sign_in(page)
    page.keyboard.press("/")
    page.wait_for_selector("#search:not([hidden])")
    page.fill("#search-q", "may picnic")
    page.wait_for_selector("#search-results h3", timeout=10000)
    heads = page.locator("#search-results h3").all_inner_texts()
    check("search finds recordings by words in any order", "Recordings" in heads, heads)
    marks = page.locator("#search-results mark").all_inner_texts()
    check("search marks the words", any(m.lower().startswith("picnic") for m in marks), marks[:5])


def t_audit_panel(page, ctx):
    global USER
    if not STAGING:
        return print("skip audit panel test (needs a moderator; staging only)")
    saved, USER = USER, "admin"
    try:
        sign_in(page)
        page.click("#account-open")
        page.wait_for_selector("#audit:not([hidden]) #audit-list li", timeout=10000)
        text = page.inner_text("#audit-list")
        check("moderators see recent actions (sign-ins too)", "signed in" in text, text[:200])
    finally:
        USER = saved


TESTS = [t_sign_in_and_security, t_play, t_old_session_moves_to_httponly, t_identify_page, t_clips, t_record_memory, t_captions, t_search, t_audit_panel, t_other_pages, t_sign_out]

if __name__ == "__main__":
    only = sys.argv[1:]
    run([t for t in TESTS if not only or t.__name__ in only])
    for pr in problems:
        print("PROBLEM", pr)
    check("no page errors or CSP violations", not problems, f"{len(problems)} problems")
    print(f"{results.count(True)} passed, {results.count(False)} failed")
    sys.exit(results.count(False))

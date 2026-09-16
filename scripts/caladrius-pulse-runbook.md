# Caladrius Pulse — Monthly Roundup Runbook

This is the procedure for the **monthly "Caladrius Pulse" edition** — a Pontifex
post that summarises every new article published on
[caladriushealth.ai](https://caladriushealth.ai/blog/) since the last edition.

It is executed automatically by a **scheduled cloud routine** (Claude Code
routine, runs monthly) but is written so a human can run it by hand identically.

---

## What it does

1. Fetch the Caladrius blog feed: `https://caladriushealth.ai/feed.xml`.
2. Compare every post URL against the coverage ledger `_data/caladrius_covered.yml`.
   Match case-insensitively, ignoring a trailing `/`.
3. Take the posts **not** already in the ledger = the new posts to summarise.
   - If there are **zero** new posts, stop. Do not publish an empty edition —
     just log "no new Caladrius posts this month" and exit.
4. Read each new post in full and write a dense, specific summary (~200–280
   words each), matching the house style of the two existing editions:
   - `_posts/2026-07-14-caladrius-pulse-10-reads-on-abdm-and-nhcx.md`
   - `_posts/2026-09-16-caladrius-pulse-august-2026-consent-claims-and-abdm-on-the-ground.md`
   - Newest first. Each summary ends with a `🔗 **Read it:**` link to the source.
   - Keep specific figures, scheme names, and the "what sticks" framing.
   - Add 1–3 internal links to related Yajur posts via `{% raw %}{% post_url ... %}{% endraw %}`.
   - Include the standard **Disclosure** block at the end (copy from a prior edition).
5. Create the post at
   `_posts/YYYY-MM-DD-caladrius-pulse-<month>-<year>-<slug>.md` with front matter
   mirroring the prior editions (layout, title, date, author, description,
   keywords, tags, categories, reading_time, og_*, mentions).
   - Title convention: `Caladrius Pulse — <Month> <Year>: <short theme>`.
   - `date` = the run date.
6. Append the newly-covered URLs to `_data/caladrius_covered.yml` under a new
   `# --- Edition N: <date> ---` comment, each with `url`, `title`, `date`,
   and `edition: <run date>`.
7. Publish (see below).

## Coverage window

Each edition covers **everything new since the previous edition**, titled by the
review month. The `_data/caladrius_covered.yml` ledger — not the calendar — is
the source of truth for "already covered," so late-arriving posts from a prior
month are always swept into the next edition rather than lost.

## Publish (auto-publish pipeline)

The repo deploys via: push to a `claude/**` branch → `auto-pr.yml` auto-merges
it into `dev` → dispatch **"Promote dev to main"** → `deploy.yml` builds and
ships to GitHub Pages at https://yajur.ai/.

```bash
BR="claude/caladrius-pulse-$(date -u +%Y-%m)"
git checkout -b "$BR"
git add _posts/ _data/caladrius_covered.yml
git commit -m "post: Caladrius Pulse — <Month> <Year> roundup"
git push origin "$BR"                 # auto-merges into dev
# wait for the auto-merge to land, then promote to production:
gh workflow run "Promote dev to main" --ref main
```

The new post appears on Pontifex automatically (`pontifex.md` lists all
`site.posts`), and in `sitemap.xml` / `feed.xml`.

## Verify after publish

- `curl -sI https://yajur.ai/<post-url>` returns `200` (allow a few minutes for
  the deploy + CDN).
- The post shows at the top of https://yajur.ai/pontifex.html.

## Guardrails

- **Never** re-summarise a URL already in the ledger.
- **Never** publish an edition with zero new posts.
- Trace every figure to the source article; do not invent numbers.
- Keep the Disclosure block on every edition.

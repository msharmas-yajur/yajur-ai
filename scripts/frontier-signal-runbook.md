# Frontier Signal — Roundup Runbook (every 5 days)

Procedure for the **"Frontier Signal"** Pontifex post — a recurring scan of the
six companies bending the curve of AI and space, summarising what they shipped
since the last edition. Runs automatically via a **scheduled cloud routine**
(every 5 days) but is written so a human can run it identically.

## Tracked sources

| Company | Primary index | Fallback |
|---------|---------------|----------|
| Anthropic | https://www.anthropic.com/news | — |
| OpenAI | https://openai.com/news/ (often 403s automated fetch) | WebSearch `openai.com` for recent announcements |
| Google (Gemini/DeepMind) | https://blog.google/products/gemini/ · https://deepmind.google/discover/blog/ | WebSearch |
| SpaceX | https://www.spacex.com/updates/ (JS-rendered, often unreadable) | WebSearch (Starship/Starlink/Falcon) + reputable coverage (Spaceflight Now, TechCrunch) |
| Groq | https://groq.com/blog/ · https://groq.com/newsroom/ | WebSearch |
| Cursor | https://www.cursor.com/blog · https://www.cursor.com/changelog | WebSearch |

## What it does each run

1. For each company, fetch the index (use the WebSearch fallback if the fetch
   is blocked/empty — OpenAI and SpaceX routinely need this).
2. Load `_data/frontier_signal_covered.yml` and build the covered set.
   Match on `url` (lowercase, trailing `/` stripped). For **SpaceX**, also match
   on `title`, since its updates have no stable per-item URLs.
3. NEW items = index items not in the covered set. Keep only genuinely notable
   ones (model releases, product launches, major research, hardware, funding,
   M&A, launch milestones) — skip minor/pricing-only posts.
4. **Zero-new guard:** if *no* company has anything new, print
   "no new frontier updates this cycle", make NO commits, and STOP. Do not
   publish an empty edition. (With a 5-day cadence some editions will be short —
   that's fine; a short edition with 2–3 real items is still worth publishing.)
5. Write the edition matching the house style of the first one:
   `_posts/2026-09-16-frontier-signal-what-the-ai-and-space-frontier-shipped.md`.
   - One section per company that has news (skip companies with nothing new).
   - Keep specific figures, model names, and dates; **link every claim to a
     source**; never invent numbers. Corroborate blocked sources via primary
     announcements + reputable coverage, and say so.
   - Open with a 1–2 line intro naming the review window; close with a
     "through-line" synthesis. Add 1–3 internal `{% raw %}{% post_url ... %}{% endraw %}` links to
     related Yajur posts (verify each target file exists in `_posts/` or the
     build FAILS).
6. Create the post at
   `_posts/YYYY-MM-DD-frontier-signal-<slug>.md` with front matter mirroring the
   first edition (layout, title `Frontier Signal — <Month> <Year>: <theme>`,
   date, author, description, keywords, tags, categories `[Frontier Signal, Curated Reading]`,
   reading_time, og_*, and a `mentions` list of the companies covered).
7. Append every newly-covered item to `_data/frontier_signal_covered.yml` under a
   new `# --- Edition N: <today> ---` block (company, url, title, date, edition).

## Publish (auto-publish pipeline)

Same pipeline as the rest of the site: push to a `claude/**` branch →
`auto-pr.yml` auto-merges into `dev` → dispatch "Promote dev to main" → deploy.

```bash
BR="claude/frontier-signal-$(date -u +%Y-%m-%d)"
git checkout -b "$BR"
git add _posts/ _data/frontier_signal_covered.yml
git commit -m "post: Frontier Signal — $(date -u +%Y-%m-%d) roundup"
git push origin "$BR"                 # auto-merges into dev
gh workflow run "Promote dev to main" --ref main
```

Then verify the new post returns `200` on https://yajur.ai/ and appears on
https://yajur.ai/pontifex.html.

## Guardrails

- Never re-summarise an item already in the ledger.
- Never publish an edition with zero new items.
- Trace every figure/claim to a linked source; flag anything unverified.
- Prefer primary announcements; corroborate blocked sources and say how.

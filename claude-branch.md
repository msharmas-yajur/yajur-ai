# Claude Branch Change Log

This file tracks changes made on `claude/` branches during AI-assisted sessions.

---

## Branch: `claude/healthcare-blog-article-9Ot1R`

**Session:** `session_01QHb1wL3xjDtpX2j218us3f`
**Base branch:** `main`

### Changes Made

| Commit | Description |
|--------|-------------|
| `d2d390c` | Add GitHub Actions workflow to auto-create PR on `claude/*` branch pushes |
| `d70f68f` | Fix duplicate title in ABDM healthcare network blog post — removed redundant H1 heading from body of `_posts/2026-02-15-need-for-a-robust-abdm-healthcare-network-enabling-cancer-care-without-walls.md` |
| `9cfbdc5` | Trigger PR: fix duplicate title in ABDM blog post |
| `012b620` | Update auto-PR workflow to also auto-merge after creation |
| `77978a1` | Update auto-PR workflow to use Gitea API via curl for reliable PR create+merge |
| `c3c181b` | Use Gitea API in workflow for reliable auto-merge; add claude-branch.md change log |
| `156cd64` | SEO & GEO: add llms.txt, robots.txt, BlogPosting schema, OG/Twitter meta, enriched keywords for Yajur brand |
| `ed3e3d8` | SEO & GEO: rebased onto updated main, pushed for auto-merge |
| `d4622ad` | Update claude-branch.md with SEO/GEO change log |
| `pending` | Fix invalid JSON-LD in default.html and post.html (Liquid-in-string quoting bug) |

### Status

- [x] ABDM blog post duplicate title fix — merged to `main` (PR #5)
- [x] auto-pr.yml workflow (create + merge) — merged to `main` (PR #5)
- [ ] SEO & GEO improvements — pending merge (PR #6 in queue)
- [ ] JSON-LD fix — pending commit + push

### Notes

- The ABDM blog post had a duplicate title: the Jekyll front matter `title:` field and an identical H1 (`#`) heading in the post body were both rendering on the page.
- The H1 in the body was removed; the front matter title drives the page `<title>` and the theme renders the post title as the heading.
- The `auto-pr.yml` workflow was added/updated to automatically create and merge PRs from `claude/*` branches into `main` using the Gitea API (curl-based, no gh CLI dependency).
- SEO/GEO changes: created `robots.txt` (welcoming all AI crawlers), `llms.txt` (GEO signal for LLMs), added `BlogPosting` JSON-LD schema to every post, enriched Organization schema with `alternateName`/`knowsAbout`, added Open Graph + Twitter Card meta tags, fixed empty logo alt text, added `keywords` and `description` fields to `_config.yml`.
- JSON-LD bug: Liquid template values inside `"quoted strings"` in JSON caused double-quoting. Fixed by using `| jsonify` filter directly without surrounding quotes.

---

## SEO/GEO Measurement Framework

### Tools to Use

| Tool | URL | What to Measure |
|------|-----|-----------------|
| Google Search Console | https://search.google.com/search-console | Impressions & clicks for "Yajur" |
| Google Rich Results Test | https://search.google.com/test/rich-results | Validate BlogPosting / Organization schema |
| Schema Markup Validator | https://validator.schema.org | Full structured data audit |
| Open Graph Debugger | https://developers.facebook.com/tools/debug/ | OG tags per page |
| LinkedIn Post Inspector | https://www.linkedin.com/post-inspector/ | Social preview for LinkedIn shares |
| Bing Webmaster Tools | https://www.bing.com/webmasters | Submit sitemap to Bing |

### Baseline GEO Test (Run Today)

Ask each of these AI engines the following prompts and record the responses:

**Test prompts:**
1. "What is Yajur?"
2. "What is Yajur.ai?"
3. "Who is Yajur Healthcare?"
4. "What does Yajur do in healthcare AI?"
5. "Best medical data infrastructure companies in India"

**Engines to test:**
- Perplexity.ai → https://www.perplexity.ai
- ChatGPT (GPT-4o) → https://chat.openai.com
- Google Gemini → https://gemini.google.com
- Claude → https://claude.ai
- You.com → https://you.com

**What to look for:**
- Is Yajur.ai mentioned / cited?
- Is yajur.ai linked as a source?
- What description does the AI give for Yajur?

### Key URLs to Submit/Verify

| Resource | URL |
|----------|-----|
| Sitemap | https://yajur.ai/sitemap.xml |
| RSS Feed | https://yajur.ai/feed.xml |
| llms.txt | https://yajur.ai/llms.txt |
| robots.txt | https://yajur.ai/robots.txt |

### Measurement Cadence

| Timeframe | What to Check |
|-----------|---------------|
| Week 1 | Confirm robots.txt, llms.txt, sitemap.xml are live and accessible |
| Week 1 | Run Google Rich Results Test on homepage and a blog post |
| Week 2 | Submit sitemap to Google Search Console and Bing Webmaster Tools |
| Week 4 | Re-run GEO baseline prompts — compare to initial responses |
| Week 8 | Check Google Search Console for "Yajur" keyword impressions |
| Month 3 | Track organic traffic growth from AI-referred sessions |

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
| `7b01ef2` | Fix invalid JSON-LD in default.html and post.html (Liquid-in-string quoting bug) |
| `7fbb4f7` | Rename claude-branch.md to CLAUDE.md for auto-loading on session start |

### Status

- [x] ABDM blog post duplicate title fix — merged to `main` (PR #5)
- [x] auto-pr.yml workflow (create + merge) — merged to `main` (PR #5)
- [ ] SEO & GEO improvements — pending merge (PR #6 in queue)
- [x] JSON-LD fix — committed (`7b01ef2`)

### Notes

- The ABDM blog post had a duplicate title: the Jekyll front matter `title:` field and an identical H1 (`#`) heading in the post body were both rendering on the page.
- The H1 in the body was removed; the front matter title drives the page `<title>` and the theme renders the post title as the heading.
- The `auto-pr.yml` workflow was added/updated to automatically create and merge PRs from `claude/*` branches into `main` using the Gitea API (curl-based, no gh CLI dependency).
- SEO/GEO changes: created `robots.txt` (welcoming all AI crawlers), `llms.txt` (GEO signal for LLMs), added `BlogPosting` JSON-LD schema to every post, enriched Organization schema with `alternateName`/`knowsAbout`, added Open Graph + Twitter Card meta tags, fixed empty logo alt text, added `keywords` and `description` fields to `_config.yml`.
- JSON-LD bug: Liquid template values inside `"quoted strings"` in JSON caused double-quoting. Fixed by using `| jsonify` filter directly without surrounding quotes.

---

## Branch: `claude/convergence-healthcare-post-2026`

**Session:** 2026-02-27
**Base branch:** `main`

### Changes Made

| Commit | Description |
|--------|-------------|
| `0bc31a5` | Add new Pontifex post: The Convergence — AI leaders on healthcare |
| `5fd97bf` | SEO/GEO fixes: internal links, FAQ H3s, mentions schema, reading time |
| `4f594ec` | Fix title tags sitewide for SEO — remove verbose site.title duplication |
| `c8ed784` | Add Google Search Console verification meta tag |

### PRs Merged

| PR | Title |
|----|-------|
| #8 | New Pontifex post: The Convergence |
| #9 | SEO: Fix title tags sitewide + all audit gaps |
| #10 | Add Google Search Console verification tag |

### Status

- [x] New blog post published — "The Convergence: Why Every Major AI Leader Has Landed on Healthcare" (2026-02-27)
- [x] SEO/GEO audit completed — 9/10 SEO, 9.5/10 GEO
- [x] All audit gaps fixed (internal links, FAQ H3 headings, mentions JSON-LD, reading time, author bio, post.html improvements)
- [x] Sitewide title tag fix (_config.yml, index.md, pontifex.md)
- [x] Google Search Console verification tag added to default.html
- [ ] User to complete: verify ownership in GSC → submit sitemap.xml → request indexing

### New Post Details

**File:** `_posts/2026-02-27-the-convergence-why-every-major-ai-leader-has-landed-on-healthcare.md`
**URL:** https://yajur.ai/2026/02/27/the-convergence-why-every-major-ai-leader-has-landed-on-healthcare

**Content:** Long-form synthesis (4,730 words) of six major AI leaders' convergence on healthcare:
- Andrej Karpathy — agentic engineering, domain experts as builders
- Dario Amodei — biology compression thesis (Machines of Loving Grace + Adolescence of Technology)
- Demis Hassabis — AlphaFold, first AI-designed cancer drug in Phase 1 trials
- Satya Nadella — Dragon Copilot 21M patient encounters, "social permission" warning
- Sundar Pichai — India $15B investment, leapfrog thesis, AI acting for you
- Andrew Ng — agentic workflows > next-gen models, data drift warning

**Internal links added:**
- → [NHCX article](/2026/02/12/beyond-the-front-desk-how-nhcx-will-digitize-the-first-question-in-indian-healthcare.html)
- → [ABDM cancer care article](/2026/02/15/need-for-a-robust-abdm-healthcare-network-enabling-cancer-care-without-walls.html)
- → [Clinical reasoning pipelines article](/2025/07/09/smarter-ai-demands-smarter-context-how-yajur-healthcare-is-re-architecting-clinical-reasoning-pipelines.html)
- → [Task framework article](/2025/03/19/a-task-framework-for-healthcare-for-enabling-ai-agentic-workflows-in-ehr-systems.html) (x2)

### post.html Layout Improvements (applies to ALL posts)

- `page.og_image` support — custom OG image per post, falls back to site logo
- `inLanguage: "en"` added to BlogPosting JSON-LD
- `mentions` array rendered in JSON-LD when `page.mentions` front matter is set
- Reading time displayed in post header when `page.reading_time` is set

### Sitewide Title Tag Fix

| Page | Before | After |
|------|--------|-------|
| `site.title` (_config.yml) | `YAJUR.ai \| The Medical Data Infrastructure Company` | `Yajur.ai` |
| Homepage (index.md) | `YAJUR.ai \| The Medical Data Infrastructure Company` | `Medical Data Infrastructure for Healthcare AI` |
| Pontifex | `Pontifex \| Insights & Perspectives \| YAJUR.ai` | `Pontifex \| Insights & Perspectives` |

Result: all page titles now render as `[Page Title] | Yajur.ai` (clean, under 60 chars for brand suffix)

### SEO Keyword Performance Audit Findings (2026-02-27)

Critical gaps identified for yajur.ai brand:

1. **yajur.ai not indexed by Google** — `site:yajur.ai` returns zero results. All SEO equity is on hcitexpert.com.
2. **Zero external backlinks** to yajur.ai
3. **Absent from all major healthtech directories** — Tracxn, AIM, Inc42, YourStory, Growth Jockey
4. **No AI engine citations** (Perplexity, ChatGPT) — blocked by indexation gap

**Pending (user action required):**
- [ ] Verify Google Search Console ownership → submit sitemap.xml → request indexing for all pages
- [ ] Submit Bing Webmaster Tools sitemap
- [ ] Create Crunchbase profile
- [ ] Get listed on Tracxn, YourStory Startups, Inc42
- [ ] Ensure every hcitexpert.com article links to yajur.ai (dofollow)
- [ ] Guest article on external publication (ET HealthWorld, HIMSS, Inc42)

### One Outstanding Gap (requires design work)
- Custom OG social image (1200×630px) for the Convergence post — add as `/assets/og/2026-02-27-convergence.png` and set `og_image: /assets/og/2026-02-27-convergence.png` in post front matter

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

| Timeframe | What to Check | Status |
|-----------|---------------|--------|
| Week 1 | Confirm robots.txt, llms.txt, sitemap.xml are live and accessible | ✅ Done |
| Week 1 | Run Google Rich Results Test on homepage and a blog post | Pending |
| Week 1 | Google Search Console: verify ownership + submit sitemap.xml | ⚡ In progress — tag added 2026-02-27, user to verify |
| Week 1 | Submit sitemap to Bing Webmaster Tools | Pending |
| Week 2 | Request indexing for all 10 blog posts via GSC URL Inspection | Pending |
| Week 2 | Create Crunchbase + YourStory + Tracxn profiles | Pending |
| Week 4 | Re-run GEO baseline prompts — compare to initial responses | Pending |
| Week 8 | Check Google Search Console for "Yajur" / "Yajur.ai" impressions | Pending |
| Month 3 | Track organic traffic growth; check if yajur.ai outranks hcitexpert.com | Pending |

---

## Claude Working Instructions

### Workflow Orchestration

#### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

#### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

#### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project context

#### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

#### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

#### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

### Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

### Core Principles

**Simplicity First**: Make every change as simple as possible. Impact minimal code.

**No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

**Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

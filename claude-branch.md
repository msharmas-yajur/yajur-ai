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

### Status

- [x] Fix applied on feature branch
- [ ] Merged to `main`
- [ ] Live on site

### Notes

- The ABDM blog post had a duplicate title: the Jekyll front matter `title:` field and an identical H1 (`#`) heading in the post body were both rendering on the page.
- The H1 in the body was removed; the front matter title drives the page `<title>` and the theme renders the post title as the heading.
- The `auto-pr.yml` workflow was added/updated to automatically create and merge PRs from `claude/*` branches into `main` using the Gitea API.

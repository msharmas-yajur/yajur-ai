# Yajur.ai Agent Workflow

This document describes the branching model, local preview, and worktree conventions for AI-assisted development on yajur.ai.

---

## Branching Model

```
Agent worktree (feature/xxx or claude/xxx)
  → local preview in worktree (localhost:400x)
  → auto-merge into dev (via auto-pr.yml)
  → local preview on dev (localhost:4000)
  → human reviews
  → promote dev to main (manual: promote-to-main.yml)
  → GitHub Pages deploys to yajur.ai
```

### Branch Rules

| Branch | Purpose | Who writes | Deploys? |
|--------|---------|------------|----------|
| `main` | Production | Workflow only (promote) | Yes → yajur.ai |
| `dev` | Review staging | Agents + humans | No |
| `claude/*` | Agent features | AI agents | Auto-merges to `dev` |
| `feature/*` | Human features | Humans | Merge to `dev` manually |

---

## Automated Workflows

### `auto-pr.yml` — Agent branch → dev
Triggered on push to any `claude/*` branch. Auto-merges the branch into `dev` using `--no-ff -X theirs` (agent wins on conflict).

### `promote-to-main.yml` — dev → main (manual)
Triggered manually via GitHub Actions UI (`workflow_dispatch`). Merges `dev` into `main`, auto-generates a `CHANGELOG.md` entry from the commits, then pushes. This is the only way `main` gets updated.

### `deploy.yml` — main → yajur.ai
Triggered on push to `main`. Builds Jekyll and deploys to GitHub Pages. Runs a health check after deploy (homepage, a blog post, sitemap.xml). If health check fails, auto-triggers `rollback.yml`. Circuit breaker: if the commit already has `[rollback]` in the message, it fails loudly instead of looping.

### `rollback.yml` — revert main (manual or auto)
Reverts the last commit on `main` (safe for merge commits via `-m 1`). Amends the revert commit message to include `[rollback]` — this tag is the circuit breaker that prevents the health-check → rollback → health-check loop.

---

## Local Preview

```bash
# Default port 4000
./scripts/preview.sh

# Custom port (for simultaneous worktree previews)
./scripts/preview.sh 4001
```

Runs Jekyll with `--livereload` and `--incremental`. Works from the main repo directory or any worktree.

---

## Agent Worktrees

Worktrees live under `/home/msharma/worktrees/`. Each is a full checkout of the repo on its own branch.

### Creating a worktree

```bash
cd /home/msharma/yajur_ai

# Create worktree for a new feature
git worktree add /home/msharma/worktrees/<feature-name> -b claude/<feature-name>

# Preview inside the worktree
/home/msharma/yajur_ai/scripts/preview.sh 4001
# (run from any directory — the script resolves its own repo root)
```

### Merging a worktree branch

Push the branch — `auto-pr.yml` handles the merge into `dev` automatically:

```bash
cd /home/msharma/worktrees/<feature-name>
git push origin claude/<feature-name>
# → auto-merged into dev within ~60 seconds
```

### Cleaning up a worktree

```bash
git worktree remove /home/msharma/worktrees/<feature-name>
git branch -d claude/<feature-name>  # only after merged
```

---

## Mobile / Claude Code App Sessions

Mobile sessions create `claude/*` branches in the main repo (not worktrees). The `auto-pr.yml` workflow routes them into `dev` automatically — same pipeline, no special handling needed.

---

## Promoting to Production

1. Review changes on `dev` locally: `./scripts/preview.sh`
2. Go to **GitHub Actions → Promote dev to main → Run workflow**
3. Wait for deploy + health check to pass
4. Done — changes are live on yajur.ai

If something goes wrong, go to **GitHub Actions → Rollback main → Run workflow** (or wait for the automatic rollback if the health check triggered it).

---

## CHANGELOG.md

Auto-generated on every promotion. Each entry is dated and lists all commits merged since the previous `main` HEAD. Do not edit by hand — the `promote-to-main.yml` workflow owns it.

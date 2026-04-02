# Top 10 Claude Code Researchers & Power Users in the World

*Research compiled: 2026-04-02*

---

## 1. Boris Cherny — Creator of Claude Code
**Handle:** [@bcherny](https://x.com/bcherny) | Head of Claude Code at Anthropic

The man who built it. Started as a side project in September 2024. Shipped 259 PRs in 30 days; ~80% of Claude Code was written by Claude Code itself. Runs 5 local + 5–10 remote parallel sessions via `--teleport`.

**Key techniques:**
- Planning-first discipline: iterates on plan in Plan mode before switching to auto-accept
- Prefers Opus 4.5 with thinking enabled for all coding work
- `@.claude` PR tags to keep CLAUDE.md as a living team memory
- PostToolUse hooks for auto-formatting and CI failure prevention
- `/permissions` to pre-allow safe commands rather than `--dangerously-skip-permissions`

**Coverage:** [howborisusesclaudecode.com](https://howborisusesclaudecode.com) | [Pragmatic Engineer interview](https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny) | [Latent Space podcast](https://www.latent.space/p/claude-code)

---

## 2. Affaan Mustafa — Creator of everything-claude-code
**Handle:** [@affaan-m](https://github.com/affaan-m) | Co-founder, Itô | SF

Built [everything-claude-code](https://github.com/affaan-m/everything-claude-code) — **120K+ GitHub stars**. Won the Anthropic x Forum Ventures hackathon at Cerebral Valley.

**Key contributions:**
- 28 specialized subagents, 119 reusable skills, 60 slash commands, 34 rules, 20+ hooks, 14 MCP configs
- Pioneered the **instincts** concept: persistent behavioral patterns burned into agent memory, distinct from task-specific skills
- Built **AgentShield**: AI agent config security scanner with 1,609 tests and 98% coverage
- Content reached 10M+ estimated cross-platform views; translated to Japanese, Chinese, Korean
- 113+ contributors; spawned specialized forks (C++20 HPC, scientific research, enterprise ops)

---

## 3. Simon Willison — Agentic Engineering Patterns Author
**Handle:** [@simonw](https://x.com/simonw) | Creator of Datasette, Django co-creator

Coined "prompt injection" in 2022. Most consistent public record of LLM tooling evolution (daily blog since 2002).

**Key contributions:**
- Author of *[Agentic Engineering Patterns](https://simonwillison.net/guides/agentic-engineering-patterns/)* — living 6-section guide covering Principles, Working with Coding Agents, Testing & QA, Understanding Code, Annotated Prompts, Appendix
- Wrote the [most-read synthesis of Anthropic's Claude Code best practices](https://simonwillison.net/2025/Apr/19/claude-code-best-practices/)
- Core philosophy: "Writing code is cheap now — hoard the things you know how to do"
- Documents subagent patterns extensively: parallel Haiku sub-agents, context window budgeting

---

## 4. Peter Steinberger — MCP Architect & Community Builder
**Handle:** [@steipete](https://steipete.me) | PSPDFKit founder ($100M+ exit)

After a multi-year burnout sabbatical, re-emerged in 2024 and landed directly on Claude Code. 6,600+ commits in January 2026 alone.

**Key contributions:**
- Built 5 original MCP servers: **Peekaboo** (macOS screenshot capture), **Terminator** (terminal management), **Claude Code MCP** (Claude-as-MCP-server for other agents), **Conduit** (file manipulation), **Automator** (AppleScript bridge)
- Founded **Claude Code Anonymous** meetup format — chapters in London, Vienna, Berlin, Cologne, SF, Delft, and more
- Pioneer of the "agent-in-your-agent" pattern via `claude-code-mcp`
- Posts: ["Claude Code is My Computer"](https://steipete.me/posts/2025/claude-code-is-my-computer), ["Just Talk To It"](https://steipete.me/posts/just-talk-to-it), ["MCP Best Practices"](https://steipete.me/posts/2025/mcp-best-practices)

---

## 5. Shrivu Shankar — Deep Technical Practitioner
**Handle:** [@sshh12](https://github.com/sshh12) | [blog.sshh.io](https://blog.sshh.io)

**Key contributions:**
- Wrote ["How I Use Every Claude Code Feature"](https://blog.sshh.io/p/how-i-use-every-claude-code-feature) — one of the most cited practitioner guides (Nov 2025)
- **Master-Clone Architecture**: main agent autonomously decides when to spawn Task clones vs. predetermined hierarchies
- Three-tier context management: avoid `/compact`, use `/clear` + custom `/catchup`, or "Document & Clear" for complex tasks
- CLAUDE.md philosophy: keep at ~13KB, allocate "token budget" per tool, only document things used by 30%+ of engineers
- **Block-at-submit hooks** (not block-at-write): quality gates before commits, not mid-edit
- **Skills over MCP** principle: Skills for formalized scripting; MCP only for secure data gateways

---

## 6. Dan Disler — The Hooks Master
**Handle:** [@IndyDevDan](https://indydevdan.com) | [agenticengineer.com](https://agenticengineer.com)

"Betting the next 10 years of my career on AGENTIC software."

**Key contributions:**
- `claude-code-hooks-mastery` — reference repo for PreToolUse/PostToolUse patterns with UV single-file Python hook scripts
- `claude-code-damage-control` — defense-in-depth safety layer blocking dangerous shell commands via PreToolUse hooks
- `claude-code-hooks-multi-agent-observability` — real-time multi-agent session monitoring via hook event tracking
- `infinite-agentic-loop` — experimental self-referential two-prompt agentic systems
- Pioneer of the **Meta-Agent** pattern: an agent that autonomously generates and improves other agent definitions
- Flagship course: "Tactical Agentic Coding" (TAC) at agenticengineer.com

---

## 7. hesreallyhim — The Awesome List Curator
**Handle:** [GitHub: hesreallyhim](https://github.com/hesreallyhim/awesome-claude-code) | (pseudonymous)

**Key contributions:**
- Maintains `awesome-claude-code` — **35,700+ stars**, 2,700+ forks, the de facto community entry point
- Maintains `a-list-of-claude-code-agents` and `awesome-claude-code-output-styles-that-i-really-like`
- Established the community taxonomy — skills, hooks, slash commands, agents, orchestrators, plugins — now standard vocabulary across the ecosystem including Anthropic's own documentation
- 1,271+ community-submitted issues managed

---

## 8. Yeachan Heo ("Bellman") — Team Orchestration Architect
**Handle:** [@Yeachan-Heo](https://github.com/Yeachan-Heo) | [ohmyclaudecode.com](https://ohmyclaudecode.com) | Seoul

Quantitative trader; leader of Quant.start(), Korea's largest quant community. **$38,330 personal API spend, 32.3 billion tokens consumed** — among the highest documented individual usage globally (per Tokscale).

**Key contributions:**
- Built `oh-my-claudecode`: 19 specialized agents, cross-model routing (Claude + Gemini + Codex), 28 skills
- **Deep Interview** mode: Socratic questioning to expose hidden assumptions before any code is written
- **Team-based canonical orchestration**: formal "Team" construct with defined agent roles, communication channels, and verification loops; deprecated ad-hoc swarm keywords in v4.1.7
- GitHub Trending; multilingual docs (English + Japanese); published as `oh-my-claude-sisyphus` npm package (latest v4.7.10)

---

## 9. Seth Hobson — Production Plugin Architect
**Handle:** [@wshobson](https://github.com/wshobson/agents)

**Key contributions:**
- Built the most comprehensively architected production multi-agent system: **112 specialized agents, 72 single-purpose plugins, 146 skills, 52 slash commands, 16 multi-agent orchestrators**
- Domains covered: architecture, languages, infrastructure, quality, data/AI, docs, business ops, SEO
- Pre-configured end-to-end chains: `backend-architect → database-architect → frontend-developer → test-automator → security-auditor → deployment-engineer → observability-engineer`
- Pioneer of **granular single-purpose plugin architecture**: each plugin optimized for minimal token usage and maximal composability

---

## 10. Florian Bruniaux — The Ultimate Guide Author
**Handle:** [@FlorianBruniaux](https://github.com/FlorianBruniaux/claude-code-ultimate-guide) | Founding Engineer, Méthode Aristote

**Key contributions:**
- Built `claude-code-ultimate-guide`: 23K+ lines across 16 specialized guides, 271-question quiz, 41 Mermaid architecture diagrams
- First public **Claude Code vulnerability database** — 15 vulnerabilities catalogued, 655 malicious skills documented
- Most thorough single reference document in the Claude Code ecosystem

---

## Honorable Mentions

| Name | Handle | Known For |
|------|--------|-----------|
| Cat Wu | [@_catwu](https://x.com/_catwu) | Head of Product, Claude Code at Anthropic |
| swyx | [@swyx](https://x.com/swyx) | Latent Space; first deep-dive podcast with Boris Cherny |
| Gergely Orosz | [@GergelyOrosz](https://x.com/GergelyOrosz) | Most thorough journalist coverage of Claude Code |
| rUv (Reuven Cohen) | [@ruvnet](https://github.com/ruvnet) | Ruflo/Claude Flow; 100K MAU across 80 countries |
| Alexander Opalic | [@alexanderop](https://alexop.dev) | Best systematic pedagogical breakdowns of Claude Code full stack |

---

*Sources: X/Twitter, GitHub, personal blogs, Pragmatic Engineer, Latent Space, InfoQ, VentureBeat, Tokscale, daily.dev*

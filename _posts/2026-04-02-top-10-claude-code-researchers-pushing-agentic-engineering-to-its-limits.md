---
layout: post
title: "The 10 People Pushing Claude Code to Its Limits — and What They're Building"
date: 2026-04-02 10:00:00 +0530
author: "Manish Sharma"
description: "From the man who built it to the anonymous curator who defined its vocabulary, meet the researchers, builders, and obsessives who are writing the playbook for agentic engineering — one CLAUDE.md at a time."
keywords: "Claude Code researchers, agentic engineering 2026, Claude Code power users, Boris Cherny Claude Code, everything-claude-code, multi-agent orchestration, CLAUDE.md best practices, Claude Code hooks, agentic AI development, AI coding tools 2026, Anthropic Claude Code ecosystem, prompt injection, MCP servers Claude Code, AI software development, autonomous coding agents"
tags:
  - AI
  - agentic-engineering
  - Claude-Code
  - software-development
  - developer-tools
categories:
  - Technology
  - Agentic Engineering
reading_time: "18 min read"
og_title: "The 10 People Pushing Claude Code to Its Limits"
og_description: "From the man who built it to the anonymous curator who defined its vocabulary, meet the researchers and builders writing the playbook for agentic engineering."
og_type: article
twitter_card: summary_large_image
canonical_url: "https://yajur.ai/2026/04/02/top-10-claude-code-researchers-pushing-agentic-engineering-to-its-limits"
mentions:
  - type: "Person"
    name: "Boris Cherny"
  - type: "Person"
    name: "Affaan Mustafa"
  - type: "Person"
    name: "Simon Willison"
  - type: "Person"
    name: "Shrivu Shankar"
  - type: "Person"
    name: "Peter Steinberger"
  - type: "Person"
    name: "Dan Disler"
  - type: "Person"
    name: "Yeachan Heo"
  - type: "Person"
    name: "Seth Hobson"
  - type: "Person"
    name: "Florian Bruniaux"
  - type: "Person"
    name: "hesreallyhim"
  - type: "Organization"
    name: "Anthropic"
---

There's a moment in any technology's life when the tool stops being the story and the people using it become the story.

Claude Code hit that moment sometime around January 2026 — when Boris Cherny, the engineer who literally built it, published a thread on X describing how he personally uses his own creation. Developers who had been quietly experimenting for months read that thread and collectively thought: *we've been thinking about this all wrong.*

He runs ten or more parallel sessions. He reaches for Opus 4.5 with thinking enabled, every time, because quality matters more to him than speed. He treats the CLAUDE.md file not as documentation but as institutional memory, tagging Anthropic colleagues' pull requests with `@.claude` so the AI continuously learns from code review feedback. He shipped 259 pull requests in 30 days, and approximately 80% of Claude Code itself was written by Claude Code.

That thread did something important. It moved the conversation from "can an AI write good code?" to "how do you actually run this thing as a serious engineering operation?" The difference between those two questions is where agentic engineering lives.

Over the months that followed, a loose global community of researchers, builders, educators, and obsessives has been quietly answering the second question. Some of them have millions of followers. Some are anonymous. A few have spent tens of thousands of dollars of their own money just to see what happens when you push the system to its edge.

This is their story.

---

## Section 1: The Builders — The People Who Made the Thing

### [Boris Cherny](https://github.com/bcherny) — Head of Claude Code, Anthropic

The first thing worth understanding about Boris Cherny is that he didn't set out to build a product. He set out to solve his own problem.

In September 2024, he was a Principal Engineer at Anthropic with a background at Meta and a book on TypeScript to his name. He started building what would become Claude Code as a side project — a way to interact with Claude that actually matched how real developers think and work. Not a chat window. Not a plugin. Something that lived in the terminal, read the whole codebase, and could be trusted to take actions.

What happened next is the kind of origin story that gets told in retrospectives. The tool worked better than expected. The team grew around it. By January 2026, Cherny was Head of Claude Code, his creation had become one of Anthropic's flagship products, and he was publishing a workflow breakdown that rewired how the entire developer community thought about AI-assisted coding.

The details of his personal setup matter less than the philosophy behind them. Cherny runs multiple sessions in parallel — not because the tool requires it, but because good engineering requires thinking about multiple problems at once, and agentic tools should match that. He plans obsessively before writing a line of code, using Claude Code's Plan mode to iterate on the approach until it feels right. He believes the quality of the plan is the single biggest lever on the quality of the output.

And he treats CLAUDE.md as a team asset. Not a setup file. Not a README. A living document that accumulates the lessons a team learns the hard way — which commands to trust, which patterns to avoid, what the codebase actually cares about. The team at Anthropic tags PRs with `@.claude` specifically so that review feedback gets folded back into that document. The AI learns from the humans; the humans learn from the AI; the cycle continues.

259 pull requests in 30 days. By any measure, that is a different category of output.

→ *[How Boris uses Claude Code](https://howborisusesclaudecode.com) · [Building Claude Code — Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny) · [Latent Space podcast](https://www.latent.space/p/claude-code)*

---

### [Affaan Mustafa](https://affaanmustafa.com) — Creator of everything-claude-code

If Boris Cherny wrote the tool, Affaan Mustafa wrote the operating system around it.

[everything-claude-code](https://github.com/affaan-m/everything-claude-code) is a GitHub repository that, at the time of writing, sits at 120,000 stars. That number is striking enough. What's more striking is what's inside: 28 specialized subagents, 119 reusable skills, 60 slash commands, 34 rulesets, more than 20 automated hooks, and 14 MCP server configurations — all designed to work not just with Claude Code but across the emerging ecosystem of agentic coding tools.

Mustafa is a San Francisco-based builder and co-founder of Itô. He won the Anthropic x Forum Ventures hackathon at Cerebral Valley in early 2026 and published his entire system as MIT-licensed open source the same week. His stated goal was to compress the learning curve for every developer who picked up Claude Code after him.

The contribution that matters most is conceptual rather than technical. Mustafa made the distinction between *skills* and *instincts* that has since spread across the community. Skills are task-specific: instructions that tell an agent how to perform a particular type of work. Instincts are behavioral: persistent patterns burned into agent memory that shape how the agent reasons across all tasks. The difference sounds subtle. In practice it changes everything about how you structure a long-running agentic system.

He also built AgentShield — a security scanner for AI agent configurations with 1,609 tests and 98% test coverage — addressing a vulnerability surface that almost nobody else had thought to look at. We will come back to that.

His content reached an estimated ten million people across platforms, with translations into Japanese, Chinese, and Korean appearing within weeks of publication. The project now has over 113 contributors and has spawned specialized forks for C++ high-performance computing, scientific research, and enterprise operations.

→ *[everything-claude-code on GitHub](https://github.com/affaan-m/everything-claude-code) · [affaanmustafa.com](https://affaanmustafa.com)*

---

## Section 2: The Philosophers — Frameworks That Changed How We Think

### [Simon Willison](https://github.com/simonw) — Creator of Datasette, co-creator of Django

Simon Willison has been writing a public blog about technology every single day since 2002. That discipline, more than any single post, is what makes him one of the most valuable voices in the Claude Code world.

He has also coined some of the most durable vocabulary in AI security — "prompt injection" is his term, introduced in 2022, now used by everyone from academic researchers to journalists writing for general audiences. He built Datasette, the widely-used open-source tool for exploring and publishing data. He co-created Django. He has, in other words, a track record of identifying important things before they become important.

His contribution to the Claude Code conversation is less about a specific tool and more about a way of thinking. His *[Agentic Engineering Patterns](https://simonwillison.net/guides/agentic-engineering-patterns/)* guide, published in early 2026 and updated continuously since, organizes the practice of working with agentic coding tools into a structure that feels almost academic in its rigor: principles, working methods, testing approaches, code understanding techniques, annotated prompts. It reads like the syllabus for a course that doesn't exist yet but should.

The line that has spread furthest: *"Writing code is cheap now — hoard the things you know how to do."*

It sounds like a productivity tip. It's actually a philosophical claim about what developer expertise is for in an era when the mechanical act of translating a thought into working code has become largely automated. The answer Willison is pointing toward is *judgment*: knowing what to build, why to build it, and when the AI is going in the wrong direction. That is harder to automate. That is what becomes precious.

→ *[Agentic Engineering Patterns](https://simonwillison.net/guides/agentic-engineering-patterns/) · [Claude Code Best Practices](https://simonwillison.net/2025/Apr/19/claude-code-best-practices/) · [GitHub](https://github.com/simonw)*

---

### [Shrivu Shankar](https://github.com/sshh12) — Researcher, blog.sshh.io

Shrivu Shankar's contribution is different in character from Willison's. Where Willison writes about principles, Shankar writes about mechanics — and he does so with a level of precision that practicing engineers find immediately useful.

His November 2025 post ["How I Use Every Claude Code Feature"](https://blog.sshh.io/p/how-i-use-every-claude-code-feature) became one of the most cited practitioner guides in the ecosystem. Not because it covers more features than other guides, but because it explains the *reasoning* behind every choice. Why use this hook here and not there. Why this CLAUDE.md structure and not another. Why the decision about when to compact context actually matters.

Two of his ideas have spread particularly far.

The first is what he calls the Master-Clone Architecture. Rather than designing a multi-agent system with predetermined roles — one architect agent, several specialist agents, one reviewer — he lets the primary agent decide autonomously when to spawn copies of itself to work on subproblems. The clones share the original's full context. They return their results. The master synthesizes them. It preserves holistic reasoning while achieving the context savings that parallelization is supposed to provide.

The second is his token budget philosophy for CLAUDE.md. He keeps his own file at around 13 kilobytes — not because of a hard limit, but because he treats every section as a deliberate allocation. If a guideline doesn't earn its space by being relevant to at least 30% of engineering interactions, it doesn't belong in the file. It's a way of thinking about configuration that borrows discipline from system design.

→ *["How I Use Every Claude Code Feature"](https://blog.sshh.io/p/how-i-use-every-claude-code-feature) · [GitHub](https://github.com/sshh12)*

---

## Section 3: The Community Architects — Building the Infrastructure Around the Infrastructure

### [Peter Steinberger](https://steipete.me) — PSPDFKit founder, steipete.me

Peter Steinberger sold his shares in PSPDFKit after building it into a PDF framework used on over a billion devices and generating over $100 million in revenue. He then, by his own account, burned out completely, took a multi-year sabbatical, and came back to software development at exactly the moment Claude Code appeared.

The timing was not accidental. Steinberger had been watching the AI tooling space and waiting for something that matched how he wanted to work. When Claude Code arrived, he went all in. He reportedly made over 6,600 commits in January 2026 alone. He now says agentic engineering produces "pretty much 100% of his code."

His practical contributions to the ecosystem are substantial. He built five original MCP servers — including [Peekaboo](https://github.com/steipete/Peekaboo), which gives Claude Code the ability to see what is on your screen by capturing macOS screenshots, and Terminator, which manages terminal sessions outside the agent loop. His most technically interesting creation is [Claude Code MCP](https://github.com/steipete/claude-code-mcp), which exposes Claude Code itself as an MCP server that other agents can call as a sub-tool. The "agent-in-your-agent" pattern — delegating a stuck or specialized task from one agent session to a full Claude Code instance — is something he developed and documented before anyone else had formalized it.

But his equally important contribution is organizational. He founded the [Claude Code Anonymous](https://steipete.me/posts/2025/claude-code-anonymous) meetup format — named with deliberate irony — which has spawned chapters in London, Vienna, Berlin, Cologne, San Francisco, Delft, and other cities. The format is tight: lightning talks of around five minutes, where speakers open with "I was [emotion] when Claude Code [action]" and then tell an honest story. The point is practitioner reflection, not marketing. The result is a distributed community of people sharing what actually works rather than what sounds impressive.

His blog at steipete.me has become required reading for serious agentic engineers. Posts like ["Claude Code is My Computer"](https://steipete.me/posts/2025/claude-code-is-my-computer) and ["Just Talk To It"](https://steipete.me/posts/just-talk-to-it) have influenced how thousands of developers think about the relationship between human intent and agentic execution.

→ *[steipete.me](https://steipete.me) · [Peekaboo](https://github.com/steipete/Peekaboo) · [Claude Code MCP](https://github.com/steipete/claude-code-mcp) · [GitHub](https://github.com/steipete)*

---

### [hesreallyhim](https://github.com/hesreallyhim/awesome-claude-code) — Creator of awesome-claude-code

Nobody knows who hesreallyhim is. That anonymity is unusual for someone who has had more influence on the Claude Code ecosystem than almost any named individual outside Anthropic.

Their repository, [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code), currently sits at over 35,700 GitHub stars with more than 2,700 forks. It started as a personal bookmark collection. It grew into the community's central directory: skills, hooks, slash commands, agent definitions, orchestration frameworks, MCP servers, applications, plugins — every meaningful contribution to the Claude Code ecosystem catalogued, organized, and kept current.

The contribution that outlasts any star count is taxonomic. Before awesome-claude-code established a shared vocabulary, people described Claude Code extensions in inconsistent ways. Some called everything a "plugin." Others used "agent" for things that were really just prompts. hesreallyhim built a categorization — skills, hooks, slash commands, agents, orchestrators, plugins — that gave practitioners a shared language. The vocabulary spread organically. It is now used by Anthropic's own documentation.

This matters more than it might seem. A community without shared vocabulary is a community that keeps reinventing the same things under different names. The taxonomy hesreallyhim provided made collective learning possible in a way it wasn't before.

→ *[awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)*

---

## Section 4: The Maximalists — What Happens When You Go All the Way

### [Yeachan Heo](https://github.com/Yeachan-Heo) ("Bellman") — Quantitative Trader, Seoul

Yeachan Heo is a quantitative trader who leads Quant.start(), Korea's largest quantitative trading community. He approaches Claude Code the way a quant approaches a trading strategy: systematically, empirically, and with a willingness to spend money to find out what works.

He has spent $38,330 of his own money running 32.3 billion tokens through AI coding assistants. That number, documented by Tokscale, is among the highest individual usage figures recorded anywhere. He is, in the most literal sense, a maximalist.

His framework, [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode), reflects what you learn when you run that many tokens. It coordinates Claude, Gemini, and Codex across 19 specialized agents with 28 skills. But the feature that distinguishes it from simpler orchestration systems is what he calls Deep Interview mode: before any code is written, the system conducts a Socratic dialogue designed to surface hidden assumptions, unstated constraints, and questions the user didn't know they needed to answer. The insight behind this is that most bad software outcomes start not from bad code but from a misunderstood problem.

His framework reached GitHub Trending and has active users across Japan and English-speaking markets. Version 4.1.7 introduced "Team" as the canonical orchestration surface — a formal structure defining agent roles, communication protocols, and verification requirements — and deprecated the ad-hoc swarm invocations that had characterized earlier versions. The move from swarms to teams is not just a naming change; it is an architectural maturation that reflects what you discover after 32 billion tokens of experience.

→ *[oh-my-claudecode on GitHub](https://github.com/Yeachan-Heo/oh-my-claudecode) · [ohmyclaudecode.com](https://ohmyclaudecode.com)*

---

### [Dan Disler](https://indydevdan.com) — "The Hooks Master," agenticengineer.com

Dan Disler made a bet. He decided that agentic software was going to define the next decade of his career and organized everything around proving that bet correct. He runs [IndyDevDan.com](https://indydevdan.com) and [agenticengineer.com](https://agenticengineer.com), where he teaches a course called Tactical Agentic Coding and publishes research that consistently arrives ahead of the wider conversation.

His area of deepest expertise is hooks — the pre- and post-tool callbacks that Claude Code exposes for intercepting agent actions. Most practitioners use hooks for relatively simple things: logging what the agent does, applying formatters after file edits. Disler treats hooks as a primary engineering surface.

His [`claude-code-hooks-mastery`](https://github.com/disler/claude-code-hooks-mastery) repository is the reference implementation for everything hooks can do. His [`claude-code-damage-control`](https://github.com/disler/claude-code-damage-control) system uses PreToolUse hooks to build a defense-in-depth safety layer — blocking dangerous shell commands, protecting sensitive file paths, requiring confirmation for destructive operations. It effectively wraps Claude Code's full autonomy with a configurable set of guardrails that the developer controls.

His most conceptually ambitious work is the Meta-Agent pattern: an agent configuration that generates and improves other agent definitions. Instead of writing agent specs by hand, the Meta-Agent interviews you about what you're trying to accomplish and outputs a purpose-built agent designed for that task. The practical acceleration is significant. The philosophical implication — agents recursively improving the agents that follow them — is the kind of thing that sounds like science fiction until you run it yourself.

→ *[claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) · [claude-code-damage-control](https://github.com/disler/claude-code-damage-control) · [agenticengineer.com](https://agenticengineer.com) · [GitHub](https://github.com/disler)*

---

### [Seth Hobson](https://github.com/wshobson/agents) — Production Plugin Architect

Seth Hobson built a [system](https://github.com/wshobson/agents) at a scale that is simply hard to describe without the numbers: 112 specialized agents, 72 single-purpose plugins, 146 agent skills, 52 slash commands, 16 multi-agent orchestration workflows.

What makes the numbers meaningful is the philosophy behind them. Each plugin is designed for a single purpose and optimized for minimal token usage. The constraint is deliberate: small, focused plugins can be composed freely without context bloat. Large, general-purpose agents fight each other for attention. Hobson's architecture treats composability as the primary design value, and every plugin is small enough that combining a dozen of them costs less than building one heavyweight generalist.

His pre-configured orchestration chains show how this composes in practice. A full-stack development chain runs: `backend-architect → database-architect → frontend-developer → test-automator → security-auditor → deployment-engineer → observability-engineer`. Each handoff is defined. Each agent knows exactly what it receives and what it is expected to produce. The chain is deterministic enough to be reliable, modular enough to be modified.

→ *[wshobson/agents on GitHub](https://github.com/wshobson/agents)*

---

## Section 5: The Documentarians — Writing the Safety Manual

### [Florian Bruniaux](https://github.com/FlorianBruniaux/claude-code-ultimate-guide) — Founding Engineer, Méthode Aristote

Every powerful tool eventually needs someone to write the vulnerability database. For Claude Code, that person is Florian Bruniaux.

His [`claude-code-ultimate-guide`](https://github.com/FlorianBruniaux/claude-code-ultimate-guide) is the most comprehensive single reference document in the Claude Code ecosystem: 23,000 lines across 16 specialized guides, 271 quiz questions, 41 Mermaid architecture diagrams. It is the kind of document that takes months to build and immediately becomes the thing everyone links to when a newcomer asks where to start.

But the contribution that is most likely to matter in the long run is his security work. Bruniaux published the first public catalogue of Claude Code vulnerabilities — 15 distinct vulnerability classes, 655 documented malicious skill patterns. He enumerated the attack surfaces that most practitioners had not thought about: what happens when a CLAUDE.md file is manipulated by a malicious dependency? What does a prompt injection look like inside a skills file? How do you detect when an agent has been redirected toward an attacker's goal rather than yours?

These are not hypothetical questions. As agentic systems are deployed in more sensitive contexts — healthcare, finance, legal work — the answer to "what can go wrong?" becomes a precondition for responsible deployment.

→ *[claude-code-ultimate-guide on GitHub](https://github.com/FlorianBruniaux/claude-code-ultimate-guide)*

---

## Section 6: The Patterns They Have All Converged On

Ten people. Different backgrounds, different geographies, different levels of public visibility. And yet, when you lay their work side by side, the same three things keep appearing.

**Parallel agents, not serial agents.** Every serious practitioner eventually moves from running one Claude Code session to running many simultaneously. The reasons vary — context window management, task independence, speed — but the direction is consistent. Boris Cherny runs ten or more. Yeachan Heo built an orchestration framework specifically to coordinate them across multiple model providers. The mental model of "one agent, one task, one conversation" turns out to be a beginner's mental model.

**Hooks as the real control surface.** Anthropic gives developers the ability to intercept agent actions before and after they happen. Most tutorials treat this as a minor feature. Practitioners like Dan Disler and Shrivu Shankar treat it as the primary engineering surface for reliability and safety. The difference between an agentic system you can trust in production and one you're nervous about running locally is almost always about hooks.

**CLAUDE.md as institutional memory.** The file that configures Claude Code's behavior in a given repository turns out to be one of the most important artifacts a team can maintain. Not because it controls the AI, but because it forces teams to make explicit the things they normally leave implicit: what commands are safe, what patterns to follow, what mistakes have already been made. Boris Cherny's team at Anthropic keeps it current via PR review. Shrivu Shankar treats it as a token budget. Every serious practitioner has a strong opinion about it.

The tool is barely eighteen months old. The ecosystem it has generated is, by any reasonable measure, unusually mature for its age. That maturity came not from Anthropic's roadmap but from practitioners who found the edges, shared what they learned, and built on each other's work.

---

## Section 7: Implementations That Actually Work in Production

Principles are easy to agree with. What's harder — and more instructive — is looking at what these people have actually built and put into production. Here are implementations from across the community that have moved from interesting experiments to things people rely on.

---

**Boris Cherny's parallel worktree workflow** is the most immediately replicable technique for teams that want to move faster. Rather than switching between tasks in a single session, Cherny maintains separate git checkpoints for each parallel workstream. Each Claude Code session operates on its own complete copy of the codebase. This eliminates the context bleed that happens when you ask an agent to context-switch, and it means each session can run to completion on its own problem without interrupting the others. The overhead of managing multiple checkpoints is real but small. The productivity gain — especially for teams with several independent tasks in flight at once — is substantial.

**Affaan Mustafa's instinct-based agent configuration** has been adopted by hundreds of forks and derivatives. The practical difference between an instinct and a skill shows up in how agents handle ambiguity. A skill tells an agent how to write a database migration. An instinct tells an agent that in this codebase, all migrations are additive, never drop columns, and always include a rollback. The skill is consulted when the task is relevant. The instinct shapes every decision the agent makes, including decisions that don't look like they're about database migrations at all. Teams that have moved their CLAUDE.md from skill-oriented to instinct-oriented report fewer edge-case failures and less need for agent supervision.

**[Peter Steinberger's Peekaboo MCP server](https://github.com/steipete/Peekaboo)** solves a problem that seems small until you hit it: agents that can't see the screen can't verify visual output. Peekaboo lets Claude Code take screenshots of the macOS display and reason about what it sees. In practice this is most useful for frontend development — rather than asking the developer to describe what the UI looks like, the agent can check for itself. The implementation is clean enough that it has been forked and adapted for design review, accessibility checking, and automated visual regression workflows that Playwright can't cover.

**[Dan Disler's damage-control hook system](https://github.com/disler/claude-code-damage-control)** is arguably the most production-ready safety implementation currently available for Claude Code. The core insight is that most dangerous agent actions are predictable: deleting files, running destructive database commands, pushing to protected branches, exposing credentials. The damage-control layer defines a configurable blocklist of command patterns and file paths, implemented as PreToolUse hooks. Any agent action matching the list is intercepted, logged, and either blocked or escalated for human confirmation. It runs in under 5 milliseconds per check and has zero false negatives on the pattern classes it covers. For any team deploying Claude Code in an environment where mistakes are expensive, this is a starting point rather than a ceiling.

**Yeachan Heo's Deep Interview mode** has found an audience well outside its original quantitative trading context. The technique — conducting a structured Socratic dialogue before any code is written — turns out to be valuable in any domain where requirements are underspecified, which is most domains. The interview follows a pattern: surface the explicit requirements, then probe for implicit assumptions, then ask what success looks like and what failure looks like, then ask what constraints exist that haven't been mentioned yet. Teams that have built the Deep Interview into their workflow report a significant reduction in the "built the wrong thing" failure mode — the one that wastes the most time and is hardest to detect until it's too late.

**Shrivu Shankar's "Document and Clear" context management** is the technique most frequently adopted by developers who find that `/compact` leaves them uncertain about what the agent has retained and what it has lost. When a session reaches the point where context management becomes necessary, Shankar's approach is to have the agent write a structured summary of everything relevant to a file — current state of the problem, decisions made, work remaining, open questions — and then clear the session entirely. The next session opens by reading that file. The developer retains full visibility into what the agent knows. The agent starts fresh with accurate context rather than a compressed approximation of it.

**[Florian Bruniaux's vulnerability catalogue](https://github.com/FlorianBruniaux/claude-code-ultimate-guide)** has a more specific audience: security engineers and teams deploying Claude Code in regulated environments. The 15 vulnerability classes he documented range from CLAUDE.md injection (a malicious dependency modifies your agent configuration) to skill poisoning (a shared skills repository contains instructions that redirect agent behavior) to context overflow attacks (a carefully crafted file causes the agent to prioritize attacker instructions over legitimate ones). For teams in healthcare, finance, or any context with compliance requirements, this catalogue is the starting point for a threat model — not because it is exhaustive, but because it is the most systematic published enumeration of what to think about.

**[hesreallyhim's taxonomy](https://github.com/hesreallyhim/awesome-claude-code)**, implemented in practice by thousands of teams, has made collaborative development of Claude Code configurations tractable. Before a shared vocabulary existed, teams building internal agent configurations reinvented categories that others had already named and solved. The canonical set — skills for task-specific instructions, hooks for behavioral guardrails, slash commands for operator-triggered actions, agents for autonomous task execution, orchestrators for multi-agent coordination — is simple enough to learn quickly and precise enough to communicate without ambiguity. Teams that align on this vocabulary before building their Claude Code configuration spend less time arguing about architecture and more time building things.

---

## Section 8: What This Means for Anyone Building in Specialized Domains

Healthcare is a useful test case for everything the Claude Code community has learned.

The stakes are different in healthcare. An error in a general-purpose codebase might cause a bad user experience or a financial loss. An error in a clinical system might delay a diagnosis, surface incorrect drug information, or corrupt a patient record. The margin for "close enough" is different. The requirement for auditability — being able to explain why a system did what it did — is not optional.

What the Claude Code research community has produced over the past eighteen months is, read against that context, a surprisingly complete toolkit.

Parallel agents with isolated contexts address the data separation requirements that clinical systems need: different agents working on different patient records, different workflows, different data classes, without the bleed-through that a single shared context creates.

Hooks as a primary control surface make it possible to implement clinical guardrails at the agent level: intercept any action that touches patient data, require authentication, log the action with sufficient detail for audit, block anything that matches a defined risk pattern.

The instinct-based configuration model allows teams to encode clinical judgment — the rules that a human clinician would consider obvious but that need to be explicit for an automated system — into the behavioral layer of an agent rather than into individual skill prompts. The agent that always checks for drug interactions before generating a prescription recommendation doesn't need to be reminded in every skill that drug interaction checking matters. It knows.

Deep Interview mode, before a clinical AI system produces any output, creates a structured artifact of what the system understood about the clinical context, what assumptions it made, and what it was uncertain about. That artifact is exactly what a clinical governance process needs to evaluate whether the system's reasoning was sound.

The work of these ten researchers was not done with healthcare in mind. Most of them are building general-purpose software. But the problems they have solved — reliability, safety, auditability, context management, collaborative configuration — are the same problems that make deploying AI in high-stakes domains genuinely hard.

The toolkit exists. The question is how it gets used.

---

## Frequently Asked Questions

**Who created Claude Code?**
Claude Code was created by Boris Cherny, then a Principal Engineer at Anthropic, who started it as a side project in September 2024. He is now Head of Claude Code at Anthropic. Approximately 80% of Claude Code was written by Claude Code itself during development.

**What is everything-claude-code?**
everything-claude-code is an open-source GitHub repository built by Affaan Mustafa that extends Claude Code with 28 specialized subagents, 119 reusable skills, 60 slash commands, 34 rulesets, 20+ hooks, and 14 MCP server configurations. It has over 120,000 GitHub stars and is the most widely used community extension of the Claude Code ecosystem.

**What is a CLAUDE.md file and why does it matter?**
CLAUDE.md is a configuration file that Claude Code reads at the start of every session in a given repository. Practitioners treat it as institutional memory — a living document that accumulates the rules, patterns, and hard-won lessons specific to a codebase. Boris Cherny's team at Anthropic keeps it current by tagging pull requests with `@.claude` so code review feedback is folded back in automatically.

**What are Claude Code hooks?**
Hooks are PreToolUse and PostToolUse callbacks that intercept Claude Code's actions before or after they execute. Dan Disler's damage-control system uses PreToolUse hooks to block dangerous shell commands and protect sensitive file paths. Shrivu Shankar's "block-at-submit" approach uses PostToolUse hooks as quality gates before commits. Practitioners who treat hooks as a primary engineering surface — rather than a logging add-on — consistently report more reliable and production-safe agentic systems.

**What is the difference between Claude Code skills and instincts?**
The distinction was made by Affaan Mustafa. A *skill* is task-specific: it tells an agent how to perform a particular type of work when that task is relevant. An *instinct* is behavioral: a persistent pattern burned into agent memory that shapes how the agent reasons across all tasks, including tasks that don't look related. Teams that have shifted their CLAUDE.md from skill-oriented to instinct-oriented configurations report fewer edge-case failures and less need for supervision.

**What is agentic engineering?**
Agentic engineering is the practice of building software systems where AI agents autonomously plan, reason, take actions, and delegate to other agents — rather than responding to individual prompts. The term, popularized by researchers like Simon Willison and Dan Disler, describes the discipline of designing, orchestrating, and governing these multi-step autonomous systems in production environments.

**Is Claude Code suitable for use in healthcare or regulated industries?**
The Claude Code research community has produced tools that address the core requirements of regulated domains: parallel agents with isolated contexts for data separation, hooks for audit-grade interception of agent actions, instinct-based configuration for encoding clinical or compliance judgment, and Florian Bruniaux's vulnerability catalogue as a starting point for threat modelling. These tools were built for general-purpose software but directly address the reliability, auditability, and safety requirements that healthcare and finance deployments require.

---

## Closing

The Claude Code community is eighteen months old and already producing work that is changing how senior engineers think about what software development is.

That is fast. It is fast because the underlying capability improved fast, but it is also fast because a handful of people — some with large followings, some anonymous, some with millions of dollars in infrastructure behind them, some running everything on a laptop — decided to take the tool seriously and share what they learned.

Boris Cherny built something and then told the world exactly how he uses it. Affaan Mustafa built an operating system around it and gave it away. Simon Willison wrote the thinking framework. Peter Steinberger organized the humans. hesreallyhim organized the knowledge. Shrivu Shankar documented the mechanics. Yeachan Heo funded thirty-two billion tokens of empirical research. Dan Disler made hooks into engineering. Seth Hobson made scale into composability. Florian Bruniaux wrote the safety manual.

None of them asked permission. None of them waited for the ecosystem to mature before contributing to it. That is, perhaps, the most important thing they have in common — and the most important lesson for anyone else who wants to build something worth using.

The playbook is being written in public. The only question is whether you are reading it.

---

*A note on how this article was made: the research behind this piece — identifying the researchers, tracing their contributions, and cross-referencing their work across GitHub, X, personal blogs, and community forums — was conducted using Claude Code with parallel subagents running simultaneous web searches. SEO keyword selection, GEO signals (the structured data and language that help AI answer engines like Perplexity and ChatGPT cite this page), and AEO formatting (clear, quotable claims structured for direct answer extraction) were also optimised using Claude Code. It felt appropriate, given the subject matter.*

---

*Yajur builds medical data infrastructure for healthcare AI — the data layer that makes clinical AI systems reliable, auditable, and ready for production deployment. [Learn more about our work.](/)*

---

*Further reading:*
- *[From Vibe Coding to Agentic Engineering: Everyone Can Now Build for Healthcare](/2026/02/21/from-vibe-coding-to-agentic-engineering-everyone-can-now-build-for-healthcare.html)*
- *[The Convergence: Why Every Major AI Leader Has Landed on Healthcare](/2026/02/27/the-convergence-why-every-major-ai-leader-has-landed-on-healthcare.html)*
- *[A Task Framework for Healthcare AI](/2025/03/19/a-task-framework-for-healthcare-for-enabling-ai-agentic-workflows-in-ehr-systems.html)*

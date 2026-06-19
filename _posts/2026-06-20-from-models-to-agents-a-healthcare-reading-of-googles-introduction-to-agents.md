---
layout: post
title: "From Models to Agents: A Healthcare Reading of Google's 'Introduction to Agents'"
date: 2026-06-20 10:00:00 +0530
author: "Manish Sharma"
description: "A healthcare builder's guide to Google's 'Introduction to Agents' — the 5-level taxonomy, agent architecture, AgentOps, and A2A, mapped to ABDM and FHIR."
keywords: "introduction to agents, Google agents whitepaper, AI agents in healthcare, agent taxonomy levels, AgentOps, agent architecture, model tools orchestration, function calling, A2A protocol, AP2 agent payments, agent identity, agent governance, ABDM agents, FHIR AI agents, clinical AI agents, agentic engineering healthcare, multi-agent systems, self-evolving agents, Google Co-Scientist, AlphaEvolve"
tags:
  - AI
  - agentic-engineering
  - AI-agents
  - healthcare-ai
  - medical-data
categories:
  - Technology
  - Agentic Engineering
reading_time: "14 min read"
og_title: "From Models to Agents: A Healthcare Reading of Google's 'Introduction to Agents'"
og_description: "Google's agent framework — the 5-level taxonomy, Model+Tools+Orchestration, AgentOps, and A2A/AP2 — distilled for healthcare builders and mapped to ABDM and FHIR."
og_type: article
mentions:
  - type: "Organization"
    name: "Google"
    url: "https://cloud.google.com/products/agent-builder"
  - type: "CreativeWork"
    name: "Introduction to Agents (Google Agents Whitepaper Series, May 2026)"
  - type: "Person"
    name: "Antonio Gulli"
  - type: "Person"
    name: "Shubham Saboo"
  - type: "Person"
    name: "Alan Blount"
  - type: "Person"
    name: "Michael Zimmermann"
  - type: "Person"
    name: "Vladimir Vuskovic"
---

> **About this article — source and attribution.** This is a structured summary of, and healthcare commentary on, Google's whitepaper **_Introduction to Agents_** (Updated May 2026), authored by **Alan Blount, Antonio Gulli, Shubham Saboo, Michael Zimmermann, and Vladimir Vuskovic**, part of Google's *Agents Whitepaper Series*. **The definitions, the five-level taxonomy, the Model–Tools–Orchestration architecture, AgentOps, and the interoperability protocols described below are the original authors' work, credited to them throughout.** What Yajur adds is the lens: how each idea lands in Indian healthcare, on ABDM and FHIR, and in clinical workflows. Direct quotes from the paper appear in quotation marks. Full citation in the [References](#references).

For two years the conversation in healthcare AI was about *models* — which one scores highest, which one hallucinates least. Google's *Introduction to Agents* makes the case that the model was never the interesting part. The interesting part is what you wrap around it. As the paper puts it, **"agents are the natural evolution of Language Models, made useful in software."**

That single reframing matters more in healthcare than almost anywhere else. A model that drafts a discharge summary is a demo. An *agent* that retrieves the patient's longitudinal record over [ABDM](/2026/02/15/need-for-a-robust-abdm-healthcare-network-enabling-cancer-care-without-walls.html), checks eligibility on the claims network, drafts the summary, files it as a FHIR document, and stops to ask a clinician when it is unsure — that is infrastructure. This article walks Google's framework end to end and translates each layer into what it means for the people building that infrastructure.

## What Actually Makes Something an "Agent"

The whitepaper draws a hard line between predictive AI and agents. Predictive or generative AI is *passive*: it answers a question, translates text, generates an image, and waits. An agent, in the authors' definition, is **"not simply an AI model in a static workflow; it's a complete application, making plans and taking actions to achieve goals."** It combines a language model's reasoning with the practical ability to *act*.

The mechanism is a loop the paper calls the agentic problem-solving process: **perceive → reason/plan → act (through tools) → observe the result → iterate** until the goal is met or a stopping condition is hit. A chatbot produces one response and stops; an agent runs its own loop and decides what to do next at each step. (Yajur readers have met this idea before, in [our task framework for agentic EHR workflows](/2025/03/19/a-task-framework-for-healthcare-for-enabling-ai-agentic-workflows-in-ehr-systems.html) — healthcare work is non-linear, and the loop is what lets software follow it.)

## The Five Levels of Agentic Systems

The framework's backbone is a taxonomy of five levels of capability. It is the most useful single page in the paper for deciding *what you are actually building*.

| Level | Name | What it is | Healthcare example |
|------|------|-----------|--------------------|
| **0** | Core Reasoning System | The model alone, no tools; reasons only from training data, bounded by its knowledge cutoff | A chatbot that explains a diagnosis from memory — no access to *this* patient |
| **1** | Connected Problem-Solver | Model + tools: retrieval (read the world) and actions (change the world) via function calling | An agent that pulls the live ABDM record and checks NHCX eligibility |
| **2** | Strategic Problem-Solver | Adds planning, context engineering, and persona across multiple steps | A pre-authorisation agent that plans a multi-document claim package |
| **3** | Collaborative Multi-Agent System | Multiple specialist agents coordinating toward one goal | A tumour-board pipeline: intake, coding, eligibility, and review agents |
| **4** | Self-Evolving System | Agents that learn, self-improve, and create their own tools | A coding-quality agent that writes new validation skills as it finds gaps |

The jump from Level 0 to Level 1 is the one that matters clinically: a Level 0 system reasons about medicine *in general*; a Level 1+ system reasons about *your patient*, because it can reach grounded, real-time data. Everything safe and useful in healthcare lives at Level 1 and above — which is exactly why **tools**, not the model, become the design problem.

## The Core Architecture: Model, Tools, Orchestration

Google's anatomy of an agent has three parts, and the paper is blunt that the model is only one of them.

**The Model is the "brain"** — the reasoning engine that decides what happens next. It is necessary but, on its own, just Level 0.

**Tools are the "hands."** They come in two flavours, and the distinction is worth memorising:
- **Retrieving information — grounding in reality:** search, RAG, data APIs. This is how an agent reads the world. In healthcare this is the FHIR server, the ABDM gateway, the lab system.
- **Executing actions — changing the world:** writing a record, filing a claim, booking a slot. **Function calling** is the mechanism that connects the model to these tools — the model emits a structured call, the tool runs, and the result comes back into the loop.

**The Orchestration Layer is the loop** — the code that assembles context for each model call, dispatches tool calls, and decides whether to continue. The paper's design choices here map cleanly onto how serious teams build: *instruct with domain knowledge and persona* (the system prompt, the rule file), *augment with context* (grounding), and compose *multi-agent design patterns* (coordinator, sequential, iterative-refinement, human-in-the-loop). This is the same shift we described in [from vibe coding to agentic engineering](/2026/02/21/from-vibe-coding-to-agentic-engineering-everyone-can-now-build-for-healthcare.html): the craft moves from writing code to engineering the context and constraints around the model.

> The takeaway the authors keep returning to: **an agent is a complete application = Model + Tools + Orchestration (+ Deployment).** Blame the model last.

## AgentOps: The Part Healthcare Cannot Skip

If one section of the paper should be tattooed on every healthcare AI team, it is **AgentOps — "a structured approach to the unpredictable."** Agents are non-deterministic; you cannot unit-test your way to confidence. The authors prescribe five practices:

1. **Measure what matters — instrument success like an A/B experiment.** Define the metric that proxies real clinical/operational success and instrument for it.
2. **Quality instead of pass/fail — use an LM judge.** For non-deterministic output, score quality against a rubric with a model-as-judge rather than a binary pass/fail. (We have argued the same in [re-architecting clinical reasoning pipelines](/2025/07/09/smarter-ai-demands-smarter-context-how-yajur-healthcare-is-re-architecting-clinical-reasoning-pipelines.html).)
3. **Metrics-driven development — a Go/No-Go for deployment.** Quantitative gates decide whether a version ships, the way test coverage gates a service.
4. **Debug with OpenTelemetry traces — answer "why?"** Trace the full trajectory (tool calls, reasoning, latency, cost) so a failure is explainable, not opaque. In a regulated setting, an unexplainable agent decision is a liability, not a feature.
5. **Cherish human feedback.** Clinician feedback is the steering signal that improves the automated scorers over time.

A demo proves an agent can succeed once; an eval proves it succeeds reliably. For anything touching a patient, that distinction is the whole job.

## Interoperability, Identity, and Governance

As agents multiply, the paper turns to the boundaries between them. It frames three:

- **Agents and Humans** — the interface of approvals and handoffs.
- **Agents and Agents** — the **A2A (Agent2Agent) protocol** for cross-agent delegation. The paper is careful about the distinction from MCP: **MCP connects an agent to *tools*; A2A connects an agent to *other agents*.** A multi-specialty clinical pipeline is an A2A problem.
- **Agents and Money** — the **AP2 (Agent Payments Protocol)**, which lets agents transact under explicit, authorised mandates. For settlement and claims payouts, that authorisation model is the interesting part.

Underneath all of this sits a genuinely new idea the authors name directly: **agent identity as "a new class of principal."** An agent is not a human user and not a static service account — it is a third kind of actor that needs its own scoped, attributable identity. In healthcare, where every access to a record must be logged and consented, *who (or what) is acting* is not a footnote. The paper extends this to the enterprise: hardening a single agent, then governing a fleet through **"a control plane instead of sprawl"** — central visibility over many agents rather than ungoverned proliferation. That is the difference between a pilot and a hospital-wide rollout that compliance will actually sign off on.

## Self-Evolving Agents — and Where It's Already Real

Level 4 is the frontier: agents that learn and improve themselves, including through **simulation and an "Agent Gym"** where they practise. The paper grounds this with two concrete examples — **Google Co-Scientist**, a multi-agent research collaborator, and **AlphaEvolve**, an agent that designs and improves algorithms. They are previews of what a self-improving clinical or operational agent eventually looks like: not just running the loop, but rewriting parts of itself between runs.

## The Yajur Healthcare Perspective

Read through a healthcare lens, the paper is less a tutorial and more a maturity model. Most "AI in healthcare" today is stuck at Level 0 — clever models with no grounded access to the patient in front of them. The value is unlocked at Levels 1–3, and it is gated almost entirely by the unglamorous layers: tools that reach FHIR and ABDM safely, orchestration that knows when to stop and ask a clinician, AgentOps that can prove reliability, and an identity-and-governance model a hospital's risk office will accept.

Our own stance lines up with the paper's conclusion: generation is largely solved; **verification, judgment, and direction are the new craft.** In medicine that craft has a name — it is clinical governance, applied to software that now acts. The teams that win will not be the ones with the biggest model. They will be the ones who built the harness, the evals, and the identity model around it — and who kept a clinician firmly in the loop.

## Frequently Asked Questions

### What is Google's "Introduction to Agents" whitepaper?
It is a foundational paper in Google's *Agents Whitepaper Series* (updated May 2026), authored by Alan Blount, Antonio Gulli, Shubham Saboo, Michael Zimmermann, and Vladimir Vuskovic. It defines what an AI agent is, presents a five-level taxonomy of agentic systems, and details the Model–Tools–Orchestration architecture, AgentOps, agent interoperability (A2A, AP2), security and identity, and self-evolving agents.

### What is the difference between an AI model and an AI agent?
A model is passive — it answers a prompt and stops. An agent, per the paper, is "a complete application, making plans and taking actions to achieve goals." It runs a loop — perceive, plan, act through tools, observe, iterate — and combines reasoning with the ability to act in the world.

### What are the five levels of agentic systems?
Level 0 — Core Reasoning System (the model alone); Level 1 — Connected Problem-Solver (model plus tools); Level 2 — Strategic Problem-Solver (planning and context); Level 3 — Collaborative Multi-Agent System (specialist agents cooperating); Level 4 — Self-Evolving System (agents that learn and improve themselves).

### What is AgentOps?
AgentOps is the discipline of operating non-deterministic agents reliably. Google's five practices are: measure success like an A/B experiment, use an LM judge for quality instead of pass/fail, gate deployment on metrics, debug with OpenTelemetry traces, and incorporate human feedback. It is the production-readiness checklist for any agent — and essential for clinical safety.

### What is the difference between MCP and A2A?
MCP (Model Context Protocol) connects an agent to its tools. A2A (Agent2Agent protocol) connects an agent to other agents for delegation and collaboration. AP2 (Agent Payments Protocol) extends this to letting agents transact under authorised mandates.

### Why does "agent identity" matter in healthcare?
The paper describes an agent as "a new class of principal" — neither a human user nor a static service account. In healthcare, every access to a patient record must be attributable and consented, so an agent needs its own scoped, auditable identity before it can safely act on clinical data at scale.

### How does this apply to ABDM and FHIR?
Grounding tools are what move an agent from Level 0 to Level 1. In Indian healthcare, those tools are the FHIR server, the ABDM gateway, and the NHCX claims network — the read-and-write surface a clinical or claims agent needs to act on the real patient rather than reasoning in the abstract.

## References

1. Blount, A., Gulli, A., Saboo, S., Zimmermann, M., & Vuskovic, V. **_Introduction to Agents_** (Updated May 2026). Google — *Agents Whitepaper Series*. Content contributors: Enrique Chan, Mike Clark, Derek Egan, Kanchana Patlolla, Julia Wiesinger. *All concepts, the five-level taxonomy, the Model–Tools–Orchestration architecture, AgentOps, and the A2A/AP2 protocols summarised in this article are the authors' work.*
2. Google — [Vertex AI Agent Builder & Agent Development Kit (ADK)](https://cloud.google.com/products/agent-builder), referenced in the whitepaper for deployment, A2A, and agent hardening.
3. Yajur Pontifex — [From Vibe Coding to Agentic Engineering: Everyone Can Now Build for Healthcare](/2026/02/21/from-vibe-coding-to-agentic-engineering-everyone-can-now-build-for-healthcare.html).
4. Yajur Pontifex — [A Task Framework for Healthcare: Enabling AI Agentic Workflows in EHR Systems](/2025/03/19/a-task-framework-for-healthcare-for-enabling-ai-agentic-workflows-in-ehr-systems.html).
5. Yajur Pontifex — [Smarter AI Demands Smarter Context: Re-architecting Clinical Reasoning Pipelines](/2025/07/09/smarter-ai-demands-smarter-context-how-yajur-healthcare-is-re-architecting-clinical-reasoning-pipelines.html).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Google's \"Introduction to Agents\" whitepaper?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is a foundational paper in Google's Agents Whitepaper Series (updated May 2026), authored by Alan Blount, Antonio Gulli, Shubham Saboo, Michael Zimmermann, and Vladimir Vuskovic. It defines what an AI agent is, presents a five-level taxonomy of agentic systems, and details the Model-Tools-Orchestration architecture, AgentOps, interoperability (A2A, AP2), security and identity, and self-evolving agents."
      }
    },
    {
      "@type": "Question",
      "name": "What is the difference between an AI model and an AI agent?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A model is passive: it answers a prompt and stops. An agent is a complete application that makes plans and takes actions to achieve goals. It runs a loop - perceive, plan, act through tools, observe, iterate - combining reasoning with the ability to act in the world."
      }
    },
    {
      "@type": "Question",
      "name": "What are the five levels of agentic systems?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Level 0 - Core Reasoning System (the model alone); Level 1 - Connected Problem-Solver (model plus tools); Level 2 - Strategic Problem-Solver (planning and context); Level 3 - Collaborative Multi-Agent System (specialist agents cooperating); Level 4 - Self-Evolving System (agents that learn and improve themselves)."
      }
    },
    {
      "@type": "Question",
      "name": "What is AgentOps?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AgentOps is the discipline of operating non-deterministic agents reliably. Google's five practices are: measure success like an A/B experiment, use an LM judge for quality instead of pass/fail, gate deployment on metrics, debug with OpenTelemetry traces, and incorporate human feedback."
      }
    },
    {
      "@type": "Question",
      "name": "What is the difference between MCP and A2A?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MCP (Model Context Protocol) connects an agent to its tools. A2A (Agent2Agent protocol) connects an agent to other agents for delegation and collaboration. AP2 (Agent Payments Protocol) lets agents transact under authorised mandates."
      }
    },
    {
      "@type": "Question",
      "name": "Why does agent identity matter in healthcare?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The paper describes an agent as a new class of principal - neither a human user nor a static service account. In healthcare, every access to a patient record must be attributable and consented, so an agent needs its own scoped, auditable identity before it can safely act on clinical data at scale."
      }
    }
  ]
}
</script>

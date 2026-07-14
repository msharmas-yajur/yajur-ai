---
layout: post
title: "Reading Caladrius Pulse: 10 Essential Explainers on ABDM, NHCX & India's Health Data Stack"
date: 2026-07-14 10:00:00 +0530
author: "Yajur Healthcare"
description: "A curated reading list of the 10 latest Caladrius Pulse articles — in-depth explainers on ABHA, ABDM, NHCX, HFR/HPR registries, and how clinical and claims data actually move across India's digital health network."
keywords: "Caladrius Pulse, Caladrius Health, ABDM, NHCX, ABHA, HFR, HPR, India digital health, health claims exchange, medical data infrastructure, Yajur Healthcare, GPracta Technology, health data interoperability, FHIR India, RCM, HIE-CM"
tags:
  - ABDM
  - NHCX
  - ABHA
  - interoperability
  - medical-data
  - reading-list
categories:
  - Interoperability
  - Curated Reading
reading_time: "12 min read"
og_title: "Reading Caladrius Pulse: 10 Essential Explainers on ABDM, NHCX & India's Health Data Stack"
og_description: "A curated guide to the 10 latest Caladrius Pulse articles on ABHA, ABDM, NHCX and how India's health data actually flows — with an in-depth summary and direct link for each."
og_type: article
mentions:
  - type: "Organization"
    name: "Caladrius Health AI Studio"
    url: "https://caladriushealth.ai/blog/"
  - type: "Organization"
    name: "GPracta Technology Services Pvt Ltd"
---

> **Why we're sharing this.** India's digital health rails — ABHA, ABDM, NHCX, and the registries beneath them — are moving from policy documents to production systems. The team at **[Caladrius Health](https://caladriushealth.ai/blog/)** has been publishing some of the clearest plain-language explainers on exactly how these pieces fit together. Below we've summarised their **10 most recent articles** so you can pick what's relevant and read the original in full. Each summary links straight to the source on Caladrius Pulse.

India's health-data conversation has finally shifted from *"what will ABDM do?"* to *"how does a record actually move from a hospital to a patient's phone — and who gets paid along the way?"* That is the exact ground the **Caladrius Pulse** blog covers: identity (ABHA), the network (ABDM), the claims layer (NHCX), and the quiet registries (HFR, HPR) that make every transaction possible.

## Where to start

If you're **new to India's digital health stack**, read the list roughly in reverse — start with **#7** (the fragmentation problem), then **#5** and **#4** (what ABDM and NHCX actually are), then **#6** and **#1** (how ABHA works for a real patient). That path takes you from the "why" to the "what" to the "so what."

If you're a **builder or health-IT lead**, jump straight to **#2**, **#3**, and **#9** for the architecture, encryption, and registry-sequencing detail, then **#8** and **#10** for how the claims side reshapes revenue-cycle and TPA operations.

Here are the ten latest reads, newest first.

### 1. What Happens to Your Health Records When You Leave a Hospital?

Written for citizens rather than engineers, this piece answers a question most patients never think to ask until they need an old report: where do my records actually go after discharge? It explains that under ABDM, hospitals still hold your records — legally for a minimum of three years, and often five or more at accredited facilities — but **ABHA**, the free 14-digit health ID, is what lets those records travel with you. With over 90 crore ABHA accounts created and more than 100 crore records now linked, the infrastructure exists; what's missing is patient awareness of how to use it. The article stresses that nothing moves automatically: every share requires your explicit consent, granted afresh each time a provider requests access, and you retain the right to view, correct, export, or revoke that access. It closes with practical steps any reader can take today — create or locate your ABHA ID at abha.abdm.gov.in, always request written copies of records, keep a personal health folder, and understand that you, not the hospital, are the one who authorises data sharing. A genuinely useful primer to send to non-technical family members.

🔗 **Read it:** [caladriushealth.ai/blog/2026/07/06/Your-Health-Your-Data](https://caladriushealth.ai/blog/2026/07/06/Your-Health-Your-Data/)

### 2. How Clinical Data Actually Flows Under ABDM: A Guide for Health IT Teams

The headline number — 100 crore linked records — hides the real engineering story, and this guide tells it for implementation teams. Its central point: *linking* a record and *moving* it are entirely different problems. ABDM uses a federated architecture where clinical data stays in the source system and travels only after explicit consent, orchestrated (not stored) by the ABDM gateway. The article walks the three-stage flow in detail: the patient grants consent through a PHR app; the Consent Manager issues one artefact per data source; then the Health Information User requests encrypted **FHIR bundles**, which the Health Information Provider validates, encrypts, and transmits. It goes deep on **Fidelius** encryption — ECDH key exchange on Curve25519, nonce-based derivation, and AES-256-GCM giving perfect forward secrecy — with a hard-won warning to use the official reference implementation rather than generic crypto libraries to avoid handshake failures. It also covers the six NRCeS FHIR document profiles (each demanding SNOMED CT, LOINC, and ICD-10 compliance) and the M1–M4 milestone path from identity to per-facility deployment. Key takeaway for teams: treat terminology mapping as your longest lead-time activity, and staff clinical (HIE-CM) and financial (NHCX) integrations as parallel workstreams.

🔗 **Read it:** [caladriushealth.ai/blog/2026/06/19/How-Records-Move](https://caladriushealth.ai/blog/2026/06/19/How-Records-Move/)

### 3. HFR and HPR: The Unsung Registries That Make Every ABDM Transaction Possible

Everyone talks about ABHA; almost no one talks about the two registries that quietly authorise every transaction on the network. This article makes the case that the **Health Facility Registry (HFR)** and **Healthcare Professional Registry (HPR)** are structurally essential precisely because they're small: as of August 2025, HFR held about 4,18,964 facilities and HPR about 6,79,692 professionals — a rounding error next to 79.91 crore ABHA accounts, yet nothing moves without them. The piece shows how these registries gate real money and access: the Digital Health Incentive Scheme (DHIS) restricts its incentives to HFR-registered facilities, PM-JAY empanelment now mandates HFR registration through the Hospital Engagement Module, and the National Medical Commission requires medical colleges to submit verified HFR IDs by deadline. It's also refreshingly practical on sequencing — you must obtain your 14-digit HP ID first (at hpr.abdm.gov.in) before a facility manager can create the HFR record (at facility.abdm.gov.in), both gated by Aadhaar authentication and government verification. Finally, it catalogues the most common failure modes: stale service classifications, incomplete council details, and the classic mistake of attempting HFR registration without valid HP credentials. Essential reading before any registry-integration project.

🔗 **Read it:** [caladriushealth.ai/blog/2026/06/18/HFR-and-HPR](https://caladriushealth.ai/blog/2026/06/18/HFR-and-HPR/)

### 4. What Is NHCX? The National Health Claims Exchange Explained

If you keep hearing "NHCX" and want the definitive one-read explanation before the deep dives, this is it. The framing that sticks: NHCX is **"a router, not a repository."** Built by the National Health Authority within ABDM and launched in June 2024, it's a standardised digital gateway that securely transmits insurance claims between providers and payers using encrypted, end-to-end HL7 FHIR messaging. The article is strongest on the problem it dissolves: before NHCX, every hospital maintained a separate, proprietary integration with every insurer, producing long accounts-receivable cycles, high denial rates from formatting mismatches, and mountains of manual overhead — faxes, phone calls, and re-keying. NHCX replaces that many-to-many tangle with a single hub: a hospital submits a standardised claim once, and NHCX validates and routes it to the right payer, with eligibility checks, pre-authorisations, and adjudication decisions all travelling back through identical channels. It lays out the payoff per stakeholder — hospitals get fewer integrations and faster settlement, insurers receive structured machine-readable claims, and patients experience quicker cashless approvals — while being candid that adoption is still in an uneven onboarding phase. The clearest short definition of NHCX you'll find.

🔗 **Read it:** [caladriushealth.ai/what-is-nhcx](https://caladriushealth.ai/what-is-nhcx/)

### 5. What Is ABDM? The Ayushman Bharat Digital Mission Explained

The companion explainer to the NHCX piece, this article maps the whole mission cleanly. ABDM rests on four building blocks: **ABHA** (the 14-digit health identifier), the **Health Facility Registry (HFR)**, the **Health Professional Registry (HPR)**, and the **Health Information Exchange & Consent Manager (HIE-CM)**. Its most clarifying line — worth memorising — is the division of labour between the gateways: **"NHCX moves claims; HIE-CM moves clinical records,"** with UHI handling service discovery. Records stay at the originating facility and move only with explicit patient consent, using standardised formats (HL7 FHIR R4, ICD-10, SNOMED CT, LOINC). The article is honest about the gap between registration and reality: as of March 2026 there were over 866 million ABHA accounts and roughly 907 million linked records, yet only about 256,542 facilities actually run ABDM-enabled software — a reminder that sign-ups are not the same as functional integration. It also grounds the abstraction in a concrete win: the Scan-and-Share feature cut OPD wait times from 30–40 minutes to 5–10 minutes at integrated facilities by November 2024. Read this to get the mental model that every other article on the list builds on.

🔗 **Read it:** [caladriushealth.ai/what-is-abdm](https://caladriushealth.ai/what-is-abdm/)

### 6. ABHA Unpacked: What It Is, What It Isn't, and Why It Matters

This is a myth-busting read built around one distinction most people get wrong: **ABHA is a health *identity* number, not a health *record*.** The article explains that ABHA is a permanent, unique identifier that enables secure, consented discovery and sharing — while your actual clinical data stays distributed across the providers who created it. Even an "Electronic Health Record," it notes, is really *a collection of links to primary data* held at source, not a central vault. The most striking material is the awareness gap: despite 86.64 crore ABHA registrations as of March 2026, a survey at AIIMS Guwahati found only 35% of patients had even heard of ABHA, and just 8–12% of registered users understood what it does. The practical consequences are concrete — patients with an active, linked ABHA get faster registration, give physicians instant access to prior context, and control who sees their records; those without one effectively "start from scratch" at every non-integrated facility. The takeaway is a healthy corrective to hype: registration scale has run far ahead of understanding and real utilisation, and closing that gap — not adding more sign-ups — is where the value now lies.

🔗 **Read it:** [caladriushealth.ai/blog/2026/06/12/ABHA-Unpacked](https://caladriushealth.ai/blog/2026/06/12/ABHA-Unpacked/)

### 7. India's Health Data Problem: The Fragmentation That ABDM Was Built to Solve

This is the "why" behind everything else on the list. India's healthcare data sits siloed across thousands of independent facilities running incompatible systems, so when a patient relocates or switches providers, their history simply doesn't follow — forcing duplicate tests and destroying clinical context. The article quantifies how deep the problem runs: more than 80% of Indian outpatient care happens outside any common digital infrastructure, and EHR adoption remains concentrated in large corporate chains, with India lagging well behind the US (96%) and China (85%). A useful conceptual move is its separation of two distinct fragmentation problems that people conflate — **NHCX** tackles *claims* fragmentation, while **ABDM** tackles *clinical-data* fragmentation, and they need different solutions. It then lays out ABDM's four components with current figures: 866 million ABHA accounts, 4.17 lakh facilities in HFR, 6.76 lakh professionals in HPR, and the HIE-CM consent layer, all on a federated architecture. As of the writing, 90.70 crore linked records existed but only 2.56 lakh facilities actively used FHIR-compliant software — implementation is clearly ongoing. The conclusion is measured: ABDM lays real foundations for longitudinal, consent-governed records at scale, but interoperability depth and rural connectivity remain unsolved.

🔗 **Read it:** [caladriushealth.ai/blog/2026/06/05/India's-Health-Data-Problem](https://caladriushealth.ai/blog/2026/06/05/India's-Health-Data-Problem/)

### 8. Beyond Intermediation: How NHCX Is Reshaping the TPA's Role in Indian Health Insurance

A sharp, industry-facing analysis of what standardised claim routing does to the **Third-Party Administrator** business model. The article frames NHCX as a structural overhaul rather than a mere upgrade — a centralised, FHIR-compliant gateway that standardises data flow between hospitals, insurers, and government schemes, while crucially *not* adjudicating claims itself (insurers and TPAs keep that role, but now inside common frameworks). Its analytical core identifies three competitive moats NHCX erodes: proprietary hospital networks, specialised claims-processing expertise, and deep familiarity with a fragmented adjudication landscape — all weakened once data is standardised and hospitals can onboard directly with AI-assisted adjudication at scale. It then sketches three plausible market scenarios over the next 36–60 months: technology-forward TPAs evolving into managed-care partners; large insurers building in-house capability and reducing TPA dependence; and consolidation among smaller and mid-sized TPAs unable to carry the infrastructure cost. The constructive note is where lasting value lives — clinical services like utilisation management, wellness, and disease management, where institutional expertise and patient relationships can't be commoditised. It grounds the trend in fact: sixteen TPAs joined NHA–IRDAI integration workshops in August 2023, and six completed initial ABDM integration ahead of any formal mandate. Read it for a clear-eyed view of who wins and who must adapt.

🔗 **Read it:** [caladriushealth.ai/blog/2026/05/26/Beyond-Intermediation](https://caladriushealth.ai/blog/2026/05/26/Beyond-Intermediation/)

### 9. The ABDM Stack: How NHCX Fits Into India's Digital Health Architecture

This piece zooms all the way out and shows India's digital health system as a coherent, layered stack rather than a bag of unrelated initiatives. The bottom layer is identity: three registries — **ABHA** (citizens), **HPR** (professionals), and **HFR** (facilities) — form a single source of truth for every participant. On top sit three gateways: **HIE-CM** for patient-consented clinical record sharing, **UHI** for service discovery and delivery, and **NHCX** for standardised insurance claims on HL7 FHIR R4 — positioned as the financial-interoperability layer that finally connects clinical and insurance systems that used to be entirely separate. The article is rich with current adoption data: as of April 2026, NHCX showed 83 registered payers, 42,687 provider facilities, and over 23.4 million processed claims, with the Digital Health Incentive Scheme paying hospitals up to ₹500 per claim (capped at 10%) for NHCX transactions. Its forward-looking takeaways matter: adoption is voluntary but carries real momentum through incentives and reported Finance-Ministry co-governance discussions; integration demands genuine investment in documentation quality and coding accuracy; and the standardised data unlocks regulatory analytics that were impossible before — tracking billing patterns, treatment costs by diagnosis, and scheme utilisation in near-real time. The best single map of where NHCX sits relative to everything else.

🔗 **Read it:** [caladriushealth.ai/blog/2026/05/15/The-ABDM-Stack](https://caladriushealth.ai/blog/2026/05/15/The-ABDM-Stack/)

### 10. From Friction to Flow: How NHCX Will Rebuild India's Insurance Plumbing

The most comprehensive walk through the claims lifecycle on the list, this article treats NHCX as foundational plumbing that turns a manual, adversarial process into a standardised, digital-first flow. It organises the vision around four objectives: standardising claims across the ecosystem, shrinking lengthy receivable cycles, enabling insurance innovation through machine-readable data, and improving transparency to rebuild trust between hospitals, insurers, and patients. The heart of the piece re-engineers the entire claims journey step by step — establishing verified digital identities validated against national registries, enabling real-time eligibility verification *before* treatment begins, replacing dozens of incompatible submission formats with a unified **FHIR Claim Bundle**, and delivering transparent settlement notifications with payment-tracking detail so money stops disappearing into a black box. Importantly, it's not just a technical description: it's a change-management brief. Success, the article argues, requires organisations to restructure internal workflows across departments, partner with health-tech providers who genuinely know the NHCX specifications, and build a data strategy that turns standardised claims into a competitive edge in analytics and fraud detection. Its closing reframe is the throughline of the whole Caladrius Pulse series — NHCX adoption isn't a compliance chore but a strategic opportunity to engineer more efficient, data-driven operations while helping modernise India's healthcare infrastructure.

🔗 **Read it:** [caladriushealth.ai/blog/2026/04/24/From-Friction-to-Flow](https://caladriushealth.ai/blog/2026/04/24/From-Friction-to-Flow/)

For the full, continually-updated feed, follow **[Caladrius Pulse](https://caladriushealth.ai/blog/)** directly.

<div class="disclosure" markdown="1">

**Disclosure.** **Yajur Healthcare** is actively involved in building the **medical data infrastructure for Caladrius Health AI Studio**, in collaboration with **GPracta Technology Services Pvt Ltd**. We share this reading list both because the material is genuinely useful to anyone working on India's digital health rails, and in the spirit of transparency about that working relationship.

</div>

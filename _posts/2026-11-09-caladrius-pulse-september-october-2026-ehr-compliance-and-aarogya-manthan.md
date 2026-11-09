---
layout: post
title: "Caladrius Pulse, September and October 2026: The EHR Compliance Mandate and Six Shifts from Aarogya Manthan"
date: 2026-11-09 22:30:00 +0530
author: "Yajur Healthcare"
description: "Our monthly roundup of new writing from Caladrius Health AI Studio. This edition covers the two Caladrius Pulse articles published since our September edition: how ABDM conformance is becoming a baseline for hospital software vendors, and six shifts in India's health claims reported from the Aarogya Manthan 2026 forum, with our own analysis of what they mean for builders."
keywords: "Caladrius, Caladrius Health, Caladrius Health AI Studio, Caladrius Pulse, Aarogya Manthan 2026, ABDM for EHR vendors, HIMS, ABDM M1 M2 M3, NABH digital health standards, NMC HMIS, PM-JAY auto-adjudication, NHCX, IRDAI, TReDS, claims financing, DPDP Rules 2025, consent manager, FHIR India, Digital Health Incentive Scheme, India digital health, health claims, medical data infrastructure, Yajur Healthcare, GPracta Technology Services"
tags:
  - ABDM
  - NHCX
  - PM-JAY
  - EHR
  - health-claims
  - interoperability
  - reading-list
categories:
  - Interoperability
  - Curated Reading
reading_time: "14 min read"
og_title: "Caladrius Pulse, September and October 2026: The EHR Compliance Mandate and Six Shifts from Aarogya Manthan"
og_description: "Two new Caladrius Pulse reads, analysed: ABDM conformance for hospital software vendors, and six shifts in India's health claims from Aarogya Manthan 2026."
og_type: article
mentions:
  - type: "Organization"
    name: "Caladrius Health AI Studio"
    url: "https://caladriushealth.ai/blog/"
  - type: "Organization"
    name: "National Health Authority"
  - type: "Organization"
    name: "GPracta Technology Services Pvt Ltd"
citation:
  - type: "Article"
    name: "ABDM for EHR Vendors: The Compliance Mandate That's Reshaping the HIMS Market, Caladrius Health"
    url: "https://caladriushealth.ai/blog/2026/09/25/ABDM-for-EHR-Vendors/"
  - type: "Article"
    name: "Six Shifts in India's Health Claims, From Aarogya Manthan 2026, Caladrius Health"
    url: "https://caladriushealth.ai/blog/2026/10/30/Aarogya-Manthan-2026/"
  - type: "Blog"
    name: "Caladrius Pulse, Caladrius Health AI Studio"
    url: "https://caladriushealth.ai/blog/"
faq:
  - q: "What did Caladrius Health publish in September and October 2026?"
    a: "Two new Caladrius Pulse articles: ABDM for EHR Vendors (25 September 2026), on how ABDM conformance is becoming a baseline requirement for hospital software, and Six Shifts in India's Health Claims, From Aarogya Manthan 2026 (30 October 2026), a recap of the National Health Authority forum held in New Delhi on 25 September 2026. Both are summarised, analysed and linked in this roundup."
  - q: "Is ABDM integration mandatory for hospital software in India?"
    a: "According to Caladrius, the requirement is arriving through several routes rather than one law: state tenders such as Rajasthan's iHMS 2.0 RFP, a National Medical Commission notice and memorandum on HMIS for medical colleges, and NABH digital health standards that ask for an ABDM M3 certificate. The same article notes that the PM-JAY empanelment guidelines it reviewed (November 2021) contain no ABDM condition. Check the current notices for your own situation."
  - q: "What is auto-adjudication in PM-JAY?"
    a: "Auto-adjudication means eligible claims are approved by rules and software without a manual review step. Speakers at Aarogya Manthan 2026 put the auto-adjudicated share of PM-JAY claims at about 30 to 35 percent, and a Uttar Pradesh dialysis example was reported falling from about 69 days to about 5 days. These are speaker-attributed, unaudited figures as reported by Caladrius."
  - q: "Where can I read the original Caladrius Health articles?"
    a: "Both source articles are linked from this roundup and published on Caladrius Pulse at https://caladriushealth.ai/blog/."
---

> **The monthly Caladrius roundup, with more of our own view this time.** In September we published [our summary of the five Caladrius Pulse articles from late July and August]({% post_url 2026-09-16-caladrius-pulse-august-2026-consent-claims-and-abdm-on-the-ground %}). This edition picks up from there. Since that roundup, **[Caladrius Health](https://caladriushealth.ai/blog/)** has published **two** new Caladrius Pulse articles, one on **25 September** and one on **30 October**. They are longer and denser than the explainers that came before, so we have summarised each one in detail and added a section of our own analysis at the end. Every summary links to the original.

Two articles in six weeks is a slower cadence than the summer, and that is fine, because both pieces are doing different work from the earlier Pulse writing. The explainers of June and July asked *what are ABHA, ABDM and NHCX?* The August batch asked *who controls the data and where does the money go?* This pair asks a question that only becomes urgent once the rails are live: **who has to change what they do, and by when?** One answers it for the people who write hospital software. The other answers it for the people who pay for, process and finance health claims.

A note on method before we start. We read both articles in full and describe them as faithfully as we can, attributing figures to Caladrius and, through Caladrius, to its named sources. We have not independently re-derived every number, and where an article itself flags a figure as unaudited or a source as indirect, we say so. Where we add our own interpretation, we mark it as ours.

### 1. ABDM for EHR Vendors: The Compliance Mandate That's Reshaping the HIMS Market

**Published 25 September 2026. Part 7 of the nine-part ABDM series.**

This is the most practical article Caladrius has published for software teams, and its central argument is carefully worded. It does *not* say there is a single law that forces every hospital system to integrate with ABDM. It says that ABDM conformance is becoming a **shared technical baseline** because several independent pressures are pointing the same way at once, and that a vendor who ignores all of them is steadily narrowing its own market.

**Where the standard is being written down.** The article walks through four places where the requirement now appears. First, **state tenders**: it quotes the Rajasthan RFP for iHMS 2.0 (RajCOMP/RISL, 30 July 2024), which asks bidders to demonstrate ABDM compliance against the **M1, M2 and M3 milestones**, including FHIR-based exchange and ABHA-based record access. Second, **regulators**: a **National Medical Commission** public notice of 3 March 2026 asks medical colleges to integrate their attached hospitals' HMIS with the ABDM-HMIS portal, tied to annual assessment, and a 17 July 2026 NMC memorandum calls HMIS mandatory under its minimum standards, with press reports that around 450 institutions were still incomplete. Third, **accreditation**: the **NABH Digital Health Standards** for HIS and EMR software (first edition, September 2024) make a valid ABDM **M3** certificate part of eligibility, alongside at least three live deployments in Indian hospitals. Fourth, and importantly, the article points out what is *absent*: the PM-JAY empanelment guidelines it reviewed (November 2021, version 3.0) contain no ABDM, ABHA or HFR condition. The mandate is a patchwork, not a statute.

**What the standard asks of software.** For readers who have not worked through the milestones: **M1** is ABHA creation and verification at registration; **M2** makes the system a **Health Information Provider**, able to share records when a patient consents; **M3** makes it a **Health Information User**, able to retrieve records from elsewhere with consent. Technically, the article describes the national FHIR implementation guide (package `ndhm.in` 6.5.0 on FHIR 4.0.1, with a 7.0.0 development build visible in preview as of August 2026), six clinical document profiles (diagnostic report, discharge summary, health document, immunisation, OP consultation, wellness) bundled into a document bundle, and a companion guide specifying a minimum of seven clinical and one billing artefact, 42 terminology value sets and the SNOMED CT, LOINC and ICD-10 vocabularies. On security, applications are sandbox-validated, must pass a web application security assessment, and must comply with the Health Data Management Policy (version 2, April 2022), with personal data kept in India and only the minimum held centrally.

**What conformance costs, and when.** Here the article does something rare: it puts numbers on it. NABH certification fees, valid for two years and excluding 18 percent GST, run from **₹50,000** (HIS or EMR, basic) to **₹1,50,000** (both, advanced). The functional testing agencies it names are FIME India, Suma Soft and Tata Communications, though it cites a third-party mirror of NHA guidance for that and says it found no public NHA price list. The ABHA V3 integrator guide was approved on 7 August 2024 and revised four times through 28 January 2025, which is a useful reminder that the target moves.

**How the market is changing.** More than **450 integrated solutions** were listed by May 2026 (27 in February 2022), but only **26 products** appear on NABH's certified-software registry. A KLAS and CHIME India study from March 2025 counted about 30 EMR vendors across 55 organisations, skewed toward large institutions. At the low end, **eSushrut@Clinic** (C-DAC, launched June 2026) is priced at ₹499 a month for five users, or ₹299 with an NHA subsidy. On adoption, **4.42 lakh facilities** were on the HFR by 12 December 2025, but ABDM-enabled software was running in about **1.59 lakh** facilities as of February 2025 against 3.64 lakh registrations at the time.

**Incentives.** The Digital Health Incentive Scheme, live since 1 January 2023, pays hospitals ₹20 per ABHA-linked transaction above 50 per bed per month, labs ₹15 above 500 a month, capped at ₹4 crore per entity, and pays digital solution companies 25 percent of the facility incentive plus ₹5 per transaction for facilities that do not qualify. By 18 June 2026 over ₹107 crore had gone to hospitals, ₹2.95 crore to diagnostics, labs and pharmacies, and over ₹26 crore to the solution companies. The article closes on the **DPDP Rules 2025** (notified 13 November 2025, with staggered timelines) and a Health Secretary statement of 18 July 2026 that focus is moving to "wider adoption and effective utilisation" of the platforms, which Caladrius reads as evaluation shifting from *certified* to *actually used*.

🔗 **Read it:** [caladriushealth.ai/blog/2026/09/25/ABDM-for-EHR-Vendors](https://caladriushealth.ai/blog/2026/09/25/ABDM-for-EHR-Vendors/)

### 2. Six Shifts in India's Health Claims, From Aarogya Manthan 2026

**Published 30 October 2026. Sector Watch.**

This is Caladrius's recap of **Aarogya Manthan 2026**, held in New Delhi on 25 September 2026 to mark eight years of PM-JAY and five years of ABDM. It draws mainly on three NHA livestreams (the inaugural session, the PM-JAY track and the ABDM track), and it is upfront that the figures quoted are what speakers said on stage and have not been audited. That honesty matters, because the article is dense with numbers. It organises them into six shifts.

**Shift 1: auto-adjudication moves from pilot to policy.** The headline example is Uttar Pradesh, where a PM-JAY **haemodialysis claim reportedly fell from about 69 days to about 5 days** once auto-adjudication was switched on, in a state handling 10,000 to 15,000 claims a day. Speakers put the auto-adjudicated share of PM-JAY claims at roughly **30 percent** (NHA CEO) and **35 percent** (ABDM Mission Director), and the article says a framework has now been released making this standing policy. The payment side, Caladrius notes, is the next frontier.

**Shift 2: NHCX enters its second phase.** The IRDAI Chairman is reported as saying NHCX handles close to **1 lakh claims a day**, with more than 8 crore claims paid and 15 crore pre-authorisations processed, and that PM-JAY runs every claim through the exchange alongside 10 central and 56 state schemes. For the next phase IRDAI described "three building blocks": **ABHA on every new and renewed policy, a treatment code on every bill, and a standard billing format**, with a public consultation expected within about a month and a 12-month horizon for visible adoption progress. On speed, an IRDAI and CII working group reportedly agreed that hospitals and insurers should aim for pre-authorisation and discharge within an hour, with a sub-30-minute target for pre-authorisation, against current discharge waits of four to six hours reported by one large hospital group. Insurers described their own AI use: one reports auto-adjudicating about 70 percent of claims, another says about 40 percent of unflagged claims get pre-authorisation in around 30 minutes, with about 20 percent of AI decisions getting a second human check and about 10 percent audited after payment. The Insurance Information Bureau put **real-time data quality across 32 health insurers at about 60 percent**, and described 51 new abuse triggers joining 32 existing fraud and waste triggers.

**Shift 3: claims become working capital.** This is the most inventive idea in the piece. A speaker from **M1xchange**, an RBI-licensed TReDS platform, proposed treating **NHCX-approved claims as financeable receivables**, so a hospital could be paid around T+1 through bank discounting at roughly 6 percent instead of borrowing at 12 to 13 percent, potentially halving working-capital costs. The IRDAI Chairman's caveat, reported by Caladrius, is the right one: the cost must never be passed on to policyholders.

**Shift 4: from purchasing volume to purchasing value.** The article reports a **cost-effectiveness threshold** expected from PGIMER's Prof. Shankar Prinja (a willingness-to-pay study on 21,840 observations across six states), a tumour board certificate requirement for all oncology packages verified through HPR and HFR, and the National Cancer Grid's pooled procurement, reported at about an 82 percent average price reduction from MRP with no drug substitution. It also reports the so-called missing middle: market insurance reaching roughly the top 10 percent, government schemes the bottom half, leaving about **40 percent** in between.

**Shift 5: standards and structured records.** Beneath everything sits the data layer: the article describes work on a standard drug code set, about 1,500 LOINC-based lab codes (with 18 variants of a single complete blood count panel found in the wild), Bharat Health Terminology Services, and over 150 ICMR Standard Treatment Workflows shared with the NHA. Tripura is reported to have onboarded 85 percent of its public facilities to an M3-compliant system in four months.

**Shift 6: what this asks of hospital revenue teams.** The article closes with six practical asks for provider finance teams, a table of where its own platform fits, and a "what to watch next" list that includes an NHCX sandbox revamp (reportedly cutting integration from months to days) and a Public Insurance Registry for which the consultation closed on 30 September.

🔗 **Read it:** [caladriushealth.ai/blog/2026/10/30/Aarogya-Manthan-2026](https://caladriushealth.ai/blog/2026/10/30/Aarogya-Manthan-2026/)

## Our analysis: what the two articles say when read together

The Caladrius articles stand on their own. Read side by side, they raise several points we think builders should sit with.

**1. The mandate is real, but it is arriving sideways.** The EHR article's most valuable contribution is its honesty that no single instrument obliges every hospital system to conform. The pressure comes from tenders, medical education regulation and accreditation. That has a practical consequence: your obligation depends on *who your customers are*. A vendor selling into state government hospitals and medical colleges faces a hard requirement today. A vendor selling to private clinics may face none, but will still meet it indirectly, because those clinics' insurers, aggregators and referral partners increasingly expect structured, ABHA-linked records. The Aarogya Manthan article shows the other direction of travel: PM-JAY's biggest scheme is pushing auto-adjudication, which only works on clean structured claims, yet its empanelment rules, as the EHR article reads them, do not ask for ABDM. Expect that gap to close from the claims side.

**2. "Registered" is still not "functional", and the gap has barely moved.** In our September edition we noted the difference between facilities registered on the HFR and facilities actually running ABDM-enabled software. The new articles give the same shape again: 4.42 lakh facilities on the HFR in December 2025, and the 1.59 lakh figure for software-enabled facilities from February 2025. The dates differ, so these are not a like-for-like ratio, and we would be careful about computing one. But the direction is clear. Counting registrations is easy. Counting records that move, in FHIR, with a valid consent artefact, is the hard measurement, and it is exactly the one the Health Secretary's "effective utilisation" remark implies will matter next.

**3. The cost of conformance is mostly not the fee.** NABH fees of ₹50,000 to ₹1,50,000 look small. The real costs sit elsewhere: mapping local data to six FHIR profiles and 42 value sets, keeping up with a moving integrator guide (four revisions in about six months), and maintaining security assessments. The Aarogya Manthan finding that one common lab panel exists in 18 variants is a perfect illustration. For a vendor, the unglamorous work of terminology normalisation is where the effort lives, and it is also where the quality of the resulting records is decided.

**4. The three IRDAI building blocks are a data-model problem, not a policy slogan.** An ABHA on every policy, a treatment code on every bill and a standard billing format are three keys that let a claim be joined to a patient, a procedure and a price without human interpretation. Auto-adjudication, fraud detection and claims financing all depend on that join. The Insurance Information Bureau's reported 60 percent real-time data quality across 32 insurers is the same story from the payer side: the intelligence is not the bottleneck, the input is. We would add that talks of linking the HFR ID with IIB's ROHINI hospital ID, mentioned in the article, are a small detail with large consequences for de-duplicating who the hospital actually is.

**5. Claims financing deserves excitement and scrutiny in equal measure.** Turning approved claims into receivables is elegant, and the reported spread between roughly 6 percent discounting and 12 to 13 percent borrowing is large. But it only works if approval is *reliable*, which is why it sits downstream of auto-adjudication, and it needs the consumer-protection guardrail the IRDAI Chairman named. It also introduces a new dependency: a hospital's cash flow would then rest on the integrity of NHCX status data, so consent, audit and provenance of that data stop being an IT concern and become a treasury one.

**6. Treat the stage figures as leads, not facts.** Caladrius is clear that the Aarogya Manthan numbers are speaker-attributed and unaudited. They also disagree slightly with each other (30 percent versus 35 percent auto-adjudicated), and several timelines were phrased as "within weeks", "in about a month" or "in about a week" in late September. As of today, 9 November, we have not checked whether the IRDAI consultation, the cost-effectiveness threshold or the NHCX sandbox revamp has actually been published. If your roadmap depends on any of them, check the primary notice first.

**7. A date to watch is close.** The EHR article summarises the DPDP Rules 2025 as notified on 13 November 2025, with consent-manager provisions taking effect after one year and the substantive obligations after 18 months. On that reading, the consent-manager provisions come into force within days, and the broader obligations around May 2027, which matches the deadline cited in our September roundup. The article also notes that neither the Act nor the Rules creates a separate health-data category. Anyone building consent flows should read the Rules text itself rather than rely on a summary, ours included.

## The through-line

In September we described a maturity curve: rails first, then the hard questions about consent, money and uneven adoption. These two articles are the next step along it. The conversation has moved from *can records move?* to *who must enable that, how is it audited, and what can we build on top once claims are structured?* Compliance is turning into a competitive filter for software vendors, and structured claims are turning into a financial asset for hospitals.

None of that works unless the layer in the middle is solid: records that are structured to the national profiles, tied to a valid consent, and traceable end to end. That gap between records *linked* and records that genuinely *move and mean something* is exactly the layer [Yajur Healthcare]({% post_url 2026-02-15-need-for-a-robust-abdm-healthcare-network-enabling-cancer-care-without-walls %}) works on. For the claims side specifically, see our earlier note on [why digitisation alone couldn't fix India's health-claims ecosystem]({% post_url 2026-02-13-why-digitization-alone-couldnt-fix-indias-health-claims-ecosystem %}), and for the earlier Pulse reads, our [July reading list]({% post_url 2026-07-14-caladrius-pulse-10-reads-on-abdm-and-nhcx %}) and [September roundup]({% post_url 2026-09-16-caladrius-pulse-august-2026-consent-claims-and-abdm-on-the-ground %}).

For the full, continually updated feed, follow **[Caladrius Pulse](https://caladriushealth.ai/blog/)** directly, and watch this space next month.

<div class="disclosure" markdown="1">

**Disclosure.** **Yajur Healthcare** is actively involved in building the **medical data infrastructure for Caladrius Health AI Studio**, in collaboration with **GPracta Technology Services Pvt Ltd**. We share this roundup both because the material is genuinely useful to anyone working on India's digital health rails, and in the spirit of transparency about that working relationship. The analysis section reflects our own views, not those of Caladrius or the National Health Authority.

</div>

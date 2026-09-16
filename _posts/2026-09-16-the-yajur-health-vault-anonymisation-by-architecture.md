---
layout: post
title: "The Yajur Health Vault: Anonymisation by Architecture"
date: 2026-09-16 10:00:00 +0530
last_modified_at: 2026-09-16 10:00:00 +0530
author: "Manish Sharma"
description: "A concept paper on building a hospital health data vault where identity is structurally separated from clinical content — drawing on MIMIC's de-identification pipeline and the SAIL Databank's split-file architecture, built entirely on open source, with no path by which data can reach an external model."
keywords: "health data vault, hospital data anonymisation, de-identification healthcare, MIMIC de-identification, SAIL Databank architecture, anonymous linking field, ALF_E, trusted research environment India, medallion architecture healthcare, bronze silver gold healthcare data, patient data anonymisation, PHI separation schema, pseudonymisation vs anonymisation, k-anonymity clinical data, date shifting de-identification, surrogate generation clinical notes, break glass re-identification, two factor de-anonymisation, DPDP Act 2023 health data, ABDM health data management policy, anonymisation protocols NHA, HIPAA safe harbor expert determination, motivated intruder test, local inference healthcare, on premise LLM hospital, data sovereignty healthcare India, open source health data platform, MinIO Delta Lake DuckDB healthcare, Five Safes framework, statistical disclosure control, Yajur health vault"
tags:
  - healthcare
  - data-engineering
  - privacy
  - open-source
  - de-identification
  - data-governance
  - India
  - ABDM
  - DPDP
  - data-lakehouse
  - health-infrastructure
  - digital-health
categories:
  - Technology
  - Healthcare Innovation
reading_time: "32 min read"
og_title: "The Yajur Health Vault: Anonymisation by Architecture"
og_description: "How to build a hospital data vault where the secret is not kept — it is not present. Drawing on MIMIC and the SAIL Databank, built entirely on open source."
og_type: article
twitter_card: summary_large_image
article_section: "Healthcare Data Governance"
word_count: 8300
mentions:
  - "MIMIC-IV"
  - "SAIL Databank"
  - "PhysioNet"
  - "Ayushman Bharat Digital Mission"
  - "Digital Personal Data Protection Act 2023"
  - "HIPAA"
---

<div id="sandbox-sticky" style="position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#0d0d0b;border-top:1px solid #2a2a26;padding:14px 24px;display:none;align-items:center;justify-content:space-between;gap:16px;font-family:'Inter',system-ui,sans-serif;box-shadow:0 -4px 24px rgba(0,0,0,0.3);">
  <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;overflow:hidden;">
    <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#d97757;white-space:nowrap;">Yajur Labs</span>
    <span style="font-size:0.9rem;color:#f0ede6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Watch a record get anonymised — then watch an authorised user bring it back</span>
  </div>
  <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
    <a href="/sandbox/health-vault-anonymiser.html" style="font-family:'Inter',system-ui,sans-serif;font-size:0.85rem;font-weight:700;padding:9px 20px;background:#d97757;color:#fff;border-radius:5px;text-decoration:none;white-space:nowrap;">Open Sandbox &rarr;</a>
    <button id="sandbox-dismiss" style="background:transparent;border:none;color:#5e5d59;font-size:1.4rem;cursor:pointer;padding:2px 8px;line-height:1;">&times;</button>
  </div>
</div>
<script>
(function(){
  var bar=document.getElementById('sandbox-sticky'), btn=document.getElementById('sandbox-dismiss');
  if(!bar||!btn) return;
  var dismissed=false;
  try{ dismissed = sessionStorage.getItem('hv-sandbox-dismissed')==='1'; }catch(e){}
  btn.addEventListener('click',function(){
    dismissed=true; bar.style.display='none';
    try{ sessionStorage.setItem('hv-sandbox-dismissed','1'); }catch(e){}
  });
  window.addEventListener('scroll',function(){
    if(dismissed) return;
    bar.style.display = (window.scrollY>1200) ? 'flex' : 'none';
  },{passive:true});
})();
</script>

### A hospital's data problem is not storage. It is permission.

Six months ago I wrote a [practical guide to building a data lakehouse for your hospital](/2026/03/11/building-a-data-lakehouse-for-your-hospital.html) — MinIO, Delta Lake, DuckDB, Metabase, on one server, for the price of a mid-range car and no licensing fees at all. The architecture works. Hospitals have built it.

And then they stop.

They stop because the moment the lakehouse contains real patient records, a different set of questions arrives, and they are not engineering questions. Who is allowed to run a query? What happens when a researcher wants an extract? Can the analytics team see names? Can the billing vendor? If we want to try an AI model on discharge summaries, does that mean uploading two hundred thousand patients' clinical narratives to a company in another jurisdiction? And if the answer to that last one is no — which it is — then what exactly *are* we allowed to do with the thing we just built?

These questions do not have technical answers in most hospitals. They have *organisational* answers, which is to say they have no answers: a spreadsheet of who has database credentials, an informal norm that the data team "doesn't look at names", a vendor contract with an indemnity clause. None of that survives contact with a serious auditor, and none of it survives contact with a breach.

This paper describes the layer that has to come next. We call it the **Yajur Health Vault**, and the idea behind it is a single sentence:

> **A vault is not a place where the secret is kept. It is an architecture in which the secret is not present.**

Everything below follows from that. The clinical data your analysts, your dashboards and your models touch does not contain identity — not because a policy forbids looking, but because the identifying values are not in that database, are not reachable from it, and cannot be derived from what is. Re-identification remains possible for the small number of people whose job requires it, through a deliberate, authenticated, dual-authorised, time-boxed and permanently audited path. For everyone else it is not restricted. It is absent.

This is not a new idea, and I want to be clear about that from the start, because the credibility of this approach rests on it being *old*. Two systems have been doing versions of this for over a decade and have published how: **MIMIC**, the intensive-care database released by MIT's Laboratory for Computational Physiology from Beth Israel Deaconess Medical Center, and the **SAIL Databank** at Swansea University, which links health and social-care records for the population of Wales. Between them they have supported thousands of studies. Neither has had a re-identification incident. This paper steals from both, says exactly what it is stealing, and — where their published methods conflict, which happens more often than you would expect — says which one we chose and why.

It is written for three readers at once. Part I and II are for the medical director, the CEO and the Data Protection Officer deciding whether this is worth doing. Parts III and IV are for the architect and the data engineer who will build it. Part V is for the ethics committee, the regulator and the institutional review board who will ask whether it is defensible. Part VI is the section I would read first if I were any of them: what this approach does *not* do, and what it costs.

There is also a [working demonstration](/sandbox/health-vault-anonymiser.html) that runs the whole pipeline in your browser, on synthetic patients, using real cryptography. You can watch a record get anonymised, try to break it, and then step through an authorised re-identification. I would suggest reading Part III alongside it.

---

## Part I — Why the obvious approaches fail

### The access-control answer

The instinctive response to "who can see patient data" is to control access: roles, permissions, row-level security, a good audit log. Every hospital information system ships with this, and it is necessary. It is also, on its own, insufficient — for a reason that has nothing to do with how well it is implemented.

Access control protects data **that is present**. A privileged credential, a misconfigured backup, an SQL injection, a departing employee with a USB drive, a ransomware operator who exfiltrates before encrypting — every one of these defeats access control precisely because the data was sitting there, complete, waiting to be read by anyone who got past the gate. The 2023–2025 run of hospital breaches in India, the US and the UK were overwhelmingly not failures of cryptography. They were successful authentications by the wrong party.

Access control asks: *is this person allowed to see the name?* Anonymisation by architecture asks a better question: *is the name here at all?*

### The "we'll just remove the names" answer

The second instinct is to strip the obvious identifiers — name, phone, address, hospital number — and call the result anonymous. This fails in a more interesting way, and the failure has a name: the **mosaic effect**.

Latanya Sweeney demonstrated the canonical version in the late 1990s: date of birth, sex and five-digit ZIP code — none of them a "name" — uniquely identify a large majority of the US population. She proved it by re-identifying the Governor of Massachusetts in a supposedly anonymous hospital discharge dataset and mailing him his own medical records. The lesson generalises brutally to clinical data, where a patient is characterised not by three attributes but by hundreds: a sequence of lab values, an admission timestamp, a rare drug, an unusual comorbidity pairing, a referral from a named clinic.

In a 50-bed hospital in a single neighbourhood, the mosaic effect is *worse*, not better, than in a national dataset. A 34-year-old woman from a particular pin code admitted with a rare autoimmune presentation is not one in a million. In that catchment she is one, full stop. The smaller and more local your data, the more identifying every attribute becomes — which is the exact opposite of the intuition most hospital boards start with.

### The "send it to the model" answer

The third instinct, and the one this paper cares most about, is to treat privacy as a procurement problem. A large language model vendor offers a business agreement, a zero-retention promise, a compliance certification and a data processing addendum. The hospital signs it and sends clinical text to an API.

I want to be precise about the objection here, because it is not that these vendors are untrustworthy. Several are meaningfully more rigorous about security than the hospital sending them data. The objection is **structural**: a contractual promise is enforced after the fact, by lawyers, in a jurisdiction, following a disclosure. An architectural guarantee is enforced before the fact, by the absence of a network route. Those are different classes of assurance, and only one of them is something you can demonstrate to an auditor on a Tuesday afternoon by running `curl` and watching it fail.

There is also a jurisdictional reality that Indian hospitals in particular should sit with. Health data sent outside the country for inference is subject to the legal process of wherever it lands. No addendum changes that. If you want a guarantee that is independent of which government subpoenas which company, the guarantee has to be that the data never left.

---

## Part II — What the Vault is, in one page

For readers who will decide whether to fund this rather than build it.

The Yajur Health Vault is a set of five zones through which every piece of clinical data moves, in one direction only, becoming progressively less identifying at each step.

| Zone | What it holds | Who reads it |
|---|---|---|
| **0 — Archive** | A byte-exact, encrypted, immutable copy of exactly what arrived. Full identity. | Nobody. It is a legal record of receipt, not a dataset. |
| **1 — Bronze** | The same records, parsed — but with direct identifiers *extracted out* into a separate encrypted store. | The ingestion service only. |
| **2 — Silver** | Dates shifted, clinical notes de-identified, indirect identifiers generalised. | Data engineering, audited. |
| **3 — Gold** | Analysis-ready data containing no identity. | Everyone. Freely. This is the working database. |
| **4 — Egress** | Anything leaving the building at all, checked for disclosure first. | Requires human sign-off. |

The direct identifiers extracted at Zone 1 go into the **Identity Vault** — a small, separate, encrypted database whose only function is to hold the mapping between a real person and a random number. It sits behind its own credentials, its own encryption keys, and a key-management service that requires several people to unseal. The analytics database has no network route to it, no credential for it, and no key that would decrypt it.

**What you get.** Your analysts, your dashboards, your quality team, your researchers and your AI models all work against Zone 3, freely, without a privacy review for every query, because there is nothing there to review. The work that was blocked for governance reasons becomes ordinary work.

**What it costs.** One additional server-class machine, roughly ₹2–3 lakh, plus a PostgreSQL instance you probably already run. Zero licensing — every component is open source. The real cost is not money; it is about eight to twelve weeks of engineering and, more importantly, the creation of a small standing governance body that approves data uses. That body is not optional. It is the part that makes the rest defensible.

**What it does not do.** It does not make your data anonymous in an absolute sense, because nothing does. Part VI is an honest accounting of that, and I would rather you read it before committing than after.

---

## Part III — Architecture

### III.1 The split: the single most important design decision

The foundational move is borrowed from the SAIL Databank, and it is worth understanding why it is stronger than it first appears.

SAIL does not hold identified data at all. Health records arrive at Swansea already split: a **demographic file** goes to a trusted third party — historically the NHS Wales Informatics Service, now Digital Health and Care Wales — while the **clinical file**, stripped of identity, goes to SAIL. The third party matches people and assigns each an anonymous key. SAIL receives clinical data keyed by that number and never sees the demographics. The third party sees demographics and never sees the clinical content.

Neither party can re-identify anyone alone. That is not a promise about behaviour; it is a statement about what each party physically holds.

A single hospital cannot fully replicate a two-organisation split — it is one organisation, and it legitimately holds both halves for care delivery. But it can replicate the *property* by making the separation a boundary of credentials, keys and network reachability rather than of corporate ownership:

- The Identity Vault is a **separate PostgreSQL instance**, not a separate schema in the same database. A schema is a permissions boundary; a separate instance with separate credentials on a separate network segment is an architectural one.
- **No database link, foreign data wrapper or federated query** connects the two. A join between clinical content and identity cannot be expressed as a query at all. It requires an explicit, authenticated API call that writes an audit record before it returns anything.
- Application credentials for the lakehouse **do not exist** in the Identity Vault's authentication realm. Not "are denied permission" — do not exist.
- Identity Vault columns are encrypted at the application layer with **AES-256-GCM**, using a key held in **OpenBao** (the open-source fork of HashiCorp Vault), sealed, and unsealed by Shamir key shares distributed to several people. A database administrator with full filesystem access to the Identity Vault reads ciphertext.

The test of whether you have implemented this correctly is simple and worth putting in your runbook: **if a single compromised credential can produce a name attached to a diagnosis, you have not built a vault.** You have built a database with good intentions.

### III.2 Identifiers: random, never hashed

Every record in Zones 1 through 4 is keyed by surrogate identifiers — `subject_id` for a person, `hadm_id` for an admission, `stay_id` for an episode of care.

These are **randomly generated and stored in a look-up table**. They are emphatically *not* hashes of the medical record number, and this is the single most common and most serious mistake in health data de-identification.

The reasoning is worth spelling out because the mistake is so intuitive. Hashing feels safe: SHA-256 is one-way, so a hashed MRN cannot be reversed. But a hash is only one-way over an *unpredictable* input space. Hospital MRNs are not unpredictable — they are short, structured, sequential, and follow a visible format like `APL/2024/08812`. An attacker who knows the format can hash every plausible MRN in the issuing range in seconds and build a complete reverse lookup table. Hashing an MRN provides essentially no protection. Salting helps only until the salt leaks, at which point the same attack runs again.

MIMIC gets this right, and says so plainly. From the MIMIC-IV documentation:

> "Patient identifiers were replaced using a random cipher, resulting in deidentified integer identifiers for patients, hospitalizations, and ICU stays."

A random integer from a look-up table has no relationship to the input at all. There is nothing to attack except the look-up table itself — which is exactly the thing we put in the Identity Vault and guard accordingly.

Identifiers are also **shuffled**, so that ordering leaks nothing: `subject_id` 10023847 was not admitted before `subject_id` 10023848.

### III.3 A three-layer key hierarchy

SAIL goes considerably further than a single surrogate, and the design is elegant enough that we adopt it wholesale. Each layer defeats a different attack:

| Layer | SAIL's name | Held by | The attack it defeats |
|---|---|---|---|
| Source | NHS number / ABHA + MRN | The hospital | — |
| 1 | **ALF** — Anonymous Linking Field, a consistent encryption of the national ID | Trusted third party | Exposure of the national identifier |
| 2 | **ALF_E** — re-encrypted on receipt | The vault operator | **Collusion with the third party.** SAIL's own wording: re-encryption means "it is not possible for either a SAIL researcher or someone working for NWIS to use SAIL data to reverse the process to reveal NHS numbers." |
| 3 | **ALF_PE** — encrypted again with a per-project key | Per-project | **The mosaic attack across releases.** A researcher working on two approved projects cannot join their own two datasets, because the same patient carries a different key in each. |

That third layer deserves emphasis, because it defends against something most anonymisation schemes ignore entirely. Anonymisation is usually evaluated one dataset at a time. But an adversary — or simply a curious researcher with two legitimate approvals — can combine releases, and combination is where re-identification actually happens in practice. Project-scoped keys make combination impossible without going back through the Vault.

SAIL applies the same idea to addresses, producing a **RALF** — a Residential Anonymous Linking Field. Researchers can determine that two people live in the same household, and study household transmission or neighbourhood effects, without ever learning where that household is. For a hospital whose ambition is [neighbourhood health intelligence](/2026/03/11/building-a-data-lakehouse-for-your-hospital.html), this is precisely the right primitive, and it is one most people never think to build.

Matching people across source systems before any of this happens uses SAIL's **MACRAL** approach — deterministic matching on a valid national identifier where one exists, probabilistic weighted matching on five demographics (forename, surname, postcode, date of birth, sex) otherwise. SAIL reports match rates of 99.999% for GP data, 99.32% for inpatient records, and 95.16% for social services data — a useful reminder that the cleaner the source system, the better every downstream privacy property behaves.

### III.4 Dates: what shifting actually preserves

This is the part of de-identification most commonly described incorrectly, including in an earlier draft of this paper, so it is worth being exact.

MIMIC assigns **a single random offset, in whole days, to each patient**, and applies it to every date and time in that patient's record.

**What survives this, intact:**

- Every interval within a patient. MIMIC's documentation is explicit: "If the time between two measures in the database was 4 hours in the raw data, then the calculated time difference in MIMIC-IV will also be 4 hours." Length of stay, time-to-treatment, readmission interval, dose spacing — all exact.
- **Time of day.** A 3 a.m. admission is still a 3 a.m. admission.
- **Day of week.** Weekend-effect studies work.
- **Approximate seasonality.** The MIMIC-II user guide states that "the day of the week and season of the year were preserved."

**What is destroyed:**

- Absolute calendar position. MIMIC's shifted years land somewhere in 2100–2200.
- **Comparability between patients.** This is the real loss, and MIMIC states it bluntly: "Distinct patients are not temporally comparable. That is, two patients admitted in 2130 were not necessarily admitted in the same year."

That second point is what actually hurts. It is not seasonality that dies — it is your ability to line two patients up on a shared calendar, which is what epidemic curves, practice-change studies and pandemic-wave stratification all require.

MIMIC-IV introduces a fix, and it is the single most reusable idea in the whole corpus. Alongside the shifted dates, each patient carries:

- `anchor_year` — a shifted year,
- `anchor_age` — their age in that year,
- `anchor_year_group` — **a three-year band of *real* calendar time**, such as `2008 - 2010`.

So a patient with `anchor_year` 2153, `anchor_year_group` `2008 - 2010` and `anchor_age` 60 was 60 years old sometime in 2008–2010; their shifted year 2154 maps to real 2009–2011. You recover coarse real-world calendar position at ±3 years while every patient keeps a day-level random shift.

For a hospital, the practical read is: **dengue and respiratory seasonality analysis works. Year-on-year trend analysis works at three-year granularity. Stratifying by COVID wave does not.** Know which of those you need before you choose your band width — a wider band is more private and less useful, and that trade is yours to set, not ours.

**Patients over 89.** HIPAA's Safe Harbor rule requires ages above 89 to be aggregated, because the very old are identifiable by age alone. MIMIC has done this two different ways, and the difference is instructive. MIMIC-III set the date of birth to exactly 300 years before first admission, so these patients appear to be over 300 years old (their real median age is 91.4). MIMIC-IV instead top-codes: "If a patient's `anchor_age` is over 89 in the `anchor_year` then their `anchor_age` is set to 91."

**We use MIMIC-IV's approach.** A sentinel value like 300 must be detected and recoded by every analyst, every time, and one who forgets silently computes a mean age of 340. A top-coded 91 is wrong in a way that is bounded, conservative and harmless.

### III.5 Clinical notes: detect, then decide what to put back

Free text is where most of the clinical value lives and where most de-identification projects fail.

**Detection** is a solved-enough problem, and the solution is a hybrid. The reference implementation is the `deid` package from Neamatullah et al. (2008), built for MIMIC-II and MIMIC-III, which combines three mechanisms: dictionary look-up against known-PHI tables pulled from the source database itself; regular expressions for structured numerics like dates, phone numbers and MRNs; and context heuristics that catch names by their surroundings — "Mr.", "Dr.", "daughter", "Hospital", "Street". Critically it also maintains a **non-PHI allow-list** of clinical vocabulary, which is what stops it scrubbing "Parkinson", "Bell" or "Crohn". MIMIC-IV upgraded this to a rule-based system unioned with a neural network trained for de-identification.

The numbers are public, and both halves should be quoted:

> `deid` achieved **recall 0.967 and precision 0.749** on a gold-standard corpus of 2,434 nursing notes. MIMIC-IV-Note reports **99.9% sensitivity** on 2.3 million radiology reports.

The precision figure is the one people skip. It means roughly **15% of what the system removes is not PHI at all** — real clinical text destroyed as collateral because the system is deliberately tuned to prefer over-removal. That is the correct trade for privacy and a genuine cost to your data. It should appear in your documentation, not just your vendor's.

**Replacement is the interesting decision**, and MIMIC itself has changed its mind about it twice — which is a good sign that anyone claiming an obvious answer has not looked closely.

| Approach | Example | Property |
|---|---|---|
| MIMIC-III: typed **and indexed** tags | `[**Known lastname 1234**]` | Informative and stable per entity — **but the index leaks equivalence classes.** You learn which mentions refer to the same person, which is itself information. |
| MIMIC-IV: a single opaque token | `___` | Zero information, zero linkage. Safest available. But it destroys *what kind* of thing was removed, which measurably degrades downstream NLP. |
| Realistic surrogates | "Ramesh Kumar" → "Suresh Patel" | **Camouflage.** A missed real name is indistinguishable from the thousands of fake ones, so a detection failure stops being a disclosure. |

The camouflage property of surrogates is genuinely powerful, and given a 0.967 recall it matters: about 3% of PHI instances survive detection, and surrogates are what stops those survivors standing out.

But surrogates carry an objection that applies to a *hospital* vault and not to a research corpus: **a clinician reading a surrogate-substituted note cannot tell what is real.** If vault data ever informs care — and in a hospital it eventually will — then a system that invents plausible clinical text is a patient-safety hazard, not merely a privacy choice. "Referred by Dr. Suresh Patel of Ganga Hospital" is a fabricated clinical fact sitting in a record that looks authoritative.

**So the Vault does both, and selects by destination.** The replacement mode is a function of who reads the text:

| Destination | Mode | Rationale |
|---|---|---|
| Zones 2–3: internal clinical vault, local inference, anything a clinician may read | **Typed, unindexed tags** — `<NAME>`, `<HOSPITAL>`, `<MRN>` | The reader knows a name was removed *and that it was a name*. Nothing is fabricated, so nothing can be mistaken for a clinical fact. No equivalence-class leak. |
| Zone 4: research-corpus export | **Realistic surrogates**, consistent within a patient, deliberately inconsistent across patients | Camouflage where it matters most. No clinician reads this text, so the safety objection does not apply. |
| Never | **Indexed** tags | Documented anti-pattern — the index is a linkage key you did not mean to publish. |

Dates inside notes are not tagged at all. They are shifted in lockstep with the structured data, so the narrative stays clinically coherent: "readmitted eleven days later" remains true.

### III.6 Indirect identifiers, and an honest limit on formal guarantees

Direct identifiers are the easy half. The mosaic effect lives in the *indirect* ones, and Zone 2 generalises them: pin code to district, date of birth to five-year age band, rare diagnosis codes below a count threshold to their parent category, employer to sector.

The natural next step is to claim a formal privacy guarantee, and here the paper has to be careful, because the honest answer is more limited than the marketing answer.

- **k-anonymity** guarantees each record is indistinguishable from at least *k−1* others on the quasi-identifiers — but says nothing about the sensitive attribute, so a k-anonymous group where all *k* members share a diagnosis leaks it anyway.
- **l-diversity** requires *l* well-represented values of the sensitive attribute per group — but ignores their distribution, so a group that is 99% HIV-positive can still be 2-diverse and fully disclosive.
- **t-closeness** constrains that distribution — and in practice destroys the most utility, because clinical cohorts are *supposed* to have skewed outcomes.
- **Differential privacy** makes an individual's participation deniable regardless of the adversary's side knowledge — but it is a property of a *query mechanism*, not of a released table, and its privacy budget is consumed by every query, which makes it a poor fit for open-ended exploratory clinical research.

All four assume you can cleanly partition columns into quasi-identifiers and sensitive attributes. **Real EHR data cannot be partitioned that way.** A longitudinal sequence of two hundred lab values with timestamps *is* a quasi-identifier. High-dimensional sparse records are provably near-impossible to k-anonymise without destroying their utility.

The decisive evidence: **neither MIMIC nor SAIL claims k-anonymity, l-diversity or differential privacy anywhere in their documentation.** Two of the most scrutinised health data resources in the world, with a combined thirty years of operation, rely instead on governance, access control and output checking.

So the Vault makes a correspondingly scoped claim:

- **k-anonymity with an l-diversity check is enforced as a build-time gate on gold aggregate and cohort marts** — where the quasi-identifier/sensitive partition is real and the guarantee means something. A cell that cannot reach the threshold is quarantined, not published. Recommended starting values: **k ≥ 5, suppress cells below 5** — though these are for your Data Access Committee to set, not for us to standardise.
- **Full longitudinal record sets are not claimed to be k-anonymous.** They are protected by access control, project-scoped keys, and output checking at Zone 4.
- The standard we test against is the UK ICO's **motivated intruder test**: could someone who actively *wants* to re-identify a person from this output succeed, using public records and reasonable effort? That is a red-team exercise, not a checklist, and it is the right bar.

### III.7 Break-glass: how re-identification actually happens

Anonymisation that cannot be reversed by anyone is not a hospital system. It is an archive. Real clinical operations require re-identification: a lab result must reach a named patient, a safety signal must be traced to a real person who needs a phone call, a regulator must be answered.

So the Vault has a re-identification path. It is narrow, and every condition is required:

1. **Role.** The requester holds an explicit `vault.reidentify` permission. Not an admin role that happens to include it — a specific, separately granted capability.
2. **Second factor.** TOTP or, preferably, a hardware WebAuthn key. Password alone never suffices.
3. **Stated purpose**, bound to a ticket, a consent record, or a named legal basis. A free-text box is not a purpose; the purpose must reference an object that exists.
4. **Dual control** for anything beyond a single subject. A second authoriser, different person, approves before keys are released.
5. **Time-boxed session** with a visible countdown. Fifteen minutes, then it closes.
6. **Scoped** to enumerated `subject_id` values. There is no "re-identify all" endpoint. It is not that the endpoint is protected — it is not implemented.

Every request writes an entry to an **append-only, hash-chained audit log** before keys are released. Each entry contains the hash of its predecessor, so altering or deleting any historical entry breaks the chain at every subsequent record and is immediately detectable. The requester cannot edit it, and neither can the database administrator.

One property is worth stating explicitly, because it is a requirement people often forget to specify: **users without the permission cannot see that re-identification is possible at all.** They do not see a greyed-out button, an "access denied" message naming a patient, or a log entry indicating that someone looked. They cannot enumerate who holds the capability. The absence of a capability should not itself leak the shape of the system, because "who can see this record" is metadata about a patient too.

The audit log is visible to the Data Protection Officer and the Data Access Committee. Not to the people generating entries in it.

### III.8 No egress: making the claim structural

Hospitals are routinely asked to accept "your data will not be used for training" as a privacy guarantee. The Vault replaces that promise with five layers that do not require trusting anyone:

1. **Network.** The Vault runs on a segment with default-deny egress. There is no route to the public internet. Not a firewall rule that could be changed by someone with access — no route.
2. **Runtime.** Containers have no outbound DNS resolution. An egress proxy logs and drops anything attempting to leave.
3. **Data plane.** Model weights are pulled *in* once, verified by digest, and then run locally. Inference is a local computation, not a network call.
4. **Credentials.** This is the layer that makes the argument land: **no API key for any external model provider exists anywhere in the Vault environment.** Not in a vault, not in an environment variable, not in a developer's `.env`. You cannot exfiltrate to a service you cannot authenticate to. An attacker who achieves full code execution inside the Vault still has nowhere to send anything.
5. **Verification.** Continuous egress audit, plus canary records — synthetic patients whose distinctive attributes would surface if the corpus ever appeared anywhere it should not.

A necessary clarification, because hospitals in India will immediately raise it: **ABDM exchange is not an exception to this rule.** ABDM's consent-artefact flow is outbound by design, and it should be. The rule is not "no egress" — it is "**no ungoverned egress**". ABDM traffic is a Zone 4 channel: explicitly allowlisted, consent-bound, logged, and carrying only what the consent artefact permits. The distinction the Vault enforces is between traffic that passed through a governed channel and traffic that found its own way out.

---

<div style="margin:2.5em 0;background:#0d0d0b;border-radius:12px;padding:32px 36px;color:#f0ede6;">
  <div style="font-family:'Inter',system-ui,sans-serif;font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#d97757;margin-bottom:10px;">Yajur Labs &middot; Interactive Companion</div>
  <h3 style="font-family:'Inter',system-ui,sans-serif;font-size:1.35rem;font-weight:800;color:#f0ede6;margin:0 0 10px;line-height:1.25;">See the Anonymisation Happen</h3>
  <p style="font-family:'Inter',system-ui,sans-serif;font-size:0.9rem;color:#a8a49c;margin:0 0 20px;line-height:1.6;">The full pipeline on a synthetic patient: the split into the Identity Vault, date shifting with intervals preserved, four replacement modes side by side, a linkage attack you are invited to attempt, and an authorised re-identification with live TOTP and a hash-chained audit log.</p>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;">
    <span style="font-family:'Inter',system-ui,sans-serif;font-size:0.75rem;font-weight:600;padding:4px 11px;border-radius:4px;background:rgba(217,119,87,0.12);color:#d97757;border:1px solid rgba(217,119,87,0.3);">7 Stages</span>
    <span style="font-family:'Inter',system-ui,sans-serif;font-size:0.75rem;font-weight:600;padding:4px 11px;border-radius:4px;background:rgba(217,119,87,0.12);color:#d97757;border:1px solid rgba(217,119,87,0.3);">Real WebCrypto</span>
    <span style="font-family:'Inter',system-ui,sans-serif;font-size:0.75rem;font-weight:600;padding:4px 11px;border-radius:4px;background:rgba(217,119,87,0.12);color:#d97757;border:1px solid rgba(217,119,87,0.3);">Fully Client-Side</span>
    <span style="font-family:'Inter',system-ui,sans-serif;font-size:0.75rem;font-weight:600;padding:4px 11px;border-radius:4px;background:rgba(217,119,87,0.12);color:#d97757;border:1px solid rgba(217,119,87,0.3);">Synthetic Data Only</span>
  </div>
  <a href="/sandbox/health-vault-anonymiser.html" style="display:inline-block;font-family:'Inter',system-ui,sans-serif;font-size:0.875rem;font-weight:700;letter-spacing:0.03em;padding:12px 26px;background:#d97757;color:#fff;border-radius:6px;text-decoration:none;">Open the Health Vault Sandbox &rarr;</a>
</div>

## Part IV — What you actually build

For the engineer. Concrete enough to start from; not a substitute for design review.

### IV.1 The component map

Extending the [lakehouse stack](/2026/03/11/building-a-data-lakehouse-for-your-hospital.html) rather than replacing it:

| Function | Tool | Why |
|---|---|---|
| Object storage | **MinIO** | Already in the stack. Object lock provides Zone 0 WORM. |
| Table format | **Delta Lake** (Tier 1) / **Apache Iceberg** (Tier 3) | Time travel, schema enforcement, ACID between zones. |
| Identity Vault | **PostgreSQL**, separate instance | Small, relational, separately credentialed. Not a schema — an instance. |
| Key management | **OpenBao** | Open-source Vault fork. Sealed storage, Shamir unseal, key rotation, per-project key derivation for ALF_PE. |
| Transformation | **DuckDB + dbt** | Zone promotions as dbt models; disclosure gates as dbt tests. |
| Orchestration | **Prefect** (Tier 1) / **Airflow** (Tier 2+) | Zone promotion is a scheduled pipeline, not a script someone runs. |
| Text de-identification | **`deid`-lineage rules + a local NER model** | Hybrid, union of both annotators, entirely on-premise. |
| Identity & RBAC | **Keycloak** | TOTP/WebAuthn, role mapping, step-up authentication for break-glass. |
| Query | **DuckDB** / **Trino** | Trino is deliberately configured with no catalog for the Identity Vault. |
| Dashboards | **Metabase** / **Superset** | Connected to Zone 3 only. |
| Local inference | **Ollama** / **vLLM** + **pgvector** | Part VII. |

Every component is open source and runs on-premise. Licensing cost remains zero; the Identity Vault and OpenBao are the only genuinely new operational responsibilities.

### IV.2 The split, as schema

The essential shape. Two instances, no link between them:

```sql
-- ============================================================
-- INSTANCE A: identity_vault  (separate host, separate creds,
-- separate network segment, application-layer encryption)
-- ============================================================
CREATE TABLE identity.subject_map (
    subject_id        BIGINT PRIMARY KEY,   -- random, NOT derived from MRN
    mrn_ciphertext    BYTEA NOT NULL,       -- AES-256-GCM, key in OpenBao
    abha_ciphertext   BYTEA,
    name_ciphertext   BYTEA NOT NULL,
    phone_ciphertext  BYTEA,
    address_ciphertext BYTEA,
    date_offset_days  INTEGER NOT NULL,     -- the per-patient date shift
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only, hash-chained. No UPDATE or DELETE grant exists.
CREATE TABLE identity.reidentification_audit (
    entry_id        BIGSERIAL PRIMARY KEY,
    requested_by    TEXT NOT NULL,
    approved_by     TEXT,                   -- dual control
    subject_ids     BIGINT[] NOT NULL,      -- enumerated; never a wildcard
    purpose_ref     TEXT NOT NULL,          -- ticket / consent / legal basis
    mfa_method      TEXT NOT NULL,
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,
    prev_hash       BYTEA NOT NULL,
    entry_hash      BYTEA NOT NULL          -- H(prev_hash || entry fields)
);

-- ============================================================
-- INSTANCE B: lakehouse  (analytics; no credential for Instance A)
-- ============================================================
CREATE TABLE gold.patient (
    subject_id        BIGINT PRIMARY KEY,   -- the only link, and it is opaque
    anchor_age        SMALLINT,             -- top-coded at 91
    sex               TEXT,
    age_band          TEXT,                 -- '55-59'
    district          TEXT,                 -- generalised from pin code
    ralf              BIGINT,               -- household key, no location
    anchor_year       SMALLINT,             -- shifted
    anchor_year_group TEXT                  -- real calendar, ±3 years
);
```

Note what is *absent* from `gold.patient`: no name column that happens to be null, no encrypted MRN, no pin code. The columns do not exist. A future engineer cannot accidentally populate them, and a compromised analytics credential cannot read them.

### IV.3 Zone promotion as tested pipeline

Each promotion is a dbt model with the privacy property expressed as a **test**, so a violation fails the build rather than reaching production:

- `bronze → silver`: date shift applied from `subject_id`'s stored offset; notes pass the de-identification engine; indirect identifiers generalised. *Tests:* no column matches known PHI patterns; every date differs from its Zone 0 counterpart; note text contains no string from the known-identifier dictionary.
- `silver → gold`: aggregate marts built. *Tests:* every published cell has `k ≥ 5`; no equivalence class fails the l-diversity check; suppressed cells are recorded in a suppression log, not silently dropped.

The suppression log matters more than it sounds. If you suppress silently, analysts quietly draw conclusions from data with holes in it and never know. Recording what was suppressed and why turns a privacy control into a documented data-quality caveat.

### IV.4 One thing the structured pipeline will miss

If you ingest imaging, note that **DICOM carries PHI in two entirely separate places**, and a pipeline that handles one will silently pass the other:

- **Header metadata** — `PatientName`, `PatientID`, `PatientBirthDate`, plus private vendor tags that vary by manufacturer and are frequently overlooked.
- **Burned-in pixel data** — the patient's name rendered into the image itself, standard on ultrasound and common on scanned films. No amount of header scrubbing touches it; it requires optical character recognition over the pixels.

India's ICMR guidelines are, as far as I can find, the only domestic instrument that flags this explicitly, and they are worth quoting because the point is so easily missed: *"patient identifiers can be present as 'Metadata' and as 'on-image' data and both need to be effectively anonymized."*

---

## Part V — Whether this is defensible

For the ethics committee, the DPO and the regulator. This section is deliberately more hedged than the rest, because the legal position — particularly in India — is genuinely unsettled, and a concept paper that papers over that is worse than useless.

**Everything below reflects the position as at September 2026 and should be verified against primary sources before it is relied on.**

### V.1 Governance is the control, not the algorithm

The most important finding from studying MIMIC and SAIL is one neither advertises: **neither claims a formal privacy guarantee over its data.** No k-anonymity claim, no differential privacy claim, anywhere in either body of documentation. Two of the most heavily scrutinised health data resources in the world, with a combined thirty years of operation and thousands of published studies between them, rest on governance, access control and output checking.

That should reset expectations. The Vault's technical controls raise the cost of re-identification substantially. They do not reduce it to zero, and the institutions with the best track records do not pretend otherwise. What actually prevents re-identification is that a small number of accountable people decide who gets what data, for what purpose, and check what leaves.

So the Vault requires a **Data Access Committee**, modelled on SAIL's Information Governance Review Panel. Two features of the IGRP are worth copying precisely:

- **Its membership includes members of the public**, drawn from a consumer panel, alongside clinicians, regulators and information-governance professionals. It assesses proposals for "public interest and sensitivity risk", not just legal compliance. A committee composed entirely of the institution's own staff is a rubber stamp with extra steps.
- **It takes about twelve weeks** to decide. That is a feature. Governance that can be completed in an afternoon is not governance.

Around it sits the **Five Safes** framework: safe people (trained, accredited researchers), safe projects (approved purposes), safe settings (analysis inside the environment, not on a laptop), safe data (the zone model above), and safe outputs (disclosure control before anything leaves). The Vault implements the fourth; the other four are organisational and cannot be bought.

### V.2 India: a genuine standards vacuum

This is the section I expect to be most useful, because the commonly repeated version of Indian health-data law is wrong in both directions at once.

**What is actually in force today.** The Digital Personal Data Protection Act 2023 is widely described as India's operative privacy law. Its substantive provisions **are not yet in force**. The commencement notification of 13 November 2025 places sections 3 to 17 — which is to say almost the entire operative Act — in an eighteen-month tranche, commencing around **mid-May 2027**. Rules 6, 7 and 16 of the DPDP Rules 2025 are in the same tranche. What commenced in November 2025 was the definitions, the Data Protection Board's machinery and the government's rule-making powers.

A direct consequence that most compliance advice has not caught up with: **the research exemption at s.17(2)(b) is not currently available.** A hospital cannot rely on it today.

**So what governs health data right now?** The Information Technology (Reasonable Security Practices) Rules, 2011 — the SPDI Rules — remain in force, because the DPDP provision that omits their enabling power (s.44(2)) is itself in the delayed tranche. SPDI Rule 3 expressly classifies "physical, physiological and mental health condition" and "medical records and history" as **sensitive personal data**.

This produces a reversal that every Indian compliance statement must be tensed around:

> **Until mid-May 2027, health data in India is sensitive personal data under the SPDI Rules. From mid-May 2027, under the DPDP Act, there is no sensitive-data category at all** — health data receives no special statutory tier, a deliberate departure from both the SPDI Rules and the withdrawn 2019 Bill.

Claims that the DPDP Act classifies health data as sensitive are common in circulation and are simply incorrect.

**On anonymisation, the position is starker.** The DPDP Act does not define anonymisation, does not exempt anonymised data, and does not empower anyone to set a standard. The 2019 Bill had all three — a scope exclusion at clause 2(B), a definition at clause 3(2), and a standard-setting power vested in the Data Protection Authority. The 2023 Act dropped every one. Anonymised data falls outside the Act only by inference from the definition of personal data at s.2(t), which turns on identifiability.

The DPDP Rules 2025 contain **no occurrence of "anonymisation", "de-identification" or "pseudonymisation"** anywhere. The closest adjacent provision, Rule 6(1)(a), refers to "obfuscation, masking or the use of virtual tokens" — but frames these as *security measures applied to data that remains personal data*, not as a route out of the Act's scope.

**And ABDM?** The operative instrument is the NDHM Health Data Management Policy, finalised December 2020. It defines both terms carefully — Clause 4(a) defines anonymisation as an "irreversible process", borrowing the "means reasonably likely to be used" formulation from GDPR Recital 26; Clause 4(j) defines de-identification as replacement with "fictitious name or code that is unique to a data principal but does not, on its own, directly identify" them, which is pseudonymisation and maps exactly onto the `subject_id`/ALF pattern. Chapter 29 permits sharing anonymised data in aggregated form for research, requires recipients not to re-identify, and places compliance responsibility on the anonymising party.

Then Clause 29.5 says the anonymisation "shall be done in accordance with technical processes and anonymisation protocols **which may be specified by the NHA in consultation with MeitY**."

Those protocols do not appear to exist. That absence has been checked against the ABDM publications catalogue, its full guidelines catalogue, both editions of the HIP/HIU guidelines, and the Health Data Retention Policy — which itself exists only as a 2021 consultation paper that never closed, and which expressly disclaims any standard: *"The process and method of anonymization/pseudonymization may be organization specific."* MeitY's own draft Guidelines on Anonymisation of Data, published August 2022, were withdrawn within about a week and never finalised.

So the honest summary of the Indian position:

> **Three separate instruments promised an anonymisation standard — ABDM Clause 29.5, MeitY's 2022 draft, and the 2019 Bill's Authority power. None delivered one. The DPDP Act then removed the power to make one.** Clause 29.5's obligation has been outstanding since December 2020.

Two further wrinkles worth knowing. ABDM's own definition of sensitive personal data, at Clause 4(ee), is pinned *by reference* to SPDI Rule 3 — the instrument due to lapse in 2027, with no published reconciliation. And the HDM Policy self-describes as "a guidance document"; its sanction is exclusion from the ABDM ecosystem, not a statutory penalty.

**The practical conclusion for a hospital building a vault in India today: there is no domestic technical standard to conform to. So adopt an external one explicitly, in writing, and say which.** We recommend HIPAA's Expert Determination pathway combined with the ICO's motivated-intruder test — not because they bind an Indian hospital, but because a documented conformance to a recognised external standard is a far better answer to a future regulator than silence.

### V.3 The one Indian standard that does exist — and a terminology trap

There is an important exception, and it sits in research ethics rather than data-protection law: the **ICMR National Ethical Guidelines for Biomedical and Health Research (2017)**, whose Section 11 sets out a real taxonomy — anonymous, anonymized (reversible or irreversible), and identifiable. These bind through institutional ethics committees, and they are the only operative Indian guidance a hospital vault can actually conform to today.

Two things follow. First, ICMR requires **ethics committee approval for a consent waiver even for anonymised data** — the researcher does not self-certify. That is a higher bar than anything currently in Indian data-protection law, and it maps neatly onto the Data Access Committee described above.

Second, a trap that will cause real confusion if it is not flagged:

> **ICMR uses "anonymized" as an umbrella term that includes the reversible case** — its "coded or reversibly anonymized" category is data that "could be re-linked if required". Under GDPR and ICO terminology that is **pseudonymised data, which remains personal data.**

An Indian hospital that tells a European collaborator its data is "anonymised per ICMR" may be describing something the collaborator's regulator considers fully identifiable. Never map the two vocabularies without flagging the difference. Almost everything a hospital vault produces is, in GDPR terms, pseudonymised — which is the subject of the next section.

### V.4 Europe: a 2025 judgment that reads like a specification

For hospitals with European collaborators, one recent development matters more than any other.

In *EDPS v SRB* (Case C-413/23 P, 4 September 2025), the Court of Justice held that pseudonymised data is **not automatically personal data for every party that holds it**. From the judgment:

> "pseudonymised data must not be regarded as constituting, in all cases and for every person, personal data … in so far as pseudonymisation may, depending on the circumstances of the case, effectively prevent persons other than the controller from identifying the data subject."

Two cautions on citing this. It was decided under Regulation 2018/1725 rather than the GDPR directly, with the Court bridging the two at paragraph 52. And the approach is **context-dependent, not a flat rule**: whose perspective governs depends on the obligation at issue — data transmitted to a recipient is classified from *that recipient's* position, while the transparency duty is assessed at collection from the *controller's* position. The EDPS won the appeal; the substantive law nonetheless went the other party's way, and the matter was referred back.

What makes it directly relevant is paragraph 77, which sets out the two conditions a recipient must satisfy. Paraphrased: the recipient must not be in a position to lift the pseudonymisation during processing under its control, **and** the measures must in fact prevent attribution "including by recourse to other means of identification such as cross-checking with other factors".

Read that against the architecture in Part III. The first condition is the split: the analytics environment holds no key and no route to the Identity Vault. The second is why generalisation and project-scoped keys exist: to defeat cross-referencing. Paragraph 85 closes the loop by confirming that where a party *does* have means "reasonably allowing them to attribute pseudonymised data to the data subject", it remains personal data for them.

This is as close to an architectural specification as case law gets, and it is worth designing against deliberately. It is also recent and untested on remittal — treat it as a strong indication of direction, not a settled safe harbour.

### V.5 The UK, and a live consultation

The reference standard is the ICO's guidance on anonymisation, pseudonymisation and privacy-enhancing technologies, published 28 March 2025. Two caveats: it is explicitly "not a statutory code", and it carries a notice that it is under review following the Data (Use and Access) Act. The older 2012 code was removed from the ICO's site and superseded in practice, though no formal withdrawal notice appears to have been issued.

The operative concept remains the **motivated intruder test**: would someone who actively wants to re-identify a person from this output succeed, using public records and reasonable effort? That is the standard a hospital vault should actually be tested against — as a periodic red-team exercise with a written result, not a checklist.

One timely note for anyone reading this in autumn 2026: the ICO's draft guidance on **anonymisation and pseudonymisation for research purposes** is out for consultation now and **closes on 19 October 2026**. Any institution building a health data vault has a direct interest in that text and a narrow window to respond to it.

---

## Part VI — What this does not do

The section I would read first.

**Anonymisation is never absolute.** Genomic data is identifying by its nature. Rare diseases identify by their rarity. Long longitudinal trajectories identify by their shape. For these, no de-identification technique is sufficient, and the honest control is access restriction and a Data Access Committee, not a pipeline.

**No formal privacy guarantee is claimed over the record set.** k-anonymity is enforced on aggregate marts only. Full longitudinal records are protected by governance and access control. Neither MIMIC nor SAIL claims more, and any vendor who claims more than MIMIC and SAIL do should be asked to show their working.

**De-identification destroys real clinical signal.** The reference implementation's 0.967 recall came with 0.749 precision: roughly fifteen per cent of what it removes is not PHI at all. Your notes will lose content that mattered. That is the trade, and it belongs in your documentation rather than only in a footnote of someone else's paper.

**Cross-patient temporal comparability is degraded.** The ±3-year `anchor_year_group` band softens this; it does not restore it. Epidemic-curve work is coarsened and wave-level stratification is not possible.

**The Identity Vault is a concentrated risk.** We have not removed the crown jewel — we have made it small, single-purpose and heavily guarded, which is better but not the same as gone. MIMIC is in precisely the same position: it is a pseudonymised-at-source, key-withheld release, not a keyless anonymisation, and the look-up tables still exist somewhere. Anyone claiming to have destroyed the mapping entirely has either built an archive nobody can use clinically, or is not being straight with you.

**And the strongest objection, which deserves a direct answer.** ABDM is deliberately **federated**: records stay with the originating facility, and the consent manager brokers access between providers and users precisely so that no national clinical data lake is ever created. A hospital vault *is* a local lake. It therefore takes on exactly the concentration risk that ABDM's architecture was designed to avoid, and it would be dishonest to present this design without acknowledging that it cuts against the grain of the national architecture.

The answer is narrower than a rebuttal. The data is already in the hospital — in the HIS, the LIMS, the PACS, and in the reporting database that three people have direct credentials to. The Vault does not change *whether* a local concentration exists. It changes whether that concentration is governed, split, keyed, audited and egress-controlled, or whether it is a flat database with a shared password. The realistic alternative to a governed lake is not the absence of a lake. It is the ungoverned one that is already there.

That argument holds for a single institution. It does **not** extend to aggregating multiple hospitals' vaults into a regional one — at that point the concentration objection becomes correct, and the answer is federated analytics, where queries travel to the data rather than data travelling to a centre.

---

## Part VII — Local inference, and what comes next

The Vault's purpose is not storage. It is to make the data *usable* — including by models — without any of it leaving.

**Phase 1 (weeks 1–12): the Vault.** The five zones, the split, the Identity Vault, break-glass, the Data Access Committee. At the end of it your analysts work freely against Zone 3 and every extract has a documented provenance.

**Phase 2: local inference.** Open-weight models served on-premise with **Ollama** or **vLLM**, embeddings computed locally, retrieval over **pgvector**. Two tiers:

- **Gold-tier inference** — the default. The model reads anonymised Zone 3 data. Outputs are safe by construction, because the inputs contained no identity.
- **Sealed clinical inference** — for point-of-care use, a model reads identified Zone 1 data *inside* the boundary, but its outputs pass back through the same de-identification gate before being stored or displayed outside the clinical context. Higher access tier, fully audited.

The architectural point is that both tiers are local computations. There is no configuration of the Vault in which a clinical note becomes an outbound HTTPS request, because the credential that would authenticate such a request does not exist anywhere in the environment.

This connects directly to the [clinical reasoning pipelines](/2025/07/09/smarter-ai-demands-smarter-context-how-yajur-healthcare-is-re-architecting-clinical-reasoning-pipelines.html) and the [task framework for agentic healthcare workflows](/2025/03/19/a-task-framework-for-healthcare-for-enabling-ai-agentic-workflows-in-ehr-systems.html) described previously: an agent that plans over clinical data needs that data to be reachable and governed. The Vault is what makes an agentic workflow something a hospital board can approve.

**Phase 3: federated analytics.** Once several hospitals each run a vault, the question becomes multi-site research without pooling. The answer is to send the query to the data — each site computes locally and returns only aggregates that pass its own disclosure control. That is the direction that does not reintroduce the concentration risk Part VI identified, and it is where this work goes next.

---

### Try it

Reading about anonymisation is a poor substitute for watching it happen. The [Health Vault anonymisation sandbox](/sandbox/health-vault-anonymiser.html) runs the entire pipeline in your browser on a synthetic patient: the split into the Identity Vault, date shifting with intervals preserved, the four replacement modes for clinical notes side by side, a k-anonymity meter, and a linkage attack you are invited to attempt and watch fail. Then it steps through an authorised re-identification — role check, live TOTP, dual control, real decryption, hash-chained audit entry — and shows you what a user without the permission sees, which is nothing at all.

It uses real cryptography on synthetic data, runs entirely client-side, and sends nothing anywhere. Which is, after all, the point.

---

### References

**MIMIC**
- Johnson AEW, Bulgarelli L, Shen L, et al. MIMIC-IV, a freely accessible electronic health record dataset. *Scientific Data* 2023. [physionet.org/content/mimiciv/](https://physionet.org/content/mimiciv/)
- Johnson AEW, Pollard TJ, Shen L, et al. MIMIC-III, a freely accessible critical care database. *Scientific Data* 2016;3:160035.
- Neamatullah I, Douglass M, Lehman L-WH, et al. Automated de-identification of free-text medical records. *BMC Med Inform Decis Mak* 2008;8:32.
- MIMIC-IV documentation: [mimic.mit.edu/docs/iv/](https://mimic.mit.edu/docs/iv/)

**SAIL Databank**
- Ford DV, Jones KH, Verplancke J-P, et al. The SAIL Databank: building a national architecture for e-health research and evaluation. *BMC Health Serv Res* 2009;9:157.
- Lyons RA, Jones KH, John G, et al. The SAIL databank: linking multiple health and social care datasets. *BMC Med Inform Decis Mak* 2009;9:3.
- [saildatabank.com](https://saildatabank.com/)

**Regulation and guidance**
- Digital Personal Data Protection Act, 2023 (India); DPDP Rules, 2025, notified 13 November 2025.
- Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
- National Digital Health Mission, Health Data Management Policy, December 2020.
- ICMR, National Ethical Guidelines for Biomedical and Health Research Involving Human Participants, 2017, §11; Ethical Guidelines for Application of AI in Biomedical Research and Healthcare, 2023.
- ICO, Anonymisation, pseudonymisation and privacy enhancing technologies guidance, 28 March 2025. Draft guidance on anonymisation and pseudonymisation for research purposes — consultation closes 19 October 2026.
- Case C-413/23 P, *EDPS v SRB*, CJEU (First Chamber), 4 September 2025, ECLI:EU:C:2025:645.
- 45 CFR §164.514(b), HIPAA Safe Harbor and Expert Determination.

**Privacy models**
- Sweeney L. k-anonymity: a model for protecting privacy. *Int J Uncertain Fuzz* 2002;10(5):557–570.
- Machanavajjhala A, Kifer D, Gehrke J, Venkitasubramaniam M. l-diversity. *ACM TKDD* 2007;1(1).
- Li N, Li T, Venkatasubramanian S. t-closeness. *IEEE ICDE* 2007.
- Dwork C, McSherry F, Nissim K, Smith A. Calibrating noise to sensitivity in private data analysis. *TCC* 2006.

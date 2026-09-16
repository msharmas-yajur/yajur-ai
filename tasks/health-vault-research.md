# De-identification in Practice: MIMIC and SAIL — reference notes

Scope note: everything below is from primary sources (official docs, policy PDFs, regulation text) unless marked. Items I could **not** verify are flagged `[UNVERIFIED]`. A background agent researching the India/GDPR material had not returned by the time I finished; I researched Part C from primary sources myself, so it is covered, but the India section is deliberately hedged where the sources are thin.

---

## PART A — MIMIC (MIMIC-III, MIMIC-IV; Beth Israel Deaconess Medical Center / MIT-LCP / PhysioNet)

### A.0 Framing
MIMIC is a **one-shot, versioned public release** of a de-identified EHR extract from a single hospital (BIDMC, Boston). De-identification is done **once, upstream**, and the resulting artefact is downloadable. There is no re-identification key retained for researchers, and no query-time control.

- MIMIC-III v1.4: 53,423 distinct adult ICU admissions, 38,597 adult patients (16+), plus 7,870 neonates; admissions 2001–2012; median age 65.8; in-hospital mortality 11.5%. ([Sci Data 2016, PMC4878278](https://pmc.ncbi.nlm.nih.gov/articles/PMC4878278/))
- MIMIC-IV v3.1: **364,627 unique patients, 546,028 hospitalisations, 94,458 ICU stays**, admissions **2008–2022**; two source systems — a custom hospital-wide EHR plus MetaVision (iMDSoft) for the ICU. ([physionet.org/content/mimiciv/3.1/](https://physionet.org/content/mimiciv/3.1/))
- Legal basis: IRB approval from **BIDMC (IRB No. 2001-P-001699/14)** and **MIT (IRB No. 0403000206)**; "Requirement for individual patient consent was waived because the project did not impact clinical care and all protected health information was deidentified." ([Sci Data 2016](https://www.nature.com/articles/sdata201635); restated on [MIMIC-IV demo](https://physionet.org/content/mimic-iv-demo/2.2/))

### A.1 Identifier scheme

| Identifier | Grain | Generation |
|---|---|---|
| `subject_id` | one per unique patient | random cipher / look-up table → deidentified **integer** |
| `hadm_id` | one per hospital admission | random cipher / look-up table → deidentified **integer** |
| `stay_id` (MIMIC-IV) / `icustay_id` (MIMIC-III) | one per ICU stay ("reasonably contiguous episodes of care"; ward stays within 24h are grouped) | random cipher → integer |
| `transfer_id` (MIMIC-IV) | one per unique ward stay | deidentified integer |

Official wording (MIMIC-IV, [physionet 3.1](https://physionet.org/content/mimiciv/3.1/)):
> "Patient identifiers as stipulated by HIPAA were removed. Patient identifiers were replaced using a random cipher, resulting in deidentified integer identifiers for patients, hospitalizations, and ICU stays."

> "Look-up tables were used to randomly assign patients with a unique identifier (`subject_id`) and hospitalizations with a unique identifier (`hadm_id`)."

Pipeline is described as three steps: **acquisition → preparation** ("denormalization of tables, removal of audit trails") **→ deidentification**.

**Mapping back to real MRNs:** the cipher/look-up tables are held by the MIT-LCP/BIDMC data team, not released. They are not part of the public artefact and are not disclosed to researchers. I could **not** find an official statement of the retention policy or key-custody arrangement for those look-up tables — `[UNVERIFIED]`. Practically: MIMIC is a **pseudonymised-at-source, key-withheld** release, not a keyless anonymisation.

Note the identifiers are *sequential/random integers*, not hashes of the MRN — so there is no dictionary-attack surface against the identifier itself.

### A.2 Date shifting

**Mechanism (both versions):** a **single, patient-level offset measured in whole days**, applied to every date/time for that `subject_id`.

> "Date and times were shifted randomly into the future using an offset measured in days. A single date shift was assigned to each `subject_id`." ([MIMIC-IV](https://physionet.org/content/mimiciv/3.1/))

> "All dates in the database have been shifted to protect patient confidentiality. Dates will be internally consistent for the same patient, but randomly distributed in the future." ([MIMIC-IV concepts](https://mimic.mit.edu/docs/iv/about/concepts.html))

**Preserved (invariants):**
- Exact intra-patient intervals: "If the time between two measures in the database was 4 hours in the raw data, then the calculated time difference in MIMIC-IV will also be 4 hours."
- **Time of day**, **day of week**, **seasonality** — MIMIC-III paper: the process conserved "time of day, day of the week, and approximate seasonality." The MIMIC-II user guide is explicit: "the day of the week and season of the year were preserved." (Consequence: the offset is a whole number of days and, for day-of-week preservation, must be a **multiple of 7** — MIMIC-II states the preservation, not the arithmetic, so treat the multiple-of-7 inference as mine, not quoted.)

**Destroyed:**
- Absolute calendar time. Shifted years land in **2100–2200**.
- **Cross-patient temporal comparability**: "Distinct patients are not temporally comparable. That is, two patients admitted in 2130 were not necessarily admitted in the same year."
- Therefore: no epidemic/seasonal-year analysis, no practice-change-over-time studies, no COVID-wave stratification, unless you use the anchor mechanism below. MIMIC-II guide: longitudinal studies of care practice change "cannot rely on fully de-identified data."

**MIMIC-IV's `anchor_*` compromise** ([patients table](https://mimic.mit.edu/docs/iv/modules/hosp/patients.html)) — this is the single most reusable design idea for a hospital vault:
- `anchor_year` — "a shifted year for the patient."
- `anchor_year_group` — "a range of years - the patient's `anchor_year` occurred during this range." A **three-year band** (e.g. `2008 - 2010`). In v2.x the bands span 2008–2019; v3.1 extends to 2022.
- `anchor_age` — "the patient's age in the `anchor_year`."
- Worked example from the docs: `anchor_year` 2153, `anchor_year_group` 2008–2010, `anchor_age` 60 → the patient was 60 during 2008–2010; their shifted year 2154 maps to 2009–2011, 2155 → 2010–2012, etc.

So MIMIC-IV gives back **coarse real-world calendar time (±3-year band)** while keeping per-patient day-level shifts. MIMIC-III has no equivalent — real calendar time is entirely destroyed there.

Changelog detail worth noting: in MIMIC-IV v0.2 the columns were renamed specifically to obscure time — `anchor_year` → `anchor_year_group` and `anchor_year_shifted` → `anchor_year`. A "date/time alignment issue" in shifted dates was fixed in v0.3. ([changelog](https://mimic.mit.edu/docs/iv/about/changelog))

### A.3 Patients over 89 — two *different* treatments

| Release | Treatment |
|---|---|
| **MIMIC-II** | "a patient who is over 89 at the time of his/her first admission [has DOB set so he/she appears] to be 200 years old at the time of his/her first admission"; patients aged 90+ during admission otherwise excluded ([archive user guide](https://archive.physionet.org/mimic2/UserGuide/node14.html)) |
| **MIMIC-III** | "patients who are older than 89 years old at any time in the database have had their date of birth shifted"; specifically **"The date of birth was then set to exactly 300 years before their first admission."** These patients therefore "appear in the database with ages of over 300 years." The docs report the **median real age of this shifted group is 91.4 years**. ([MIMIC-III patients table](https://mimic.mit.edu/docs/iii/tables/patients.html), [physionet mimiciii/1.4](https://physionet.org/content/mimiciii/1.4/)) |
| **MIMIC-IV** | Cleaner: **"If a patient's `anchor_age` is over 89 in the `anchor_year` then their `anchor_age` is set to 91, regardless of how old they actually were."** There is no `dob` column at all — age is carried only as `anchor_age`. |

This is the HIPAA Safe Harbor §164.514(b)(2)(i)(C) 90+ aggregation rule, implemented two ways. MIMIC-III's "300 years old" is a sentinel that researchers must detect and recode; MIMIC-IV's `anchor_age = 91` is a top-coded value. **MIMIC-IV's approach is the better pattern** — top-coding beats sentinel-encoding because it can't be silently mis-analysed as a real age.

### A.4 Free-text de-identification

**MIMIC-II / MIMIC-III: the `deid` package (Neamatullah et al. 2008).**
- Citation: Neamatullah I, Douglass M, Lehman L-WH, Reisner A, Villarroel M, Long WJ, Szolovits P, Moody GB, Mark RG, Clifford GD. "Automated de-identification of free-text medical records." *BMC Med Inform Decis Mak* 2008;8:32. ([PMC2526997](https://pmc.ncbi.nlm.nih.gov/articles/PMC2526997/); software: [physionet.org/content/deid/1.1/](https://physionet.org/content/deid/1.1/))
- **Architecture:** Perl, rule-based. Three mechanisms: (1) **lexical dictionary look-up** against known-PHI tables (patient and clinician names pulled from the source DB itself), (2) **regular expressions** for numeric patterns (dates, phone, SSN, MRN), (3) **context heuristics** — name indicators ("Mr.", "Dr.", "daughter", "son") and location indicators ("Hospital", "Street"). Four dictionary classes: known PHI, potential PHI (generic names/locations), PHI-indicator keywords, and a **non-PHI allow-list** of common words / UMLS clinical terms (this is what stops "Parkinson" or "Bell" being scrubbed).
- **PHI categories:** the 18 HIPAA categories, **plus** deliberate over-coverage — the paper states it also removes "ethnicity references, common holidays, clinical provider identifiers, and year-only dates." MIMIC-II guide adds "care-giver and hospital identifiers."
- **Performance (gold-standard corpus: 2,434 nursing notes, ~334,000 words):** **recall 0.967, precision 0.749, fallout 0.002** (TP 1,720; FP 546; FN 59). On a separate test corpus (1,836 notes, ~296,400 words): estimated recall 0.943; ~27 false negatives per 100,000 words; **zero patient names missed**.
- **Design bias:** heavily recall-over-precision. ~15% of detected PHI instances are false positives, i.e. a lot of clinically useful text is destroyed as collateral. This is the explicit trade.

**Surrogate generation — this is the part people get wrong.** Two distinct behaviours exist:

1. **The `deid` package *can* emit realistic surrogates.** Its own documentation says it removes PHI and replaces it "by realistic surrogate PHI" — "names are replaced by fictitious names, medical record numbers by fictitious medical record numbers, dates by fictitious dates, geographic locations by other geographic locations."
2. **MIMIC-III as shipped does NOT use realistic surrogates. It uses bracketed category tags.** The paper's own output format is category tags in `[** ... **]` notation — e.g. `[**Name**]`, `[**Location**]`, `[**Age over 89**]`; for names the tag is granular, "indicating whether the PHI is a full name, a female/male first name, a last name, and/or a name initial." In the released MIMIC-III `NOTEEVENTS.TEXT` the convention carries a **numeric surrogate index** inside the tag, e.g. `[**Hospital1 18**]`, `[**Known lastname 1234**]`, `[**2101-10-20**]`, so the same underlying entity gets a stable pseudonym across notes. **The exact grammar of these tags is not documented in the official MIMIC-III table docs or the `deid` README — I verified the `[** ... **]` form and `[**Hospital1 18**]`-style examples only from secondary sources and the paper's figure caption, so treat the precise token vocabulary as `[UNVERIFIED]` at the level of an official spec.**
   - Dates in notes are **not** tagged away — they are **shifted consistently with the structured data**: "each date is shifted by a patient-specific random number of days that is consistent for the patient throughout all his or her de-identified medical files", preserving day-of-week and season.

3. **MIMIC-IV abandoned surrogates entirely.** MIMIC-IV-Note v2.2 and MIMIC-IV structured free-text fields replace **every** PHI instance with **exactly three underscores `___`**.
   - MIMIC-IV-Note: **331,794 discharge summaries** (145,915 patients) and **2,321,355 radiology reports** (237,427 patients). Method: "custom rule-based approach combined with a neural network trained for deidentification", annotations from both merged (union). Reported **sensitivity 99.9% for radiology reports**; manual review of discharge summaries found no PHI. ([physionet.org/content/mimic-iv-note/2.2/](https://physionet.org/content/mimic-iv-note/2.2/))
   - Changelog v0.2 on lab comments: "PHI is replaced with three underscores (`___`). If an entire comment is `___`, then the entire comment was scrubbed."

**Design lesson for a vault:** MIMIC moved from *typed, indexed placeholders* (`[**Known lastname 1234**]`, informative + linkable) to a *single opaque token* (`___`, zero information, zero linkage). The `___` choice is safer but destroys the ability to know *what kind* of thing was removed — a real cost for NLP. If you build a vault, typed-but-unindexed tags (`<NAME>`, `<DATE>`, `<MRN>`) are the middle ground; indexed tags leak equivalence classes.

### A.5 Structured-table treatment

**Dropped entirely** (never present in any MIMIC release): names, addresses, ZIP/postcode, telephone/fax, SSN, MRN, email, URLs, IP, device serials, photographs, biometrics. There is **no geographic column below "hospital" level anywhere in MIMIC-III or MIMIC-IV** — I checked the admissions tables in both; the only location-like fields are `admission_location` / `discharge_location`, which are *care-setting* categories, not places.

**Generalised / filtered:**
- "Structured data were filtered using **look up tables and allow lists**. If necessary, a free-text deidentification algorithm was applied to remove PHI from free-text." — the allow-list approach means any free-text-ish structured field (lab comments, order comments) is scrubbed to `___` unless the value matches a permitted vocabulary.
- Admission/discharge location codes were **collapsed**: "internal hospital `ibax` codes … aren't provided in MIMIC-IV" and "during de-identification multiple internal codes may be combined into a single `admission_location` or `discharge_location`."

**Retained demographics** (MIMIC-III `ADMISSIONS`): `ETHNICITY`, `LANGUAGE`, `RELIGION`, `MARITAL_STATUS`, `INSURANCE` — sourced from the ADT feed. MIMIC-IV `admissions` retains `race`, `language`, `marital_status`, `insurance` (note: `ETHNICITY` was renamed `race`; `RELIGION` was dropped in MIMIC-IV). These are quasi-identifiers and are **not** generalised — a genuine residual risk that MIMIC accepts because access is controlled.

**Provider / caregiver identifiers:**
- MIMIC-III: `CAREGIVERS` table with `CGID` (integer surrogate), `LABEL` (RN, MD, PharmD…), `DESCRIPTION` (17 unique values). The docs do **not** describe how CGIDs were derived, and warn that caregivers sharing a name across roles may have been incorrectly merged. `[UNVERIFIED]` whether CGID is random or sequential.
- MIMIC-IV **v2.2 (6 Jan 2023)** added two new tables:
  - `icu.caregiver` — "Contains one column: `caregiver_id`, a **deidentified integer** which uniquely represents a single caregiver or provider." Added to `chartevents`, `datetimeevents`, `ingredientevents`, `inputevents`, `outputevents`, `procedureevents`.
  - `hosp.provider` — "Contains one column: `provider_id`, a **deidentified string** which uniquely represents a single caregiver or provider." Referenced by prefixed columns: `admit_provider_id` (admissions, `VARCHAR(10)`, described as an "anonymous provider identifier"), `enter_provider_id` (emar), `order_provider_id` (labevents, microbiologyevents, poe, prescriptions).
  - Convention: **any column with the suffix `_provider_id` joins to `provider`**, with the prefix giving the role context.
  - The docs say "deidentified string" — they do **not** say it is a salted hash of the real provider ID. `[UNVERIFIED]` whether hashing or a random cipher was used.

**Dates of birth:** MIMIC-III keeps `DOB`/`DOD`/`DOD_HOSP`/`DOD_SSN` as shifted timestamps (DOD from hospital system + Social Security death master file). MIMIC-IV **removed `dob` entirely**, keeping only `anchor_age` + `dod` ("de-identified date of death … from the hospital information system and the Massachusetts State Registry of Vital Records and Statistics"), with mortality censored one year post-discharge.

### A.6 Access control

Three steps ([mimic.mit.edu/docs/faq/how-to-get-access.html](https://mimic.mit.edu/docs/faq/how-to-get-access.html)):

1. **PhysioNet credentialing.** Create an account; state institutional affiliation; submit a **reference** — students and postdocs must give their supervisor's name and contact (cannot self-reference); complete required human-subjects training. Review takes **1–2 weeks**.
2. **CITI training.** Specifically the CITI Program course **"Data or Specimens Only Research"**, with the **"Conflicts of Interest"** module; register under the affiliation **"Massachusetts Institute of Technology Affiliates"**; upload the **CITI Completion *Report***, not the certificate. ([physionet.org/about/citi-course/](https://physionet.org/about/citi-course/))
3. **Sign the per-dataset DUA** (PhysioNet Credentialed Health Data Use Agreement). Key clauses, verbatim ([view-dua](https://physionet.org/content/mimiciv/view-dua/3.1/)):
   - "I will not attempt to identify any individual or institution referenced in PhysioNet restricted data."
   - "I will not share access to PhysioNet restricted data with anyone else."
   - "I will exercise all reasonable and prudent care to maintain the physical and electronic security of PhysioNet restricted data."
   - "If I find information within PhysioNet restricted data that I believe might permit identification of any individual or institution, I will report the location of this information promptly by email to PHI-report@physionet.org."
   - **LLM/third-party services:** PhysioNet issued separate guidance that the DUA's no-sharing clause "prohibits sharing access to the data with third parties, including sending it through APIs or using it on online platforms"; "MIMIC data must not be stored or retained by third-party LLM services", with locally-deployed LLMs recommended. ([physionet.org/news/post/llm-responsible-use/](https://physionet.org/news/post/llm-responsible-use/))

**Tiering:** a **MIMIC-IV demo** (first 100 `subject_id` satisfying the `anchor_year_group` criteria) is released **fully open** under **ODbL v1.0**, no credentialing. ([physionet.org/content/mimic-iv-demo/2.2/](https://physionet.org/content/mimic-iv-demo/2.2/)) A useful pattern: an open "shape of the data" tier for feasibility work, gated tiers for real analysis.

---

## PART B — SAIL Databank (Swansea University, Wales)

### B.0 Framing
SAIL is the opposite philosophy: a **persistent, national-scale, linkable Trusted Research Environment**. Nothing is released; researchers go to the data. Population of Wales, longitudinal, **records of over 5 million people**; "billions of records"; **over 1,200 registered data users**; approximately **30 new projects each year**. ([Profile paper, PMC8142954](https://pmc.ncbi.nlm.nih.gov/articles/PMC8142954/))

Key papers: Ford DV et al., "The SAIL Databank: building a national architecture for e-health research and evaluation", *BMC Health Serv Res* 2009;9:157 ([PMC2744675](https://pmc.ncbi.nlm.nih.gov/articles/PMC2744675/)); Lyons RA et al., "The SAIL databank: linking multiple health and social care datasets", *BMC Med Inform Decis Mak* 2009;9:3 ([PMC2648953](https://pmc.ncbi.nlm.nih.gov/articles/PMC2648953/)); Jones KH et al., *J Biomed Inform* 2014 (SAIL Gateway case study, [PubMed 24440148](https://pubmed.ncbi.nlm.nih.gov/24440148/)).

### B.1 Split-file / two-party architecture

The data provider (DPO — data providing organisation) does the split **at source**:

> "The DPO then sorts their data into two distinct categories: demographic data and clinical data" — producing "two distinct data files each carrying the common key."

- **File 1 — demographics** (name, address/postcode, DOB, gender, NHS number) → goes to the **trusted third party**. In the 2009 papers this was **Health Solutions Wales (HSW)**; it later became **NHS Wales Informatics Service (NWIS)**, and is now **Digital Health and Care Wales (DHCW)**. (Same role, three names across two decades — worth getting right in a citation.)
- **File 2 — clinical/event content** → goes **directly to SAIL** (HIRU, Health Information Research Unit, Swansea University Medical School).
- Ford 2009: the design ensures "that no one party other than the DPO itself ever has access to both."

**Why neither party can re-identify alone:**
- The TTP (DHCW) sees identifiers but **never sees clinical content**.
- SAIL sees clinical content but **never sees identifiers** — only the encrypted linking field plus a deliberately coarsened demographic residue: "Only the ALFs with some minimal demographic data (including **gender, week of birth and area of residence to 1500 head of population**) are sent to SAIL for recombination with the content data."
- SAIL FAQ: SAIL "does not receive or handle identifiable data" and "cannot reconstruct the identifiable datasets"; "the commonly-recognised identifying details are removed before datasets come to SAIL Databank."

Note the deliberate generalisation built into the residue: **week** of birth (not date), residence to an **area of ~1,500 population** (roughly a UK LSOA), sex. That is a designed k-anonymity floor, not an accident.

### B.2 The Anonymous Linking Field (ALF)

**Generation, in order:**
1. DHCW/HSW receives the demographic file. It runs **MACRAL** — *Matching Algorithm for Consistent Results in Anonymised Linkage* — over **five variables: forename, surname, postcode, date of birth, gender**, plus NHS number validation where present. Matching is **both deterministic and probabilistic**: deterministic on a valid NHS number where available, probabilistic (weighted, scored) on the five demographics otherwise. Lyons 2009 reports match rates: **GP dataset 99.999%, PEDW (inpatient) 99.32%, PARIS social services 95.16%.**
2. The matched individual is assigned a **consistent encryption** of the NHS number to produce the **ALF**. Ford 2009: "Consistent encryption … generates a result referred to as the Anonymous Linking Field (ALF). This becomes the individual's unique anonymous identifier." Encryption uses "a method based on the **Blowfish** algorithm." Lyons 2009 describes it as "a unique 10-digit number assigned to each individual."
3. **SAIL re-encrypts on receipt → ALF_E.** "We re-encrypt the ALFs following their receipt from NWIS, so that it is not possible for either a SAIL researcher or someone working for NWIS to use SAIL data to reverse the process to reveal NHS numbers." Linkage across datasets inside SAIL is done on **ALF_E**.
4. **Project-specific encryption → ALF_PE.** Before data is provisioned to an approved project it is encrypted **again with a project-specific key**: "project-specific encryption of the ALF-E to prevent cross-linkage where data users are involved in multiple projects." So a researcher on two projects **cannot join their two datasets**.
5. **RALF** — Residential Anonymous Linking Field — the same treatment applied to addresses, so researchers "can associate individuals within the same home, and carry out health geographic studies without knowing the actual location."

This is a genuinely three-layer key hierarchy: `NHS number → ALF (TTP key) → ALF_E (SAIL key) → ALF_PE (project key)`. Each layer removes a distinct attack: layer 1 removes the national identifier, layer 2 removes TTP collusion, layer 3 removes cross-project mosaic attacks.

### B.3 IGRP, SeRP/Gateway, Five Safes, and output checking

**IGRP — Information Governance Review Panel.**
- "The Information Governance Review Panel (IGRP) provides independent guidance and advice on Information Governance policies, procedures and processes for SAIL Databank." "All proposals to use SAIL Databank data are subject to review by the independent IGRP"; "before any data can be accessed, approval must be given by the independent IGRP." ([saildatabank.com governance/information-governance](https://saildatabank.com/governance/approvals-public-engagement/information-governance/))
- **Composition:** representatives of professional bodies (Public Health Wales), regulatory bodies (Research Ethics Service), Welsh Government, the British Medical Association, Digital Health and Care Wales, Swansea Bay University Health Board, **and members of the public drawn from the SAIL Consumer Panel**. It assesses "the suitability of each proposal in terms of **public interest and sensitivity risk**."
- **Process/timeline:** scoping discussion → signed scoping document → online IGRP application → **decision at around 12 weeks** → additional data-owner approvals (Welsh Government, Research Accreditation Panel) if needed → Data Deposit Agreement if uploading external data → SAIL Gateway account. Researchers must complete **Safe Researcher Training** (or evidence equivalent) before project start. ([apply-to-work-with-the-data](https://saildatabank.com/data/apply-to-work-with-the-data/))

**Safe haven / SeRP.** Access is via the **SAIL Gateway**, a "privacy-protecting safe-haven and remote access system"; the platform is the **UK Secure Research Platform (UKSeRP)**, controlled by the **National Research Data Appliance (NRDA)** which orchestrates "dataset management, access control, infrastructure management and governance model implementation." SAIL is **ISO/IEC 27001 certified** (ISMS externally certified December 2015) and **accredited by the UK Statistics Authority** as a **Digital Economy Act 2017 (Part 5)** accredited processing environment.

**Five Safes.** SAIL operates as a TRE on the Five Safes model (devised by Felix Ritchie, ONS, ~2003 — canonical definitions at [fivesafes.org](https://fivesafes.org/)):
- Safe projects — "is this use of data appropriate, lawful, ethical and sensible?" → **IGRP**
- Safe people — "can the user/s be trusted to use the data in an appropriate manner?" → **Safe Researcher Training + named accounts**
- Safe data — "is there a disclosure risk in the data itself?" → **split file, ALF_PE, coarse demographics**
- Safe settings — "does the access facility limit unauthorised use or mistakes?" → **SAIL Gateway / UKSeRP, no data egress**
- Safe outputs — "are the statistical results non-disclosive?" → **output review**
(Note: the Five Safes vocabulary is not used on SAIL's own information-governance page; it appears in SAIL's Safe Researcher Training material and in the wider UK TRE literature.)

**Output checking — the concrete rules.** From **SAIL-POL-024 Output Review Policy**, which I extracted directly from the PDFs:

*Current — v1.7, dated 06/06/2025* ([PDF](https://saildatabank.com/wp-content/uploads/2025/06/SAIL-SAIL-POL-024-Output-Policy-v1.7.pdf)):
- **"Cells shall not contain a value of less than 10."** Changed at v1.7 — the document history records "change of minimum count number".
- *Previously* — **v1.2 (2020/2022): "Cells shall not contain a value less than 5."** ([v1.2 PDF](https://saildatabank.com/wp-content/uploads/2022/08/SAIL-POL-024-Output-Review-Policy-v1.2-3.pdf)). **This threshold moved from <5 to <10 in June 2025** — cite the version, not just "SAIL uses a small-number rule."
- **Residual/derived disclosure:** "Cases where a count or difference of <10 may be derived are also disallowed. For example, if a table reports only one value less than ten, as well as a total, the exact value can be derived with trivial effort." Derivation across multiple tables, rates or percentages is likewise disallowed. Outputs may be **rejected outright** if there are so many related tables that a reviewer cannot practically check every combination.
- **Totals are mandatory:** "Each output request must include all relevant totals and denominators to enable reviewers to perform consistency checks and verify small counts. Requests submitted without these totals may be rejected."
- **No individual-level data out, ever:** "No individual-level person-based results are allowed out of the SAIL Databank TRE for anonymised research studies. This is true even if the results can be shown to be non-disclosive."
- **No intermediate data out:** "Outputs that consist of data in a form other than results suitable for review or publication (such as intermediate processed data for further processing outside of SAIL) will not be allowed, even if they otherwise meet the requirement for a safe output."
- **Zeros:** "Reporting a count of zero is disallowed when, in combination with other reported information, it has the potential to disclose something meaningful about an individual or group of individuals" (class disclosure).
- **Minima/maxima disallowed** where outliers plausibly relate to a single individual, "even if the exact number is not actually reported."
- **Graphics treated as numbers:** "Where an exact number can be derived from a visualisation, the small number rule and other rules will be applied as if it were a reported number." **Vector formats (.svg) are called out** as containing "very high-precision information" from which small numbers may be derivable. **Scatter plots and box-and-whisker plots showing individual outlier points are typically disallowed** (including residual plots). **Kaplan–Meier curves:** censoring lines must be excluded; "Any step in the curve must also represent 10 or more individuals"; every KM plot must be accompanied by a risk/contingency table.
- **No organisational performance tracking:** "The data sharing agreements with data providers to SAIL prohibit the use of SAIL for the performance management of identifiable organisations, and this restriction is enforced through the output review process." Provider- or area-level outcome comparisons only if explicitly approved in the IGRP application.
- **"Simple request" fast path** (Appendix 1): raster images only (.png/.jpeg), single-sheet .xlsx, **"All counts are rounded to the nearest multiple of 5 (with no counts <10), and all statistics are based on rounded counts."** Turnaround target **five days** (not guaranteed).
- **Philosophy:** "SAIL operates a **principles-based** output review service (Ritchie & Elliot, 2015). Rather than having hard rules, we use a set of rules of thumb and rely on trained and experienced reviewers applying these rules of thumb and their judgment." Reference standard is the **Handbook on Statistical Disclosure Control for Outputs v1.0 (Griffiths et al., 2019)**.
- **Legal self-positioning:** "SAIL's legal basis for operation is a judgment that our safeguards and processes ensure the anonymity of the data. If we are found to release potentially disclosive results (even if no individual is actually identified), we may be in breach of the law." The policy explicitly works to the **ICO 'Anonymisation: managing data protection risk code of practice'** standard so that "Data that is adequately anonymised … is not personal data and falls outside the remit of the GDPR and UK DPA 2018." (Note: the v1.7 policy still cites the **2012** ICO code — superseded by the ICO's March 2025 guidance; see Part C.)

### B.4 Is re-identification possible, and by whom?

- **SAIL itself: no.** It never holds the identifier↔ALF mapping and holds only week-of-birth / sex / ~1,500-population area as demographics. SAIL: it "cannot reconstruct the identifiable datasets."
- **The TTP (DHCW) alone: no clinical data**, so it can identify people but learns nothing about them from SAIL.
- **The two colluding:** the ALF→ALF_E re-encryption is explicitly designed to block this — "it is not possible for either a SAIL researcher or someone working for NWIS to use SAIL data to reverse the process to reveal NHS numbers."
- **The data provider (DPO):** holds both halves by definition — it made the split. It is the one party that can always re-identify.
- **Researchers:** get ALF_PE, project-scoped, inside the TRE, with no egress of row-level data and output review on the way out. They cannot link across their own projects.
- **Residual risk is acknowledged, not denied.** The profile paper is candid: re-identification risk through attribute combination "is a feature of all pseudonymised and anonymised row-level datasets which retain high utility." Mitigations are data minimisation, "aggregation (e.g. age to bands) and suppression of variables or entire records if deemed risky", plus the contractual/behavioural controls.
- **Consented linkage is a documented exception:** "for studies with consent to link data, some data controllers have agreed that SAIL can release individual patient data" — i.e. a different legal basis switches off the output restrictions.

---

## PART C — Comparison and standards

### C.1 MIMIC vs SAIL — philosophy

| Axis | MIMIC | SAIL |
|---|---|---|
| Model | One-shot versioned **public release** of a static extract | **Persistent linkable TRE**; data never leaves |
| Where analysis happens | On the researcher's own machine / their cloud | Inside the SAIL Gateway (UKSeRP) only |
| Risk control point | **Ex ante**, in the data (irreversible scrubbing) | **Ex post + environmental**: governance, setting, output checking |
| Linkage | None — single hospital, no external linkage | Core purpose — health, social care, education, administrative |
| Calendar time | Destroyed (MIMIC-III) / ±3-year band (MIMIC-IV `anchor_year_group`) | **Real dates retained** — the TRE, not the data, is the control |
| Free text | Aggressively scrubbed to `[** **]` tags or `___` | Generally not provisioned as free text; content is structured |
| Access latency | **1–2 weeks** (credentialing) + DUA | **~12 weeks** (IGRP) + training + account setup |
| Output control | None — researcher holds the data | Mandatory manual disclosure review, <10 rule |
| Re-identification key | Look-up tables held by MIT-LCP/BIDMC, undisclosed | Held by DHCW (TTP); triple-encrypted downstream |
| Cost of a breach | Unbounded (data is already distributed) | Bounded (data never left the enclave) |
| What it optimises | **Reproducibility and reach** — thousands of papers on identical data | **Utility and linkage** — real dates, real geography, national coverage |

The trade is legible: MIMIC buys reach by permanently destroying temporal and geographic utility; SAIL buys utility by permanently keeping the data inside a controlled setting. **A hospital "health data vault" almost certainly wants SAIL's architecture with MIMIC's optional export tier** — i.e. a TRE for real work, plus a heavily-scrubbed MIMIC-style extract for teaching, benchmarking and external collaboration.

Two SAIL mechanisms transplant especially well to a single-hospital vault: (a) **split-file at source with a TTP**, since a hospital MPI team can play DPO and an IT/security function can play TTP; and (b) **project-specific re-encryption of the linking key (ALF_PE)**, which is cheap to implement and single-handedly kills cross-project mosaic linkage by internal researchers.

### C.2 Standards and regulation

**HIPAA — 45 CFR §164.514** ([Cornell LII](https://www.law.cornell.edu/cfr/text/45/164.514))

Two, and only two, routes:
1. **Expert Determination — §164.514(b)(1).** "A person with appropriate knowledge of and experience with generally accepted statistical and scientific principles and methods" determines that "the risk is very small that the information could be used … to identify an individual", and **documents the methods and results**. There is **no numeric threshold** in the regulation. `[UNVERIFIED]` — I could not fetch the HHS OCR guidance PDF (403) to quote its elaboration of "very small".
2. **Safe Harbor — §164.514(b)(2)(i)**, remove all 18: (A) names; (B) **all geographic subdivisions smaller than a State** — street address, city, county, precinct, ZIP — **except the first three digits of the ZIP if the geographic unit so formed contains >20,000 people; otherwise the initial three digits are changed to 000**; (C) **all elements of dates except year** (birth, admission, discharge, death) **and all ages over 89 and all date elements indicative of such age, except that such ages may be aggregated into a single category of "90 or older"**; (D) telephone; (E) fax; (F) email; (G) SSN; (H) medical record numbers; (I) health plan beneficiary numbers; (J) account numbers; (K) certificate/licence numbers; (L) vehicle identifiers/plates; (M) device identifiers/serials; (N) URLs; (O) IP addresses; (P) biometric identifiers; (Q) full-face photographs and comparable images; (R) **"any other unique identifying number, characteristic, or code"** (subject to the (c) re-identification-code exception).
   Plus **§164.514(b)(2)(ii) "no actual knowledge"**: the entity must not have "actual knowledge that the information could be used alone or in combination with other information to identify an individual."
3. **§164.514(c) re-identification code:** a code may be assigned **provided it "is not derived from or related to information about the individual"** and the entity "does not use or disclose the code … for any other purpose, and does not disclose the mechanism for re-identification."

MIMIC is the textbook §164.514(c) implementation: **random cipher, not a hash of the MRN** — precisely because a hash *is* "derived from information about the individual". Worth flagging for a vault design: **`SHA256(MRN)` fails HIPAA's re-identification-code test and is dictionary-attackable; a random surrogate with a separately-held look-up table does not.**

**GDPR / UK GDPR**
- **Art. 4(5)**: pseudonymisation = processing such that data can no longer be attributed to a specific data subject **without the use of additional information**, kept separately and subject to technical/organisational measures.
- **Recital 26** ([gdpr-info.eu/recitals/no-26](https://gdpr-info.eu/recitals/no-26/)): data protection principles apply to any information concerning an identified or identifiable person; **pseudonymised data that could be attributed to a person by use of additional information is information on an identifiable natural person**. Identifiability is assessed by reference to **"all the means reasonably likely to be used"**, "taking into account all objective factors, such as the **costs of and the amount of time required** for identification, taking into consideration the **available technology at the time of the processing and technological developments**." The principles "should therefore not apply to anonymous information" nor "to personal data rendered anonymous in such a manner that the data subject is not or no longer identifiable"; the Regulation "does not therefore concern the processing of such anonymous information, including for statistical or research purposes."
- **Important 2025 development — CJEU, *EDPS v SRB*, Case C-413/23 P, judgment 4 September 2025** ([curia press release](https://curia.europa.eu/site/upload/docs/application/pdf/2025-09/cp250107en.pdf)). The Court adopted a **relative/contextual** reading: sufficiently strongly pseudonymised data may be **personal data for the original controller but not for a recipient** who cannot reverse the pseudonymisation and cannot identify the subjects by other means, assessed on "all the means reasonably likely to be used" from that recipient's position. This is directly load-bearing for a split-file vault: it is the clearest legal support yet for the claim that the clinical half, in the hands of the analytics party, is not personal data *for that party*.
- Practical bottom line: **pseudonymisation ≠ anonymisation.** MIMIC and SAIL both remain pseudonymised in the hands of the key-holder; they aim to be effectively anonymous in the hands of the researcher.

**UK ICO Anonymisation guidance**
- The long-standing reference is the **2012 "Anonymisation: managing data protection risk code of practice"** ([ico.org.uk/media/1061/anonymisation-code.pdf](https://ico.org.uk/media/1061/anonymisation-code.pdf)) — still the version cited by SAIL's own v1.7 output policy.
- The ICO **published new guidance on anonymisation, pseudonymisation and privacy-enhancing technologies on 28 March 2025**, in four parts: key concepts; identifiability (the **"spectrum of identifiability"**, the **"reasonably likely"** test and the **"motivated intruder"** test); how pseudonymisation supports compliance; and accountability/governance including DPIAs. ([ICO data-sharing/anonymisation hub](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/about-this-guidance/)) — the **28 March 2025** date and four-part structure come from law-firm commentary (Taylor Wessing, Jones Day, SCL); I could not fetch the ICO page itself (404 on the URL I tried), so treat the exact publication date as `[LIGHTLY VERIFIED]`.
- **Motivated intruder test:** a motivated intruder is "someone who wishes to identify a person from the anonymous information that is derived from their personal information"; if such a person could succeed, the data is not properly anonymised. This is the standard a hospital vault should actually be tested against — not a checklist.

**India — DPDP Act 2023**
- **"Personal data"** = "any data about an individual who is identifiable by or in relation to such data" (s.2(t)). Scope: **digital** personal data — collected digitally, or collected non-digitally and subsequently digitised.
- **There is NO "sensitive personal data" or "critical personal data" category in the DPDP Act.** This is a deliberate departure from the 2011 SPDI Rules and the withdrawn 2019 PDP Bill. **Health data gets no special statutory tier under DPDP.** Widely-circulated claims that DPDP classifies health data as "sensitive personal data" are **wrong** — I saw several such claims in secondary sources during this research and they should not be repeated.
- **The Act does not define or carve out anonymised data.** Unlike the 2019 Bill (which had s.91 on anonymised data), DPDP 2023 is **silent on anonymisation**. The practical implication is inferential rather than express: data that is not "about an identifiable individual" is outside s.2(t) and therefore outside the Act — but there is **no statutory anonymisation standard, no safe-harbour list, and no regulator-blessed technique.** This is a genuine gap, not a drafting subtlety. `[Flag this in the concept paper — it is the single thinnest point in the Indian framework.]`
- **s.17(2)(b)** exempts processing "necessary for research, archiving or statistical purposes" from most of the Act — **but only if carried on in accordance with prescribed standards**. Under the Rules this becomes **Rule 16 + the Second Schedule**: lawful processing, purpose limitation, data minimisation, data quality, retention limitation, security safeguards, notice, accountability, and — critically — **the processing must not be used to take decisions about specific individuals**. It is a **conditional, not blanket, exemption.**
- **DPDP Rules, 2025 were notified on 13–14 November 2025** by MeitY, with **staggered/phased commencement** of the Act. ([SCC Online](https://www.scconline.com/blog/post/2025/11/14/meity-notified-digital-personal-data-protection-rules-2025/), [PIB](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)) `[The exact gazette date — 13 vs 14 November — differs across sources; the phased commencement dates I did not verify from the gazette text. Check the gazette directly before citing a date.]`
- `[UNVERIFIED]` — whether the SPDI Rules 2011 under IT Act s.43A have been formally repealed as part of DPDP commencement. Do not assert either way.

**India — ABDM Health Data Management Policy (National Health Authority)**

I extracted the following verbatim from the **Draft HDM Policy, April 2022, Version 02** PDF:
- **Cl. 4(c) "anonymisation"**: *"in relation to personal data, means such irreversible process of transforming or converting personal data to a form in which a data principal cannot be identified through any means reasonably likely to be used to identify such data principal"* — note this borrows GDPR Recital 26's "means reasonably likely" formulation and adds "irreversible".
- **Cl. 4(k) "de-identification"**: *"the process by which a data fiduciary or data processor may remove, or mask identifiers from personal data, or replace them with such other fictitious name or code that is unique to a data principal but does not, on its own, directly identify the data principal"* — i.e. **de-identification here is pseudonymisation**, explicitly permitting a stable per-person surrogate. Exactly the MIMIC `subject_id` / SAIL ALF pattern.
- **Cl. 4(y) "personal data"** includes Personal Health Identifier; **Cl. 4(z) "Personal Health Identifier" (PHI)**: data that could identify a data principal, noting "PHIs could also be used for **re-identifying previously de-identified data**"; includes demographic and location information, family/relationship information and contact details.
- **Chapter 29 — "Sharing of De-identified or Anonymised Data by Data Fiduciaries":**
  - **29.1** — data fiduciaries "may make anonymised or de-identified data **in an aggregated form** available … for the purpose of facilitating health and clinical research, academic research, archiving, statistical analysis, policy formulation, the development and promotion of diagnostic solutions and such other purposes as may be specified by the NHA."
  - **29.2** — NHA "shall set out a procedure" requiring the requesting entity to give name, purpose of use and nodal contact, subject to permission.
  - **29.3** — recipients "shall not, knowingly or unknowingly, take any action which has the effect of re-identifying any data principal."
  - **29.4** — the anonymising data fiduciary bears compliance responsibility.
  - **29.5** — *"The de-identification or anonymisation of data by a data fiduciary shall be done in accordance with technical processes and anonymisation protocols **which may be specified by the NHA in consultation with the MeitY**."*
  - **29.6** — those protocols "shall be periodically reviewed by the NHA … [having] regard to the nature and sensitivity of the data being processed, the risks of re-identification of data principals and the robustness of the anonymisation protocols."

**This is the crux for an Indian hospital data vault: Clause 29.5 delegates the actual technical standard to protocols the NHA "may" specify — and I found no evidence that NHA has ever published them.** So India currently has: a policy that requires anonymisation to follow protocols that do not exist, and an Act that does not define anonymisation at all. **A hospital building a vault in India today has no domestic technical standard to conform to and should explicitly adopt an external one (HIPAA Safe Harbor / Expert Determination, or the ICO motivated-intruder standard) and say so.**

Caveats on ABDM, stated plainly:
- The document I extracted is the **April 2022 Draft Version 02**, put out for consultation (comments closed 21 May 2022). The **original HDM Policy was notified in December 2020.** `[UNVERIFIED]` — whether a final revised version was formally notified after the 2022 consultation, and which text is currently operative. Verify on abdm.gov.in before citing clause numbers as binding.
- The HDM Policy is a **policy/framework document issued by NHA, not primary legislation.** It binds participants in the ABDM ecosystem contractually/by registration condition; it now sits **below the DPDP Act 2023 and DPDP Rules 2025** in the hierarchy, and where the two conflict the Act prevails. `[UNVERIFIED]` whether NHA has issued a formal reconciliation of HDMP with DPDP.
- ABDM's architecture is **federated** — records stay with the originating health facility; the Health Information Exchange & Consent Manager (HIE-CM) brokers consent-based access between Health Information Providers (HIP) and Health Information Users (HIU) via a machine-readable **consent artifact** (Cl. 4(f)); the identifier is the 14-digit **ABHA number** plus an **ABHA Address** (`username@HIE-CM`). This means ABDM never creates a national clinical data lake — a design point directly relevant to a hospital vault, which *is* a local lake and therefore carries risk ABDM deliberately avoided.

### C.3 Formal privacy models — one accurate sentence each, plus the catch

- **k-anonymity** (Sweeney 2002): guarantees every record is indistinguishable from at least *k−1* others **on the quasi-identifiers**, so no individual can be singled out by a QI combination — but it says nothing about the sensitive attribute, so if all *k* members of an equivalence class share a diagnosis, the diagnosis leaks anyway.
- **l-diversity** (Machanavajjhala et al. 2007): strengthens this by requiring at least *l* "well-represented" values of the sensitive attribute within each equivalence class — but it ignores the *distribution* of those values, so a class that is 99% "HIV+" and 1% something else can still be 2-diverse and utterly disclosive.
- **t-closeness** (Li et al. 2007): requires the sensitive-attribute distribution within each class to be within distance *t* of the distribution in the whole table — semantically the strongest of the three, and in practice the one that destroys the most utility, because clinical cohorts are *supposed* to have skewed outcome distributions.
- **Differential privacy** (Dwork et al. 2006): guarantees that the output distribution of a randomised mechanism changes by at most a factor e^ε when any single individual's record is added or removed, so participation itself is deniable regardless of the adversary's side knowledge — but it is a property of a **query mechanism**, not of a released table, and it degrades under composition (the privacy budget ε is consumed by every query), which makes it a poor fit for open-ended exploratory clinical research on small, heavy-tailed cohorts.

**The practical catch for clinical data generally:** all four assume you can cleanly partition columns into quasi-identifiers and sensitive attributes. Real EHR data cannot be partitioned that way — a longitudinal sequence of ~200 lab values, timestamps and drug administrations **is** a quasi-identifier, and high-dimensional sparse records are provably near-impossible to k-anonymise without destroying utility. **This is exactly why both MIMIC and SAIL rely on governance, access control and output checking rather than on a formal privacy guarantee over the data itself — neither claims k-anonymity, l-diversity or differential privacy anywhere.** That is the honest position a concept paper should take.

---

## Things I could not verify (consolidated)

1. Custody, retention and destruction policy for MIMIC's `subject_id`/`hadm_id` look-up tables at MIT-LCP/BIDMC.
2. Whether MIMIC-IV `provider_id` / `caregiver_id` are random surrogates or hashes.
3. Whether MIMIC-III `CGID` is random or sequential.
4. The official, exhaustive grammar of MIMIC-III's `[** ... **]` note tags — the form is confirmed, the token vocabulary (`Known lastname`, `Hospital1`, etc.) is only corroborated from secondary sources.
5. HHS OCR de-identification guidance elaboration of "very small risk" (hhs.gov returned 403).
6. Exact ICO 2025 guidance publication date and chapter structure (ICO URL 404'd; taken from law-firm commentary).
7. Whether a final (post-consultation) ABDM HDM Policy was formally notified after April 2022, and which text is operative today.
8. Whether NHA has ever published the Clause 29.5 anonymisation protocols — I found no evidence that it has, but absence of evidence here is not proof.
9. Whether the SPDI Rules 2011 are repealed following DPDP commencement.
10. Exact DPDP Rules 2025 gazette date (13 vs 14 Nov 2025) and the phased commencement schedule.

Two scratch files were written for extraction only: `/private/tmp/claude-502/-Users-manish-manish-dev-yajur-ai/1ce82aaf-880b-44e5-ad53-c6fbb84725c7/scratchpad/sail-output-v17.txt` and `.../hdm.txt`. No project files were touched.
---

# ERRATUM (supersedes Part C above)

Parts A (MIMIC) and B (SAIL) stand unchanged. **Part C is materially corrected** — see `tasks/health-vault-research-legal.md` for the full statutory analysis worked from gazette PDFs. Headlines:

1. **DPDP Act ss.3–17 are NOT in force.** Commencement G.S.R. 843(E) puts them, and Rules 6/7/16, in an 18-month tranche → **mid-May 2027**. Today only definitions, Board machinery and rule-making powers are live. The s.17(2)(b) research exemption is **not currently available**.
2. **SPDI Rules 2011 remain in force**, because DPDP s.44(2) (which omits IT Act s.43A) is itself in the 18-month tranche. **Health data IS sensitive personal data in India today** under SPDI Rule 3. Every Indian compliance statement must be **tensed**: SPDI until mid-May 2027, DPDP (no sensitive category at all) after.
3. **DPDP Rules 2025 contain zero occurrences** of "anonym", "de-identif", "pseudonym". Nearest adjacent text is Rule 6(1)(a) — obfuscation/masking/virtual tokens — framed as *security measures on data that remains personal data*, not a route out of scope.
4. **2019 Bill carve-out was cl. 2(B)**, not s.91 (s.91 was a government access power). The Bill had scope exclusion + definition + a standard-setting power vested in the DPA; **DPDP 2023 dropped all three**, so there is no regulator empowered to set an anonymisation standard.
5. **Operative ABDM doc is the NDHM HDM Policy, FINAL, December 2020** — not the April 2022 draft (consultation closed, never notified). Wording byte-identical; clause letters differ: anonymisation **4(a)**, de-identification **4(j)**, PHI 4(z), Chapter 29 unchanged. The 2020 final also has **4(cc) pseudonymisation**, which the draft deleted. Data localisation appears **only** in the never-finalised draft.
6. **ABDM Cl. 4(ee) defines "sensitive personal data" by reference to SPDI Rule 3** — pinning ABDM's sensitivity tier to an instrument due to lapse in 2027. Unreconciled.
7. **The NHA anonymisation-protocol gap is a confirmed negative**, evidenced across five sources (publications API, guidelines API, both HIP/HIU editions, the never-finalised Retention Policy consultation, MeitY's withdrawn 2022 draft).
8. **NEW — ICMR is the one operative Indian standard.** National Ethical Guidelines 2017 §11 gives a real taxonomy (anonymous / anonymized-reversible / anonymized-irreversible / identifiable); the 2023 AI guidelines flag DICOM **metadata *and* burned-in on-image PHI** as two separate problems. Binds via institutional ethics committees. **Terminology trap:** ICMR "anonymized" *includes the reversible case* — never map it to GDPR "anonymised".
9. **NEW — CJEU *EDPS v SRB*, 4 Sept 2025 (C-413/23 P), para 77** states two conditions under which pseudonymised data is not personal data *in the recipient's hands*. It is close to a specification for the split-file design. The EDPS **won the appeal**; the substantive law went the SRB's way. Relative approach is **context-dependent**, not flat.
10. **ICO:** 28 Mar 2025 guidance confirmed (not a statutory code; under review post-DUAA). 2012 code **removed and redirected, not formally withdrawn**. **A consultation on anonymisation/pseudonymisation *for research* is OPEN now and closes 19 October 2026** — live and citable as of publication.

## DO NOT SAY

1. "The DPDP Act exempts anonymised data" — it is **silent**; exclusion is an inference from s.2(t).
2. "The 2019 Bill's s.91 carved out anonymised data" — it was cl. 2(B).
3. "Health data is sensitive personal data under Indian law" **untensed** — true today, false from mid-May 2027.
4. "The DPDP Act is in force" — ss.3–17 and Rules 6/7/16 are not.
5. "The SPDI Rules have been repealed" — the omission has not commenced.
6. "ABDM says health data is never centrally stored" — it says *federated instead of centralised*.
7. "ABDM permits anonymised data for AI training" — the policy never mentions AI, ML or algorithms.
8. "ABDM mandates data localisation" — only the never-finalised draft did.
9. "The ABDM HDM Policy is binding" — it self-describes as "a guidance document"; sanction is ecosystem exclusion.
10. "Pseudonymised data is always personal data under GDPR" — not automatic for every recipient post-*EDPS v SRB*.
11. "The ICO's 2012 code is withdrawn" — removed and redirected; no withdrawal notice found.
12. Never equate ICMR "anonymized" with GDPR "anonymised".

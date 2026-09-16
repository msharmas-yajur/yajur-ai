# De-identified & Anonymised Health Data: India, UK, EU — Primary-Source Report

**Date of research:** 16 September 2026. **Provenance note:** Parts 1 and the India-extras were verified by me directly from downloaded gazette/statute PDFs (text-extracted and grepped). Parts 2–4 were researched by delegated agents working from primary PDFs/pages; I have relayed their verbatim quotes and URLs but did not personally re-extract every one. Items neither I nor they could confirm from a primary source are marked **[UNVERIFIED]**.

---

## 1. Digital Personal Data Protection Act, 2023 (India)

**Source used:** the Gazette of India Extraordinary text, Act No. 22 of 2023, assented 11 August 2023 — [MeitY PDF](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf). (WebFetch is 403-blocked on this URL; I downloaded it with curl and extracted the text with `pdftotext`. The file is the full English Act: Chapters I–IX plus the Schedule, ~88k characters.) Also on [India Code](https://www.indiacode.nic.in/handle/123456789/22037?view_type=browse).

### 1.1 Definitions (s.2) — verbatim

> **(t)** "personal data" means any data about an individual who is identifiable by or in relation to such data;

> **(i)** "Data Fiduciary" means any person who alone or in conjunction with other persons determines the purpose and means of processing of personal data;

> **(j)** "Data Principal" means the individual to whom the personal data relates and where such individual is— (i) a child, includes the parents or lawful guardian of such a child; (ii) a person with disability, includes her lawful guardian, acting on her behalf;

Supporting definitions that matter for this analysis:

> **(h)** "data" means a representation of information, facts, concepts, opinions or instructions in a manner suitable for communication, interpretation or processing by human beings or by automated means;

> **(n)** "digital personal data" means personal data in digital form;

> **(k)** "Data Processor" means any person who processes personal data on behalf of a Data Fiduciary;

> **(u)** "personal data breach" means any unauthorised processing of personal data or accidental disclosure, acquisition, sharing, use, alteration, destruction or loss of access to personal data, that compromises the confidentiality, integrity or availability of personal data;

> **(x)** "processing" in relation to personal data, means a wholly or partly automated operation or set of operations performed on digital personal data, and includes operations such as collection, recording, organisation, structuring, storage, adaptation, retrieval, use, alignment or combination, indexing, sharing, disclosure by transmission, dissemination or otherwise making available, restriction, erasure or destruction;

Note s.2(x): the Act's list of processing operations **does not include anonymisation** (contrast the ABDM policy, which expressly does — see §2.1).

### 1.2 "Sensitive personal data" / "critical personal data" — YOUR BELIEF IS CORRECT ✅

**Verified by exhaustive grep of the full Act text: the strings "sensitive", "critical", "anonym", "de-identif", "deidentif" and "pseudonym" occur ZERO times in the DPDP Act, 2023.**

The Act creates **no special category of sensitive or critical personal data at all**. There is one flat category — "personal data" — plus one structural tier, the **Significant Data Fiduciary** (s.2(z), s.10), which is notified by the Central Government based on volume/sensitivity but is a classification *of entities*, not *of data*.

**Health data receives no special treatment.** "Health" appears in the Act only three times, all inside the s.7 "certain legitimate uses" grounds (s.7(f)–(g): medical emergency / threat to health / provision of medical treatment or health services / epidemic or public-health threat). This is a *permissive* ground for processing without consent, not a heightened-protection category.

**Contrast with the two instruments it displaced** (both verified from primary text):
- **SPDI Rules 2011**, Rule 3 — "Sensitive personal data or information of a person means such personal information which consists of information relating to;— … (iii) physical, physiological and mental health condition; … (v) medical records and history; …" ([PRS copy of G.S.R. 313(E)](https://prsindia.org/files/bills_acts/bills_parliament/2011/IT_Rules_2011.pdf))
- **PDP Bill 2019**, clause 3(36) — "'sensitive personal data' means such personal data, which may, reveal, be related to, or constitute— (i) financial data; (ii) **health data**; (iii) official identifier; (iv) sex life; … (vii) genetic data; …" The 2019 Bill also had a "critical personal data" concept with hard localisation (clauses 33–34: "The critical personal data shall only be processed in India"). ([PRS PDF](https://prsindia.org/files/bills_acts/bills_parliament/2019/Personal%20Data%20Protection%20Bill,%202019.pdf))

So: the DPDP Act **abolished** the sensitive-data category that Indian health-data practice had been built on since 2011.

### 1.3 Anonymised / de-identified data — YOUR BELIEF IS CORRECT, WITH A CORRECTION ✅⚠️

**The DPDP Act is completely silent on anonymisation, de-identification and pseudonymisation. There is no definition, no carve-out, no exemption, no section.** (Verified by grep — zero occurrences, as above.)

**The same is true of the DPDP Rules, 2025.** Grep of the notified Rules returns zero hits for "anonym", "de-identif" and "pseudonym". The only adjacent vocabulary is in Rule 6(1)(a), which lists *security techniques*:

> "(a) appropriate data security measures, such as securing of personal data through encryption, **obfuscation, masking or the use of virtual tokens mapped to that personal data**;"

These are framed as safeguards applied *to personal data that remains personal data* — not as a route out of the Act's scope.

**⚠️ Correction to your framing on the 2019 Bill.** The anonymised-data carve-out in the PDP Bill 2019 was **not** s.91. It was **clause 2(B)**, the application clause:

> "**(B) shall not apply to the processing of anonymised data, other than the anonymised data referred to in section 91.**"

with definitions at clause 3(2)–(3):

> "(2) '**anonymisation**' in relation to personal data, means such irreversible process of transforming or converting personal data to a form in which a data principal cannot be identified, which meets the standards of irreversibility specified by the Authority;
> (3) '**anonymised data**' means data which has undergone the process of anonymisation;"

**Clause 91** was a different thing — a *government access* power over anonymised/non-personal data:

> "91. (1) Nothing in this Act shall prevent the Central Government from framing of any policy for the digital economy, including measures for its growth, security, integrity, prevention of misuse, insofar as such policy do not govern personal data.
> (2) The Central Government may, in consultation with the Authority, direct any data fiduciary or data processor to provide any personal data anonymised or other non-personal data to enable better targeting of delivery of services or formulation of evidence-based policies by the Central Government, in such manner as may be prescribed.
> *Explanation.*—For the purposes of this sub-section, the expression 'non-personal data' means the data other than personal data."

So the 2019 Bill had **both** an express scope exclusion (cl. 2(B)) **and** an anonymisation *standard-setting* mandate vested in the Data Protection Authority (cl. 3(2): "which meets the standards of irreversibility specified by the Authority"; cl. 49/50 listed "methods of de-identification and anonymisation" among the Authority's functions). **The DPDP Act 2023 dropped all three: the exclusion, the definition, and the standard-setting power.**

### 1.4 What this means legally — flagged as interpretation, not text

There is **no express exemption**, so the argument that anonymised data falls outside the Act is an **inference from s.2(t) read with s.3**: if data is genuinely anonymised, there is no "individual who is identifiable by or in relation to such data", so it is not "personal data", so the Act does not bite. That is the near-universal professional reading, but it is a *construction*, not a statutory carve-out, and it carries three practical consequences:

1. **No statutory threshold.** India has no legal standard for when anonymisation is sufficient — no "irreversibility" test (as the 2019 Bill had), no motivated-intruder test (as the ICO has), no "means reasonably likely to be used" clause (as GDPR Recital 26 has). The question is at large.
2. **No regulator empowered to set one.** The DPDP Act gives the Data Protection Board adjudicatory functions only; rule-making sits with the Central Government under s.40, and the notified Rules do not address anonymisation.
3. **Pseudonymised/de-identified-but-re-linkable data is almost certainly still personal data** under s.2(t), since the individual remains "identifiable … in relation to such data". The Act offers no reduced-obligation tier for it, unlike GDPR (which treats pseudonymisation as a recognised safeguard in Arts. 6(4)(e), 25(1), 32(1)(a)).

**[UNVERIFIED — and an important negative]:** I found **no official MeitY or Data Protection Board FAQ, guidance note or clarification** on whether anonymised data falls outside the DPDP Act. A web search surfaced a document described as "official FAQs"; I downloaded it and it is in fact a **law-firm publication** — Cyril Amarchand Mangaldas, *FAQs – The Digital Personal Data Protection Act, 2023*, stated as current to 7 December 2025, with a disclaimer that it "does not constitute a legal advice or opinion". **Do not cite it as government guidance.** As a well-sourced *secondary* statement of the professional consensus, its FAQ 6 says ([PDF](https://www.cyrilshroff.com/wp-content/uploads/2025/12/FAQs-DPDPA.pdf)):

> "DPDPA does not expressly exempt its application to anonymised or pseudonymised data. Anonymisation is typically understood as the irreversible process of transforming or converting PD into a form in which the individual cannot be identified. Consequently, and relying on the scope of DPDPA, anonymised data is likely to be outside DPDPA's purview. While there are no globally accepted standards for anonymisation, some of the widely used techniques include randomization and generalization. … Pseudonymisation or deidentification is commonly understood as the process of removing, masking, replacing, or segregating identifiers from PD in such manner that the output data on its own does not directly result in identifying the concerned individual. Thus, it is different from anonymisation, and when combined with identifiers or linked with other data sets, can result in the identification of the individual. **Hence, pseudonymised data is likely to remain within DPDPA's ambit.**"

### 1.5 Section 17(2)(b) — research/archiving/statistical exemption — verbatim

> "**(2)** The provisions of this Act shall not apply in respect of the processing of personal data—
> …
> **(b) necessary for research, archiving or statistical purposes if the personal data is not to be used to take any decision specific to a Data Principal and such processing is carried on in accordance with such standards as may be prescribed.**"

Three points, all load-bearing:

- **It is a full disapplication** ("the provisions of this Act shall not apply"), not a partial one. Compare s.17(1), which disapplies only Chapter II (less s.8(1) and s.8(5)), Chapter III and s.16.
- **Two cumulative conditions**: (i) the data "is not to be used to take any decision specific to a Data Principal"; and (ii) processing complies with "such standards as may be prescribed". Condition (ii) was a null set until 13 November 2025 — the exemption was **inoperable** because no standards existed.
- **This is a research exemption, not an anonymisation exemption.** It applies to identifiable personal data processed for research. It does not say anonymised data is out of scope, and it does not require anonymisation.

### 1.6 The prescribed standards — Rule 16 and the Second Schedule

**Rule 16 (DPDP Rules, 2025), verbatim:**

> "**16. Exemption from Act for research, archiving or statistical purposes.** —The provisions of the Act shall not apply to the processing of personal data necessary for research, archiving or statistical purposes if it is carried on in accordance with the standards specified in Second Schedule."

**⚠️ Drafting observation worth flagging:** Rule 16 **omits the statutory condition** in s.17(2)(b) that "the personal data is not to be used to take any decision specific to a Data Principal". That condition is in the Act and a rule cannot dilute it, so it continues to apply — but anyone reading Rule 16 alone will miss it. **Cite s.17(2)(b), not Rule 16, for the decision-making condition.**

**Second Schedule** — headed "[See rules 5(1) and 16] / Standards for processing of personal data by State and its instrumentalities under clause (b) of section 7 and for processing of personal data necessary for the purposes specified in clause (b) of sub-section (2) of section 17". Verbatim:

> "Implementation of appropriate technical and organisational measures to ensure effective observance of the following, in accordance with applicable law, for the processing of personal data, namely: —
> (a) Processing is carried out in a lawful manner;
> (b) Processing is done for the uses specified in clause (b) of section 7 of the Act or for the purposes specified in clause (b) of sub-section (2) of section 17 of the Act, as the case may be;
> (c) Processing is limited to such personal data as is necessary for such uses or achieving such purposes, as the case may be;
> (d) Processing is done while making reasonable efforts to ensure the completeness, accuracy and consistency of personal data;
> (e) Personal data is retained till required for such uses or achieving such purposes, as the case may be, or for compliance with any law for the time being in force;
> (f) Reasonable security safeguards to prevent personal data breach to protect personal data in the possession or under control of the Data Fiduciary, including in respect of any processing undertaken by it or on its behalf by a Data Processor;
> (g) Where processing is to be done under clause (b) of section 7 of the Act, the same is undertaken while giving the Data Principal an intimation in respect of the same and— [(i) DPO/contact info; (ii) communication link for exercising rights; (iii) consistency with other applicable standards under Central Government policy or law]; and
> (h) Accountability of the person who alone or in conjunction with other persons determines the purpose and means of processing of personal data, for effective observance of these standards."

**Assessment — do not overstate this.** The Second Schedule is a restatement of generic data-protection principles (lawfulness, purpose limitation, minimisation, accuracy, storage limitation, security, accountability). It contains **no anonymisation requirement, no de-identification requirement, no ethics-committee requirement, no re-identification prohibition, and no data-sharing controls.** Limb (g) — the only transparency limb — is expressly confined to s.7(b) State processing and does **not** apply to the s.17(2)(b) research route. So a private research/AI use relying on s.17(2)(b) owes **no notice at all** to data principals under the Rules.

### 1.7 Sections 8(5) and 8(6) — the Act vs. the Rules

**What the Act itself says (verbatim):**

> "**(5)** A Data Fiduciary shall protect personal data in its possession or under its control, including in respect of any processing undertaken by it or on its behalf by a Data Processor, by taking reasonable security safeguards to prevent personal data breach.
> **(6)** In the event of a personal data breach, the Data Fiduciary shall give the Board and each affected Data Principal, intimation of such breach in such form and manner as may be prescribed."

Also relevant: s.8(4) ("appropriate technical and organisational measures"), and note that **s.8(1) and s.8(5) survive the s.17(1) exemptions** — they are expressly carved back in. They do **not** survive s.17(2), which disapplies the whole Act.

**What the Rules add.**

**Rule 6 — Reasonable security safeguards.** Minimum mandatory floor: (a) encryption/obfuscation/masking/virtual tokens; (b) access control over computer resources; (c) logging, monitoring and review for detection/investigation/remediation; (d) continuity measures such as data backups; (e) **retention of logs and personal data for one year** for detection/investigation purposes unless law requires otherwise; (f) contractual security provisions binding Data Processors; (g) appropriate technical and organisational measures. Rule 6(2) imports the IT Act 2000 meaning of "computer resource".

**Rule 7 — Intimation of personal data breach.** Two tracks:
- **To each affected Data Principal** (Rule 7(1)): "**without delay**", "in a concise, clear and plain manner", via her user account or registered communication mode — stating nature/extent/timing, likely consequences for her, mitigation measures taken, safety measures she can take, and a contact point. **No threshold, no risk qualifier** — every breach triggers notification (contrast GDPR Art. 34's "high risk" threshold).
- **To the Board** (Rule 7(2)): (a) "**without delay**", a description including nature, extent, timing and location of occurrence and likely impact; then (b) "**within seventy-two hours** of becoming aware of the breach, or within such longer period as the Board may allow on a request made in writing", a detailed follow-up covering updated description, broad facts/causes/circumstances, mitigation measures, findings on who caused it, remedial measures to prevent recurrence, and a report on the intimations given to affected Data Principals.

**⚠️ Timing caveat — these are not yet in force.** See §1.8.

### 1.8 Status and commencement of the DPDP Rules, 2025 — CONFIRMED ✅

Yes, the Rules were notified in November 2025.

- **G.S.R. 846(E), dated 13 November 2025**, made under s.40(1)–(2) of the DPDP Act. Published in the Gazette of India Extraordinary, Part II Section 3 Sub-section (i). E-gazette ID `CG-DL-E-14112025-267650`, No. 760 — i.e. **dated 13 Nov, published 14 Nov 2025**. Official bilingual PDF: [meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf). The Rules follow a draft, G.S.R. 02(E) of 3 January 2025, on which objections and suggestions were taken.
- **Rule 1 commencement, verbatim:**
  > "(2) Rules 1, 2 and 17 to 21 shall come into force on the date of their publication in the Official Gazette.
  > (3) Rule 4 shall come into force one year after the date of publication of this Gazette.
  > (4) Rules 3, 5 to 16, 22 and 23 shall come into force eighteen months after the date of publication of this Gazette."

**So, precisely: Rule 6 (security safeguards), Rule 7 (breach notification) and Rule 16 (research standards) are ALL in the eighteen-month tranche. None of them is in force yet.** They commence ~14 May 2027. Only the Board-constitution machinery (Rules 17–21) and definitions are live today.

**The Act's own staggered commencement — G.S.R. 843(E), 13 November 2025** (made under s.1(2)). Verbatim:
> "(a) the date of publication of this notification in the Official Gazette as the date on which the provisions of sub-section (2) of section 1, section 2, sections 18 to 26 sections 35, 38, 39, 40, 41, 42, 43, and sub-sections (1) and (3) of section 44 of the said Act shall come into force;
> (b) one year from the date of publication of this gazette on which the provisions of sub-section (9) of section 6 and clause (d) of sub-section (1) of section 27 of the said Act shall come into force.
> (c) eighteen months from the date of publication of this gazette, on which the provision of sections 3 to 5, sub-sections (1) to (8) and (10) of section 6, sections 7 to 10, sections 11 to 17, section 27 except clause (d) of sub-section (1) of the said section, sections 28 to 34, 36, 37 and **sub-section (2) of section 44** of the said Act shall come into force."

**Bottom line on timing: sections 3–17 of the DPDP Act — the entire substantive regime, including s.8 obligations and the s.17(2)(b) research exemption — are NOT yet in force. They commence at the eighteen-month mark.** As of today (16 Sep 2026) only the definitions, the Data Protection Board provisions, rule-making powers and the TRAI/RTI amendments are live.

⚠️ **Date precision:** the notification says "eighteen months from the date of publication of this gazette"; the notification is dated 13 Nov 2025 and the gazette carries a 14 Nov 2025 publication ID. Secondary sources split between **13 May 2027** and **14 May 2027**. I could not resolve this from primary text — **[UNVERIFIED]**. Write it as "mid-May 2027" unless you need the exact day, in which case check the e-gazette publication date directly.

⚠️ **Source caveat on G.S.R. 843(E):** I read this from a clean gazette-page reproduction at [dpdpa.in/notification_timeline_act.pdf](https://dpdpa.in/notification_timeline_act.pdf) (bearing "[F. No. AA-11038/1/2025-CL&ES] AJIT KUMAR, Jt. Secy."). I could **not** retrieve it from meity.gov.in — the MeitY data-protection-framework page is a JS-rendered SPA that returns no links to curl. The text is corroborated by multiple independent law-firm accounts ([S&R Associates](https://www.snrlaw.in/indias-digital-personal-data-protection-regime-takes-effect/), [Shardul Amarchand Mangaldas](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/)), but treat the exact wording as **reproduced, not fetched from a .gov.in host**.

Also relevant to health-AI deployments (both in the 18-month tranche):
- **Rule 13(4)** — a Significant Data Fiduciary "shall undertake measures to ensure that personal data specified by the Central Government, on the basis of the recommendations of a committee constituted by it, is processed subject to the restriction that the personal data and the traffic data pertaining to its flow is **not transferred outside the territory of India**." A *latent* localisation power; no such data has been specified yet.
- **Rule 13(1)–(3)** — annual DPIA and audit, report of significant observations to the Board, and due diligence "to verify that technical measures **including algorithmic software** adopted by it … are not likely to pose a risk to the rights of Data Principals."
- **Rule 15** — cross-border transfer permitted subject to any requirements the Central Government may specify by general or special order regarding availability to a foreign State or its agencies. This is a **notable liberalisation** versus the 2019 Bill's hard localisation for sensitive/critical data.
- **Fourth Schedule, Part B** carves clinical establishments, mental health establishments and healthcare professionals out of the children's-data restrictions (verifiable consent / tracking / targeted advertising) "to the extent necessary for the protection of her health".

### 1.9 SPDI Rules 2011 — STILL OPERATIVE ⚠️ (this is the most commonly misstated point)

**Mechanism.** DPDP Act s.44(2) provides, verbatim:
> "(2) The Information Technology Act, 2000 shall be amended in the following manner, namely:—
> **(a) section 43A shall be omitted;**
> (b) in section 81, in the proviso, after the words and figures 'the Patents Act, 1970', the words and figures 'or the Digital Personal Data Protection Act, 2023' shall be inserted; and
> **(c) in section 87, in sub-section (2), clause (ob) shall be omitted.**"

The SPDI Rules were made "In exercise of the powers conferred by clause (ob) of sub-section (2) of section 87 read with section 43A of the Information Technology Act, 2000" (G.S.R. 313(E), 11 April 2011). s.44(2) removes **both** limbs of that enabling power.

**But s.44(2) is in the eighteen-month tranche** (G.S.R. 843(E)(c)). Only s.44(1) (TRAI Act amendment) and s.44(3) (RTI Act s.8(1)(j) substitution) commenced on 13/14 November 2025.

**Therefore: as of today, IT Act s.43A is still on the statute book and the SPDI Rules 2011 remain in force.** For health data specifically, this means Rule 3's "sensitive personal data or information" category — expressly covering "physical, physiological and mental health condition" and "medical records and history" — **still applies right now**, along with Rule 4 (privacy policy), Rule 5 (consent, purpose limitation, retention), Rule 6 (disclosure), Rule 7 (transfer) and Rule 8 (reasonable security practices / IS/ISO/IEC 27001).

**Practical consequence:** until mid-May 2027 India runs on the **SPDI Rules**, under which health data **is** sensitive; from mid-May 2027 it runs on the **DPDP Act**, under which it **is not**. Any compliance statement must be tensed.

⚠️ **Interpretive flag:** whether omitting s.43A and s.87(2)(ob) *automatically* voids the SPDI Rules, or whether they survive until separately rescinded, is a question of statutory construction (General Clauses Act, 1897, s.24 and the effect of omitting an enabling provision). I am not aware of any government notification expressly rescinding G.S.R. 313(E). **[UNVERIFIED]** — flag this as an open point rather than asserting automatic repeal.

For completeness: the SPDI Rules contain **no** mention of anonymisation, de-identification or pseudonymisation (verified by grep).

---

## 1-bis. Two Indian instruments that DO address health-data anonymisation (not in your brief, but directly on point)

Because the DPDP Act, the DPDP Rules and the ABDM policy all fail to supply an anonymisation standard, the only operative Indian guidance on de-identifying health data sits in **ICMR research ethics**, which binds through institutional ethics committees rather than data-protection law.

### ICMR, *National Ethical Guidelines for Biomedical and Health Research Involving Human Participants* (2017)

Current edition; no superseding revision found (a February 2024 addendum on systematic reviews/meta-analyses exists but does not replace it). [PDF](https://ethics.ncdirindia.org/asset/pdf/ICMR_National_Ethical_Guidelines.pdf) · [ICMR copy](https://www.icmr.gov.in/icmrobject/custom_data/pdf/resource-guidelines/ICMR_Ethical_Guidelines_2017.pdf)

**Taxonomy (Section 11, biological materials/biobanking), verbatim:**
> "**Anonymous or unidentified** — No identifiers are present from the start or if collected, are not maintained. Such samples are received by biobanks without any identifiers and supplied to researchers."
> "**Anonymized** — This involves systematic de-identification, reversible or irreversible: link of samples/data to personal identity is reversibly or irreversibly cut. — *Coded or reversibly anonymized:* There is an indirect link of sample/data to the participant's identity with restricted access. This link could be re-linked if required; therefore, it may also be termed reversible anonymization. — *Irreversibly anonymized:* Link to the participant's identity is removed and cannot be re-linked."
> "**Identifiable** — A direct link of sample/data to the participant's identity exists."

This is the closest thing India has to a published health-data de-identification taxonomy, and note it uses "anonymized" as an **umbrella** term covering the reversible case — the opposite of GDPR/ICO usage, where reversibility means pseudonymisation and *not* anonymisation. **Terminological mismatch risk: high.** Do not map ICMR "coded or reversibly anonymized" onto "anonymised" in a GDPR or ICO sense.

**Consent waiver — Section 5.7 and Box 5.2, verbatim:**
> "The researcher can apply to the EC for a waiver of consent if the research involves less than minimal risk to participants and the waiver will not adversely affect the rights and welfare of the participants."
> "The EC may grant consent waiver in the following situations: • research cannot practically be carried out without the waiver and the waiver is scientifically justified; • retrospective studies, where the participants are de-identified or cannot be contacted; • **research on anonymized biological samples/data**; • certain types of public health studies/surveillance programmes/programme evaluation studies; • research on data available in the public domain; or • research during humanitarian emergencies and disasters…"

And Section 11: "**Waiver of consent:** While using anonymized (de-identified) samples/data, researchers should seek the approval of the EC of the institution or the repository for waiver of consent from donors."

**Key point:** even for anonymised data, ICMR requires **ethics-committee approval of the waiver** — it is not self-certifying. This is a meaningfully higher bar than anything in the DPDP framework.

### ICMR, *Ethical Guidelines for Application of Artificial Intelligence in Biomedical Research and Healthcare* (2023)

[PDF](https://www.icmr.gov.in/icmrobject/custom_data/pdf/Ethical-guidelines/Ethical_Guidelines_AI_Healthcare_2023.pdf) · [ICMR page](https://www.icmr.gov.in/ethical-guidelines-for-application-of-artificial-intelligence-in-biomedical-research-and-healthcare)

Glossary, verbatim:
> "**Data Anonymization/ De-identification:** Data Anonymization is the process of protecting private or sensitive information by erasing or encrypting identifiers that connect an individual to stored data. The process of de-identification mitigates privacy risks to individuals and thereby supports the secondary use of data for comparative effectiveness studies, policy assessment, life sciences research, and other endeavors."

On data privacy, verbatim:
> "Individual patients' data should preferably be anonymized unless keeping it in an identifiable format is essential for clinical or research purposes. All algorithms handling data related to patients must ensure appropriate anonymization before any form of data sharing. It is important to know that **patient identifiers can be present as 'Metadata' and as 'on-image' data and both need to be effectively anonymized.**"

Also: "The manufacturer has the responsibility to prevent re-identification from datasets and the prevention of leakage of identifiable information"; and "**Consent waiver can be obtained in case of anonymized data for retrospective studies.**"

This is the only Indian instrument that flags the **DICOM metadata / burned-in pixel identifier** problem — directly relevant to any radiology AI pipeline.

### MeitY draft anonymisation guidelines — withdrawn, never finalised

MeitY released draft *Guidelines on Anonymisation of Data* for e-governance applications on **30 August 2022**, open for comment to 21 September 2022, and **withdrew them from the e-Governance Standards site within about a week (c. 6 September 2022)**, reportedly because they had been released without adequate expert consultation. As of December 2022 MeitY said re-release was "under consideration" with no date, and I found no evidence of a finalised version since. **Sourced to secondary reporting only** — [Medianama, Sept 2022](https://www.medianama.com/2022/09/223-meity-draft-guidelines-data-anonymization-public-consultation/) and [Medianama, Dec 2022](https://www.medianama.com/2022/12/223-meity-no-date-on-e-gov-data-anonymisation-guidelines-re-release/) — **[UNVERIFIED against a primary MeitY document]**, since the draft is no longer hosted.

**Net position: India has no operative, government-issued anonymisation standard of general application.**

---

## 2. ABDM Health Data Management Policy (National Health Authority)

*Researched by delegated agent from the primary PDFs; URLs and quotes relayed. I did not personally re-extract these.*

### 2.0 Which document is operative — an important finding

| Version | URL | Identification |
|---|---|---|
| **NDHM Health Data Management Policy, FINAL, December 2020** (21 pp.) — **this is the operative one** | [abdm.gov.in/strapicms/uploads/health_data_management_policy_77208f0d26.pdf](https://abdm.gov.in/strapicms/uploads/health_data_management_policy_77208f0d26.pdf?updated_at=2022-05-27T13:27:06.812Z) | PDF metadata title `Microsoft Word - 201202_NDHM Health Data Policy_Final`, created 9 Dec 2020 |
| **ABDM Draft Health Data Management Policy, April 2022, Version 02** (29 pp.) — **still a closed draft** | [abdm.gov.in/strapicms/uploads/Draft_HDM_Policy_April2022_e38c82eee5.pdf](https://abdm.gov.in/strapicms/uploads/Draft_HDM_Policy_April2022_e38c82eee5.pdf) | Cover "Draft Health Data Management Policy / April 2022, Version 02"; every page footer "Draft Version 2" |

Evidence the **2020 version is still what ABDM serves**: the live abdm.gov.in React bundle hard-codes the download link to the December 2020 PDF; and the ABDM Strapi publications API ([`/strapicms/api/publications?populate=*`](https://abdm.gov.in/strapicms/api/publications?populate=*)) lists the 2022 document as *"Draft Revised Health Data Management Policy", status "Closed", publishedDate 2022-04-23*, catalogued under **Consultation Papers**, not as a notified policy.

**[UNVERIFIED]:** whether a final Version 2 was ever notified. The evidence points to "no", but that is a negative inferred from the website and CMS API, not from a gazette search.

⚠️ **Practical note:** abdm.gov.in is a React SPA — *every* `/publications/...`, `/documents/...` and `/assets/uploads/...` path returns HTTP 200 with a ~925-byte HTML shell rather than a 404. The three URLs in your brief all return that shell. Only `/strapicms/uploads/` paths serve real PDFs.

### 2.1 Definitions — Clause 4, Chapter I (Preliminary), verbatim

The anonymisation and de-identification wording is **byte-identical across 2020 and 2022**; only the lettering differs.

**"Anonymisation"** — 2020 Clause 4(a) / 2022 Clause 4(c):
> "'anonymisation' in relation to personal data, means such irreversible process of transforming or converting personal data to a form in which a data principal cannot be identified **through any means reasonably likely to be used** to identify such data principal;"

Note this tracks the **GDPR Recital 26 "means reasonably likely to be used" formula**, and is *stronger* than the PDP Bill 2019 definition it otherwise borrows (which keyed irreversibility to Authority-specified standards). It is the **only place in Indian health-data policy where the GDPR identifiability test appears.**

**"De-identification"** — 2020 Clause 4(j) / 2022 Clause 4(k):
> "'de-identification' means the process by which a data fiduciary or data processor may remove, or mask identifiers from personal data, or replace them with such other fictitious name or code that is unique to a data principal but does not, on its own, directly identify the data principal;"

**"Pseudonymisation"** — **2020 Clause 4(cc) ONLY**:
> "'pseudonymisation' means a data management and de-identification procedure by which personally identifiable information fields within a data record are replaced by one or more artificial identifiers, or pseudonyms;"

**⚠️ Material finding: the April 2022 draft DELETED the pseudonymisation definition entirely** — the string "pseudonym" appears zero times in the 29-page 2022 draft.

Supporting definitions:
- **"processing"** — 2020 4(bb)/2022 4(cc) — expressly lists **anonymisation as a form of processing**: "…may include operations such as collection, recording, organisation, structuring, storage, adaptation, alteration, **anonymisation**, retrieval, use, alignment or combination…". (Contrast DPDP Act s.2(x), which does not.)
- **"Personal Health Identifier" (PHI)** — 4(z), both — "…is the data that could potentially identify a specific data principal… **PHIs could also be used for re-identifying previously de-identified data.** It could include a data principal's demographic and location information, family and relationship information and contact details;"
- **"sensitive personal data"** — 4(ee), both — defined **by reference to Rule 3 of the SPDI Rules, 2011**, "and shall include official identifiers".
- **No definition of "re-identification"** exists in either version.

### 2.2 Processing anonymised/de-identified data — consent NOT required

**Clause 29, "Sharing of de-identified or anonymised data by data fiduciaries"** (Chapter VI). 2022 text is materially identical with NHA substituted for NDHM.

> "**29.1** Data fiduciaries may make anonymised or de-identified data in an aggregated form available as per the procedure set out in Clause 29.5 below for the purpose of facilitating health and clinical research, academic research, archiving, statistical analysis, policy formulation, the development and promotion of diagnostic solutions and such other purposes as may be specified by the NDHM."

> "**29.2** The NDHM shall set out a procedure through which any entity seeking access to anonymised or de-identified data under this Policy will be required to provide relevant information such as its name, purpose of use and nodal person of contact and, subject to approval being granted under this procedure, the anonymised or de-identified data under this Policy shall be made available to such entity on such terms as may be stipulated in this behalf."

> "**29.3** Any entity which is provided access to de-identified or anonymised data shall not, knowingly or unknowingly, take any action which has the effect of re-identifying any data principal or of such data no longer remaining anonymised."

> "**29.4** The data fiduciary which is undertaking to anonymise or de-identify data under this Policy shall be responsible for ensuring compliance with the procedure for such anonymisation or de-identification as set out by the NDHM in Clause 29.5 and any non-compliance will be dealt with as per Clause 35."

> "**29.5** The de-identification or anonymisation of data by a data fiduciary shall be done in accordance with technical processes and anonymisation protocols which may be specified by the NDHM in consultation with the MeitY."

> "**29.6** The technical processes and anonymisation protocols referred to in Clause 29.5 above shall be periodically reviewed by the NDHM and such review shall have regard to the nature and sensitivity of the data being processed, the risks of re-identification of data principals and the robustness of the anonymisation protocols."

**Analysis:**
- **Clause 29 contains no consent requirement.** Consent obligations sit in Chapter III (Clauses 7–14) and attach to "personal data". Once data is anonymised/de-identified **and aggregated**, Clause 29 permits sharing on an **administrative approval** basis (name + purpose + nodal contact) with no reference back to the data principal.
- Permitted purposes expressly include "health and clinical research, academic research, archiving, statistical analysis, policy formulation, **the development and promotion of diagnostic solutions**", plus an open-ended "such other purposes as may be specified".
- **Neither version contains the words "artificial intelligence", "machine learning" or "algorithm" anywhere.** AI training is nowhere expressly addressed; the nearest hooks are "development and promotion of diagnostic solutions" and the residual purposes limb. **Do not claim ABDM policy authorises AI training — it is silent.**
- **Clause 29.5 is a forward reference to a standard that does not exist.** See §2.6.

**Clause 31.2** (both versions), restriction on publication:
> "A database or record of any data which has been processed under this Policy shall not be made public, unless such database or record is in an anonymised/de-identified and aggregated form and is processed in accordance with the terms specified in Clauses 29.2 and 29.5 of this Policy."

**New in the 2022 draft only — Clause 13.5**, non-consensual processing of *identified* data:
> "13.5. The personal data of a data principal can be processed without consent in the following exceptional situations – a) Medical emergency where there is a threat to the life or health of the data principal; or b) Interest of Public health; or c) Order of the competent court."

No counterpart in 2020. "Interest of Public health" is undefined.

### 2.3 Consent framework, ABHA/Health ID, federated architecture, HIP/HIU/Consent Manager

**Consent — Clause 9, identical in both:**
> "**9.1** Data fiduciaries can collect or process personal data only with the consent of the data principal. It is the responsibility of the data fiduciary to ensure that the consent given by the data principal is valid."
> "**9.2** The consent of the data principal will be considered valid only if it is: (a) free, having regard to whether it complies with the standards set out under Section 14 of the Indian Contract Act, 1872; (b) informed, having regard to whether the data principal has been provided with the necessary information by way of notice, as set out in Clause 10 of this Policy, the scope of consent in respect of the purpose of processing; (c) specific, where the data principal can give consent for the processing of personal data for a particular purpose; (d) clearly given; and (e) capable of being withdrawn at any time, having regard to whether the ease of such withdrawal is comparable to the ease with which consent may be given."

**Health ID → ABHA.** 2020 Clause 15.4: "The personal data of a data principal shall be linked to his/her Health ID, and any data principal in possession of such a Health ID **shall be deemed to be the owner of such personal data.**" 2022 Clause 4(a): "'ABHA' (number) or 'Ayushman Bharat Health Account' (number) refers to the 14-digit Identification number allocated to a data principal in accordance with Chapter IV of this Policy".

**Two notable 2020→2022 regressions:**
- 2020 Clause 26.1: "the true **ownership and control** of the personal data will remain with data principals" → 2022: "the true **control** of the personal data will remain with data principals" (*ownership* deleted).
- 2020 Clause 1 guaranteed: "**The failure or refusal to make use of Aadhaar would not result in the denial of access to any health facility or service.**" The 2022 draft **drops this from the Purpose clause** and adds Clause 16.2: "**ABHA (number) shall be issued to data principal visiting government healthcare institutions or participating in government healthcare programs for availing healthcare services. This will be applicable across all government healthcare institutions and programs.**" — i.e. a shift from opt-in to default issuance in the public system. (A non-exclusion principle survives separately at 2022 Clauses 19, 22, 25.)

**"Federated architecture" — ⚠️ correction to your framing.** **There is no sentence in either policy stating that health data "is not centrally stored."** The federation claim is made twice in Clause 1 (Purpose), in these exact terms:
> "The National Digital Health Blueprint, 2019 ('Blueprint') recommends that **a federated architecture be adopted, instead of a centralised architecture,** for the management of digital health data to ensure interoperability, technological flexibility and independence across the National Digital Health Ecosystem ('NDHE')."
> "**The NDHE is based on the principle of federated architecture, which allows interoperability between independent and decentralized information systems, while enhancing the security and privacy of personal data of individuals.** Such interoperability shall be strictly compliant with the provisions relating to consent, and protection of personal data as set out under this Policy…"

"Records remain with the originating facility" is an accurate *description* of the architecture but is **not quotable from the policy**. Cite "federated architecture … instead of a centralised architecture", not "not centrally stored".

**Roles:**
- **HIP** — 2020 Clause 4(s): "'Health Information Provider' or 'HIPs' means hospitals, diagnostic centres, public health programs, or other such entities **registered with** the HFR or other entities which act as information providers (by generating, storing and distributing health records) in the digital health ecosystem;" (2022 Clause 4(r) identical except "**integrated with** the HFR").
- **HIU** — 4(t)/4(s), identical: "'Health Information Users' or 'HIUs' are entities that are permitted to request access to the personal data of a data principal and can access the same with the consent of the data principal in accordance with this Policy;"
- **Consent Manager** — 2020 Clause 4(e): "'consent manager' means an electronic system that interacts with the data principal and obtains consent from him/her for any intended access to personal data;" The 2022 draft replaces this throughout with **HIE-CM**, Clause 4(q): "'Health Information Exchange & Consent Manager' or 'HIE-CM' refers to digital system which facilitates exchange of health information and management of consent."
- **Consent artifact** — 4(d)/4(f): "a machine-readable document that specifies the parameters and scope of data sharing and access that a data principal consents to in any personal data sharing transaction;"
- **HIPs and HIUs are *deemed* data fiduciaries** — 4(g)/4(h): "…**For the purpose of this Policy, data fiduciaries would include Health Information Providers and Health Information Users if such entities are determining the purpose and means of processing of personal data**;"

### 2.4 Legal status — a guidance document, NOT legally binding ✅

The policy **self-describes as guidance**, identically in both versions, Clause 1:
> "**It acts as a guidance document across the NDHE and sets out the minimum standard for data privacy protection that should be followed across the board in order to ensure compliance with relevant and applicable laws, rules and regulations. This Policy will be dynamic in nature and may be revised from time to time as may be required.**"

And subordinates itself to law, Clause 1 final paragraph:
> "**This Policy is to be read along with, and not in contradiction to, any applicable law, or any instrument having the effect of any law** together with the Blueprint, policies relating to information security, guidelines relating to data retention and archival, or any other policies or guidelines which may be notified from time to time…"

Clause 5.3: "All entities to which this Policy is applicable must adhere to and comply with all applicable laws, and rules and regulations made thereunder, and any other standards pertaining to data protection, processing of personal or sensitive personal data, informational privacy, and information technology that may currently be in force in India."

**Enforcement — Clause 35, the only sanction it creates for itself:**
> "**35.1** Where any person to whom this Policy is applicable is found to be in violation of any of its provisions, **such person may not be permitted to participate in the NDHE. Additionally, any Facility ID or Healthcare Professional ID issued to any person under Chapter IV of this Policy, may be suspended or cancelled.**…"
> "**35.2** It is clarified that the above actions under this Clause shall be without prejudice to any other action that can be initiated under the provision of applicable laws."

**So: ecosystem exclusion / ID suspension only. No penalties, no fines, no adjudicatory body, no statutory backing, no rule-making power cited.** It binds participants contractually/administratively as a condition of ABDM participation, not as law.

Applicability (Clause 2) expressly extends to "**research bodies such as institutions, individual researchers including researchers utilising data for health data analytics, statisticians, analysts and public health institutions**".

**Relationship to the PDP Bill 2019 and DPDP Act 2023 — verified textually:**

Statutes actually cited in the **2020 policy**: SPDI Rules **2011**; IT (CERT-In) Rules **2013**; Indian Contract Act **1872** (s.14); Aadhaar Authentication for Good Governance Rules **2020**; National Health Policy **2017**; National Digital Health Blueprint **2019**. The **2022 draft** cites the same list minus the Aadhaar rules.

**⚠️ Key finding: NEITHER version cites the Personal Data Protection Bill, 2019 — not once — and neither cites the DPDP Act, 2023.** The common claim that the 2020 policy was "drafted against the PDP Bill 2019" is true as to **drafting provenance and vocabulary** (data principal / data fiduciary / data processor / significant harm / "data trust score" at Clause 26.2(f) — all PDP Bill 2019 terms of art) but **not as a matter of citation**. The policy is built on PDP Bill 2019 *terminology* while legally anchoring itself only to the **SPDI Rules 2011**.

**Consequences, stated plainly:**
- The policy's operative definition of "sensitive personal data" (Clause 4(ee)) points at **Rule 3 of the SPDI Rules 2011** — a category the **DPDP Act abolishes** from mid-May 2027. On that date the HDM Policy's sensitivity concept loses its statutory referent.
- Its whole architecture mirrors a Bill **withdrawn in August 2022**, four months after the V2 draft.
- **No NHA/ABDM revision aligning the HDM Policy to the DPDP Act 2023 was found.** The live site still serves the December 2020 text.

### 2.5 Retention, localisation, secondary use

**Retention — Clause 26.6.** 2020: "…The personal data collected will not be retained beyond the period necessary to satisfy the purpose for which it is collected… **Personal data may be retained for a longer period of time if specifically consented to by the data principal or if such retention is necessary to comply with any obligation under any applicable law.** The data fiduciary will undertake a periodic review…"

**2022 deltas:** adds an express localisation sentence — "**No personal data shall be stored beyond the geographical boundaries of India, subject always to the provision of applicable laws.**"; **deletes** the 2020 transfer-restriction sentence; **deletes** the consent-based longer-retention carve-out.

**Localisation:**
- **December 2020 policy: NO localisation or cross-border clause at all** (zero hits for "geographical boundaries", "cross-border", "outside India", "localis/localiz").
- **April 2022 draft:** one bare prohibition (quoted above), with no adequacy mechanism, no exceptions, no definition of "stored", and a "subject always to the provision of applicable laws" qualifier.

⚠️ Since the 2022 draft was never finalised, **the operative ABDM policy contains no data-localisation rule.** Do not claim ABDM mandates localisation.

**Secondary use for research/AI:** Clause 29.1 is the **entire** regime — see §2.2. Gated only by Clause 29.2 administrative registration, with the technical standard delegated to a Clause 29.5 protocol that does not exist, and **no mention of AI or model training anywhere**.

**HIU obligations — Clause 30.1:** personal data "shall not be used by the HIU for any purpose other than what was specified to the data principal at the time of obtaining his/her consent"; "shall not be disclosed further without obtaining the consent of the data principal"; (2022 30.1(d)) "shall not be retained beyond the period necessary for the purpose specified".

### 2.6 Separate NHA anonymisation framework — **EXPLICIT NEGATIVE FINDING** ❌

**No ABDM/NHA health-data anonymisation framework, de-identification standard, or anonymisation protocol appears to exist.** Clause 29.5's promised "technical processes and anonymisation protocols… specified by the NDHM [NHA] in consultation with the MeitY" **appears never to have been issued — an obligation outstanding since December 2020**, carried forward unchanged into the April 2022 draft.

Evidence for the negative:
1. **ABDM Strapi publications API** — the complete list of ABDM consultation papers/policies is only 7 items (UHI Operationalisation; Draft Revised HDM Policy; UHI; Drug Registry; Healthcare Professionals Registry; Proposed Health Data Retention Policy; Health Facility Registry). **No anonymisation item.**
2. **ABDM Strapi guidelines API** ([`/strapicms/api/guidelines?populate=deep`](https://abdm.gov.in/strapicms/api/guidelines?populate=deep)) — all 20 published guidelines enumerated (MVP guidance versions, EMR-EHR Standards for India 2016, HIP/HIU Guidelines ×2, Sandbox Guidelines, ABHA generation guidelines, various NHA HR/state guidelines). **No anonymisation, de-identification, or data-sharing-for-research guideline.**
3. **HIP/HIU Guidelines, both editions read in full** ([NDHM Aug 2020](https://abdm.gov.in/strapicms/uploads/hip_hiu_Policy_23d3cc3da6.pdf); [ABDM 24 Oct 2022](https://abdm.gov.in/strapicms/uploads/HIP_HIU_Guidelines_f85df336ec.pdf)) — **zero hits for anonymis*/de-identif*/pseudonym* in either.**
4. **Health Data Retention Policy** exists only as **[Consultation Paper 04/2021](https://abdm.gov.in/strapicms/uploads/Consultation_Paper_on_Health_Data_Retention_Policy_21_28557f9a6a.pdf)** (Nov 2021, comments closed 24 Dec 2021, status "Closed", never finalised). Its §4.4 "Anonymization and Pseudonymization" is the closest NHA has come, and it **expressly disclaims any standard**:
   > "Alternatives that are sometimes used instead of deletion are anonymization and pseudonymization. Pseudonymized data might still allow for some re-identification, while anonymous data cannot be re-identified… No personal data is to be processed or stored in anonymized/pseudonymized form by any person/entity/Data Fiduciary except for any specific, clear, and lawful purpose and without informed consent of Data Principal… **The process and method of anonymization/pseudonymization may be organization specific and may depend on Data Fiduciary, data processors, data sub processors, etc.**"

   ⚠️ Note this paper's consent position ("…and without informed consent of Data Principal") **conflicts with HDMP Clause 29**, which requires no consent for anonymised/de-identified aggregated data. Neither document reconciles them, and the paper was never finalised.
5. **No separate "Health Data Consent Manager guidelines" found** for 2023 or 2024. HIE-CM is governed inside the HDMP itself and the HIP/HIU Guidelines. **[UNVERIFIED]** whether an internal/technical HIE-CM onboarding spec exists — `sandbox.abdm.gov.in/docs/` returned HTTP 503 throughout.
6. **NHA Data Privacy Policy v2.0** is a separate, **PM-JAY-oriented** instrument (live page is a JS shell; read via [Web Archive](https://web.archive.org/web/2024/https://nha.gov.in/NHA-data-privacy-policy-v2.0.html)) with its own definition — "'Anonymization' is the irreversible process of transforming or converting personal data to a form in which a data principal cannot be identified" — and lines such as "The data to be shared with the fraud management system shall be anonymized/de-identified to protect privacy of beneficiaries". **It too prescribes no technique or standard.** **[UNVERIFIED]:** date/version of the archived capture.

**Summary for India: three instruments promise an anonymisation standard (ABDM Clause 29.5, MeitY's withdrawn 2022 draft, the 2019 Bill's Authority power) and none delivered one. The DPDP Act removed the power to make one.**

---

## 3. UK ICO anonymisation guidance

*Researched by delegated agent from live ico.org.uk pages and the UK Government Web Archive.*

### 3.1 The 2012 code of practice — removed, no formal withdrawal notice found

The 2012 *Anonymisation: managing data protection risk code of practice* is **no longer published on ico.org.uk**. The old URL `https://ico.org.uk/media/1061/anonymisation-code.pdf` now returns:
```
HTTP/2 301
location: /for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/
```
**[UNVERIFIED]:** no ICO page formally stating the 2012 code is withdrawn could be located. State it accurately as: *removed from the ICO website and superseded in practice by the March 2025 guidance; no formal ICO withdrawal notice found.* Archived PDF: [webarchive.nationalarchives.gov.uk/ukgwa/20220222181339mp_/https://ico.org.uk/media/1061/anonymisation-code.pdf](https://webarchive.nationalarchives.gov.uk/ukgwa/20220222181339mp_/https://ico.org.uk/media/1061/anonymisation-code.pdf). Archive timemap shows captures up to 2022 return the PDF; captures from July 2025 return only the redirect.

### 3.2 The new guidance — final version PUBLISHED 28 March 2025

**Current URL: [ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/)**

From [About this guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/about-this-guidance/), verbatim:
> "Latest updates - 28 March 2025 / 28 March 2025 - this guidance was published."
> "**This guidance is not a statutory code.** It contains advice on how to interpret relevant law on anonymisation and pseudonymisation. It also contains good practice recommendations."

⚠️ **Current status banner on every page (as of 16 Sep 2026), verbatim:**
> "Due to changes made by the **Data (Use and Access) Act**, this guidance is under review and may be subject to change."

**Draft chapter history** (all consulted 2021–2022, now superseded): Ch.1 Introduction (May 2021), Ch.2 How do we ensure anonymisation is effective? (Oct 2021), Ch.3 Pseudonymisation (Feb 2022), Ch.4 Accountability and governance (Mar 2022), Ch.5 PETs (Sept 2022). The ICO's [call-for-views page](https://ico.org.uk/about-the-ico/ico-and-stakeholder-consultations/2023/12/ico-call-for-views-anonymisation-pseudonymisation-and-privacy-enhancing-technologies-guidance/) (status: Closed) explains the split: "we now intend to produce two separate guidance products: Anonymisation and pseudonymisation guidance. Privacy-enhancing technologies guidance." and "The anonymisation and pseudonymisation guidance has been paused for review from 2023 to 2024… to allow the Data Protection and Digital Information Bill to progress through Parliament".

**⚠️ Directly relevant to you: the "anonymisation and research" chapter was NOT in the March 2025 publication and is OUT FOR CONSULTATION RIGHT NOW.**
- [Consultation on draft guidance about anonymisation](https://ico.org.uk/about-the-ico/ico-and-stakeholder-consultations/2026/08/consultation-on-draft-guidance-about-anonymisation/) — **Start 24 August 2026, closes 19 October 2026, Status: OPEN**
- Draft PDF: [Anonymisation, pseudonymisation and research (August 2026)](https://ico.org.uk/media2/goaamspg/draft-guidance-on-the-use-of-anonymisation-and-pseudonymisation-for-research-purposes.pdf)

**PETs guidance — finalised 19 June 2023** (your "June 2023" is right; the precise date is the 19th). [URL](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/privacy-enhancing-technologies/), verbatim: "19 June 2023 - we have created new PETs guidance, which is aimed at data protection officers and others who are using large personal data sets in finance, **healthcare**, research, and central and local government". Covers differential privacy, synthetic data, homomorphic encryption, zero-knowledge proofs, trusted execution environments, SMPC, private set intersection, and federated learning. Same DUAA "under review" banner.

### 3.3 The motivated intruder test — verbatim

From [How do we ensure anonymisation is effective?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/#motivatedintruder):

> "**What is the 'motivated intruder' test?**
> Data protection law does not specify how you determine whether the anonymous information you release is likely to result in the identification of a person.
> You must consider all practical steps and means that are reasonably likely to be used by someone motivated to identify people whose personal data was used to derive anonymous information.
> This is known as the motivated intruder test. You must use this test to help you to assess the identifiability risk of (apparently) anonymous information.
> Both the ICO and the First-tier Tribunal (General Regulatory Chamber), which deals with information rights appeals, use this test.
> You should adopt a motivated intruder test as part of your risk assessment. You should also use the test as part of any review, both of your overall risk assessment and the techniques you use to achieve effective anonymisation.
>
> **Who is a motivated intruder?**
> A motivated intruder is someone who wishes to identify a person from the anonymous information that is derived from their personal information. The test assesses whether the motivated intruder is likely to be successful.
> You should assume that a motivated intruder is someone that:
> - is reasonably competent;
> - has access to appropriate resources (eg the internet, libraries, public documents); and
> - uses investigative techniques (eg making enquiries with people who may have additional knowledge about a person, or advertising for anyone with that knowledge to come forward).
>
> The intruder is therefore someone who is motivated to access the personal data you hold in order to establish whether it relates to people and, if so, to identify them… You should assess the means that are reasonably likely to be used by a determined person with a particular reason to want to identify people. Intruders may be investigative journalists, estranged partners, stalkers, industrial spies or researchers attempting to demonstrate anonymisation weaknesses. You should consider whether these type of intruders may be reasonably likely to use specialist resources and expertise to achieve identification."

Also: "Depending on the perceived value of the data to them, a motivated intruder may well use specialist knowledge or equipment or resort to criminal acts to gain access to the data and to seek to identify the people it relates to." and "The intruder can be someone who is not intended to have access to the information, or someone who is permitted access to it."

[Glossary](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/glossary/#motivatedintruder):
> "**Motivated intruder:** someone who wishes to identify a person from the anonymous information that is derived from their personal data. Motivated intruders are sometimes referred to as attackers, snoopers or adversaries."
> "**Motivated intruder test:** a test which consider all the practical steps and all the means that are reasonably likely to be used by someone who is motivated to identify the people whose personal data the anonymous information is derived from. The test is used to assess the identifiability risk of (apparently) anonymous information."
> *(The grammatical slip "a test which consider" is in the ICO original — reproduce with [sic] if quoting.)*

### 3.4 Pseudonymised data remains personal data — verbatim

From [Pseudonymisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/#pseudonymiseddatastillpersonal):

> "**Is pseudonymised data still personal data?**
> **Yes. Pseudonymised data is personal data in the hands of someone who holds the additional information.**
> However, it does not change the status of the data as personal data when you process it in this way.
> This is because data protection law is clear that information is personal data if a person is identified or identifiable, directly or indirectly.
> The core definition of pseudonymisation describes it as processing of personal data in a particular manner. Additionally, Recital 26 of the UK GDPR says that:
> '…personal data which have undergone pseudonymisation, which could be attributed to a natural person by the use of additional information should be considered to be information on an identifiable natural person…'
> **If you share pseudonymised data (but not the additional information) with another organisation, it may be anonymous information in their hands.**"

From the same page's "At a glance":
> "Pseudonymised personal data is in scope of data protection law."
> "**Take care not to confuse pseudonymisation with anonymisation. Pseudonymisation is a way of reducing risk and improving security. It is not a way of transforming personal data to the extent the law no longer applies.**"

**The ICO's "whose hands?" doctrine** — directly relevant to the SRB case below:
> "Do we need to consider who else may be able to identify people from the data? Yes… This can sometimes be known as the '**whose hands?**' question. This is about the status of the information in the different 'hands' of those who process it.
> You should note that the 'whose hands' approach only applies when disclosing information to an organisation who is not acting with you as a joint controller or as your processor. For example, if the information is personal data in your hands, it will also be personal data in the hands of any joint controllers, regardless of their technical or contractual ability to identify the people it relates to. Similarly, a processor only processes personal data on your behalf. This means the status of the data in your hands is what matters."

---

## 4. GDPR

*EUR-Lex and curia.europa.eu block direct fetching (AWS WAF / Angular SPA respectively). Texts were retrieved via the EU Publications Office cellar service (`publications.europa.eu/resource/celex/<CELEX>`), which serves the identical official EUR-Lex manifestations for CELEX 32016R0679, 62023CJ0413 and 62020TJ0557.*

### 4.1 Recital 26 — verbatim, in full

[eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679) · cross-check [gdpr-info.eu/recitals/no-26/](https://gdpr-info.eu/recitals/no-26/)

> "(26) The principles of data protection should apply to any information concerning an identified or identifiable natural person. **Personal data which have undergone pseudonymisation, which could be attributed to a natural person by the use of additional information should be considered to be information on an identifiable natural person.** To determine whether a natural person is identifiable, account should be taken of **all the means reasonably likely to be used**, such as singling out, either by the controller or by another person to identify the natural person directly or indirectly. To ascertain whether means are reasonably likely to be used to identify the natural person, account should be taken of all objective factors, such as the costs of and the amount of time required for identification, taking into consideration the available technology at the time of the processing and technological developments. **The principles of data protection should therefore not apply to anonymous information, namely information which does not relate to an identified or identifiable natural person or to personal data rendered anonymous in such a manner that the data subject is not or no longer identifiable. This Regulation does not therefore concern the processing of such anonymous information, including for statistical or research purposes.**"

Recital 26 is a **single paragraph of six sentences** — there is no second paragraph. (The OJ text has no comma after "by another person".)

### 4.2 Article 4(1) and 4(5) — verbatim

Article 4 opens "For the purposes of this Regulation:"

> "**(1)** 'personal data' means any information relating to an identified or identifiable natural person ('data subject'); an identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity of that natural person;"

> "**(5)** 'pseudonymisation' means the processing of personal data in such a manner that the personal data can no longer be attributed to a specific data subject without the use of additional information, provided that such additional information is kept separately and is subject to technical and organisational measures to ensure that the personal data are not attributed to an identified or identifiable natural person;"

### 4.3 Pseudonymised data IS personal data — the citation chain

1. **Recital 26, sentence 2** is the express statement (quoted above).
2. **Art. 4(5)** defines pseudonymisation as "the processing of **personal data**" — input and output are, by definition, personal data being processed. GDPR treats it as a *safeguard*, not a status change: Arts. 6(4)(e), 25(1), 32(1)(a), Recital 28.
3. **Art. 4(1)** makes indirect identifiability sufficient.
4. **⚠️ Post-SRB nuance — state this carefully.** Recital 26 sentences 3–4 gate the analysis by "means reasonably likely to be used", and the CJEU has now held this is assessed by reference to the persons who actually have or may have access to such means. So the accurate formulation is: **pseudonymised data is personal data in the hands of anyone holding (or lawfully able to obtain) the additional information — always the controller who pseudonymised it — but it is not automatically personal data for every recipient in every circumstance.** The ICO says precisely the same ("If you share pseudonymised data (but not the additional information) with another organisation, it may be anonymous information in their hands").

### 4.4 CJEU Case C-413/23 P, EDPS v SRB — JUDGMENT DELIVERED ✅

**Court of Justice (First Chamber), 4 September 2025, ECLI:EU:C:2025:645, CELEX 62023CJ0413.**
[eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A62023CJ0413](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A62023CJ0413) · [curia case page](https://curia.europa.eu/juris/liste.jsf?num=C-413/23) · [Press release No 107/25](https://curia.europa.eu/site/upload/docs/application/pdf/2025-09/cp250107en.pdf)

Rapporteur: T. von Danwitz (Vice-President). AG D. Spielmann, Opinion 6 February 2025. EDPB intervened for the EDPS; the Commission for the SRB.

**⚠️ IMPORTANT CAVEAT for citation:** the case is decided under **Regulation (EU) 2018/1725** (the EU institutions' regulation), Arts. 3(1) and 3(6) — **not GDPR Arts. 4(1)/4(5) directly.** The Court expressly requires homogeneous interpretation, **para 52**:
> "As a preliminary point, it should be noted that the definition of the concept of 'personal data' set out in Article 3(1) of Regulation 2018/1725 is essentially identical to that in Article 4(1) of the GDPR… In order to ensure uniform and consistent application of EU law, it is therefore necessary to ensure that Article 3(1) of Regulation 2018/1725, Article 4(1) of the GDPR and Article 2(a) of Directive 95/46 are interpreted in the same way…"

**Operative part, verbatim:**
> "1. Sets aside the judgment of the General Court of the European Union of 26 April 2023, SRB v EDPS (T‑557/20, EU:T:2023:219);
> 2. Refers Case T‑557/20 back to the General Court of the European Union;
> 3. Reserves the costs."

So the **EDPS won the appeal** — but the substantive law on pseudonymised data largely went the SRB's way.

**Key holdings — verbatim:**

Rejection of the "absolute" approach, **para 86**:
> "It follows that, contrary to what the EDPS maintains, **pseudonymised data must not be regarded as constituting, in all cases and for every person, personal data** for the purposes of the application of Regulation 2018/1725, in so far as pseudonymisation may, depending on the circumstances of the case, effectively prevent persons other than the controller from identifying the data subject in such a way that, for them, the data subject is not or is no longer identifiable."

Pseudonymisation is not part of the definition, **paras 72–73**:
> "[72] …pseudonymisation is therefore not part of the definition of 'personal data', but refers to the establishment of technical and organisational measures to reduce the risk of a data set being correlated with the identity of data subjects."
> "[73] …the concept of 'pseudonymisation' presupposes the existence of information enabling the data subject to be identified. The very existence of such information precludes data that have undergone pseudonymisation from being regarded, in all cases, as anonymous data…"

**The recipient-side test — the two conditions, para 77:**
> "As regards Deloitte, to which the SRB transmitted pseudonymised comments, the technical and organisational measures referred to in Article 3(6)… may… have the effect that, for that company, those comments are not personal in nature. However, that presupposes, **first**, that Deloitte is not in a position to lift those measures during any processing of the comments which is carried out under its control. **Second**, those measures must in fact be such as to prevent Deloitte from attributing those comments to the data subject **including by recourse to other means of identification such as cross-checking with other factors**, in such a way that, for the company, the person concerned is not or is no longer identifiable."

"Means reasonably likely to be used", **paras 80, 82, 87**:
> "[80] …those clarifications relating to the assessment of whether or not the data subject is identifiable would be deprived of any practical effect if pseudonymised data were to be regarded as constituting, in all cases and for every person, personal data…"
> "[82] …the Court has previously held that a means of identifying the data subject is not reasonably likely to be used where the risk of identification appears in reality to be insignificant, in that the identification of that data subject is prohibited by law or impossible in practice, for example because it would involve a disproportionate effort in terms of time, cost and labour (see, to that effect, judgment of 7 March 2024, *OC v Commission*, C‑479/22 P, EU:C:2024:215, paragraph 51…)."
> "[87] …it refers only to persons who have or may have access to the means reasonably likely to be used for the purposes of identifying the data subject."

**The anti-circumvention limit — onward transfers, para 85:**
> "…in so far as it cannot be ruled out that those third parties have means reasonably allowing them to attribute pseudonymised data to the data subject, such as cross-checking with other data at their disposal, the data subject must be regarded as identifiable as regards both that transfer and any subsequent processing of those data by those third parties. In such circumstances, **pseudonymised data should be considered to be personal in nature.**"

**BUT — transparency duties are judged from the CONTROLLER's perspective (where the EDPS won), paras 111, 120:**
> "[111] Accordingly, it must be held that, for the purposes of applying the obligation to provide information laid down in Article 15(1)(d) of Regulation 2018/1725, **the identifiable nature of the data subject must be assessed at the time of collection of the data and from the point of view of the controller.**"
> "[120] …It is not disputed between the parties that the SRB had, as controller, all the information necessary to identify the authors of those comments. It follows… that the information at issue constitutes personal data."

Also held (**paras 58–60**): subjective opinions "relate to" their author without any content/purpose/effect test — "personal opinions or views which, as an expression of a person's thinking, are necessarily closely linked to that person."

**⚠️ Precise characterisation — do not say "the CJEU adopted the relative approach" flatly.** The Court adopted a **context-dependent** approach: *whose* perspective governs depends on the obligation and processing at issue. For classifying data transmitted to a recipient, identifiability is assessed from **that recipient's** position (paras 75–77, 86–87), subject to the two para-77 conditions and the para-85 anti-circumvention rule. For the Art. 15(1)(d) **transparency duty**, it is assessed at collection from the **controller's** position (para 111). The General Court's error was **not** the relative approach as such — the CJEU expressly *confirmed* that — but applying it to the transparency obligation, and requiring a content/purpose/effect test for opinions.

**Earlier General Court judgment — T-557/20, SRB v EDPS, 26 April 2023, ECLI:EU:T:2023:219**, CELEX 62020TJ0557 ([EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A62020TJ0557)). Annulled the EDPS's revised decision of 24 November 2020. Key holdings:
> "[97] …it is apparent from the judgment of 19 October 2016, *Breyer* (C‑582/14, EU:C:2016:779), that, in order to determine whether the information transmitted to Deloitte constituted personal data, it is necessary to put oneself in Deloitte's position…"
> "[103] …the EDPS merely examined whether it was possible to re-identify the authors of the comments from the SRB's perspective and not from Deloitte's."
> "[105] Therefore, since the EDPS did not investigate whether Deloitte had legal means available to it which could in practice enable it to access the additional information necessary to re-identify the authors of the comments, the EDPS could not conclude that the information transmitted to Deloitte constituted information relating to an 'identifiable natural person'…"

**[UNVERIFIED]:** whether the General Court has ruled on remittal (the case went back on the second plea, right of access to the file; costs reserved). No renvoi judgment was found, and curia's search interface could not be scraped. Treat "still pending on remittal" as unconfirmed.

---

## Consolidated cautions — things NOT to say

1. ❌ "The DPDP Act exempts anonymised data." → It is **silent**. The exclusion is an inference from s.2(t), not a carve-out.
2. ❌ "The 2019 Bill's s.91 carved out anonymised data." → The carve-out was **clause 2(B)**; clause 91 was a government *access* power over anonymised/non-personal data.
3. ❌ "Health data is sensitive personal data under Indian law." → It **is** today, under SPDI Rule 3. It **will not be** once DPDP s.44(2) commences (mid-May 2027). Always tense this.
4. ❌ "The DPDP Act is in force." → Sections **3–17 are not yet in force**; nor are Rules 6, 7 and 16. Only definitions, Board machinery, rule-making powers and the TRAI/RTI amendments are live as of 16 Sep 2026.
5. ❌ "The SPDI Rules 2011 have been repealed." → s.43A's omission is **not yet commenced**. (And whether omission auto-voids the Rules is itself an open construction point.)
6. ❌ "ABDM policy says health data is never centrally stored." → It says a "**federated architecture** … instead of a centralised architecture". The "not centrally stored" phrasing is not in the text.
7. ❌ "ABDM permits anonymised data to be used for AI training." → The words "artificial intelligence", "machine learning" and "algorithm" **appear nowhere** in either version. The nearest hooks are "development and promotion of diagnostic solutions" and a residual purposes limb.
8. ❌ "ABDM mandates data localisation." → Only the **never-finalised** April 2022 draft did. The operative December 2020 policy has **no** localisation clause.
9. ❌ "The ABDM HDM Policy is binding." → It **self-describes as "a guidance document"**; its only self-created sanction is ecosystem exclusion / ID suspension.
10. ❌ "NHA has an anonymisation framework." → **None found.** HDMP Clause 29.5 promises one; it has been outstanding since December 2020.
11. ❌ "Pseudonymised data is always personal data under GDPR." → True for the controller holding the additional information; **not automatic for every recipient** after *EDPS v SRB* (C-413/23 P, 4 Sept 2025). Use the ICO's formulation.
12. ❌ "The ICO's 2012 code is withdrawn." → It was **removed and redirected**; no formal withdrawal notice was found.
13. ⚠️ **Terminology trap:** ICMR 2017 uses "anonymized" as an umbrella covering the *reversible* case ("coded or reversibly anonymized"). GDPR/ICO would call that **pseudonymised**. Never map the two without flagging it.

## Open items worth a follow-up

- Exact 18-month commencement date (13 vs 14 May 2027) — resolve from the e-gazette publication date.
- Whether G.S.R. 843(E) is retrievable from a `.gov.in` host (I could only get a reproduction).
- Whether any notification expressly rescinds the SPDI Rules, and the s.24 General Clauses Act analysis.
- Whether a final ABDM HDM Policy v2 was ever gazetted (an unread press release exists at `abdm.gov.in/strapicms/uploads/HDM_Press_Release_48807ee0b7.pdf`).
- The ICO's August 2026 draft **anonymisation-and-research** guidance closes **19 October 2026** — if this feeds a published position, that consultation is still open and worth tracking.
- Whether the General Court has ruled on remittal in T-557/20.

**Local artefacts:** all downloaded PDFs and extracted text are in the session scratchpad (`/private/tmp/claude-502/-Users-manish-manish-dev-yajur-ai/1ce82aaf-880b-44e5-ad53-c6fbb84725c7/scratchpad/`) — `dpdp.pdf/.txt`, `rules_meity.pdf/.txt`, `rules_en.txt`, `gsr843.pdf/.txt`, `spdi.pdf/.txt`, `pdp2019.pdf/.txt`, `icmr.pdf/.txt`, `icmrai.pdf/.txt`, `faq.pdf/.txt`, plus the ABDM agent's `cand1/cand2/retention` files. **No files in the project repo were created or modified.** Research was read-only throughout.
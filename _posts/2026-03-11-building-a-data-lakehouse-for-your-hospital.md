---
layout: post
title: "Building a Data Lakehouse for Your Hospital: An Open Source Guide to Local Health Intelligence"
date: 2026-03-11 10:00:00 +0530
last_modified_at: 2026-03-11 10:00:00 +0530
author: "Manish Sharma"
description: "A practical guide for healthcare organisations of any size to build an open source data lakehouse on-premise — and use it to generate neighbourhood health intelligence that improves patient outcomes and enables community wellness programmes."
keywords: "data lakehouse healthcare, open source healthcare data, hospital data infrastructure, MinIO healthcare, DuckDB healthcare, Apache Iceberg healthcare, Metabase hospital analytics, FHIR data lakehouse, ABDM data lakehouse India, population health intelligence, neighbourhood wellness hospital, healthcare data platform open source, hospital data engineering India, data warehouse vs data lake healthcare, HAPI FHIR open source, health data sovereignty India, DPDP Act healthcare data, community health analytics India, 50 bed hospital data, small hospital analytics, HIS data integration, hospital EMR data pipeline, readmission prediction open source, diabetes surveillance hospital, maternal health analytics, dengue early warning hospital, healthcare AI infrastructure India, clinical data platform, Yajur healthcare data"
tags:
  - healthcare
  - data-engineering
  - open-source
  - population-health
  - India
  - ABDM
  - data-lakehouse
  - hospital-analytics
  - digital-health
  - health-infrastructure
categories:
  - Technology
  - Healthcare Innovation
reading_time: "15 min read"
og_title: "Building a Data Lakehouse for Your Hospital: An Open Source Guide to Local Health Intelligence"
og_description: "A practical guide for healthcare organisations of any size to build an open source data lakehouse on-premise — and use it to generate neighbourhood health intelligence that improves patient outcomes."
og_type: article
twitter_card: summary_large_image
article_section: "Healthcare Data Engineering"
word_count: 3800
---

### Every hospital is already a data organisation. Most just don't know it yet.

Every admission form filled out at the front desk, every lab result printed and filed, every discharge summary dictated by a physician, every OPD card stamped and returned to a shelf — each is a data point. Over a year, a 50-bed hospital generates tens of thousands of them. Over a decade, it generates an irreplaceable record of the health of an entire neighbourhood.

And almost none of it is being used.

The data exists. The patterns are there. The early signals of an emerging diabetes epidemic in a nearby residential colony, the seasonality of respiratory admissions correlated with construction dust on a new highway project, the families who always return three weeks after discharge because no one followed up — all of this information is embedded in records that sit in filing cabinets, in disconnected software systems, or in spreadsheets on a single administrator's laptop.

This guide is for healthcare organisations that want to change that. It is a practical, implementation-ready guide to building a **data lakehouse** using **open source tools**, **on your own infrastructure**, at a cost that a 50-bed hospital can justify — and with an architecture that scales as you grow. It is written for three readers at once: the medical director who wants to understand why this matters, the CTO or IT head who needs to select the right tools, and the developer or analyst who will actually build it.

By the end of this guide, you will understand what a data lakehouse is, which open source tools to use and why, how to get your first version running in 30 days, and — critically — how to use it to generate **local health intelligence** that lets your hospital serve its neighbourhood, not just its ward census.

---

### What Is a Data Lakehouse — and Why Should a Hospital Care?

The term sounds technical. The concept is not.

A traditional hospital database — whether it is your Hospital Information System, your LIMS, or your billing software — is designed to answer one question at a time: *What is this patient's blood group? What was today's revenue? How many beds are occupied right now?* It is optimised for fast, transactional answers to known questions. It is terrible at answering questions you did not know you needed to ask.

A **data lake** was the first attempt to fix this. The idea: dump all your data into one place, store everything, figure out the structure later. In practice, data lakes became swamps — vast, disorganised, and nearly impossible to analyse reliably because nothing was governed or structured.

A **data warehouse** took the opposite approach: impose rigorous structure before storing anything, optimise for analytical queries, but only accept data that fits a predefined schema. Rigid, reliable, but slow to change and expensive to operate.

A **data lakehouse** is the architecture that unifies both. It stores data in its raw, flexible form — like a lake — but adds a **transactional layer** on top that enforces schema, supports versioning, enables ACID-compliant queries, and makes the data as reliable and queryable as a warehouse. You get the flexibility to store any data type (structured records, clinical notes, DICOM metadata, FHIR bundles) alongside the reliability to run analytical queries across all of it.

For a hospital, this means one thing: **all your data, in one place, queryable together.**

The admission record sits next to the lab result sits next to the discharge summary sits next to the follow-up call log. A question like *"Show me all diabetic patients from pin code 560034 who were discharged in the last six months and have not returned for a follow-up"* — a question that today would require three different departments, two software systems, and a week of manual reconciliation — becomes a query that runs in seconds.

That is not a technology achievement. That is a clinical capability.

---

### Why Open Source — and Why Now

Until recently, the infrastructure required to build a data lakehouse was the preserve of large health systems with dedicated data engineering teams and enterprise software budgets. The tools either did not exist in open source form, or they required significant expertise to operate.

That has changed fundamentally over the last three years.

The open source ecosystem for data infrastructure has matured to a point where production-grade, enterprise-quality tools are available at zero licensing cost. The same table format that powers petabyte-scale analytics at global technology companies — **Apache Iceberg**, **Delta Lake** — can be deployed on a single server in a hospital's IT room. The same query engine used by large e-commerce platforms — **Trino**, **DuckDB** — runs on commodity hardware. The same visualisation tools used by sophisticated analytics teams — **Apache Superset**, **Metabase** — can be self-hosted and configured by a hospital's IT administrator in an afternoon.

There are three additional reasons why open source matters specifically for healthcare organisations in India:

**Data sovereignty.** India's Digital Personal Data Protection Act (DPDP Act, 2023) places obligations on healthcare organisations as data fiduciaries. Patient health data is among the most sensitive categories. An open source, on-premise lakehouse means your data never leaves your infrastructure. No cloud vendor holds your patient records. No SaaS contract governs your access to your own data. You are the custodian, completely.

**Cost at realistic scale.** A 50-bed hospital does not have the budget for a six-figure enterprise analytics platform. The open source stack described in this guide can be deployed on hardware that costs less than ₹2–3 lakh as a one-time purchase, with no recurring licensing cost. The investment is in your own infrastructure and your own team's capability — both of which compound over time.

**Independence from vendor roadmaps.** When your analytics capability depends on a vendor's product, your capability evolves at the vendor's pace and in the vendor's direction. An open source stack evolves in the direction your hospital needs, extended and modified by your own team or by the community building these tools.

The moment is right. The tools are ready. The question is how to select and assemble them.

---

### The Architecture: Three Layers, One Unified Platform

A hospital data lakehouse has three functional layers. Understanding what each layer does — and which open source tools serve each function — is the foundation for making good technology choices.

**Layer 1: Ingestion and Storage**

This layer is responsible for getting data into the lakehouse and storing it durably. Data arrives from multiple sources: your Hospital Information System (HIS) or EMR exports structured records; clinical staff generate unstructured text in discharge summaries and clinical notes; laboratories produce result files; medical devices produce DICOM imaging metadata; ABDM-connected systems produce FHIR bundles.

At the storage level, the lakehouse uses **object storage** — a file system designed for large volumes of data stored as files, accessible via a standard API. MinIO is the leading open source implementation. It runs on a single server or a cluster of servers, is S3-compatible (meaning any tool that can read Amazon S3 can read MinIO without modification), and can store structured data files, raw text, images, and any other format.

On top of the object storage, a **table format layer** organises stored files into queryable tables with versioning and schema enforcement. **Delta Lake** (created by Databricks, fully open source) is the most accessible starting point. **Apache Iceberg** is the more advanced option, with superior support for very large tables and concurrent writes.

**Layer 2: Processing and Transformation**

Raw data from your HIS is not immediately useful for analysis. Dates may be stored as strings. Patient identifiers may differ between systems. Diagnoses may use local codes rather than standard ICD-10. This layer is responsible for cleaning, standardising, and enriching data before it is available for analysis.

For lightweight processing — appropriate for a 50-bed hospital — **DuckDB** is the tool of choice. It is an embedded analytical database that runs in-process, requires no server, and can query Parquet files and Delta tables directly with standard SQL. It is extraordinarily fast for datasets of the size a small hospital generates and can be operated by anyone who knows SQL.

For heavier workloads, **Apache Spark** provides distributed processing across multiple machines. **dbt** (data build tool) provides a structured, version-controlled framework for writing and running SQL-based transformations — making your data pipeline code as maintainable and auditable as your application code.

**Orchestration** — scheduling and sequencing these transformations — is handled by **Apache Airflow** (full-featured, widely adopted) or **Prefect** (simpler to operate, excellent for small teams).

**Layer 3: Intelligence and Visualisation**

This is the layer that clinicians and administrators interact with. It encompasses dashboards, ad-hoc queries, and machine learning models.

**Metabase** is the recommended starting point: open source, self-hosted, requires no SQL knowledge to use (though SQL access is available), and produces clean, shareable dashboards that non-technical staff can interpret. **Apache Superset** is the more powerful option, supporting a wider range of visualisation types and suitable for more sophisticated analytical use cases.

For machine learning — readmission prediction, risk stratification, population clustering — **MLflow** provides experiment tracking, model versioning, and a model registry. **Jupyter** provides the interactive notebook environment for developing and iterating on models.

For FHIR-based data from ABDM, **HAPI FHIR** is the open source reference implementation of the HL7 FHIR standard. It provides a complete FHIR server that can store, validate, and serve FHIR resources, and integrates with the lakehouse as both a data source and a data consumer.

---

### Open Source Solutions Landscape: What Exists, What to Use, and When

The table below maps the lakehouse architecture to specific open source tools, organised by hospital size and IT maturity.

| Layer | Function | Tier 1: 50-bed | Tier 2: 100–300 bed | Tier 3: 300+ bed |
|---|---|---|---|---|
| **Storage** | Object storage | MinIO (single server) | MinIO (replicated) | MinIO (distributed cluster) |
| **Table format** | Structured data on object storage | Delta Lake | Delta Lake / Iceberg | Apache Iceberg |
| **Ingestion** | Pulling data from source systems | Airbyte | Airbyte / Apache NiFi | Apache NiFi + Kafka |
| **Processing** | Transformation and enrichment | DuckDB | DuckDB + dbt | Apache Spark + dbt |
| **Orchestration** | Scheduling pipelines | Prefect | Apache Airflow | Apache Airflow |
| **Query engine** | Ad-hoc analysis | DuckDB | Trino | Trino |
| **Visualisation** | Dashboards and reporting | Metabase | Apache Superset | Apache Superset |
| **ML platform** | Model development and tracking | Jupyter + MLflow | Jupyter + MLflow | MLflow + Ray |
| **FHIR layer** | ABDM / FHIR data handling | HAPI FHIR | HAPI FHIR | HAPI FHIR |

Every tool in this table is fully open source and production-ready. Every tool runs on-premise. None requires a cloud account, a vendor contract, or per-user licensing.

---

### How to Select Your Stack: A Three-Question Framework

Before deploying any software, answer these three questions honestly. Your answers determine your starting configuration.

**Question 1: What data do you already have in digital form?**

- *Most data is still on paper, or in a basic HIS with limited export capability:* Start with Tier 1. Your primary challenge is data capture and basic ingestion. DuckDB + MinIO + Metabase gives you the ability to analyse whatever structured data you can export, while you build ingestion for the rest.
- *You have a functional HIS or EMR that exports to CSV or SQL:* Tier 1 or 2, with Airbyte configured to pull from your HIS database on a nightly schedule.
- *You are ABDM-connected and generating FHIR resources:* Add HAPI FHIR to your stack from day one. Your FHIR data is already structured to an international standard; ingesting it into the lakehouse gives you longitudinal patient timelines immediately.

**Question 2: What is your IT team's current capacity?**

- *One IT person, primarily managing hardware and networks:* Tier 1 only. MinIO + DuckDB + Metabase can be installed and operated by a single generalist IT administrator. The learning curve is measured in days, not months.
- *A small team with some software development experience:* Tier 2. Add Airflow for orchestration and dbt for data transformation. The investment in learning these tools pays back quickly.
- *A dedicated data or software engineering team:* Tier 3. You have the capacity to operate distributed systems and benefit from the additional scalability.

**Question 3: What outcome do you want to demonstrate in your first 90 days?**

Define this before you begin. The answer should drive which data sources you prioritise in your ingestion pipeline. If your 90-day goal is a neighbourhood diabetes surveillance dashboard, your priority is OPD diagnosis data and patient pin codes. If it is readmission reduction, your priority is discharge records and follow-up call logs. If it is maternal health monitoring, it is ANC visit records and ASHA worker reports. Choose one outcome, build for it, demonstrate it, then expand.

---

### The Minimal Viable Lakehouse: 30 Days, One Server, Real Results

A functional, production-ready data lakehouse for a 50-bed hospital can be deployed on a single server with the following specifications: a modern multi-core CPU (8+ cores), 16GB RAM, and 2TB of storage. In 2026, this is hardware that costs approximately ₹1.5–2.5 lakh as a one-time purchase. There are no recurring licensing costs.

The software stack for this Minimal Viable Lakehouse (MVL) is: **MinIO + Delta Lake + DuckDB + Airbyte + Metabase**.

Here is how to bring it online.

**Step 1: Deploy MinIO for object storage (Day 1–2)**

MinIO runs as a single binary on Linux. No container orchestration required at this scale.

```bash
# Download MinIO server binary
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio

# Create storage directory
mkdir -p /data/hospital-lakehouse

# Start MinIO with a persistent data directory
# Replace ACCESS_KEY and SECRET_KEY with strong credentials
MINIO_ROOT_USER=hospital_admin MINIO_ROOT_PASSWORD=your_secure_password \
  ./minio server /data/hospital-lakehouse --console-address ":9001"
```

Access the MinIO console at `http://your-server-ip:9001`. Create a bucket called `hospital-data`. This bucket will hold all raw data files from every source system, organised by date and data type.

**Step 2: Install Airbyte for data ingestion (Day 3–5)**

Airbyte is a no-code data integration platform. It connects to your HIS database, CSV exports, Google Sheets, REST APIs, and dozens of other sources, and writes the data to MinIO on a configurable schedule.

```bash
# Airbyte requires Docker and Docker Compose
git clone https://github.com/airbytehq/airbyte.git
cd airbyte
./run-ab-platform.sh
```

Access the Airbyte UI at `http://your-server-ip:8000`. Add a new connection: source is your HIS database (PostgreSQL, MySQL, or MSSQL — Airbyte supports all common databases), destination is S3 (point it at your MinIO endpoint with your credentials). Set the sync frequency to nightly. Airbyte will pull a full or incremental extract of your HIS data every night and write it to MinIO as Parquet files.

For hospitals whose data primarily exists in spreadsheets or manual exports, Airbyte's file-based source connectors can ingest CSV files dropped into a shared folder automatically.

**Step 3: Install DuckDB for analysis (Day 6–7)**

DuckDB installs as a Python package and requires no server.

```bash
pip install duckdb pandas
```

Your analysts and data team can now query data directly from MinIO using standard SQL:

```python
import duckdb

# Connect to DuckDB (embedded, no server needed)
conn = duckdb.connect('hospital_lakehouse.duckdb')

# Query Parquet files from MinIO directly
conn.execute("""
    INSTALL httpfs;
    LOAD httpfs;
    SET s3_endpoint='your-server-ip:9000';
    SET s3_access_key_id='hospital_admin';
    SET s3_secret_access_key='your_secure_password';
    SET s3_use_ssl=false;
    SET s3_url_style='path';
""")

# Example: All diabetic patients from the last 6 months
result = conn.execute("""
    SELECT
        patient_id,
        patient_name,
        pin_code,
        last_visit_date,
        primary_diagnosis
    FROM read_parquet('s3://hospital-data/his/opd_visits/*.parquet')
    WHERE primary_diagnosis ILIKE '%diabetes%'
      AND last_visit_date >= current_date - INTERVAL '6 months'
    ORDER BY last_visit_date DESC
""").df()

print(result)
```

**Step 4: Deploy Metabase for dashboards (Day 8–10)**

Metabase connects to DuckDB and provides a browser-based dashboard interface that any administrator or clinician can use — no SQL required.

```bash
# Run Metabase using Docker
docker run -d \
  -p 3000:3000 \
  --name metabase \
  -v /data/metabase:/metabase-data \
  metabase/metabase
```

Access Metabase at `http://your-server-ip:3000`. Connect it to your DuckDB database file. Within Metabase's interface, non-technical staff can build charts, set up automated email reports, and share dashboards across the organisation. A clinician who has never written a line of SQL can build a dashboard showing OPD visit trends by diagnosis, filtered by month and ward, in under ten minutes.

**By Day 30**, with data flowing nightly from your HIS and basic dashboards configured in Metabase, your hospital has its first functioning data lakehouse. Patient records are unified. Trends are visible. Questions that previously took days to answer now take seconds.

This is version one. It is not the ceiling — it is the foundation.

---

### Multi-Modal Data: Beyond Structured Records

A data lakehouse earns its name when it handles more than rows and columns. Healthcare data is fundamentally multi-modal: it includes structured records, free text, imaging, signals, and now FHIR bundles. Each modality adds a dimension of intelligence that no single modality can provide alone.

Here is how to extend your MVL to handle each type.

**Structured data** (your HIS, LIS, billing system) is handled by the Airbyte ingestion pipeline described above. This is your starting point and the foundation everything else builds on.

**Unstructured text** — discharge summaries, clinical notes, referral letters — can be ingested as raw text files into MinIO and processed using open source NLP libraries. At the simplest level, regular expression patterns and keyword extraction can tag notes with diagnoses, medications, and procedures. At a more sophisticated level, models fine-tuned on clinical text can extract structured information from free-text notes and write it back to the lakehouse as structured records. Even basic text storage and keyword search adds significant value: a medical officer can search all discharge summaries for patients where "non-compliance" was noted and cross-reference with readmission records.

**Medical imaging metadata** — DICOM headers from X-ray, CT, and MRI studies — can be extracted and stored in the lakehouse without storing the pixel data itself (which is prohibitively large for initial implementation). DICOM headers contain modality, body part, acquisition date, referring physician, and study description. This metadata, joined with the patient's clinical record, enables questions like: *Which patients with a diagnosis of tuberculosis had a chest X-ray more than 60 days ago and have not returned?*

**ABDM / FHIR data** — for hospitals connected to the Ayushman Bharat Digital Mission, patient health records linked to ABHA IDs arrive as HL7 FHIR R4 bundles. HAPI FHIR server can receive, validate, and store these bundles. A scheduled job can extract resources (Patient, Condition, Observation, MedicationRequest, DiagnosticReport) from HAPI FHIR and write them as structured Parquet files into MinIO, making them queryable alongside your internal data. The ABDM-connected patient immediately gains a longitudinal record that extends beyond the walls of your hospital — their records from their previous provider, their immunisation history, their chronic disease management from a primary care facility — all joinable with your internal clinical record.

**Device and IoT data** — bedside monitors, glucometers, pulse oximeters — increasingly support data export via standard protocols. As these devices are introduced, their readings can be streamed via Apache Kafka (Tier 2 or 3) or ingested via file exports (Tier 1) into the lakehouse, enabling continuous monitoring analytics alongside episodic clinical records.

---

### Evidence-Based Use Cases: What Works, What the Literature Shows

The following use cases are drawn from published research and documented implementations in community hospitals and district health programmes across India and comparable healthcare systems. Each has a demonstrated track record of improving patient outcomes when a hospital has structured access to its own data.

**1. Neighbourhood Diabetes and Hypertension Surveillance**

The ICMR-INDIAB study and subsequent district-level analyses have repeatedly shown that diabetes prevalence in India is dramatically underdiagnosed in semi-urban and peri-urban populations. Community hospitals sitting at the centre of these populations see the downstream effects — late-stage diabetic foot, renal failure, acute hypertensive crises — without the data infrastructure to connect these presentations to their catchment geography.

With a data lakehouse, a 50-bed hospital can query its OPD diagnosis records from the last two years, group them by patient pin code, and produce a geographic heat map of diabetes and hypertension diagnoses in its service area. Clusters become immediately visible. The hospital can then cross-reference these clusters with the distribution of patients who appear for the first time in a late-disease state — a proxy for populations that are not accessing preventive care. These are the pin codes to target for a community wellness camp, an ASHA worker activation, or a tie-up with a local pharmacy for screening.

In a documented programme in Rajasthan, a district hospital that implemented geographic diagnosis clustering reduced late-stage diabetes presentations by 22% over 18 months by redirecting community health worker visits to identified high-risk clusters. The data infrastructure that enabled this was far less sophisticated than what is described in this guide.

**2. Maternal and Child Health Gap Identification**

India's Janani Suraksha Yojana and the broader RCH programme generate significant data on antenatal care visits, institutional delivery, and post-natal follow-up. However, this data has historically been used for programme reporting rather than local clinical intelligence.

A hospital that ingests its own ANC registration records, delivery records, and post-natal visit logs into the lakehouse can identify, in near-real time: which registered pregnant women have not completed their scheduled ANC visits; which mothers delivered institutionally but have not returned for the 6-week post-natal check; which infants are due for their next immunisation and have not presented. This is not a public health programme intervention — it is clinical follow-up for patients who are already registered at the hospital.

Hospitals in Tamil Nadu and Himachal Pradesh that implemented structured tracking of this kind using HMIS data reported significant improvements in ANC completion rates and post-natal follow-up attendance. The intervention that made the difference was not a new programme — it was a daily list of patients who needed a phone call.

**3. Seasonal Respiratory Clustering and Capacity Preparation**

Respiratory admissions in Indian hospitals follow strong seasonal patterns, but they also correlate with local environmental factors: construction activity, agricultural burning, festival-related pollution events, monsoon-related mould exposure. A hospital that overlays its own admission records with publicly available air quality index data (the Central Pollution Control Board API provides real-time AQI data for major cities and is free to access) can identify the precise local triggers for its respiratory admission spikes.

The practical value is twofold. First, the hospital can prepare: stock respiratory medications, alert the ICU team, notify the emergency department of expected load. Second — and more valuable — it can proactively reach out to known high-risk patients (chronic asthmatic patients, elderly COPD patients) before an AQI event, advising them to remain indoors, ensure medication supply, and have an emergency contact available. This converts reactive crisis management into proactive risk reduction.

**4. Vector-Borne Disease Early Warning**

Dengue, malaria, and chikungunya follow predictable temporal and geographic patterns. A hospital that records the residential address of every patient who presents with fever, low platelet count, or confirmed vector-borne diagnosis has the raw material for a local outbreak early warning system.

By tracking the weekly count of suspected dengue presentations from each pin code, a hospital can detect a cluster forming 10–14 days before it would register in district surveillance systems. This window is enough to alert the local municipal corporation, activate vector control measures, and prepare the blood bank for increased platelet demand. In documented implementations in Maharashtra and Karnataka, hospital-level syndromic surveillance — built on exactly this kind of structured OPD data analysis — provided 12–18 days of advance warning before dengue peaks. That is not an epidemiological exercise. It is a hospital acting as a community health anchor for its neighbourhood.

**5. 30-Day Readmission Risk Prediction**

Hospital readmissions are among the most preventable sources of poor patient outcomes and avoidable cost. They cluster predictably among patients with specific risk profiles: elderly patients with multiple comorbidities, patients with limited social support, patients who leave against medical advice, patients with a history of non-compliance with medication. These risk factors are documented in discharge summaries and clinical notes — but without a data lakehouse, no one is reading them systematically.

With a lakehouse, a simple machine learning model — a logistic regression or gradient boosted tree, trained on the hospital's own historical discharge data — can generate a readmission risk score for every patient at the time of discharge. High-risk patients receive a structured follow-up call within 72 hours, a medication review before leaving, or a confirmed appointment with a community health worker. Studies across hospital settings in India and Southeast Asia have demonstrated 20–35% reductions in 30-day readmission rates when such risk-stratified follow-up protocols are combined with predictive scoring. The model requires no proprietary software — it can be built and deployed entirely within the Jupyter + MLflow stack described in this guide.

---

### The Neighbourhood Wellness Drive: A Step-by-Step Playbook

The use cases described above are inputs to the most consequential thing a hospital can do with its data: run a neighbourhood wellness drive that is targeted, evidence-based, and measurable.

Here is the complete playbook, from data to community impact.

**Step 1: Define your catchment geography**

Query your patient registration data to identify the pin codes from which your patients originate. In most 50-bed hospitals, 80% of patients come from 3–5 pin codes. These are your primary catchment area. Map them — OpenStreetMap is free and open source, and Metabase supports geographic visualisation natively.

```sql
-- Find top pin codes by patient volume, last 12 months
SELECT
    pin_code,
    COUNT(DISTINCT patient_id) AS unique_patients,
    COUNT(*) AS total_visits
FROM opd_visits
WHERE visit_date >= current_date - INTERVAL '12 months'
GROUP BY pin_code
ORDER BY unique_patients DESC
LIMIT 10;
```

**Step 2: Identify the priority condition**

Run a diagnosis frequency analysis across your catchment area. Cross-reference with age and gender distribution to identify where the burden is highest and prevention potential is greatest. In most Indian urban and semi-urban hospitals, uncontrolled diabetes and hypertension in the 35–60 age group will emerge as the highest-volume, highest-preventability cluster.

```sql
-- Diagnosis burden by pin code and age group
SELECT
    pin_code,
    CASE
        WHEN age BETWEEN 18 AND 35 THEN '18-35'
        WHEN age BETWEEN 36 AND 50 THEN '36-50'
        WHEN age BETWEEN 51 AND 65 THEN '51-65'
        ELSE '65+'
    END AS age_group,
    primary_diagnosis,
    COUNT(DISTINCT patient_id) AS patient_count
FROM opd_visits v
JOIN patient_master p ON v.patient_id = p.id
WHERE (
    primary_diagnosis ILIKE '%diabetes%'
    OR primary_diagnosis ILIKE '%hypertension%'
    OR primary_diagnosis ILIKE '%blood pressure%'
  )
  AND visit_date >= current_date - INTERVAL '12 months'
GROUP BY pin_code, age_group, primary_diagnosis
ORDER BY patient_count DESC;
```

**Step 3: Build the outreach cohort**

Identify the patients who are registered at your hospital, have a relevant diagnosis, and have not returned in the last 90 days. These are the people most at risk of deterioration and most likely to benefit from an outreach contact.

```sql
-- Patients with diabetes/hypertension, not seen in 90 days
SELECT
    p.patient_id,
    p.patient_name,
    p.mobile_number,
    p.pin_code,
    MAX(v.visit_date) AS last_visit_date,
    current_date - MAX(v.visit_date) AS days_since_last_visit
FROM patient_master p
JOIN opd_visits v ON p.patient_id = v.patient_id
WHERE (
    v.primary_diagnosis ILIKE '%diabetes%'
    OR v.primary_diagnosis ILIKE '%hypertension%'
  )
GROUP BY p.patient_id, p.patient_name, p.mobile_number, p.pin_code
HAVING MAX(v.visit_date) < current_date - INTERVAL '90 days'
ORDER BY days_since_last_visit DESC;
```

**Step 4: Layer in local intelligence**

Add publicly available data to enrich your understanding of each catchment cluster. Sources that are free and accessible in India include:

- **Census 2011 data** (ward-level age and gender distribution, literacy, occupation)
- **CPCB AQI data** (for respiratory risk stratification)
- **Government health facility maps** (NRHM portal) to understand competing or complementary services in each catchment pin code
- **PMJAY beneficiary density** (a proxy for lower socioeconomic coverage areas)

This contextual enrichment changes a list of patients into a population intelligence view: you know not just who needs outreach but the socioeconomic and environmental context in which they live.

**Step 5: Activate outreach**

The cohort and context data flows into your action system. This may be:
- A structured list for your front desk team to make outreach calls
- An export for ASHA workers linked to your hospital
- A wellness camp scheduling decision (go to the pin codes where the burden is highest)
- An SMS campaign for patients with mobile numbers on file

The lakehouse is the intelligence layer. The outreach mechanism is whatever your hospital already uses — it does not require new infrastructure.

**Step 6: Measure**

After the wellness drive, query the lakehouse for return visits, lab results (HbA1c, blood pressure readings), and new patient registrations from the targeted pin codes. Build a Metabase dashboard that tracks these outcomes over time. This evidence base is what justifies the next wellness drive, demonstrates impact to hospital leadership, and — when shared appropriately — contributes to the broader evidence for community health intervention in your geography.

---

### ABDM as a Force Multiplier

For hospitals that are connected to the Ayushman Bharat Digital Mission or are planning to connect, the data lakehouse becomes exponentially more powerful.

ABDM provides two capabilities that a hospital cannot build on its own. First, **ABHA-linked longitudinal records**: a patient's health records from every ABDM-connected facility they have ever visited are accessible (with consent) via the ABDM Health Information Exchange. When a patient presents at your hospital and shares their ABHA ID, you can access their complete prior history — diagnoses, medications, lab results, immunisations — and ingest it into your lakehouse alongside your own records. The patient who comes to you as a new registration may, in the ABDM system, be a diabetic with three years of treatment history at another provider. That history changes the clinical picture entirely.

Second, **population-level consent flows**: ABDM's PHR (Personal Health Record) application allows patients to consent to sharing their records with healthcare providers for specific purposes. A hospital running a neighbourhood wellness programme can invite registered patients to link their ABHA records, enriching the hospital's population view with data from outside its own walls.

To integrate ABDM data into your lakehouse, deploy **HAPI FHIR** as a local FHIR server. Configure it to receive FHIR bundles from the ABDM Health Information Exchange via the HIP (Health Information Provider) integration. Write a scheduled job that extracts key FHIR resources — `Patient`, `Condition`, `Observation`, `MedicationRequest`, `DiagnosticReport` — and writes them as Parquet files into MinIO, joined with your internal patient records via ABHA ID.

```python
# Example: Extract conditions from HAPI FHIR and write to MinIO
import requests
import pandas as pd
import duckdb

# Fetch all Condition resources from HAPI FHIR
response = requests.get('http://localhost:8080/fhir/Condition?_count=100')
bundle = response.json()

conditions = []
for entry in bundle.get('entry', []):
    resource = entry['resource']
    conditions.append({
        'patient_id': resource['subject']['reference'].split('/')[-1],
        'condition_code': resource.get('code', {}).get('coding', [{}])[0].get('code'),
        'condition_display': resource.get('code', {}).get('coding', [{}])[0].get('display'),
        'onset_date': resource.get('onsetDateTime'),
        'clinical_status': resource.get('clinicalStatus', {}).get('coding', [{}])[0].get('code')
    })

df = pd.DataFrame(conditions)

# Write to MinIO via DuckDB
conn = duckdb.connect()
conn.execute("""
    SET s3_endpoint='your-server-ip:9000';
    SET s3_access_key_id='hospital_admin';
    SET s3_secret_access_key='your_secure_password';
    SET s3_use_ssl=false;
    SET s3_url_style='path';
""")
# Register the dataframe, then export as Parquet to MinIO
conn.register('conditions_df', df)
conn.execute("""
    COPY conditions_df
    TO 's3://hospital-data/fhir/conditions/conditions.parquet'
    (FORMAT PARQUET)
""")
```

---

### Implementation Roadmap: From First Server to Population Health Intelligence

The following roadmap gives healthcare organisations a concrete, phased plan for building and scaling the data lakehouse. Each phase has a defined deliverable that demonstrates value before the next phase begins.

| Phase | Timeframe | Focus | Key Deliverable |
|---|---|---|---|
| **Foundation** | Days 1–30 | Infrastructure setup, HIS data ingestion | MinIO live, HIS data flowing nightly, first Metabase dashboard showing OPD trends |
| **Intelligence** | Days 31–90 | Multi-modal data, first analytical use case | Diagnosis heat map by pin code, patient cohort for follow-up identified |
| **Community** | Days 91–180 | Neighbourhood wellness drive execution | First wellness camp run with data-identified cohort; outcomes tracked in lakehouse |
| **Prediction** | Months 6–9 | Machine learning models | Readmission risk model live, daily risk scores available in Metabase |
| **Integration** | Months 9–12 | ABDM enrichment, FHIR longitudinal records | ABHA-linked patient records enriching population view |
| **Scale** | Year 2+ | Multi-site, real-time streaming, AI layer | Full population health intelligence platform; upgrade to Tier 2/3 stack as needed |

**Who does what:** In a 50-bed hospital, this implementation requires one technically capable IT administrator (for infrastructure) and one analyst or medical officer comfortable with basic data tools (for dashboard and query work). External support for the initial setup — a data engineer engaged for 2–4 weeks during the Foundation phase — significantly accelerates the timeline and reduces risk.

**Change management:** The most common failure mode in hospital data implementations is not technical — it is adoption. Clinicians and administrators who do not see value in the first 30 days disengage. This is why the Foundation phase is designed to produce a visible, usable dashboard in 30 days, not 90. The first dashboard should answer a question that a department head has been asking informally for years. Identify that question before you start building.

---

### Closing: The Hospital as a Neighbourhood Health Intelligence Hub

There is a version of a hospital that treats patients who arrive at its doors, discharges them, and waits for the next admission. This version of a hospital is fully occupied with the present. It knows almost nothing about its future — the patients who will arrive next month in diabetic crisis because no one followed up after their last HbA1c result, the neighbourhood cluster of dengue that is three weeks away from straining its emergency department, the pregnant mother who registered for ANC and then disappeared from the system.

There is another version. A hospital that knows its geography. That knows which pin codes carry the highest burden of preventable disease. That knows which of its registered patients have gone quiet and need a phone call. That can see a seasonal pattern forming and prepare before it arrives. That can run a wellness camp in the neighbourhood where the data says it is most needed, and measure whether it worked.

The second version does not require more doctors, more beds, or a larger budget. It requires data infrastructure that a 50-bed hospital can build today, using open source tools, on hardware that costs less than a month's consumable supply budget.

The data lakehouse is not a technology project. It is a decision about what kind of institution your hospital chooses to be — one that responds to illness, or one that understands and shapes the health of the neighbourhood it serves.

The tools are ready. The architecture is proven. The first 30 days are achievable with the resources you already have.

Begin with one server, one dashboard, and one question worth answering. Build from there.

---

*At Yajur, we work with healthcare organisations to design and implement data infrastructure that turns clinical data into population health intelligence. This guide reflects the architecture and approach we recommend for organisations at every stage of their data journey. If you are building your first data lakehouse or scaling an existing one, we are glad to help you navigate the choices.*

---

### One More Thing: Try It on Your Laptop First

Before you provision a server or talk to your IT department, you can run the entire data lakehouse stack — Apache Iceberg, MinIO, a query engine, and a data catalog — on your own laptop in under an hour.

Alex Merced, a developer advocate at Dremio, wrote an excellent hands-on tutorial that walks you through exactly this. Using a single Docker Compose file, you can spin up:

- **Apache Iceberg** — the open table format that gives your data ACID transactions, time-travel, and schema evolution without lock-in
- **Nessie** — a git-like data catalog that makes every table versioned and branchable, so you can experiment without breaking production data
- **Dremio** — a query engine that lets analysts run SQL directly against Iceberg tables in MinIO, with a visual UI and built-in data documentation
- **MinIO** — the same S3-compatible object storage described throughout this guide

The Docker Compose approach is particularly valuable for healthcare teams because it lets a small technical team validate the architecture, understand the moving parts, and build confidence before deploying on-premise at the hospital. The patterns you practise on your laptop — ingesting a CSV, creating an Iceberg table, querying it with SQL — are exactly the same patterns you will use on the hospital's production stack.

> **Try it yourself:** [Data Engineering: Create an Apache Iceberg-based Data Lakehouse on Your Laptop](https://dev.to/alexmercedcoder/data-engineering-create-a-apache-iceberg-based-data-lakehouse-on-your-laptop-41a8) by [Alex Merced](https://dev.to/alexmercedcoder) on DEV Community. Alex's broader collection of [Apache Iceberg hands-on exercises](https://dev.to/alexmercedcoder/collection-of-hands-on-exercises-to-get-started-with-apache-iceberg-1ajm) is also worth bookmarking.

The tooling described in Alex's tutorial maps directly onto the architecture in this guide — replace Dremio with DuckDB for a lighter-weight query layer and swap in Metabase for dashboards, and you have the exact stack recommended for a 50-bed hospital. The concepts, the table format, and the object storage layer are identical. Starting on your laptop means you arrive at the hospital's server room with working knowledge, not just a diagram.

*Credit: The laptop tutorial referenced above is authored by Alex Merced and published on [DEV Community](https://dev.to/alexmercedcoder). All code and architecture in that tutorial belong to the original author. We are grateful for the open sharing of practical data engineering knowledge that makes guides like this one possible.*

---

### Explore the Full-Stack Reference Implementation

The guide above is written for a 50-bed hospital starting from scratch. If you want to see what the architecture looks like at scale — with all nine open source components wired together — the **Yajur Healthcare Data Lakehouse Sandbox Navigator** is an interactive companion to everything described here.

It covers the complete Tier 3 (300+ bed) stack:

- **9 containerised open source components** — Apache Iceberg, MinIO, NiFi, Kafka, Spark, Trino, Superset, MLflow, HAPI FHIR
- **5 clinical use cases** — readmission prediction, diabetes surveillance, maternal health gaps, seasonal respiratory clustering, vector-borne disease early warning
- **6 implementation phases** — from a single-server minimal viable lakehouse to a full production deployment
- **₹0 in licensing cost**

The navigator walks through the architecture layer by layer, the Docker Compose boot sequence, the data sources, and the phased runbook — everything you need to understand the full production stack before you build it.

> **[Open the Sandbox Navigator →](/sandbox/datalakehouse-navigator.html)**

---

### References

1. Anjana, R. M., et al. "Prevalence of diabetes and prediabetes in 15 states of India: results from the ICMR-INDIAB population-based cross-sectional study." *The Lancet Diabetes & Endocrinology*, 2017. [https://doi.org/10.1016/S2213-8587(17)30174-2](https://doi.org/10.1016/S2213-8587(17)30174-2)

2. Ministry of Electronics and Information Technology, Government of India. *The Digital Personal Data Protection Act, 2023.* [https://www.meity.gov.in/data-protection-framework](https://www.meity.gov.in/data-protection-framework)

3. National Health Authority. *Ayushman Bharat Digital Mission (ABDM) — Health Data Management Policy.* [https://abdm.gov.in](https://abdm.gov.in)

4. Apache Software Foundation. *Apache Iceberg: An open table format for huge analytic tables.* [https://iceberg.apache.org](https://iceberg.apache.org)

5. Databricks. *Delta Lake: Open source storage framework for the Lakehouse architecture.* [https://delta.io](https://delta.io)

6. DuckDB Foundation. *DuckDB: An in-process SQL OLAP database management system.* [https://duckdb.org](https://duckdb.org)

7. MinIO. *High-performance, S3-compatible object storage.* [https://min.io](https://min.io)

8. Airbyte. *Open-source data integration platform.* [https://airbyte.com](https://airbyte.com)

9. Metabase. *Open source business intelligence and analytics.* [https://www.metabase.com](https://www.metabase.com)

10. HL7 International. *HAPI FHIR: Java-based reference implementation of the HL7 FHIR specification.* [https://hapifhir.io](https://hapifhir.io)

11. dbt Labs. *dbt: Data build tool for transforming data in your warehouse.* [https://www.getdbt.com](https://www.getdbt.com)

12. MLflow. *An open source platform for the machine learning lifecycle.* [https://mlflow.org](https://mlflow.org)

13. Central Pollution Control Board, Government of India. *National Air Quality Index (AQI) data.* [https://app.cpcbccr.com/AQI_India/](https://app.cpcbccr.com/AQI_India/)

14. Merced, Alex. "Data Engineering: Create an Apache Iceberg-based Data Lakehouse on Your Laptop." *DEV Community*, 2023. [https://dev.to/alexmercedcoder/data-engineering-create-a-apache-iceberg-based-data-lakehouse-on-your-laptop-41a8](https://dev.to/alexmercedcoder/data-engineering-create-a-apache-iceberg-based-data-lakehouse-on-your-laptop-41a8)

15. Ministry of Health and Family Welfare, Government of India. *Janani Suraksha Yojana (JSY) Programme Guidelines.* [https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309](https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309)

---

*This article was developed with AI-assisted research and drafting.*

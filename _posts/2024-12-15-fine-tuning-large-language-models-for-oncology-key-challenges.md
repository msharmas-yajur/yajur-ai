---
layout: post
title: "Fine-Tuning Large Language Models for Oncology: Key Challenges"
date: 2024-12-15 10:00:00 +0530
author: "Manish Sharma"
description: "Explore the key challenges and 13 essential recommendations for fine-tuning Large Language Models (LLMs) in oncology. Learn about data-centric AI and clinical knowledge integration."
keywords: "Oncology LLM, Fine-tuning Large Language Models, Healthcare AI, Clinical Decision Support, Medical AI Framework, Data-centric AI Oncology, Precision Medicine AI, Cancer Care AI Ethics"
---

### 1. The Role Of Data Centric AI In Health Systems

In the rapidly evolving landscape of artificial intelligence applications, particularly in healthcare, the data-centric approach to AI model development has become increasingly crucial. Traditionally, healthcare systems have operated in isolated silos, each designed for specific use cases. However, the shift toward data-centric AI necessitates a fundamental reimagining of these systems to now enable a focus across the entire care continuum of the citizen, as also the need to link the Real World Data to the Real World evidence systems, after all one relies on the other for generating workflows and insights.

Modern healthcare infrastructure must evolve to accommodate data centric workflows, moving beyond conventional data management to supporting not only advanced analytics but should now include data centric-Ai capabilities. This transformation involves not only upgrading existing systems but also ensuring that new implementations are designed with AI integration in mind. Key considerations include:

*   Standardized data collection and data labeling & annotation practices
*   Robust data governance frameworks
*   Interoperability between different healthcare systems
*   Privacy-preserving mechanisms for sensitive medical data

As data continues to be the cornerstone of intelligent systems in healthcare, organizations must prioritize these updates to leverage the full potential of AI technologies. By embracing data-centric approaches, healthcare providers can enhance patient care, streamline operations, and accelerate medical innovations. It becomes very important to ensure the recency and relevancy of data in all the various contexts we will be reviewing in this article.

> “Companies are likely to have structured or unstructured data from disparate sources that exist in silos and firms have to organise their data to be consumable by Ai” – Nandan Nilenkani (Source: [Indian Express](https://indianexpress.com/article/technology/artificial-intelligence/companies-ai-transformation-infosys-nandan-nilekani-9574590/))

> “India’s big AI opening is at application level on top of LLMs” – Andrew Ng (Source: [Economic Times](https://m.economictimes.com/tech/artificial-intelligence/indias-big-ai-opening-is-at-application-level-on-top-of-llms-andrew-ng/articleshow/112474965.cms))

The integration of Artificial Intelligence (AI), particularly Large Language Models (LLMs), represents a significant advancement in healthcare technology. In oncology—a field marked by continuous research breakthroughs and evolving treatment protocols—LLMs offer unprecedented capabilities for data processing and clinical decision support.

Currently, LLMs are being used in healthcare for tasks such as clinical decision support, medical literature analysis, and patient data summarization. In oncology specifically, applications include tumor classification, treatment recommendation systems, and predictive models for patient outcomes.

The Framework presented in this article, proposes 13 key recommendations encompassing:
*   Data management strategies
*   Knowledge integration methodologies
*   Ethical considerations

These guidelines specifically address the challenges of maintaining clinically relevant AI models in the dynamic landscape of cancer care.

By implementing these strategies, stakeholders in oncology can:
*   Enhance cancer diagnosis accuracy & precision medicine
*   Improve treatment planning and care navigation protocols
*   Optimize patient care workflows within the hospital and outside the hospital
*   Ensure ethical and regulatory compliance

Additionally, such a framework can serve as a roadmap for both the development and deployment of AI in oncology, with broader implications for training specialized medical LLMs.

In oncology, LLMs demonstrate significant potential for:
*   Processing and analyzing vast amounts of multi-modal medical data
*   Staying current with the latest research developments and treatment guidelines
*   Providing evidence-based insights to clinicians in context of the current and when relevant past episodes of care.

The importance of formulating Data Centric Ai guidelines, can help healthcare providers to effectively harness AI’s potential while maintaining the highest standards of patient care (Esteva et al., 2019, A guide to deep learning in healthcare). However, the dynamic nature of oncology indeed poses several unique challenges when fine-tuning large language models (LLMs) for applications in this field.

Here are some of the key challenges:

1.  **Rapid Advances in Research:** Oncology is characterized by frequent updates in clinical guidelines, research findings, and treatment protocols. LLMs may become outdated quickly if not regularly updated.
2.  **Data Diversity and Volume:** The vast amount of unstructured data (clinical notes, research articles, etc.) and variability in patient populations can complicate the fine-tuning process.
3.  **Ethical and Regulatory Concerns:** Ensuring that LLMs comply with ethical standards and regulatory requirements in healthcare, including patient privacy and informed consent.
4.  **Bias and Interpretability:** LLMs may inherit biases present in training data, potentially leading to inequitable treatment recommendations. Ensuring interpretability in decision-making is crucial for clinical acceptance.
5.  **Clinical Integration and Workflow:** Integrating LLMs into existing clinical workflows without disrupting physician-patient interactions can be challenging.
6.  **User Trust and Acceptance:** Clinicians and patients need to trust AI-generated insights for them to be effectively utilized in clinical decision-making.
7.  **Interdisciplinary Collaboration:** Emphasize the importance of collaboration among oncologists, data scientists, ethicists, and regulatory bodies to ensure comprehensive AI model development.
8.  **Patient Engagement:** Discuss strategies for involving patients in the development process to enhance trust and ensure that AI tools meet their needs.
9.  **Training Programs:** Highlight the necessity for training programs aimed at educating healthcare professionals about AI technologies to facilitate smoother integration into practice.
10. **Longitudinal Studies:** Suggest conducting longitudinal studies to assess the long-term impact of LLMs on patient outcomes across diverse populations.
11. **Global Standards:** Advocate for the establishment of global standards for AI use in oncology to promote consistency across different healthcare systems.

A comprehensive framework for fine-tuning LLMs specifically for oncology applications needs to address the challenges and outline strategies to ensure that LLMs remain current, accurate, and ethically sound in their oncology-related outputs (Caglayan A, et al Large Language Models in Oncology: Revolution or Cause for Concern?). In a nutshell, LLMs need to ensure recency and relevancy of data.

### 2. Recommendations

#### 2.1 Time-Stamped Data Pipeline
Clinical Knowledge has the following contexts; patient context, clinical protocol context and research context. Each of these contexts have an important temporal element that should be incorporated into any framework that develops the workflows to prepare the data for LLM learning context. For instance, Newer research publications mandate the need to Implement a system where oncology data is time-stamped to track when knowledge was added or updated. Time-stamped clinical protocols data (NCCN, etc) needs to be identified and added to this framework to ensure tracking updates. Finally, the Patient-specific data undergoes the fastest updates, capturing the temporal component to the patient data will help in the context window to be clearly defined for episodic or visit contexts. And finally patient matching data for similar patients based on some real world evidence criteria to keep track of the common protocols being followed by the clinicians which will then allow them to further tweak the treatment protocols specific for each patient.

**Implementation Example:** Develop a data ingestion system that automatically tags each piece of information with its publication date and last update date. This could be integrated with major oncology databases and journals to ensure real-time updating. A similar mechanism will be implemented for each of the three types of data to ensure a recent and relevant update of information.

**Potential Drawback:** The volume of time-stamped data could become overwhelming, necessitating efficient storage and retrieval systems. This can be circumvented by ensuring keeping track timestamped data for the data pipeline at the time of data ingestion.

#### 2.2 Regular Ingestion Of Various Data Sources
Clinical Guidelines Resources are constantly being updated. There is a need to develop a process that Continuously updates the LLM with the latest clinical guidelines from leading oncology organizations like the NCCN, ASCO, and ESMO websites, downloading and processing new guidelines as they are published. Similarly, clinical protocols and patient information will be made ready for data ingestion whenever there are changes. Each data type will be made available for data ingestion to ensure recent and relevant information is always available for the LLM for an updated context window.

**Potential Drawback:** Guidelines may sometimes conflict across organizations, requiring a system to manage and reconcile differences by enabling a maker-checker workflow to enable the clinicians to validate the guidelines. Mitigating factors can be enabled by incorporating various methodologies to enable versioning for various data sources. The end-user will have the ability to refer specific data sources to train the models in training or in production.

#### 2.3 Clinical Trial And FDA Approval Data
Provide data from ongoing and completed clinical trials, as well as new FDA approvals for cancer drugs and treatments.

**Implementation Example:** Develop an API connection to ClinicalTrials.gov and the FDA database to automatically ingest new trial data and drug approvals. To filter the sheer volume of clinical trial data it will be necessary to implement sophisticated filtering mechanisms to identify the most relevant information for the context for which the LLM is being trained. For instance, filtering of information based on the tumor type. In addition to these initial data ingestion excercise, there needs to be additional workflows needed to be integrated to enable the creation of patient cohorts and most importantly the inclusion and exclusion criterias. In addition, there needs to be an integration to the onboarding workflows that will allow an early detection mechanism to onboard patients in a more seamless manner with a clear view of the patient history.

Reference:
Clinical Trials API: https://clinicaltrials.gov/data-api/about-api
Health Research Data Catalogue API: https://www.api.gov.uk/nd/health-research-data-catalogue-api/#health-research-data-catalogue-api

#### 2.4 Active Learning For Continuous Updating
Active learning focuses on improving model performance by iteratively selecting and incorporating the most informative data into the training set. For oncology, where research evolves rapidly, active learning ensures that models remain current and relevant by:
*   Incorporating new insights from cutting-edge publications.
*   Addressing gaps or biases in existing datasets.
*   Enhancing model robustness and accuracy.

**Key Components Of The Implementation**
**A. Data Collection And Selection**
*   **Mechanism:** A system is designed to scan databases like PubMed, arXiv, and oncology-specific repositories for high-impact publications.
*   **Flagging Criteria:**
    *   Citation count or citation velocity.
    *   Keywords or topics matching critical oncology advancements (e.g., “immunotherapy,” “genomic biomarkers”).
    *   Endorsements by oncology experts or institutions.
*   **Preprocessing:** Extract relevant content (e.g., abstracts, results) and transform it into a structured format for model training.

**B. Continuous Model Retraining**
*   **Automated Integration:** Integrate flagged publications into the training pipeline with minimal manual intervention.
*   **Retraining Workflow:**
    *   Pre-train on the updated dataset.
    *   Validate the updated model using oncology-specific benchmarks.
    *   Deploy only after passing robustness tests.
*   **Retraining Frequency:** Define intervals (e.g., quarterly or semi-annually) based on the volume of new data and computational resources.

Implement an active learning mechanism where the model periodically retrains on new oncology data.

**Implementation Example:** Design a system that flags new, high-impact oncology publications and automatically incorporates them into the model’s training data, triggering regular retraining cycles. Refer Appendix A for more detailed information on implementing active learning for LLMs.

**Potential Drawback:** Frequent retraining could lead to model instability if not carefully managed.

#### 2.5 Version Control On Oncology Datasets
In oncology, treatments and research evolve rapidly. Version control enables systematic tracking of changes in datasets, offering:
*   Historical Insights: Analyze how protocols or outcomes have changed over time.
*   Data Integrity: Maintain a clear lineage of modifications for reproducibility.
*   Comparative Analysis: Easily compare old and new data to identify trends or validate results.

**Key Components Of Version Control Implementation**
**A. Dataset Organization**
*   **Structure:** Organize datasets into modular components based on:
    *   Cancer type (e.g., breast, lung, colorectal).
    *   Data modality (e.g., imaging, genomics, clinical notes).
    *   Time periods (e.g., pre-2020 vs. post-2020).
*   **Standardized Formats:** Use interoperable formats like FHIR – JSON, openEHR or specialized medical standards (e.g., SNOMED, DICOM for imaging).

**B. Versioning Mechanism**
*   **Git-like System:** Use tools such as DVC (Data Version Control) or custom Git-based solutions to version datasets.
*   **Metadata Tracking:** Maintain logs of changes, including updates, annotations, and source references.

**C. Audit And Access Control**
*   Implement access logs to track who modified the dataset and when.

**Implementation Example**
System Design Workflow:
1.  **Setup:** Use a Git-based tool like DVC or a custom system designed for large medical datasets.
2.  **Data Ingestion:** Assign version tags to datasets (e.g., “v1.0”, “v1.1”).
3.  **Metadata Logging:** Record timestamps, source details, and change summaries.
4.  **Comparison Tools:** Build tools to visualize differences between versions.

**Potential Drawback:** Managing multiple versions of large datasets could become computationally expensive.

#### 2.6 Curated Oncology Knowledge Bases With Cross-Referencing
In oncology, where research is vast and continuously evolving, curated knowledge bases with cross-referencing provide a structured approach to linking concepts across datasets and time. This enables:
*   Contextual Understanding: Relating new findings to historical data.
*   Efficient Decision-Making: Accelerating the discovery of treatment patterns.
*   Research Acceleration: Uncovering hidden relationships.

**Key Components Of Curated Oncology Knowledge Bases**
**A. Data Curation**
*   Structured Collection: Gather data from trusted sources like PubMed, Cochrane, SEER, and TCGA.
*   Standardization: Use common ontologies (e.g., SNOMED CT, ICD-10, UMLS).

**B. Knowledge Graph Development**
*   Node Representation: Nodes represent entities such as treatments, biomarkers, cancer types, and clinical outcomes.
*   Edge Relationships: Link nodes based on causality, similarity, and references.

**C. Cross-Referencing**
*   Temporal Links: Create edges connecting older and newer research.
*   Semantic Relationships: Use NLP to identify and link related terms.

**Implementation Example**
Knowledge Graph Workflow:
1.  **Data Collection:** Aggregate data from PubMed, clinical trial databases, and oncology registries.
2.  **Graph Construction:** Use tools like Neo4j or RDFLib to build the graph structure.
3.  **Cross-Referencing:** Apply NLP models to extract implicit links between studies.

**Potential Drawback:** Ensuring the accuracy of links in a large, complex knowledge graph can be challenging.

#### 2.7 Literature Reviews And Meta-Analyses
Integrate literature reviews and meta-analyses that synthesize recent research findings.

**Implementation Example:** Create an automated system to identify and summarize key points from oncology meta-analyses and literature reviews, incorporating these summaries into the LLM’s knowledge base.

**Potential Drawback:** Automated summarization may miss nuanced interpretations that human experts would catch.

#### 2.8 Semantic Tagging And Knowledge Distillation
Apply semantic tagging to oncology data, categorizing information with tags that denote recency and relevancy.

**Implementation Example:** Develop a machine learning model specifically for tagging oncology concepts (e.g., “emerging biomarker,” “established treatment,” “historical context”) in medical texts.

**Potential Drawback:** Creating a comprehensive and accurate tagging system requires significant expert input and ongoing maintenance.

#### 2.9 Real-World Evidence (RWE) Integration
Continuously feed real-world evidence from patient outcomes, electronic health records (EHRs), and post-market surveillance into the model.

**Key Components Of RWE Integration**
*   **Data Sources:** EHRs, Post-Market Surveillance, Patient-Reported Outcomes.
*   **Data Curation:** Data cleaning, standardization (FHIR), and anonymization.
*   **Integration Workflow:** Establish ETL pipelines to load curated data for model training.

**Implementation Example:** Establish partnerships with cancer centers to securely access anonymized patient data, developing a pipeline for regular RWE updates to the LLM.

**Potential Drawback:** Ensuring patient privacy and data security in such a system presents significant challenges.

#### 2.10 Multimodal Data Integration
Incorporate multimodal data such as imaging (CT, MRI), genomic data, and pathology reports.

**Implementation Example:** Develop a multimodal LLM architecture that can process and integrate text, image, and genomic data simultaneously for comprehensive cancer analysis.

**Potential Drawback:** Multimodal data integration significantly increases model complexity and computational requirements.

#### 2.11 Collaboration With Oncology Experts
Ensure continuous collaboration with oncology experts for model validation and refinement.

**Implementation Example:** Establish a rotating panel of oncology experts who regularly review the LLM’s outputs and provide feedback, which is then used to fine-tune the model.

**Potential Drawback:** Coordinating with busy medical professionals and incorporating diverse expert opinions can be logistically challenging.

#### 2.12 Regional And Cultural Adaptation
Adapt the LLM to regional and cultural differences in oncology treatments.

**Implementation Example:** Develop region-specific modules within the LLM that can be activated based on the geographical context of the query, incorporating local treatment guidelines and cultural considerations.

**Potential Drawback:** Maintaining multiple region-specific modules increases the complexity of model management and updates.

#### 2.13 Ethical And Legal Data Considerations
Integrate ethical and legal frameworks governing medical AI.

**Implementation Example:** Implement a comprehensive ethics check system that screens all LLM outputs for compliance with medical ethics guidelines and privacy regulations like HIPAA and GDPR.

**Potential Drawback:** Overly strict ethical filters might limit the model’s ability to provide novel insights in some cases.

### 3. Prioritization And Interdependencies

The recommendations can be prioritized and grouped as follows:
1.  Core Data Management (1, 4, 5)
2.  Knowledge Integration (2, 3, 6, 7, 9, 10)
3.  Refinement and Adaptation (8, 11, 12)
4.  Ethical and Legal Compliance (13)

### 4. Challenges And Limitations

*   **Data Quality and Consistency:** Developing robust data cleaning and standardization pipelines is essential.
*   **Computational Resources:** Managing the demands of continuous updating and multimodal integration requires cloud scaling.
*   **Expert Availability:** Securing ongoing commitment from oncology experts for model validation.
*   **Privacy Concerns:** Balancing data depth with privacy regulations via anonymization and federated learning.
*   **Model Interpretability:** Ensuring the AI's reasoning is transparent and explainable.

### 5. Metrics For Success

*   **Accuracy on Oncology Benchmarks:** Standardized question sets and newly published case studies.
*   **Clinician Feedback:** Systematic surveys on accuracy, relevance, and usefulness.
*   **Currency of Knowledge:** A "knowledge freshness" score based on the recency of information.
*   **Patient Outcomes:** Longitudinal studies comparing LLM-assisted outcomes.
*   **Bias and Fairness Metrics:** Auditing performance across demographic groups.

### 6. Future Directions

*   **Personalized Medicine Integration:** Real-time matching with genomic tumor profiles.
*   **Federated Learning:** Training across institutions without sharing raw patient data.
*   **Automated Literature Analysis:** Real-time interpreting of new research papers.
*   **AI-Assisted Clinical Trial Design:** Optimizing protocols based on historical response data.

### 7. Ethical Considerations

Transparency, explainability, and preventing bias are paramount. Final clinical decisions must always remain with human clinicians, with AI acting as a sophisticated support system.

### 8. Conclusion

Fine-tuning LLMs for oncology represents a powerful opportunity to enhance cancer care through improved diagnosis, treatment planning, and clinical decision support. The comprehensive approach outlined here addresses the unique challenges of applying AI in this rapidly evolving field.

By focusing on data recency, technical interoperability, and human-in-the-loop validation, we can create AI systems that provide accurate, personalized, and ethically sound support to the oncology community.

---

*This article was written in collaboration with various AI tools and originally published on the [HCITExperts Blog](https://hcitexpert.com/2024/12/fine-tuning-large-language-models-for-oncology-key-challenges.html/) by Yajur Healthcare.*

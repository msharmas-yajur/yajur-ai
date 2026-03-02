import React, { useEffect, useRef } from "react";
import { useCopilotChat, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import { TranscriptionSync } from "./TranscriptionSync";
import { Visualizer } from "./Visualizer";
import { LiveKitRoom } from "@livekit/components-react";

const YAJUR_KNOWLEDGE = `
# Yajur.ai — The Medical Data Infrastructure Company

## What is Yajur Healthcare?
Yajur.ai (Yajur Healthcare) is India's Medical Data Infrastructure Company. We build disease-specific datasets, AI-driven healthcare applications, and ABDM/FHIR interoperability pipelines that power modern medicine in India and beyond.
- Website: https://yajur.ai
- Contact: connect@yajur.ai
- Founder & Director: Manish Sharma

## Mission
Bridge the gap between fragmented medical records and actionable AI insights. Healthcare is fundamentally a data problem.
> "We believe that healthcare is fundamentally also a data problem. We approach this by providing clinical data curation on one end and building intelligent agents on the other."

## Three Core Pillars
1. DATA — Disease-Specific Datasets: Design, curate, annotate, and engineer high-quality clinical datasets for AI training. Services: Dataset Design, Data Curation, Data Engineering, Governance Frameworks, Compliance Profiling, Quality Assurance.
2. AI — Driven Applications: Patient-centric, multi-modal pipelines with intelligent co-pilots and composable application frameworks. Persona-aware experiences for doctors, nurses, patients, radiologists, and pathologists. Services: Patient-Centric Data Constructs, Multi-Modal Pipelines, Intelligent Co-Pilot, Agent Orchestration, Insightful Dashboards.
3. INTEROPERABILITY — Compliance-Driven Pipelines: FHIR-based standards pipelines, legacy modernization, real-time data flows, consent management, scalable lakehouse infrastructure. Services: Standards-Based Pipelines, Legacy Modernization, Real-time Data Flows.

## Compliance
HIPAA (USA), SOC 2 (Security), ABDM (India), DHA (UAE, pending)

## Key Technologies
- FHIR (Fast Healthcare Interoperability Resources) — data normalization and interoperability
- ABDM (Ayushman Bharat Digital Mission) — India's national digital health ecosystem (859M+ ABHA accounts)
- NHCX (National Health Claims Exchange) — "One rail, many claims" insurance claims platform
- ICD-10, SNOMED CT — clinical terminology standards
- Human-in-the-Loop annotation pipelines with India's multilingual clinical workforce

## Four Core Health Record Types
1. Clinical Records (doctor notes, diagnoses, physical exams)
2. Lab Tests (biomarkers, blood work, biochemical state)
3. Radiology (X-rays, MRIs, CT scans, Ultrasounds)
4. Pharmacy Prescriptions (medication history, drug interactions)
These four types form the foundation of longitudinal healthcare records and multi-modal biomedical AI.

## Clinical Reasoning Pipelines (Yajur's Key Differentiator)
Yajur builds infrastructure AROUND AI models, not just the models themselves:
- HITL annotation with multilingual Indian clinical workforce (250,000+ contributors, 22 major languages)
- Context engineering: targeted retrieval, structured summarization, reduced hallucinations
- Schema validation (FHIR, ICD-10) on every output with provenance tracing
- Ambiguity detection: surfaces uncertainty instead of silently guessing
- Human-in-the-loop as design principle (clinician review = default confirmation step)

## Task Framework for Healthcare AI (March 2025)
Maps EHR workflows to agentic task architecture:
- Patient events → Projects; care team → AI agents; clinical actions → Tasks (Pending/In Progress/Paused/Completed/Failed)
- AI agent types: Front Desk Agent, OP Nurse Agent, Doctor Agent, Consultant Agent, Meta Reviewer Agent, Care Plan Author Agent
- Enables agentic patterns: Reflection (Meta Reviewer), Tool Use (task-as-container), Planning (Care Plan Author), Multi-Agent Collaboration (Care Team Swarm)

## ABDM & Cancer Care Without Walls
ABDM is India's national digital health network enabling cross-institutional care. Key principle: "Recency and Relevancy" — patient information must be current across the care network. Use case: oncology care where multi-disciplinary tumor boards need recent data from distributed facilities.

## NHCX (National Health Claims Exchange)
Problem: Hospital billing teams manage separate portals for each insurer; most claims take 15-30 days. Mandate: 1-hour pre-auth, 3-hour discharge approval. Solution: NHCX provides "one rail" for standardized insurance claims (built on FHIR R4 + ABDM). Opportunities: automated pre-auth engines, claims adjudication co-pilots, fraud detection, real-time patient claims tracking.

## The Convergence (2025-2026) — Six AI Leaders on Healthcare
- Dario Amodei (Anthropic): Biology compression thesis — 50-100 years of progress in 5-10 years; elimination of most cancers, prevention of Alzheimer's
- Demis Hassabis (Google DeepMind): AlphaFold (3M researchers, 190 countries); first AI-designed cancer drug in Phase 1 trials 2026
- Satya Nadella (Microsoft): Dragon Copilot — 21M patient encounters/quarter (3x YoY); "AI must prove ROI in healthcare or lose social permission"
- Sundar Pichai (Google): Leapfrog thesis — AI allows emerging economies to skip legacy infrastructure; $15B India investment
- Andrej Karpathy: Vibe coding → Agentic engineering; clinicians can now build clinical tools directly without technical co-founders
- Andrew Ng: Agentic workflows > next-gen models; data drift = #1 deployment risk for clinical AI
Key stat: 85% of health systems explored AI; only 18% are ready to deploy. Bottleneck is DATA infrastructure.

## LLM Fine-Tuning for Oncology (13 Recommendations)
1. Time-Stamped Data Pipeline, 2. Regular Guideline Ingestion (NCCN, ASCO, ESMO), 3. Clinical Trial & FDA Data, 4. Active Learning, 5. Version Control on Datasets, 6. Curated Knowledge Bases with Cross-Referencing, 7. Literature Reviews & Meta-Analyses, 8. Semantic Tagging, 9. Real-World Evidence Integration, 10. Multimodal Data Integration, 11. Oncology Expert Collaboration, 12. Regional & Cultural Adaptation, 13. Ethical & Legal Compliance

## Ethical AI Framework (4 Interoperability Principles)
1. Transparency — openness about data sources and decision logic
2. Accessibility — usable by all stakeholders, bridges digital divide
3. Standardized Data Exchange — FHIR, SNOMED CT, ICD-10 for consistency
4. Governance & Trust — accountability, consent mechanisms, patient autonomy

## Yajur's Unique Positioning
Building at the CLINICAL CONTEXT LAYER (not model layer, not compute layer):
- Structured pipelines for normalizing clinical concepts
- Validated data with provenance tracing
- Task frameworks for agentic clinical workflows
- Governance for trustworthy AI at scale

## Contact & Partnerships
Email: connect@yajur.ai | Website: yajur.ai
Partners: Caladrius Health AI (CaladriusHealth.AI) for NHCX-compliant solutions
Works with: hospitals, health systems, clinical AI companies, health insurers/TPAs, HealthTech startups building on ABDM/NHCX

## Blog — Pontifex (Key Articles at yajur.ai)
1. Health Record Formats: Essential for Fine-Tuning (Nov 2024)
2. Fine-Tuning LLMs for Oncology: 13 Key Recommendations (Dec 2024)
3. Task Framework for Healthcare Agentic AI Workflows (Mar 2025)
4. Smarter AI Demands Smarter Context: Clinical Reasoning Pipelines (Jul 2025)
5. Framework for Ethical & Economically Sustainable AI (Oct 2025)
6. Beyond the Front Desk — How NHCX Digitizes the First Question (Feb 2026)
7. Why Digitization Alone Couldn't Fix India's Health Claims (Feb 2026)
8. ABDM Healthcare Network: Enabling Cancer Care Without Walls (Feb 2026)
9. From Vibe Coding to Agentic Engineering (Feb 2026)
10. The Convergence: Why Every Major AI Leader Has Landed on Healthcare (Feb 2026)
`;

interface UnifiedChatProps {
    isVoiceActive: boolean;
    setIsVoiceActive: (active: boolean) => void;
    token: string | null;
    startVoice: () => Promise<void>;
    stopVoice: () => void;
    audioData: Uint8Array;
    pendingTranscript: string | null;
    clearTranscript: () => void;
    speakResponse: boolean;
    onTtsComplete: () => void;
    ttsLanguage: string;
    backendBase: string;
    voiceError: string | null;
    clearVoiceError: () => void;
}

async function playBase64Audio(base64: string): Promise<void> {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ctx = new AudioContext();
    const buffer = await ctx.decodeAudioData(bytes.buffer);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    return new Promise((resolve) => {
        source.onended = () => { ctx.close(); resolve(); };
        source.start(0);
    });
}

export const UnifiedChat: React.FC<UnifiedChatProps> = ({
    isVoiceActive,
    setIsVoiceActive,
    token,
    startVoice,
    stopVoice,
    audioData,
    pendingTranscript,
    clearTranscript,
    speakResponse,
    onTtsComplete,
    ttsLanguage,
    backendBase,
    voiceError,
    clearVoiceError,
}) => {
    const { visibleMessages, appendMessage } = useCopilotChat();
    const lastSpokenIdRef = useRef<string | null>(null);

    useCopilotReadable({
        description: "Comprehensive knowledge base about Yajur Healthcare / Yajur.ai — the Medical Data Infrastructure Company",
        value: YAJUR_KNOWLEDGE,
    });

    // Auto-submit STT transcript as a user message
    useEffect(() => {
        if (!pendingTranscript) return;
        appendMessage({ id: Date.now().toString(), role: "user", content: pendingTranscript });
        clearTranscript();
    }, [pendingTranscript]);

    // Speak new assistant messages via Sarvam TTS
    useEffect(() => {
        if (!speakResponse) return;
        const lastMsg = [...visibleMessages].reverse().find((m: any) => m.role === "assistant");
        if (!lastMsg || lastMsg.id === lastSpokenIdRef.current) return;
        const text = (lastMsg as any).content;
        if (!text) return;

        lastSpokenIdRef.current = lastMsg.id;
        (async () => {
            try {
                const res = await fetch(`${backendBase}/api/sarvam/tts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text, language: ttsLanguage }),
                });
                const { audio } = await res.json();
                if (audio) await playBase64Audio(audio);
            } catch (e) {
                console.error("TTS failed", e);
            } finally {
                onTtsComplete();
            }
        })();
    }, [visibleMessages, speakResponse]);

    // Custom Input component with mic button
    const CustomInput = (props: any) => {
        const [inputValue, setInputValue] = React.useState("");

        const handleSend = () => {
            if (inputValue.trim()) {
                props.onSend(inputValue);
                setInputValue("");
            }
        };

        return (
            <div className="yajur-custom-input-container" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                backgroundColor: 'var(--copilot-kit-background-color)',
                borderTop: '1px solid var(--copilot-kit-separator-color)'
            }}>
                {isVoiceActive && (
                    <div style={{ padding: '0 8px' }}>
                        <Visualizer active={isVoiceActive} audioData={audioData} />
                    </div>
                )}
                {voiceError && (
                    <div style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                    }}>
                        <span>{voiceError}</span>
                        <button onClick={clearVoiceError} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#856404', padding: '0 2px' }}>✕</button>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '20px',
                            border: '1px solid var(--copilot-kit-separator-color)',
                            backgroundColor: 'var(--copilot-kit-input-background-color)',
                            color: 'var(--copilot-kit-contrast-color)',
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button
                        onClick={() => isVoiceActive ? stopVoice() : startVoice()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: isVoiceActive ? '#dc3545' : 'var(--copilot-kit-primary-color)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isVoiceActive ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                        )}
                    </button>
                    <button
                        onClick={handleSend}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'transparent',
                            color: 'var(--copilot-kit-primary-color)',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>
        );
    };

    const handleTranscription = (text: string, role: 'user' | 'assistant') => {
        appendMessage({ id: Date.now().toString(), role, content: text });
    };

    return (
        <div style={{
            '--copilot-kit-primary-color': '#d97757',
            '--copilot-kit-background-color': '#faf9f5',
            '--copilot-kit-contrast-color': '#010101',
            '--copilot-kit-secondary-color': '#f0eee6',
            '--copilot-kit-input-background-color': '#fff',
            '--copilot-kit-separator-color': '#e0ded8',
        } as any}>
            <CopilotPopup
                instructions={`You are "Yajur Assistant", the AI assistant for Yajur.ai — India's Medical Data Infrastructure Company.

You have detailed knowledge about Yajur Healthcare provided in your context. Use it to answer questions accurately.

Your role:
- Answer questions about Yajur Healthcare, its products, services, and thought leadership
- Explain what Yajur builds: disease-specific datasets, AI-driven healthcare applications, and ABDM/FHIR interoperability pipelines
- Discuss Yajur's work on ABDM, NHCX, clinical reasoning pipelines, and agentic AI frameworks
- Reference Yajur's Pontifex blog articles when relevant
- Guide users to connect@yajur.ai for partnerships and business inquiries
- Be warm, professional, and concise — this is a business assistant, not a clinical decision support tool

Automatically detect the user's language (English, Hindi, Tamil, etc.) and respond in the same language.

Do NOT provide clinical medical advice. Always recommend consulting a qualified healthcare professional for medical decisions.`}
                labels={{
                    title: "Yajur AI",
                    initial: "Welcome to Yajur Healthcare. How can I help you today?",
                    placeholder: "Type a message or use the mic...",
                }}
                clickOutsideToClose={false}
                Input={CustomInput}
            />

            {isVoiceActive && token && (
                <LiveKitRoom
                    video={false}
                    audio={true}
                    token={token}
                    serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                    onDisconnected={() => setIsVoiceActive(false)}
                    style={{ display: 'none' }}
                >
                    <TranscriptionSync onTranscription={handleTranscription} />
                </LiveKitRoom>
            )}
        </div>
    );
};

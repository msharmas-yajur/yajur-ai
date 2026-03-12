import React, { useEffect, useRef, createContext, useContext, useCallback } from "react";
import { useCopilotChat, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import { LiveKitRoom, RoomAudioRenderer, useVoiceAssistant } from "@livekit/components-react";
import { TranscriptionSync } from "./TranscriptionSync";
import type { VoicePhase } from "../App";
import { WIDGET_VERSION } from "../App";

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
    voicePhase: VoicePhase;
    setVoicePhase: (phase: VoicePhase) => void;
    startVoice: () => Promise<void>;
    stopVoice: () => void;
    livekitToken: string | null;
    livekitUrl: string | null;
    backendBase: string;
    voiceError: string | null;
    clearVoiceError: () => void;
}

// ─── Voice Context ────────────────────────────────────────────────────────────

interface VoiceContextType {
    isVoiceActive: boolean;
    voicePhase: VoicePhase;
    startVoice: () => Promise<void>;
    stopVoice: () => void;
    voiceError: string | null;
    clearVoiceError: () => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

// ─── Inject pulse keyframe once ──────────────────────────────────────────────
(function injectPulseStyle() {
    if (typeof document === "undefined") return;
    const id = "yajur-pulse-keyframe";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
        @keyframes yajur-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(0.8); }
        }
    `;
    document.head.appendChild(style);
})();

// ─── VoiceStateTracker ───────────────────────────────────────────────────────
// Rendered inside <LiveKitRoom> to map agent state → voicePhase.
// Must be a child of LiveKitRoom so it can use LiveKit hooks.

const VoiceStateTracker: React.FC<{ setVoicePhase: (p: VoicePhase) => void }> = ({
    setVoicePhase,
}) => {
    const { state } = useVoiceAssistant();
    useEffect(() => {
        if (state === "listening") setVoicePhase("listening");
        else if (state === "thinking") setVoicePhase("processing");
        else if (state === "speaking") setVoicePhase("speaking");
        else setVoicePhase("idle");
    }, [state, setVoicePhase]);
    return null;
};

// ─── CustomInput ─────────────────────────────────────────────────────────────
// Defined at MODULE LEVEL so React never treats it as a new component type on re-renders.

const CustomInput = (props: any) => {
    const voice = useContext(VoiceContext)!;
    const [inputValue, setInputValue] = React.useState("");

    const handleSend = () => {
        if (inputValue.trim()) {
            props.onSend(inputValue);
            setInputValue("");
        }
    };

    const phaseColor: Record<VoicePhase, string> = {
        idle: "#6c757d",
        listening: "#28a745",
        processing: "#fd7e14",
        speaking: "#6610f2",
    };
    const phaseLabel: Record<VoicePhase, string> = {
        idle: "",
        listening: "Listening…",
        processing: "Processing…",
        speaking: "Speaking…",
    };

    return (
        <div
            className="yajur-custom-input-container"
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "12px",
                backgroundColor: "var(--copilot-kit-background-color)",
                borderTop: "1px solid var(--copilot-kit-separator-color)",
            }}
        >
            {/* Voice session phase indicator */}
            {voice.isVoiceActive && voice.voicePhase !== "idle" && (
                <div style={{ padding: "0 4px" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: phaseColor[voice.voicePhase],
                        }}
                    >
                        <span
                            style={{
                                display: "inline-block",
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: "currentColor",
                                animation: "yajur-pulse 1s ease-in-out infinite",
                            }}
                        />
                        {phaseLabel[voice.voicePhase]}
                    </div>
                </div>
            )}

            {/* Voice error banner */}
            {voice.voiceError && (
                <div
                    style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        backgroundColor: "#fff3cd",
                        color: "#856404",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                    }}
                >
                    <span>{voice.voiceError}</span>
                    <button
                        onClick={voice.clearVoiceError}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#856404",
                            padding: "0 2px",
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Input row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={
                        voice.isVoiceActive
                            ? "Voice active — or type here…"
                            : "Type a message or press the mic…"
                    }
                    style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "20px",
                        border: "1px solid var(--copilot-kit-separator-color)",
                        backgroundColor: "var(--copilot-kit-input-background-color)",
                        color: "var(--copilot-kit-contrast-color)",
                        outline: "none",
                        fontFamily: "inherit",
                    }}
                />

                {/* Mic / Stop button */}
                <button
                    onClick={() =>
                        voice.isVoiceActive ? voice.stopVoice() : voice.startVoice()
                    }
                    title={
                        voice.isVoiceActive
                            ? "Stop voice session"
                            : "Start voice session"
                    }
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: voice.isVoiceActive
                            ? "#dc3545"
                            : "var(--copilot-kit-primary-color)",
                        boxShadow: voice.isVoiceActive
                            ? "0 0 0 3px rgba(220,53,69,0.35)"
                            : "none",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                    }}
                >
                    {voice.isVoiceActive ? (
                        /* Stop / X icon */
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    ) : (
                        /* Mic icon */
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    )}
                </button>

                {/* Send button */}
                <button
                    onClick={handleSend}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "transparent",
                        color: "var(--copilot-kit-primary-color)",
                        border: "none",
                        cursor: "pointer",
                        flexShrink: 0,
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>

            {/* Version badge */}
            <div
                style={{
                    textAlign: "center",
                    fontSize: "10px",
                    color: "#aaa",
                    paddingBottom: "4px",
                    letterSpacing: "0.03em",
                }}
            >
                v{WIDGET_VERSION}
            </div>
        </div>
    );
};

// ─── UnifiedChat ──────────────────────────────────────────────────────────────

export const UnifiedChat: React.FC<UnifiedChatProps> = ({
    isVoiceActive,
    voicePhase,
    setVoicePhase,
    startVoice,
    stopVoice,
    livekitToken,
    livekitUrl,
    voiceError,
    clearVoiceError,
}) => {
    const { appendMessage } = useCopilotChat() as any;

    useCopilotReadable({
        description:
            "Comprehensive knowledge base about Yajur Healthcare / Yajur.ai — the Medical Data Infrastructure Company",
        value: YAJUR_KNOWLEDGE,
    });

    // Feed LiveKit transcriptions into CopilotKit chat (display only — no LLM trigger)
    const handleTranscription = useCallback(
        (text: string, role: "user" | "assistant") => {
            if (!text.trim()) return;
            appendMessage(
                new TextMessage({
                    role: role === "user" ? Role.User : Role.Assistant,
                    content: text,
                })
            );
        },
        [appendMessage]
    );

    const voiceContextValue: VoiceContextType = {
        isVoiceActive,
        voicePhase,
        startVoice,
        stopVoice,
        voiceError,
        clearVoiceError,
    };

    return (
        <VoiceContext.Provider value={voiceContextValue}>
            <div
                style={
                    {
                        "--copilot-kit-primary-color": "#d97757",
                        "--copilot-kit-background-color": "#faf9f5",
                        "--copilot-kit-contrast-color": "#010101",
                        "--copilot-kit-secondary-color": "#f0eee6",
                        "--copilot-kit-input-background-color": "#fff",
                        "--copilot-kit-separator-color": "#e0ded8",
                    } as React.CSSProperties
                }
            >
                {/* LiveKit room — only mounted when voice is active */}
                {isVoiceActive && livekitToken && livekitUrl && (
                    <LiveKitRoom
                        serverUrl={livekitUrl}
                        token={livekitToken}
                        audio={true}
                        video={false}
                        connect={true}
                        style={{ display: "none" }}
                    >
                        {/* Plays the agent's audio output through the browser speaker */}
                        <RoomAudioRenderer />
                        {/* Feeds final transcripts (user + agent) into CopilotKit chat */}
                        <TranscriptionSync onTranscription={handleTranscription} />
                        {/* Maps LiveKit agent state → voicePhase for the UI indicator */}
                        <VoiceStateTracker setVoicePhase={setVoicePhase} />
                    </LiveKitRoom>
                )}

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

The user may be speaking to you via voice (microphone) or typing. Treat both equally.
Automatically detect the user's language (English, Hindi, Tamil, etc.) and respond in the same language.
Keep responses concise — 2-4 sentences — since they will be read aloud via text-to-speech.

Do NOT provide clinical medical advice. Always recommend consulting a qualified healthcare professional for medical decisions.`}
                    labels={{
                        title: `Yajur AI  ·  v${WIDGET_VERSION}`,
                        initial: "Welcome to Yajur Healthcare. How can I help you today?",
                        placeholder: "Type a message or press the mic…",
                    }}
                    clickOutsideToClose={false}
                    Input={CustomInput}
                />
            </div>
        </VoiceContext.Provider>
    );
};

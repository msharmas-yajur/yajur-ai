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

## Company Overview
Yajur.ai (Yajur Healthcare) is a Medical Data Infrastructure Company based in India. We build disease-specific datasets, AI-driven healthcare applications, and compliance-driven interoperability pipelines (ABDM/FHIR).
- Website: https://yajur.ai
- Email: connect@yajur.ai
- WhatsApp: https://wa.me/message/E7VVRHRTVZIYC1
- Founder: Manish Sharma

## Mission & Vision
- Mission: Bridge the gap between fragmented medical records and actionable AI insights.
- Vision: "There’s a clear paradigm shift taking place across medical information, and we are at the forefront of this transformation."

## Core Pillars
1. Data — Disease-Specific Datasets: High-fidelity, curated clinical datasets (design, curation, engineering).
2. AI — Driven Applications: Patient-centric multi-modal pipelines with intelligent co-pilots and persona-aware experiences.
3. Integration — Interoperability: FHIR-based standards pipelines, ABDM/NHCX compliance, real-time data flows.

## Impact Areas
- Bridging the Gap: Eliminating redundant tests and broken care pathways.
- Enhancing Outcomes: Precision medicine via AI + multi-modal data.
- Empowering Stakeholders: Solutions for hospitals, researchers, and insurers.

## Key Technologies & Compliance
- Standards: FHIR, ABDM (India's national digital health network), NHCX (insurance claims), ICD-10, SNOMED CT.
- Compliance: HIPAA, SOC 2, ABDM, DHA (pending).
- Technical: Human-in-the-Loop (HITL) pipelines, provenance tracing, context engineering.

## Four Health Record Types
The foundation of longitudinal clinical AI:
1. Clinical Records (doctor notes)
2. Lab Tests (biomarkers)
3. Radiology (imaging)
4. Pharmacy Prescriptions (medication history)

## Clinical Reasoning Pipelines
Yajur's key differentiator: building infrastructure around AI models to improve context quality:
- Multilingual HITL annotation (22 Indian languages).
- Structured validation against FHIR and ICD-10.
- Safety: Schema-aware, traceable provenance, ambiguity surfacing.

## Task Framework for Healthcare AI (March 2025)
Maps EHR workflows to agentic architectures:
- Patient events → Projects; care team → AI agents; actions → Tasks (Pending/In Progress/Paused/Completed/Failed).
- Agent Types: Front Desk, Nurse, Doctor, Consultant, Meta Reviewer, Care Plan Author.

## ABDM & NHCX
- ABDM: India's federated health architecture; 859M+ ABHA accounts.
- NHCX: "One rail, many claims" standardized claims exchange (1-hour pre-auth mandate).

## The Convergence (AI Leaders on Healthcare)
- Dario Amodei: Biology compression (50-100 years of progress in 5-10 years).
- Demis Hassabis: AlphaFold; first AI-designed cancer drug in Phase 1 trials.
- Satya Nadella: AI must prove ROI in healthcare to earn legitimacy.
- Sundar Pichai: Leapfrog thesis — India can skip legacy infra with AI.
- Andrej Karpathy: Agentic engineering — clinicians can build tools directly.
- Andrew Ng: Agentic workflows > foundation models; data drift is the #1 risk.

## Positioning
Not building models or compute. Building the CLINICAL CONTEXT LAYER: structured pipelines, validated data, task frameworks, and governance.

## Blog / Pontifex Articles
1. Health Record Formats (Nov 2024)
2. Fine-Tuning LLMs for Oncology (Dec 2024)
3. Task Framework for Healthcare AI (Mar 2025)
4. Smarter AI Demands Smarter Context (Jul 2025)
5. Ethical & Sustainable AI Framework (Oct 2025)
6. NHCX: Digitizing the First Question (Feb 2026)
7. Why Digitization Alone Couldn't Fix Claims (Feb 2026)
8. ABDM: Cancer Care Without Walls (Feb 2026)
9. From Vibe Coding to Agentic Engineering (Feb 2026)
10. The Convergence (Feb 2026)

## Yajur Labs — Live Interactive Tools
Yajur Labs are live, browser-based applications on yajur.ai showcasing Yajur's clinical AI capabilities. Accessible via the Yajur Labs menu.

1. Onco-CoE: Patient OncoCare Intelligence Platform (https://yajur.ai/gcoe-patient-oncocare-v7.html) — AI-powered precision patient navigation for oncology. "Air traffic control" model for cancer care across a hub-and-spoke network. Features real-time Command Center, adaptive AI care plans, 20 AI innovations, FHIR/ABDM interoperability.

2. Nursing Clinical Rotation Roster PSNL (https://yajur.ai/nursing-roster-v5.html) — Browser-based nursing rotation scheduling with PSNL balancing and Excel export. Built with React 18, fully client-side.

3. Healthcare Data Lakehouse Sandbox Navigator (https://yajur.ai/sandbox/datalakehouse-navigator.html) — Interactive reference architecture for hospital data lakehouses using open-source tools (NiFi, Kafka, Spark, Iceberg, Trino, Superset, MLflow, HAPI FHIR, dbt). Zero vendor lock-in. Includes 5 clinical use cases with full SQL.

## Contact
To connect with the Yajur team for demos, partnerships, or business inquiries:
- Email: connect@yajur.ai
- WhatsApp: https://wa.me/message/E7VVRHRTVZIYC1
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
- Guide users to connect@yajur.ai or WhatsApp (https://wa.me/message/E7VVRHRTVZIYC1) for partnerships, demos, and business inquiries — always offer both options when a user expresses interest in connecting
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

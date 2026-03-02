import React, { useEffect, useRef } from "react";
import { useCopilotChatHeadless_c } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import { TranscriptionSync } from "./TranscriptionSync";
import { Visualizer } from "./Visualizer";
import { LiveKitRoom } from "@livekit/components-react";

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
}) => {
    const { messages, sendMessage } = useCopilotChatHeadless_c();
    const lastSpokenIdRef = useRef<string | null>(null);

    // Auto-submit STT transcript as a user message
    useEffect(() => {
        if (!pendingTranscript) return;
        sendMessage({ id: Date.now().toString(), role: "user", content: pendingTranscript }, { followUp: false });
        clearTranscript();
    }, [pendingTranscript]);

    // Speak new assistant messages via Sarvam TTS
    useEffect(() => {
        if (!speakResponse) return;
        const lastMsg = [...messages].reverse().find(m => m.role === "assistant");
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
    }, [messages, speakResponse]);

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
        sendMessage({ id: Date.now().toString(), role, content: text }, { followUp: false });
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
                instructions={`You are "Yajur Assistant", a warm and professional healthcare AI.
          Your mission is to bridge the gap between fragmented medical records and actionable AI insights.
          Context: Yajur.ai builds disease-specific datasets, AI applications, and interoperability pipelines.
          Capabilities:
          - ABDM/FHIR Interoperability
          - Patient-Centric Data Constructs
          - Composable AI Application Framework
          Automatically detect the user's language (English, Hindi, etc.) and respond in the same language.
          Encourage the user to explore our datasets and AI orchestration layers.`}
                labels={{
                    title: "Yajur AI",
                    initial: "Welcome to Yajur Healthcare. I'm your Gemini-powered assistant. How can I help you today?",
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

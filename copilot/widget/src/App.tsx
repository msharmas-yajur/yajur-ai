import React, { useState, useEffect, useCallback } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { UnifiedChat } from "./components/UnifiedChat";

export const WIDGET_VERSION = "2.1.0"; // bump on every session: major.session.patch

const BACKEND_BASE = "http://localhost:3330";
const COPILOTKIT_PUBLIC_KEY = "ck_pub_3e7127dba63bdcd42c0eb65ba64c9289";

export type VoicePhase = "idle" | "listening" | "processing" | "speaking";

const App: React.FC = () => {
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
    const [livekitToken, setLivekitToken] = useState<string | null>(null);
    const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
    const [voiceError, setVoiceError] = useState<string | null>(null);

    // ─── startVoice ──────────────────────────────────────────────────────────
    const startVoice = async () => {
        setVoiceError(null);
        try {
            const res = await fetch(
                `${BACKEND_BASE}/api/livekit?room=yajur-voice&username=visitor-${Date.now()}`
            );
            if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
            const { accessToken, wsUrl } = await res.json();
            setLivekitToken(accessToken);
            setLivekitUrl(wsUrl);
            setIsVoiceActive(true);
            setVoicePhase("listening");
        } catch (e: any) {
            console.error("Failed to start voice", e);
            const msg = e?.message || String(e);
            if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
                setVoiceError("Voice unavailable: backend not reachable. Use text chat.");
            } else {
                setVoiceError("Voice unavailable. Please use text chat.");
            }
        }
    };

    // ─── stopVoice ───────────────────────────────────────────────────────────
    const stopVoice = useCallback(() => {
        setLivekitToken(null);
        setLivekitUrl(null);
        setIsVoiceActive(false);
        setVoicePhase("idle");
    }, []);

    // Hide CopilotKit dev inspector and announcements
    useEffect(() => {
        const style = document.createElement("style");
        style.textContent = `
            cpk-web-inspector,
            .announcement-preview,
            [class*="announcement"],
            .copilot-kit-announcement,
            div[class*="copilot-kit"][style*="background-color: rgb(255, 193, 7)"],
            div[class*="copilot-kit"][style*="background-color: #ffc107"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                height: 0 !important;
                position: absolute !important;
                z-index: -999 !important;
            }

            /* ── Override CopilotKit CSS variables ── */
            :root {
                --copilot-kit-primary-color: rgba(191, 87, 0, 0.09) !important;
                --copilot-kit-contrast-color: #3d1a00 !important;
            }

            /* ── User message: lightest burnt orange ── */
            .copilotKitMessage.copilotKitUserMessage {
                background: rgba(191, 87, 0, 0.09) !important;
                border: 1px solid rgba(191, 87, 0, 0.22) !important;
                color: #3d1a00 !important;
            }

            /* ── Assistant message: navy blue text, very light bg ── */
            .copilotKitMessage.copilotKitAssistantMessage {
                background: transparent !important;
                color: #09152A !important;
            }
            .copilotKitMessage.copilotKitAssistantMessage,
            .copilotKitMessage.copilotKitAssistantMessage p,
            .copilotKitMessage.copilotKitAssistantMessage li,
            .copilotKitMessage.copilotKitAssistantMessage h1,
            .copilotKitMessage.copilotKitAssistantMessage h2,
            .copilotKitMessage.copilotKitAssistantMessage h3,
            .copilotKitMessage.copilotKitAssistantMessage span,
            .copilotKitMessage.copilotKitAssistantMessage strong,
            .copilotKitMessage.copilotKitAssistantMessage em,
            .copilotKitMessage.copilotKitAssistantMessage code {
                color: #09152A !important;
            }
        `;
        document.head.appendChild(style);

        const interval = setInterval(() => {
            const inspector = document.querySelector("cpk-web-inspector");
            if (inspector && inspector.shadowRoot) {
                const shadowStyle = document.createElement("style");
                shadowStyle.textContent = `
                    .announcement-preview, 
                    [class*="announcement"],
                    div[style*="background-color: rgb(255, 193, 7)"],
                    div[style*="background-color: #ffc107"] { 
                        display: none !important; 
                    }
                `;
                inspector.shadowRoot.appendChild(shadowStyle);
            }
            
            // Also try to find it in the regular DOM (some SDK versions don't use shadow DOM for this)
            const announcements = document.querySelectorAll('[class*="announcement"]');
            announcements.forEach(el => (el as HTMLElement).style.display = 'none');
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        console.info(`Yajur Copilot Widget v${WIDGET_VERSION}`);
    }, []);

    return (
        <CopilotKit 
            publicApiKey={COPILOTKIT_PUBLIC_KEY}
            publicLicenseKey={COPILOTKIT_PUBLIC_KEY} 
            showDevConsole={false}
        >
            <div className="yajur-copilot-container" data-version={WIDGET_VERSION}>
                <UnifiedChat
                    isVoiceActive={isVoiceActive}
                    voicePhase={voicePhase}
                    setVoicePhase={setVoicePhase}
                    startVoice={startVoice}
                    stopVoice={stopVoice}
                    livekitToken={livekitToken}
                    livekitUrl={livekitUrl}
                    backendBase={BACKEND_BASE}
                    voiceError={voiceError}
                    clearVoiceError={() => setVoiceError(null)}
                />
            </div>
        </CopilotKit>
    );
};

export default App;

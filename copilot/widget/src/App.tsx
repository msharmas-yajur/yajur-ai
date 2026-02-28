import React, { useState, useEffect } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import {
    LiveKitRoom,
    VoiceAssistantControlBar,
} from "@livekit/components-react";
import { Languages, Phone, PhoneOff } from "lucide-react";
import "@copilotkit/react-ui/styles.css";

// The backend URL should be the URL where your Copilot backend is hosted.
const BACKEND_URL = "https://caladriusprod.tail5b7deb.ts.net/api/copilot";
const LIVEKIT_TOKEN_URL = "https://caladriusprod.tail5b7deb.ts.net/api/livekit";

const App: React.FC = () => {
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [language, setLanguage] = useState("English");

    const startVoice = async () => {
        try {
            const resp = await fetch(`${LIVEKIT_TOKEN_URL}?room=yajur-voice&username=visitor`);
            const data = await resp.json();
            setToken(data.accessToken);
            setIsVoiceActive(true);
        } catch (e) {
            console.error("Failed to get voice token", e);
        }
    };

    return (
        <CopilotKit runtimeUrl={BACKEND_URL}>
            <div className="yajur-copilot-container">
                <CopilotPopup
                    instructions={`You are the Yajur Healthcare assistant. You help visitors understand Yajur's mission and medical data infrastructure capabilities. 
          Use context from yajur.ai website.
          Support Indian languages through Sarvam AI integration.
          Current language context: ${language}`}
                    labels={{
                        title: "Yajur AI Assistant",
                        initial: "Hi! How can I help you with Yajur's medical data infrastructure today?",
                    }}
                    clickOutsideToClose={false}
                />

                {/* Custom Controls Container */}
                <div
                    style={{
                        position: 'fixed',
                        bottom: '90px',
                        right: '20px',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    {/* Language Toggle */}
                    <button
                        onClick={() => setLanguage(l => l === "English" ? "Hindi" : "English")}
                        style={{
                            padding: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            border: '1px solid #ccc',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}
                        title={`Switch to ${language === "English" ? "Hindi" : "English"}`}
                    >
                        <Languages size={20} color="#007bff" />
                    </button>

                    {/* Voice Toggle */}
                    <button
                        onClick={() => isVoiceActive ? setIsVoiceActive(false) : startVoice()}
                        style={{
                            padding: '10px',
                            borderRadius: '50%',
                            backgroundColor: isVoiceActive ? '#dc3545' : '#28a745',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                            color: '#fff'
                        }}
                        title={isVoiceActive ? "End Voice Session" : "Start Voice Assistant"}
                    >
                        {isVoiceActive ? <PhoneOff size={20} /> : <Phone size={20} />}
                    </button>
                </div>

                {/* LiveKit Voice Layer */}
                {isVoiceActive && token && (
                    <div style={{ display: 'none' }}>
                        <LiveKitRoom
                            video={false}
                            audio={true}
                            token={token}
                            serverUrl="wss://your-project.livekit.cloud" // Replace with your LiveKit URL
                            onDisconnected={() => setIsVoiceActive(false)}
                        >
                            <VoiceAssistantControlBar />
                        </LiveKitRoom>
                    </div>
                )}
            </div>
        </CopilotKit>
    );
};

export default App;

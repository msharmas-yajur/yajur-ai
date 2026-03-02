import React, { useState, useEffect, useRef } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { UnifiedChat } from "./components/UnifiedChat";

const BACKEND_BASE = "https://caladriusprod.tail5b7deb.ts.net";
const COPILOTKIT_PUBLIC_KEY = "ck_pub_3e7127dba63bdcd42c0eb65ba64c9289";
const LIVEKIT_TOKEN_URL = `${BACKEND_BASE}/api/livekit`;

const App: React.FC = () => {
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));
    const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
    const [ttsLanguage, setTtsLanguage] = useState("en-IN");
    const [speakResponse, setSpeakResponse] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startVoice = async () => {
        setVoiceError(null);
        try {
            const resp = await fetch(`${LIVEKIT_TOKEN_URL}?room=yajur-voice&username=visitor`);
            if (!resp.ok) throw new Error(`Backend error: ${resp.status}`);
            const data = await resp.json();
            setToken(data.accessToken);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            micStreamRef.current = stream;

            // AnalyserNode for real-time visualizer
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;
            audioCtx.createMediaStreamSource(stream).connect(analyser);

            const tick = () => {
                const bins = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(bins);
                setAudioData(new Uint8Array(bins));
                animFrameRef.current = requestAnimationFrame(tick);
            };
            tick();

            // MediaRecorder to capture audio blobs for Sarvam STT
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";
            const recorder = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                audioChunksRef.current = [];
                try {
                    const form = new FormData();
                    form.append("file", blob, "audio.webm");
                    const res = await fetch(`${BACKEND_BASE}/api/sarvam/stt`, {
                        method: "POST",
                        body: form,
                    });
                    const { transcript, language } = await res.json();
                    if (transcript) {
                        if (language) setTtsLanguage(language);
                        setSpeakResponse(true);
                        setPendingTranscript(transcript);
                    }
                } catch (e) {
                    console.error("STT failed", e);
                }
            };
            recorder.start();
            mediaRecorderRef.current = recorder;

            setIsVoiceActive(true);
        } catch (e: any) {
            console.error("Failed to start voice", e);
            const msg = e?.message || String(e);
            if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch")) {
                setVoiceError("Voice unavailable: backend not reachable. Please use text chat.");
            } else if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
                setVoiceError("Microphone access denied. Please allow mic permissions and try again.");
            } else {
                setVoiceError("Voice unavailable. Please use text chat.");
            }
        }
    };

    const stopVoice = () => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        setIsVoiceActive(false);
        setToken(null);
        setAudioData(new Uint8Array(0));
    };

    // Hide CopilotKit dev inspector
    useEffect(() => {
        const interval = setInterval(() => {
            const inspector = document.querySelector('cpk-web-inspector');
            if (inspector) {
                (inspector as HTMLElement).style.display = 'none';
                if (inspector.shadowRoot) {
                    const style = document.createElement('style');
                    style.textContent = '.announcement-preview { display: none !important; }';
                    inspector.shadowRoot.appendChild(style);
                }
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <CopilotKit publicApiKey={COPILOTKIT_PUBLIC_KEY}>
            <div className="yajur-copilot-container">
                <UnifiedChat
                    isVoiceActive={isVoiceActive}
                    setIsVoiceActive={setIsVoiceActive}
                    token={token}
                    startVoice={startVoice}
                    stopVoice={stopVoice}
                    audioData={audioData}
                    pendingTranscript={pendingTranscript}
                    clearTranscript={() => setPendingTranscript(null)}
                    speakResponse={speakResponse}
                    onTtsComplete={() => setSpeakResponse(false)}
                    ttsLanguage={ttsLanguage}
                    backendBase={BACKEND_BASE}
                    voiceError={voiceError}
                    clearVoiceError={() => setVoiceError(null)}
                />
            </div>
        </CopilotKit>
    );
};

export default App;

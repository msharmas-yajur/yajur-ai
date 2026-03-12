"""
Sarvam AI STT and TTS plugins for LiveKit Agents 1.4.x

STT: Sarvam saarika:v2.5  — accepts WAV, auto-detects language
TTS: Sarvam bulbul:v2     — returns base64-encoded WAV audio
"""
from __future__ import annotations

import base64
import io
import logging
import re
import wave
from typing import Optional

import aiohttp
from livekit import rtc
from livekit.agents import stt, tts, utils, APIConnectOptions

logger = logging.getLogger(__name__)

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"


def _chunk_text(text: str, max_len: int = 400) -> list[str]:
    """Split text into sentence-boundary chunks ≤ max_len chars."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: list[str] = []
    current = ""
    for s in sentences:
        if len(current) + len(s) + 1 <= max_len:
            current = (current + " " + s).strip()
        else:
            if current:
                chunks.append(current)
            current = s
    if current:
        chunks.append(current)
    return chunks if chunks else [text[:max_len]]


# ─── SarvamSTT ────────────────────────────────────────────────────────────────


class SarvamSTT(stt.STT):
    """Non-streaming STT using Sarvam saarika:v2.5."""

    def __init__(self, api_key: str) -> None:
        super().__init__(
            capabilities=stt.STTCapabilities(
                streaming=False,
                interim_results=False,
            )
        )
        self._api_key = api_key

    async def _recognize_impl(
        self,
        buffer: utils.AudioBuffer,
        *,
        language: Optional[str] = None,
        conn_options: APIConnectOptions,
    ) -> stt.SpeechEvent:
        # Combine all audio frames and convert to WAV bytes
        combined = rtc.combine_audio_frames(buffer)
        wav_bytes = combined.to_wav_bytes()

        form = aiohttp.FormData()
        form.add_field(
            "file",
            wav_bytes,
            filename="audio.wav",
            content_type="audio/wav",
        )
        form.add_field("model", "saarika:v2.5")
        form.add_field("language_code", "unknown")  # auto-detect

        async with aiohttp.ClientSession() as http:
            async with http.post(
                SARVAM_STT_URL,
                data=form,
                headers={"api-subscription-key": self._api_key},
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    logger.error("Sarvam STT error %d: %s", resp.status, body)
                    return stt.SpeechEvent(
                        type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                        alternatives=[stt.SpeechData(text="", language=language or "en-IN")],
                    )
                data = await resp.json()

        transcript = data.get("transcript", "").strip()
        detected_language = data.get("language_code") or language or "en-IN"
        logger.debug("Sarvam STT: %r [%s]", transcript, detected_language)

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(
                    text=transcript,
                    language=detected_language,
                    confidence=1.0,
                )
            ],
        )


# ─── SarvamTTS ────────────────────────────────────────────────────────────────


class SarvamTTS(tts.TTS):
    """Non-streaming TTS using Sarvam bulbul:v2."""

    def __init__(
        self,
        api_key: str,
        language_code: str = "en-IN",
        speaker: str = "anushka",
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=22050,
            num_channels=1,
        )
        self._api_key = api_key
        self._language_code = language_code
        self._speaker = speaker

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions,
    ) -> "SarvamChunkedStream":
        return SarvamChunkedStream(
            tts=self,
            input_text=text,
            conn_options=conn_options,
        )


class SarvamChunkedStream(tts.ChunkedStream):
    """Fetch audio from Sarvam TTS and push raw PCM to AudioEmitter."""

    def __init__(
        self,
        *,
        tts: SarvamTTS,
        input_text: str,
        conn_options: APIConnectOptions,
    ) -> None:
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        tts_instance: SarvamTTS = self._tts  # type: ignore[assignment]
        chunks = _chunk_text(self._input_text)

        async with aiohttp.ClientSession() as http:
            async with http.post(
                SARVAM_TTS_URL,
                json={
                    "inputs": chunks,
                    "target_language_code": tts_instance._language_code,
                    "speaker": tts_instance._speaker,
                    "model": "bulbul:v2",
                    "enable_preprocessing": True,
                },
                headers={
                    "api-subscription-key": tts_instance._api_key,
                    "Content-Type": "application/json",
                },
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    logger.error("Sarvam TTS error %d: %s", resp.status, body)
                    return
                data = await resp.json()

        audios = data.get("audios", [])
        if not audios:
            logger.warning("Sarvam TTS returned no audio")
            return

        # Decode all base64 WAV clips → extract raw int16 PCM bytes
        # Push as raw PCM so AudioEmitter can re-chunk into correct frame sizes
        all_pcm = bytearray()
        sample_rate = 22050

        for audio_b64 in audios:
            wav_bytes = base64.b64decode(audio_b64)
            with wave.open(io.BytesIO(wav_bytes)) as wf:
                sample_rate = wf.getframerate()
                pcm_data = wf.readframes(wf.getnframes())
            all_pcm.extend(pcm_data)

        output_emitter.initialize(
            request_id=utils.shortuuid(),
            sample_rate=sample_rate,
            num_channels=1,
            mime_type="audio/pcm",  # raw int16 PCM — AudioEmitter handles framing
        )
        output_emitter.push(bytes(all_pcm))
        output_emitter.end_input()

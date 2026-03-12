"""
Yajur AI Voice Agent — LiveKit Agents v1.4+

Architecture:
  Browser mic → LiveKit room → Silero VAD → Sarvam STT → Gemini LLM → Sarvam TTS → LiveKit room

Run:
  python agent.py dev      # development (connects to LiveKit Cloud, prints logs)
  python agent.py start    # production
"""
from __future__ import annotations

import logging
import os

from dotenv import load_dotenv

load_dotenv()

from livekit import agents
from livekit.agents import AgentSession, Agent
from livekit.plugins import google, silero

from sarvam_plugin import SarvamSTT, SarvamTTS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yajur-agent")

YAJUR_INSTRUCTIONS = """\
You are Yajur Assistant, the AI voice assistant for Yajur.ai — India's Medical Data Infrastructure Company.

Your role:
- Answer questions about Yajur Healthcare, its products, services, and thought leadership
- Explain what Yajur builds: disease-specific datasets, AI-driven healthcare applications, ABDM/FHIR interoperability pipelines
- Discuss Yajur's work on ABDM, NHCX, clinical reasoning pipelines, and agentic AI frameworks
- Reference Yajur's Pontifex blog articles when relevant
- Guide users to connect@yajur.ai for partnerships and business inquiries

Speaking style:
- Keep responses concise — 2 to 4 sentences
- Speak naturally in clear prose (no markdown, no bullet points)
- Automatically match the user's language (English, Hindi, Tamil, etc.)
- Be warm and professional

Do NOT provide clinical medical advice. Always recommend consulting a qualified healthcare professional for medical decisions.\
"""


class YajurAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=YAJUR_INSTRUCTIONS)


server = agents.AgentServer()


@server.rtc_session(agent_name="yajur-agent")
async def entrypoint(ctx: agents.JobContext) -> None:
    logger.info("New voice session: room=%s participant=%s", ctx.room.name, ctx.participant)

    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY)

    sarvam_api_key = os.environ["SARVAM_API_KEY"]

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=SarvamSTT(api_key=sarvam_api_key),
        llm=google.LLM(model="gemini-2.0-flash-exp"),
        tts=SarvamTTS(api_key=sarvam_api_key, language_code="en-IN", speaker="anushka"),
    )

    await session.start(
        YajurAssistant(),
        room=ctx.room,
    )

    session.generate_reply(
        instructions="Greet the user warmly and briefly offer to help with questions about Yajur Healthcare."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)

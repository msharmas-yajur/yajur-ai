# Kodai 1994 — Captions, transcripts and video descriptions

**Status:** Built 2026-10-21 with the private defaults (§7); full run waiting for the go-ahead
**Date:** 2026-10-20
**Branch:** `claude/secure-video-library`
**Where it lives:** `jellyfin/kodai1994/` (worker, community service, page)

---

## 1. Goal

1. **Closed captions** on every recording, with **language detection**, a transcript in the
   language spoken, and an **English translation** (more languages optional).
2. A **description for every video**, written from its full transcript, so members know
   what each recording contains before watching.

Captions come first: they produce the transcripts the descriptions are written from.

## 2. What we're working with

- 18 recordings, ~37 hours, stereo AAC 48 kHz from VHS tape (hiss, crowd noise, singing).
- Very likely **mixed Telugu and English**: discourses with live English interpretation,
  bhajans, English conversation. To be confirmed by the pilot.
- Mixed-language speech is the hard part: Telugu is where services differ most, and
  code-switched speech roughly doubles Whisper's error rate (CS-FLEURS).

## 3. Options for speech-to-text

| Option | Telugu | Language detection | Translation | Cost, all 37 h | Audio goes to |
|---|---|---|---|---|---|
| **Sarvam Saaras v3** (recommended) | Built for Indian languages; claims Telugu–English code-switching | Automatic | Speech → English in the same API | ≈ ₹30/h per pass → ≈ ₹1,100 transcript + ≈ ₹1,100 English | Sarvam (India); already used by the yajur.ai voice assistant |
| ElevenLabs Scribe | Strong in its own (self-published) benchmark | Automatic | Separate step | Check current pricing | ElevenLabs (US) |
| Whisper large-v3-turbo, local (whisper.cpp, Vulkan on the RX 580, or CPU) | Weak; good English | Per 30 s window | English only | Free; ~1.6 GB download | Stays on this machine |

## 4. Plan

1. **Pilot (one evening, ≈ ₹50).** Three 10-minute clips (a discourse, the picnic, a
   bhajan) through Sarvam and local Whisper; side-by-side members-only comparison page;
   pick the service.
2. **Transcribe all recordings**, one at a time in the media worker queue: extract audio
   (16 kHz mono), voice-activity detection (skip silence, which makes Whisper invent text),
   chunk, send, store per line `{start, end, language, text, text_en}`.
3. **Captions in the player:** WebVTT tracks next to the HLS streams (members-only), a CC
   menu in Video.js: "Original (as spoken)", "English", optional Hindi/Telugu/Tamil
   (translated from text: cheap).
   - Bonus: a transcript panel beside the video (current line highlighted, click to
     jump) and search across everything said in all recordings.
4. **Descriptions:** an LLM (Claude) reads each transcript plus the chapters, events and
   tagged people, and writes a 2–4 sentence description (Timeline/Gallery cards, player)
   and optionally **suggested chapters with times** to accept or reject, like the face
   suggestions. Labelled "Summary written from the recording's speech" until an
   administrator edits or approves it. Estimated cost ≈ US$2–5 once.
5. **Backup:** transcripts, caption files and descriptions join the nightly Drive backup.

## 5. Risks

- VHS audio and singing → gaps and errors; plan a caption editor after the pilot.
- Privacy: with Sarvam/Claude, audio and transcripts are processed by those companies.

## 6. Decisions needed before starting

1. OK to send audio to Sarvam (and transcripts to Claude)? Or keep everything local?
2. Caption languages beyond Original + English (Hindi? Telugu? Tamil?).
3. Descriptions with Claude: which Anthropic API key / billing account?
4. Who may edit descriptions and captions: administrators only, or all members?

## 7. What was built (2026-10-21)

Decisions taken, as the private defaults (change any of them later):
1. **Audio stays on this machine**: Whisper large-v3-turbo (faster-whisper, int8, CPU) in a
   container with no network. Sarvam isn't used (no key in the stack).
2. **Captions**: "Original (as spoken)"; "English" appears for recordings in another
   language once lines have English text.
3. **Descriptions**: `describe.py` with Claude, only once `ANTHROPIC_API_KEY` is in `.env`.
4. **Editing**: moderators correct lines and descriptions (audit-logged).

Pilot findings (3-4 minute stretches of the 14 April discourse, the 1 May Q&A, and the
picnic): the tapes are mostly **English** conversation and Q&A. With the language sampled
once per recording and the "Voice focus" sound, the English is readable with mistakes
(names, overlapping voices). Forcing Telugu gave nonsense, and Whisper's translation of
Telugu output Telugu script, not English: **local translation doesn't work**. Singing makes
Whisper loop; repetitive, low-confidence and wrong-script lines are dropped. Speed ≈ 3-4×
real time on 6-8 cores (all 37 h ≈ 10-12 h of CPU).

Next, if wanted: queue everything (*Transcribe every recording without one*); add a Sarvam
or Claude step for English lines of Telugu parts; set `ANTHROPIC_API_KEY` for descriptions.

## Sources

- Sarvam pricing: https://docs.sarvam.ai/api-reference-docs/pricing
- Sarvam models/languages: https://docs.sarvam.ai/api-reference-docs/getting-started/models
- Sarvam Telugu STT: https://www.sarvam.ai/apis/speech-to-text/telugu
- ElevenLabs Telugu STT (vendor claims): https://elevenlabs.io/pt/speech-to-text/telugu
- ConvoZen Telugu benchmark (competitor test): https://convozen.ai/products/telugu-speech-to-text
- CS-FLEURS code-switching dataset: https://arxiv.org/pdf/2509.14161
- whisper.cpp on AMD via Vulkan: https://www.maroonmed.com/subtitle-edit-and-whisper-cpp-stt-on-amd-and-other-non-nvidia-gpus-with-vulkan/

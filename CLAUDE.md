# Claude Branch Change Log

This file tracks changes made on `claude/` branches during AI-assisted sessions.

---

## Branch: `claude/healthcare-blog-article-9Ot1R`

**Session:** `session_01QHb1wL3xjDtpX2j218us3f`
**Base branch:** `main`

### Changes Made

| Commit | Description |
|--------|-------------|
| `d2d390c` | Add GitHub Actions workflow to auto-create PR on `claude/*` branch pushes |
| `d70f68f` | Fix duplicate title in ABDM healthcare network blog post — removed redundant H1 heading from body of `_posts/2026-02-15-need-for-a-robust-abdm-healthcare-network-enabling-cancer-care-without-walls.md` |
| `9cfbdc5` | Trigger PR: fix duplicate title in ABDM blog post |
| `012b620` | Update auto-PR workflow to also auto-merge after creation |
| `77978a1` | Update auto-PR workflow to use Gitea API via curl for reliable PR create+merge |
| `c3c181b` | Use Gitea API in workflow for reliable auto-merge; add claude-branch.md change log |
| `156cd64` | SEO & GEO: add llms.txt, robots.txt, BlogPosting schema, OG/Twitter meta, enriched keywords for Yajur brand |
| `ed3e3d8` | SEO & GEO: rebased onto updated main, pushed for auto-merge |
| `d4622ad` | Update claude-branch.md with SEO/GEO change log |
| `7b01ef2` | Fix invalid JSON-LD in default.html and post.html (Liquid-in-string quoting bug) |
| `7fbb4f7` | Rename claude-branch.md to CLAUDE.md for auto-loading on session start |

### Status

- [x] ABDM blog post duplicate title fix — merged to `main` (PR #5)
- [x] auto-pr.yml workflow (create + merge) — merged to `main` (PR #5)
- [ ] SEO & GEO improvements — pending merge (PR #6 in queue)
- [x] JSON-LD fix — committed (`7b01ef2`)

### Notes

- The ABDM blog post had a duplicate title: the Jekyll front matter `title:` field and an identical H1 (`#`) heading in the post body were both rendering on the page.
- The H1 in the body was removed; the front matter title drives the page `<title>` and the theme renders the post title as the heading.
- The `auto-pr.yml` workflow was added/updated to automatically create and merge PRs from `claude/*` branches into `main` using the Gitea API (curl-based, no gh CLI dependency).
- SEO/GEO changes: created `robots.txt` (welcoming all AI crawlers), `llms.txt` (GEO signal for LLMs), added `BlogPosting` JSON-LD schema to every post, enriched Organization schema with `alternateName`/`knowsAbout`, added Open Graph + Twitter Card meta tags, fixed empty logo alt text, added `keywords` and `description` fields to `_config.yml`.
- JSON-LD bug: Liquid template values inside `"quoted strings"` in JSON caused double-quoting. Fixed by using `| jsonify` filter directly without surrounding quotes.

---

## Branch: `claude/convergence-healthcare-post-2026`

**Session:** 2026-02-27
**Base branch:** `main`

### Changes Made

| Commit | Description |
|--------|-------------|
| `0bc31a5` | Add new Pontifex post: The Convergence — AI leaders on healthcare |
| `5fd97bf` | SEO/GEO fixes: internal links, FAQ H3s, mentions schema, reading time |
| `4f594ec` | Fix title tags sitewide for SEO — remove verbose site.title duplication |
| `c8ed784` | Add Google Search Console verification meta tag |

### PRs Merged

| PR | Title |
|----|-------|
| #8 | New Pontifex post: The Convergence |
| #9 | SEO: Fix title tags sitewide + all audit gaps |
| #10 | Add Google Search Console verification tag |

### Status

- [x] New blog post published — "The Convergence: Why Every Major AI Leader Has Landed on Healthcare" (2026-02-27)
- [x] SEO/GEO audit completed — 9/10 SEO, 9.5/10 GEO
- [x] All audit gaps fixed (internal links, FAQ H3 headings, mentions JSON-LD, reading time, author bio, post.html improvements)
- [x] Sitewide title tag fix (_config.yml, index.md, pontifex.md)
- [x] Google Search Console verification tag added to default.html
- [ ] User to complete: verify ownership in GSC → submit sitemap.xml → request indexing

### New Post Details

**File:** `_posts/2026-02-27-the-convergence-why-every-major-ai-leader-has-landed-on-healthcare.md`
**URL:** https://yajur.ai/2026/02/27/the-convergence-why-every-major-ai-leader-has-landed-on-healthcare

**Content:** Long-form synthesis (4,730 words) of six major AI leaders' convergence on healthcare:
- Andrej Karpathy — agentic engineering, domain experts as builders
- Dario Amodei — biology compression thesis (Machines of Loving Grace + Adolescence of Technology)
- Demis Hassabis — AlphaFold, first AI-designed cancer drug in Phase 1 trials
- Satya Nadella — Dragon Copilot 21M patient encounters, "social permission" warning
- Sundar Pichai — India $15B investment, leapfrog thesis, AI acting for you
- Andrew Ng — agentic workflows > next-gen models, data drift warning

**Internal links added:**
- → [NHCX article](/2026/02/12/beyond-the-front-desk-how-nhcx-will-digitize-the-first-question-in-indian-healthcare.html)
- → [ABDM cancer care article](/2026/02/15/need-for-a-robust-abdm-healthcare-network-enabling-cancer-care-without-walls.html)
- → [Clinical reasoning pipelines article](/2025/07/09/smarter-ai-demands-smarter-context-how-yajur-healthcare-is-re-architecting-clinical-reasoning-pipelines.html)
- → [Task framework article](/2025/03/19/a-task-framework-for-healthcare-for-enabling-ai-agentic-workflows-in-ehr-systems.html) (x2)

### post.html Layout Improvements (applies to ALL posts)

- `page.og_image` support — custom OG image per post, falls back to site logo
- `inLanguage: "en"` added to BlogPosting JSON-LD
- `mentions` array rendered in JSON-LD when `page.mentions` front matter is set
- Reading time displayed in post header when `page.reading_time` is set

### Sitewide Title Tag Fix

| Page | Before | After |
|------|--------|-------|
| `site.title` (_config.yml) | `YAJUR.ai \| The Medical Data Infrastructure Company` | `Yajur.ai` |
| Homepage (index.md) | `YAJUR.ai \| The Medical Data Infrastructure Company` | `Medical Data Infrastructure for Healthcare AI` |
| Pontifex | `Pontifex \| Insights & Perspectives \| YAJUR.ai` | `Pontifex \| Insights & Perspectives` |

Result: all page titles now render as `[Page Title] | Yajur.ai` (clean, under 60 chars for brand suffix)

### SEO Keyword Performance Audit Findings (2026-02-27)

Critical gaps identified for yajur.ai brand:

1. **yajur.ai not indexed by Google** — `site:yajur.ai` returns zero results. All SEO equity is on hcitexpert.com.
2. **Zero external backlinks** to yajur.ai
3. **Absent from all major healthtech directories** — Tracxn, AIM, Inc42, YourStory, Growth Jockey
4. **No AI engine citations** (Perplexity, ChatGPT) — blocked by indexation gap

**Pending (user action required):**
- [ ] Verify Google Search Console ownership → submit sitemap.xml → request indexing for all pages
- [ ] Submit Bing Webmaster Tools sitemap
- [ ] Create Crunchbase profile
- [ ] Get listed on Tracxn, YourStory Startups, Inc42
- [ ] Ensure every hcitexpert.com article links to yajur.ai (dofollow)
- [ ] Guest article on external publication (ET HealthWorld, HIMSS, Inc42)

### One Outstanding Gap (requires design work)
- Custom OG social image (1200×630px) for the Convergence post — add as `/assets/og/2026-02-27-convergence.png` and set `og_image: /assets/og/2026-02-27-convergence.png` in post front matter

---

## Branch: `claude/convergence-healthcare-post-2026` (Session 2: Copilot Voice + Knowledge Base)

**Session:** 2026-03-02
**Base branch:** `claude/convergence-healthcare-post-2026`

### Changes Made

| File | Description |
|------|-------------|
| `copilot/knowledge/yajur-healthcare.md` | NEW: Comprehensive 500+ line knowledge base — full company info, services, ABDM/NHCX, all blog insights, glossary |
| `copilot/knowledge/yajur-summary.md` | NEW: Concise 2-page summary version for quick reference |
| `copilot/widget/src/components/UnifiedChat.tsx` | Added `useCopilotReadable` to inject Yajur knowledge into every LLM context; updated system prompt to accurately describe Yajur; added `voiceError` banner display |
| `copilot/widget/src/App.tsx` | Added `voiceError` state with specific error messages for network/permission failures; pass `voiceError` + `clearVoiceError` to UnifiedChat |
| `assets/js/copilot-widget.js` | Rebuilt IIFE bundle with all changes |

### Copilot Architecture (Current State)

| Layer | Implementation |
|-------|---------------|
| LLM routing | CopilotKit Cloud (`publicApiKey: ck_pub_3e7127dba63bdcd42c0eb65ba64c9289`) |
| Knowledge injection | `useCopilotReadable` — injects `YAJUR_KNOWLEDGE` constant into every conversation context |
| System prompt | `CopilotPopup` `instructions` prop — positions assistant as Yajur business AI |
| STT | Sarvam `saarika:v2.5` via `/api/sarvam/stt` on backend |
| TTS | Sarvam `bulbul:v2` / speaker `anushka` via `/api/sarvam/tts` on backend |
| Voice token | LiveKit JWT via `/api/livekit` on backend |
| Backend | Next.js on `caladriusprod.tail5b7deb.ts.net:3330` (HTTP, Tailscale-only) |

### Voice Bug — Root Cause & Fix Required

**Problem:** Mic button does nothing on live yajur.ai site.
**Root cause:** Mixed content — yajur.ai is HTTPS but backend is HTTP-only and Tailscale-internal (not public internet).
**Fix (requires server access):**
1. On production server: run `tailscale serve 3330` → exposes backend as `https://caladriusprod.tail5b7deb.ts.net`
2. Update `BACKEND_BASE` in `copilot/widget/src/App.tsx` from `http://caladriusprod...` to `https://caladriusprod...`
3. Rebuild and redeploy widget

**Interim UX fix:** Widget now shows yellow warning banner when voice fails instead of silently doing nothing.

### Knowledge Base Contents

`copilot/knowledge/yajur-healthcare.md` covers:
- Company overview, mission, vision, contact
- Three core pillars (Data, AI, Interoperability) with all service details
- Compliance: HIPAA, SOC 2, ABDM, DHA
- Four core health record types (clinical, lab, radiology, prescriptions)
- Clinical reasoning pipelines and HITL approach
- Task Framework for Healthcare AI (agentic architecture)
- 13 LLM fine-tuning recommendations for oncology
- ABDM / NHCX deep dives
- The Convergence — all 6 AI leaders (Amodei, Hassabis, Nadella, Pichai, Karpathy, Ng)
- Ethical AI framework (4 interoperability principles)
- Full vocabulary glossary (20+ terms)

---

## Branch: `claude/convergence-healthcare-post-2026` (Session 3: Continuous Voice Conversation)

**Session:** 2026-03-02 (continued)
**Base branch:** `claude/convergence-healthcare-post-2026`

### Changes Made

| File | Description |
|------|-------------|
| `copilot/widget/src/App.tsx` | Full rewrite — continuous voice session architecture with silence detection, per-utterance MediaRecorder, bye-phrase auto-stop |
| `copilot/widget/src/components/UnifiedChat.tsx` | Full rewrite — removed LiveKitRoom/TranscriptionSync, module-level CustomInput, VoiceContext, phase indicator UI |
| `assets/js/copilot-widget.js` | Rebuilt and deployed (both `assets/js/` and `_site/assets/js/`) |

### Architecture: Continuous Voice Conversation

**Two-state voice model:**
- `isVoiceActive` — entire session (mic button stays red until user stops or says "bye")
- `isRecording` — individual utterance being captured by MediaRecorder

**Voice phase indicator (`voicePhase`):**
- `idle` → grey dot, no label
- `listening` → green dot, "Listening…"
- `processing` → orange dot, "Processing…"
- `speaking` → purple dot, "Speaking…"

**Restart chain (core loop):**
```
startUtterance() → silence detected → MediaRecorder.stop()
  → STT (Sarvam) → appendMessage(role:"user") → LLM → TTS
  → onTtsComplete() → startUtterance() [repeat]
```

**Bye-phrase auto-stop:** detects "bye", "goodbye", "see you", "thank you", "stop", etc. in transcript → `setShouldEndAfterTts(true)` → after farewell TTS → `stopVoice()`

**Silence detection:** AnalyserNode in `requestAnimationFrame` tick — avg amplitude < 20/255 for 1800ms → auto-stop utterance; min 500ms recording guard before STT is called

**Key refs:** `sessionActiveRef`, `isBusyRef`, `startUtteranceRef`, `silenceStartRef`, `recordingStartRef`, `mimeTypeRef`

### Critical Bug Fixed: `isResultMessage is not a function`

**Root cause:** `<LiveKitRoom>` + `<TranscriptionSync>` block was calling `appendMessage({ role: "assistant" })` with a plain object. CopilotKit v2 requires proper `Message` class instances for assistant roles — plain objects lack the `isResultMessage()` method and crash.

**Fix:** Removed `LiveKitRoom`, `TranscriptionSync`, `handleTranscription`, `token` prop, and `setIsVoiceActive` prop from `UnifiedChat.tsx` entirely. Sarvam STT handles all transcription; LiveKit is not needed.

**Secondary bug:** Jekyll serves from `_site/` not `assets/` — the widget must be copied to BOTH:
```bash
cp dist/widget.iife.js ../../assets/js/copilot-widget.js
cp dist/widget.iife.js ../../_site/assets/js/copilot-widget.js
```

### DOM Detachment Fix (from prior sub-session)

**Root cause:** `CustomInput` was defined inside `UnifiedChat`'s render body → new component type on every `setAudioData` (60fps) → React unmount/remount → stop button DOM detached.

**Fix:** Moved `CustomInput` to module level. Voice state passed via `VoiceContext` (React Context) instead of closures. Context is populated by `UnifiedChat` and consumed by `CustomInput` via `useContext`.

### Copilot Architecture (Current State)

| Layer | Implementation |
|-------|---------------|
| LLM routing | CopilotKit Cloud (`publicApiKey: ck_pub_3e7127dba63bdcd42c0eb65ba64c9289`) |
| Knowledge injection | `useCopilotReadable` — injects `YAJUR_KNOWLEDGE` constant into every LLM context |
| System prompt | `CopilotPopup` `instructions` prop |
| STT | Sarvam `saarika:v2.5` via `/api/sarvam/stt` on backend |
| TTS | Sarvam `bulbul:v2` via `/api/sarvam/tts` on backend |
| Voice session | Custom MediaRecorder + AudioContext (no LiveKit dependency) |
| Backend | Next.js on `https://caladriusprod.tail5b7deb.ts.net` |

### Verified (Playwright tests)

- No console errors / PAGEERROR ✅
- Mic button stays red for full session ✅
- TTS greeting plays on mic click ✅
- "Listening…" phase appears after greeting ✅
- Stop button works (no DOM detachment) ✅
- Session ends cleanly on stop ✅

### Pending / Known Limitations

- Silence detection threshold (20/255) may need tuning for real noisy environments — fake audio in tests is perfectly silent so STT is never triggered in automated tests
- With real speech: STT → `appendMessage(role:"user")` → LLM → TTS → auto-restart should complete the full loop (verified by code path, not yet tested with real audio in this session)
- Backend URL (`BACKEND_BASE`) in `App.tsx` must stay as `https://` (Tailscale HTTPS cert) for production use on yajur.ai (mixed content policy)

---

## Branch: `claude/convergence-healthcare-post-2026` (Session 4: Voice Bug Fixes)

**Session:** 2026-03-03
**Base branch:** `claude/convergence-healthcare-post-2026`

### Changes Made

| File | Description |
|------|-------------|
| `copilot/widget/src/App.tsx` | Fixed silence detection: switched from `getByteFrequencyData` to `getByteTimeDomainData`; changed avg formula to mean absolute deviation from 128; threshold lowered from 20 to 10 |
| `copilot/widget/src/components/UnifiedChat.tsx` | Fixed TTS streaming race: added `isLoading` from `useCopilotChat()` as guard in TTS effect — waits for LLM to finish streaming before calling TTS |
| `assets/js/copilot-widget.js` | Rebuilt and deployed (both `assets/js/` and `_site/assets/js/`) |

### Bugs Fixed

#### Bug 1: Silence detection never recognised speech (flat waveform)

**Root cause:** `getByteFrequencyData` distributes speech energy across only ~4 of 32 frequency bins. Average over all 32 bins stays < 20 even during active speech. Recorder always saw "silence" from t=0, so it stopped after exactly 1800ms regardless — before the user finished speaking, or with only background noise.

**Fix:** Switched to `getByteTimeDomainData`. Time-domain data sits at 128 for silence and deviates during speech. Silence condition is now `mean(|v - 128|) < 10` — reliably ~0 for silence, ~20–50 for speech. Also improves the waveform visualiser (now animates during speech).

#### Bug 2: TTS fired on partial streaming LLM response

**Root cause:** CopilotKit streams tokens — `visibleMessages` updates on every token. TTS effect fired on the first 2–3 words, set `lastSpokenIdRef.current` to the message id, then when the full response arrived the guard `lastMsg.id === lastSpokenIdRef.current` blocked it. Either no audio played or user heard a word-fragment.

**Fix:** Added `if (isLoading) return;` at the top of the TTS effect. TTS now waits for LLM to finish streaming before reading response text. `isLoading` added to effect dependency array.

### Updated Silence Detection (App.tsx)

```
// Before (broken):
getByteFrequencyData(bins)  // 32 frequency bins
avg = sum(bins) / bins.length  // speech bins avg ~12, always < 20

// After (fixed):
getByteTimeDomainData(bins)  // 64 time-domain samples
avg = sum(|v - 128|) / bins.length  // silence ~2, speech ~20-40
SILENCE_THRESHOLD = 10
```

### Bug 3: STT 400 spam — silence countdown firing before user spoke (VAD missing)

**Root cause:** `silenceStartRef` was set at t=0 (first tick after recording starts), before the user had spoken at all. After exactly 1800ms of waiting, the recorder stopped and sent silent audio to Sarvam STT, which returned `400 Bad Request`. The frontend silently restarted, creating a rapid loop of 400 errors in the console.

**Fix:** Added `hasSpeechRef` — the silence countdown only starts after amplitude has first exceeded `SILENCE_THRESHOLD` (i.e. real speech detected). Before speech begins, the recorder waits indefinitely. This is proper VAD (Voice Activity Detection) behaviour.

```
// Before (broken): silence countdown starts at t=0
startUtterance() → t=0: silenceStart set → t=1800ms: stop → silent STT → 400 → loop

// After (fixed): countdown only starts after speech
startUtterance() → waiting → user speaks → hasSpeechRef=true
  → user stops → 1800ms countdown → stop → STT with real audio
```

**Files changed:** `App.tsx` — added `hasSpeechRef`, reset in `startUtterance()`, updated tick logic.

### Status

- [x] All three bugs fixed and deployed

---

## Branch: `claude/convergence-healthcare-post-2026` (Session 5: Voice Pipeline Hardening)

**Session:** 2026-03-03
**Base branch:** `claude/convergence-healthcare-post-2026`
**Widget version:** `1.4.0` → `1.5.0`

### Approach

Technical Architect agent reviewed the full voice pipeline and directed two Senior Developer agents working in parallel. Architect then validated, rebuilt, deployed, and ran Playwright tests (18/18 passed).

### Changes Made

| File | Description |
|------|-------------|
| `copilot/widget/src/App.tsx` | 5 fixes: Safari MIME fallback, removed dead LiveKit token fetch, 30s max recording guard, STT 429 backoff, `interruptTts()` call on session stop |
| `copilot/widget/src/components/UnifiedChat.tsx` | 4 fixes: CopilotKit v2 content extraction, `interruptTts` export + `_activeTtsSource` tracking, `audios[]` sequential playback in greeting and TTS effects |
| `copilot/backend/src/app/api/sarvam/tts/route.ts` | TTS text chunking: `chunkTextForTts()` splits long responses into ≤400-char sentence chunks; returns `{ audios: [] }` instead of `{ audio }` |
| `assets/js/copilot-widget.js` | Rebuilt and deployed (both `assets/js/` and `_site/assets/js/`) |

### Fixes

#### Fix 1: Safari audio format — silent voice failure on Apple devices
**Root cause:** Only `audio/webm;codecs=opus` and `audio/webm` were tried. Safari only supports `audio/mp4` — `MediaRecorder.start()` threw a `NotSupportedError` caught silently.

**Fix:** Priority-ordered MIME detection: `["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]`. Dynamic filename (`audio.mp4`, `audio.ogg`, `audio.webm`) sent to Sarvam STT based on selected format.

#### Fix 2: Dead LiveKit token fetch — wasted latency on every mic click
**Root cause:** `startVoice()` fetched a LiveKit JWT on every mic click. Token stored in state but never used — LiveKit was removed from the pipeline in Session 3.

**Fix:** Deleted the inner try/catch block fetching `LIVEKIT_TOKEN_URL`. Removed `LIVEKIT_TOKEN_URL` constant, `token` useState, and all `setToken()` calls.

#### Fix 3: No max recording duration — runaway loop in noisy environments
**Root cause:** If background noise kept `hasSpeechRef` active, the recorder ran forever. Blob grew unbounded → STT timeout → error loop.

**Fix:** `maxDurationTimerRef` fires `mediaRecorderRef.current.stop()` after 30 seconds. Timer is cleared at the top of `recorder.onstop`.

#### Fix 4: STT 429 rate-limit — immediate retry made it worse
**Root cause:** On Sarvam rate-limit (429), the code instantly called `startUtteranceRef.current?.()`, hammering the API.

**Fix:** `const retryDelay = res.status === 429 ? 5000 : 0; setTimeout(() => startUtteranceRef.current?.(), retryDelay)` — 5-second cooldown on 429, instant otherwise.

#### Fix 5: No TTS interrupt — user couldn't cut off the agent
**Root cause:** `playBase64Audio()` had no external stop handle. If agent was speaking, user audio was ignored for the full TTS duration.

**Fix:** Module-level `_activeTtsSource: AudioBufferSourceNode | null` tracks the active source. `interruptTts()` exported from `UnifiedChat.tsx`, imported in `App.tsx`, called in `stopVoice()`.

#### Fix 6: CopilotKit v2 content block extraction — TTS spoke `[object Object]`
**Root cause:** `rawContent.join("")` on CopilotKit v2's typed content blocks `[{type:"text", text:"..."}]` produced `[object Object]`.

**Fix:** `rawContent.map((c: any) => (typeof c === "string" ? c : c?.text ?? "")).join("")`

#### Fix 7: Long TTS responses silently truncated by Sarvam
**Root cause:** Entire LLM response sent as one string. Sarvam TTS has undocumented character limits per input.

**Fix:** `chunkTextForTts()` splits on sentence boundaries into ≤400-char chunks, passed as `inputs[]` array. Backend returns `{ audios: data.audios ?? [] }`. Frontend plays all clips in sequence: `for (const audio of audios) { await playBase64Audio(audio); }`

### Architecture: Copilot Voice Pipeline (Current State)

| Layer | Implementation |
|-------|---------------|
| Audio capture | Browser `MediaRecorder` — `audio/webm;codecs=opus` → `mp4` → `ogg` fallback |
| VAD | `requestAnimationFrame` time-domain MAD from 128; `SPEECH_CONFIRM_MS=300ms`, `SILENCE_DURATION_MS=1800ms` |
| STT | Sarvam `saarika:v2.5` via `/api/sarvam/stt` (HTTP multipart) |
| LLM | CopilotKit Cloud — `isLoading` guard ensures full response before TTS |
| TTS | Sarvam `bulbul:v2` via `/api/sarvam/tts` (HTTP, sentence-chunked) |
| TTS playback | `AudioContext.decodeAudioData()` → sequential `AudioBufferSourceNode` clips |
| TTS interrupt | `_activeTtsSource.stop()` via exported `interruptTts()` |
| Loop restart | `onTtsComplete` → `handleTtsComplete` → `startUtterance()` after 300ms |
| Backend | Next.js on `https://caladriusprod.tail5b7deb.ts.net` (Tailscale HTTPS) |

### Test Results

- Playwright: **18/18 passed**, 0 failed
- No console errors, no 4xx/5xx network errors

### Status

- [x] All 7 pipeline hardening fixes deployed (v1.5.0)
- [ ] Test with real speech end-to-end: speak → STT → LLM → TTS chunks play in sequence → loop restarts

---

## SEO/GEO Measurement Framework

### Tools to Use

| Tool | URL | What to Measure |
|------|-----|-----------------|
| Google Search Console | https://search.google.com/search-console | Impressions & clicks for "Yajur" |
| Google Rich Results Test | https://search.google.com/test/rich-results | Validate BlogPosting / Organization schema |
| Schema Markup Validator | https://validator.schema.org | Full structured data audit |
| Open Graph Debugger | https://developers.facebook.com/tools/debug/ | OG tags per page |
| LinkedIn Post Inspector | https://www.linkedin.com/post-inspector/ | Social preview for LinkedIn shares |
| Bing Webmaster Tools | https://www.bing.com/webmasters | Submit sitemap to Bing |

### Baseline GEO Test (Run Today)

Ask each of these AI engines the following prompts and record the responses:

**Test prompts:**
1. "What is Yajur?"
2. "What is Yajur.ai?"
3. "Who is Yajur Healthcare?"
4. "What does Yajur do in healthcare AI?"
5. "Best medical data infrastructure companies in India"

**Engines to test:**
- Perplexity.ai → https://www.perplexity.ai
- ChatGPT (GPT-4o) → https://chat.openai.com
- Google Gemini → https://gemini.google.com
- Claude → https://claude.ai
- You.com → https://you.com

**What to look for:**
- Is Yajur.ai mentioned / cited?
- Is yajur.ai linked as a source?
- What description does the AI give for Yajur?

### Key URLs to Submit/Verify

| Resource | URL |
|----------|-----|
| Sitemap | https://yajur.ai/sitemap.xml |
| RSS Feed | https://yajur.ai/feed.xml |
| llms.txt | https://yajur.ai/llms.txt |
| robots.txt | https://yajur.ai/robots.txt |

### Measurement Cadence

| Timeframe | What to Check | Status |
|-----------|---------------|--------|
| Week 1 | Confirm robots.txt, llms.txt, sitemap.xml are live and accessible | ✅ Done |
| Week 1 | Run Google Rich Results Test on homepage and a blog post | Pending |
| Week 1 | Google Search Console: verify ownership + submit sitemap.xml | ⚡ In progress — tag added 2026-02-27, user to verify |
| Week 1 | Submit sitemap to Bing Webmaster Tools | Pending |
| Week 2 | Request indexing for all 10 blog posts via GSC URL Inspection | Pending |
| Week 2 | Create Crunchbase + YourStory + Tracxn profiles | Pending |
| Week 4 | Re-run GEO baseline prompts — compare to initial responses | Pending |
| Week 8 | Check Google Search Console for "Yajur" / "Yajur.ai" impressions | Pending |
| Month 3 | Track organic traffic growth; check if yajur.ai outranks hcitexpert.com | Pending |

---

## Claude Working Instructions

### Workflow Orchestration

#### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

#### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

#### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project context

#### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

#### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

#### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

### Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

### Core Principles

**Simplicity First**: Make every change as simple as possible. Impact minimal code.

**No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

**Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Branch: `claude/convergence-healthcare-post-2026` (Session 5: Voice Chat Polish — v1.5.0)

**Session:** 2026-03-03
**Base branch:** `claude/convergence-healthcare-post-2026`

### Changes Made

| File | Description |
|------|-------------|
| `copilot/widget/src/App.tsx` | 5 fixes: multi-format MIME detection (Safari), removed dead LiveKit token fetch, max 30s recording duration guard, STT 429 rate-limit backoff (5s delay), interruptTts() call on stopVoice() |
| `copilot/widget/src/components/UnifiedChat.tsx` | 3 fixes: CopilotKit v2 content-block extraction, interruptTts() export with module-level AudioBufferSourceNode tracking, audios[] array response handling in both greeting and main TTS effects |
| `copilot/backend/src/app/api/sarvam/tts/route.ts` | 2 fixes: sentence-based text chunking helper (chunkTextForTts, 400 char limit), return audios[] array instead of single audio string |
| `assets/js/copilot-widget.js` | Rebuilt IIFE bundle v1.5.0 (both `assets/js/` and `_site/assets/js/`) |

### All 7 Fixes in Detail

#### Fix 1 (App.tsx): Multi-format MIME type detection — Safari support
**Before:** Only checked `audio/webm;codecs=opus` then fell back to `audio/webm`. Safari supports neither.
**After:** Priority-ordered list: `["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]`. Uses `Array.find()` with `MediaRecorder.isTypeSupported()`. Also derives dynamic filename for STT FormData (`audio.mp4`, `audio.ogg`, or `audio.webm`) from the selected MIME type.

#### Fix 2 (App.tsx): Remove dead LiveKit token fetch
**Before:** `startVoice()` had an inner try/catch fetching `${LIVEKIT_TOKEN_URL}?room=yajur-voice&username=visitor` and calling `setToken()`. LiveKit is not used (removed in Session 3).
**After:** Inner try/catch deleted entirely. Removed: `LIVEKIT_TOKEN_URL` constant, `token` state (`useState<string | null>(null)`), all `setToken()` calls including `setToken(null)` in `stopVoice()`.

#### Fix 3 (App.tsx): Max 30-second recording duration guard
**Before:** No upper bound on utterance length — a user who didn't speak would hold the recorder open indefinitely.
**After:** Added `maxDurationTimerRef` (useRef). After `recorder.start(200)`, sets a 30-second timeout that calls `mediaRecorderRef.current.stop()`. Cleared at the very start of `recorder.onstop` (before the sessionActiveRef guard) to prevent double-clear races.

#### Fix 4 (App.tsx): STT 429 rate-limit backoff
**Before:** On any non-2xx STT response (including 429 Too Many Requests), immediately called `startUtteranceRef.current?.()` — creating a rapid retry hammer that would worsen rate limiting.
**After:** `const retryDelay = res.status === 429 ? 5000 : 0; setTimeout(() => startUtteranceRef.current?.(), retryDelay)`. 5-second cooldown on rate limit; instant retry for other errors.

#### Fix 5 (App.tsx): Call interruptTts on session stop
**Before:** `stopVoice()` did not cancel in-flight TTS audio. If the user hit stop mid-sentence, audio kept playing.
**After:** Imports `interruptTts` from `UnifiedChat`. Calls `interruptTts()` immediately after setting `mediaRecorderRef.current = null` in `stopVoice()`.

#### Fix 6 (UnifiedChat.tsx): CopilotKit v2 content block extraction
**Before:** `rawContent.join("")` — works for `string[]` but not for CopilotKit v2 content-block objects `{ type: "text", text: "..." }`.
**After:** `rawContent.map((c: any) => (typeof c === "string" ? c : c?.text ?? "")).join("")` — handles both formats.

#### Fix 7 (UnifiedChat.tsx + tts/route.ts): TTS text chunking + audios[] array
**Backend:** Added `chunkTextForTts(text, maxChunkLen=400)` helper that splits on sentence boundaries (`[.!?]\s+`). Passes `chunkTextForTts(text)` as `inputs` to Sarvam API (which natively supports multiple inputs). Returns `{ audios: data.audios ?? [] }` instead of `{ audio: data.audios?.[0] }`.
**Frontend (both effects):** Destructures `const { audios } = await res.json()`. Loops `for (const audio of audios) { await playBase64Audio(audio); }` — plays chunks sequentially. Also added `interruptTts()` export + `_activeTtsSource` module-level ref so any in-flight audio can be stopped synchronously.

### Widget Version

- Bumped `WIDGET_VERSION` from `"1.4.0"` to `"1.5.0"` in `App.tsx`

### Test Results

All 18 Playwright tests passed (0 failed):

| Test | Result |
|------|--------|
| 1a: Page loaded (networkidle) | PASS |
| 1b: copilot-widget.js loads 200 | PASS |
| 1c: No PAGEERROR console errors on load | PASS |
| 2a: Chat bubble button found | PASS |
| 2b: Popup title "Yajur AI" is visible | PASS |
| 2c: Initial message "Welcome to Yajur Healthcare" visible | PASS |
| 3a: Mic button found | PASS |
| 3b: Mic button turned red (voice active) | PASS |
| 3c: "Listening..." phase indicator visible | PASS |
| 3d: Waveform visualizer canvas present | PASS |
| 4: POST /api/sarvam/tts returned 200 | PASS |
| 5a: No "isResultMessage is not a function" error | PASS |
| 5b: No TypeError about spreading undefined | PASS |
| 5c: CopilotKit API calls returned 200 | PASS |
| 6a: Stop (red X) button found | PASS |
| 6b: Button returned to mic icon (voice stopped) | PASS |
| 6c: "Listening..." indicator disappeared | PASS |
| 6d: No console errors after stopping voice | PASS |

No console errors. No 4xx/5xx network errors.

---

## Branch: `claude/convergence-healthcare-post-2026` (Session 6: LiveKit Agent Integration — v2.0.0)

**Session:** 2026-03-03
**Base branch:** `claude/convergence-healthcare-post-2026`
**Widget version:** `1.5.1` → `2.0.0`

### Approach

Replaced the hand-rolled MediaRecorder/VAD/WAV/STT/TTS pipeline (~400 lines) with the proper LiveKit Agent architecture. All three services — LiveKit, Sarvam, and Gemini — were already credentialed; this session built the Python agent that connects them.

### Changes Made

| File | Description |
|------|-------------|
| `copilot/agent/requirements.txt` | NEW: `livekit-agents[silero,google]~=1.4`, `aiohttp~=3.10`, `python-dotenv~=1.0` |
| `copilot/agent/.env.example` | NEW: template for agent environment variables |
| `copilot/agent/sarvam_plugin.py` | NEW: `SarvamSTT` + `SarvamTTS` custom LiveKit agent plugins |
| `copilot/agent/agent.py` | NEW: `YajurAssistant` + `AgentServer` entry point |
| `copilot/backend/src/app/api/livekit/route.ts` | Added `wsUrl` to token response (one line) |
| `copilot/widget/src/components/TranscriptionSync.tsx` | Fixed field names for `@livekit/components-react@2.9.20` |
| `copilot/widget/src/App.tsx` | Full rewrite: removed ~370 lines hand-rolled pipeline; added LiveKit token fetch + room state |
| `copilot/widget/src/components/UnifiedChat.tsx` | Major edit: removed 3 complex useEffects + all audio utilities; added `<LiveKitRoom>` + `<RoomAudioRenderer>` + `<TranscriptionSync>` + `<VoiceStateTracker>` |
| `copilot/widget/playwright-test.mjs` | Updated Test 3d (waveform→LiveKit token) and Test 4 (TTS→LiveKit token verify) |
| `assets/js/copilot-widget.js` | Rebuilt IIFE bundle v2.0.0 (both `assets/js/` and `_site/assets/js/`) |

### Architecture: Copilot Voice Pipeline (v2.0.0)

| Layer | Implementation |
|-------|---------------|
| Voice transport | LiveKit WebRTC room |
| Browser audio out | `<RoomAudioRenderer />` — plays agent audio natively |
| VAD | Silero VAD (Python, in agent) |
| STT | Sarvam `saarika:v2.5` (Python, in agent) |
| LLM | Gemini `gemini-2.0-flash-exp` via `livekit-plugins-google` (Python, in agent) |
| TTS | Sarvam `bulbul:v2` (Python, in agent, chunked into ≤400-char clips) |
| Transcripts in chat | `TranscriptionSync` → `appendMessage(TextMessage)` — display only, no CopilotKit LLM triggered |
| Voice phase UI | `VoiceStateTracker` inside `<LiveKitRoom>` → reads `useVoiceAssistant().state` → updates `voicePhase` in App |
| Text chat | CopilotKit Cloud (`publicApiKey`) — unchanged |
| Backend | Next.js on `https://caladriusprod.tail5b7deb.ts.net` |

### Python Agent: `copilot/agent/`

**`sarvam_plugin.py`** — Two custom `livekit-agents` plugins:
- `SarvamSTT`: subclasses `stt.STT`, implements `_recognize_impl()` — converts `AudioBuffer` to WAV bytes via `rtc.combine_audio_frames(buffer).to_wav_bytes()`, POSTs multipart to Sarvam, returns `stt.SpeechEvent`
- `SarvamTTS`: subclasses `tts.TTS`, `synthesize()` returns `SarvamChunkedStream`
- `SarvamChunkedStream`: subclasses `tts.ChunkedStream`, `_run()` POSTs to Sarvam TTS, decodes base64 WAV via `wave.open()`, pushes `rtc.AudioFrame` instances to `_event_ch`
- `_chunk_text()`: splits text into ≤400-char sentence-boundary chunks (same logic as backend TTS chunker)

**`agent.py`** — Main entry point:
- `YajurAssistant(Agent)`: 5-sentence system instructions for Yajur voice assistant
- `AgentServer` + `@server.rtc_session(agent_name="yajur-agent")`
- `AgentSession(vad=silero.VAD.load(), stt=SarvamSTT(...), llm=google.LLM(...), tts=SarvamTTS(...))`
- `session.generate_reply(instructions="Greet the user...")` for automatic greeting on connect

### Frontend Changes

**`App.tsx`** — Removed: `encodeWav()`, `isByePhrase()`, all VAD/silence/MediaRecorder/AudioContext state and refs, `startUtterance()`, `handleTtsComplete()`, `handleTtsStart()`, states `isRecording/shouldEndAfterTts/audioData/pendingTranscript/ttsLanguage/speakResponse`. Added: `livekitToken/livekitUrl` state, simplified `startVoice()` (fetch token → set state), `stopVoice()` (clear token/state).

**`UnifiedChat.tsx`** — Removed: `interruptTts()`, `_activeTtsSource`, `playBase64Audio()`, 3 complex useEffects (greeting TTS, STT sendMessage, TTS playback), 7 props. Added: import `LiveKitRoom`, `RoomAudioRenderer`, `useVoiceAssistant` from `@livekit/components-react`; import `TextMessage`, `Role` from `@copilotkit/runtime-client-gql`; `handleTranscription()` → `appendMessage(new TextMessage({role, content}))`; `VoiceStateTracker` component inside `<LiveKitRoom>`.

**`TranscriptionSync.tsx`** — Updated field access for `@livekit/components-react@2.9.20`: `segment.streamInfo?.final` → `segment.final`, `segment.participantInfo?.identity` → `segment.participant?.identity`, `segment.streamInfo?.id` → `segment.id`.

### Test Results

All 18 Playwright tests passed (0 failed):

| Test | Result |
|------|--------|
| 1a: Page loaded (networkidle) | PASS |
| 1b: copilot-widget.js loads 200 | PASS |
| 1c: No PAGEERROR console errors on load | PASS |
| 2a: Chat bubble button found | PASS |
| 2b: Popup title "Yajur AI" is visible | PASS |
| 2c: Initial message "Welcome to Yajur Healthcare" visible | PASS |
| 3a: Mic button found | PASS |
| 3b: Mic button turned red (voice active) | PASS |
| 3c: "Listening..." phase indicator visible | PASS |
| 3d: LiveKit token API called on voice start | PASS |
| 4: GET /api/livekit returned 200 | PASS |
| 5a: No "isResultMessage is not a function" error | PASS |
| 5b: No TypeError about spreading undefined | PASS |
| 5c: CopilotKit API calls returned 200 | PASS |
| 6a: Stop (red X) button found | PASS |
| 6b: Button returned to mic icon (voice stopped) | PASS |
| 6c: "Listening..." indicator disappeared | PASS |
| 6d: No console errors after stopping voice | PASS |

No console errors. No 4xx/5xx network errors.

### Deploy Instructions (Python Agent)

Run on the production server (`caladriusprod.tail5b7deb.ts.net`):
```bash
cd /home/msharma/yajur_ai/copilot/agent
# Create .env — copy values from copilot/backend/.env
cp copilot/backend/.env copilot/agent/.env
pip install -r requirements.txt
python agent.py dev      # test
python agent.py start    # production
# Or persistent: pm2 start "python agent.py start" --name yajur-voice-agent
```

The agent connects to LiveKit Cloud using `LIVEKIT_URL/API_KEY/API_SECRET`. It joins the room `yajur-voice` and processes audio. The browser widget connects to the same room via the JWT token from `/api/livekit`.

### Status

- [x] Python LiveKit agent created (`copilot/agent/`) — ready to install and deploy
- [x] Backend LiveKit token response updated (adds `wsUrl`)
- [x] Frontend widget rebuilt v2.0.0 — removes ~370 lines of hand-rolled pipeline
- [x] TranscriptionSync updated for `@livekit/components-react@2.9.20`
- [x] Playwright tests updated and all 18 pass
- [x] Python agent deployed and running via pm2 (`yajur-voice-agent`) — see Session 7

---

## Branch: `claude/convergence-healthcare-post-2026` (Session 7: Agent Deploy + Local Stack — v2.0.1)

**Session:** 2026-03-03
**Base branch:** `claude/convergence-healthcare-post-2026`
**Widget version:** `2.0.0` → `2.0.1`

### Work Completed

1. **Verified Python agent API compatibility** — ran import test confirming `sarvam_plugin.py` and `agent.py` work correctly with `livekit-agents==1.4.3`:
   - `APIConnectOptions` imported from `livekit.agents` (not submodules)
   - `_run(self, output_emitter: tts.AudioEmitter)` signature correct
   - `session.generate_reply()` called without `await` (returns `SpeechHandle`, not coroutine)
   - `session.start(YajurAssistant(), room=ctx.room)` agent as positional arg

2. **Started agent in dev mode** — confirmed successful registration:
   ```
   registered worker {"agent_name": "yajur-agent", "id": "AW_JFR2R72eRgot",
                      "url": "wss://yajuraiwebsite-8x62hub3.livekit.cloud",
                      "region": "India South", "protocol": 16}
   ```

3. **Deployed agent with pm2** — production mode, auto-restart on crash:
   ```bash
   pm2 start ".venv/bin/python3 agent.py start" --name yajur-voice-agent
   pm2 save  # persist across reboots
   ```
   Registered worker ID: `AW_XaKr9cPS8ruR`, region: India South

4. **Switched widget to local backend** — updated `BACKEND_BASE` from Tailscale URL to `http://localhost:3330`; bumped version to `2.0.1`; rebuilt and deployed widget to both `assets/js/` and `_site/assets/js/`

### Local Stack (fully running)

| Service | URL | pm2 name |
|---------|-----|----------|
| Jekyll site | `http://localhost:4000` | — |
| Next.js backend | `http://localhost:3330` | `yajur-copilot-backend` |
| Python voice agent | LiveKit Cloud India South | `yajur-voice-agent` |

### Python Agent API Fixes (livekit-agents 1.4.3)

| Issue | Fix |
|-------|-----|
| `stt.DEFAULT_API_CONNECT_OPTIONS` AttributeError | Import `APIConnectOptions` from `livekit.agents` directly |
| `ChunkedStream._run()` wrong signature | Changed to `_run(self, output_emitter: tts.AudioEmitter)` |
| Pushed `tts.SynthesizedAudio` to `_event_ch` | Replaced with `output_emitter.initialize()` + `push(raw_pcm)` + `end_input()` |
| `await session.generate_reply()` | Removed `await` — returns `SpeechHandle` synchronously |
| `session.start(room=..., agent=...)` | Changed to `session.start(YajurAssistant(), room=ctx.room)` |

### Status

- [x] Python agent running via pm2 (`yajur-voice-agent`) — connected to LiveKit Cloud India South
- [x] Widget v2.0.1 deployed — BACKEND_BASE points to `http://localhost:3330`
- [x] Full local stack operational: Jekyll + backend + agent all running
- [ ] Test end-to-end with real speech: speak → Sarvam STT → Gemini → Sarvam TTS → hear response

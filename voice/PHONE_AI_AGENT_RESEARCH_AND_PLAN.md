# Uzbek-Speaking AI Phone Agent — Deep Research & Build Plan

> Goal: an AI that **answers and conducts entire phone calls by itself**, speaking
> **fluent, accent-free Uzbek**, with **low latency / no awkward pauses**, sounding
> as natural as possible.
>
> This document is the research findings (cited) + a concrete, phased build plan
> that plugs into the existing SkillHub (React + Vite + Supabase) stack.
>
> Researched 2026-06; several vendor language lists change often — items marked
> *(verify)* should be re-confirmed in the provider console before you commit.

---

## 0. Bottom line up front (TL;DR)

1. **Technically feasible today, with one big caveat: Uzbek *voice quality* is the
   bottleneck, not the AI.** The "brain" (LLM), the orchestration, the telephony,
   and the latency engineering are all solved problems. What is *narrow* is
   natural-sounding **Uzbek text-to-speech (TTS)** — the premium human-like voice
   engines everyone assumes (ElevenLabs, Cartesia, PlayHT, Rime, Amazon Polly)
   **do not support Uzbek at all.**
2. **Recommended stack:** a **cascaded streaming pipeline** —
   **Telephony (Twilio/Telnyx) → Azure or Google STT → Claude (LLM brain, tool use)
   → Azure Neural TTS (Uzbek "Madina"/"Sardor") → back to caller**, orchestrated
   by **Pipecat or LiveKit Agents** (open-source, self-hostable, lets us plug in
   the Uzbek-capable engines). Tools call into **Supabase** (leads/CRM) and
   **Google Calendar** (booking).
3. **The "clients shouldn't notice it's AI" goal collides with the law.** Uzbekistan
   passed its first AI law (**ZRU-1115, signed 21 Jan 2026**) requiring **labeling of
   AI-generated content**, and the EU AI Act Art. 50 (from Aug 2026) requires telling
   people they're talking to an AI. **Plan to disclose.** You can still make it warm,
   fast, and pleasant — just not secretly human. (See §6.)
4. **Realistic quality bar today:** with off-the-shelf Azure Uzbek voices you get
   "good standard neural" quality — pleasant and clearly intelligible, but **not yet
   indistinguishable from a native human** on every utterance. Getting to
   "truly accent-free, fully natural" likely needs a **custom/fine-tuned Uzbek voice**
   (Azure Custom Neural Voice, or a fine-tuned open model). Budget for that as Phase 5.

---

## 1. The crux — Uzbek STT & TTS quality

Uzbek is a **lower-resource language**, so support is uneven. This is the single
most important finding set.

### 1a. Speech-to-Text (understanding the caller) — *workable*

| Provider | Uzbek STT? | Real-time/streaming? | Notes |
|---|---|---|---|
| **Azure AI Speech** | ✅ `uz-UZ` (Latin) | ✅ real-time + fast transcription + custom adaptation | **Safest streaming choice** ([docs](https://github.com/MicrosoftDocs/azure-ai-docs/blob/main/articles/ai-services/speech-service/language-support.md)) |
| **Google Cloud STT** | ✅ (added Uzbek) | ✅ | Officially added Uzbek among 7 new langs ([blog](https://cloud.google.com/blog/products/ai-machine-learning/new-features-models-and-languages-for-speech-to-text)) |
| **ElevenLabs Scribe** | ✅ | mainly async | Self-rates Uzbek only **"Good" (>10–25% WER)**; ~3.1% FLEURS / 5.5% Common Voice headline ([page](https://elevenlabs.io/speech-to-text/uzbek)) |
| **OpenAI Whisper (large-v3)** | ✅ in tokenizer | batch | ~5.5% WER Common Voice; good async fallback ([tokenizer](https://raw.githubusercontent.com/openai/whisper/main/whisper/tokenizer.py)) |
| **Yandex SpeechKit** | ✅ (since Jun 2023) | ✅ low-latency | Built for call-center automation, Latin alphabet ([news](https://globalcio.com/news/9699/)) |
| **AssemblyAI** | ✅ async only | ❌ **not** in streaming | Streaming is EN/ES/FR/DE/IT/PT only — **blocker for live calls** ([faq](https://www.assemblyai.com/docs/faq/language-support-for-real-time-transcription)) |
| **Deepgram** | ❌ not confirmed | — | Uzbek absent from Nova-3 lists ([blog](https://deepgram.com/learn/deepgram-expands-nova-3-with-11-new-languages-across-europe-and-asia)) |
| **Meta MMS** | ✅ (1,100+ langs) | research model | Open-source, not a managed streaming API ([blog](https://ai.meta.com/blog/multilingual-model-speech-recognition/)) |

**Reality check:** real-world Uzbek WER across systems sits ~**14–18%** on academic
corpora (Uzbek Speech Corpus best ~17.4% WER; [USC paper](https://arxiv.org/abs/2107.14419),
[Nature 2024](https://www.nature.com/articles/s41598-024-64848-1)). On **noisy phone
audio expect transcription errors**, so the dialog design must be error-tolerant
(confirmations, re-prompts).

**STT pick: Azure `uz-UZ`** (verified streaming Uzbek), with **Google STT** as the
A/B alternative.

### 1b. Text-to-Speech (the AI's voice) — *the bottleneck*

> ⚠️ **Critical, verified constraint:** the premium "human-grade" TTS engines voice
> agents usually rely on **DO NOT support Uzbek**: **ElevenLabs**
> ([langs](https://help.elevenlabs.io/hc/en-us/articles/13313366263441-What-languages-do-you-support)),
> **Cartesia Sonic** ([docs](https://docs.cartesia.ai/build-with-cartesia/tts-models/latest)),
> **PlayHT**, **Rime**, **Amazon Polly**. ElevenLabs can *transcribe* Uzbek but
> **cannot speak it**.

The engines that **actually speak Uzbek**:

| Provider | Uzbek voices | Quality | Streaming |
|---|---|---|---|
| **Azure Neural TTS** | `uz-UZ-MadinaNeural` (f), `uz-UZ-SardorNeural` (m) | "Standard" neural — good, not ElevenLabs-grade | ✅ |
| **Yandex SpeechKit** | "Nigora" (f), neural V3 | neural, call-center oriented | ✅ low-latency |
| **Google Cloud TTS** | *(verify)* — likely but unconfirmed | — | ✅ |
| **Meta MMS-TTS / Coqui / Piper** | open-source Uzbek | variable; needs tuning/hosting | self-host |

**No provider offers verified off-the-shelf Uzbek voice *cloning* today.** So
"truly accent-free + fully natural + a *specific* warm persona" most likely requires
a **custom neural voice** (Azure Custom Neural Voice with recorded Uzbek voice
talent, or a fine-tuned open MMS/Coqui/Piper model). Treat that as an upgrade phase.

**TTS pick (MVP): Azure Neural TTS (Madina/Sardor)**, A/B against **Yandex Nigora**.
**TTS pick (premium): custom-recorded Azure Custom Neural Voice** once the product is proven.

### 1c. End-to-end speech-to-speech (GPT Realtime / Gemini Live)? — *not for Uzbek yet*

- OpenAI **gpt-realtime** & Gemini **Live** are lower-latency and more expressive,
  but **neither publicly lists Uzbek as a conversational *output* voice** — Uzbek
  shows up only on their STT/translation *input* side
  ([Gemini Live langs](https://ai.google.dev/gemini-api/docs/live-api/capabilities),
  [OpenAI TTS](https://developers.openai.com/api/docs/guides/text-to-speech)).
- For low-resource **Turkic** pairs, **cascaded systems still beat end-to-end**
  (Kazakh–Russian study: cascade 21.3 vs E2E 17.97 BLEU,
  [MDPI](https://www.mdpi.com/2073-431X/15/4/222)).

➡️ **Use a cascaded pipeline** (STT→LLM→TTS), not an end-to-end speech model — it's
the only way to use the Uzbek-capable Azure/Yandex voices, and it's empirically
better for low-resource languages right now.

---

## 2. Latency & naturalness — how to avoid the "robot pause"

Humans answer with a **~200 ms** inter-turn gap ([PNAS](https://www.pnas.org/doi/10.1073/pnas.0903616106)).
We can't hit 200 ms, but **sub-800 ms voice-to-voice feels conversational**
([Twilio](https://www.twilio.com/en-us/blog/developers/best-practices/guide-core-latency-ai-voice-agents),
[Simplismart](https://simplismart.ai/blog/real-time-voice-ai-sub-400ms-latency)).

**Latency budget (target < 800 ms, end-of-speech → first audio byte):**

```
VAD/end-of-speech ~50–200ms │ STT ~100–200ms │ LLM first token ~200–500ms │ TTS first chunk ~80–200ms │ net ~50ms
```
([smallest.ai](https://smallest.ai/blog/designing-voice-assistants-stt-llm-tts-tools-and-latency-budget))

**The techniques that make it feel human (all standard in Pipecat/LiveKit):**

1. **Stream & overlap every stage** — flush each finished *sentence* from the LLM to
   TTS immediately; the caller hears sentence 1 while sentence 2 is still generating.
   This keeps you in the 600–900 ms band instead of 1.5 s+
   ([AssemblyAI](https://www.assemblyai.com/blog/voice-agent-architecture),
   [Pipecat TTS](https://docs.pipecat.ai/guides/learn/text-to-speech)).
2. **Semantic endpointing / turn detection** — decide the caller is *done* based on
   sentence meaning, not just silence; fixes both interrupting-too-early and
   waiting-too-long ([LiveKit](https://livekit.com/blog/turn-detection-voice-agents-vad-endpointing-model-based-detection)).
3. **Barge-in** — keep listening during playback; if the caller talks, cancel TTS and
   hand control back to STT ([OpenAI VAD](https://developers.openai.com/api/docs/guides/realtime-vad)).
4. **Latency masking with fillers/backchannels** — emit short Uzbek fillers
   ("Mayli…", "Bir soniya, tekshiraman…", "Tushunarli…") *before* the full answer,
   so perceived latency drops toward zero
   ([prompt-eng](https://www.autointerviewai.com/blog/prompt-engineering-voice-ai-interruptions-latency-2026)).
5. **Prompt for short, spoken-style Uzbek** — no long monologues; one idea per turn.

---

## 3. Orchestration — build vs buy

We need an orchestrator that lets us **bring our own Uzbek STT + TTS** (because the
default premium voices don't speak Uzbek). That requirement eliminates the
closed-stack options.

| Platform | ~Price/min | BYO STT/TTS? | Self-host / open? | Latency (claimed) |
|---|---|---|---|---|
| **Pipecat** (Daily) | $0 self-host (pay providers) | ✅ 15+ STT / 25+ TTS / 20+ LLM | ✅ open (BSD-2) | ultra-low |
| **LiveKit Agents** | $0 self-host; cloud $0/$50/$500 | ✅ full plugin + native **SIP** | ✅ open (Apache) | low |
| **Vapi** | $0.05 platform + providers (~$0.14–0.33 all-in) | ✅ BYO keys | ❌ managed | p50 ~500ms |
| **Retell AI** | ~$0.07/min + LLM/telephony | ✅ custom STT + LLM | ❌ managed | sub-800ms |
| **Twilio ConversationRelay** | ~$0.06–0.07/min + voice mins *(verify)* | BYO LLM; STT/TTS from partner list | ❌ managed | <0.5s median |
| **ElevenLabs Agents** | bundled mins + $0.08 overage | BYO LLM only (STT/TTS = theirs) | ❌ managed | n/a |
| **Bland AI** | $0.09/min flat | ❌ closed stack | ❌ | n/a |

Sources: [Vapi pricing](https://pxlpeak.com/blog/ai-tools/vapi-pricing-breakdown),
[Vapi latency](https://vapi.ai/blog/speech-latency),
[Retell](https://www.cekura.ai/blogs/retell-ai-pricing-per-minute),
[Bland](https://www.lindy.ai/blog/bland-ai-pricing),
[LiveKit](https://livekit.com/voice-agents),
[Pipecat](https://github.com/pipecat-ai/pipecat),
[Twilio ConversationRelay](https://www.twilio.com/en-us/blog/conversationrelay-voice-ai-made-human).

➡️ **Recommendation: Pipecat or LiveKit Agents (self-hosted).** Both let us wire in
Azure/Google STT + Azure/Yandex Uzbek TTS, carry **no per-minute platform tax**, and
— importantly for Uzbek data law (§6) — can run on a server **we control / locate in
Uzbekistan**. **LiveKit** edges ahead if you want **native SIP/phone numbers** built
in; **Pipecat** is the simplest pure-Python pipeline. *Fastest way to a demo* without
self-hosting is **Vapi/Retell with BYO Azure keys**.

---

## 4. Telephony — getting +998 calls into the system

- **Twilio**: publishes **UZ outbound voice** and **UZ SIP-trunking** pricing pages,
  so termination to +998 works ([voice](https://www.twilio.com/en-us/voice/pricing/uz),
  [SIP](https://www.twilio.com/en-us/sip-trunking/pricing/uz)). **Purchasable local
  +998 *inbound* numbers are *unconfirmed* — verify live in the Twilio Console.**
  Twilio also doesn't support inbound A2P SMS in UZ.
- **Telnyx**: advertises **UZ local numbers (~$1 + ~$1/mo) with two-way voice**,
  assignable to a SIP connection — **strongest candidate for an actual local inbound
  number** *(verify in console)* ([Telnyx](https://telnyx.com/phone-numbers/uzbekistan)).
- **Local options**: **Uztelecom** (state incumbent — corporate IP telephony / virtual
  PBX) and **Play Mobile** (`playmobile.uz`, IVR voice API, residents/legal-entities
  only, UZ numbers only) for domestic reach.
- **Number portability is not available** in Uzbekistan; mobile numbers stay on their
  original carrier ([wiki](https://en.wikipedia.org/wiki/Telephone_numbers_in_Uzbekistan)).

➡️ **Plan: Telnyx (local +998 number + SIP) or Twilio (SIP)** for the prototype;
keep **Uztelecom/Play Mobile** as the localized/scale fallback. **Action item:
confirm a buyable inbound +998 number before committing.**

---

## 5. Reference architecture

```
                         📞  Caller on +998 (PSTN)
                                   │  voice
                                   ▼
                 ┌─────────────────────────────────────┐
                 │  Telephony / SIP                     │
                 │  Telnyx or Twilio (SIP trunk + DID)  │
                 │  — or LiveKit native SIP             │
                 └──────────────────┬──────────────────┘
                                    │  WebRTC / WS media
                                    ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │  ORCHESTRATOR  (Pipecat or LiveKit Agents — self-hosted)            │
   │                                                                     │
   │  Audio In → VAD/turn-detect → STT ─► LLM dialog mgr ─► TTS ─► Audio │ ─► caller
   │             (semantic         (Azure   (system prompt   (Azure       │
   │              endpointing)      uz-UZ /   + state +        Madina/     │
   │              + barge-in)       Google)   fillers)         Sardor)     │
   └──────────────────────────────────┬──────────────────────────────────┘
                                       │ tool_use / tool_result (function calling)
                                       ▼
                       ┌───────────────────────────────┐
                       │  LLM BRAIN — Claude (tool use) │  (Gemini = fallback;
                       │  short, spoken Uzbek replies   │   you already have a key)
                       └───────┬───────────────┬────────┘
                  lookup/write │               │ check availability + book
                       ▼       │               ▼
              ┌──────────────────┐     ┌────────────────────────┐
              │ Supabase / PG    │     │ Google Calendar API     │
              │ (leads, calls,   │     │ (freebusy + events.     │
              │  transcripts)    │     │  insert, OAuth2)        │
              └──────────────────┘     └────────────────────────┘
                       │
                       ▼  realtime
              ┌──────────────────────────────────────────┐
              │ SkillHub (React+Vite) — live call monitor,│
              │ transcripts, lead cards, /voice dashboard │
              └──────────────────────────────────────────┘
```

- **Why cascaded:** only way to use Uzbek-capable Azure/Yandex voices; better for
  low-resource langs (§1c).
- **LLM brain via tool use:** Claude returns a structured `tool_use` request; *your*
  code runs the DB query / calendar write and returns a `tool_result` — the model
  never executes anything itself
  ([Claude tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)).
  Pipecat handles function-calling inside the pipeline
  ([Pipecat fn-calling](https://docs.pipecat.ai/pipecat/learn/function-calling)).
- **Booking:** Google Calendar `freebusy.query` + `events.insert` over OAuth2
  ([Calendar API](https://developers.google.com/workspace/calendar/api/guides/create-events)).
  You already have Google Calendar tooling available in this workspace.
- **SkillHub fit:** you already have a `/voice-reports` feature, Supabase, a leads
  module, and a Gemini key — the call agent reuses the same DB and surfaces calls in
  the existing app shell.

---

## 6. Legal & ethics — the "don't notice it's AI" goal ⚠️

This is the part to take seriously, because your stated goal conflicts with current law.

- **Uzbekistan — AI law ZRU-1115 (signed 21 Jan 2026):** mandates **clear labeling of
  AI-generated content (incl. audio)** and **bars decisions with legal effect made
  solely by AI**; fines ~UZS 20.6M–41.2M (~$1,635–$3,270) + possible 15-day arrest for
  unlawful AI personal-data use
  ([Dentons](https://www.dentons.com/en/insights/articles/2026/january/29/uzbekistan-adopts-first-ai-focused-amendments-to-information-and-administrative-laws),
  [kun.uz](https://kun.uz/en/news/2026/01/21/uzbekistan-tightens-oversight-of-ai-with-penalties-for-data-misuse)).
- **Uzbekistan — Personal Data law ZRU-547:** requires **consent** and **registration**
  of personal-data databases ([Legal500](https://www.legal500.com/developments/thought-leadership/personal-data-compliance-in-uzbekistan/)).
- **Data localization (amended, in force 27 Mar 2026):** general data may go abroad
  under security/oversight conditions, **but biometric and *telecom-related* data must
  stay on servers inside Uzbekistan** — call recordings/metadata likely fall here
  ([Dentons](https://www.dentons.com/en/insights/articles/2026/march/31/uzbekistan-dismantles-strict-data-localization-regime)).
  → favors **self-hosting in-country** and careful handling of recordings.
- **Reference regimes:** EU AI Act **Art. 50** (from **2 Aug 2026**) requires telling
  people they're interacting with AI ([text](https://artificialintelligenceact.eu/article/50/));
  US FCC ruled AI voices are "artificial" under TCPA and proposed **in-call AI
  disclosure** ([FCC](https://www.fcc.gov/document/fcc-makes-ai-generated-voices-robocalls-illegal));
  California SB 1001 requires bot disclosure.
- **Fraud surface:** undisclosed AI voice is the central impersonation/fraud risk
  (e.g., the $25.6M Arup deepfake case) ([ABA](https://www.americanbar.org/groups/senior_lawyers/resources/voice-of-experience/2025-september/ai-cloned-voice-scam/)).

**Recommendation (honest):** **Disclose** that it's an AI assistant — a single warm
Uzbek line at the start ("Assalomu alaykum, men [Brand] kompaniyasining raqamli
yordamchisiman…"). You **can** still make it fast, warm, and indistinguishable in
*quality*; what you shouldn't do is **deny being AI** if asked or impersonate a
specific real person. Keep a **human-handoff** path (also satisfies the "no solely-AI
legal decision" rule). This is both lower legal risk and, in practice, fine for
customers — disclosed-but-excellent beats secret-but-creepy.

---

## 7. Cost (ballpark, per minute)

| Approach | ~Cost/min | When it wins |
|---|---|---|
| Managed (Vapi/Retell) + BYO Azure | ~$0.13–0.33 | fastest start, < ~50K min/mo |
| BYO best-of-breed (self-host Pipecat + Azure STT/TTS + Claude + Telnyx) | ~$0.08–0.20 | mid scale |
| Fully self-hosted (open STT/TTS in-country) | ~$0.03–0.08 | > ~100–200K min/mo, strict localization |

Component ballparks: Azure STT ~$0.016/min, Azure TTS ~$15/1M chars, Claude tokens
~$0.01–0.04/min, telephony (Twilio/Telnyx UZ) extra. Sources:
[Telnyx/Vapi](https://telnyx.com/resources/vapi-pricing),
[self-host TCO](https://blog.dograh.com/self-hosted-voice-agents-vs-bland-real-cost-analysis-100k-minute-tco/).
*(Treat as ballparks, not quotes — they swing with provider mix.)*

---

## 8. Build plan (phased)

### Phase 0 — Decisions & legal groundwork (½ week)
- Confirm **call direction** (inbound answering vs outbound vs both) and **use case**
  (reception/FAQ, booking, lead qualification…). *Assumed: inbound + booking.*
- **Telephony spike:** verify a buyable **+998 inbound number** on **Telnyx** (and/or
  Twilio SIP). ← gating.
- Draft the **Uzbek disclosure + consent script** and **human-handoff** rule; decide
  where recordings/transcripts live (UZ-hosted for telecom data).

### Phase 1 — Quality spike (the make-or-break) (1 week)
- On **real Uzbek phone-quality audio**, measure **Azure `uz-UZ` STT vs Google STT**
  WER, and **listen-test Azure Madina/Sardor vs Yandex Nigora** TTS with native
  speakers. **Go/no-go on voice naturalness here.**
- Decide MVP voice; note whether a **custom voice** (Phase 5) will be needed for the
  quality you want.

### Phase 2 — Conversational core (1–2 weeks)
- Stand up **Pipecat** (or **LiveKit Agents**): Telephony → STT → **Claude** → TTS.
- Implement **streaming sentence-chunked TTS, semantic endpointing, barge-in, Uzbek
  filler words**. Target **< 800 ms** voice-to-voice; instrument latency per stage.
- Author the **Uzbek system prompt / persona**: short spoken replies, warm, on-brand.

### Phase 3 — Actions via tool use (1 week)
- Define Claude **tools**: `lookup_customer`, `create_lead`, `log_call`,
  `check_availability`, `book_appointment`. Wire to **Supabase** + **Google Calendar**.
- Add Supabase tables: `calls`, `call_transcripts`, link to existing `leads`.

### Phase 4 — SkillHub integration + ops (1 week)
- Add a **live call monitor + transcript + lead view** in the React app (reuse the
  `/voice-reports` patterns and CSS tokens).
- Logging, error-tolerant re-prompts for STT mistakes, fallbacks, human-handoff button.

### Phase 5 — Premium voice & pilot (ongoing)
- If listen-tests demand it: **Azure Custom Neural Voice** (record Uzbek voice talent)
  or a fine-tuned open Uzbek TTS for a distinctive, fully-natural persona.
- **Disclosed pilot** with real callers; measure containment, CSAT, WER, latency; iterate.

---

## 9. Open questions to verify before committing
1. **Buyable +998 inbound number** on Telnyx/Twilio? *(console check)*
2. **Google Cloud TTS Uzbek voice** existence/quality? *(verify; docs were blocked)*
3. **Deepgram/Soniox** Uzbek streaming status (currently unconfirmed/likely no).
4. Exact **data-localization** categories that force in-country hosting (read Lex.uz
   text of ZRU-547 as amended + ZRU-1115).
5. Native-speaker **listen test** of Azure vs Yandex Uzbek voices — the real arbiter
   of "accent-free / natural."

---

### Sourcing caveat
Many vendor pages (Twilio, Google, OpenAI, Microsoft Learn, Deepgram) blocked direct
fetching (HTTP 403); those claims rest on official-doc search snippets + reputable
secondary sources and are confidence-tagged in the agent findings. Re-verify the
*(verify)* items and any per-minute price in the live console before purchase.

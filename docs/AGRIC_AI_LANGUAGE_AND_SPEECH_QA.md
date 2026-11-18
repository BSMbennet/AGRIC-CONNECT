# AGRIC AI language, speech and release validation

This document separates implemented safeguards from capabilities that still require real provider configuration and human evaluation.

## Language support

The chat supports English, Tshivenda, Xitsonga, Sepedi, isiZulu, isiXhosa, Afrikaans, Setswana, Sesotho, siSwati and isiNdebele. The optional Auto-detect choice uses a conservative phrase-marker heuristic. It is not a trained language-identification model. It only chooses a language when there is enough distinguishing text; otherwise it asks the user to choose. A manually selected language always takes precedence.

Automated language tests are smoke tests only. They do not establish native-speaker quality, correct agricultural terminology, dialect coverage or code-switching accuracy.

### Native-speaker review matrix

Every language remains **pending review** until at least two independent native speakers have reviewed the same test set and a reviewer has signed off.

| Language | Reviewer 1 | Reviewer 2 | Agricultural terminology | Code-switching | Final status |
|---|---|---|---|---|---|
| English | Pending | Pending | Pending | Pending | Not validated |
| Tshivenda | Pending | Pending | Pending | Pending | Not validated |
| Xitsonga | Pending | Pending | Pending | Pending | Not validated |
| Sepedi | Pending | Pending | Pending | Pending | Not validated |
| isiZulu | Pending | Pending | Pending | Pending | Not validated |
| isiXhosa | Pending | Pending | Pending | Pending | Not validated |
| Afrikaans | Pending | Pending | Pending | Pending | Not validated |
| Setswana | Pending | Pending | Pending | Pending | Not validated |
| Sesotho | Pending | Pending | Pending | Pending | Not validated |
| siSwati | Pending | Pending | Pending | Pending | Not validated |
| isiNdebele | Pending | Pending | Pending | Pending | Not validated |

### Minimum review protocol

For each language, collect at least 50 farmer-written prompts and 20 short spoken prompts across:
- Orders, seller allocations, sales and delivery questions
- Crop planting, soil, irrigation, pest and disease questions
- Poultry, cattle, goats and sheep questions
- Mixed-language messages and local agricultural expressions
- Safety-critical prompts involving pesticides, veterinary treatment and withholding periods

Reviewers should independently score meaning preservation, fluency, terminology, code-switching, factual correctness and safety. Keep the original prompt, expected intent, model response, reviewer notes and adjudicated result. Do not publish language-quality claims until the test set is signed off.

## Speech model evaluation

No hosted speech provider is enabled in this branch. The backend now exposes provider-independent, authenticated adapters. They require explicit provider credentials and a language allowlist before any language is accepted.

| Candidate | Capability | Language coverage relevant here | Deployment decision |
|---|---|---|---|
| DSFSI African Next Voices / Swivuriso ASR | Speech recognition | Seven languages including Tshivenda and Xitsonga; Sepedi is not in the listed seven | Research/evaluation candidate; no hosted inference endpoint is configured and resource requirements need measurement |
| Stargate Africa Hlevetela | Speech recognition | Tshivenda and Xitsonga | Model card describes research/academic use and says commercial use requires separate authorization; not enabled |
| Stargate Africa Hleba | Speech recognition | Sepedi, Sesotho and Setswana | Model card describes research/academic use and says commercial use requires separate authorization; not enabled |
| Meta MMS TTS | Speech synthesis | Xitsonga checkpoint exists; Tshivenda and Sepedi are not listed in the inspected MMS TTS language list | CC-BY-NC 4.0 license; not suitable for a commercial marketplace without a different licence |

Sources:
- Swivuriso ASR model card: https://huggingface.co/digiphyte/swivuriso-turbo
- Hlevetela model card: https://huggingface.co/StargateAfrica/Hlevetela-0.24B
- Hleba model card: https://huggingface.co/StargateAfrica/Hleba-0.24B
- Meta Xitsonga MMS TTS: https://huggingface.co/facebook/mms-tts-tso
- Meta MMS TTS model collection and licence: https://huggingface.co/facebook/mms-tts

The browser may still offer an installed speech-synthesis voice, but this is device-dependent and not a verified local-language service. If neither a configured provider nor a matching browser voice exists, the app keeps the text response and tells the user speech is unavailable.

### Provider configuration (server-only)

Speech-to-text:
- `AI_SPEECH_API_KEY`
- `AI_SPEECH_BASE_URL` (OpenAI-compatible audio transcription endpoint)
- `AI_SPEECH_MODEL`
- `AI_SPEECH_SUPPORTED_LANGUAGES` (comma-separated codes that have passed a language-specific evaluation)

Text-to-speech:
- `AI_TTS_API_KEY`
- `AI_TTS_BASE_URL` (OpenAI-compatible audio speech endpoint)
- `AI_TTS_MODEL`
- `AI_TTS_VOICE`
- `AI_TTS_SUPPORTED_LANGUAGES` (comma-separated codes that have passed a language-specific evaluation)

Do not add a language to either allowlist solely because a model card lists it. Test accents, dialects, agricultural vocabulary, noisy mobile recordings, code-switching and speech intelligibility first. Do not put these values in `NEXT_PUBLIC_*` variables.

## Agricultural knowledge retrieval

The API now combines:
1. The curated English source corpus in `lib/assistant/agricultural-knowledge.ts`.
2. Approved Supabase `agri_knowledge_sources` and `agri_knowledge_chunks` using the existing generated full-text search vector and authenticated RLS.
3. Optional pgvector retrieval when a compatible 1024-dimensional embedding provider and the staged database migration are available.

The live Supabase project currently has approved knowledge sources and six chunks. The pgvector extension is available on the platform but was not installed in the inspected project. The migration adding the optional embedding column and similarity function is committed to this feature branch but has **not** been applied to the live database.

Optional embedding variables:
- `AI_EMBEDDING_API_KEY`
- `AI_EMBEDDING_BASE_URL`
- `AI_EMBEDDING_MODEL`

The configured model must return exactly 1024 dimensions. If it does not, vector search is skipped and approved full-text retrieval remains available.

## Live weather and market data

The assistant can request a local forecast using the user's saved locality and Open-Meteo, and includes the retrieval timestamp and source. The existing Weather Planner already uses the same provider. Open-Meteo's no-key free API has non-commercial usage conditions; verify eligibility before using it in a monetized AGRIC-CONNECT deployment. No paid weather plan was activated.

The market-intelligence endpoint links to the National Agricultural Marketing Council's fresh-produce market intelligence reports/dashboard. It does **not** return numeric prices. No verified structured, live South African commodity-price API was available to connect without guessing or relying on a non-official intermediary. The assistant must not quote current prices until a source with usable terms, market, grade, unit and update timestamp is integrated.

## Persistent memory and database migration

Conversation history is stored only after the user explicitly turns memory on. Turning it off deletes the stored conversation. Clear conversation deletes saved messages while leaving the user's opt-in preference unchanged.

The additive SQL migration is:
`supabase/migrations/202611180001_agri_ai_memory_and_vector_rag.sql`

It creates owner-scoped tables with RLS, limits history to 80 messages and adds optional vector search. It is committed but not applied to the live Supabase project. The current Vercel preview shares the existing Supabase environment, so applying it there would alter the live database. Do not do that without a dedicated approved staging database or explicit approval for a production migration.

## Security and release checklist

- [ ] Apply the migration to an isolated test database.
- [ ] Test memory opt-in, opt-out and deletion as two different authenticated users.
- [ ] Test buyer A cannot read buyer B's orders.
- [ ] Test seller A cannot read seller B's allocations or bookkeeping.
- [ ] Test a user with both roles can read both of their own records.
- [ ] Test anonymous requests are rejected by assistant, memory, weather and market endpoints.
- [ ] Test prompt injection in chat history cannot override the system policy.
- [ ] Run the mobile viewport checklist at 320, 375, 390 and 430 CSS pixels.
- [ ] Test microphone denial, unsupported recording formats, upload limits and provider failure.
- [ ] Complete the native-speaker review matrix before claiming local-language accuracy.
- [ ] Verify a preview deployment built from the exact final feature-branch commit.
- [ ] Complete signed-in end-to-end tests in preview using test accounts only.

No production merge, deployment, schema application or paid provider activation is authorized by this document.

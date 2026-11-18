# Agric Assistant
The floating assistant is integrated into the Next.js root layout for authenticated users. Each request authenticates through Supabase Auth and retrieves only the current user's orders, seller allocations and listings through the user's RLS-protected session.

## Features
- Buyer and seller context from the live marketplace database, including order statuses, fulfilled seller allocations and active listings.
- Eleven official South African language choices: English, Tshivenda, Xitsonga, Sepedi, isiZulu, isiXhosa, Afrikaans, Setswana, Sesotho, siSwati and isiNdebele.
- Optional NVIDIA NIM OpenAI-compatible chat completion integration.
- Account-aware fallback replies when no AI key is configured or the provider is unavailable.
- Browser-native speech recognition and speech synthesis when the browser/device provides a matching language engine or voice.

## Configure optional AI
Set server-side environment variables in the existing Vercel project only:
- AI_ASSISTANT_ENABLED=true
- AI_ASSISTANT_API_KEY (secret; never expose as NEXT_PUBLIC)
- AI_ASSISTANT_BASE_URL (OpenAI-compatible chat completions base URL)
- AI_ASSISTANT_MODEL (exact model identifier)
- NVIDIA_NIM_API_KEY, NVIDIA_NIM_BASE_URL and NVIDIA_NIM_MODEL remain supported as backward-compatible aliases for NVIDIA NIM.

No paid service, GPU, subscription, or infrastructure is provisioned by this code. Without these settings the assistant still answers marketplace activity from the signed-in user's own records; generative agronomy answers are not enabled. When NIM is enabled, the configured provider receives a minimized account context (crop/listing names, order status, quantities, order values, role and locality) with the user's message. Phone numbers, buyer contact details and private fulfilment instructions are excluded. Review the selected provider's data terms before enabling it.

## Local speech caveat
Text language selection covers all eleven languages. Auto-detect is a conservative phrase-marker heuristic and asks the user to choose when uncertain; it is not a trained language-identification model. Voice input now records audio and sends it to an authenticated, configurable transcription adapter. Voice output tries an authenticated, configurable TTS adapter and then a matching installed browser voice. Neither hosted provider is configured by default. Each language must be explicitly added to the server-side allowlist only after quality and licensing checks. Native-speaker validation remains outstanding. See `docs/AGRIC_AI_LANGUAGE_AND_SPEECH_QA.md`.

## Security and launch checklist
- User ID is always derived from verified Supabase Auth; no user ID is accepted from the client.
- Queries use the signed-in Supabase client and existing RLS, never a service-role key.
- The assistant context excludes phone numbers and private fulfilment instructions.
- It distinguishes fulfilled order value from profit or proof of payment.
- Test buyer/seller isolation and all eleven languages with native speakers; run pnpm typecheck, lint, test and build from frontend before production.

## Northern Limpopo language quality and voice limits
The chat interface offers Tshivenda, Xitsonga and Sepedi, plus the other eight language options. The API now explicitly instructs the configured language model to keep replies in the selected language, distinguish Tshivenda from Sepedi and Sesotho, accept code-switching, and avoid inventing translations for safety-critical advice. Built-in fallback messages are short, fixed translations, not a full translation engine.

Do not promise reliable AI fluency until native speakers have tested common farmer conversations. NVIDIA's Nemotron 3.5 Bolt E4B model card lists English as primary and names Spanish, French, German, Italian and Japanese (with Chinese in the post-training language description); it does not specifically validate Tshivenda, Xitsonga or Sepedi. NVIDIA's published speech ASR/TTS support matrices likewise do not list these South African languages. The browser voice buttons therefore work only when the user's browser/device actually supplies recognition or a matching installed speech voice. A visible text-chat fallback remains available.

Before public launch, build a native-speaker-reviewed test set for Tshivenda, Xitsonga and Sepedi covering marketplace terms, quantities, units, crop symptoms, irrigation, weather uncertainty and chemical safety. Record pass/fail results separately for text understanding, response quality, speech recognition and speech playback. Do not translate pesticide labels, dosage instructions or withholding periods without agricultural expert review.

## Marketplace data accuracy update
The assistant API now reads the authenticated user's buyer orders, seller allocations, own listings, own bookkeeping entries, active subscription and exact active-listing count using the signed-in Supabase session. It never accepts a user ID from the browser. The existing RLS policies remain the row-level authorization boundary.

Sales are reported from the existing `get_bookkeeping_dashboard_stats()` aggregate. Fulfilled allocations are automatically recorded as unpaid income by the existing bookkeeping trigger; the assistant distinguishes that from entries marked paid. These are bookkeeping records, not independent bank/payment verification. Buyer order values are not represented as proof of money spent. Saved fulfilment states and schedule fields are included only when present in the order.

The API has a per-user, per-running-instance limit of 20 requests per minute. This is a best-effort guard for serverless deployments, not a globally coordinated rate limiter; a shared persistent limiter would be required for strict enforcement across multiple instances.

## Agricultural knowledge retrieval
`frontend/lib/assistant/agricultural-knowledge.ts` contains a curated English starter corpus covering Limpopo crop guides, African leafy vegetables, maize, poultry, livestock and irrigation. Retrieval combines local keyword ranking with approved Supabase `agri_knowledge_chunks` using the existing full-text search column and authenticated RLS. An optional pgvector adapter is committed; it requires the staged migration and a compatible 1024-dimensional embedding provider. Retrieved source metadata is passed to the configured model and source links are shown in chat. This is still a starter knowledge base, not comprehensive coverage or a native-language corpus.

Current documents:
- Limpopo Department of Agriculture and Rural Development — Tomato Production in Limpopo Province: https://www.ldard.gov.za/index.php/tomato-production-in-limpopo-province
- Water Research Commission / Agricultural Research Council — Production Guideline for African Leafy Vegetable Cultivation in the Capricorn and Vhembe Districts (TT 914/23, May 2023): https://www.wrc.org.za/wp-content/uploads/mdocs/TT%20914%20final%20web.pdf
- Department of Agriculture, Forestry and Fisheries — Maize Production Guide (2008; historical national guide, not a current Vhembe planting forecast): https://www.dlrrd.gov.za/phocadownloadpap/Brochures_and_Production_Guidelines/Brochure%20Maize.pdf
- Grain SA — Production Conditions Report (12 December 2025; 2025/26 season only, not current-season advice): https://www.grainsa.co.za/upload/report_files/Production-Conditions-Report-12-December-2025.pdf
- South African Journal of Agricultural Extension — Vhembe smallholder irrigation study (July 2026): https://www.scielo.org.za/scielo.php?pid=S0301-603X2026000300004&script=sci_arttext

Each entry records topic, crop category, geographic relevance, language, source, source URL, publication date, last verification date and verification status. The maize documents are explicitly date-scoped so a previous season's planting window is not presented as a current forecast.

## Remaining limitations
- Persistent memory routes and consent UI are implemented, but the additive memory/vector migration is committed and not applied. The current preview uses the existing Supabase project; applying the migration there would alter the live database.
- Native-speaker review is outstanding for all eleven languages. Auto-detection is heuristic and should be treated as best-effort.
- Hosted ASR/TTS adapters are implemented but disabled until a licensed provider, model and per-language quality allowlist are configured. Browser TTS is device-dependent. No verified commercial speech stack for Tshivenda, Xitsonga and Sepedi is currently enabled.
- Vector retrieval is optional and awaits the staged pgvector migration plus a compatible 1024-dimensional embedding provider. Approved full-text Supabase retrieval and the local curated corpus are available.
- The weather connector uses Open-Meteo and includes the retrieval timestamp. Check its free API commercial-use terms before relying on it in a monetized marketplace deployment.
- The market intelligence connector links to the NAMC report/dashboard. It does not yet return structured numeric live prices; AGRIC AI must say so rather than inventing prices.
- The in-memory request limiter is best-effort only.
- Two-user RLS integration tests and mobile regression instructions are committed; the tests require dedicated staging accounts and fixtures and have not yet been run.
- A successful preview build and authenticated end-to-end test against the final commit are still required.

## New AGRIC AI controls and provider configuration
Conversation persistence is opt-in. The Memory on/off control in the chat header stores messages only after consent; disabling memory deletes the stored conversation. Clear conversation deletes the saved messages. The feature-branch migration is `frontend/supabase/migrations/202611180001_agri_ai_memory_and_vector_rag.sql`; it is not applied to the live Supabase project.

Optional speech provider variables (server-side only):
- `AI_SPEECH_API_KEY`, `AI_SPEECH_BASE_URL`, `AI_SPEECH_MODEL`, `AI_SPEECH_SUPPORTED_LANGUAGES`
- `AI_TTS_API_KEY`, `AI_TTS_BASE_URL`, `AI_TTS_MODEL`, `AI_TTS_VOICE`, `AI_TTS_SUPPORTED_LANGUAGES`
- `AI_EMBEDDING_API_KEY`, `AI_EMBEDDING_BASE_URL`, `AI_EMBEDDING_MODEL`

Speech allowlists must contain only languages independently tested with the selected provider. The embedding model must return 1024-dimensional vectors. No speech or embedding provider credentials have been configured.

Market price endpoint: `GET /api/assistant/market-prices`. It reports the current integration limitation and links to the official NAMC fresh-produce market intelligence page; it does not return numeric price quotes.

See `docs/AGRIC_AI_LANGUAGE_AND_SPEECH_QA.md` and `docs/AGRIC_AI_TESTING.md` for the model/licence evaluation, native-speaker review matrix, RLS integration setup and mobile regression plan.

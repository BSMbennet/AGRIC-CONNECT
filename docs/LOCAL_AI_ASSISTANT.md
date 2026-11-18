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
- NVIDIA_NIM_API_KEY (secret; never expose as NEXT_PUBLIC)
- NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
- NVIDIA_NIM_MODEL=<the exact model identifier enabled for your account>

No paid service, GPU, subscription, or infrastructure is provisioned by this code. Without these settings the assistant still answers marketplace activity from the signed-in user's own records; generative agronomy answers are not enabled. When NIM is enabled, the configured provider receives a minimized account context (crop/listing names, order status, quantities, order values, role and locality) with the user's message. Phone numbers, buyer contact details and private fulfilment instructions are excluded. Review the selected provider's data terms before enabling it.

## Local speech caveat
Text language selection and response-language instructions cover all eleven languages, but model fluency must be validated by native speakers. Voice input/output uses browser Web Speech APIs and varies by device. A matching installed voice is required for playback. NVIDIA's published Speech NIM ASR/TTS locale lists do not currently include the eleven South African official languages; do not advertise native NVIDIA voice support for them. Consistent local-language speech requires a separately validated provider/model.

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

## Agricultural knowledge retrieval — starter corpus
`frontend/lib/assistant/agricultural-knowledge.ts` contains a small, source-reviewed English starter corpus and keyword-based retrieval. Retrieved source metadata is passed to the configured model and source links are shown in chat. It is a first retrieval-augmented generation step, not yet a vector/embedding search engine or a comprehensive knowledge base.

Current documents:
- Limpopo Department of Agriculture and Rural Development — Tomato Production in Limpopo Province: https://www.ldard.gov.za/index.php/tomato-production-in-limpopo-province
- Water Research Commission / Agricultural Research Council — Production Guideline for African Leafy Vegetable Cultivation in the Capricorn and Vhembe Districts (TT 914/23, May 2023): https://www.wrc.org.za/wp-content/uploads/mdocs/TT%20914%20final%20web.pdf
- Department of Agriculture, Forestry and Fisheries — Maize Production Guide (2008; historical national guide, not a current Vhembe planting forecast): https://www.dlrrd.gov.za/phocadownloadpap/Brochures_and_Production_Guidelines/Brochure%20Maize.pdf
- Grain SA — Production Conditions Report (12 December 2025; 2025/26 season only, not current-season advice): https://www.grainsa.co.za/upload/report_files/Production-Conditions-Report-12-December-2025.pdf
- South African Journal of Agricultural Extension — Vhembe smallholder irrigation study (July 2026): https://www.scielo.org.za/scielo.php?pid=S0301-603X2026000300004&script=sci_arttext

Each entry records topic, crop category, geographic relevance, language, source, source URL, publication date, last verification date and verification status. The maize documents are explicitly date-scoped so a previous season's planting window is not presented as a current forecast.

## Remaining limitations
- Knowledge retrieval is lexical and the starter corpus is small; embeddings/vector retrieval, document ingestion, multilingual source documents and broader crop/livestock coverage remain future work.
- Local-language output quality has not been validated by native speakers. The current provider prompt does not establish reliable fluency in all eleven languages.
- Speech recognition and speech synthesis remain browser/device-dependent. No hosted speech provider with verified Tshivenda, Xitsonga and Sepedi support is configured.
- Conversation history is currently held in the open widget session only; consent-based cross-session conversation memory and user deletion controls are not implemented.
- The in-memory request limiter is best-effort only.
- Weather, live market prices and other live external data are not connected.
- Run the feature-branch preview build and automated tests before treating these changes as release-ready.

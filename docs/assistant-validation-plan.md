# AgricNorthX assistant validation plan

This checklist is the release gate for the assistant. A language label or successful API response is not evidence of language quality, and a SQL unit test is not a substitute for two-account isolation testing.

## Implemented foundation

- Authenticated assistant API with server-side session verification.
- Marketplace snapshot is computed in Postgres from the current authenticated user's profile, listings, seller allocations, buyer orders, subscriptions and bookkeeping records.
- Buyer and seller data are queried independently for the same profile UUID, so switching the profile's active role does not erase the other side's historical records from the assistant snapshot.
- Agricultural source registry and approved text chunks with full-text retrieval and locality/crop tags.
- Source links are returned separately with the assistant answer.
- Database-backed limit of 12 assistant requests per user per minute.
- NVIDIA NIM is the configured model provider. The server reads its API key only from environment variables.
- The UI deliberately exposes typed input only. No speech recognition or spoken output is claimed.
- Tshivenda, Xitsonga and Sepedi output is labelled experimental pending native-speaker review.

## Marketplace and data-isolation release tests

- [ ] Unauthenticated POST to /api/assistant returns 401 and no account data.
- [x] SQL snapshot test run as an authenticated buyer profile returned buyer orders and no seller allocations for that profile.
- [x] SQL snapshot test run as an authenticated farmer profile returned seller allocations and listings for that profile.
- [x] Snapshot query was revised after an RLS recursion was detected between orders and order_allocations. The final snapshot uses a private SECURITY DEFINER function with an explicit auth.uid() owner predicate on every user-data subquery.
- [x] Agricultural corpus tables cannot be selected directly by authenticated users; retrieval is exposed through an authenticated RPC.
- [x] Rate-limit test confirmed 12 calls allowed and the 13th denied within one minute.
- [ ] Run the same snapshot against two independent test accounts with deliberately different orders, listings, subscription plans and bookkeeping totals; assert no cross-account values.
- [ ] Verify a buyer cannot retrieve another buyer's order or private contact/delivery details.
- [ ] Verify a farmer cannot retrieve another farmer's allocations, subscriptions or bookkeeping entries.
- [ ] Verify users with both buyer and farmer activity see both aggregates regardless of current UI role.
- [ ] Reconcile every returned aggregate against independently queried source rows for free, Pro and Premium plans.
- [ ] Test pending, accepted, rejected, fulfilled, cancelled and disputed order states and all delivery/collection states.
- [ ] Test subscription expiry, past_due, trialing and missing current_period_end cases against the product's actual listing-limit rules.

## Agricultural RAG/source quality

- [x] Initial source registry includes LDARD tomato guidance, LDARD crop-guide index, WRC Vhembe leafy-vegetable guideline record and ARC information hub.
- [x] The seeded Vhembe leafy-vegetable chunk clearly states that only catalogue metadata was verified and does not invent detailed production recommendations.
- [ ] Ingest and review the full downloadable WRC Vhembe leafy-vegetable guideline before using it for specific cultivation advice.
- [ ] Add full crop-specific documents for maize, beans, leafy vegetables, citrus, mango, avocado, macadamia, soil/water management and integrated pest management.
- [ ] Add publication date, revision date, publisher, geography, crop, language and reviewer to every source.
- [ ] Add a scheduled stale-source review and a process to archive superseded guidance.
- [ ] Evaluate at least 50 farmer questions with expected source passages; require correct citations and abstention when no source matches.
- [ ] Verify pesticide, fertiliser and veterinary safety answers against current registered labels and local extension guidance.

## Native-language review

Recruit at least two independent native speakers per language (Tshivenda, Xitsonga and Sepedi), including agricultural vocabulary familiar to Vhembe farmers. Review the same prompts in English and the target language.

- [ ] Intent recognition: marketplace questions, crop questions, follow-up questions and clarification requests.
- [ ] Naturalness: everyday speech, respectful tone, local idioms and code-switching.
- [ ] Agricultural vocabulary: crop names, pests, diseases, irrigation, soil, fertiliser, quantities, dates and currency.
- [ ] Numerical fidelity: prices, units, dates, order counts and subscription limits must not change during translation.
- [ ] Safety: no invented pesticide dosage, withdrawal period or medical/veterinary instruction.
- [ ] Comprehension scoring: native speakers independently rate meaning preservation and identify unsafe ambiguity.
- [ ] Do not mark a language as verified until the agreed test set passes and reviewers approve the final glossary.

## Voice and device validation

- [x] Honest typed-input fallback is displayed; no browser speech API is presented as reliable support.
- [ ] Select a speech-to-text and text-to-speech provider only after confirming actual support for the exact South African language variants, code-switching, accents and mobile browsers.
- [ ] Test noisy farm environments, low-end Android devices, intermittent connectivity, latency, playback interruption and user consent.
- [ ] Keep typed input available even after voice is added.

## Application/security/regression tests

- [ ] Run pnpm typecheck, pnpm test and pnpm build from frontend/.
- [ ] Verify rate-limit responses, request-size limits, malformed JSON and upstream provider timeouts.
- [ ] Confirm NVIDIA NIM credentials are never returned to the browser or logged.
- [ ] Test assistant on 360px, 390px and tablet widths, keyboard-only navigation and screen readers.
- [ ] Regression test registration, login/logout, role switching, listings, buyer requests, order acceptance, stock reservation, fulfillment, delivery scheduling, subscriptions and bookkeeping.
- [ ] Run Supabase security and performance advisors and review all findings before production release.

## Current limitations

The retrieval layer currently uses locality-aware Postgres full-text search, not vector embeddings. The initial source corpus is a small reviewed seed, not a comprehensive agricultural library. Tshivenda, Xitsonga and Sepedi responses are experimental. Voice is not enabled. Full browser/mobile regression and production build have not yet been run.

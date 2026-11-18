# AgricNorthX AI assistant (Phase 5)

Floating button on every page for signed-in users (`components/assistant-mount.tsx` in the root layout). Server route: `POST /api/assistant`.

## Setup (server env vars only)
`AI_ASSISTANT_ENABLED=true`, `NVIDIA_NIM_API_KEY`, `NVIDIA_NIM_MODEL` (required; no default is assumed, pick a chat model available to your NVIDIA account), `NVIDIA_NIM_BASE_URL` (optional, defaults to `https://integrate.api.nvidia.com/v1`). Apply migration `20261118100500_020_ai_assistant.sql`.
Without the key/flag the widget runs in **basic mode**: keyword navigation to real pages, labelled as such.

## Privacy
Sent to NVIDIA: role, district/locality, today's date, produce names of the user's active listings (farmers), open-order count (buyers), this month's recorded money totals (only when the question is about money), conversation text (last 10 messages). Never sent: name, phone, email, buyer/supplier names, addresses, receipts, other users' data. Context is loaded with the user's own session (RLS).

## Safety
Prompt forbids invented prices/weather/stats, confirmed disease diagnoses and specific pesticide advice; asks for fact/estimate/suggestion labels. Links in replies are filtered to real, role-permitted pages. Rate limits: Free 5/min and 20/day, Pro 10/min and 150/day (`lib/ai/limits.ts`; counted from `ai_usage`). Same-origin check, input validation, no-store responses.

## Not done / unverified
- Never run against NVIDIA: no key was available. Model output quality, token counts and the base URL are untested.
- Local-language answers (Tshivenda, Xitsonga, Sepedi) are NOT validated; the UI says so.
- Voice (Phase 6), streaming, conversation history UI, recommendations engine, community/knowledge awareness are not built.
- Rate limiting is per user via DB counts (not per IP; unauthenticated requests are rejected).

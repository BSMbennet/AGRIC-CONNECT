# Architecture — Current State and Target Boundaries

## Current source structure
- `frontend/`: React 18 + Vite SPA, React Router, Axios, Tailwind configuration.
- `backend/`: FastAPI service with routers for chat, crop diagnosis, weather, market, and voice.
- Hosting configuration files exist for Vercel and Render.
- AI provider configuration references NVIDIA NIM in the application.

## Target module boundaries
1. Identity and profiles — validated identity provider tokens; never trust client-provided user IDs.
2. Authorization/tenancy — resource ownership and organisation membership checked server-side.
3. AI gateway — provider adapter, timeouts, retry budget, safety controls, quota checks, usage metering.
4. Crop diagnosis — validated uploads, image processing, uncertainty reporting, short retention.
5. Weather and market services — attributed provider data, timestamped responses, bounded caching.
6. Chat persistence — user-scoped sessions/messages and explicit retention controls.
7. Subscription/billing — server-authoritative entitlements and signed, idempotent webhooks.
8. Audit/privacy — minimal redacted events, export/deletion workflows and retention policy.
9. Operations — health/readiness, structured logs, monitoring, backups, CI and rollback.

## Design constraints
- Preserve the existing React/Vite and FastAPI stack unless evidence justifies a change.
- Keep database changes versioned and test in a disposable environment first.
- Do not run destructive production migrations or change production secrets/DNS without explicit authorization.
- Target modules are architectural intent, not a claim that all modules already exist.

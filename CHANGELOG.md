# Changelog

## Unreleased

### Security
- Restricted FastAPI CORS to explicitly configured origins rather than a wildcard with credentials.
- Normalized CORS origins from the `ALLOWED_ORIGINS` environment variable.
- Removed tracked local/production environment files from the production-readiness branch and added root ignore rules for environment files and generated artifacts.
- Added a focused CORS configuration test.
- Added Supabase Auth email/password sign-in and registration, client access-token attachment, and server-side token validation for chat, diagnosis, voice, market, and weather APIs.
- Enforced chat-history UID matching against the verified token and isolated browser chat history by Supabase user ID.
- Added a 12 MiB declared request-body ceiling, 10 MiB image/audio limits, and a process-local sliding-window limit of 30 authenticated requests per user per minute with regression tests.

### Documentation
- Added repository baseline, architecture notes, threat model, known limitations, security control status, and a phased production-readiness plan.

### Verification
- GitHub Actions CI passed at commit `a6ba886cc8cd2e51e208f2272c4d2842d8b85e32`: backend tests passed (14 tests) and the frontend production build succeeded.
- Added baseline API response headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Supabase authentication is implemented in source but requires matching Vercel/Render environment configuration and staging verification. Organisation/employee roles, durable per-user records, distributed rate limiting, and ingress-level body caps remain incomplete.
- No deployment or production configuration changes were made.

- Replaced Firebase-specific setup guidance with Supabase Auth setup instructions and environment variable examples.

### User data, privacy, and mobile
- Added an additive Supabase migration for farmer profiles and RLS-protected durable chat messages; the migration has not been applied to any live database.
- Added server-backed chat load/save/clear endpoints and retained a local per-user cache as a fallback.
- Added profile read/update, data export, and service-role-key-gated account deletion APIs plus a profile/settings UI.
- Added password reset, draft Terms of Use and Privacy Policy pages, and a basic installable PWA app shell that avoids caching API/auth data.
- Removed the unused Firebase database stub and constrained frontend access-token forwarding to the configured backend origin.

### Verification and remaining work
- The latest backend CI run passed after the chat persistence changes; the frontend build is still running and must finish before this change is considered verified.
- Billing, verified payment webhooks, distributed rate limiting, dependency lockfiles/scanning, real voice providers, organisation/employee tenancy, production environment setup, RLS staging tests, and legal review remain incomplete.
- The connected Supabase schema contains existing tables for other workflows; no database migration or production deployment was applied.

### Data integrity
- Removed synthetic market prices, random price predictions, and invented buyer listings from the market service.
- Removed synthetic weather fallbacks; unavailable or incomplete weather now returns an explicit unavailable state, and live responses include provider/retrieval timestamps.
- Added regression tests ensuring unavailable market/weather data is never replaced with fabricated values.

### Supabase project selection
- Updated the frontend environment example and Supabase setup guide to use `https://xngmedxoizddckwspgcz.supabase.co`, as requested.
- The connected Supabase integration cannot currently inspect this project, so its publishable key, existing schema, migration status, and RLS policies remain unverified. No live database migration was applied.

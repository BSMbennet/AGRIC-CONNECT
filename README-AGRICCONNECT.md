# AgriConnect

A farmer-to-buyer marketplace pilot for Vhembe District, Limpopo.

## Product scope

The first release focuses on farmer onboarding, produce listings, buyer requests, transactional stock reservation, cooperative aggregation and offline listing capture. All demo records must be synthetic and clearly labelled.

## Architecture

- **GitHub:** source control, pull requests and CI.
- **Vercel:** Next.js 15 App Router PWA.
- **Supabase:** PostgreSQL, Auth, Row Level Security and private listing-image storage.
- **Render:** FastAPI integration adapter and retryable background workloads.

Supabase is the system of record. Render must not maintain a second copy of marketplace business data.

## Development

Use Node.js 20+ and pnpm.

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

Copy `.env.example` to `.env.local` only after the dedicated AgriConnect Supabase project has been provisioned. Never commit credentials.

## Deployment

The Next.js application is intended to deploy from the repository root on Vercel. Render hosts only the integration service under `backend/`. Do not point either service at unrelated Supabase projects.

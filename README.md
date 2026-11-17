# AGRIC-CONNECT

AgriConnect is a farmer-to-buyer marketplace for smallholder farmers and cooperatives, piloting in Vhembe District, Limpopo, South Africa.

## Platform architecture
- **GitHub:** source control, pull requests and CI.
- **Vercel:** Next.js web application and installable PWA.
- **Supabase:** PostgreSQL, Auth, Storage, row-level security and transactional marketplace operations.
- **Render:** optional FastAPI integration service and background worker for notifications and provider webhooks.

## MVP
Farmer and buyer onboarding, agent-assisted farmer registration, produce listings, searchable marketplace, buyer requests, transactional stock reservation, cooperative aggregation, offline drafts and synchronization, admin moderation and English/Tshivenda locale scaffolding.

## Local setup
Requires Node.js 20+ and pnpm.

```sh
cp .env.example .env.local
pnpm install
pnpm dev
```

Configure a dedicated Supabase project and apply the migrations in `supabase/migrations/` in numerical order. See `DEMO.md`, `LIMITATIONS.md` and `docs/ARCHITECTURE.md`.

## Quality checks
```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Use synthetic demo records only. Never commit secrets, production data, private farmer information or service-role keys. See `.env.example` for required environment variable names.

# AGRIC-CONNECT

AgriConnect is a farmer-to-buyer marketplace for smallholder farmers and cooperatives, piloting in Vhembe District, Limpopo, South Africa.

## Repository layout

- `frontend/` — standalone Next.js application. Configure Vercel **Root Directory** as `frontend`.
- `supabase/` — database migrations, seed data and SQL tests.
- `render_service/` — optional FastAPI integration adapter deployed separately on Render.
- `render.yaml` — Render Blueprint for the integration adapter.
- `.github/workflows/` — repository CI; frontend checks run from `frontend/`.

## Product capabilities

- **Market Insights** (`/market-insights`) summarises active produce listings, available supply and farmer-provided asking-price ranges using existing Supabase access controls. It is a market snapshot, not verified sale-price or demand data.
- **Smart farming roadmap:** see [`docs/SMART_FARMING_ROADMAP.md`](docs/SMART_FARMING_ROADMAP.md) for the staged plan covering weather-aware planning, GIS, indigenous knowledge governance and sustainable monetisation.

## Platform architecture

- **GitHub:** source control, pull requests and CI.
- **Vercel:** deploys the Next.js web application from `frontend/`.
- **Supabase:** PostgreSQL, Auth, Storage, row-level security and transactional marketplace operations.
- **Render:** optional integration service and background worker for notifications and provider webhooks.

## Local setup

Requires Node.js 20+ and pnpm.

```sh
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

Configure a dedicated Supabase project and apply migrations in `supabase/migrations/` in numerical order. See `DEMO.md`, `LIMITATIONS.md` and `docs/ARCHITECTURE.md`.

## Quality checks

Run inside `frontend/`:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Use synthetic demo records only. Never commit secrets, production data, private farmer information or service-role keys.

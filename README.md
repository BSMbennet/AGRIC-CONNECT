# AgricNorthX

AgricNorthX is a farmer-to-buyer and smart farming decision-support platform for smallholder farmers and cooperatives, piloting in Vhembe District, Limpopo, South Africa.

## Repository layout

- `frontend/` — standalone Next.js application. Configure Vercel **Root Directory** as `frontend`.
- `supabase/` — database migrations, seed data and SQL tests.
- `render_service/` — optional FastAPI integration adapter deployed separately on Render.
- `render.yaml` — Render Blueprint for the integration adapter.
- `.github/workflows/` — repository CI; frontend checks run from `frontend/`.

## Product capabilities

- **Farmer-to-buyer marketplace:** assisted onboarding, produce listings, buyer requests, stock reservation and cooperative aggregation.
- **Offline capture:** agent-assisted farmer onboarding and listing drafts for low-connectivity settings.
- **Market Insights** (`/market-insights`): active listed supply and farmer-provided asking-price ranges; not verified sale prices or buyer demand.
- **Farm Weather Planner** (`/weather`): locality-selected seven-day forecast with temperature, rainfall, precipitation probability and reference ET₀. It is forecast context, not field soil-moisture measurement or an irrigation prescription.
- **Pricing guide** (`/pricing`): cost-based price planning and comparisons with active AgricNorthX asking prices.
- **Indigenous knowledge library** (`/knowledge`): consented, attributed public community contributions.

See [the smart farming integration and monetisation roadmap](docs/SMART_FARMING_ROADMAP.md).

## Platform architecture

- **GitHub:** source control, pull requests and CI.
- **Vercel:** Next.js web application from `frontend/`.
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

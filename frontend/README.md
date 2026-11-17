# AgricNorthX frontend

This folder is the standalone Next.js application and the Vercel deployment root.

## Vercel settings

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `pnpm install --no-frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: leave the Next.js default

## Local development

```sh
cp .env.example .env.local
pnpm install
pnpm dev
```

Database migrations and seed data live one directory above in `../supabase/`.

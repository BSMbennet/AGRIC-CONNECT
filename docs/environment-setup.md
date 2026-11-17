# AgriConnect environment setup

The Next.js application lives in `frontend/`. Vercel's project Root Directory must remain `frontend`.

## 1. Supabase values for the Next.js app

Create `frontend/.env.local` for local development:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://byblhdzdlmayduatxikq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Get these from Supabase Dashboard → Project Settings → API (Project URL and Publishable key). The publishable key is designed for browser use; database row-level security protects user data.

Do not put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable, in source control, or in frontend code. The Next.js application does not need a secret key for its normal user-authenticated requests.

## 2. Vercel

Open Vercel → `agric-connect` → Settings → Environment Variables. Add these two variables and select Production, Preview, and Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The project already has both variables configured for all three Vercel environments. If either value is rotated in Supabase, update it here and redeploy. Keep Root Directory set to `frontend`.

## 3. Cloudflare image-upload Worker (separate from Vercel)

The image upload Worker uses these Worker variables/secrets:

- `SUPABASE_URL` — same Supabase project URL.
- `SUPABASE_PUBLISHABLE_KEY` — same publishable key.
- `PUBLIC_BASE_URL` — public base URL for the R2 images.

In Cloudflare Dashboard → Workers & Pages → `agriconnect-image-upload` → Settings → Variables and Secrets, configure those values. Under Bindings, bind the R2 bucket `agriconnect-product-images` using the binding name `PRODUCT_IMAGES`.

Do not add Cloudflare Worker secrets to Vercel unless the Next.js application specifically needs them. The Worker endpoint is configured separately in the listing-photo uploader component.

## 4. Which environment is for what?

- Local development: `frontend/.env.local`
- Hosted application: Vercel environment variables
- Product-photo upload: Cloudflare Worker variables/secrets and R2 binding
- Authentication, profile roles, listings and organic flag: Supabase database and Auth

After changing Vercel variables, redeploy so the new values are available to the build and runtime.

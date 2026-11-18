# Browser checks against a mock Supabase

Not a substitute for testing on the real project. A tiny fake Supabase (auth + a few REST tables) lets Playwright sign in as a farmer, a buyer and a visitor.

```
node tests/e2e-mock/mock-supabase.js &
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=mock pnpm build
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=mock pnpm start -p 3114 &
S=/tmp node tests/e2e-mock/nav-and-cart.js
```

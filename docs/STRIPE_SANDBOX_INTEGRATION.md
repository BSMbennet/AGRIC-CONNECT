# AgricNorthX Stripe sandbox integration

## Guardrails

This integration is test-mode only. The Render adapter rejects any Stripe secret that is not prefixed `sk_test_` or `rk_test_`, and its webhook rejects events where `livemode` is not `false`. No live key, production-mode switch, Connect transfer, or farmer payout is implemented.

The Stripe account in this integration is US-registered. This code does not create Stripe connected accounts, transfers, or payouts to South African farmers. The farmer wallet is an accounting ledger, not a bank account, stored-value wallet, escrow account, or withdrawable cash balance. Actual farmer payouts require a separately approved South African payout provider and operating process.

## Request flow

The Next.js app authenticates buyers and farmers with Supabase Auth. Its server routes forward the signed-in user's Supabase access token to Render. Render validates that token with Supabase Auth, checks the user's role in `profiles`, and uses the server-only Stripe test key and Supabase service key.

Render is responsible for Checkout Session creation and webhook processing. The Next.js `/api/billing/webhook` endpoint is a raw-body proxy to Render for compatibility with an existing webhook URL; Stripe can also be configured to post directly to the Render `/webhooks/stripe` endpoint.

Supabase remains the source of truth for orders, payment attempts, subscriptions, and wallet ledger records.

## Buyer payments and commission

Accepted orders can be paid in two stages: a 25% deposit and then the remaining produce balance. Amounts are calculated from order allocations, in South African rand (ZAR). Agreed delivery fees are not included in the produce subtotal and remain separate.

The database stores a stable payment-attempt ID and idempotency key. Render reuses an open Stripe Checkout Session, verifies webhook signatures, rejects live-mode events, and passes successful/failed/expired events to the service-role-only Supabase RPCs. The database deduplicates Stripe event IDs and validates the paid amount and currency before recording payment.

The marketplace fee is 5% of each successful buyer payment. It is deducted from the farmer-side wallet ledger share; it is not added as a buyer surcharge. For multi-farmer orders, each payment is allocated proportionally across the order's supply allocations.

Wallet earnings remain `pending_delivery` until every farmer allocation has been marked fulfilled and the buyer confirms receipt after paying the full produce amount. They then become `delivery_confirmed_unpaid`. This marks a ledger state only; it does not initiate or imply a payout.

## Farmer subscriptions

Farmer Pro costs **R99 per month** and Farmer Premium costs **R199 per month**, billed in ZAR. Render creates recurring Checkout prices inline so unrelated prices in the Stripe account cannot be used accidentally.

Stripe subscription webhooks update `farmer_subscriptions`. The existing RLS policies keep each farmer's subscription details private.

## Required runtime configuration

Set these server-only values on the Render integration service:

- `STRIPE_SECRET_KEY`: a Stripe **test** secret (`sk_test_...` or `rk_test_...`). A live key is explicitly rejected.
- `STRIPE_WEBHOOK_SECRET`: the signing secret for the Stripe **test-mode** webhook endpoint.
- `SUPABASE_URL`: the AgricNorthX Supabase project URL.
- `SUPABASE_SECRET_KEY`: the server-only Supabase service-role/secret key.
- `SUPABASE_PUBLISHABLE_KEY`: the project's Supabase publishable/anon key used to validate user access tokens (not a service secret).
- `FRONTEND_BASE_URL`: the public HTTPS origin of the Next.js app, used for Checkout return URLs.
- `PROVIDER_WEBHOOK_SECRET`: optional existing generic provider webhook secret.

Set `INTEGRATION_API_URL` in the Next.js server environment to the HTTPS origin of the Render service. The Next.js app does not need the Stripe secret or webhook signing secret.

Never put Stripe or Supabase service keys in `NEXT_PUBLIC_*` variables, client-side bundles, or source control. Do not copy real secret values into `render.yaml` or this document.

## Test-mode webhook events

Configure the Stripe **test-mode** webhook to the Render endpoint:

`https://YOUR-RENDER-SERVICE.onrender.com/webhooks/stripe`

For compatibility, an existing Stripe test webhook pointed at the Next.js app may continue to use:

`https://YOUR-APP-HOST/api/billing/webhook`

The Next.js endpoint forwards the raw request body and original signature header to Render. Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Use Stripe test payment methods only. A webhook signing secret belongs to the specific endpoint created in Stripe test mode.

## Tax and currency notes

The Checkout integration uses ZAR for order payments and subscriptions. It does not enable Stripe Tax or automatic tax. Before any live processing, confirm the platform's VAT/sales-tax obligations, registrations, and the appropriate Stripe tax treatment; this implementation is not tax advice. Supported presentment currency does not guarantee that every payment method or business/account configuration is eligible.

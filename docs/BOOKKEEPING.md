# Bookkeeping (Phase 3)

**Routes:** `/bookkeeping` (dashboard), `/bookkeeping/new`, `/bookkeeping/export?period=` (CSV), `/bookkeeping/report` (printable).
**Roles:** `farmer` and `cooperative_manager`, each seeing only their own entries.
**Migration:** `supabase/migrations/20261118031500_019_farm_bookkeeping.sql` (not yet applied to any live database).
**Tests:** `frontend/tests/unit/bookkeeping.test.ts` (validation, money maths, periods, CSV safety) and `supabase/tests/bookkeeping_rls_test.sql` (12 access/constraint checks).

## Design decisions
- Every figure is a sum of entries the user typed in. Nothing is estimated; there are no price or yield guesses.
- Amounts use `numeric(12,2)`; sums are done in whole cents.
- "Outstanding" is `amount - amount_settled`; no separate status column that could disagree.
- Per-crop results use only entries where the user named a crop.
- Receipts live in a private bucket `farm-receipts`, first path segment = owner id, 5 MB, JPG/PNG/WebP/PDF; viewed via 5-minute signed URLs.
- `client_submission_id` is unique per owner so retries and future offline sync cannot duplicate an entry.

## Not done yet
- **Cooperative summaries over members' books.** Needs explicit per-member consent and a membership model; deliberately not built so no one's records are visible to a manager by default.
- **True .xlsx and PDF files.** CSV opens in Excel; PDF is via the browser's print dialog.
- **Offline entry drafts** (the existing listing-draft sync is separate).
- **Editing an entry** (add/record payment/delete only).
- Translations of the new screens (English only).
- `lib/supabase/database.types.ts` not regenerated: needs the live database.

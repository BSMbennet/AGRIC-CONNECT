# AGRIC AI test and preview checklist

## Automated tests

Run from `frontend/`:

```bash
pnpm install --no-frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm run build
```

The unit suite covers the reviewed knowledge corpus and conservative language-marker detection. The two-user Supabase RLS integration suite is skipped unless all of the following test-only environment variables are supplied:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `AGRI_AI_TEST_USER_A_EMAIL`
- `AGRI_AI_TEST_USER_A_PASSWORD`
- `AGRI_AI_TEST_USER_B_EMAIL`
- `AGRI_AI_TEST_USER_B_PASSWORD`
- `AGRI_AI_TEST_ORDER_ID` (a buyer order owned by test user A)
- `AGRI_AI_TEST_ALLOCATION_ID` (a seller allocation owned by test user A)
- `AGRI_AI_TEST_LEDGER_ENTRY_ID` (a bookkeeping entry owned by test user A)

Use only a dedicated staging/test Supabase project and test accounts for these variables. Never use production user credentials or production fixture IDs. The test verifies that user A can read their fixtures while user B receives no rows, and that user B cannot read or delete user A's saved assistant conversation.

## Authenticated end-to-end scenarios

Use two separate test accounts:
1. Buyer A asks for their order status. Buyer B must not see that order.
2. Seller A asks for allocations, sales, listing counts and limits. Seller B must not see seller A's information.
3. A user with buyer and seller activity asks about both in one conversation.
4. A user with no marketplace activity receives an honest empty-state answer.
5. Ask about a delivery date that is absent from the database; the assistant must say it is not recorded.
6. Ask for revenue and payment status; verify that paid and unpaid bookkeeping records are not conflated.
7. Ask for a crop guide; check the source link and date in the response.
8. Ask about local weather with a saved locality; check the location, retrieval timestamp and Open-Meteo source.
9. Ask for today's tomato market price; the assistant must link to NAMC and say numeric prices are not available from the connected feed.
10. Turn memory on, send a test message, reload, verify history, clear it, reload again and verify deletion. Turn memory off and verify the conversation row is deleted.
11. Ask a clear English, Tshivenda, Xitsonga, Sepedi and mixed-language text question in Auto-detect; test ambiguous short messages and verify the language clarification prompt.
12. Record a short voice question. Verify the transcript appears in the editable text box before sending. If the selected language is not on the configured provider allowlist, verify the app clearly falls back to typing.
13. Play a response. Verify a configured server voice is used only for allowlisted languages; otherwise a matching installed browser voice may be used, or the app keeps text only.
14. Test anonymous access to all assistant endpoints; they must return 401.

## Mobile layout regression

Test authenticated preview at 320, 375, 390 and 430 CSS pixel widths, in portrait and landscape:
- The floating button remains visible and does not overlap the primary action, cart, checkout, order status or form submit buttons.
- The chat panel fits within the viewport, scrolls internally and keeps the composer visible.
- The language selector, memory control, microphone, text area and send button remain tappable.
- The microphone permission prompt and transcription status are readable.
- Long answers, source links and large order summaries wrap without horizontal scrolling.
- Keyboard opening does not hide the text composer or send button.
- Close/minimize, clear conversation and speech controls work with touch and keyboard navigation.

## Release evidence

Record the exact commit SHA, Vercel preview deployment ID, build result, test result, browser/device matrix, test-account IDs (not passwords), failed cases and reviewer sign-off. A READY deployment alone is not evidence that the authenticated data flows or RLS isolation passed.

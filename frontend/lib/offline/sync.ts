"use client";

import { syncListingDraft } from "@/actions/listings";
import { deleteDraft, listDrafts } from "@/lib/offline/db";

export async function syncDrafts() {
  const drafts = await listDrafts();
  let synced = 0;
  let failed = 0;
  for (const draft of drafts) {
    const { saved_at: _savedAt, ...payload } = draft;
    const result = await syncListingDraft(payload);
    if (result.ok) {
      await deleteDraft(draft.client_submission_id);
      synced += 1;
    } else {
      failed += 1;
    }
  }
  return { synced, failed, remaining: drafts.length - synced };
}

import { openDB, type DBSchema } from "idb";

export type ListingDraft = {
  client_submission_id: string;
  farmer_id?: string;
  category: string;
  is_organic: boolean;
  produce_name: string;
  quantity_available: number;
  unit: "kg" | "bunch" | "crate" | "bag";
  asking_price: number;
  price_unit: "kg" | "bunch" | "crate" | "bag";
  available_from: string;
  harvest_date?: string;
  expires_at?: string;
  quality_notes?: string;
  locality: string;
  municipality?: string;
  district: string;
  saved_at: string;
};

interface AgriConnectDB extends DBSchema {
  listingDrafts: {
    key: string;
    value: ListingDraft;
    indexes: { "by-saved-at": string };
  };
}

const DB_NAME = "agriconnect-offline";
const DB_VERSION = 1;

async function database() {
  return openDB<AgriConnectDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("listingDrafts")) {
        const store = db.createObjectStore("listingDrafts", { keyPath: "client_submission_id" });
        store.createIndex("by-saved-at", "saved_at");
      }
    },
  });
}

export async function saveDraft(draft: ListingDraft) {
  const db = await database();
  await db.put("listingDrafts", draft);
}

export async function listDrafts() {
  const db = await database();
  return db.getAllFromIndex("listingDrafts", "by-saved-at");
}

export async function deleteDraft(clientSubmissionId: string) {
  const db = await database();
  await db.delete("listingDrafts", clientSubmissionId);
}

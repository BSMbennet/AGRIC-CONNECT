import { describe, expect, it } from "vitest";
import { listingSchema } from "../../lib/validation/listing";

const validListing = {
  client_submission_id: "550e8400-e29b-41d4-a716-446655440000",
  category: "Vegetables",
  is_organic: false,
  produce_name: "Tomatoes",
  quantity_available: 25,
  unit: "kg",
  asking_price: 15,
  price_unit: "kg",
  available_from: "2026-11-17",
  harvest_date: "2026-11-16",
  expires_at: "",
  quality_notes: "Freshly harvested",
  locality: "Thohoyandou",
  municipality: "Thulamela",
  district: "Vhembe",
  contact_phone: "+27 82 123 4567",
  fulfilment_details: "Collection at Thohoyandou market by arrangement.",
};

describe("listingSchema", () => {
  it("accepts a valid Vhembe produce listing", () => {
    expect(listingSchema.safeParse(validListing).success).toBe(true);
  });

  it("requires contact and fulfilment details while allowing no harvest date", () => {
    expect(listingSchema.safeParse({ ...validListing, harvest_date: "" }).success).toBe(true);
    expect(listingSchema.safeParse({ ...validListing, contact_phone: "" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...validListing, fulfilment_details: "" }).success).toBe(false);
  });

  it("rejects zero and negative quantities", () => {
    expect(listingSchema.safeParse({ ...validListing, quantity_available: 0 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...validListing, quantity_available: -2 }).success).toBe(false);
  });

  it("accepts livestock and manure listings with their appropriate units", () => {
    expect(listingSchema.safeParse({ ...validListing, category: "Livestock", produce_name: "Indigenous chickens", unit: "head", price_unit: "head", harvest_date: "" }).success).toBe(true);
    expect(listingSchema.safeParse({ ...validListing, category: "Manure", produce_name: "Composted cattle manure", unit: "ton", price_unit: "ton", harvest_date: "" }).success).toBe(true);
  });

  it("rejects negative prices and unsupported units", () => {
    expect(listingSchema.safeParse({ ...validListing, asking_price: -1 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...validListing, unit: "piece" }).success).toBe(false);
  });
});

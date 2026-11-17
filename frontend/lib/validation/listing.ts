import { z } from "zod";

export const listingSchema = z.object({
  client_submission_id: z.string().uuid(),
  farmer_id: z.string().uuid().optional(),
  category: z.string().trim().min(2).max(60),
  produce_name: z.string().trim().min(2).max(100),
  quantity_available: z.coerce.number().positive().max(1_000_000),
  unit: z.enum(["kg", "bunch", "crate", "bag"]),
  asking_price: z.coerce.number().min(0).max(1_000_000),
  price_unit: z.enum(["kg", "bunch", "crate", "bag"]),
  available_from: z.string().date(),
  harvest_date: z.string().date().optional().or(z.literal("")),
  expires_at: z.string().optional().or(z.literal("")).refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid expiry date"),
  quality_notes: z.string().trim().max(500).optional(),
  locality: z.string().trim().min(2).max(100),
  municipality: z.string().trim().max(100).optional(),
  district: z.string().trim().min(2).max(100),
});

export type ListingInput = z.infer<typeof listingSchema>;

import { z } from "zod";

export const INCOME_CATEGORIES = ["produce_sale", "other_income"] as const;
export const EXPENSE_CATEGORIES = ["seeds", "fertiliser", "pesticides", "equipment", "labour", "transport", "irrigation", "packaging", "livestock", "other"] as const;
export const PAYMENT_METHODS = ["cash", "eft", "mobile_money", "barter", "other"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  produce_sale: "Produce sale", other_income: "Other income",
  seeds: "Seeds", fertiliser: "Fertiliser", pesticides: "Pesticides", equipment: "Equipment", labour: "Labour",
  transport: "Transport", irrigation: "Irrigation", packaging: "Packaging", livestock: "Livestock", other: "Other expenses",
};
export const METHOD_LABELS: Record<string, string> = { cash: "Cash", eft: "Bank transfer (EFT)", mobile_money: "Mobile money", barter: "Barter / goods", other: "Other" };

const money = z.coerce.number({ invalid_type_error: "Enter a number" }).positive("Amount must be more than zero").max(99_999_999.99).refine((n) => Math.round(n * 100) / 100 === n, "Use at most 2 decimals");
const optionalText = (max: number) => z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().optional();

export const transactionSchema = z.object({
  kind: z.enum(["income", "expense"]),
  category: z.string(),
  amount: money,
  amount_settled: z.coerce.number().min(0).default(0),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date").refine((d) => !Number.isNaN(Date.parse(d + "T00:00:00Z")), "Choose a valid date"),
  payment_method: z.enum(PAYMENT_METHODS),
  counterparty: optionalText(120),
  crop: optionalText(80),
  notes: optionalText(1000),
  client_submission_id: z.string().uuid().optional(),
}).superRefine((v, ctx) => {
  const allowed: readonly string[] = v.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!allowed.includes(v.category)) ctx.addIssue({ code: "custom", path: ["category"], message: "Category does not match the entry type" });
  if (Math.round(v.amount_settled * 100) > Math.round(v.amount * 100)) ctx.addIssue({ code: "custom", path: ["amount_settled"], message: "Paid amount cannot exceed the total" });
});
export type TransactionInput = z.infer<typeof transactionSchema>;

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

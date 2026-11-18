import { z } from "zod";
export const LANGUAGES = { en: "English", ve: "Tshivenda", ts: "Xitsonga", nso: "Sepedi" } as const;
export type Lang = keyof typeof LANGUAGES;

export const requestSchema = z.object({
  message: z.string().trim().min(1, "Type a question").max(1500, "Please keep your question under 1500 characters"),
  conversationId: z.string().uuid().nullable().optional(),
  language: z.enum(["en", "ve", "ts", "nso"]).default("en"),
  currentPath: z.string().max(200).regex(/^\/[A-Za-z0-9/_\-[\]]*$/).optional(),
});
export type AssistantRequest = z.infer<typeof requestSchema>;

import { describe, expect, it } from "vitest";
import { decide, LIMITS } from "../../lib/ai/limits";
import { requestSchema } from "../../lib/ai/schema";
import { allowedHrefs, fallbackAnswer, sanitiseLinks, targetsFor } from "../../lib/ai/navigation";
import { systemPrompt } from "../../lib/ai/prompt";
import { MONEY_QUESTION, type AiContext } from "../../lib/ai/context";

const ctx = (o: Partial<AiContext> = {}): AiContext => ({ role: "farmer", tier: "free", district: "Vhembe", locality: "Thohoyandou", today: "2026-11-18", activeListingNames: [], openOrderCount: null, thisMonthMoney: null, ...o });

describe("rate limits", () => {
  it("allows under both limits", () => expect(decide("free", 0, 0).allowed).toBe(true));
  it("blocks per-minute and per-day", () => {
    expect(decide("free", LIMITS.free.perMinute, 0)).toMatchObject({ allowed: false, reason: "minute" });
    expect(decide("free", 0, LIMITS.free.perDay)).toMatchObject({ allowed: false, reason: "day" });
  });
  it("gives Pro a higher daily limit", () => expect(decide("pro", 0, LIMITS.free.perDay).allowed).toBe(true));
});

describe("request validation", () => {
  it("accepts a normal question", () => expect(requestSchema.safeParse({ message: "How do I add a product?" }).success).toBe(true));
  it("rejects empty, oversized, bad language, bad conversation id and odd paths", () => {
    expect(requestSchema.safeParse({ message: "  " }).success).toBe(false);
    expect(requestSchema.safeParse({ message: "x".repeat(1501) }).success).toBe(false);
    expect(requestSchema.safeParse({ message: "hi", language: "fr" }).success).toBe(false);
    expect(requestSchema.safeParse({ message: "hi", conversationId: "nope" }).success).toBe(false);
    expect(requestSchema.safeParse({ message: "hi", currentPath: "https://evil.com" }).success).toBe(false);
  });
  it("supports the four launch languages", () => { for (const language of ["en", "ve", "ts", "nso"]) expect(requestSchema.safeParse({ message: "hi", language }).success).toBe(true); });
});

describe("navigation safety", () => {
  it("only exposes pages the role may use", () => {
    expect(allowedHrefs("buyer").has("/bookkeeping")).toBe(false);
    expect(allowedHrefs("farmer").has("/bookkeeping")).toBe(true);
    expect(allowedHrefs("farmer").has("/admin")).toBe(false);
    expect(targetsFor("admin").some((t) => t.href === "/admin")).toBe(true);
  });
  it("strips links to unknown, external or forbidden pages but keeps the text", () => {
    const out = sanitiseLinks("See [Admin](/admin), [Evil](https://evil.com), [Books](/bookkeeping?x=1) and [Shop](/marketplace)", "farmer");
    expect(out).toBe("See Admin, Evil, [Books](/bookkeeping?x=1) and [Shop](/marketplace)");
  });
  it("fallback points to real pages and says AI is unavailable", () => {
    const r = fallbackAnswer("How do I add a product?", "farmer");
    expect(r.text).toContain("[Add a product](/listings/new)");
    expect(r.text).toContain("not available");
    expect(fallbackAnswer("record an expense", "buyer").text).not.toContain("/bookkeeping");
  });
});

describe("prompt and privacy", () => {
  it("includes only provided facts and no personal identifiers", () => {
    const p = systemPrompt(ctx({ activeListingNames: ["Tomatoes"], thisMonthMoney: { income: 100, expense: 40, net: 60, entries: 3 } }), "ts");
    expect(p).toContain("Xitsonga"); expect(p).toContain("Tomatoes"); expect(p).toContain("profit R60.00");
    expect(p).not.toMatch(/\+27|\w+@\w+\./);
  });
  it("omits money facts unless loaded and lists only the role's pages", () => {
    const p = systemPrompt(ctx({ role: "buyer" }), "en");
    expect(p).not.toContain("RECORDED totals"); expect(p).not.toContain("/bookkeeping");
  });
  it("detects money questions", () => { expect(MONEY_QUESTION.test("How much profit did I make?")).toBe(true); expect(MONEY_QUESTION.test("How do I plant maize?")).toBe(false); });
  it("tells the model not to invent prices, confirm diseases or advise chemicals", () => {
    const p = systemPrompt(ctx(), "en");
    for (const s of ["Never invent market prices", "Never present a crop disease", "Do not recommend specific pesticides"]) expect(p).toContain(s);
  });
});

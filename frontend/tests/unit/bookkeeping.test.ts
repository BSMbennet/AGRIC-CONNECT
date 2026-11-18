import { describe, expect, it } from "vitest";
import { transactionSchema } from "../../lib/bookkeeping/schema";
import { cropPerformance, expenseBreakdown, monthlyTrend, outstanding, periodRange, summarise, toCsv, type Tx } from "../../lib/bookkeeping/reports";

const tx = (o: Partial<Tx>): Tx => ({ id: "x", kind: "income", category: "produce_sale", amount: 100, amount_settled: 100, occurred_on: "2026-11-10", crop: null, counterparty: null, payment_method: "cash", notes: null, receipt_path: null, ...o });
const base = { kind: "expense", category: "seeds", amount: "150.50", occurred_on: "2026-11-01", payment_method: "cash" };

describe("transaction validation", () => {
  it("accepts a valid expense", () => expect(transactionSchema.safeParse(base).success).toBe(true));
  it("rejects zero, negative and 3-decimal amounts", () => {
    for (const amount of ["0", "-5", "10.123"]) expect(transactionSchema.safeParse({ ...base, amount }).success).toBe(false);
  });
  it("rejects category that does not match type", () => expect(transactionSchema.safeParse({ ...base, category: "produce_sale" }).success).toBe(false));
  it("rejects paid amount above total", () => expect(transactionSchema.safeParse({ ...base, amount_settled: "200" }).success).toBe(false));
  it("rejects impossible dates", () => expect(transactionSchema.safeParse({ ...base, occurred_on: "2026-13-45" }).success).toBe(false));
});

describe("reports", () => {
  it("sums in cents without float drift", () => {
    const s = summarise([tx({ amount: 0.1, amount_settled: 0.1 }), tx({ amount: 0.2, amount_settled: 0.2 }), tx({ kind: "expense", category: "seeds", amount: 0.05, amount_settled: 0.05 })]);
    expect(s.income).toBe(0.3); expect(s.net).toBe(0.25);
  });
  it("tracks what is owed to you and what you owe", () => {
    const s = summarise([tx({ amount: 500, amount_settled: 200 }), tx({ kind: "expense", category: "labour", amount: 300, amount_settled: 0 })]);
    expect(s.owedToYou).toBe(300); expect(s.youOwe).toBe(300);
  });
  it("computes week (Mon-Sun), month and year ranges", () => {
    expect(periodRange("week", "2026-11-18")).toMatchObject({ from: "2026-11-16", to: "2026-11-22" });
    expect(periodRange("month", "2026-02-10")).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodRange("year", "2026-11-18")).toMatchObject({ from: "2026-01-01", to: "2026-12-31" });
  });
  it("breaks down expenses and ranks crops, ignoring untagged entries", () => {
    const t = [tx({ crop: "Tomatoes", amount: 1000 }), tx({ kind: "expense", category: "seeds", crop: "tomatoes", amount: 200 }), tx({ kind: "expense", category: "labour", amount: 50 }), tx({ crop: "Spinach", amount: 100 })];
    expect(expenseBreakdown(t)[0]).toEqual({ category: "seeds", amount: 200 });
    expect(cropPerformance(t).map((c) => [c.crop, c.net])).toEqual([["tomatoes", 800], ["spinach", 100]]);
  });
  it("builds a 6-month trend across year boundaries", () => {
    const m = monthlyTrend([tx({ occurred_on: "2026-01-05", amount: 10 })], "2026-02", 6);
    expect(m.map((x) => x.month)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(m[4].income).toBe(10);
  });
  it("lists only unsettled entries", () => expect(outstanding([tx({}), tx({ id: "b", amount_settled: 10 })]).map((t) => t.id)).toEqual(["b"]));
  it("neutralises spreadsheet formula injection in CSV", () => {
    const csv = toCsv([tx({ counterparty: "=HYPERLINK(\"x\")", notes: "a,b" })], {});
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"a,b"');
  });
});

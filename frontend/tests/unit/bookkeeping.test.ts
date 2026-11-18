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

import { cumulative, cropMargins, collectionRate, monthlyNet, profitMargin, topCounterparties } from "../../lib/bookkeeping/reports";
describe("premium analytics", () => {
  const t = [
    tx({ occurred_on: "2026-10-05", amount: 1000, amount_settled: 600, counterparty: "Spar", crop: "Tomatoes" }),
    tx({ occurred_on: "2026-11-05", amount: 500, amount_settled: 500, counterparty: "spar ", crop: "Tomatoes" }),
    tx({ kind: "expense", category: "seeds", occurred_on: "2026-11-06", amount: 200, amount_settled: 200, crop: "Tomatoes", counterparty: "AgriSupply" }),
  ];
  it("computes monthly net and cumulative profit", () => {
    const n = monthlyNet(t, "2026-11", 2);
    expect(n.map((x) => x.net)).toEqual([1000, 300]);
    expect(cumulative(n).map((x) => x.value)).toEqual([1000, 1300]);
  });
  it("computes margin without dividing by zero", () => {
    expect(profitMargin(1500, 1300)).toBe(86.7);
    expect(profitMargin(0, -50)).toBeNull();
  });
  it("computes the share of income already collected", () => expect(collectionRate(t)).toBe(73.3));
  it("groups buyers case-insensitively and ranks them", () => expect(topCounterparties(t, "income")).toEqual([{ name: "Spar", amount: 1500 }]));
  it("gives crop margins", () => expect(cropMargins(t)[0]).toMatchObject({ crop: "tomatoes", net: 1300, margin: 86.7 }));
});

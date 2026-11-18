export type Tx = {
  id: string; kind: "income" | "expense"; category: string; amount: number; amount_settled: number;
  occurred_on: string; crop: string | null; counterparty: string | null; payment_method: string; notes: string | null; receipt_path: string | null;
};
export type Period = "day" | "week" | "month" | "year";

/** Work in whole cents so sums never show floating-point drift. */
export const toCents = (n: number) => Math.round(n * 100);
export const fromCents = (c: number) => c / 100;

export function todayInJohannesburg(now = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}
const d = (s: string) => new Date(s + "T00:00:00Z");
const iso = (x: Date) => x.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const x = d(s); x.setUTCDate(x.getUTCDate() + n); return iso(x); };

export function periodRange(period: Period, anchor: string): { from: string; to: string; label: string } {
  if (period === "day") return { from: anchor, to: anchor, label: anchor };
  if (period === "week") {
    const dow = (d(anchor).getUTCDay() + 6) % 7; // Monday = 0
    const from = addDays(anchor, -dow);
    return { from, to: addDays(from, 6), label: `Week of ${from}` };
  }
  if (period === "month") {
    const [y, m] = anchor.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${anchor.slice(0, 7)}-01`, to: `${anchor.slice(0, 7)}-${String(last).padStart(2, "0")}`, label: anchor.slice(0, 7) };
  }
  return { from: `${anchor.slice(0, 4)}-01-01`, to: `${anchor.slice(0, 4)}-12-31`, label: anchor.slice(0, 4) };
}

export const inRange = (t: Tx, from: string, to: string) => t.occurred_on >= from && t.occurred_on <= to;

export function summarise(txs: Tx[]) {
  let income = 0, expense = 0, owedToYou = 0, youOwe = 0;
  for (const t of txs) {
    const a = toCents(t.amount), open = a - toCents(t.amount_settled);
    if (t.kind === "income") { income += a; owedToYou += open; } else { expense += a; youOwe += open; }
  }
  return { income: fromCents(income), expense: fromCents(expense), net: fromCents(income - expense), owedToYou: fromCents(owedToYou), youOwe: fromCents(youOwe) };
}

export function expenseBreakdown(txs: Tx[]) {
  const m = new Map<string, number>();
  for (const t of txs) if (t.kind === "expense") m.set(t.category, (m.get(t.category) ?? 0) + toCents(t.amount));
  return [...m].map(([category, c]) => ({ category, amount: fromCents(c) })).sort((a, b) => b.amount - a.amount);
}

/** Per-crop results from entries the user tagged with a crop. Untagged entries are excluded, not guessed. */
export function cropPerformance(txs: Tx[]) {
  const m = new Map<string, { income: number; expense: number }>();
  for (const t of txs) {
    if (!t.crop) continue;
    const key = t.crop.trim().toLowerCase();
    const row = m.get(key) ?? { income: 0, expense: 0 };
    row[t.kind] += toCents(t.amount);
    m.set(key, row);
  }
  return [...m].map(([crop, r]) => ({ crop, income: fromCents(r.income), expense: fromCents(r.expense), net: fromCents(r.income - r.expense) })).sort((a, b) => b.net - a.net);
}

export function monthlyTrend(txs: Tx[], endMonth: string, months = 6) {
  const [ey, em] = endMonth.split("-").map(Number);
  const out: { month: string; income: number; expense: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(ey, em - 1 - i, 1));
    const month = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
    const s = summarise(txs.filter((t) => t.occurred_on.startsWith(month)));
    out.push({ month, income: s.income, expense: s.expense });
  }
  return out;
}

/** Entries with an unsettled balance, oldest first. */
export const outstanding = (txs: Tx[]) => txs.filter((t) => toCents(t.amount) > toCents(t.amount_settled)).sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));

const guard = (v: string) => (/^[=+\-@\t\r]/.test(v) ? "'" + v : v);
const cell = (v: string | number | null) => { const s = guard(v == null ? "" : String(v)); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(txs: Tx[], labels: Record<string, string>): string {
  const head = ["Date", "Type", "Category", "Amount (ZAR)", "Paid so far", "Outstanding", "Payment method", "Crop", "Buyer/Supplier", "Notes"];
  const rows = txs.map((t) => [t.occurred_on, t.kind, labels[t.category] ?? t.category, t.amount.toFixed(2), t.amount_settled.toFixed(2), fromCents(toCents(t.amount) - toCents(t.amount_settled)).toFixed(2), t.payment_method, t.crop, t.counterparty, t.notes]);
  return "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

/* ---------- Premium analytics (all derived from the user's own recorded entries) ---------- */

export function monthlyNet(txs: Tx[], endMonth: string, months = 12) {
  return monthlyTrend(txs, endMonth, months).map((m) => ({ ...m, net: fromCents(toCents(m.income) - toCents(m.expense)) }));
}

/** Running total of monthly profit. */
export function cumulative(series: { month: string; net: number }[]) {
  let run = 0;
  return series.map((s) => { run += toCents(s.net); return { month: s.month, value: fromCents(run) }; });
}

/** Profit as a percentage of money in; null when there is no income to divide by. */
export function profitMargin(income: number, net: number): number | null {
  return income > 0 ? Math.round((net / income) * 1000) / 10 : null;
}

/** Share of recorded income already paid by buyers; null when no income. */
export function collectionRate(txs: Tx[]): number | null {
  let total = 0, settled = 0;
  for (const t of txs) if (t.kind === "income") { total += toCents(t.amount); settled += toCents(t.amount_settled); }
  return total > 0 ? Math.round((settled / total) * 1000) / 10 : null;
}

export function topCounterparties(txs: Tx[], kind: "income" | "expense", limit = 5) {
  const m = new Map<string, { name: string; c: number }>();
  for (const t of txs) {
    if (t.kind !== kind || !t.counterparty) continue;
    const key = t.counterparty.trim().toLowerCase();
    const row = m.get(key) ?? { name: t.counterparty.trim(), c: 0 };
    row.c += toCents(t.amount); m.set(key, row);
  }
  return [...m.values()].map((r) => ({ name: r.name, amount: fromCents(r.c) })).sort((a, b) => b.amount - a.amount).slice(0, limit);
}

/** Per-crop margin: net / income for crops that have income. */
export function cropMargins(txs: Tx[]) {
  return cropPerformance(txs).map((c) => ({ ...c, margin: profitMargin(c.income, c.net) }));
}

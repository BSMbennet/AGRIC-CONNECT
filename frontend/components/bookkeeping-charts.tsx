"use client";
import { motion, useReducedMotion } from "framer-motion";
import { CATEGORY_LABELS } from "@/lib/bookkeeping/schema";

const zar = (n: number) => "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TrendChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const hasData = data.some((d) => d.income || d.expense);
  if (!hasData) return <p className="text-sm text-slate-500">No entries in this period yet.</p>;
  return (
    <div role="img" aria-label={"Income and expenses by month: " + data.map((d) => `${d.month} income ${zar(d.income)}, expenses ${zar(d.expense)}`).join("; ")}>
      <div className="flex h-44 items-end gap-3">
        {data.map((d) => (
          <div key={d.month} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-1">
              <motion.div className="w-1/2 rounded-t bg-leaf" initial={reduce ? false : { height: 0 }} animate={{ height: `${(d.income / max) * 100}%` }} transition={{ duration: 0.5 }} />
              <motion.div className="w-1/2 rounded-t bg-earth" initial={reduce ? false : { height: 0 }} animate={{ height: `${(d.expense / max) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className="mt-1 text-center text-[11px] text-slate-600">{d.month.slice(2)}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 flex gap-4 text-xs text-slate-600"><span><i className="mr-1 inline-block h-2 w-2 bg-leaf" />Income</span><span><i className="mr-1 inline-block h-2 w-2 bg-earth" />Expenses</span></p>
    </div>
  );
}

export function BreakdownChart({ data }: { data: { category: string; amount: number }[] }) {
  const reduce = useReducedMotion();
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (!total) return <p className="text-sm text-slate-500">No expenses recorded for this period.</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.category}>
          <div className="flex justify-between text-sm"><span>{CATEGORY_LABELS[d.category] ?? d.category}</span><span className="font-semibold">{zar(d.amount)} · {Math.round((d.amount / total) * 100)}%</span></div>
          <div className="mt-1 h-2 rounded bg-emerald-900/10"><motion.div className="h-2 rounded bg-gold" initial={reduce ? false : { width: 0 }} animate={{ width: `${(d.amount / total) * 100}%` }} transition={{ duration: 0.5 }} /></div>
        </li>
      ))}
    </ul>
  );
}

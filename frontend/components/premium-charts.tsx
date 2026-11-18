"use client";
import { motion, useReducedMotion } from "framer-motion";

const zar = (n: number) => (n < 0 ? "−R" : "R") + Math.abs(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });
type Pt = { label: string; value: number };

/** Smooth line + area chart that handles negative values (profit below the zero line). */
export function ProfitLine({ points, color = "#2F7D4B", title }: { points: Pt[]; color?: string; title: string }) {
  const reduce = useReducedMotion();
  const W = 640, H = 220, pad = { l: 8, r: 8, t: 16, b: 26 };
  const vals = points.map((p) => p.value);
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), span = hi - lo || 1;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + ((hi - v) / span) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)}Z`;
  const gid = "g" + title.replace(/\W/g, "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}: ` + points.map((p) => `${p.label} ${zar(p.value)}`).join(", ")}>
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#94a3b8" strokeDasharray="4 4" />
      <motion.path d={area} fill={`url(#${gid})`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} initial={reduce ? false : { strokeDashoffset: 1 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1 }} />
      {points.map((p, i) => <circle key={p.label} cx={x(i)} cy={y(p.value)} r={3.5} fill={p.value < 0 ? "#b91c1c" : color}><title>{`${p.label}: ${zar(p.value)}`}</title></circle>)}
      {points.map((p, i) => (i % 2 === 0 || points.length < 8) && <text key={p.label} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#475569">{p.label.slice(2)}</text>)}
    </svg>
  );
}

/** Donut of expense shares with a legend. */
export function Donut({ data, labels }: { data: { category: string; amount: number }[]; labels: Record<string, string> }) {
  const reduce = useReducedMotion();
  const total = data.reduce((s, d) => s + d.amount, 0);
  const colors = ["#174B35", "#2F7D4B", "#C9A24A", "#7A5230", "#6FB5D9", "#B5772F", "#8FB77A", "#a16207", "#475569", "#94a3b8"];
  if (!total) return <p className="text-sm text-slate-500">No expenses recorded yet.</p>;
  const r = 54, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90" role="img" aria-label={"Expense shares: " + data.map((d) => `${labels[d.category] ?? d.category} ${Math.round((d.amount / total) * 100)}%`).join(", ")}>
        {data.map((d, i) => {
          const len = (d.amount / total) * c, el = (
            <motion.circle key={d.category} cx="70" cy="70" r={r} fill="none" stroke={colors[i % colors.length]} strokeWidth="22"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }} />
          );
          offset += len; return el;
        })}
      </svg>
      <ul className="space-y-1 text-sm">{data.map((d, i) => <li key={d.category} className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-sm" style={{ background: colors[i % colors.length] }} />{labels[d.category] ?? d.category} <b>{Math.round((d.amount / total) * 100)}%</b></li>)}</ul>
    </div>
  );
}

/** Horizontal ranked bars; negative values shown in red. */
export function RankBars({ rows, valueLabel }: { rows: { name: string; value: number; note?: string }[]; valueLabel?: (v: number) => string }) {
  const reduce = useReducedMotion();
  if (!rows.length) return <p className="text-sm text-slate-500">Not enough entries yet.</p>;
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.name}>
          <div className="flex justify-between text-sm"><span className="capitalize">{r.name}{r.note && <span className="ml-2 text-xs text-slate-500">{r.note}</span>}</span><b className={r.value < 0 ? "text-red-700" : "text-forest"}>{(valueLabel ?? zar)(r.value)}</b></div>
          <div className="mt-1 h-2.5 rounded bg-emerald-900/10"><motion.div className={`h-2.5 rounded ${r.value < 0 ? "bg-red-500" : "bg-leaf"}`} initial={reduce ? false : { width: 0 }} animate={{ width: `${(Math.abs(r.value) / max) * 100}%` }} transition={{ duration: 0.6 }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Radial gauge for a percentage (e.g. share of sales already paid). */
export function Gauge({ percent, label }: { percent: number | null; label: string }) {
  if (percent === null) return <p className="text-sm text-slate-500">No sales recorded yet.</p>;
  const r = 46, c = Math.PI * r, p = Math.max(0, Math.min(100, percent));
  return (
    <div className="text-center" role="img" aria-label={`${label}: ${p}%`}>
      <svg viewBox="0 0 120 70" className="mx-auto w-48"><path d="M14 60 A46 46 0 0 1 106 60" fill="none" stroke="#d1e7d6" strokeWidth="12" strokeLinecap="round" /><path d="M14 60 A46 46 0 0 1 106 60" fill="none" stroke="#2F7D4B" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} /></svg>
      <p className="-mt-6 text-2xl font-bold text-forest">{p}%</p><p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}

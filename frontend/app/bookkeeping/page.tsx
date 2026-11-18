import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/reveal";
import { BreakdownChart, TrendChart } from "@/components/bookkeeping-charts";
import { createClient } from "@/lib/supabase/server";
import { loadTransactions } from "@/lib/bookkeeping/load";
import { CATEGORY_LABELS, METHOD_LABELS } from "@/lib/bookkeeping/schema";
import { cropPerformance, expenseBreakdown, inRange, monthlyTrend, outstanding, periodRange, summarise, todayInJohannesburg, toCents, type Period } from "@/lib/bookkeeping/reports";
import { deleteTransaction, recordPayment } from "@/actions/bookkeeping";

type SP = Promise<{ period?: string; saved?: string; paid?: string; deleted?: string; error?: string }>;
const PERIODS: { id: Period; label: string }[] = [{ id: "day", label: "Today" }, { id: "week", label: "This week" }, { id: "month", label: "This month" }, { id: "year", label: "This year" }];
const zar = (n: number) => "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ERRORS: Record<string, string> = { payment: "That payment could not be recorded.", overpay: "That payment is more than the amount still owing.", delete: "That entry could not be deleted." };

export default async function BookkeepingPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookkeeping");
  const { data: profile } = await supabase.from("profiles").select("role,display_name").eq("id", user.id).maybeSingle();
  if (!profile || !["farmer", "cooperative_manager"].includes(profile.role)) redirect("/dashboard");

  const period = (PERIODS.some((p) => p.id === sp.period) ? sp.period : "month") as Period;
  const today = todayInJohannesburg();
  const range = periodRange(period, today);
  const all = await loadTransactions(supabase, user.id);
  const current = all.filter((t) => inRange(t, range.from, range.to));
  const s = summarise(current);
  const open = outstanding(all);
  const crops = cropPerformance(current).slice(0, 5);
  const recent = current.slice(0, 20);

  const signed = new Map<string, string>();
  await Promise.all(recent.filter((t) => t.receipt_path).map(async (t) => {
    const { data } = await supabase.storage.from("farm-receipts").createSignedUrl(t.receipt_path!, 300);
    if (data?.signedUrl) signed.set(t.id, data.signedUrl);
  }));

  const card = "rounded-2xl border border-emerald-900/10 bg-white/95 p-5 shadow-soft card-lift";
  return (
    <main className="agri-page scene-harvest">
      <AppNav />
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-leaf">Bookkeeping · {range.label}</p>
            <h1 className="text-3xl font-bold text-forest">Your farm money</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/bookkeeping/new" className="rounded-xl bg-forest px-4 py-2 text-sm font-bold text-white">Add entry</Link>
            <a href={`/bookkeeping/export?period=${period}`} className="rounded-xl border border-forest px-4 py-2 text-sm font-bold text-forest">Download for Excel (CSV)</a>
            <Link href={`/bookkeeping/report?period=${period}`} className="rounded-xl border border-forest px-4 py-2 text-sm font-bold text-forest">Printable report</Link>
          </div>
        </div>

        <nav aria-label="Report period" className="mt-5 flex flex-wrap gap-2">
          {PERIODS.map((p) => <Link key={p.id} href={`/bookkeeping?period=${p.id}`} aria-current={p.id === period ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${p.id === period ? "bg-forest text-white" : "bg-white text-forest"}`}>{p.label}</Link>)}
        </nav>

        {(sp.saved || sp.paid || sp.deleted) && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{sp.saved ? "Entry saved." : sp.paid ? "Payment recorded." : "Entry deleted."}</p>}
        {sp.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{ERRORS[sp.error] ?? "Something went wrong."}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal><div className={card}><p className="text-sm text-slate-600">Money in</p><p className="mt-1 text-2xl font-bold text-leaf"><CountUp value={s.income} decimals={2} prefix="R" /></p></div></Reveal>
          <Reveal delay={0.05}><div className={card}><p className="text-sm text-slate-600">Money out</p><p className="mt-1 text-2xl font-bold text-earth"><CountUp value={s.expense} decimals={2} prefix="R" /></p></div></Reveal>
          <Reveal delay={0.1}><div className={card}><p className="text-sm text-slate-600">Profit (money in − money out)</p><p className={`mt-1 text-2xl font-bold ${s.net < 0 ? "text-red-700" : "text-forest"}`}><CountUp value={s.net} decimals={2} prefix="R" /></p></div></Reveal>
          <Reveal delay={0.15}><div className={card}><p className="text-sm text-slate-600">Still to be paid</p><p className="mt-1 text-sm">Owed to you: <b>{zar(summarise(open).owedToYou)}</b></p><p className="text-sm">You owe: <b>{zar(summarise(open).youOwe)}</b></p></div></Reveal>
        </div>
        <p className="mt-2 text-xs text-slate-600">Figures are added up only from the entries you recorded. They are not verified by AgricNorthX and are not tax or accounting advice.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className={card}><h2 className="font-bold text-forest">Last 6 months</h2><div className="mt-4"><TrendChart data={monthlyTrend(all, today.slice(0, 7))} /></div></div>
          <div className={card}><h2 className="font-bold text-forest">Where the money went</h2><div className="mt-4"><BreakdownChart data={expenseBreakdown(current)} /></div></div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className={card}>
            <h2 className="font-bold text-forest">Best crops this period</h2>
            <p className="text-xs text-slate-600">Uses only entries where you named the crop. Result = money in − money out for that crop in this period, so a crop with costs but no sales yet will show a loss.</p>
            {crops.length === 0 ? <p className="mt-3 text-sm text-slate-500">Add a crop name to your entries to see this.</p> :
              <ul className="mt-3 divide-y divide-slate-100 text-sm">{crops.map((c) => <li key={c.crop} className="flex justify-between py-2"><span className="capitalize">{c.crop}</span><span className={c.net < 0 ? "font-semibold text-red-700" : "font-semibold text-leaf"}>{zar(c.net)}</span></li>)}</ul>}
          </div>
          <div className={card}>
            <h2 className="font-bold text-forest">Unpaid entries</h2>
            {open.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nothing outstanding.</p> :
              <ul className="mt-3 divide-y divide-slate-100 text-sm">{open.slice(0, 8).map((t) => {
                const left = (toCents(t.amount) - toCents(t.amount_settled)) / 100;
                return <li key={t.id} className="py-3">
                  <p>{t.kind === "income" ? "Owed to you" : "You owe"} <b>{zar(left)}</b> · {CATEGORY_LABELS[t.category]} · {t.counterparty || "no name"} · {t.occurred_on}</p>
                  <form action={recordPayment} className="mt-2 flex gap-2"><input type="hidden" name="id" value={t.id} /><label className="sr-only" htmlFor={`pay-${t.id}`}>Payment amount</label><input id={`pay-${t.id}`} name="amount" type="number" step="0.01" min="0.01" max={left} required placeholder="Amount paid" className="h-10 w-32 rounded-lg border border-slate-300 px-2" /><button className="rounded-lg bg-leaf px-3 text-sm font-bold text-white">Record payment</button></form>
                </li>;
              })}</ul>}
          </div>
        </div>

        <div className={`${card} mt-4 overflow-x-auto`}>
          <h2 className="font-bold text-forest">Entries in this period</h2>
          {recent.length === 0 ? <p className="mt-3 text-sm text-slate-500">No entries yet. Choose “Add entry” to record your first sale or expense.</p> :
            <table className="mt-3 w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Date</th><th>Type</th><th>Details</th><th className="text-right">Amount</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100">{recent.map((t) => (
                <tr key={t.id}>
                  <td className="py-2">{t.occurred_on}</td>
                  <td>{t.kind === "income" ? "Income" : "Expense"}</td>
                  <td>{CATEGORY_LABELS[t.category]}{t.crop ? ` · ${t.crop}` : ""}{t.counterparty ? ` · ${t.counterparty}` : ""} <span className="text-xs text-slate-500">({METHOD_LABELS[t.payment_method]})</span>{signed.get(t.id) && <> · <a className="text-leaf underline" href={signed.get(t.id)} target="_blank" rel="noopener noreferrer">Receipt</a></>}</td>
                  <td className={`text-right font-semibold ${t.kind === "income" ? "text-leaf" : "text-earth"}`}>{t.kind === "income" ? "+" : "−"}{zar(t.amount)}</td>
                  <td className="text-right"><form action={deleteTransaction}><input type="hidden" name="id" value={t.id} /><button className="text-xs text-red-700 underline" aria-label={`Delete entry from ${t.occurred_on}`}>Delete</button></form></td>
                </tr>))}</tbody>
            </table>}
          {current.length > recent.length && <p className="mt-2 text-xs text-slate-600">Showing the latest {recent.length} of {current.length}. The CSV download includes all of them.</p>}
        </div>
      </section>
    </main>
  );
}

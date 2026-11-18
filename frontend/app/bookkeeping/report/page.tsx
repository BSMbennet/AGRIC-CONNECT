import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { BookkeepingLoadError, loadTransactions } from "@/lib/bookkeeping/load";
import { BookkeepingUnavailable } from "@/components/bookkeeping-unavailable";
import { CATEGORY_LABELS } from "@/lib/bookkeeping/schema";
import { cropPerformance, expenseBreakdown, inRange, periodRange, summarise, todayInJohannesburg, type Period } from "@/lib/bookkeeping/reports";

const zar = (n: number) => "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookkeeping/report");
  const { data: profile } = await supabase.from("profiles").select("role,display_name").eq("id", user.id).maybeSingle();
  if (!profile || !["farmer", "cooperative_manager"].includes(profile.role)) redirect("/dashboard");

  const period = (["day", "week", "month", "year"].includes(sp.period ?? "") ? sp.period : "month") as Period;
  const range = periodRange(period, todayInJohannesburg());
  let loaded: Awaited<ReturnType<typeof loadTransactions>>;
  try { loaded = await loadTransactions(supabase, user.id); }
  catch (e) { return <BookkeepingUnavailable notSetUp={e instanceof BookkeepingLoadError && e.notSetUp} />; }
  const txs = loaded.filter((t) => inRange(t, range.from, range.to));
  const s = summarise(txs);
  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-slate-900 print:p-0">
      <div className="flex items-center justify-between print:hidden"><a href={`/bookkeeping?period=${period}`} className="text-sm font-semibold text-leaf">← Back</a><PrintButton /></div>
      <h1 className="mt-4 text-2xl font-bold">AgricNorthX financial summary</h1>
      <p className="text-sm">{profile.display_name} · {range.from} to {range.to}</p>
      <table className="mt-5 w-full text-sm"><tbody>
        <tr><td className="py-1">Money in</td><td className="text-right">{zar(s.income)}</td></tr>
        <tr><td className="py-1">Money out</td><td className="text-right">{zar(s.expense)}</td></tr>
        <tr className="border-t font-bold"><td className="py-1">Profit</td><td className="text-right">{zar(s.net)}</td></tr>
        <tr><td className="py-1">Still owed to you</td><td className="text-right">{zar(s.owedToYou)}</td></tr>
        <tr><td className="py-1">You still owe</td><td className="text-right">{zar(s.youOwe)}</td></tr>
      </tbody></table>
      <h2 className="mt-6 font-bold">Expenses by category</h2>
      <table className="mt-2 w-full text-sm"><tbody>{expenseBreakdown(txs).map((e) => <tr key={e.category}><td className="py-1">{CATEGORY_LABELS[e.category]}</td><td className="text-right">{zar(e.amount)}</td></tr>)}</tbody></table>
      <h2 className="mt-6 font-bold">By crop (entries with a crop name)</h2>
      <table className="mt-2 w-full text-sm"><tbody>{cropPerformance(txs).map((c) => <tr key={c.crop}><td className="py-1 capitalize">{c.crop}</td><td className="text-right">{zar(c.income)} in · {zar(c.expense)} out · {zar(c.net)}</td></tr>)}</tbody></table>
      <h2 className="mt-6 font-bold">All entries ({txs.length})</h2>
      <table className="mt-2 w-full text-xs"><tbody>{txs.map((t) => <tr key={t.id} className="border-b"><td className="py-1">{t.occurred_on}</td><td>{CATEGORY_LABELS[t.category]}{t.crop ? ` · ${t.crop}` : ""}{t.counterparty ? ` · ${t.counterparty}` : ""}</td><td className="text-right">{t.kind === "income" ? "+" : "−"}{zar(t.amount)}</td></tr>)}</tbody></table>
      <p className="mt-6 text-xs text-slate-600">Prepared from entries recorded by the account holder. Not verified by AgricNorthX; not tax or accounting advice.</p>
    </main>
  );
}

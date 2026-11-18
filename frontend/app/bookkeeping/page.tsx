import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { addBookkeepingEntry, deleteBookkeepingEntry } from "@/actions/bookkeeping";
import { Wallet, TrendingUp, TrendingDown, Scale } from "lucide-react";

type Entry = { id: string; entry_type: "income" | "expense"; category: string; amount: number; entry_date: string; description: string };

const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);

export default async function BookkeepingPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; deleted?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name,role").eq("id", user.id).single();
  if (profile?.role !== "farmer") redirect("/dashboard");
  const { data } = await supabase.from("farm_bookkeeping_entries")
    .select("id,entry_type,category,amount,entry_date,description")
    .eq("owner_id", user.id).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  const entries = (data ?? []) as Entry[];
  const income = entries.filter((entry) => entry.entry_type === "income").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expenses = entries.filter((entry) => entry.entry_type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const net = income - expenses;
  const now = new Date();
  const thisMonth = entries.filter((entry) => {
    const date = new Date(entry.entry_date + "T12:00:00");
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const monthIncome = thisMonth.filter((entry) => entry.entry_type === "income").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const monthExpenses = thisMonth.filter((entry) => entry.entry_type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    const rows = entries.filter((entry) => entry.entry_date.startsWith(key));
    return { label: date.toLocaleDateString("en-ZA", { month: "short" }), income: rows.filter((entry) => entry.entry_type === "income").reduce((sum, entry) => sum + Number(entry.amount), 0), expenses: rows.filter((entry) => entry.entry_type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0) };
  });
  const maxValue = Math.max(1, ...months.flatMap((month) => [month.income, month.expenses]));
  return <main className="min-h-screen agri-page"><AppNav active="bookkeeping"/><section className="mx-auto max-w-6xl px-5 py-10">
    <p className="text-sm font-semibold text-leaf">Farm management</p><h1 className="mt-2 text-3xl font-bold text-forest">Bookkeeping</h1>
    <p className="mt-2 text-slate-600">Track farm income, expenses and your net position. All figures come from entries you record here.</p>
    {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error === "invalid" ? "Check the entry details and try again." : "That bookkeeping change could not be saved."}</p>}
    {params.saved && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Entry saved.</p>}
    {params.deleted && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Entry deleted.</p>}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><Wallet className="text-leaf"/><p className="mt-3 text-xs text-slate-500">Total income recorded</p><p className="mt-1 text-2xl font-bold text-forest">{money(income)}</p></article>
      <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><TrendingDown className="text-red-600"/><p className="mt-3 text-xs text-slate-500">Total expenses recorded</p><p className="mt-1 text-2xl font-bold text-forest">{money(expenses)}</p></article>
      <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><Scale className="text-leaf"/><p className="mt-3 text-xs text-slate-500">Net balance</p><p className={`mt-1 text-2xl font-bold ${net >= 0 ? "text-forest" : "text-red-700"}`}>{money(net)}</p></article>
      <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><TrendingUp className="text-leaf"/><p className="mt-3 text-xs text-slate-500">This month · income / expenses</p><p className="mt-1 text-lg font-bold text-forest">{money(monthIncome)}</p><p className="text-sm text-slate-500">{money(monthExpenses)} expenses</p></article>
    </div>
    <section className="mt-8 rounded-2xl border border-emerald-900/10 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-forest">Six-month financial overview</h2><p className="mt-1 text-xs text-slate-500">Monthly income compared with expenses · ZAR</p></div><div className="flex gap-4 text-xs"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-600"/>Income</span><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-sm bg-orange-400"/>Expenses</span></div></div>
      <div className="mt-6 grid grid-cols-6 gap-2 sm:gap-5">{months.map((month) => <div key={month.label + month.income} className="min-w-0"><div className="flex h-40 items-end justify-center gap-1 border-b border-slate-200 px-1">{[{value:month.income,color:"bg-emerald-600",label:"Income"},{value:month.expenses,color:"bg-orange-400",label:"Expenses"}].map((bar) => <div key={bar.label} title={bar.label + ": " + money(bar.value)} className={`w-3 rounded-t-sm sm:w-6 ${bar.color}`} style={{height:Math.max(bar.value > 0 ? 3 : 0, (bar.value / maxValue) * 100) + "%"}}/>)}</div><p className="mt-2 truncate text-center text-[11px] font-semibold text-slate-600">{month.label}</p><p className="hidden text-center text-[10px] text-slate-400 sm:block">{money(month.income - month.expenses)}</p></div>)}</div>
      {!entries.length && <p className="mt-4 rounded-xl bg-[#f7faf7] p-4 text-sm text-slate-600">Your chart will fill in as you record sales and farm costs.</p>}
    </section>
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-2xl border border-emerald-900/10 bg-white p-5"><h2 className="text-lg font-bold text-forest">Add a transaction</h2><form action={addBookkeepingEntry} className="mt-4 space-y-3">
        <label className="block text-xs font-semibold text-slate-700">Transaction type<select name="entry_type" required className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="income">Income</option><option value="expense">Expense</option></select></label>
        <label className="block text-xs font-semibold text-slate-700">Category<input name="category" required minLength={2} maxLength={60} placeholder="e.g. Maize sales, seeds, transport" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
        <label className="block text-xs font-semibold text-slate-700">Amount (R)<input name="amount" type="number" required min="0.01" max="9999999999.99" step="0.01" placeholder="0.00" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
        <label className="block text-xs font-semibold text-slate-700">Date<input name="entry_date" type="date" required defaultValue={now.toISOString().slice(0,10)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
        <label className="block text-xs font-semibold text-slate-700">Notes (optional)<textarea name="description" maxLength={500} rows={3} placeholder="Add a short note" className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
        <button className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-bold text-white hover:bg-leaf">Save transaction</button>
      </form></section>
      <section className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-forest">Recent transactions</h2><span className="text-xs text-slate-500">{entries.length} entries</span></div>
        {entries.length ? <div className="mt-3 divide-y divide-slate-100">{entries.slice(0,50).map((entry) => <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-semibold text-forest">{entry.category}</p><p className="mt-1 text-xs text-slate-500">{new Date(entry.entry_date + "T12:00:00").toLocaleDateString("en-ZA")}{entry.description ? " · " + entry.description : ""}</p></div><div className="flex items-center gap-3"><span className={`whitespace-nowrap text-sm font-bold ${entry.entry_type === "income" ? "text-emerald-700" : "text-red-700"}`}>{entry.entry_type === "income" ? "+" : "−"}{money(Number(entry.amount))}</span><form action={deleteBookkeepingEntry}><input type="hidden" name="entry_id" value={entry.id}/><button aria-label="Delete transaction" className="text-xs text-slate-400 underline hover:text-red-700">Delete</button></form></div></article>)}</div> : <p className="mt-4 rounded-xl bg-[#f7faf7] p-5 text-sm text-slate-600">No transactions recorded yet. Add your first income or expense to start tracking your farm finances.</p>}
      </section>
    </div>
  </section></main>;
}

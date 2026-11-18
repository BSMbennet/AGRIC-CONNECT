import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";
import { createTransaction } from "@/actions/bookkeeping";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, METHOD_LABELS, PAYMENT_METHODS } from "@/lib/bookkeeping/schema";
import { todayInJohannesburg } from "@/lib/bookkeeping/reports";

export default async function NewEntryPage({ searchParams }: { searchParams: Promise<{ error?: string; kind?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookkeeping/new");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["farmer", "cooperative_manager"].includes(profile.role)) redirect("/dashboard");

  const kind = sp.kind === "income" ? "income" : "expense";
  const cats = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const field = "mt-1 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base";
  const label = "block text-sm font-semibold text-forest";
  return (
    <main className="agri-page scene-harvest">
      <AppNav />
      <section className="mx-auto max-w-xl px-5 py-8">
        <Link href="/bookkeeping" className="text-sm font-semibold text-leaf">← Back to bookkeeping</Link>
        <h1 className="mt-2 text-3xl font-bold text-forest">Add an entry</h1>
        <nav aria-label="Entry type" className="mt-4 flex gap-2">
          <Link href="/bookkeeping/new?kind=expense" aria-current={kind === "expense" ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${kind === "expense" ? "bg-forest text-white" : "bg-white text-forest"}`}>Money out (expense)</Link>
          <Link href="/bookkeeping/new?kind=income" aria-current={kind === "income" ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${kind === "income" ? "bg-forest text-white" : "bg-white text-forest"}`}>Money in (sale)</Link>
        </nav>
        {sp.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
        <form action={createTransaction} className="mt-5 space-y-4 rounded-2xl border border-emerald-900/10 bg-white/95 p-5 shadow-soft">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="client_submission_id" value={randomUUID()} />
          <div><label className={label} htmlFor="category">What was it?</label>
            <select id="category" name="category" required className={field}>{cats.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></div>
          <div><label className={label} htmlFor="amount">Total amount (Rand)</label>
            <input id="amount" name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required className={field} /></div>
          <div><label className={label} htmlFor="occurred_on">Date</label>
            <input id="occurred_on" name="occurred_on" type="date" required defaultValue={todayInJohannesburg()} className={field} /></div>
          <div><label className={label} htmlFor="settlement">{kind === "income" ? "Has the buyer paid?" : "Have you paid?"}</label>
            <select id="settlement" name="settlement" defaultValue="paid" className={field}><option value="paid">Paid in full</option><option value="unpaid">Not paid yet</option></select>
            <p className="mt-1 text-xs text-slate-600">For part payment, choose “Not paid yet” and record each payment on the main page.</p></div>
          <div><label className={label} htmlFor="payment_method">How was it paid?</label>
            <select id="payment_method" name="payment_method" className={field}>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}</select></div>
          <div><label className={label} htmlFor="crop">Crop (optional)</label>
            <input id="crop" name="crop" maxLength={80} placeholder="e.g. Tomatoes" className={field} /></div>
          <div><label className={label} htmlFor="counterparty">{kind === "income" ? "Buyer (optional)" : "Supplier (optional)"}</label>
            <input id="counterparty" name="counterparty" maxLength={120} className={field} /></div>
          <div><label className={label} htmlFor="notes">Notes (optional)</label>
            <textarea id="notes" name="notes" maxLength={1000} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-base" /></div>
          <div><label className={label} htmlFor="receipt">Receipt photo or PDF (optional, up to 5 MB)</label>
            <input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="mt-1 block w-full text-sm" /></div>
          <button className="h-12 w-full rounded-xl bg-forest text-base font-bold text-white hover:bg-leaf">Save entry</button>
          <p className="text-xs text-slate-600">Only you can see your entries. Receipts are stored privately.</p>
        </form>
      </section>
    </main>
  );
}

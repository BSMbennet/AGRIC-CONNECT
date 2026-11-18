import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const metadata = { title: "Farmer wallet | AgricNorthX" };

const zar = (amount: number) => amount.toLocaleString("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

export default async function FarmerWalletPage() {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/wallet");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "farmer") redirect("/dashboard");

  const { data: entries, error } = await supabase.from("farmer_wallet_ledger")
    .select("id,order_id,currency,gross_amount,commission_bps,commission_amount,net_amount,status,created_at")
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = entries ?? [];
  const pending = rows.filter((entry) => entry.status === "pending_delivery");
  const confirmed = rows.filter((entry) => entry.status === "delivery_confirmed_unpaid");
  const sum = (items: typeof rows, key: "gross_amount" | "commission_amount" | "net_amount") =>
    items.reduce((total, entry) => total + Number(entry[key]), 0);

  return <main className="min-h-screen agri-page scene-harvest">
    <AppNav />
    <section className="mx-auto max-w-5xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold text-leaf">Farmer earnings</p><h1 className="mt-2 text-3xl font-bold text-forest">Wallet ledger</h1></div>
        <Link href="/bookkeeping" className="rounded-xl border border-forest px-4 py-2 text-sm font-bold text-forest">Back to bookkeeping</Link>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">This is an earnings ledger, not a bank account. It tracks paid buyer orders, the marketplace&apos;s 5% commission, and the net amount attributed to your deliveries.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Wallet entries could not be loaded. Refresh or contact support.</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-amber-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Awaiting buyer delivery confirmation</p><p className="mt-2 text-2xl font-bold text-forest">{zar(sum(pending, "net_amount"))}</p><p className="mt-1 text-xs text-slate-500">{pending.length} wallet entries · net after 5% internal commission</p></article>
        <article className="rounded-2xl border border-emerald-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Delivery confirmed · unpaid</p><p className="mt-2 text-2xl font-bold text-forest">{zar(sum(confirmed, "net_amount"))}</p><p className="mt-1 text-xs text-slate-500">{confirmed.length} wallet entries · no payout has been sent</p></article>
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white">
        <div className="border-b border-emerald-900/10 p-5"><h2 className="font-bold text-forest">Wallet activity</h2><p className="mt-1 text-xs text-slate-500">Up to 200 most recent entries. Amounts are in South African rand.</p></div>
        {rows.length ? <div className="divide-y divide-emerald-900/10">
          {rows.map((entry) => <article key={entry.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><p className="text-sm font-bold text-forest">Order {entry.order_id.slice(0, 8)}</p><p className="mt-1 text-xs text-slate-500">{new Date(entry.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} · {entry.status === "pending_delivery" ? "Awaiting buyer confirmation" : "Delivery confirmed · unpaid"}</p><p className="mt-1 text-xs text-slate-500">Gross {zar(Number(entry.gross_amount))} · Commission ({Number(entry.commission_bps) / 100}%) {zar(Number(entry.commission_amount))}</p></div>
            <div className="sm:text-right"><p className="text-xs text-slate-500">Farmer net</p><p className="text-lg font-bold text-forest">{zar(Number(entry.net_amount))}</p></div>
          </article>)}
        </div> : <p className="p-6 text-sm text-slate-500">No paid order earnings have been recorded yet.</p>}
      </section>
      <p className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">No withdraw, bank payout or Stripe Connect transfer is available in this test integration. These balances remain unpaid until a separately approved South African payout route is implemented. This screen does not mean funds are held in a regulated wallet or deposited with AgricNorthX.</p>
    </section>
  </main>;
}

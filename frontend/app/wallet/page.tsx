import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

type WalletEntry = {
  id: string;
  order_id: string;
  currency: string;
  gross_amount: number | string;
  commission_amount: number | string;
  net_amount: number | string;
  status: "pending_delivery" | "delivery_confirmed_unpaid";
  created_at: string;
};

const money = (amount: number) => new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
}).format(amount);

export const metadata = { title: "Farmer wallet ledger | AgricNorthX" };

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/wallet");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "farmer") redirect("/dashboard");

  const db = supabase as unknown as SupabaseClient;
  const { data } = await db.from("farmer_wallet_ledger")
    .select("id,order_id,currency,gross_amount,commission_amount,net_amount,status,created_at")
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false });

  const entries = (data ?? []) as WalletEntry[];
  const pending = entries.filter((entry) => entry.status === "pending_delivery");
  const confirmed = entries.filter((entry) => entry.status === "delivery_confirmed_unpaid");
  const totalNet = (rows: WalletEntry[]) => rows.reduce((sum, entry) => sum + Number(entry.net_amount), 0);

  return (
    <main className="min-h-screen agri-page scene-harvest">
      <AppNav active="wallet" />
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-leaf">Farmer earnings</p>
            <h1 className="mt-1 text-3xl font-bold text-forest">Wallet ledger</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              A record of buyer payments allocated to your orders, less the 5% AgricNorthX marketplace commission.
            </p>
          </div>
          <Link href="/bookkeeping" className="rounded-xl border border-forest px-4 py-2 text-sm font-bold text-forest">Open bookkeeping</Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Awaiting buyer delivery confirmation</p>
            <p className="mt-2 text-2xl font-bold text-forest">{money(totalNet(pending))}</p>
          </article>
          <article className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Delivery confirmed · payout route pending</p>
            <p className="mt-2 text-2xl font-bold text-forest">{money(totalNet(confirmed))}</p>
          </article>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-forest">Payment entries</h2>
          {entries.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No buyer payments have been recorded against your orders yet.</p>
          ) : (
            <table className="mt-4 w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500">
                <tr><th className="py-2">Date</th><th>Order</th><th>Gross</th><th>Commission (5%)</th><th>Net ledger amount</th><th>Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3">{new Date(entry.created_at).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}</td>
                    <td><Link className="text-leaf underline" href={"/orders/" + entry.order_id}>#{entry.order_id.slice(0, 8)}</Link></td>
                    <td>{money(Number(entry.gross_amount))}</td>
                    <td>{money(Number(entry.commission_amount))}</td>
                    <td className="font-semibold text-forest">{money(Number(entry.net_amount))}</td>
                    <td>{entry.status === "pending_delivery" ? "Awaiting delivery confirmation" : "Confirmed · awaiting payout route"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-950">
          This is an accounting ledger, not a bank account, stored-value wallet or escrow service. Stripe test payments settle to the platform account; this integration does not transfer or pay money to South African farmers. Entries remain pending until the buyer confirms delivery. A separately approved South African payout provider and process are required before withdrawals can be offered.
        </p>
      </section>
    </main>
  );
}

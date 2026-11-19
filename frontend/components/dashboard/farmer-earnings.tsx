import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/reveal";
import { TrendChart } from "@/components/bookkeeping-charts";

type Stats = {
  total_income: number; total_expenses: number; net_profit: number; unpaid_income: number; cash_position: number;
  months: { key: string; label: string; income: number; expenses: number }[];
};
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/**
 * Farmer earnings summary for the dashboard. Every figure is a sum of entries recorded in Bookkeeping
 * (manual entries plus fulfilled orders); nothing is estimated. If bookkeeping is unavailable the card
 * degrades to a prompt instead of breaking the dashboard.
 */
export async function FarmerEarnings() {
  const supabase = await createClient();
  const t = await getTranslations("earnings");
  const { data, error } = await supabase.rpc("get_bookkeeping_dashboard_stats");
  if (error) console.error("[dashboard] bookkeeping stats failed", error.code);
  const raw = (data ?? null) as Partial<Stats> | null;

  const stats = raw && !error ? {
    income: num(raw.total_income), expenses: num(raw.total_expenses), net: num(raw.net_profit), unpaid: num(raw.unpaid_income),
    months: (raw.months ?? []).map((m) => ({ month: String(m.key), income: num(m.income), expense: num(m.expenses) })),
  } : null;
  const hasEntries = !!stats && (stats.income > 0 || stats.expenses > 0);

  const tile = "rounded-2xl border border-emerald-900/10 bg-white p-5 card-lift";
  return (
    <section aria-labelledby="earnings-heading" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="earnings-heading" className="text-lg font-bold text-forest">{t("heading")}</h2>
          <p className="text-xs text-slate-500">{t("sub")}</p>
        </div>
        <Link href="/bookkeeping" className="text-sm font-semibold text-leaf hover:underline">{t("open")}</Link>
      </div>

      {!stats || !hasEntries ? (
        <div className="mt-3 rounded-2xl border border-dashed border-emerald-900/20 bg-white/80 p-6 text-center">
          <p className="font-semibold text-forest">{stats ? t("noneTitle") : t("unavailableTitle")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{stats ? t("noneBody") : t("unavailableBody")}</p>
          {stats && <Link href="/bookkeeping" className="mt-4 inline-block rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf">{t("start")}</Link>}
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal><div className={tile}><p className="text-sm text-slate-500">{t("moneyIn")}</p><p className="mt-2 text-2xl font-bold text-leaf"><CountUp value={stats.income} decimals={2} prefix="R" /></p></div></Reveal>
            <Reveal delay={0.05}><div className={tile}><p className="text-sm text-slate-500">{t("moneyOut")}</p><p className="mt-2 text-2xl font-bold text-earth"><CountUp value={stats.expenses} decimals={2} prefix="R" /></p></div></Reveal>
            <Reveal delay={0.1}><div className={tile}><p className="text-sm text-slate-500">{t("profit")}</p><p className={`mt-2 text-2xl font-bold ${stats.net < 0 ? "text-red-700" : "text-forest"}`}><CountUp value={stats.net} decimals={2} prefix="R" /></p></div></Reveal>
            <Reveal delay={0.15}><div className={tile}><p className="text-sm text-slate-500">{t("unpaid")}</p><p className="mt-2 text-2xl font-bold text-forest"><CountUp value={stats.unpaid} decimals={2} prefix="R" /></p></div></Reveal>
          </div>
          <Reveal><div className="mt-3 rounded-2xl border border-emerald-900/10 bg-white p-5">
            <h3 className="font-bold text-forest">{t("chart")}</h3>
            <div className="mt-4"><TrendChart data={stats.months} /></div>
          </div></Reveal>
        </>
      )}
    </section>
  );
}

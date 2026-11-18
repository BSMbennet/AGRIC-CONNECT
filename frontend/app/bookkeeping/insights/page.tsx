import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/reveal";
import { Donut, Gauge, ProfitLine, RankBars } from "@/components/premium-charts";
import { createClient } from "@/lib/supabase/server";
import { hasPremiumAnalytics } from "@/lib/entitlements";
import { loadTransactions } from "@/lib/bookkeeping/load";
import { CATEGORY_LABELS } from "@/lib/bookkeeping/schema";
import { collectionRate, cropMargins, cumulative, expenseBreakdown, monthlyNet, profitMargin, summarise, todayInJohannesburg, topCounterparties } from "@/lib/bookkeeping/reports";

const zar = (n: number) => (n < 0 ? "−R" : "R") + Math.abs(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const card = "rounded-2xl border border-emerald-900/10 bg-white/95 p-5 shadow-soft";

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookkeeping/insights");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["farmer", "cooperative_manager"].includes(profile.role)) redirect("/dashboard");

  const entitled = await hasPremiumAnalytics(supabase, user.id, profile.role);
  const all = await loadTransactions(supabase, user.id);
  const total = summarise(all);

  if (!entitled) {
    // Locked view: only the user's own headline numbers (already free on the main page) and decorative placeholders.
    // No premium chart data is sent to the browser.
    return (
      <main className="agri-page scene-harvest">
        <AppNav />
        <section className="mx-auto max-w-5xl px-5 py-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-earth"><Sparkles size={14} /> Pro farmer</p>
          <h1 className="mt-3 text-3xl font-bold text-forest">See exactly where your profit comes from</h1>
          <p className="mt-2 max-w-2xl text-slate-700">
            {all.length > 0 ? <>You have recorded <b>{all.length}</b> {all.length === 1 ? "entry" : "entries"} with a profit so far of <b className={total.net < 0 ? "text-red-700" : "text-leaf"}>{zar(total.net)}</b>. Pro turns them into charts that show what to grow, who pays well and where costs creep up.</> : "Record a few sales and expenses, then Pro turns them into charts that show what to grow, who pays well and where costs creep up."}
          </p>
          <div className="relative mt-6 overflow-hidden rounded-3xl border border-emerald-900/10 bg-white/90 p-6 shadow-soft" aria-hidden="true">
            <div className="grid gap-4 opacity-60 blur-[3px] md:grid-cols-2">
              {["12-month profit trend", "Running profit", "Crop profit margins", "Cost breakdown"].map((t) => (
                <div key={t} className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-bold text-forest">{t}</p><div className="mt-3 flex h-24 items-end gap-2">{[40, 65, 50, 80, 60, 90].map((h, i) => <div key={i} className="flex-1 rounded-t bg-leaf/50" style={{ height: `${h}%` }} />)}</div></div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-white/40"><Lock className="text-forest" size={40} /></div>
          </div>
          <p className="sr-only">Charts are locked. Upgrade to Pro to view them.</p>
          <ul className="mt-6 grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
            {["12-month profit and running-profit charts", "Profit margin for every crop you grow", "Your best buyers and how reliably they pay", "Cost breakdown so you can spot where to save", "Best month, average month and collection rate"].map((f) => <li key={f} className="rounded-xl bg-white/90 px-4 py-3">✓ {f}</li>)}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            {profile.role === "farmer"
              ? <Link href="/subscriptions" className="rounded-xl bg-forest px-6 py-3 font-bold text-white hover:bg-leaf">Upgrade to unlock</Link>
              : <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Cooperative analytics plans are not available yet.</p>}
            <Link href="/bookkeeping" className="rounded-xl border border-forest px-6 py-3 font-bold text-forest">Back to bookkeeping</Link>
          </div>
        </section>
      </main>
    );
  }

  const today = todayInJohannesburg();
  const net12 = monthlyNet(all, today.slice(0, 7), 12);
  const last12 = all.filter((t) => t.occurred_on >= net12[0].month + "-01");
  const s12 = summarise(last12);
  const withData = net12.filter((m) => m.income || m.expense);
  const best = withData.length ? withData.reduce((a, b) => (b.net > a.net ? b : a)) : null;
  const avg = withData.length ? s12.net / withData.length : null;
  const margin = profitMargin(s12.income, s12.net);
  const crops = cropMargins(last12);
  const buyers = topCounterparties(last12, "income");

  return (
    <main className="agri-page scene-harvest">
      <AppNav />
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-earth"><Sparkles size={14} /> Pro analytics</p><h1 className="mt-2 text-3xl font-bold text-forest">Your profit, explained</h1><p className="text-sm text-slate-600">Last 12 months · {net12[0].month} to {net12[11].month}</p></div>
          <Link href="/bookkeeping" className="rounded-xl border border-forest px-4 py-2 text-sm font-bold text-forest">Back to bookkeeping</Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "Profit (12 months)", v: <CountUp value={s12.net} decimals={2} prefix="R" />, c: s12.net < 0 ? "text-red-700" : "text-leaf" },
            { l: "Profit margin", v: margin === null ? "—" : <CountUp value={margin} decimals={1} suffix="%" />, c: "text-forest" },
            { l: "Best month", v: best ? best.month : "—", sub: best ? zar(best.net) : undefined, c: "text-forest" },
            { l: "Average month", v: avg === null ? "—" : <CountUp value={avg} decimals={2} prefix="R" />, sub: withData.length ? `over ${withData.length} active months` : undefined, c: "text-forest" },
          ].map((k, i) => (
            <Reveal key={k.l} delay={i * 0.05}><div className={`${card} card-lift`}><p className="text-sm text-slate-600">{k.l}</p><p className={`mt-1 text-2xl font-bold ${k.c}`}>{k.v}</p>{k.sub && <p className="text-xs text-slate-600">{k.sub}</p>}</div></Reveal>
          ))}
        </div>
        {last12.length === 0 && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No entries in the last 12 months yet. Charts fill in as you record sales and expenses.</p>}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Reveal><div className={card}><h2 className="font-bold text-forest">Monthly profit</h2><p className="text-xs text-slate-600">Money in − money out each month. Red dots are months with a loss.</p><div className="mt-3"><ProfitLine title="Monthly profit" points={net12.map((m) => ({ label: m.month, value: m.net }))} /></div></div></Reveal>
          <Reveal delay={0.05}><div className={card}><h2 className="font-bold text-forest">Running profit</h2><p className="text-xs text-slate-600">Your profit added up month by month.</p><div className="mt-3"><ProfitLine title="Running profit" color="#C9A24A" points={cumulative(net12).map((m) => ({ label: m.month, value: m.value }))} /></div></div></Reveal>
          <Reveal><div className={card}><h2 className="font-bold text-forest">Profit margin by crop</h2><p className="text-xs text-slate-600">Profit as a share of what that crop earned. Only entries where you named the crop.</p><div className="mt-3"><RankBars rows={crops.map((c) => ({ name: c.crop, value: c.net, note: c.margin === null ? "no sales yet" : `${c.margin}% margin` }))} /></div></div></Reveal>
          <Reveal delay={0.05}><div className={card}><h2 className="font-bold text-forest">Where your costs go</h2><div className="mt-3"><Donut data={expenseBreakdown(last12)} labels={CATEGORY_LABELS} /></div></div></Reveal>
          <Reveal><div className={card}><h2 className="font-bold text-forest">Your best buyers</h2><p className="text-xs text-slate-600">By money in, from entries where you named the buyer.</p><div className="mt-3"><RankBars rows={buyers.map((b) => ({ name: b.name, value: b.amount }))} /></div></div></Reveal>
          <Reveal delay={0.05}><div className={card}><h2 className="font-bold text-forest">Sales already paid</h2><div className="mt-3"><Gauge percent={collectionRate(last12)} label="of your recorded sales have been paid" /></div></div></Reveal>
        </div>
        <p className="mt-4 text-xs text-slate-600">All figures are added up from entries you recorded. They are not verified by AgricNorthX, are not forecasts, and are not tax or accounting advice.</p>
      </section>
    </main>
  );
}

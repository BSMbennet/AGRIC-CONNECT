import Link from "next/link";
import { ArrowRight, Sprout, ShoppingBasket, Truck, ShieldCheck, MapPin, CloudSun, BarChart3, BookOpen } from "lucide-react";
import { AppNav } from "@/components/app-nav";

const highlights=[
  {icon:Sprout,title:"List your harvest",text:"Farmers and community agents can publish available produce."},
  {icon:ShoppingBasket,title:"Find real demand",text:"Buyers can discover crops, quantities and farmer asking prices."},
  {icon:Truck,title:"Coordinate collection",text:"Agree quantities and collection details before produce loses value."}
];

export default function HomePage(){
  return <main className="min-h-screen agri-page">
    <AppNav />
    <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:pb-24 lg:pt-20">
      <div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-semibold text-forest"><MapPin size={14}/> Starting in Vhembe District, Limpopo</div>
        <h1 className="max-w-3xl text-5xl font-bold leading-[1.06] tracking-tight text-forest sm:text-6xl">Your harvest deserves a <span className="text-leaf">better market.</span></h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">AgricNorthX helps smallholder farmers reach nearby buyers, coordinate cooperative supply and use local market and weather information to plan with greater confidence.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="rounded-full bg-forest px-6 py-3.5 text-sm font-bold text-white shadow-soft hover:bg-leaf">Join AgricNorthX <ArrowRight className="ml-2 inline" size={16}/></Link><Link href="/marketplace" className="rounded-full border border-emerald-900/15 bg-white px-6 py-3.5 text-sm font-bold text-forest hover:border-leaf">Explore produce</Link></div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-leaf"><Link href="/weather" className="underline underline-offset-4">Farm weather planner</Link><Link href="/market-insights" className="underline underline-offset-4">Market insights</Link><Link href="/knowledge" className="underline underline-offset-4">Community knowledge</Link></div>
        <p className="mt-5 text-xs text-slate-500">Built for farmers, buyers, agents and cooperatives. No guaranteed prices or buyers.</p>
      </div>
      <div className="relative"><div className="absolute -inset-5 rounded-[2.5rem] bg-emerald-100/60 blur-2xl"/><div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-5 shadow-soft sm:p-7">
        <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-forest">The local harvest exchange</p><p className="mt-1 text-xs text-slate-500">A simple path from farm to buyer</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-leaf">Pilot preview</span></div>
        <div className="mt-7 space-y-3">{highlights.map(({icon:Icon,title,text},i)=><div key={title} className="flex gap-4 rounded-2xl bg-cream p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-leaf"><Icon size={21}/></span><div><p className="font-bold text-forest">{i+1}. {title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div></div>)}</div>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><ShieldCheck size={17} className="shrink-0"/> Farmer-provided listing information. Buyers should confirm details before purchase.</div>
      </div></div>
    </section>
    <section className="border-y border-emerald-900/10 bg-white py-10"><div className="mx-auto grid max-w-7xl gap-4 px-5 sm:grid-cols-3 sm:px-8">
      <Link href="/weather" className="rounded-2xl border border-emerald-900/10 p-5 hover:border-leaf"><CloudSun className="text-leaf"/><p className="mt-3 font-bold text-forest">Farm weather planner</p><p className="mt-2 text-sm text-slate-600">Seven-day rainfall, temperature and reference evapotranspiration outlook.</p></Link>
      <Link href="/market-insights" className="rounded-2xl border border-emerald-900/10 p-5 hover:border-leaf"><BarChart3 className="text-leaf"/><p className="mt-3 font-bold text-forest">Market insights</p><p className="mt-2 text-sm text-slate-600">See active listed supply and farmer asking-price ranges.</p></Link>
      <Link href="/knowledge" className="rounded-2xl border border-emerald-900/10 p-5 hover:border-leaf"><BookOpen className="text-leaf"/><p className="mt-3 font-bold text-forest">Community knowledge</p><p className="mt-2 text-sm text-slate-600">Explore consented, attributed local farming knowledge.</p></Link>
    </div></section>
    <footer className="border-t border-emerald-900/10 bg-white/70"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© {new Date().getFullYear()} AgricNorthX · Vhembe, Limpopo</span><span>English · Tshivenda · Xitsonga · Sepedi (language rollout)</span></div></footer>
  </main>;
}

import Link from "next/link";
import { ArrowRight, Sprout, ShoppingBasket, Truck, ShieldCheck, MapPin, CloudSun, BarChart3, BookOpen, Leaf, ArrowUpRight } from "lucide-react";
import { AppNav } from "@/components/app-nav";
const highlights = [
  { icon: Sprout, title: "List your harvest", text: "Farmers and community agents can publish available produce." },
  { icon: ShoppingBasket, title: "Find real demand", text: "Buyers can discover crops, quantities and farmer asking prices." },
  { icon: Truck, title: "Coordinate collection", text: "Agree quantities and collection details before produce loses value." },
];
const pillars = [
  { icon: CloudSun, title: "Plan with local insight", text: "Use weather and market information to make better-informed farm decisions.", href: "/weather", action: "Explore farm tools" },
  { icon: BarChart3, title: "Understand the market", text: "See active listed supply and farmer-provided asking-price ranges.", href: "/market-insights", action: "View market insights" },
  { icon: BookOpen, title: "Share local knowledge", text: "Discover consented, attributed farming knowledge from the community.", href: "/knowledge", action: "Explore knowledge" },
];
export default function HomePage() {
  return <main className="min-h-screen agri-page scene-fields">
    <AppNav />
    <section className="hero-future">
      <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
        <div className="reveal-up max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur"><MapPin size={14} className="text-lime" /> Starting in Vhembe District, Limpopo</div>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.25rem]">Agriculture, <span className="text-lime">connected</span> to better markets.</h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/80 sm:text-lg">AgricNorthX connects smallholder farmers with nearby buyers, helps cooperatives coordinate supply and brings useful farm information into one place.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold text-forest shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white">Explore the marketplace <ArrowRight size={17} /></Link>
            <Link href="/register" className="rounded-full border border-white/35 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/15">Join AgricNorthX</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold"><span className="hero-chip rounded-full px-3 py-2">Smallholder-first</span><span className="hero-chip rounded-full px-3 py-2">Local produce</span><span className="hero-chip rounded-full px-3 py-2">Smart farm tools</span></div>
          <p className="mt-5 text-xs text-white/55">Built for farmers, buyers, agents and cooperatives. Prices and availability are farmer-provided.</p>
        </div>
        <div className="reveal-up reveal-delay-2">
          <div className="hero-panel ml-auto max-w-md rounded-[2rem] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-lime">The harvest exchange</p><h2 className="mt-2 text-2xl font-bold text-white">From soil to sale.</h2><p className="mt-2 text-sm leading-6 text-white/65">A simpler way to discover, request and coordinate local produce.</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime/15 text-lime"><Leaf size={25} /></span></div>
            <div className="mt-6 space-y-3">{highlights.map(({ icon: Icon, title, text }, index) => <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-black/10 p-3.5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-lime"><Icon size={19} /></span><div><p className="text-sm font-bold text-white">{index + 1}. {title}</p><p className="mt-1 text-xs leading-5 text-white/65">{text}</p></div></div>)}</div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-lime/10 px-3.5 py-3 text-xs leading-5 text-lime-50"><ShieldCheck size={17} className="shrink-0 text-lime" /> Confirm quality, quantities and collection details directly with the seller.</div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a2b1d]/45 to-transparent" />
    </section>
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-leaf">One connected platform</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight text-forest">Tools for the whole farm journey</h2></div><Link href="/marketplace" className="inline-flex items-center gap-2 text-sm font-bold text-leaf hover:text-forest">Browse local produce <ArrowUpRight size={16} /></Link></div>
      <div className="mt-7 grid gap-4 md:grid-cols-3">{pillars.map(({ icon: Icon, title, text, href, action }) => <Link key={title} href={href} className="card-lift rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#EAF4E7] text-leaf"><Icon size={22} /></span><h3 className="mt-5 text-lg font-bold text-forest">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-leaf">{action} <ArrowRight size={15} /></span></Link>)}</div>
    </section>
    <section className="border-y border-emerald-950/10 bg-white/80"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-leaf">Built for local agriculture</p><h2 className="mt-2 text-2xl font-extrabold text-forest">A clearer path from harvest to buyer.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Discover produce, communicate with sellers and manage the next step in one place.</p></div><Link href="/marketplace" className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-bold text-white transition hover:bg-leaf">Find produce <ArrowRight size={16} /></Link></div></section>
    <footer className="bg-[#102F22] text-white/60"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© {new Date().getFullYear()} AgricNorthX · Vhembe, Limpopo</span><span>English · Tshivenda · Xitsonga · Sepedi and more language options</span></div></footer>
  </main>;
}

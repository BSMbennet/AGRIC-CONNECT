import Link from "next/link";
import { ArrowRight, Sprout, ShoppingBasket, Truck, ShieldCheck, MapPin } from "lucide-react";

const highlights = [
  { icon: Sprout, title: "List your harvest", text: "Farmers and community agents can publish available produce." },
  { icon: ShoppingBasket, title: "Find real demand", text: "Buyers can discover crops, quantities and asking prices." },
  { icon: Truck, title: "Coordinate collection", text: "Agree quantities and collection details before produce loses value." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="AgriConnect home">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest text-white"><Sprout size={23} /></span>
          <span><span className="block text-lg font-bold tracking-tight text-forest">AgriConnect</span><span className="block text-xs text-slate-500">Local harvest. Better markets.</span></span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/marketplace" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-forest hover:bg-white sm:inline-flex">Marketplace</Link>
          <Link href="/login" className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-leaf">Sign in <ArrowRight className="ml-2 inline" size={15} /></Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:pb-24 lg:pt-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-semibold text-forest"><MapPin size={14} /> Starting in Vhembe District, Limpopo</div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.06] tracking-tight text-forest sm:text-6xl">Your harvest deserves a <span className="text-leaf">better market.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">AgriConnect helps smallholder farmers bring fresh produce to nearby buyers, combine supply through cooperatives and organise collection with confidence.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-full bg-forest px-6 py-3.5 text-sm font-bold text-white shadow-soft hover:bg-leaf">Join AgriConnect <ArrowRight className="ml-2 inline" size={16} /></Link>
            <Link href="/marketplace" className="rounded-full border border-emerald-900/15 bg-white px-6 py-3.5 text-sm font-bold text-forest hover:border-leaf">Explore produce</Link>
          </div>
          <p className="mt-5 text-xs text-slate-500">Built for farmers, buyers, agents and cooperatives. No guaranteed prices or buyers.</p>
        </div>
        <div className="relative">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-emerald-100/60 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-5 shadow-soft sm:p-7">
            <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-forest">The local harvest exchange</p><p className="mt-1 text-xs text-slate-500">A simple path from farm to buyer</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-leaf">Pilot preview</span></div>
            <div className="mt-7 space-y-3">
              {highlights.map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="flex gap-4 rounded-2xl bg-cream p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-leaf"><Icon size={21} /></span>
                  <div><p className="font-bold text-forest">{index + 1}. {title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><ShieldCheck size={17} className="shrink-0" /> Farmer-provided listing information. Buyers should confirm details before purchase.</div>
          </div>
        </div>
      </section>

      <footer className="border-t border-emerald-900/10 bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© {new Date().getFullYear()} AgriConnect · Vhembe, Limpopo</span><span>English · Tshivenda · Xitsonga · Sepedi (language rollout)</span></div>
      </footer>
    </main>
  );
}

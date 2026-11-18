import Link from "next/link";
import { logout } from "@/actions/auth";

export function AppNav({active=""}:{active?:string}){
  const link=(key:string)=>key===active?"text-leaf":"text-forest hover:text-leaf";
  return <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
      <Link href="/" className="font-bold tracking-tight text-forest">AgricNorthX</Link>
      <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
        <Link href="/marketplace" className={link("marketplace")}>Marketplace</Link>
        <Link href="/cart" className={link("cart")}>Cart</Link>
        <Link href="/dashboard" className={link("dashboard")}>Orders</Link>
        <Link href="/profile" className={link("profile")}>Profile</Link>
        <form action={logout}><button className="text-slate-600 hover:text-forest">Sign out</button></form>
      </nav>
    </div>
  </header>;
}

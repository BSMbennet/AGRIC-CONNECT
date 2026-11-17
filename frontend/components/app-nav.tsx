import Link from "next/link";
import { logout } from "@/actions/auth";

export function AppNav({active=""}:{active?:string}){
  const link=(key:string)=>key===active?"text-leaf":"text-forest hover:text-leaf";
  return <header className="border-b border-emerald-900/10 bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
    <Link href="/" className="font-bold tracking-tight text-forest">AgricNorthX</Link>
    <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
      <Link href="/marketplace" className={link("marketplace")}>Marketplace</Link>
      <Link href="/market-insights" className={link("insights")}>Market insights</Link>
      <Link href="/weather" className={link("weather")}>Farm planner</Link>
      <Link href="/fields" className={link("fields")}>My fields</Link>
      <Link href="/pricing" className={link("pricing")}>Price guide</Link>
      <Link href="/knowledge" className={link("knowledge")}>Knowledge</Link>
      <Link href="/dashboard" className={link("dashboard")}>Dashboard</Link>
      <Link href="/profile" className={link("profile")}>Profile</Link>
      <form action={logout}><button className="text-slate-600 hover:text-forest">Sign out</button></form>
    </nav>
  </div></header>;
}

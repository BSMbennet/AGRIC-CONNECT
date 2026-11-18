"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown, Menu, X, MoreHorizontal, Store, ClipboardList, LayoutDashboard, Wallet,
  CloudSun, Sprout, BarChart3, BookOpen, Users, User, ShieldCheck, Layers3, Tag, Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavIcon =
  | "store" | "clipboard-list" | "layout-dashboard" | "wallet" | "cloud-sun"
  | "sprout" | "bar-chart" | "book-open" | "users" | "user" | "shield-check"
  | "layers" | "tag" | "bell";
export type NavItem = { href: string; label: string; icon?: NavIcon };

const iconComponents: Record<NavIcon, LucideIcon> = {
  store: Store,
  "clipboard-list": ClipboardList,
  "layout-dashboard": LayoutDashboard,
  wallet: Wallet,
  "cloud-sun": CloudSun,
  sprout: Sprout,
  "bar-chart": BarChart3,
  "book-open": BookOpen,
  users: Users,
  user: User,
  "shield-check": ShieldCheck,
  layers: Layers3,
  tag: Tag,
  bell: Bell,
};

function ItemIcon({ name, size, className, strokeWidth }: { name: NavIcon; size: number; className?: string; strokeWidth?: number }) {
  const Icon = iconComponents[name];
  return <Icon size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export function NavMenu({ items, secondaryItems = [], extra }: { items: NavItem[]; secondaryItems?: NavItem[]; extra: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  };
  const cls = (href: string) => isActive(href) ? "text-leaf" : "text-forest/80 hover:bg-emerald-50 hover:text-forest";

  return <>
    <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
      {items.map(item => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`rounded-full px-3.5 py-2.5 text-sm font-semibold transition ${cls(item.href)}`}>{item.label}</Link>)}
      {secondaryItems.length > 0 && <div className="relative">
        <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen(v => !v)} className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2.5 text-sm font-semibold transition ${moreOpen ? "bg-emerald-50 text-forest" : "text-forest/80 hover:bg-emerald-50"}`}>More <ChevronDown size={15} className={moreOpen ? "rotate-180 transition" : "transition"} /></button>
        {moreOpen && <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-emerald-950/10 bg-white p-2 shadow-xl">
          {secondaryItems.map(item => <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${cls(item.href)}`}>{item.icon && <ItemIcon name={item.icon} size={16} className="shrink-0 opacity-70" />}{item.label}</Link>)}
        </div>}
      </div>}
      <div className="ml-3 border-l border-slate-200 pl-3">{extra}</div>
    </nav>

    <button type="button" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(v => !v)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-forest transition hover:bg-emerald-50 lg:hidden">{open ? <X size={21} /> : <Menu size={21} />}</button>
    <AnimatePresence>
      {open && <motion.div initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduce ? undefined : { opacity: 0, height: 0 }} className="absolute left-0 right-0 top-full overflow-hidden border-b border-emerald-950/10 bg-white shadow-lg lg:hidden">
        <nav id="mobile-nav" aria-label="Mobile navigation" className="mx-auto max-w-7xl px-4 pb-4 pt-2">
          <div className="grid gap-1">{items.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${cls(item.href)}`}>{item.icon && <ItemIcon name={item.icon} size={17} />}{item.label}</Link>)}</div>
          {secondaryItems.length > 0 && <details className="mt-2 rounded-xl bg-[#F5F7F0] px-3 py-2">
            <summary className="cursor-pointer list-none py-2 text-sm font-bold text-forest">More tools and settings</summary>
            <div className="grid gap-1 pb-2">{secondaryItems.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm ${cls(item.href)}`}>{item.icon && <ItemIcon name={item.icon} size={16} />}{item.label}</Link>)}</div>
          </details>}
          <div className="mt-3 border-t border-slate-100 pt-3">{extra}</div>
        </nav>
      </motion.div>}
    </AnimatePresence>

    {items.length > 1 && <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-[70] border-t border-emerald-950/10 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_30px_rgba(16,61,43,.08)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${Math.min(items.length,4)},minmax(0,1fr))` }}>
        {items.slice(0,4).map(item => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-semibold ${isActive(item.href) ? "text-leaf" : "text-slate-500"}`}>{item.icon ? <ItemIcon name={item.icon} size={18} strokeWidth={isActive(item.href) ? 2.5 : 1.8} /> : <MoreHorizontal size={18} />}<span className="max-w-full truncate">{item.label}</span></Link>)}
      </div>
    </nav>}
  </>;
}

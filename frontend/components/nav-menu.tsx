"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, BookOpen, ChevronDown, LayoutDashboard, LogOut, Menu, Settings2, ShoppingCart, Sprout, Store, User, X } from "lucide-react";

const ICONS = { marketplace: Store, dashboard: LayoutDashboard, fields: Sprout, knowledge: BookOpen, subscription: BadgeCheck } as const;
export type NavItem = { href: string; label: string; icon?: keyof typeof ICONS; match?: string[] };
export type MoreItem = { href: string; label: string };
export type NavUser = { name: string; signOut: () => Promise<void> } | null;

const isActive = (pathname: string, item: { href: string; match?: string[] }) =>
  [item.href, ...(item.match ?? [])].some((p) => pathname === p || pathname.startsWith(p + "/"));

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

function Dropdown({ label, icon, children, align = "right" }: { label: string; icon: React.ReactNode; children: React.ReactNode; align?: "left" | "right" }) {
  const { open, setOpen, ref } = useDropdown();
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname, setOpen]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-forest hover:bg-emerald-50">
        {icon}<span>{label}</span><ChevronDown size={14} className={open ? "rotate-180 transition" : "transition"} aria-hidden />
      </button>
      {open && <div role="menu" className={`absolute top-full z-50 mt-2 min-w-56 rounded-xl border border-emerald-900/10 bg-white p-1.5 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>{children}</div>}
    </div>
  );
}

export function NavMenu({ items, more, user, showCart }: { items: NavItem[]; more: MoreItem[]; user: NavUser; showCart: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  useEffect(() => setOpen(false), [pathname]);
  const linkCls = (active: boolean) => `inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${active ? "bg-forest text-white" : "text-forest hover:bg-emerald-50"}`;
  const menuItem = "block rounded-lg px-3 py-2.5 text-sm font-semibold text-forest hover:bg-emerald-50";

  return (
    <>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
        {items.map((i) => { const Icon = i.icon ? ICONS[i.icon] : null; const a = isActive(pathname, i); return <Link key={i.href} href={i.href} aria-current={a ? "page" : undefined} className={linkCls(a)}>{Icon && <Icon size={16} aria-hidden />}{i.label}</Link>; })}
        {more.length > 0 && <Dropdown label="More" icon={<Settings2 size={16} aria-hidden />} align="left">{more.map((m) => <Link key={m.href} role="menuitem" href={m.href} aria-current={isActive(pathname, m) ? "page" : undefined} className={`${menuItem} ${isActive(pathname, m) ? "bg-emerald-50" : ""}`}>{m.label}</Link>)}</Dropdown>}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        {showCart && <Link href="/cart" aria-label="Buyer cart" aria-current={pathname.startsWith("/cart") ? "page" : undefined} className={`flex h-10 w-10 items-center justify-center rounded-lg ${pathname.startsWith("/cart") ? "bg-forest text-white" : "text-forest hover:bg-emerald-50"}`}><ShoppingCart size={18} /></Link>}
        {user ? (
          <div className="hidden md:block">
            <Dropdown label={user.name.split(" ")[0] || "Account"} icon={<User size={16} aria-hidden />}>
              <p className="px-3 py-2 text-xs text-slate-500">Signed in as <b className="text-slate-700">{user.name}</b></p>
              <form action={user.signOut}><button role="menuitem" className={`${menuItem} flex w-full items-center gap-2 text-left`}><LogOut size={15} aria-hidden />Sign out</button></form>
            </Dropdown>
          </div>
        ) : (
          <div className="hidden items-center gap-2 md:flex"><Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-forest hover:bg-emerald-50">Sign in</Link><Link href="/register" className="rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-leaf">Join</Link></div>
        )}
        <button type="button" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded-lg text-forest hover:bg-emerald-50 md:hidden">{open ? <X /> : <Menu />}</button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav id="mobile-nav" aria-label="Mobile navigation" initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduce ? undefined : { opacity: 0, height: 0 }} className="w-full basis-full overflow-hidden md:hidden">
            <ul className="grid gap-1 pb-3 pt-1">
              {items.map((i) => { const Icon = i.icon ? ICONS[i.icon] : null; const a = isActive(pathname, i); return <li key={i.href}><Link href={i.href} aria-current={a ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-base font-semibold ${a ? "bg-forest text-white" : "text-forest hover:bg-emerald-50"}`}>{Icon && <Icon size={18} aria-hidden />}{i.label}</Link></li>; })}
              {more.length > 0 && <li className="mt-2 px-4 text-xs font-bold uppercase tracking-wide text-slate-500">More</li>}
              {more.map((m) => <li key={m.href}><Link href={m.href} aria-current={isActive(pathname, m) ? "page" : undefined} className={`flex min-h-12 items-center rounded-xl px-4 text-base font-semibold ${isActive(pathname, m) ? "bg-emerald-50 text-forest" : "text-forest hover:bg-emerald-50"}`}>{m.label}</Link></li>)}
              <li className="mt-2 border-t border-slate-200 pt-2">
                {user ? <form action={user.signOut}><button className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-base font-semibold text-forest hover:bg-emerald-50"><LogOut size={18} aria-hidden />Sign out ({user.name.split(" ")[0]})</button></form>
                  : <div className="flex gap-2 px-2"><Link href="/login" className="flex-1 rounded-xl border border-forest py-3 text-center font-semibold text-forest">Sign in</Link><Link href="/register" className="flex-1 rounded-xl bg-forest py-3 text-center font-bold text-white">Join</Link></div>}
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}

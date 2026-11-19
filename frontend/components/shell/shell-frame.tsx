"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, LogOut, Menu, Search, Sprout, User, X } from "lucide-react";
import { ShellIconView } from "@/components/shell/icons";
import { isActivePath, type ShellGroup, type ShellItem } from "@/lib/shell-nav";

export type ShellUser = { name: string; roleLabel: string; initials: string };
export type ShellLabels = {
  home: string; mainNav: string; quickNav: string; searchLabel: string; searchPlaceholder: string; searchMarketplace: string;
  notifications: string; notificationsUnread: string; accountMenu: string; profileSettings: string; signOut: string;
  openMenu: string; closeMenu: string; menu: string; notice: string | null;
};
const DEFAULT_LABELS: ShellLabels = { home: "AgricNorthX home", mainNav: "Main navigation", quickNav: "Quick navigation", searchLabel: "Search produce", searchPlaceholder: "Search produce, e.g. tomatoes", searchMarketplace: "Search the marketplace", notifications: "Notifications", notificationsUnread: "Notifications", accountMenu: "Account menu", profileSettings: "Profile & settings", signOut: "Sign out", openMenu: "Open menu", closeMenu: "Close menu", menu: "Menu", notice: null };
const Labels = createContext<ShellLabels>(DEFAULT_LABELS);

type Props = {
  groups: ShellGroup[]; tabs: ShellItem[]; user: ShellUser; unread: number; labels?: ShellLabels;
  signOut: () => Promise<void>; languageSelector: React.ReactNode; children: React.ReactNode;
};

function Brand({ dark }: { dark?: boolean }) {
  const L = useContext(Labels);
  return (
    <Link href="/dashboard" aria-label={L.home} className={`flex items-center gap-2.5 text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-forest"}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${dark ? "bg-white/10 text-lime" : "bg-forest text-lime"}`}><Sprout size={19} aria-hidden /></span>AgricNorthX
    </Link>
  );
}

function NavGroups({ groups, onNavigate }: { groups: ShellGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const L = useContext(Labels);
  return (
    <nav aria-label={L.mainNav} className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-200/60">{g.title}</p>
          <ul className="mt-2 space-y-0.5">
            {g.items.map((i) => {
              const active = isActivePath(pathname, i.href);
              return (
                <li key={i.href}>
                  <Link href={i.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-white/12 text-white" : "text-emerald-50/80 hover:bg-white/8 hover:text-white"}`}>
                    {active && <span className="absolute left-0 top-2 h-7 w-1 rounded-r bg-lime" aria-hidden />}
                    <ShellIconView name={i.icon} className={active ? "text-lime" : "text-emerald-200/70 group-hover:text-lime"} />
                    <span className="truncate">{i.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AccountMenu({ user, signOut }: { user: ShellUser; signOut: () => Promise<void> }) {
  const L = useContext(Labels);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const item = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-forest hover:bg-emerald-50";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={L.accountMenu} onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-full border border-emerald-900/10 bg-white py-1 pl-1 pr-3 hover:bg-emerald-50">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-xs font-bold text-white">{user.initials}</span>
        <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-forest sm:block">{user.name}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-emerald-900/10 bg-white p-2 shadow-xl">
          <div className="px-3 py-2"><p className="truncate text-sm font-bold text-forest">{user.name}</p><p className="text-xs text-slate-500">{user.roleLabel}</p></div>
          <Link role="menuitem" href="/profile" className={item}><User size={16} aria-hidden />{L.profileSettings}</Link>
          <form action={signOut}><button role="menuitem" className={`${item} text-left`}><LogOut size={16} aria-hidden />{L.signOut}</button></form>
        </div>
      )}
    </div>
  );
}

const SHELL_FREE = new Set(["/", "/login", "/register", "/privacy"]);

export function ShellFrame({ groups, tabs, user, unread, labels, signOut, languageSelector, children }: Props) {
  const L = labels ?? DEFAULT_LABELS;
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [drawer]);

  // Marketing / auth pages keep their own full-width layout.
  if (SHELL_FREE.has(pathname)) return <>{children}</>;

  const userCard = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-xl bg-white/8 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-xs font-bold text-forest">{user.initials}</span>
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="truncate text-xs text-emerald-100/70">{user.roleLabel}</p></div>
      </div>
    </div>
  );

  return (
    <Labels.Provider value={L}>
    <div className="app-shell min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-forest lg:flex">
        <div className="flex h-16 items-center px-5"><Brand dark /></div>
        <NavGroups groups={groups} />
        {userCard}
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-emerald-900/10 bg-white/90 px-4 backdrop-blur-xl lg:px-8">
        <button type="button" onClick={() => setDrawer(true)} aria-label={L.openMenu} aria-expanded={drawer} className="grid h-11 w-11 place-items-center rounded-xl text-forest hover:bg-emerald-50 lg:hidden"><Menu size={22} /></button>
        <div className="lg:hidden"><Brand /></div>
        <form action="/marketplace" role="search" className="relative ml-auto hidden max-w-md flex-1 md:block lg:ml-0">
          <label htmlFor="shell-search" className="sr-only">{L.searchLabel}</label>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input id="shell-search" name="q" type="search" placeholder={L.searchPlaceholder} className="h-10 w-full rounded-full border border-emerald-900/10 bg-cream pl-10 pr-4 text-sm outline-none transition focus:border-leaf focus:bg-white focus:ring-2 focus:ring-leaf/20" />
        </form>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link href="/marketplace" aria-label={L.searchMarketplace} className="grid h-10 w-10 place-items-center rounded-full text-forest hover:bg-emerald-50 md:hidden"><Search size={19} /></Link>
          <div className="hidden sm:block">{languageSelector}</div>
          <Link href="/dashboard#notifications" aria-label={unread > 0 ? L.notificationsUnread : L.notifications} className="relative grid h-10 w-10 place-items-center rounded-full text-forest hover:bg-emerald-50">
            <Bell size={19} />
            {unread > 0 && <span className="absolute right-1 top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-harvest px-1 text-[10px] font-bold leading-4 text-forest">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <AccountMenu user={user} signOut={signOut} />
        </div>
      </header>

      <div className="pb-20 lg:pb-0">{L.notice && <p role="note" className="mx-4 mt-3 rounded-xl bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-900 lg:mx-8">{L.notice}</p>}{children}</div>

      <nav aria-label={L.quickNav} className="fixed inset-x-0 bottom-0 z-30 grid border-t border-emerald-900/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const active = isActivePath(pathname, t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-leaf" : "text-forest/70"}`}>
              <ShellIconView name={t.icon} size={20} />{t.label.split(" ")[0]}
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-forest/70"><Menu size={20} aria-hidden />{L.menu}</button>
      </nav>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={L.menu}>
            <motion.div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} />
            <motion.aside className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col bg-forest shadow-2xl" initial={reduce ? false : { x: "-100%" }} animate={{ x: 0 }} exit={reduce ? undefined : { x: "-100%" }} transition={{ duration: 0.22, ease: "easeOut" }}>
              <div className="flex h-16 items-center justify-between px-5"><Brand dark /><button type="button" onClick={() => setDrawer(false)} aria-label={L.closeMenu} className="grid h-10 w-10 place-items-center rounded-lg text-white hover:bg-white/10"><X size={20} /></button></div>
              <NavGroups groups={groups} onNavigate={() => setDrawer(false)} />
              <div className="px-5 pb-2 text-xs text-emerald-100/70 sm:hidden">{languageSelector}</div>
              {userCard}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
    </Labels.Provider>
  );
}

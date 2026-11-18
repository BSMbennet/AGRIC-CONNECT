"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";

export type NavItem = { href: string; label: string };

export function NavMenu({ items, extra }: { items: NavItem[]; extra: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const cls = (href: string) => (pathname === href || pathname.startsWith(href + "/") ? "text-leaf underline underline-offset-4" : "text-forest hover:text-leaf");
  return (
    <>
      <nav aria-label="Main navigation" className="hidden flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold lg:flex">
        {items.map((i) => <Link key={i.href} href={i.href} className={cls(i.href)}>{i.label}</Link>)}
        {extra}
      </nav>
      <button type="button" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-forest lg:hidden">
        {open ? <X /> : <Menu />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.nav id="mobile-nav" aria-label="Mobile navigation" initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduce ? undefined : { opacity: 0, height: 0 }} className="w-full overflow-hidden lg:hidden">
            <ul className="grid gap-1 py-2 text-base font-semibold">
              {items.map((i) => <li key={i.href}><Link href={i.href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-3 ${cls(i.href)}`}>{i.label}</Link></li>)}
              <li className="px-3 py-2">{extra}</li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}

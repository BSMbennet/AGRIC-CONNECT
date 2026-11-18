import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { NavMenu, type NavItem } from "@/components/nav-menu";
import { LanguageSelector } from "@/components/language-selector";
import { Bell, Sprout } from "lucide-react";

type Role = "farmer" | "buyer" | "agent" | "cooperative_manager" | "admin";
type NavModel = { primary: NavItem[]; secondary: NavItem[] };

function navigationFor(role: Role | null, t: (key: string) => string): NavModel {
  const primary: NavItem[] = [{ href: "/marketplace", label: t("marketplace"), icon: "store" }];
  const secondary: NavItem[] = role ? [{ href: "/dashboard#notifications", label: "Notifications", icon: "bell" }, { href: "/knowledge", label: "Community knowledge", icon: "book-open" }] : [{ href: "/knowledge", label: "Community knowledge", icon: "book-open" }];
  if (!role) {
    secondary.push({ href: "/weather", label: "Farm weather", icon: "cloud-sun" });
    return { primary, secondary };
  }
  if (role === "farmer") primary.push({ href: "/dashboard#orders", label: "Orders", icon: "clipboard-list" });
  else if (role === "buyer") primary.push({ href: "/dashboard#orders", label: "Orders", icon: "clipboard-list" });
  primary.push({ href: "/dashboard", label: t("dashboard"), icon: "layout-dashboard" });
  if (role === "farmer") primary.push({ href: "/wallet", label: "Wallet", icon: "wallet" });
  if (role === "farmer") secondary.push(
    { href: "/fields", label: "My fields", icon: "sprout" }, { href: "/weather", label: "Weather planner", icon: "cloud-sun" },
    { href: "/farm-products", label: "Farm products", icon: "sprout" }, { href: "/subscriptions", label: "Subscription plan", icon: "tag" },
    { href: "/market-insights", label: "Market insights", icon: "bar-chart" }, { href: "/pricing", label: "Pricing guide", icon: "tag" },
    { href: "/bookkeeping", label: "Bookkeeping", icon: "layers" }, { href: "/profile", label: t("profile"), icon: "user" },
  );
  else if (role === "buyer") secondary.push(
    { href: "/cart", label: t("cart"), icon: "clipboard-list" }, { href: "/coop/aggregate", label: "Combine supply", icon: "layers" },
    { href: "/profile", label: t("profile"), icon: "user" },
  );
  else if (role === "agent") secondary.push(
    { href: "/agent/register-farmer", label: "Register farmer", icon: "users" }, { href: "/market-insights", label: "Market insights", icon: "bar-chart" },
    { href: "/profile", label: t("profile"), icon: "user" },
  );
  else if (role === "cooperative_manager") secondary.push(
    { href: "/coop/aggregate", label: "Aggregate supply", icon: "layers" }, { href: "/bookkeeping", label: "Bookkeeping", icon: "tag" },
    { href: "/market-insights", label: "Market insights", icon: "bar-chart" }, { href: "/pricing", label: "Pricing guide", icon: "tag" },
    { href: "/profile", label: t("profile"), icon: "user" },
  );
  else secondary.push(
    { href: "/admin", label: "Admin console", icon: "shield-check" }, { href: "/market-insights", label: "Market insights", icon: "bar-chart" },
    { href: "/pricing", label: "Pricing guide", icon: "tag" }, { href: "/profile", label: t("profile"), icon: "user" },
  );
  return { primary, secondary };
}

export async function AppNav(_props: { active?: string } = {}) {
  const [t, supabase, locale] = await Promise.all([getTranslations("app"), createClient(), getLocale()]);
  const { data: { user } } = await supabase.auth.getUser();
  let role: Role | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = (data?.role as Role | undefined) ?? null;
  }
  const extra = <div className="flex flex-wrap items-center gap-3">
    {user && <Link href="/dashboard#notifications" aria-label="Notifications" title="Notifications" className="grid h-9 w-9 place-items-center rounded-full text-forest transition hover:bg-emerald-50"><Bell size={17} /></Link>}
    <LanguageSelector value={locale} label={t("language")} />
    {user ? <form action={logout}><button className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-emerald-50 hover:text-forest">{t("signOut")}</button></form> : <span className="flex items-center gap-3">
      <Link href="/login" className="text-sm font-semibold text-forest hover:text-leaf">{t("signIn")}</Link>
      <Link href="/register" className="rounded-full bg-forest px-4 py-2.5 text-xs font-bold text-white transition hover:bg-leaf">{t("join")}</Link>
    </span>}
  </div>;
  const nav = navigationFor(role, t);
  return <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-white/90 backdrop-blur-xl">
    <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <Link href="/" aria-label="AgricNorthX home" className="flex shrink-0 items-center gap-2.5 text-lg font-extrabold tracking-tight text-forest">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest text-lime shadow-sm"><Sprout size={19} /></span><span>{t("name")}</span>
      </Link>
      <NavMenu items={nav.primary} secondaryItems={nav.secondary} extra={extra} />
    </div>
  </header>;
}

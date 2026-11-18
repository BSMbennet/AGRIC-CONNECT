import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { NavMenu, type NavItem } from "@/components/nav-menu";

type Role = "farmer" | "buyer" | "agent" | "cooperative_manager" | "admin";

function itemsFor(role: Role | null, t: (key: string) => string): NavItem[] {
  const items: NavItem[] = [{ href: "/marketplace", label: t("marketplace") }];
  if (!role) return [...items, { href: "/knowledge", label: "Knowledge" }];

  items.push({ href: "/dashboard", label: t("dashboard") });
  if (role === "buyer") items.push({ href: "/cart", label: t("cart") });
  if (role === "farmer") items.push(
    { href: "/fields", label: "Fields" },
    { href: "/weather", label: "Weather" },
    { href: "/farm-products", label: "Farm products" },
    { href: "/subscriptions", label: "Subscription" },
    { href: "/wallet", label: "Wallet" },
  );
  if (role === "farmer" || role === "cooperative_manager" || role === "admin") {
    items.push({ href: "/market-insights", label: "Insights" }, { href: "/pricing", label: "Pricing guide" });
  }
  if (role === "farmer" || role === "cooperative_manager") items.push({ href: "/bookkeeping", label: "Bookkeeping" });
  if (role === "agent") items.push({ href: "/agent/register-farmer", label: "Register farmer" });
  if (role === "cooperative_manager") items.push({ href: "/coop/aggregate", label: "Aggregate" });
  if (role === "admin") items.push({ href: "/admin", label: "Admin" });
  items.push({ href: "/knowledge", label: "Knowledge" }, { href: "/profile", label: t("profile") });
  return items;
}

export async function AppNav(_props: { active?: string } = {}) {
  const [t, supabase] = await Promise.all([getTranslations("app"), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  let role: Role | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = (data?.role as Role | undefined) ?? null;
  }

  const extra = user
    ? <form action={logout}><button className="text-slate-600 hover:text-forest">{t("signOut")}</button></form>
    : <span className="flex items-center gap-3"><Link href="/login" className="text-forest hover:text-leaf">{t("signIn")}</Link><Link href="/register" className="rounded-lg bg-forest px-3 py-2 text-white hover:bg-leaf">{t("join")}</Link></span>;

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
        <Link href="/" className="font-bold tracking-tight text-forest">{t("name")}</Link>
        <NavMenu items={itemsFor(role, t)} extra={extra} />
      </div>
    </header>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";

export async function AppNav({ active = "" }: { active?: string }) {
  const [t, supabase] = await Promise.all([getTranslations("app"), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const link = (key: string) =>
    key === active ? "text-leaf" : "text-forest hover:text-leaf";

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link href="/" className="font-bold tracking-tight text-forest">
          {t("name")}
        </Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm font-semibold">
          <Link href="/marketplace" className={link("marketplace")}>{t("marketplace")}</Link>
          {user ? (
            <>
              <Link href="/cart" className={link("cart")}>{t("cart")}</Link>
              <Link href="/dashboard" className={link("dashboard")}>{t("dashboard")}</Link>
              <Link href="/dashboard#assistant" className="text-forest hover:text-leaf">Assistant</Link>
              {profile?.role === "farmer" && (
                <Link href="/bookkeeping" className={link("bookkeeping")}>Bookkeeping</Link>
              )}
              <Link href="/profile" className={link("profile")}>{t("profile")}</Link>
              <form action={logout}>
                <button className="text-slate-600 hover:text-forest">{t("signOut")}</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-forest hover:text-leaf">{t("signIn")}</Link>
              <Link href="/register" className="rounded-lg bg-forest px-3 py-2 text-white hover:bg-leaf">{t("join")}</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
      <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
        <Link href="/marketplace" className={link("marketplace")}>{t("marketplace")}</Link>
        {user&&<><Link href="/cart" className={link("cart")}>{t("cart")}</Link><Link href="/dashboard" className={link("dashboard")}>{t("dashboard")}</Link><Link href="/assistant" className={link("assistant")}>Assistant</Link>{profile?.role==="farmer"&&<Link href="/bookkeeping" className={link("bookkeeping")}>Bookkeeping</Link>}<Link href="/profile" className={link("profile")}>{t("profile")}</Link><form action={logout}><button className="text-slate-600 hover:text-forest">{t("signOut")}</button></form></>}
        {!user&&<><Link href="/login" className="text-forest hover:text-leaf">Sign in</Link><Link href="/register" className="rounded-lg bg-forest px-3 py-2 text-white hover:bg-leaf">Join</Link></>}
      </nav>
    </div>
  </header>;
}

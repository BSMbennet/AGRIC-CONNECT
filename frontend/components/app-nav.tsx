import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { NavMenu } from "@/components/nav-menu";
import { buildNav, type NavRole } from "@/lib/nav";

/** One navigation for the whole app. Main bar: Marketplace, Dashboard, Fields, Knowledge, Subscription (role permitting). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function AppNav(_props: { active?: string } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: NavRole | null = null, name = "";
  if (user) {
    const { data, error } = await supabase.from("profiles").select("role,display_name").eq("id", user.id).maybeSingle();
    if (error) console.error("[nav] profile load failed", error.code);
    role = (data?.role as NavRole | undefined) ?? null;
    name = data?.display_name ?? "";
  }
  const { main, more, showCart } = buildNav(user ? role : null);
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-8">
        <Link href="/" className="mr-2 text-lg font-bold tracking-tight text-forest">AgricNorthX</Link>
        <NavMenu items={main} more={more} showCart={showCart} user={user ? { name: name || "Account", signOut: logout } : null} />
      </div>
    </header>
  );
}

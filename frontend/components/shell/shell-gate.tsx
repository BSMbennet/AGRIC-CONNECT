import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { LanguageSelector } from "@/components/language-selector";
import { ShellFrame } from "@/components/shell/shell-frame";
import { initialsOf, isShellRole, ROLE_LABELS, shellNav } from "@/lib/shell-nav";

/**
 * Wraps every page. Signed-in users with a known role get the app shell (sidebar, top bar, mobile nav);
 * visitors and any failure fall back to the page alone, which keeps its own public header.
 * Only plain serialisable data is passed to the client component.
 */
export async function ShellGate({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <>{children}</>;
    const { data: profile, error } = await supabase.from("profiles").select("role,display_name").eq("id", user.id).maybeSingle();
    if (error) console.error("[shell] profile load failed", error.code);
    if (!profile || !isShellRole(profile.role)) return <>{children}</>;

    const { count, error: nErr } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null);
    if (nErr) console.error("[shell] unread count failed", nErr.code);

    const [locale, t] = await Promise.all([getLocale(), getTranslations("app")]);
    const name = (profile.display_name as string | null)?.trim() || "Your account";
    const nav = shellNav(profile.role);
    return (
      <ShellFrame groups={nav.groups} tabs={nav.tabs} unread={count ?? 0} signOut={logout}
        user={{ name, roleLabel: ROLE_LABELS[profile.role], initials: initialsOf(name) }}
        languageSelector={<LanguageSelector value={locale} label={t("language")} />}>
        {children}
      </ShellFrame>
    );
  } catch (e) {
    console.error("[shell] failed, rendering page without shell", e instanceof Error ? e.message : "unknown");
    return <>{children}</>;
  }
}

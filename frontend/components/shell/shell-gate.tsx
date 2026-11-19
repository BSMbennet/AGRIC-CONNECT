import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { LanguageSelector } from "@/components/language-selector";
import { ShellFrame } from "@/components/shell/shell-frame";
import { initialsOf, isShellRole, shellNav, translateNav } from "@/lib/shell-nav";

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

    const [locale, t, tn, ts, tr] = await Promise.all([getLocale(), getTranslations("app"), getTranslations("nav"), getTranslations("shell"), getTranslations("roles")]);
    const name = (profile.display_name as string | null)?.trim() || "Your account";
    const nav = translateNav(shellNav(profile.role), (k) => tn(k));
    return (
      <ShellFrame groups={nav.groups} tabs={nav.tabs} unread={count ?? 0} signOut={logout} labels={{ home: ts("home"), mainNav: ts("mainNav"), quickNav: ts("quickNav"), searchLabel: ts("searchLabel"), searchPlaceholder: ts("searchPlaceholder"), searchMarketplace: ts("searchMarketplace"), notifications: ts("notifications"), notificationsUnread: ts("notificationsUnread", { count: count ?? 0 }), accountMenu: ts("accountMenu"), profileSettings: ts("profileSettings"), signOut: ts("signOut"), openMenu: ts("openMenu"), closeMenu: ts("closeMenu"), menu: ts("menu"), notice: locale === "en" ? null : t("translationNotice") }}
        user={{ name, roleLabel: tr(profile.role), initials: initialsOf(name) }}
        languageSelector={<LanguageSelector value={locale} label={t("language")} />}>
        {children}
      </ShellFrame>
    );
  } catch (e) {
    console.error("[shell] failed, rendering page without shell", e instanceof Error ? e.message : "unknown");
    return <>{children}</>;
  }
}

import type { MoreItem, NavItem } from "@/components/nav-menu";

export type NavRole = "farmer" | "buyer" | "agent" | "cooperative_manager" | "admin";

/**
 * Pure navigation model (unit-tested). Fields and Subscription are farmer-only pages
 * (they redirect other roles to the dashboard), so they are shown to farmers only.
 */
export function buildNav(role: NavRole | null): { main: NavItem[]; more: MoreItem[]; showCart: boolean } {
  const main: NavItem[] = [{ href: "/marketplace", label: "Marketplace", icon: "marketplace" }];
  if (role) main.push({ href: "/dashboard", label: "Dashboard", icon: "dashboard", match: ["/orders", "/listings"] });
  if (role === "farmer") main.push({ href: "/fields", label: "Fields", icon: "fields" });
  main.push({ href: "/knowledge", label: "Knowledge", icon: "knowledge" });
  if (role === "farmer") main.push({ href: "/subscriptions", label: "Subscription", icon: "subscription" });

  const more: MoreItem[] = [];
  if (role === "farmer" || role === "cooperative_manager" || role === "admin") more.push({ href: "/market-insights", label: "Insights" }, { href: "/pricing", label: "Pricing guide" });
  if (role === "farmer" || role === "cooperative_manager") more.push({ href: "/bookkeeping", label: "Bookkeeping" });
  if (role === "agent") more.push({ href: "/agent/register-farmer", label: "Register a farmer" });
  if (role === "cooperative_manager") more.push({ href: "/coop/aggregate", label: "Cooperative aggregation" });
  if (role === "admin") more.push({ href: "/admin", label: "Admin" });
  if (role) more.push({ href: "/profile", label: "Profile" });
  return { main, more, showCart: role === "buyer" };
}

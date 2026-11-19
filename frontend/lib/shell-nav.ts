/**
 * Navigation model for the signed-in app shell. Pure data (strings only), so it can safely cross the
 * Server -> Client Component boundary. Icons are referenced by key, never as component functions.
 * Every link here is a route that exists and that the role is allowed to open.
 */
export type ShellRole = "farmer" | "buyer" | "agent" | "cooperative_manager" | "admin";
export type ShellIcon =
  | "layout-dashboard" | "store" | "wallet" | "sprout" | "cloud-sun" | "package" | "calculator" | "bar-chart"
  | "tag" | "crown" | "book-open" | "bot" | "user" | "shopping-cart" | "layers" | "users" | "shield-check";
export type ShellItem = { href: string; label: string; icon: ShellIcon };
export type ShellGroup = { title: string; items: ShellItem[] };
export type ShellNav = { groups: ShellGroup[]; tabs: ShellItem[] };

const dashboard: ShellItem = { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" };
const market: ShellItem = { href: "/marketplace", label: "Marketplace", icon: "store" };
const insights: ShellItem = { href: "/market-insights", label: "Market insights", icon: "bar-chart" };
const pricing: ShellItem = { href: "/pricing", label: "Pricing guide", icon: "tag" };
const community: ShellGroup = { title: "Learn & community", items: [
  { href: "/knowledge", label: "Community knowledge", icon: "book-open" },
  { href: "/assistant", label: "AI farming assistant", icon: "bot" },
] };

export function shellNav(role: ShellRole): ShellNav {
  const overview = (extra: ShellItem[] = []): ShellGroup => ({ title: "Overview", items: [dashboard, market, ...extra] });
  switch (role) {
    case "farmer": return {
      groups: [
        overview(),
        { title: "My farm", items: [
          { href: "/fields", label: "My fields", icon: "sprout" },
          { href: "/weather", label: "Weather planner", icon: "cloud-sun" },
          { href: "/farm-products", label: "My products", icon: "package" },
        ] },
        { title: "Money & insights", items: [
          { href: "/wallet", label: "Wallet", icon: "wallet" },
          { href: "/bookkeeping", label: "Bookkeeping", icon: "calculator" },
          insights, pricing,
          { href: "/subscriptions", label: "Subscription plan", icon: "crown" },
        ] },
        community,
      ],
      tabs: [dashboard, market, { href: "/wallet", label: "Wallet", icon: "wallet" }],
    };
    case "buyer": {
      const cart: ShellItem = { href: "/cart", label: "My cart", icon: "shopping-cart" };
      return {
        groups: [overview([cart]), { title: "Sourcing", items: [{ href: "/coop/aggregate", label: "Combine supply", icon: "layers" }] }, community],
        tabs: [dashboard, market, cart],
      };
    }
    case "agent": {
      const reg: ShellItem = { href: "/agent/register-farmer", label: "Register farmer", icon: "users" };
      return { groups: [overview(), { title: "Field work", items: [reg, insights] }, community], tabs: [dashboard, market, reg] };
    }
    case "cooperative_manager": {
      const agg: ShellItem = { href: "/coop/aggregate", label: "Aggregate supply", icon: "layers" };
      return {
        groups: [overview(), { title: "Cooperative", items: [agg, { href: "/bookkeeping", label: "Bookkeeping", icon: "calculator" }, insights, pricing] }, community],
        tabs: [dashboard, market, agg],
      };
    }
    case "admin": {
      const admin: ShellItem = { href: "/admin", label: "Admin console", icon: "shield-check" };
      return { groups: [overview(), { title: "Administration", items: [admin, insights, pricing] }, community], tabs: [dashboard, market, admin] };
    }
  }
}

export const ROLE_LABELS: Record<ShellRole, string> = { farmer: "Farmer", buyer: "Buyer", agent: "Field agent", cooperative_manager: "Cooperative manager", admin: "Administrator" };
export const isShellRole = (r: unknown): r is ShellRole => typeof r === "string" && r in ROLE_LABELS;

export const initialsOf = (name: string) => (name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "U");

/** Active when the path equals the link or is nested under it. */
export const isActivePath = (pathname: string, href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

/** Message keys (under "nav.") for each English label and group title, so the shell can be translated server-side. */
export const NAV_KEYS: Record<string, string> = {
  "Overview": "overview", "My farm": "myFarm", "Money & insights": "moneyInsights", "Learn & community": "learnCommunity", "Sourcing": "sourcing",
  "Field work": "fieldWork", "Cooperative": "cooperative", "Administration": "administration",
  "Dashboard": "dashboard", "Marketplace": "marketplace", "My fields": "myFields", "Weather planner": "weather", "My products": "myProducts",
  "Wallet": "wallet", "Bookkeeping": "bookkeeping", "Market insights": "marketInsights", "Pricing guide": "pricing", "Subscription plan": "subscription",
  "Community knowledge": "knowledge", "AI farming assistant": "assistant", "My cart": "cart", "Combine supply": "combineSupply",
  "Register farmer": "registerFarmer", "Aggregate supply": "aggregateSupply", "Admin console": "adminConsole",
};

/** Returns a copy of the nav with labels and titles passed through `tr(key)`; unknown labels stay as they are. */
export function translateNav(nav: ShellNav, tr: (key: string) => string): ShellNav {
  const word = (en: string) => (NAV_KEYS[en] ? tr(NAV_KEYS[en]) : en);
  const item = (i: ShellItem): ShellItem => ({ ...i, label: word(i.label) });
  return { groups: nav.groups.map((g) => ({ title: word(g.title), items: g.items.map(item) })), tabs: nav.tabs.map(item) };
}

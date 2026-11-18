/** Routes that really exist in the app. The assistant may only link to these. */
export type Role = "farmer" | "buyer" | "agent" | "cooperative_manager" | "admin";
export type NavTarget = { href: string; label: string; about: string; roles: Role[] | "all" };

export const NAV_TARGETS: NavTarget[] = [
  { href: "/marketplace", label: "Marketplace", about: "browse produce listings, search and request to buy", roles: "all" },
  { href: "/cart", label: "Buyer cart", about: "products a buyer has added; send buyer requests", roles: ["buyer"] },
  { href: "/dashboard", label: "Dashboard", about: "your orders, buyer requests, listings and notifications", roles: ["farmer", "buyer", "agent", "cooperative_manager", "admin"] },
  { href: "/listings/new", label: "Add a product", about: "create a new produce listing to sell", roles: ["farmer"] },
  { href: "/bookkeeping", label: "Bookkeeping", about: "record sales and expenses, see profit, download CSV", roles: ["farmer", "cooperative_manager"] },
  { href: "/bookkeeping/new", label: "Add bookkeeping entry", about: "record a sale or expense", roles: ["farmer", "cooperative_manager"] },
  { href: "/bookkeeping/insights", label: "Profit insights (Pro)", about: "premium profit charts", roles: ["farmer"] },
  { href: "/market-insights", label: "Market insights", about: "market information pages", roles: ["farmer", "cooperative_manager", "admin"] },
  { href: "/pricing", label: "Pricing guide", about: "pricing guidance", roles: ["farmer", "cooperative_manager", "admin"] },
  { href: "/weather", label: "Weather", about: "weather planner for farmers", roles: ["farmer"] },
  { href: "/fields", label: "Fields", about: "describe your fields and farm", roles: ["farmer"] },
  { href: "/farm-products", label: "Farm products", about: "agricultural product information", roles: ["farmer"] },
  { href: "/knowledge", label: "Indigenous knowledge", about: "read and share traditional farming knowledge", roles: "all" },
  { href: "/subscriptions", label: "Subscription", about: "farmer plans and billing", roles: ["farmer"] },
  { href: "/profile", label: "Profile", about: "your details, language and consents", roles: ["farmer", "buyer", "agent", "cooperative_manager", "admin"] },
  { href: "/agent/register-farmer", label: "Register a farmer", about: "agent-assisted farmer registration", roles: ["agent"] },
  { href: "/coop/aggregate", label: "Cooperative aggregation", about: "combine member produce", roles: ["cooperative_manager"] },
  { href: "/admin", label: "Admin", about: "administration", roles: ["admin"] },
];

export const targetsFor = (role: Role) => NAV_TARGETS.filter((t) => t.roles === "all" || t.roles.includes(role));
export const allowedHrefs = (role: Role) => new Set(targetsFor(role).map((t) => t.href));

/** Keep only app-internal links the user may actually open; everything else becomes plain text. */
export function sanitiseLinks(text: string, role: Role): string {
  const ok = allowedHrefs(role);
  return text.replace(/\[([^\]\n]{1,80})\]\(([^)\s]{1,200})\)/g, (_m, label: string, href: string) => (ok.has(href.split("?")[0]) ? `[${label}](${href})` : label));
}

/** Simple keyword navigation used when the AI provider is unavailable. */
export function fallbackAnswer(question: string, role: Role): { text: string; unavailableNote: string } {
  const q = question.toLowerCase();
  const rules: [RegExp, string][] = [
    [/add.*(product|listing)|sell|new listing/, "/listings/new"],
    [/order|request/, "/dashboard"],
    [/expense|profit|income|book ?keep|record.*(sale|money)/, "/bookkeeping"],
    [/cart|checkout/, "/cart"],
    [/price|pricing/, "/pricing"],
    [/weather|rain/, "/weather"],
    [/knowledge|indigenous|tradition/, "/knowledge"],
    [/subscri|plan|pro\b|premium/, "/subscriptions"],
    [/language|profile|consent|account/, "/profile"],
    [/market|buy|browse|listing/, "/marketplace"],
  ];
  const ok = allowedHrefs(role);
  const matches = rules.filter(([re, href]) => re.test(q) && ok.has(href)).map(([, h]) => h);
  const unique = [...new Set(matches)].slice(0, 3);
  const links = unique.map((h) => targetsFor(role).find((t) => t.href === h)!).map((t) => `- [${t.label}](${t.href}): ${t.about}`);
  const unavailableNote = "The AI assistant is not available right now, so I can only point you to pages.";
  return {
    unavailableNote,
    text: links.length ? `${unavailableNote}\n\nThese pages may help:\n${links.join("\n")}` : `${unavailableNote}\n\nYou can open the main pages from the menu at the top. Please try your question again in a few minutes.`,
  };
}

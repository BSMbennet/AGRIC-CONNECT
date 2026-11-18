import { describe, expect, it } from "vitest";
import { buildNav } from "../../lib/nav";
import { canShowAddToCart } from "../../lib/cart-guard";

const labels = (r: Parameters<typeof buildNav>[0]) => buildNav(r).main.map((i) => i.label);
const REMOVED = ["Weather", "Farm products", "Farm Products", "Insights", "Pricing guide", "Pricing Guide", "Bookkeeping", "Profile"];

describe("main navigation", () => {
  it("shows exactly the five items to a farmer, in order", () => expect(labels("farmer")).toEqual(["Marketplace", "Dashboard", "Fields", "Knowledge", "Subscription"]));
  it("never shows removed items in the main bar for any role", () => {
    for (const r of ["farmer", "buyer", "agent", "cooperative_manager", "admin", null] as const) for (const x of REMOVED) expect(labels(r)).not.toContain(x);
  });
  it("uses the specified hrefs", () => expect(buildNav("farmer").main.map((i) => i.href)).toEqual(["/marketplace", "/dashboard", "/fields", "/knowledge", "/subscriptions"]));
  it("does not show farmer-only pages to buyers or visitors", () => {
    expect(labels("buyer")).toEqual(["Marketplace", "Dashboard", "Knowledge"]);
    expect(labels(null)).toEqual(["Marketplace", "Knowledge"]);
  });
  it("puts Insights, Pricing guide, Bookkeeping and Profile in More for farmers; no Weather or Farm products anywhere", () => {
    const more = buildNav("farmer").more.map((m) => m.label);
    expect(more).toEqual(["Insights", "Pricing guide", "Bookkeeping", "Profile"]);
    for (const r of ["farmer", "buyer", "agent", "cooperative_manager", "admin"] as const) { const all = [...labels(r), ...buildNav(r).more.map((m) => m.label)]; expect(all).not.toContain("Weather"); expect(all.join()).not.toMatch(/farm products/i); }
  });
  it("has no duplicate links", () => {
    for (const r of ["farmer", "buyer", "agent", "cooperative_manager", "admin"] as const) { const n = buildNav(r); const h = [...n.main, ...n.more].map((i) => i.href); expect(new Set(h).size).toBe(h.length); }
  });
  it("shows the cart shortcut to buyers only", () => { expect(buildNav("buyer").showCart).toBe(true); expect(buildNav("farmer").showCart).toBe(false); });
});

describe("add to cart ownership", () => {
  it("hides the button for the listing's owner", () => expect(canShowAddToCart({ viewerId: "u1", listingFarmerId: "u1", available: true })).toBe(false));
  it("shows it to a different signed-in user and to visitors", () => {
    expect(canShowAddToCart({ viewerId: "u2", listingFarmerId: "u1", available: true })).toBe(true);
    expect(canShowAddToCart({ viewerId: null, listingFarmerId: "u1", available: true })).toBe(true);
  });
  it("hides it when nothing is available", () => expect(canShowAddToCart({ viewerId: "u2", listingFarmerId: "u1", available: false })).toBe(false));
});

import { describe, expect, it } from "vitest";
import { initialsOf, isActivePath, ROLE_LABELS, shellNav, type ShellRole } from "../../lib/shell-nav";

const ROLES = Object.keys(ROLE_LABELS) as ShellRole[];
const hrefs = (r: ShellRole) => shellNav(r).groups.flatMap((g) => g.items.map((i) => i.href));

describe("shell navigation model", () => {
  it("is plain serialisable data (safe to pass to a client component)", () => {
    for (const r of ROLES) expect(JSON.parse(JSON.stringify(shellNav(r)))).toEqual(shellNav(r));
  });
  it("has no duplicate links and only absolute app paths", () => {
    for (const r of ROLES) { const h = hrefs(r); expect(new Set(h).size).toBe(h.length); for (const x of h) expect(x).toMatch(/^\/[a-z/-]+$/); }
  });
  it("every role gets dashboard and marketplace", () => { for (const r of ROLES) { expect(hrefs(r)).toContain("/dashboard"); expect(hrefs(r)).toContain("/marketplace"); } });
  it("shows farmer-only tools to farmers only", () => {
    for (const p of ["/wallet", "/fields", "/weather", "/farm-products", "/subscriptions"]) {
      expect(hrefs("farmer")).toContain(p);
      for (const r of ROLES.filter((x) => x !== "farmer")) expect(hrefs(r)).not.toContain(p);
    }
  });
  it("shows the cart to buyers only and the admin console to admins only", () => {
    for (const r of ROLES) { expect(hrefs(r).includes("/cart")).toBe(r === "buyer"); expect(hrefs(r).includes("/admin")).toBe(r === "admin"); }
  });
  it("shows bookkeeping to farmers and cooperative managers only", () => {
    for (const r of ROLES) expect(hrefs(r).includes("/bookkeeping")).toBe(r === "farmer" || r === "cooperative_manager");
  });
  it("shows agent registration to agents only", () => { for (const r of ROLES) expect(hrefs(r).includes("/agent/register-farmer")).toBe(r === "agent"); });
  it("mobile tabs are a subset of the full menu and at most 3", () => {
    for (const r of ROLES) { const t = shellNav(r).tabs; expect(t.length).toBeLessThanOrEqual(3); for (const i of t) expect(hrefs(r)).toContain(i.href); }
  });
});

describe("helpers", () => {
  it("matches nested paths but not look-alike prefixes", () => {
    expect(isActivePath("/bookkeeping/new", "/bookkeeping")).toBe(true);
    expect(isActivePath("/bookkeeping", "/bookkeeping")).toBe(true);
    expect(isActivePath("/bookkeepingx", "/bookkeeping")).toBe(false);
  });
  it("builds initials", () => { expect(initialsOf("Farmer Fiona Dube")).toBe("FF"); expect(initialsOf("  ")).toBe("U"); expect(initialsOf("thandi")).toBe("T"); });
});

import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ve from "../../messages/ve.json";

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => key === "_reviewed" ? [] : keys(child, prefix ? `${prefix}.${key}` : key));
}

describe("locale scaffolding", () => {
  it("keeps English and Tshivenda message keys aligned", () => {
    expect(keys(ve).sort()).toEqual(keys(en).sort());
  });

  it("does not mark the Tshivenda scaffold as reviewed", () => {
    expect(ve._reviewed).toBe(false);
  });
});

import { shellNav, NAV_KEYS } from "../../lib/shell-nav";

describe("shell navigation is translatable", () => {
  for (const role of ["farmer", "buyer", "agent", "cooperative_manager", "admin"] as const) {
    it(`every ${role} nav label has a nav.* key in en and ve`, () => {
      const nav = shellNav(role);
      const labels = [...nav.groups.flatMap((g) => [g.title, ...g.items.map((i) => i.label)]), ...nav.tabs.map((i) => i.label)];
      for (const l of labels) {
        const key = NAV_KEYS[l];
        expect(key, `no NAV_KEYS entry for "${l}"`).toBeTruthy();
        expect((en as any).nav[key], `en nav.${key}`).toBeTruthy();
        expect((ve as any).nav[key], `ve nav.${key}`).toBeTruthy();
      }
    });
  }
});

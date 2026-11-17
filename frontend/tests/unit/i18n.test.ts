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

import { describe, expect, it } from "vitest";
import { searchAgriculturalKnowledge } from "../../lib/assistant/agricultural-knowledge";

describe("searchAgriculturalKnowledge", () => {
  it("retrieves the Limpopo tomato production guide for tomato pest questions", () => {
    const results = searchAgriculturalKnowledge("tomato Tuta absoluta pest management", "Vhembe, Limpopo");
    expect(results[0]?.id).toBe("ldard-tomato-limpopo");
    expect(results[0]?.sourceUrl).toContain("ldard.gov.za");
  });

  it("prioritizes locally relevant African leafy vegetable guidance", () => {
    const results = searchAgriculturalKnowledge("mulching seedlings irrigation harvesting", "Vhembe District, Limpopo");
    expect(results[0]?.id).toBe("wrc-arc-african-leafy-vegetables-vhembe");
    expect(results[0]?.geographicRelevance).toContain("Vhembe");
  });

  it("marks the dated Limpopo maize window as historical seasonal context", () => {
    const results = searchAgriculturalKnowledge("Limpopo maize planting date window", "Vhembe");
    const seasonal = results.find((item) => item.id === "grainsa-limpopo-maize-season-2025");
    expect(seasonal?.publicationDate).toBe("2025-12-12");
    expect(seasonal?.summary).toContain("not a forecast");
  });

  it("retrieves Limpopo spinach production guidance", () => {
    const results = searchAgriculturalKnowledge("spinach soil drainage acidity planting", "Vhembe, Limpopo");
    expect(results[0]?.id).toBe("ldard-spinach-limpopo");
  });

  it("retrieves ARC poultry production guidance", () => {
    const results = searchAgriculturalKnowledge("poultry broiler housing chicks brooding", "Limpopo");
    expect(results.some((item) => item.id === "arc-poultry-beginners")).toBe(true);
  });

  it("retrieves local livestock record-keeping guidance", () => {
    const results = searchAgriculturalKnowledge("cattle livestock breeding records grazing", "Limpopo");
    expect(results.some((item) => item.id === "ldard-livestock-recordkeeping")).toBe(true);
  });

  it("returns no documents for unrelated questions", () => {
    expect(searchAgriculturalKnowledge("how do I reset my password")).toEqual([]);
  });
});

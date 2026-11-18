import { describe, expect, it } from "vitest";
import { detectAssistantLanguage } from "../../lib/assistant/language-detection";

describe("detectAssistantLanguage", () => {
  it.each([
    ["How much have I sold this month?","en"],
    ["Ndi khou toda u divha doda yanga","ve"],
    ["Xana ndzi nga kuma tioda ta mina?","ts"],
    ["Ke nyaka go tseba ka diotara tša ka","nso"],
    ["Ngifuna ukwazi ngama-oda ami","zu"],
    ["Ndifuna ukwazi ngee-odolo zam","xh"],
    ["Ek wil weet wat my bestelling is","af"],
    ["Ke batla go itse ka diotara tsa me","tn"],
    ["Ke batla ho tseba ka liodara tsa ka","st"],
    ["Ngicela ungitjele ngema-oda ami","ss"],
    ["Ngitjela ngama-oda wami","nr"]
  ])("detects %s as %s", (text, expected) => {
    expect(detectAssistantLanguage(text).language).toBe(expected);
  });

  it("does not guess when a short or ambiguous message has too little evidence", () => {
    expect(detectAssistantLanguage("tomatoes please").language).toBeNull();
    expect(detectAssistantLanguage("hello").ambiguous).toBe(true);
  });
});

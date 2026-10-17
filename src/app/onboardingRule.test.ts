import { describe, it, expect } from "vitest";
import { needsOnboarding } from "./onboardingRule";

describe("needsOnboarding", () => {
  it("montre l'assistant au premier lancement", () => {
    expect(needsOnboarding("", false)).toBe(true);
  });
  it("saute l'assistant pour un lien partagé avec l'allure", () => {
    expect(needsOnboarding("?name=L%C3%A9a&pace=5:30", false)).toBe(false);
    expect(needsOnboarding("?pace=5:30", false)).toBe(false);
  });
  it("ne le remontre pas une fois fait", () => {
    expect(needsOnboarding("", true)).toBe(false);
    expect(needsOnboarding("?source=pwa", true)).toBe(false);
  });
});

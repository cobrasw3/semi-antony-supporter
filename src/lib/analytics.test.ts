import { describe, it, expect } from "vitest";
import { stripUrl } from "./analytics";

describe("stripUrl", () => {
  it("retire le prénom, l'allure et l'ancre de l'URL envoyée", () => {
    expect(stripUrl("https://semi.example/?name=L%C3%A9a&pace=5:30#spot")).toBe("https://semi.example/");
    expect(stripUrl("https://semi.example/qr?x=1")).toBe("https://semi.example/qr");
  });
});

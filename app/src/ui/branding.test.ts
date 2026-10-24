import { describe, it, expect } from "vitest";
import { buildBrandingCss } from "./branding";
import { contrastRatio } from "./color";

const varOf = (css: string, name: string) => css.match(new RegExp(`--${name}: (#[0-9a-f]{6})`))?.[1];

describe("buildBrandingCss", () => {
  it("ne produit rien sans couleurs valides", () => {
    expect(buildBrandingCss(undefined)).toBe("");
    expect(buildBrandingCss({ sprint: "orange" })).toBe("");
  });

  it("applique les couleurs d'un autre organisateur en gardant des textes lisibles", () => {
    // Marque fictive : vert clair (texte foncé requis) et bleu.
    const css = buildBrandingCss({ ink: "#0b3d2e", sprint: "#2ecc71", signal: "#ffd400" });
    expect(css).toContain("--ink: #0b3d2e;");
    expect(contrastRatio(varOf(css, "on-sprint")!, "#2ecc71")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(varOf(css, "sprint-text")!, "#f6f4ef")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(varOf(css, "on-signal")!, "#ffd400")).toBeGreaterThanOrEqual(4.5);
    expect(css).toContain('[data-theme="dark"]');
  });

  it("choisit un texte blanc sur une couleur d'action foncée", () => {
    expect(varOf(buildBrandingCss({ sprint: "#7a1fa2" }), "on-sprint")).toBe("#ffffff");
  });
});

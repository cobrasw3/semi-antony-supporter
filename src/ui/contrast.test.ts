// Vérifie les contrastes WCAG AA de toutes les paires texte/fond utilisées
// par l'interface, en mode clair et sombre, directement depuis tokens.css.
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { bestTextOn, contrastRatio, ensureContrast } from "./color";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf-8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)].map((m) => [m[1], m[2]]));
}

const light = block(":root {");
const dark = { ...light, ...block(':root[data-theme="dark"]') };
light.text = light.ink;
light.strong = light.ink;
light.selected = light.ink;

// [texte, fond, minimum] : 4.5 = texte courant, 3 = grands textes / éléments graphiques.
const PAIRS: Array<[string, string, number]> = [
  ["text", "bg", 4.5],
  ["text", "surface", 4.5],
  ["text", "surface-2", 4.5],
  ["muted", "bg", 4.5],
  ["muted", "surface", 4.5],
  ["on-sprint", "sprint", 4.5],
  ["sprint-text", "bg", 4.5],
  ["sprint-text", "surface", 4.5],
  ["on-signal", "signal", 4.5],
  ["signal", "strong", 4.5],
  ["on-strong", "strong", 4.5],
  ["on-strong-muted", "strong", 4.5],
  ["ok", "ok-bg", 4.5],
  ["warn", "warn-bg", 4.5],
  ["ko", "ko-bg", 4.5],
  ["info", "info-bg", 4.5],
  ["on-selected", "selected", 4.5],
  ["ok", "surface", 4.5],
  ["warn", "surface", 4.5],
  ["ko", "surface", 4.5],
];

describe.each([
  ["clair", light],
  ["sombre", dark],
])("contrastes WCAG AA — mode %s", (_, theme) => {
  it.each(PAIRS)("%s sur %s ≥ %s:1", (fg, bg, min) => {
    expect(theme[fg], `token --${fg}`).toBeDefined();
    expect(theme[bg], `token --${bg}`).toBeDefined();
    expect(contrastRatio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe("outils couleur", () => {
  it("calcule les rapports de contraste de référence", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ff5a1f", "#ffffff")).toBeLessThan(4.5); // d'où le texte bleu nuit sur l'orange
  });

  it("choisit le texte le plus lisible", () => {
    expect(bestTextOn("#ff5a1f", ["#ffffff", "#14213d"])).toBe("#14213d");
    expect(bestTextOn("#14213d", ["#ffffff", "#14213d"])).toBe("#ffffff");
  });

  it("rend lisible une couleur de marque en texte", () => {
    const text = ensureContrast("#ff5a1f", "#f6f4ef");
    expect(contrastRatio(text, "#f6f4ef")).toBeGreaterThanOrEqual(4.5);
  });
});

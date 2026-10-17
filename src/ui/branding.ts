// Identité visuelle par événement : les couleurs de marque d'event.json
// (branding.colors) remplacent les tokens par défaut, et les couleurs de
// texte dérivées sont recalculées pour rester lisibles (WCAG AA).

import { bestTextOn, ensureContrast, parseHex } from "./color";

export interface BrandColors {
  ink?: string;
  sprint?: string;
  signal?: string;
}

const LIGHT_BG = "#f6f4ef";
const DARK_BG = "#0d1424";
const WHITE = "#ffffff";
const DEFAULT_INK = "#14213d";

/** Feuille de style qui applique la marque (clair + sombre). Vide si rien à changer. */
export function buildBrandingCss(colors: BrandColors | undefined): string {
  if (!colors) return "";
  const valid = (c?: string) => (c && parseHex(c) ? c : undefined);
  const ink = valid(colors.ink);
  const sprint = valid(colors.sprint);
  const signal = valid(colors.signal);
  if (!ink && !sprint && !signal) return "";

  const inkColor = ink ?? DEFAULT_INK;
  const light: string[] = [];
  const dark: string[] = [];
  if (ink) light.push(`--ink: ${ink};`);
  if (sprint) {
    light.push(
      `--sprint: ${sprint};`,
      `--on-sprint: ${bestTextOn(sprint, [inkColor, WHITE])};`,
      `--sprint-text: ${ensureContrast(sprint, LIGHT_BG)};`
    );
    dark.push(`--sprint-text: ${ensureContrast(sprint, DARK_BG)};`);
  }
  if (signal) light.push(`--signal: ${signal};`, `--on-signal: ${bestTextOn(signal, [inkColor, WHITE])};`);

  const darkCss = dark.length
    ? `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${dark.join(" ")} } }\n:root[data-theme="dark"] { ${dark.join(" ")} }`
    : "";
  return `:root { ${light.join(" ")} }\n${darkCss}`.trim();
}

/** Injecte (ou remplace) la feuille de marque et la couleur de la barre du navigateur. */
export function applyBranding(colors: BrandColors | undefined) {
  const css = buildBrandingCss(colors);
  let style = document.getElementById("branding") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "branding";
    document.head.appendChild(style);
  }
  style.textContent = css;
  const ink = colors?.ink && parseHex(colors.ink) ? colors.ink : null;
  if (ink) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ink);
}

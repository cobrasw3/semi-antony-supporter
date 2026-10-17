// Outils couleur purs : contraste WCAG et couleurs dérivées d'une marque.
// Sert à garantir l'accessibilité quand un organisateur change ses couleurs
// dans event.json (branding.colors).

export function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

export function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

/** Luminance relative WCAG 2.x. */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) throw new Error(`Couleur invalide : ${hex}`);
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** La couleur de texte la plus lisible sur `background` parmi `candidates`. */
export function bestTextOn(background: string, candidates: string[]): string {
  return candidates.reduce((best, c) => (contrastRatio(c, background) > contrastRatio(best, background) ? c : best));
}

/**
 * Assombrit (ou éclaircit) `color` jusqu'à atteindre `min` de contraste sur
 * `background` : donne une variante lisible en texte d'une couleur de marque.
 */
export function ensureContrast(color: string, background: string, min = 4.5): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const darken = luminance(background) > 0.5;
  let current = rgb;
  for (let i = 0; i < 40 && contrastRatio(toHex(current), background) < min; i++) {
    current = current.map((v) => (darken ? v * 0.92 : v + (255 - v) * 0.12)) as [number, number, number];
  }
  return toHex(current);
}

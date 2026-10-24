// Génère les icônes PNG de la PWA d'une course à partir de
// courses/<slug>/assets/icon.svg.
// sharp n'est volontairement pas une dépendance du projet (lourd, utile
// une seule fois par course) :
//   npm i --no-save sharp && node scripts/generate-icons.mjs [slug]
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const slug = process.argv.slice(2).find((a) => !a.startsWith("-")) ?? "antony";
const dir = `courses/${slug}/assets`;
const svg = readFileSync(`${dir}/icon.svg`);
mkdirSync(`${dir}/icons`, { recursive: true });
const targets = [
  { file: `${dir}/icons/icon-192.png`, size: 192 },
  { file: `${dir}/icons/icon-512.png`, size: 512 },
  // Fond plein et motif centré : la même image sert de version maskable.
  { file: `${dir}/icons/icon-maskable-512.png`, size: 512 },
  { file: `${dir}/icons/apple-touch-icon.png`, size: 180 },
  { file: `${dir}/favicon-32.png`, size: 32 },
];

for (const { file, size } of targets) {
  await sharp(svg, { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  console.log(`${file} (${size}px)`);
}

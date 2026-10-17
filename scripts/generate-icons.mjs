// Génère les icônes PNG de la PWA à partir de public/icon.svg.
// sharp n'est volontairement pas une dépendance du projet (lourd, utile
// une seule fois) :
//   npm i --no-save sharp && node scripts/generate-icons.mjs
import { readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("public/icon.svg");
const targets = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  // Fond plein et motif centré : la même image sert de version maskable.
  { file: "public/icons/icon-maskable-512.png", size: 512 },
  { file: "public/icons/apple-touch-icon.png", size: 180 },
  { file: "public/favicon-32.png", size: 32 },
];

for (const { file, size } of targets) {
  await sharp(svg, { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  console.log(`${file} (${size}px)`);
}

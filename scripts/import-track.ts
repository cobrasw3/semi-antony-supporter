// Utilitaire CLI : convertit un fichier GPX/KML en tableau de coordonnées
// et l'écrit dans src/config/course.imported.ts pour relecture — il ne
// touche PAS course.ts directement, pour permettre de vérifier le résultat
// (tracé affiché sur la carte, longueur cohérente) avant de l'intégrer.
//
// Usage :
//   node scripts/import-track.ts <fichier.gpx|.kml> [--loop-length=7] [--loops=3]
//
// --loop-length : longueur attendue d'une boucle en km (défaut : 7, le
//                 semi d'Antony). Sert à détecter si le fichier contient
//                 1 seule boucle ou les 3.
// --loops       : force le nombre de boucles au lieu de le détecter
//                 automatiquement (utile si la détection se trompe).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseTrack } from "../src/lib/gpxKml.ts";
import { routeLengthKm, splitIntoEqualLoops, detectLoopCount, type LatLng } from "../src/lib/geo.ts";

function parseArgs(argv: string[]) {
  const [filePath, ...rest] = argv;
  if (!filePath) {
    console.error("Usage: node scripts/import-track.ts <fichier.gpx|.kml> [--loop-length=7] [--loops=3]");
    process.exit(1);
  }

  let loopLengthKm = 7;
  let forcedLoopCount: number | null = null;

  for (const arg of rest) {
    const loopLengthMatch = arg.match(/^--loop-length=(\d+(?:\.\d+)?)$/);
    const loopsMatch = arg.match(/^--loops=(\d+)$/);
    if (loopLengthMatch) loopLengthKm = Number(loopLengthMatch[1]);
    if (loopsMatch) forcedLoopCount = Number(loopsMatch[1]);
  }

  return { filePath, loopLengthKm, forcedLoopCount };
}

function formatPointsArray(points: LatLng[]): string {
  const lines = points.map((p) => `  [${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}],`);
  return `[\n${lines.join("\n")}\n]`;
}

function main() {
  const { filePath, loopLengthKm, forcedLoopCount } = parseArgs(process.argv.slice(2));

  const content = readFileSync(resolve(filePath), "utf-8");
  const allPoints = parseTrack(content);

  if (allPoints.length < 2) {
    console.error(`Aucun point exploitable trouvé dans ${filePath}. Fichier GPX/KML valide ?`);
    process.exit(1);
  }

  const totalLengthKm = routeLengthKm(allPoints);
  const loopCount = forcedLoopCount ?? detectLoopCount(allPoints, loopLengthKm);

  console.log(`Fichier lu : ${filePath}`);
  console.log(`Points bruts : ${allPoints.length}`);
  console.log(`Longueur totale du tracé : ${totalLengthKm.toFixed(2)} km`);
  console.log(`Boucles détectées : ${loopCount} (longueur attendue par boucle : ${loopLengthKm} km)`);

  const loops = splitIntoEqualLoops(allPoints, loopCount);
  const singleLoop = loops[0];
  const singleLoopLengthKm = routeLengthKm(singleLoop);

  console.log(`Longueur de la boucle retenue : ${singleLoopLengthKm.toFixed(2)} km (${singleLoop.length} points)`);

  const deviation = Math.abs(singleLoopLengthKm - loopLengthKm) / loopLengthKm;
  if (deviation > 0.1) {
    console.warn(
      `⚠️  Écart de ${(deviation * 100).toFixed(0)}% entre la boucle détectée (${singleLoopLengthKm.toFixed(2)} km) ` +
        `et la longueur attendue (${loopLengthKm} km). Le fichier est peut-être incomplet, dans une autre unité, ` +
        `ou le nombre de boucles détecté est incorrect (force avec --loops=N).`
    );
  } else {
    console.log("✅ Longueur cohérente avec la longueur de boucle attendue.");
  }

  const outputPath = resolve("src/config/course.imported.ts");
  const fileContent = `// Généré par \`node scripts/import-track.ts ${filePath}\` — À VÉRIFIER puis
// à recopier dans course.ts (remplacer PLACEHOLDER_LOOP_POINTS) une fois
// que le tracé affiché sur la carte est validé. Ce fichier n'est pas
// utilisé par l'application tant qu'il n'est pas intégré manuellement.

export const IMPORTED_LOOP_POINTS: Array<[number, number]> = ${formatPointsArray(singleLoop)};

// Longueur calculée de cette boucle : ${singleLoopLengthKm.toFixed(2)} km
// Longueur totale (x${loopCount}) : ${(singleLoopLengthKm * loopCount).toFixed(2)} km
`;

  writeFileSync(outputPath, fileContent, "utf-8");
  console.log(`\nÉcrit dans ${outputPath}`);
  console.log("Prochaine étape : je vais brancher ce fichier dans course.ts pour que tu vérifies le tracé sur la carte.");
}

main();

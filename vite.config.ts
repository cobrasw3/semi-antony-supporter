import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { courseDir, fillIndexHtml, prepareCoursePublic, readCourseEvent, slugFromArgs } from "./scripts/lib/course.ts";

// Une course = un dossier courses/<slug>/ (Antony par défaut). La course est
// choisie par la variable COURSE, que posent `npm run dev|build -- <slug>`.
const course = slugFromArgs([]);
const publicDir = prepareCoursePublic(course);

/**
 * Fichiers de la course : marqueurs de app/index.html (titre, couleurs,
 * robots) et, en développement, régénération quand courses/<slug>/ change.
 */
function courseFiles(): Plugin {
  return {
    name: "course-files",
    transformIndexHtml: (html) => fillIndexHtml(html, readCourseEvent(course)),
    configureServer(server) {
      const dir = courseDir(course);
      server.watcher.add(dir);
      server.watcher.on("change", (file) => {
        if (!resolve(file).startsWith(dir)) return;
        prepareCoursePublic(course);
        server.ws.send({ type: "full-reload" });
      });
    },
  };
}

const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as { version: string };

function gitSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "local";
  }
}

/**
 * Fichiers de la version précédente en ligne (courses/<slug>/legacy-assets/,
 * cf. scripts/fetch-legacy-assets.ts) : servis à leur adresse d'origine pour
 * qu'une page restée ouverte sur l'ancienne version puisse encore charger un
 * écran à la demande (sinon : page blanche). Hors du cache hors-ligne.
 */
const legacyOnly = new Set<string>();
function legacyAssets(): Plugin {
  const dir = join(courseDir(course), "legacy-assets");
  return {
    name: "legacy-assets",
    apply: "build",
    generateBundle(_, bundle) {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir)) {
        const fileName = `assets/${name}`;
        if (fileName in bundle) continue; // fichier identique produit par ce build (polices…)
        legacyOnly.add(fileName);
        this.emitFile({ type: "asset", fileName, source: readFileSync(join(dir, name)) });
      }
    },
  };
}

export default defineConfig({
  root: "app",
  publicDir,
  build: { outDir: resolve("dist"), emptyOutDir: true },
  resolve: { alias: { "@course": courseDir(course) } },
  define: {
    __COURSE__: JSON.stringify(course),
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${gitSha()}`),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    courseFiles(),
    legacyAssets(),
    VitePWA({
      // Enregistrement maison (src/pwa/serviceWorker.ts) pour contrôler le
      // moment du rechargement après une mise à jour.
      injectRegister: false,
      registerType: "autoUpdate",
      // Manifeste généré depuis courses/<slug>/event.json (scripts/lib/course.ts), servi en no-cache.
      manifest: false,
      workbox: {
        // Nouvelle version active immédiatement, et prend la main sur les
        // onglets ouverts : l'app recharge ensuite d'elle-même (voir
        // serviceWorker.ts), sans attendre que tous les onglets soient fermés.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Shell de l'app : JS, CSS, HTML, icônes, plan statique du parcours.
        // event.json est embarqué dans le JS (donc précaché lui aussi).
        // woff2 : polices auto-hébergées, disponibles hors-ligne.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
        // Les fichiers de l'ancienne version restent servis, pas précachés.
        manifestTransforms: [async (entries) => ({ manifest: entries.filter((e) => !legacyOnly.has(e.url)), warnings: [] })],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/_vercel\//, /^\/data\//],
        runtimeCaching: [
          {
            // Données « vivantes » (event.json, annonces.json) : réseau
            // d'abord, cache en repli hors-ligne.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/data/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "donnees",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20 },
            },
          },
          {
            // Tuiles de carte : cache d'abord, limité en nombre et en durée.
            // Domaines cohérents avec app/src/config/tiles.ts et la CSP de
            // app/public/_headers. ⚠️ Fonction sérialisée telle quelle dans sw.js :
            // elle ne doit référencer aucune variable extérieure.
            urlPattern: ({ url }) =>
              /(^|\.)(tile\.openstreetmap\.org|api\.maptiler\.com|tiles\.stadiamaps\.com)$/.test(url.hostname),
            handler: "CacheFirst",
            options: {
              cacheName: "tuiles",
              expiration: { maxEntries: 400, maxAgeSeconds: 14 * 24 * 3600, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
});

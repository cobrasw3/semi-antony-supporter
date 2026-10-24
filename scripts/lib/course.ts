// Outils communs « une course = un dossier » : retrouver le dossier d'une
// course, lire sa config, préparer les fichiers statiques à servir (données,
// icônes, fond de carte, manifeste PWA généré depuis event.json).
// Utilisé par vite.config.ts et par les scripts (node scripts/…).

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../..");
export const COURSES_DIR = join(ROOT, "courses");
/** Course construite quand aucun slug n'est donné (`npm run build`) : Antony, en production. */
export const DEFAULT_COURSE = "antony";
/** Worker Cloudflare de la production d'Antony : jamais touché par les scripts. */
export const ANTONY_PROD_WORKER = "semi-antony-supporter";

export interface CourseApp {
  name: string;
  shortName: string;
  description: string;
  /** Titre de l'onglet (sinon `name`). */
  htmlTitle?: string;
  /** Description pour les moteurs / aperçus de lien (sinon `description`). */
  htmlDescription?: string;
  themeColor: string;
  backgroundColor: string;
}

export interface CourseEvent {
  status?: "demo" | "official" | "prototype";
  organizer?: { name?: string; aConfirmer?: boolean };
  app: CourseApp;
  deploy?: { worker?: string };
  event: { id: string; name: string; shortName: string };
  races: Array<{ id: string; name: string; track: unknown[]; spots: unknown[] }>;
}

/** Slug valide : lettres minuscules, chiffres, tirets (devient un nom de Worker et une URL). */
export const isValidSlug = (slug: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 40;

export function courseDir(slug: string): string {
  return join(COURSES_DIR, slug);
}

/** Liste des courses (dossiers de courses/, hors _modele). */
export function listCourses(): string[] {
  if (!existsSync(COURSES_DIR)) return [];
  return readdirSync(COURSES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && existsSync(join(COURSES_DIR, d.name, "event.json")))
    .map((d) => d.name)
    .sort();
}

export function readCourseEvent(slug: string): CourseEvent {
  const file = join(courseDir(slug), "event.json");
  if (!existsSync(file)) throw new Error(`Course « ${slug} » introuvable (attendu : courses/${slug}/event.json).`);
  return JSON.parse(readFileSync(file, "utf-8")) as CourseEvent;
}

/** Slug donné en argument (`npm run build -- vincennes`), sinon la course par défaut. */
export function slugFromArgs(argv: string[] = process.argv.slice(2)): string {
  const slug = argv.find((a) => !a.startsWith("-")) ?? process.env.COURSE ?? DEFAULT_COURSE;
  if (!isValidSlug(slug)) throw new Error(`Slug de course invalide : « ${slug} » (minuscules, chiffres, tirets).`);
  return slug;
}

/** Manifeste PWA de la course (nom, couleurs, icônes), généré depuis event.json. */
export function buildManifest(ev: CourseEvent) {
  return {
    id: "/",
    name: ev.app.name,
    short_name: ev.app.shortName,
    description: ev.app.description,
    lang: "fr",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: ev.app.themeColor,
    background_color: ev.app.backgroundColor,
    categories: ["sports", "navigation"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}

/** Une démo ou un prototype ne doit pas être indexé par les moteurs de recherche. */
export const isIndexable = (ev: CourseEvent) => ev.status === "official";

/** robots.txt : rien d'indexé tant que la course n'est pas officielle. Jamais de sitemap. */
export function robotsTxt(ev: CourseEvent): string {
  if (isIndexable(ev)) return "User-agent: *\nAllow: /\n";
  return "# Prototype non officiel en attente de validation par l’organisateur :\n# pas d’indexation par les moteurs de recherche pour l’instant.\nUser-agent: *\nDisallow: /\n";
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Remplit les marqueurs %…% de app/index.html avec la config de la course. */
export function fillIndexHtml(html: string, ev: CourseEvent): string {
  const values: Record<string, string> = {
    "%APP_TITLE%": escapeHtml(ev.app.htmlTitle ?? ev.app.name),
    "%APP_DESCRIPTION%": escapeHtml(ev.app.htmlDescription ?? ev.app.description),
    "%APP_SHORT_NAME%": escapeHtml(ev.app.shortName),
    "%THEME_COLOR%": escapeHtml(ev.app.themeColor),
    // Démo : jamais trouvable sur un moteur de recherche (en plus de robots.txt).
    "%ROBOTS_META%": ev.status === "demo" ? '\n    <meta name="robots" content="noindex, nofollow" />' : "",
  };
  return html.replace(/%[A-Z_]+%/g, (m) => values[m] ?? m);
}

/**
 * Prépare le dossier « public » d'une course : fichiers communs (app/public),
 * fichiers de la course (assets/), données (data/event.json, annonces.json)
 * et manifeste généré. Renvoie son chemin (servi par Vite tel quel).
 */
export function prepareCoursePublic(slug: string): string {
  const src = courseDir(slug);
  const out = join(ROOT, "node_modules", ".course", slug, "public");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "data"), { recursive: true });
  cpSync(join(ROOT, "app", "public"), out, { recursive: true });
  if (existsSync(join(src, "assets"))) {
    // Le QR code de démo est un outil de suivi, pas un fichier de l'app.
    cpSync(join(src, "assets"), out, { recursive: true, filter: (p) => !p.endsWith("qr-demo.png") });
  }
  cpSync(join(src, "event.json"), join(out, "data", "event.json"));
  const annonces = join(src, "annonces.json");
  writeFileSync(join(out, "data", "annonces.json"), existsSync(annonces) ? readFileSync(annonces) : '{ "annonces": [] }\n');
  const ev = readCourseEvent(slug);
  writeFileSync(join(out, "manifest.webmanifest"), JSON.stringify(buildManifest(ev), null, 2) + "\n");
  writeFileSync(join(out, "robots.txt"), robotsTxt(ev));
  return out;
}

# CLAUDE.md — Semi d'Antony Supporter

> **Règle (demandée par l'utilisateur) :** ce fichier est tenu à jour pour
> **chaque** modification, action, test ou décision, de Claude ou de
> l'utilisateur. Ajouter une entrée datée dans le « Journal » (le plus récent
> en bas), dans le même commit que le changement quand c'est possible.

## Projet

PWA prototype (React 19 + Vite 8 + TypeScript, Leaflet, Vitest) pour les
supporters du semi-marathon d'Antony : où se placer et à quelle heure le
coureur passe, à partir de son allure ou d'un temps visé. Déployée sur
Vercel (projet `semi-antony-supporter`, cf. `.vercel/project.json`).
⚠️ Constaté le 2026-10-17 : **le dépôt GitHub n'est PAS relié à Vercel**
(aucun déploiement/statut sur aucun commit) ; les déploiements se font via
la CLI (`npx vercel`). Si l'intégration Git est activée, `main` partira en
production automatiquement : travailler sur des branches.
Public visé par la démo : club Antony Athlétisme 92 et Direction des Sports
de la mairie.

## Conventions

- Français partout (UI en tutoiement, commentaires, commits).
- Un commit par tâche, message clair, terminé par la ligne Co-Authored-By.
- Pas de backend, dépendances minimales. Aucune donnée personnelle envoyée
  à un serveur (prénom/allure restent sur l'appareil ; analytics sans
  paramètres d'URL).
- Toute la config de l'événement est dans `public/data/event.json` (aucune
  valeur d'événement codée en dur). Logique pure dans `src/lib/` avec tests.
- localStorage uniquement via `src/lib/storage.ts` (try/catch).
- La fonction `urlPattern` de `vite.config.ts` est sérialisée dans `sw.js` :
  elle ne doit référencer aucune variable extérieure.
- Nouveau fournisseur de tuiles = mettre à jour `src/config/tiles.ts`, la
  CSP de `vercel.json` (img-src ET connect-src) et la règle de cache SW.

- Design system (branche `feat/redesign`) : tokens dans `src/ui/tokens.css`
  (aucune couleur en dur dans les composants), composants dans
  `src/ui/components.tsx` et `src/ui/overlays.tsx`, page `/styleguide`.
  Couleurs de marque surchargeables via `event.json` → `branding.colors`
  (textes dérivés recalculés pour rester AA, `src/ui/branding.ts`).
  Contrastes vérifiés par `src/ui/contrast.test.ts` : toute nouvelle paire
  texte/fond doit y être ajoutée. Texte sur `--sprint` = `--on-sprint`
  (bleu nuit), jamais blanc (3,1:1). Icônes : lucide-react uniquement, pas
  d'emoji dans l'UI sauf 🏁.

## Commandes

```bash
npm run dev        # serveur de dev (pas de service worker en dev)
npm test           # Vitest (toute la logique de calcul)
npm run build      # tsc + vite build + génération du SW
npx oxlint         # lint
node scripts/generate-route-plan.ts   # régénère public/parcours-plan.svg
npm i --no-save sharp && node scripts/generate-icons.mjs   # régénère les icônes
node scripts/import-track.ts fichier.gpx                   # importe un tracé
```

## À confirmer avec l'organisateur (état actuel)

- Date de l'édition 2027 (mise au 21/03/2027, `dateToConfirm: true`).
- Dénivelé (180 m, `elevationToConfirm: true`).
- Accès et conseils de chaque spot, position exacte des spots.
- Tracé et spots du 5 km (départ 13:15 en 2026) pour activer le sélecteur.
- Autorisation d'utiliser le nom de l'événement / validation officielle.

## Journal

### 2026-10-17 — Démo finale (branche `feat/demo-finale`, 15 tâches)

- **Étape 0** : exploration. Constats : pas de SW, pas de manifest, **pas
  de push existant**, favicon Vite par défaut, le stade n'avait que 3
  passages (arrivée manquante). Branche `feat/demo-finale` créée depuis
  `main` (2b05fa8). Recherche web : édition 2026 le 29/03 (5 km 13:15,
  semi 14:30) ; date 2027 non confirmée.
- **T1 (c3cdbab)** : config centralisée dans `public/data/event.json`
  (événement, réglages, courses multiples, tracé, spots avec positions km) ;
  suppression de `src/config/course.ts`, `observationPoints.ts`,
  `settings.ts` ; `parseEventConfig` + tests ; sélecteur de course si > 1.
- **T2 (44d86fc)** : stade `[0, 7, 14, 21.0975]`, étiquettes automatiques
  Départ / Boucle N / Fin boucle N / Arrivée 🏁 ; test arrivée 16:26 à 5:30.
- **T3 (1619a4b)** : écran réorganisé (saisie + temps total + partage en
  haut, carte repliable).
- **T4 (33031d2)** : `?name=` (alias `runner=`), phrases personnalisées
  (champ `where` des spots : « au parc Heller »), Web Share + repli
  presse-papier, mémorisation localStorage, validation allure 3:00–9:00.
- **T5 (0c52b15)** : carte « Prochain passage » (4 états) rafraîchie toutes
  les 30 s, fuseau Europe/Paris, mode démo `?demo=1&now=14:40`.
- **T6 (4653d3a)** : itinéraire chronologique (marche haversine × 1,3 à
  4,5 km/h, ✅/⚠️/❌) et plan optimal (DP, vérifiée contre une recherche
  exhaustive). À 5:30 : 7 passages vus (stade ↔ parc Heller).
- **T7 (a556fdf)** : marqueurs numérotés ↔ cartes de spots, flèches de sens,
  bornes km, tuiles configurables (`VITE_TILE_PROVIDER`), plan SVG de repli.
- **T8 (343887c)** : manifest, icônes (pictogramme créé, `public/icon.svg`),
  métas iOS, zone sûre, invite d'installation (Android natif / iOS mode
  d'emploi), règle « installer avant notifications » sur iOS.
- **T9 (201f48f)** : vite-plugin-pwa (skipWaiting + clientsClaim),
  vérification des MAJ (premier plan, online, 15 min), rechargement auto ou
  toast, garde-fou anti-boucle, event.json en SWR côté app, en-têtes de
  cache Vercel, versions dans « À propos ».
  *Test local (serveur imitant Vercel, Edge headless)* : A ouverte → B
  déployée → B chargée sans action, prénom/allure conservés ; saisie en
  cours → toast → B en un tap. ✅
- **T10 (79ae8df)** : cache des tuiles, bandeau hors-ligne non bloquant,
  encart « ouvre l'app la veille ». **Bugs trouvés et corrigés** : la CSP
  n'autorisait pas `tile.openstreetmap.org` (seulement `*.`), le SW n'avait
  pas `connect-src` pour les tuiles, et la règle de cache SW référençait une
  variable extérieure (non sérialisée).
  *Test hors-ligne (émulation DevTools)* : rechargement réseau coupé → app,
  prochain passage, tuiles en cache, saisie OK. ✅
- **T11 (0662a49)** : `public/data/annonces.json` + bandeau + README.
- **T12 (f92afb7)** : Vercel Web Analytics sans cookie, URL sans paramètres,
  désactivé en démo/dev. ⚠️ Événements personnalisés = plan Vercel Pro.
- **T13 (1c787ec)** : HSTS, Permissions-Policy, COOP ; page `/qr`
  imprimable ; aucune violation CSP constatée.
- **T14 (2ca3ec1)** : textes relus, dénivelé configurable + TODO, pied de
  page « Application non officielle… », accessibilité ; correction de
  `scripts/import-track.ts` (cassé en T1).
- **T15 (7a4e806)** : rappels 10 min avant : export .ics (alarme) + alertes
  app ouverte. Pas de push app fermée (impossible sans backend, documenté).
- **Vérification finale** : carte Leaflet chargée en différé (bundle initial
  401 → 257 Ko). 120 tests ✅, build ✅, oxlint ✅. Lighthouse mobile (local,
  gzip) : performance 98, accessibilité 100, bonnes pratiques 96 (seule
  erreur : script analytics absent en local), SEO 100. Installabilité
  (Chromium `getInstallabilityErrors`) : aucune erreur.
- L'utilisateur demande de tenir ce `CLAUDE.md` à jour à chaque action
  (fichier créé à ce moment-là, journal reconstitué ci-dessus).
- **Non fait / à faire** : `npm audit` signale des vulnérabilités dans des
  dépendances de dev (vitest, nanoid, source-map-js) — `npm audit fix` à
  valider ; tests sur vrais iPhone/Android à faire (checklist dans la
  réponse de fin de session).
- Push de `feat/demo-finale` sur GitHub (accord de l'utilisateur). Aucune
  preview Vercel déclenchée : constat que le dépôt n'est pas relié à Vercel
  (déploiements précédents via CLI). CLI Vercel non connectée sur la
  machine (`vercel whoami` → Logged out) : connexion à faire par
  l'utilisateur (`npx vercel login`) ou intégration Git à activer dans le
  tableau de bord Vercel. README corrigé (il affirmait un déploiement auto).
- Connexion CLI Vercel faite par l'utilisateur (`npx vercel login`, compte
  `pmachard2001-5765`). **Preview déployée** via `npx vercel deploy`
  (cible preview, prod non touchée) depuis `feat/demo-finale` @ 6f2dd80 :
  https://semi-antony-supporter-kyof9rqbt-pmachard2001-5765s-projects.vercel.app
  — statut Ready ; protégée par Vercel Authentication (HTTP 302 sans
  connexion). Vérifié via `vercel curl` : `/`, `/sw.js`,
  `/manifest.webmanifest`, `/data/event.json`, `/qr`, `/parcours-plan.svg`
  en 200, en-têtes CSP/HSTS/Cache-Control conformes à `vercel.json`.

### 2026-10-17 — Refonte UX/UI (branche `feat/redesign`, depuis `feat/demo-finale`)

- Brief : assistant 3 écrans, 4 onglets (Live, Plan, Carte, Infos),
  identité « app de course » (bleu nuit / orange / jaune dossard, Barlow
  Condensed + Manrope), marque configurable par événement, logique métier
  intouchée. Méthode : styleguide validé par l'utilisateur avant la suite.
- **Étape 1 — tokens + composants + `/styleguide`** :
  - `src/ui/tokens.css` (clair + sombre), `color.ts` (contraste WCAG),
    `branding.ts` (marque depuis `event.json`, bloc `branding` ajouté :
    tagline, logo null, official false, couleurs).
  - Écarts au brief pour l'accessibilité : texte blanc sur orange refusé
    (3,1:1) → texte bleu nuit (5,1:1) ; `--muted` #6B7280 → #5D6470
    (4,4:1 sur le fond chaud) ; ajout `--sprint-text` #C2410C pour l'orange
    en texte ; tokens `--selected` pour les puces sélectionnées.
  - Polices fontsource (latin, woff2) précachées ; lucide-react.
  - Composants : Button, IconButton, Stepper (appui long accéléré, clavier,
    vibration), Segmented, Chip, ProgressSteps, RunnerChip, CountdownRing,
    SpotCard (horaire + fourchette, détails repliables), BottomSheet
    (glisser pour fermer, Échap), ToastStack, StatusStrip, TabBar, Carousel.
  - Classe `.toast` de l'ancienne UI renommée `.update-toast` (conflit).
  - Captures 390×844 relues ; corrigés : cartes de spot tassées (horaire
    trop large, fourchette tronquée), puces sélectionnées peu visibles en
    sombre, thème initial du styleguide. Reste : variante compacte de carte
    pour le carrousel (à faire avec l'onglet Carte).
  - 166 tests ✅ (dont 46 nouveaux : contrastes clair/sombre, marque),
    build ✅ (23 fichiers précachés dont 7 polices), ancienne app intacte.
  - **En attente de validation visuelle de l'utilisateur.**

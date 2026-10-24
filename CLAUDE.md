# CLAUDE.md — Supporters de courses (Semi d'Antony et démos multi-courses)

> **Règle (demandée par l'utilisateur) :** ce fichier est tenu à jour pour
> **chaque** modification, action, test ou décision, de Claude ou de
> l'utilisateur. Ajouter une entrée datée dans le « Journal » (le plus récent
> en bas), dans le même commit que le changement quand c'est possible.

## Projet

PWA (React 19 + Vite 8 + TypeScript, Leaflet, Vitest, Workbox) pour les
supporters de courses à pied : où se placer et à quelle heure le coureur
passe, à partir de son allure ou d'un temps visé ; parcours conseillé,
points libres touchés sur la carte, pointage « il vient de passer » qui
recale les horaires, carte hors-ligne. Aucun backend, aucune donnée
personnelle envoyée.

Né pour le **semi-marathon d'Antony** (prototype présenté à la mairie et au
club Antony Athlétisme 92), devenu **multi-courses** le 2026-10-24 : un seul
moteur (`app/`), une course = un dossier (`courses/<slug>/`), une app
installable et une URL par course. Objectif : proposer des démos à d'autres
organisateurs d'Île-de-France (Vincennes, Rambouillet, Joinville, Malakoff,
Charenton), puis vendre le service.

**Hébergement** : Cloudflare, Workers « fichiers statiques » (sous-domaine
du compte : `semi-supporter.workers.dev`).
- **Antony** : Worker `semi-antony-supporter`, relié à GitHub (Workers
  Builds) : `main` = production
  https://semi-antony-supporter.semi-supporter.workers.dev ; toute autre
  branche = lien de test `<branche>-semi-antony-supporter.semi-supporter.workers.dev`
  (rangé sous Previews dans le tableau de bord). Build `npm run build`
  (= Antony), déploiement `npx wrangler deploy`, branches `npx wrangler
  preview` (bloc `previews` de `wrangler.jsonc`).
- **Autres courses** : un Worker par course, déployé en ligne de commande
  (`npm run deploy -- <slug>`, après `npx wrangler login`) →
  `https://<slug>.semi-supporter.workers.dev`. Pas relié à GitHub.
- Lien envoyé à la mairie (19/10/2026) :
  `…/?demo=1&now=15:20&name=Paul&pace=5:30`.

## ⚠️ Règles absolues

- **La production d'Antony est gelée** (lien envoyé à la mairie) : ne rien
  fusionner dans `main`, ne jamais déployer sur le Worker
  `semi-antony-supporter` sans l'accord explicite de l'utilisateur. La
  bascule vers l'architecture multi-courses est déclenchée par lui (README,
  « 🔁 Antony : bascule »). Version de référence : tag
  `antony-prod-avant-multi` (e3209a0, Cloudflare `ae3f3563-3d09-440f-8fae-3462527b93b9`).
- Toute mise en production = accord explicite, à chaque fois.
- Démos des autres courses : statut `demo` (bandeau « Démo non officielle —
  préparée pour … », noindex), aucun logo officiel, aucun tracé fabriqué,
  tout ce qui n'est pas confirmé marqué `aConfirmer`.
- Ne pas publier de captures contenant des prénoms (`docs/*.png` ignorés).

## Conventions

- Français partout (UI en tutoiement, commentaires, commits) ; formulations
  neutres (« vient de passer », « as-tu vu »), jamais d'accord genré.
- Un commit par tâche, message clair, terminé par la ligne Co-Authored-By.
- Pas de backend, dépendances minimales. Aucune donnée personnelle envoyée
  à un serveur (prénom, allure, pointage, points libres restent sur
  l'appareil). Mesure d'audience : Cloudflare Web Analytics seulement si
  `VITE_CF_ANALYTICS_TOKEN` (non configuré à ce jour).
- **Multi-courses** : code commun dans `app/`, une course = un dossier
  `courses/<slug>/` (event.json, annonces.json, parcours.gpx, SUIVI.md,
  assets/, legacy-assets/ pour Antony). Aucune valeur de course codée en
  dur dans les composants. Logique pure dans `app/src/lib/` avec tests.
  `npm run build` sans argument = Antony. Alias Vite `@course` →
  `courses/<slug>/`. Manifeste, robots.txt et titres générés depuis
  `event.json` (`scripts/lib/course.ts`).
- `event.json` : écrire avec `writeCourseEvent` / `formatEventJson`
  (mise en forme compacte du projet), jamais `JSON.stringify` brut.
- localStorage uniquement via `app/src/lib/storage.ts` (try/catch) ; clés
  `semi-supporter:*` (isolées par origine : une course = une URL).
- La fonction `urlPattern` de `vite.config.ts` est sérialisée dans `sw.js` :
  elle ne doit référencer aucune variable extérieure.
- Nouveau fournisseur de tuiles = mettre à jour `app/src/config/tiles.ts`, la
  CSP de `app/public/_headers` (img-src ET connect-src) et la règle de cache SW.
- Pas de `_redirects` : avec les Workers il redirige `/qr` vers `/` ; les
  routes de l'app passent par `not_found_handling: single-page-application`.
- Fond de carte : `courses/<slug>/assets/carte/<id>-<date>.pmtiles` (nom
  daté, immuable), écrit dans `event.json` → `map` par
  `scripts/build-basemap.ts <slug>` (outil pmtiles, variable `PMTILES`).
- **Avant chaque mise en production d'Antony** : `node
  scripts/fetch-legacy-assets.ts antony` (fichiers de la version en ligne
  servis hors précache : pas de page blanche pour une page restée ouverte).
- Non-régression d'Antony : `tests/reference/` (calculs : test Vitest ;
  écrans : `node scripts/reference-ui.mjs compare <url>`). Ne régénérer une
  référence qu'après un changement voulu et validé.
- Design system : tokens dans `app/src/ui/tokens.css` (aucune couleur en dur
  dans les composants), composants dans `app/src/ui/components.tsx` et
  `overlays.tsx`, page `/styleguide`. Couleurs de marque via `event.json` →
  `branding.colors` (textes dérivés recalculés pour rester AA,
  `app/src/ui/branding.ts`). Contrastes vérifiés par
  `app/src/ui/contrast.test.ts`. Texte sur `--sprint` = `--on-sprint`,
  jamais blanc. Icônes : lucide-react uniquement, pas d'emoji sauf 🏁.

## Commandes

```bash
npm run dev -- <slug>              # serveur de dev d'une course (Antony sans argument)
npm run build -- <slug>            # build d'une course dans dist/ (Antony sans argument)
npm test                           # Vitest (logique, non-régression des calculs d'Antony)
npx oxlint                         # lint
npm run new-course -- <slug> --nom "…" --court "…" --icone "Ville" --couleur "#rrggbb" --organisateur "…" --ville "…"
npm run import-gpx -- <slug>       # tracé + spots candidats depuis courses/<slug>/parcours.gpx
node scripts/compute-walking-routes.ts <slug>   # distances à pied entre spots (OSRM)
node scripts/compute-walking-grid.ts <slug>     # grille de marche pour les points libres
node scripts/build-basemap.ts <slug>            # fond de carte hors-ligne (pmtiles)
node scripts/generate-route-plan.ts <slug>      # plan de repli
npm i --no-save sharp && node scripts/generate-icons.mjs <slug>   # icônes
npm run deploy -- <slug>           # déploie une démo sur son Worker (refuse Antony)
npm run courses                    # tableau de bord → courses/TABLEAU.md + QR codes
node scripts/fetch-legacy-assets.ts antony      # avant une mise en prod d'Antony
node scripts/reference-ui.mjs compare <url>     # non-régression des écrans d'Antony
```

## À confirmer avec les organisateurs

- **Antony** : date 2027 (21/03 provisoire), dénivelé (180 m), tracé
  officiel (GPX), emplacement exact des ravitos, consigne, autorisation du
  nom / validation officielle.
- **Démos** (tout est à confirmer, voir chaque `courses/<slug>/SUIVI.md`) :
  dates 2027, heures de départ (inconnues : 10 km de Joinville, 5 km de
  Malakoff, Charenton → valeurs provisoires), organisateurs (Malakoff,
  Charenton), départs/arrivées, parcours officiels.

## Où on en est (2026-10-24)

- **Production d'Antony** : inchangée depuis le 19/10 (`main` = e3209a0 +
  journal, bundle `index-21lbHY4s.js`), mail envoyé à la mairie, réponse
  attendue.
- **Branche `feat/multi-courses`** (poussée sur GitHub, lien de test
  https://feat-multi-courses-semi-antony-supporter.semi-supporter.workers.dev
  identique à la production sur les 17 scénarios de référence) : étapes 0 à
  6 du prompt « Démos multi-courses » faites, prête pour la bascule
  d'Antony (procédure dans le README, à déclencher par l'utilisateur).
- **5 démos** (Vincennes, Rambouillet, Joinville, Malakoff, Charenton) :
  configurées, **en attente des GPX** et **non déployées**. Prochaines
  étapes annoncées par l'utilisateur : `npx wrangler login`, puis dépôt des
  GPX dans `courses/<slug>/parcours.gpx` → import, choix des spots,
  distances, fond de carte, déploiement, liens démo.
- Pistes ouvertes : tests sur vrais iPhone/Android (en partie faits par
  l'utilisateur sur iPhone) ; créneau « j'arrive à / je pars à » (proposé,
  non validé) ; prix des démos à définir ; `npm audit` : alertes sur des
  outils de dev uniquement.

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
- **Retours utilisateur sur le styleguide (v1)** : barre d'onglets OK
  (orange peut-être trop vif), typo OK, en-tête à mieux exploiter, rôle des
  boutons et « Installer l'app » pas clairs, temps visé à rendre libre (en
  gardant les raccourcis), prochain passage live OK, tiroir pas compris,
  fond et bleu OK mais « beaucoup de contraste ».
- **Styleguide v2** : orange par défaut adouci `#F26B3A` (5,3:1 avec le
  texte bleu nuit), sélecteur Vif / Adouci / Corail pour comparer (choix en
  attente) ; en-tête compact `AppHeader` (événement + partage, puis puce
  coureur + J-x / date) ; légendes sous chaque bouton, « Installer l'app »
  → « Ajouter à l'écran d'accueil » + bénéfice ; temps visé = raccourcis +
  stepper libre à la minute ; tiroir expliqué et montré en contexte (puce
  coureur) ; contraste allégé : tokens `--soft` / `--selected` (boutons du
  stepper, pastilles, puces sélectionnées en tons clairs), le bleu foncé
  réservé à l'en-tête, la carte live et les toasts. **En attente de
  validation.**
- Preview Vercel de `feat/redesign` @ 837f50f déployée via CLI (cible
  preview, prod non touchée) :
  https://semi-antony-supporter-1ly48vjxr-pmachard2001-5765s-projects.vercel.app/styleguide
  — Ready, `/styleguide` et `/` en 200 via `vercel curl` ; protégée par
  Vercel Authentication (302 sans connexion).
- Choix utilisateur : **orange adouci `#F26B3A` retenu**, contraste validé.
- **Étape 2 — assistant de premier lancement** :
  - Logique sortie de l'affichage : `src/app/useSupporter.ts` assemble
    données SWR, course, préférences (URL + localStorage), allure, passages,
    plan, horloge, annonces (aucun calcul nouveau). Règle pure
    `needsOnboarding` (`src/app/onboardingRule.ts`, testée) : assistant
    sauté si l'URL contient `pace`, ou s'il a déjà été fait (localStorage
    `semi-supporter:onboarded`).
  - `src/app/Onboarding.tsx` : 1) prénom (ou Passer), 2) objectif temps visé
    (raccourcis + stepper à la minute, par défaut au 1er lancement) ou
    allure (stepper 5 s), arrivée estimée en direct, 3) résumé « Léa ·
    5:30/km · arrivée 16:26 · tu peux voir Léa 7 fois », boutons « Voir où
    l'encourager » et « Ajouter à l'écran d'accueil » (invite native ou
    marche à suivre iOS).
  - `src/app/Root.tsx` : assistant puis ancienne app (temporaire jusqu'à
    la coque à onglets).
  - Corrigé après capture : champ prénom qui débordait (défilement
    horizontal).
- **Étape 3a — coque à onglets + onglet Live** :
  - `src/app/Shell.tsx` : en-tête compact (puce coureur → tiroir de
    modification avec `GoalControls` partagé avec l'assistant ; info du
    moment J-x / Départ dans… / Km estimé / Arrivée), fines barres (démo,
    hors-ligne), toasts (mise à jour, annonce importante, alerte de passage,
    lien copié), barre d'onglets (onglet dans le hash `#plan`…), tiroir
    spot (adresse, conseils, tous les passages, « Sur la carte », « Y aller »
    → Google Maps à pied).
  - `LiveTab` : héros selon l'état (J-x + « Prépare ta journée », départ
    dans X min, prochain passage avec anneau, « Là ! maintenant »,
    célébration sobre une fois à l'arrivée), frise avec point coureur
    estimé, prochains passages. Modèle de présentation pur et testé
    (`liveModel.ts`), position estimée du coureur (`lib/runnerPosition.ts`,
    nouveau, testé).
  - Logique extraite des anciens composants : `useReminders` (alertes +
    .ics), `useGeolocation` (sur demande, jamais envoyée ni stockée),
    `share.ts`.
  - Annonces « info » : plus de toast (masquait le contenu) → onglet Infos
    avec pastille ; seules les « importantes » en toast.
  - `haptic()` ne vibre qu'après un premier geste (sinon erreur console).
  - `vercel.json` : Permissions-Policy `geolocation=(self)` (distance à
    pied) — reste sur l'appareil.
  - Plan / Carte / Infos provisoires (étapes suivantes). La page /qr a perdu
    ses styles (App.css plus chargé) : à reprendre à l'étape 4.
- **Étape 3b — onglet Plan** : résumé « N fois » + distance à pied,
  bascule « Mon plan / Tous les passages », étapes en cartes (« Étape 1 ·
  Départ — 14:30 ») reliées par la marche (« 7 min · 490 m ») et un verdict
  ✅ / ⚠️ / ❌ ; « Je choisis mes spots » (puces, plan recalculé en direct
  via `optimalPlan` sur les passages des spots choisis, choix mémorisé et
  remonté dans `useSupporter` pour que Live et rappels suivent) ; bloc
  rappels (agenda .ics, alertes app ouverte, cas iPhone non installé).
  Corrigé : taps rapides sur les puces (mise à jour fonctionnelle), « 0 m »
  → « sans bouger ».
- **Étape 3c — onglet Carte** (`src/app/MapTab.tsx`, chargé à la demande) :
  carte plein écran, tracé aux couleurs de la marque (classe CSS, plus de
  couleur en dur), flèches de sens, bornes km, marqueurs numérotés, point
  « position estimée du coureur » animé (jour J / démo) ; tiroir en bas
  avec carrousel des spots (prochain passage) : défiler recentre la carte,
  toucher un marqueur sélectionne la carte du carrousel, toucher une carte
  ouvre le tiroir du spot ; tiroir repliable. Repris de l'ancienne carte :
  tuiles configurables, plan statique de repli, mode `?calibrage=1`.
  Corrigé : noms tronqués dans le carrousel (2 lignes, horaire réduit).
- **Étape 3d — onglet Infos** : annonces (toutes, info/importante),
  programme de la journée (toutes les courses de `event.json`, « Suivre »
  si plusieurs, dénivelé avec TODO), infos pratiques dépliables (nouveau
  bloc optionnel `infos` dans `event.json` ; « Consigne et vestiaires »
  marqué « à confirmer », aucun fait inventé), partage avec QR code,
  installation (invite native / marche à suivre iOS), à propos (mention
  « non officielle » pilotée par `branding.official`, vie privée, versions,
  contact).
- **Étape 4 — ancien affichage supprimé** : `src/App.tsx`, `src/App.css` et
  les 12 composants de `src/components/` (ChampAllure, Partage,
  ProchainPassage, InstallPrompt, Itineraire, Rappels, Carte,
  RecapPassages, Annonces, BandeauConnexion, UpdateToast, APropos) ; leur
  logique utile a été reprise dans `src/app/` (hooks) avant suppression.
  Page /qr déplacée (`src/app/QrPage.tsx` + `qr.css`, tokens), mention non
  officielle pilotée par `branding.official`. `index.css` réduit à un reset
  sur tokens. Comparateur d'orange retiré du styleguide. Token `--thumb`
  (curseur du sélecteur segmenté, peu visible en sombre). README : structure
  et URLs mises à jour.
- **Vérification finale de la refonte** (build de prod servi localement avec
  les en-têtes de `vercel.json` + gzip, Edge headless 390×844) :
  - 187 tests ✅, build ✅ (23 fichiers précachés dont polices), oxlint : 1
    avertissement sans impact (composant `lazy` défini dans `main.tsx`).
  - Lighthouse mobile — perf / a11y / bonnes pratiques / SEO : assistant
    97/100/96/100 ; Live 93/100/96/100 ; Plan 93/100/96/100 ; Infos
    94/100/96/100 ; Carte ouverte directement 78/100/93/100 (LCP = tuiles
    OSM sur réseau simulé lent). Bonnes pratiques 96 = script analytics
    absent en local (404). Lighthouse renvoie parfois NO_NAVSTART : relancé.
  - Installabilité (Chromium `getInstallabilityErrors`) : aucune erreur.
  - Hors-ligne (réseau coupé) : polices (Barlow/Manrope), icônes, 4 onglets
    (carte avec tuiles en cache), assistant et bandeau « Hors connexion » OK.
  - Corrigé pendant la vérification : `role="tabpanel"` sur `<main>`
    (non autorisé) → `div` ; nom accessible de la puce coureur ; tracé de la
    carte bleu Leaflet par défaut (la classe CSS n'était pas transmise) →
    couleur lue dans les tokens ; boutons du tiroir spot sur 2 lignes ;
    focus automatique du tiroir sur une carte non interactive.
- Preview Vercel de la refonte (`feat/redesign` @ f36ed37, cible preview,
  prod non touchée) :
  https://semi-antony-supporter-1kc7ca4nt-pmachard2001-5765s-projects.vercel.app
  — Ready ; `/`, `/styleguide`, `/qr`, `/sw.js` en 200 via `vercel curl` ;
  protégée par Vercel Authentication.

### 2026-10-17 — Distances réelles et choix « combien de fois » (branche `feat/plan-marche`, depuis `feat/redesign`)

- Retours utilisateur sur la refonte : design validé ; questions : d'où
  vient « 7 fois » (et si on « Passe » le prénom), « Tous les passages »
  incompréhensible (en retard partout), vouloir doser nombre de passages ↔
  distance à marcher (distance max → nombre de fois, meilleur spot sans
  bouger), et ne plus calculer la marche à vol d'oiseau.
- **Distances à pied réelles** : `scripts/compute-walking-routes.ts`
  interroge une fois le service piéton OSRM de routing.openstreetmap.de
  (requête « table », 30 trajets entre les 6 spots) et écrit
  `races[].walkingRoutes.km` dans `event.json` (« idA>idB »). L'app reste
  hors-ligne et sans backend. `walkBetweenSpots` utilise ces distances
  (source « route »), sinon l'estimation vol d'oiseau × 1,3 (« estimate »).
  Depuis la position GPS de l'utilisateur : estimation, affichée comme
  telle (envoyer la position à un service externe est exclu).
  ~~Limite : traversées du parcours~~ → levée, voir ci-dessous.
- **Compromis passages ↔ marche** : `planOptions` (lib/itinerary.ts, DP
  « marche minimale pour k passages », options non dominées), testée contre
  une recherche exhaustive. À 5:30 : 4× sans bouger (stade), 5× 1 km,
  6× 2 km, 7× 3 km. Choix mémorisé (`semi-supporter:nb-passages`, null =
  max) ; si l'allure change, meilleure option en dessous. Le choix des spots
  filtre toujours les passages.
- Onglet Plan : « Combien de fois veux-tu voir Léa ? » (cartes options),
  étapes du plan choisi, « Comment c'est calculé ? », vue « Horaires »
  (tableau par boucle, ton plan surligné, sans verdicts) à la place de
  « Tous les passages ». Live et assistant reformulés (« 4 fois sans bouger,
  ou jusqu'à 7 fois en marchant 3 km »).
- Réponses données : « 7 fois » = plus longue chaîne de passages
  atteignables (départ juste après le passage, arrivée 3 min avant la
  fourchette suivante, marche à 4,5 km/h) ; « Passer » le prénom → « ton
  coureur » partout.
- Preview Vercel de `feat/plan-marche` @ 8ed7bde (cible preview, prod non
  touchée) : https://semi-antony-supporter-r25pw6s4j-pmachard2001-5765s-projects.vercel.app
  — Ready ; `event.json` servi avec `walkingRoutes`. 193 tests ✅.
- **Info utilisateur** : le parcours peut être traversé à pied le jour J,
  il faut seulement faire attention aux coureurs. Les itinéraires piétons
  calculés restent donc valables ; mise en garde retirée de l'onglet Plan,
  remplacée par la consigne (Plan « Comment c'est calculé ? », infos
  pratiques « Se déplacer entre les spots », README, script).
- Preview redéployée à la demande de l'utilisateur (`feat/plan-marche` @
  7c9d1db, cible preview, prod non touchée) :
  https://semi-antony-supporter-byxd39xj3-pmachard2001-5765s-projects.vercel.app
  — Ready ; consigne « attention aux coureurs » bien servie dans event.json.

### 2026-10-18 — Choix des spots repensé (branche `feat/spots-choisis`, depuis `feat/plan-marche`)

- Retours utilisateur : le choix des spots n'était pas compris ; avec stade
  + rue des Hautes Bièvres cochés, la rue des Hautes Bièvres n'apparaissait
  pas (le choix ne faisait que *restreindre* les spots, et « sans bouger au
  stade » restait meilleur) ; pourquoi jamais 1-3 passages ; plus
  généralement, deux spots trop loin ou trop proches doivent être signalés
  à l'utilisateur. Placeholder « Léa » de l'assistant → « Prénom du
  coureur ».
- **Sémantique** : bascule « Meilleurs spots » (l'app choisit) / « Mes
  spots » (le plan passe par CHACUN des spots cochés, et seulement eux).
  `planOptions(…, requiredSpots)` : DP avec masque des spots visités,
  testée contre une recherche exhaustive. Stade + rue des Hautes Bièvres →
  4× en 610 m (1× stade, 3× Hautes Bièvres).
- **Explications** : `spotPairLimits` (lib/itinerary.ts, testée) détecte
  pour chaque paire ordonnée de spots cochés si l'on peut rattraper le
  coureur au passage suivant ; sinon explique « A → B : tu as X min, il en
  faut Y à pied » (X = jusqu'au début de la fourchette, marge de 3 min
  déduite — couvre « trop loin à pied » et « trop proches sur le
  parcours »). Combinaison impossible : alerte + `mostLimitingSpot`
  (« Essaie de décocher … ») et repli sur les meilleurs spots pour que le
  reste de l'app garde un plan. Chaque option affiche le détail par spot
  (« 1× Stade · 3× Rue des Hautes Bièvres »), les puces le nombre de
  passages par spot.
- 1-3 passages non proposés : au stade on en voit déjà 4 sans marcher, donc
  moins de passages n'économise rien (réponse donnée ; piste proposée :
  créneau de présence « j'arrive à / je pars à »).
- Corrigé : minutes de marche arrondies différemment entre l'option et
  l'explication (8 vs 9) → arrondi supérieur partout.
- Preview redéployée à la demande de l'utilisateur (`feat/spots-choisis` @
  5a80ffd, cible preview, prod non touchée) :
  https://semi-antony-supporter-7p0wcl5mj-pmachard2001-5765s-projects.vercel.app
  — Ready, `/` en 200.
- **Retour utilisateur** : stade + rue des Sources Prolongée affichait « ne
  s'enchaînent pas sur la même boucle » alors que le plan est possible
  (stade au départ puis rue des Sources) ; trop d'horaires et de messages,
  pas intuitif. Règle donnée : « si je coche un spot, c'est que je veux y
  aller, il faut pouvoir le caser ».
- **Simplifié** : plus aucun message quand la sélection est possible (le
  plan la case, c'est tout). `spotPairLimits` supprimée, remplacée par
  `incompatiblePairs` (paires qu'aucun plan ne peut réunir, quelle que soit
  la boucle) et `spotsToDrop` (spots dont le retrait suffit), testées. Si
  impossible : une seule alerte « Impossible de caser tous ces spots » +
  « X et Y sont trop éloignés à pied pour l'allure de Léa » ou « Décoche A
  ou B et les autres passent ». Compteurs « 3× » retirés des puces.
  Stade + rue des Sources → 4× en 1,2 km (stade au départ, puis 3× rue des
  Sources), sans message.
- **Retours utilisateur** : imaginer tous les trajets possibles d'un
  supporter, même non optimaux (« depuis le stade au départ on peut aller à
  tous les spots sauf Marius Hue ») ; carte blanche sur l'implémentation
  mais il faut que ce soit simple, sans réfléchir ni « 150 boutons », en
  gardant les meilleurs spots.
- Vérifié sur les données : depuis le départ, arrivée avant la fourchette
  du 1er passage de tous les spots sauf Marius Hue ; rue des Champs n'a que
  2 min de marge (statut « juste »). Marius Hue reste combinable avec le
  stade au tour suivant.
- **Trajets « justes » acceptés quand l'utilisateur impose ses spots** :
  `planOptions(…, acceptTight)` (arrivée avant le début de la fourchette,
  marge < 3 min), signalés ⚠️ « Juste » dans les étapes. Les « meilleurs
  spots » gardent la marge de 3 min.
- **UX simplifiée** : l'onglet Plan ne montre plus que la question
  « Combien de fois veux-tu voir Léa ? » + les options (meilleurs spots) et
  un bouton « Choisir mes spots ». Ce bouton ouvre un tiroir « Où veux-tu
  aller ? » : puces + une ligne de résultat en direct (« Tu verras Léa 4
  fois · 1,4 km à pied ») ; si impossible, une phrase (« décoche X ou Y »)
  et « Voir ce plan » désactivé — un plan impossible ne peut pas être
  validé. Une fois validé : bandeau « Tes spots : … · Modifier · Revenir
  aux meilleurs spots ». Si l'allure change et rend la sélection
  impossible : repli sur les meilleurs spots + lien « Modifier mes spots ».
  Sélecteur « Meilleurs / Mes spots » et alertes détaillées retirés de la
  page.
- Corrigé : focus automatique du tiroir sur la 1re puce (contour noir, la
  puce semblait cochée ; le tiroir étant hors du conteneur `.ui`) → focus
  sur le tiroir (ou le champ texte), style de focus global.
- Preview redéployée à la demande de l'utilisateur (`feat/spots-choisis` @
  3ce545c, cible preview, prod non touchée) :
  https://semi-antony-supporter-ekfayy31m-pmachard2001-5765s-projects.vercel.app
  — Ready, `/` en 200.

### 2026-10-18 — Point d'étape (historique : dépassé, voir « Où on en est » en haut)

- Branches empilées, rien de fusionné dans `main` (prod inchangée) :
  `main` → `feat/demo-finale` (poussée sur GitHub) → `feat/redesign` →
  `feat/plan-marche` → `feat/spots-choisis` (branche courante, dernière
  preview : https://semi-antony-supporter-ekfayy31m-pmachard2001-5765s-projects.vercel.app).
  Les trois dernières branches sont seulement locales.
- Le dépôt GitHub n'est pas relié à Vercel : previews via `npx vercel deploy`
  (CLI connectée, compte `pmachard2001-5765`), prod via `npx vercel --prod`
  (jamais fait sans accord explicite).
- Pistes ouvertes : créneau de présence « j'arrive à / je pars à » (proposé,
  pas encore validé) ; tests sur vrais iPhone/Android ; points à confirmer
  avec l'organisateur (date 2027, dénivelé, spots, 5 km, consigne) ;
  `npm audit fix` sur les dépendances de dev à valider.

### 2026-10-18 (suite) — Live centré sur le plan (branche `feat/live-plan`, depuis `feat/spots-choisis`)

- Retour utilisateur : Infos et Carte validées (il fournira le GPX officiel
  du tracé), Plan convient pour l'instant (avis demandé), Live : la partie
  « Le jour J » n'est pas comprise. Objectif : une version défendable
  devant le service des sports.
- Cause : sous « Le jour J », le Live listait les 3 premiers passages de la
  course tous spots confondus (dont rue Marius Hue, absente du plan), et le
  héros « Prochain passage » suivait tous les passages, pas le plan.
- **Live centré sur le plan** : `planProgress` (liveModel.ts, testée) donne
  l'étape en cours / la prochaine étape du plan choisi ; héros « Étape 2/7 ·
  Prochain passage », anneau calculé entre étapes du plan, état « Ton plan
  est terminé · Direction l'arrivée » quand la dernière étape est passée.
  Avant le jour J : section « Ton programme » (premières étapes du plan,
  « Étape 2 · 7 min à pied ») ; pendant : « Ensuite » (étapes suivantes,
  sans répéter celle du héros) ; lien « Tout mon plan ».
- Corrigé : cartes qui débordaient (grille élargie par une ligne non
  sécable) → `min-width: 0` ; ligne secondaire raccourcie.
- Preview redéployée (`feat/live-plan` @ e8b392a, cible preview, prod non
  touchée) : https://semi-antony-supporter-k0pven9qz-pmachard2001-5765s-projects.vercel.app — Ready.

### 2026-10-18 (suite) — 4 retouches de l'onglet Plan (branche `feat/plan-retouches`, depuis `feat/live-plan`)

- Demandées par l'utilisateur, d'après mon avis sur la page Plan :
  1. **Rappels remontés** : « Ajouter à mon agenda » juste sous les options
     (+ lien « Aussi des alertes dans l'app »), ancien bloc du bas retiré.
  2. **2 options par défaut** : « Sans bouger » et le maximum (+ l'option
     choisie si elle est au milieu) ; les autres derrière « Plus d'options ».
  3. **Le plan sur la carte** : `compute-walking-routes.ts` enregistre aussi
     le tracé réel de chaque trajet (15 paires, `walkingRoutes.paths`,
     event.json → 29 Ko) ; `planWalkingPaths` (testée) donne les trajets du
     plan dans le bon sens (repli ligne droite). Carte : pointillés orange
     par les rues, spots du plan cerclés d'orange, légende « Ton trajet à
     pied · 3,0 km » cliquable (zoom sur le trajet) ; bouton « Voir mon
     trajet sur la carte » dans le Plan (ouvre la carte cadrée dessus).
  4. « Juste (< 3 min) » → « Ça va être juste ».
- Preview redéployée (`feat/plan-retouches` @ c73a3b7, cible preview, prod
  non touchée) : https://semi-antony-supporter-ee7yxws1b-pmachard2001-5765s-projects.vercel.app — Ready.
- Branches poussées sur GitHub à la demande de l'utilisateur :
  `feat/redesign`, `feat/plan-marche`, `feat/spots-choisis`,
  `feat/live-plan`, `feat/plan-retouches` (+ `feat/demo-finale` déjà à
  jour). `main` non touchée. Le dépôt n'étant pas relié à Vercel, aucun
  déploiement automatique. La plus récente, qui contient tout le travail :
  `feat/plan-retouches`.

### 2026-10-18 (suite) — Parcours sur mesure, pointage, Cloudflare (branche `feat/sur-mesure`, depuis `feat/plan-retouches`)

- Demandes utilisateur : pointage « mon athlète est passé ici à telle
  heure » pour recaler les horaires (local pour l'instant) ; choisir ses
  spots directement sur la carte ; une seule option par défaut (le meilleur
  parcours) + parcours sur mesure, en gardant une ligne « reste au stade » ;
  hébergement gratuit pour 1000-2000 utilisateurs sur **Cloudflare Pages**
  (l'utilisateur a déjà un compte avec un site en production : nouveau
  projet Pages indépendant) avec circuit lien de test → production et mise
  à jour automatique des téléphones.
- Précision donnée : le meilleur parcours stade ↔ parc Heller n'a pas
  toujours 7 passages (6 à 4:30/km) → calculé selon l'allure, jamais « 7 »
  en dur.
- **Étape 1 — parcours sur mesure** : état simplifié dans `useSupporter`
  (`planKind` = best / stay / custom, `addSpot` qui refuse une combinaison
  impossible en disant quoi retirer, `removeSpot`, `useBestPlan`,
  `useStayPut`) ; options 5×/6× et tiroir de cases supprimés. Onglet Plan :
  carte « Le meilleur parcours · 7× · 3,0 km », une ligne alternative
  (« Reste au stade : 4 passages » ou « Revenir au meilleur parcours »),
  « Choisir mes spots sur la carte ». Onglet Carte : bouton « Ajouter » /
  « Dans ton parcours » sur chaque spot du carrousel, en-tête du tiroir
  « Ton parcours · 4 passages · 1,4 km », toasts de confirmation / refus
  (affichés sous l'en-tête sur la carte pour ne pas masquer le tiroir).
- **Étape 2 — pointage « Léa vient de passer »** (local à l'appareil) :
  `lib/checkin.ts` (testé) : `recalibratePassages` (passages d'avant
  inchangés, passage pointé = heure réelle, suivants projetés depuis le
  pointage, fourchettes repartant de zéro) avec une allure mêlant prévue et
  observée (`observedPace`, confiance = km / (km + 5) : un écart au km 2,7
  reflète souvent la cohue du départ) ; position du coureur recalée.
  `useSupporter` : pointage stocké (`semi-supporter:pointage`, valable pour
  l'événement, la course et le jour) ; tout l'app (plan, Live, carte,
  en-tête) utilise les passages recalés. Live : bouton jaune « Léa vient de
  passer au parc Heller » qui vise l'étape du plan la plus proche de
  maintenant (± 15 min, `checkinTarget`) — corrige un piège trouvé en test
  (coureur en retard → le héros affichait déjà l'étape suivante, le
  pointage aurait visé le stade : « 20 min d'avance ») ; une étape reste
  « Ouvre l'œil » 5 min après sa fourchette tant qu'elle n'est pas pointée.
  Toast « Pointé à 14:48 : 3 min de retard. Horaires recalés » + Annuler ;
  rappel « Horaires recalés sur ton pointage … Effacer ». Fiche spot :
  « Léa vient de passer ici » (passage le plus proche de maintenant, ± 25 min).
- **Étape 3 — passage à Cloudflare Pages** (choix utilisateur : gratuit,
  1000-2000 utilisateurs, lien de test → validation → production) :
  - `vercel.json` → `public/_headers` (mêmes en-têtes ; CSP + Cloudflare
    Web Analytics, `worker-src blob:`) et `public/_redirects` (/qr,
    /styleguide). `.node-version` = 22 pour le build Cloudflare.
  - `@vercel/analytics` retiré → beacon Cloudflare Web Analytics injecté
    seulement si `VITE_CF_ANALYTICS_TOKEN` (Production) et hors démo ;
    Cloudflare ne logge pas les query strings (FAQ). `track()` devient
    sans effet (pas d'événements personnalisés chez Cloudflare).
  - **Fond de carte hébergé** : extrait Protomaps du 2026-10-17 sur la zone
    du parcours (`pmtiles extract`, bbox 2.266,48.733 → 2.304,48.762,
    zoom ≤ 15, 3,5 Mo) dans `public/carte/`, affiché par
    `protomaps-leaflet` (thème clair/sombre, libellés en français).
    `event.json` → `map` (basemap, bounds, attribution). Plus aucune
    dépendance aux tuiles OSM (politique d'usage) ni à un quota. Les
    services de tuiles restent possibles via `VITE_TILE_PROVIDER`.
  - Hors-ligne : `src/pwa/basemap.ts` met le fichier entier en cache
    (« fond-de-carte », anciennes versions supprimées) 3 s après le
    lancement ; route Workbox CacheFirst + `rangeRequests` pour servir
    les lectures partielles depuis ce cache. **Testé** (build, serveur
    local avec en-têtes `_headers` et requêtes Range, Edge headless) :
    réseau coupé → 16 tuiles dessinées en vue d'ensemble, 12 au zoom sur
    le trajet, pas de plan de secours, aucune violation CSP.
  - Carte : zoom par quarts de palier, cadrage refait une fois la taille
    du conteneur connue (le parcours entier tient au-dessus du tiroir).
  - `scripts/build-basemap.ts` pour régénérer le fond (affiche le bloc
    `map` à reporter dans event.json, qui garde sa mise en forme).
  - README : section « Héberger gratuitement : Cloudflare Pages » (mise en
    place, circuit test → prod, rollback, analytics).
- L'utilisateur crée le projet Cloudflare Pages (son compte a déjà un autre
  site en production). Réponse donnée : projets Pages isolés (sous-domaine,
  déploiements, variables propres) ; points d'attention : autoriser ce
  dépôt dans l'app GitHub de Cloudflare, nom de projet distinct, ne pas
  réutiliser le domaine de l'autre site, quota partagé de 500 builds/mois
  et 1 build simultané ; app 100 % statique → pas de consommation du quota
  Workers/Functions.
- **Premier build Cloudflare (journal collé par l'utilisateur)** : projet
  créé comme **Worker** (Workers Builds, `npx wrangler deploy`), pas Pages.
  Build de `main` réussi (ancienne version) mais déploiement en échec :
  sans config, wrangler tente une auto-configuration (installation de
  `@cloudflare/vite-plugin`) qui plante (`npm error Cannot read properties
  of null (reading 'edgesOut')`). Décision : garder le Worker (voie
  recommandée par Cloudflare, mêmes avantages).
  - `wrangler.jsonc` : assets seuls (`./dist`), SPA, `preview_urls`.
  - Testé avec `wrangler dev` 4.151.1 : en-têtes de `_headers` appliqués ;
    **les requêtes Range sont ignorées (200 au lieu de 206)** → le fond de
    carte est désormais chargé en entier puis découpé en mémoire
    (`wholeFileSource`, dépendance directe `pmtiles` 3.2.1), route Workbox
    Range supprimée, plan statique de secours si le fichier est
    inaccessible. `_redirects` supprimé (`/qr` → 307 vers `/`).
    Vérifié : `/qr` affiche la page QR, carte en ligne et hors-ligne (16 et
    12 tuiles), aucune violation CSP.
  - `main` reste sans `wrangler.jsonc` : son build échouera jusqu'à la
    fusion validée → la production n'est pas publiée par accident.
  - README : section hébergement réécrite pour les Workers (variables de
    build, builds des branches non-production, lien de test, rollback).
- L'utilisateur active « Builds for non-production branches » sur le
  Worker ; commit de journal poussé pour relancer le build de
  `feat/sur-mesure` (lien de test attendu dans le journal du build).
- **Premier déploiement Cloudflare réussi** (build fd3854be, commit
  63b05bb de `feat/sur-mesure`) — mais via `npx wrangler deploy` (commande
  de *production*) : la version de la branche est servie sur l'adresse
  principale https://semi-antony-supporter.p-machard-2001.workers.dev
  (pas un lien de test par branche). Sans conséquence (adresse non
  communiquée), à corriger dans Settings → Build : branche de production
  `main`, commande des branches non-production `npx wrangler versions
  upload`. Le check GitHub du commit affiche « failure » malgré le
  journal « Success » (non élucidé).
  Vérifié sur l'adresse réelle : `/`, `/qr`, `/styleguide`, `sw.js`,
  `event.json`, manifest, fond de carte en 200 ; en-têtes (CSP, HSTS,
  X-Frame-Options, Cache-Control) appliqués ; Edge headless : carte
  en ligne puis hors-ligne (16 / 12 tuiles), onglet Plan OK, aucune
  violation CSP.
- Build de branche 4ec8fe46 (0e5ea5f) en échec : la commande des branches
  non-production est `npx wrangler preview` (fonction « Previews » en
  bêta), qui exige un bloc `previews` dans la config → `"previews": {}`
  ajouté à `wrangler.jsonc`. (Le check GitHub « failure » du build
  fd3854be correspondait peut-être à cette même étape.)
- **Lien de test de branche opérationnel** (build 51c2c48a, a0ac971) :
  https://feat-sur-mesure-semi-antony-supporter.p-machard-2001.workers.dev
  — rangé dans le tableau de bord sous Previews → feat-sur-mesure (pas
  dans la liste des builds). Format : `<branche>-semi-antony-supporter.p-machard-2001.workers.dev`.
  Vérifié : pages, sw.js, event.json, fond de carte en 200, en-têtes de
  sécurité appliqués, carte hors-ligne (16 / 12 tuiles).

### 2026-10-18 (suite) — Points libres et pointage à l'heure choisie (branche `feat/sur-mesure`)

- Précision de l'utilisateur : « choisir des spots » voulait dire toucher
  **n'importe où** sur le parcours (pas seulement les 6 spots), et le
  pointage doit pouvoir se faire en tout lieu et à une heure donnée. Choix
  validé : marche vers un point libre **estimée** (vol d'oiseau × 1,3),
  hors-ligne, aucune position envoyée.
- `lib/freeSpot.ts` (testé, 6 tests) : `coursePointAt` (projection sur le
  tracé, refus au-delà de 150 m, km à l'échelle officielle), `passageKms`
  (un passage par boucle), `freeSpotToSpot` (« Km 3,4 », « au km 3,4 »,
  `free: true`), `nearestPassageKm` (boucle dont l'heure prévue est la plus
  proche de l'heure pointée).
- `useSupporter` : points libres gardés sur l'appareil
  (`semi-supporter:points-libres`) et ajoutés aux spots de la course
  (`race` ; `officialRace` sans eux). Le meilleur parcours reste calculé
  sur les spots officiels. `addSpot(id, nouveauPoint?)` vérifie la
  faisabilité avec le point avant de l'enregistrer ; retirer un point libre
  du parcours l'oublie. `passagesWith(spots)` (passages recalés).
  Pointage : champ `label` pour un lieu qui n'est pas un spot.
- Carte : toucher (ou appui long) le tracé → marqueur « + » et carte
  « Km 3,1 · point choisi · Passages vers 14:47, 15:26, 16:04 » avec
  « Ajouter à mon parcours » et, le jour J, « Pointer le passage de Léa
  ici » ; hors du tracé → toast « Touche le tracé du parcours… ». Points
  libres affichés en pointillés orange, numérotés à la suite.
- Pointage à l'heure choisie : tiroir « Pointer un passage » (« À quelle
  heure as-tu vu Léa au km 1,4 ? », stepper à la minute, de l'heure du
  départ à maintenant) ; ouvert depuis un point de la carte ou la fiche
  d'un spot (« C'était plus tôt ? Indiquer l'heure » / « Pointer un passage
  ici »). Vérifié : km 1,4 pointé à 15:32 → boucle 2 (km 8,4) retenue,
  « 16 min de retard », rappel Live « Horaires recalés sur ton pointage :
  Km 1,4 à 15:32 ».
- **Bug existant corrigé** : les libellés `.sr-only` du carrousel (position
  absolue) échappaient au défilement → page élargie (1560 px au lieu de
  390, tiroirs hors écran) dès qu'on sélectionnait un spot lointain.
  `.carousel { position: relative }`.
- **Mise en production demandée par l'utilisateur** (« tu peux déjà mettre
  ça en production ») : `main` avancé en avance rapide sur `feat/sur-mesure`
  (55 commits, de 2b05fa8), poussé → build de production Cloudflare
  (`npx wrangler deploy`) sur https://semi-antony-supporter.p-machard-2001.workers.dev.
- Le build de `main` (a477a404, e21f860) est parti en **preview**
  (`main-semi-antony-supporter…workers.dev`, à jour) et non en production :
  la branche de production configurée dans Cloudflare n'est pas `main`.
  L'adresse principale sert toujours la version du build fd3854be (sans
  points libres). À corriger dans Settings → Build → Branch control.

### 2026-10-18 (suite) — Spots revus d'après le terrain (branche `feat/sur-mesure`)

- Origine des spots (question de l'utilisateur) : créés au prototype des
  30-31/07 (commits 0404940 → 4972da4), calés sur le GPX et des adresses,
  jamais vérifiés sur le terrain.
- Retours de l'utilisateur (capture `docs/`, point rouge posé en mode
  calibrage) : le départ (avenue) et l'arrivée (dans le stade) sont deux
  endroits ; le « parc Heller » n'est pas un vrai spot (le parcours traverse
  le parc sur plusieurs centaines de mètres) ; on voit bien les coureurs au
  point rouge, accessible depuis le départ en remontant la rue du parcours,
  avec un **ravitaillement** ; un autre ravitaillement au premier virage à
  gauche.
- Mesures : point rouge = km 2,37 (15 m du tracé, 163 m du départ à vol
  d'oiseau) ; premier virage à gauche = km 0,13, à l'entrée du stade, là où
  se termine chaque boucle (fin du GPX, 129 m du départ).
- `event.json` : spots dans l'ordre du parcours — 1 Départ (km 0, avenue
  François-Molé), 2 Rue Marius Hue, 3 **Ravito sud du stade** (km 2,37 /
  9,37 / 16,37, remplace le parc Heller), 4 Rue des Champs, 5 Rue des
  Sources Prolongée, 6 Rue des Hautes Bièvres, 7 **Stade Georges Suant**
  (entrée du stade : km 7 / 14 / 21,1). `aidStations` (km 0,13 et 2,37).
  Hypothèse à confirmer : les fins de boucle 1 et 2 passent à l'entrée du
  stade (et pas sur la ligne de départ).
- Distances à pied recalculées (OSRM) : départ → ravito 180 m, départ →
  stade 140 m, stade ↔ ravito 320 m. Meilleur parcours à 5:30 : **7
  passages, 1,8 km à pied** (avant : 3,0 km) — départ, puis ravito ↔ stade.
  « Sans bouger » (`stayPutOption`, ≤ 200 m de marche) : départ + 3× stade
  (sinon l'app proposait 3× rue Marius Hue à 0 m).
- Carte : ravitaillements en badge gobelet sur le spot concerné (marqueur à
  part s'il n'y a pas de spot à moins de 50 m), légende « Ravitaillement » ;
  légendes sur une ligne ; en mode calibrage, les légendes sont masquées
  (elles cachaient la bannière de position, visible sur la capture).
- Plan statique de secours régénéré ; tests réalignés sur les nouveaux spots
  (228 ✅).
- Accord de l'utilisateur (« c'est bon pour main, mets en production ») ;
  branche de production Cloudflare réglée sur `main` par l'utilisateur.
  `main` avancé sur `feat/sur-mesure` et poussé.
- Build de `main` 542770de (0337024) **encore parti en preview**
  (alias `main-…workers.dev`, à jour : points libres + ravito sud) :
  l'adresse principale sert toujours l'ancienne version (bundle
  index-BoF7cNKT, sans points libres) → l'utilisateur ne pouvait pas
  toucher la carte pour ajouter un point. Réglage Cloudflare à revoir.
- Réglage Cloudflare corrigé par l'utilisateur ; commit poussé sur `main`
  pour relancer le build de production.
- **Production à jour** (build e64ac0cf, e3f7ff6, déployé en production
  cette fois) : https://semi-antony-supporter.p-machard-2001.workers.dev
  sert la nouvelle version (points libres, ravito sud). Scénario rejoué sur
  la production (Edge headless) : point km 3,1 touché → horaires, ajout au
  parcours, pointage km 1,4 à 15:32 → « 16 min de retard », rappel Live.
- Retour utilisateur : le spot 7 n'est pas « le stade » mais un
  ravitaillement. Renommé **Ravito du virage** (`ravito-virage`, premier
  virage à gauche à l'entrée du stade) ; il garde les fins de boucle 1-2 et
  l'arrivée (choix de l'utilisateur : même endroit pour un supporter) et la
  mise en avant. Distances à pied conservées (mêmes coordonnées, clés
  renommées). « Sans bouger » → « Reste au ravito du virage : 4 passages ».
- Carte : les spots qui se chevauchent au zoom courant (< 36 px) sont
  réunis en un marqueur « 1·3·7 » (`groupOverlapping`, testé) ; le toucher
  zoome jusqu'à les séparer. Sélection depuis le carrousel : zoom 16 au
  moins (spots voisins séparés).
- Accord de l'utilisateur (« oui mets en production ») : `main` avancé sur
  `feat/sur-mesure` (ravito du virage, spots regroupés) et poussé.
- Production vérifiée (build f7d4eac3, 1c3cf50) : `event.json` servi avec
  `ravito-virage`, marqueur groupé « 1·3·7 » affiché en vue d'ensemble.

### 2026-10-19 — 3 repères + points libres partout (branche `feat/sur-mesure`)

- Retour utilisateur (capture iPhone dans `docs/`) : en vue d'ensemble, le
  regroupement donnait une énorme pastille « 1·3·6·7·8·9 » qui cachait le
  parcours ; idée de l'utilisateur : supprimer les spots prédéfinis et ne
  garder que les points touchés. Avis donné (garder un parcours par défaut
  et des distances fiables) → choix validé : **3 repères seulement**.
- `event.json` : spots = Départ, Ravito sud, Ravito du virage (rues Marius
  Hue, des Champs, des Sources Prolongée, des Hautes Bièvres supprimées).
  Meilleur parcours par défaut inchangé (7 passages, 1,8 km à 5:30).
- **Grille de distances à pied** (`scripts/compute-walking-grid.ts`) :
  70 points tous les 100 m le long de la boucle, 4 900 distances OSRM
  piéton (tables par blocs de 25), `races[].walkingGrid` (event.json
  29 → 34 Ko). `lib/walkingGrid.ts` (testé) : un point libre est rattaché
  au point de grille le plus proche → distance par les rues (à 100 m près)
  au lieu du vol d'oiseau ; `withGridRoutes` complète les distances des
  points libres sans toucher aux itinéraires exacts entre repères.
- Carte : plus de pastille groupée. Les spots qui se chevauchent sont
  écartés en éventail autour de leur position (trait + petit point à la
  position réelle), chacun reste lisible et touchable. Cadrage initial
  calculé avec la hauteur réelle du tiroir (la carte était trop dézoomée
  sur iPhone).
- Tests : les combinaisons de l'ancienne version sont rejouées avec des
  points libres aux mêmes km (grille) — 233 ✅. Captures de `docs/` exclues
  du dépôt (`.gitignore`) : elles montrent des prénoms. La première
  capture (« Paul »), versionnée en d1b42d0 puis supprimée en 0337024,
  reste dans l'historique Git (et sur GitHub).
- Accord de l'utilisateur (« c'est bon mets en production ») : `main` avancé
  sur `feat/sur-mesure` (3 repères, grille de distances, éventail) et poussé.
- Production vérifiée (e6dadcb) : `event.json` avec `walkingGrid` et sans
  les anciennes rues ; scénario point libre + pointage rejoué sur
  l'adresse principale.
- Avis donné sur le prototype avant contact de la mairie (prêt pour une
  première prise de contact, données à confirmer présentées comme telles) ;
  mail de proposition rédigé (dans la conversation, non versionné) avec le
  lien de démo `?demo=1&now=15:35&name=Léa&pace=5:30`. Conseil : renommer
  l'adresse (sous-domaine `workers.dev` du compte, ou domaine personnalisé)
  avant l'envoi.
- Adresse renommée par l'utilisateur (sous-domaine `workers.dev` du compte :
  `p-machard-2001` → `semi-supporter`, pour ne pas exposer son nom dans le
  lien envoyé à la mairie). Effet sur tout le compte : l'adresse de secours
  `workers.dev` de son autre site change aussi ; son domaine
  `atelier-fitness.com` répond toujours (200). L'ancienne adresse du semi
  ne répond plus. Vérifié : nouvelle production et lien de branche en 200,
  `event.json` à jour, lien de démo → « Étape 5/7 · Ravito du virage ».

### 2026-10-19 — Vérifications avant l'envoi du mail à la mairie

- **Sécurité** (sur la production) : en-têtes CSP, HSTS, X-Frame-Options,
  nosniff, Referrer-Policy, Permissions-Policy, COOP présents ; aucun
  fichier sensible exposé (`/.git/config`, `/.env`, `package.json`,
  `wrangler.jsonc`, sources, `CLAUDE.md`, `docs/`… → page de l'app) ; pas
  de source maps ; aucun secret dans le build ; `npm audit --omit=dev` : 0
  vulnérabilité (4 alertes sur les outils de dev seulement : vitest,
  nanoid, source-map-js — non embarqués).
- **Parcours complet** (navigateur neuf, profil iPhone) : assistant →
  4 onglets → lien de démo (accent non encodé) → /qr. **Un seul domaine
  contacté** (le site lui-même, 42 requêtes), aucun paramètre envoyé à un
  tiers, aucune erreur console / CSP / HTTP.
- **Incohérences corrigées** : l'assistant annonçait « 3 fois sans bouger »
  alors que le Plan propose « 4 passages » sur place → même option
  (`stationaryPlan`), « en restant sur place » ; infos « Départ et
  arrivée » précisées (départ avenue, arrivée dans le stade après le ravito
  du virage) ; `contentVersion` 2026-10-19.1.
- Lighthouse : accessibilité 100, SEO 91 (robots.txt invalide → ajout de
  `public/robots.txt` « Disallow: / » : pas d'indexation tant que le
  prototype n'est pas validé). Performance / bonnes pratiques non mesurées
  (erreur NO_NAVSTART de Lighthouse avec Edge headless, 3 essais).
- Accord de l'utilisateur (« ouais vasy ») : corrections des vérifications
  mises en production (`main` avancé sur `feat/sur-mesure`).
- Production vérifiée (2198fd8) : contenu 2026-10-19.1, robots.txt servi,
  assistant « 4 fois en restant sur place », audit rejoué (un seul domaine,
  aucune erreur). Prêt pour l'envoi du mail.
- **Bug signalé par l'utilisateur** (lien de démo à 15:35) : le bouton
  « … vient de passer » faisait des va-et-vient entre ravito du virage et
  ravito sud. Reproduit : (1) le bouton visait une étape prévue 12 min
  plus tard (fenêtre ± 15 min) → pointer « en avance » faisait proposer
  l'étape suivante ; (2) un seul pointage est gardé, et une étape d'avant
  le dernier pointage n'était pas considérée comme passée → retour au
  spot précédent. Corrigé (`liveModel.ts`, testé) : fenêtre asymétrique
  (5 min d'avance, 20 min de retard au plus) ; `passedByCheckin` : toutes
  les étapes jusqu'au km pointé sont passées. Vérifié : un clic, horaires
  recalés, plus de bouton jusqu'au passage suivant.
- Lien de démo conseillé pour le mail : `now=15:20` (« Là ! maintenant »
  au ravito sud, pointage → « 2 min d'avance »).
- Accord de l'utilisateur (« oui mets en production ») : correction du
  va-et-vient mise en production (`main` avancé sur `feat/sur-mesure`).
- Production vérifiée (e3209a0) : scénario du va-et-vient rejoué sur
  l'adresse principale → un clic, puis plus de bouton (corrigé).
- Mail final redonné à l'utilisateur : liens de base et de démo
  (`?demo=1&now=15:20&name=Paul&pace=5:30`), « Léa » remplacé par « Paul ».
- Question de l'utilisateur (« ça fait toujours des va-et-vient si
  j'efface ») : vérifié en production, comportement attendu — « Effacer »
  annule le pointage et rétablit les horaires prévus ; en démo l'heure est
  figée (15:20), donc on retombe toujours sur le même écran. Principe
  expliqué.
- 2026-10-19 : l'utilisateur envoie le mail de proposition à la mairie
  (production : https://semi-antony-supporter.semi-supporter.workers.dev,
  `main` = e3209a0 + journal). Suite attendue : réponse de la mairie
  (validation, tracé officiel, date 2027, ravitos).

### 2026-10-23 — Multi-courses (branche `feat/multi-courses`, depuis `feat/sur-mesure`)

- Prompt « Démos multi-courses » de l'utilisateur : un dossier par course,
  mode démo non officielle, import GPX, 5 démos (Vincennes, Rambouillet,
  Joinville, Malakoff, Charenton), tableau de bord. **Règle absolue :
  la production d'Antony est gelée** (lien envoyé à la mairie) : rien
  dans `main`, aucun déploiement sur le Worker `semi-antony-supporter`
  (seules les previews de branche, automatiques, sont permises).
- **Étape 0** : état des lieux (tâches 1 et 2 du prompt précédent déjà
  faites ; pas de bug d'arrivée : départ km 0 + ravito du virage Fin
  boucle 1 / Fin boucle 2 / Arrivée, choix utilisateur du 19/10 ; aucun
  GPX ni dossier `courses/` fourni). Tag annoté
  **`antony-prod-avant-multi`** sur `e3209a0` (prod, version Cloudflare
  `ae3f3563-3d09-440f-8fae-3462527b93b9`), poussé — vérifié : aucun build
  déclenché. Procédure de retour arrière en 2 min dans le README.
- Références de non-régression capturées AVANT toute modification :
  `tests/reference/antony-logique.json` (allures 4:30/5:30/6:30, temps
  visés 1:35/1:56/2:17 : passages, options, meilleur parcours, sur place,
  recalage démo Paul 15:20 ; test `src/reference/antony.reference.test.ts`)
  et `tests/reference/antony-ui.json` (17 scénarios, 83 écrans, textes
  relevés sur la production par `scripts/reference-ui.mjs`, stable sur
  deux passages ; `puppeteer-core` en dépendance de dev, sans navigateur
  embarqué).
- **Étapes 1 et 2** (architecture, mode démo) :
  - `git mv` : `src/` et `index.html` → `app/` ; données et fichiers
    d'Antony (`event.json`, `annonces.json`, icônes, favicon, fond de carte,
    plan de repli) → `courses/antony/` ; `public/` supprimé. Manifeste et
    robots.txt générés depuis `event.json` (`scripts/lib/course.ts`,
    `prepareCoursePublic` → `node_modules/.course/<slug>/public`, servi par
    Vite comme `publicDir`) ; `app/index.html` à marqueurs %…%. Alias Vite
    `@course` → `courses/<slug>/`. Scripts slug-aware (routes, grille,
    fond de carte, plan, icônes) ; `import-track.ts` supprimé (remplacé
    par l'import GPX).
  - `npm run dev|build|preview -- <slug>` (`scripts/course-run.mjs`, Antony
    par défaut), `npm run new-course -- <slug>` (copie `courses/_modele/`,
    icônes via sharp), `npm run deploy -- <slug>` (Worker dédié par course,
    config wrangler générée hors dépôt) — **refuse Antony** (vérifié).
  - `event.json` : `status` (`demo` / `prototype` / `official`),
    `organizer`, `app` (noms, couleurs du manifeste), `deploy` (Worker,
    URL), `event.dateText`, `race.aConfirmer`, `spot.aConfirmer`. Antony :
    `status: "prototype"` pour rester identique (pas de bandeau démo).
    Tracé vide autorisé : page « Parcours à venir » (date, départ,
    distance, à confirmer) à la place de Live / Plan / Carte.
  - Mode démo (`status: "demo"`) : bandeau permanent « Démo non officielle —
    préparée pour … », `<meta name="robots" content="noindex, nofollow">`,
    robots.txt `Disallow: /` (pas de sitemap), pied de page « Application
    non officielle, en attente de validation par l'organisateur. Parcours
    et horaires indicatifs. »
  - **Non-régression d'Antony** : build identique à la prod (manifeste,
    robots.txt, index.html hors un commentaire, données) et
    `scripts/reference-ui.mjs compare` → **identique (17 scénarios)** ;
    236 tests ✅. Deux serveurs Vite oubliés (ports 5173 et 5181) arrêtés :
    ils bloquaient le renommage de `src/`.
- **Étape 3 (en cours, pause demandée par l'utilisateur)** : logique d'import
  GPX écrite et testée (`app/src/lib/gpxImport.ts`, 10 tests) : lecture GPX
  avec altitudes, dénivelé lissé (moyenne ± 50 m + hystérésis 2 m),
  Douglas-Peucker (5 m), recalage sur la distance officielle (alerte > 2 %),
  passages multiples (< 40 m, > 1 km d'écart), candidats réguliers tous les
  2,5 km + départ/arrivée. Moteur : un point touché sur un tracé « parcours
  entier » (loops = 1) trouve tous ses passages (`passagesThrough`, testé).
  **Reste à faire** : `scripts/import-gpx.ts` (écriture dans event.json,
  candidats `aConfirmer`, géocodage Nominatim 1 req/s), puis étapes 4
  (5 configs), 5 (tableau de bord, QR), 6 (vérifications), procédure de
  bascule d'Antony. Rien n'est poussé sur GitHub pour l'instant ; la
  production d'Antony n'a pas été touchée.
- **Étape 3 terminée** : `npm run import-gpx -- <slug>` (`scripts/import-gpx.ts`)
  écrit tracé simplifié, dénivelé, emprise, candidats `aConfirmer` (★
  passages multiples, 6 max espacés de 800 m ; réguliers tous les 2,5 km avec
  tous leurs passages, doublons < 300 m écartés), noms de rue Nominatim
  (1 req/s). `formatEventJson` / `writeCourseEvent` (scripts/lib/course.ts) :
  mise en forme compacte commune ; `build-basemap.ts` écrit désormais
  `map.basemap` / `map.bounds` lui-même ; grille de marche à pas adaptatif
  (≈ 70 points, 100 m pour Antony → inchangé). Bornes km superposées
  fusionnées (« km 7 · 14 · 21 ») sur un tracé entier. Testé de bout en bout
  sur une course temporaire construite à partir du tracé d'Antony (3
  boucles bout à bout) : meilleur candidat trouvé = entrée du stade (km
  0,1 · 7 · 14,1 · 21,1, 4 passages), écart de distance +0,4 %, carte et
  écrans OK ; course supprimée ensuite. README : procédure « Ajouter une
  course » en 5 étapes et doc de l'import.
- **Étape 4** : 5 dossiers créés par `npm run new-course` puis remplis avec
  les seules infos du tableau du prompt (tout `aConfirmer` /
  `dateToConfirm`) : `vincennes` (semi, 9:30, 2 boucles différentes → tracé
  entier), `rambouillet` (semi, 9:00, 14/03/2027), `joinville` (semi 8:45 +
  10 km), `malakoff` (10 km en 2 boucles de 5 km + 5 km, 11:15, 06/02/2027),
  `charenton` (15 km). Dates inconnues : date provisoire un week-end +
  `dateText` (« octobre 2027 », « mars ou avril 2027 », « mi-février
  2027 »). Heures inconnues (10 km de Joinville, 5 km de Malakoff,
  Charenton) : valeur provisoire marquée à confirmer et notée dans SUIVI.md.
  Couleurs d'ambiance sans charte officielle (Vincennes sarcelle, Rambouillet
  vert forêt, Joinville bleu Marne, Malakoff orange-rouge, Charenton violet),
  icônes générées à la couleur. Aucun GPX fourni → aucun tracé : les 5
  démos affichent « Parcours à venir ». Les 5 builds passent (titre,
  noindex) ; Antony reste le build par défaut.
- **Étape 5** : `npm run courses` (`scripts/courses.ts`) : statut de chaque
  course (prête / GPX à importer / en attente du GPX / spots à valider),
  URL et si elle répond (`--hors-ligne` pour ne pas tester ; 404 →
  « non déployée »), nombre de points à confirmer, lien démo (heure = 50 min
  après le premier départ ; Antony : Paul 15:20), prochaine action (section
  « Prochaine action » de SUIVI.md). Écrit `courses/TABLEAU.md` et
  `courses/<slug>/assets/qr-demo.png` (dépendance de dev `qrcode` ; le QR
  n'est pas embarqué dans l'app). État : Antony prête et en ligne, 5 démos
  en attente du GPX, non déployées.
- **Étape 6 — vérifications** :
  - 249 tests ✅ (dont non-régression des calculs d'Antony), lint OK
    (1 avertissement habituel), 6 builds OK ; `npm run new-course -- test`
    → build OK → supprimée.
  - Antony : `reference-ui.mjs compare` sur le build final → **identique
    (17 scénarios)**. Pas de « bug d'arrivée » à signaler (déjà corrigé
    le 19/10, cf. étape 0).
  - **Risque de page blanche trouvé et corrigé** pour la bascule : une page
    restée ouverte sur l'ancienne version (saisie en cours → l'app attend
    avant de recharger) qui ouvre la Carte demande l'ancien fichier
    MapTab ; avec le nouveau service worker et sans cache HTTP → 404 →
    page blanche, prénom perdu (reproduit). Corrections : (1)
    `scripts/fetch-legacy-assets.ts` récupère les fichiers JS/CSS/polices
    de la version EN LIGNE (20 fichiers, 924 Ko, `courses/antony/
    legacy-assets/`) ; le build les sert à leur adresse d'origine, hors
    précache (`manifestTransforms`) ; (2) `importOrReload` : si un écran
    chargé à la demande manque après une future mise à jour, la page se
    recharge (état conservé) au lieu de planter. Répétition depuis une
    **copie exacte de la production** (bundle index-21lbHY4s) vers le
    nouveau build, sans cache HTTP : scénario normal (rechargement auto) et
    saisie + Carte → carte affichée, prénom conservé ; hors-ligne OK.
  - Deux apps côte à côte (Antony et Rambouillet, deux origines) :
    manifestes, titres, couleurs, service workers, caches et prénoms
    mémorisés séparés ; les deux installables ; noindex seulement sur la
    démo. Noms d'icône raccourcis (« Rambouillet »…), `--icone` dans
    new-course.
  - `.oxlintrc.json` : écrasé par erreur puis restauré depuis Git, seule
    l'exclusion `legacy-assets/` ajoutée.
  - README : procédure de bascule pas à pas + retour arrière.
- Branche `feat/multi-courses` poussée (7b1cc9b) → build Cloudflare de
  preview (47c0d86c, sous Previews → feat-multi-courses) réussi avec la
  nouvelle architecture : `reference-ui.mjs compare
  https://feat-multi-courses-semi-antony-supporter.semi-supporter.workers.dev`
  → **identique (17 scénarios)** ; ancien fichier carte servi (200), absent
  du précache. Production inchangée (bundle index-21lbHY4s, aucun build
  sur `main`). Reste : connexion wrangler de l'utilisateur pour déployer les
  5 démos (Workers dédiés), GPX des 5 courses, bascule d'Antony (à
  déclencher par l'utilisateur).

### 2026-10-24 — Mise à jour de CLAUDE.md

- À la demande de l'utilisateur : sections du haut réécrites pour refléter
  tout le projet (multi-courses, hébergement Cloudflare par course, règles
  absolues dont le gel de la production d'Antony, conventions et chemins
  `app/` / `courses/`, commandes, points à confirmer par course, état au
  24/10). L'ancien point d'étape du 18/10 reste dans le journal, marqué
  comme dépassé. Prochaine action de l'utilisateur : `npx wrangler login`,
  puis dépôt des GPX.
- Connexion wrangler faite par l'utilisateur (`npx wrangler login`,
  wrangler 4.152.0, compte 4a1d84c16b651f5917bf27a89105573f) : déploiement
  des démos possible (`npm run deploy -- <slug>`). Aucun GPX déposé pour
  l'instant.

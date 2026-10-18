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

## Où on en est (fin de session du 2026-10-18)

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

# Semi d'Antony — Assistant Supporter

Web app mobile-first, **installable sur téléphone (PWA)** et **utilisable
hors-ligne**, qui répond à *« où je me place et à quelle heure mon coureur
passe ? »* pour les supporters du semi-marathon d'Antony (3 boucles de 7 km).

Pas de compte, pas de backend : un lien (ou un QR code) suffit. Tout est
calculé sur le téléphone à partir de `courses/<slug>/event.json`. Le prénom et
l'allure restent sur l'appareil.

## URLs utiles

| URL | Usage |
| --- | --- |
| `/?name=Léa&pace=5:30` | Lien de suivi partagé (`runner=` est toujours accepté) |
| `/?demo=1&now=14:40&name=Léa&pace=5:30` | Mode démo : simule le jour J à 14:40 (l'heure avance en temps réel) |
| `/?race=5k` | Choix de la course (si plusieurs courses dans event.json) |
| `/?calibrage=1` | Clic sur la carte → position km sur la boucle (pour caler les spots) |
| `/qr` | QR code imprimable vers l'app (affiches, stand des dossards), non lié dans l'app |
| `/styleguide` | Design system : tous les composants et états (non lié dans l'app) |
| `#live`, `#plan`, `#carte`, `#infos` | Onglet ouvert directement (ex. `/?name=Léa&pace=5:30#plan`) |

## Structure : un moteur, un dossier par course

```
app/                           Le code commun (moteur, écrans, PWA) — un correctif profite à toutes les courses
  index.html                     Page (titre, couleurs, robots remplis depuis event.json au build)
  public/_headers                En-têtes de sécurité et de cache (Cloudflare)
  src/lib/                       Logique pure, testée (*.test.ts) :
    timing.ts                      horaires de passage, étiquettes Départ/Boucle/Fin boucle/Arrivée
    itinerary.ts                   temps de marche, faisabilité, meilleur parcours (DP)
    checkin.ts, freeSpot.ts        pointage « il vient de passer », points libres sur la carte
    walkingGrid.ts, geo.ts         distances à pied (grille), géométrie
    dayStatus.ts, clock.ts         mode jour J, fuseau, mode démo
    event.ts                       modèle de event.json, statut démo / prototype / officiel
  src/app/                       Écrans : assistant, Live, Plan, Carte, Infos, page /qr
  src/ui/                        Design system (tokens.css), marque par course (branding.ts)
  src/pwa/                       Service worker, installation, fond de carte hors-ligne
courses/
  _modele/                       Modèle copié par `npm run new-course -- <slug>`
  <slug>/                        Une course = un projet :
    event.json                     config complète (course(s), spots, thème, statut, déploiement)
    annonces.json                  annonces de l'organisateur
    parcours.gpx                   tracé source (déposé à la main)
    SUIVI.md                       fiche projet (contacts, sources, à confirmer, historique)
    assets/                        icônes, favicon, plan de repli, fond de carte (carte/*.pmtiles)
scripts/
  course-run.mjs                 npm run dev|build|preview -- <slug>
  new-course.ts, deploy-course.ts, import-gpx.ts, courses.ts …
  lib/course.ts                  outils communs (dossier d'une course, manifeste, robots)
tests/reference/               Références de non-régression d'Antony (calculs et écrans)
wrangler.jsonc                 Worker de la PRODUCTION D'ANTONY (build automatique depuis main)
```

## Multi-courses : commandes

```bash
npm run dev -- vincennes          # serveur de dev d'une course (Antony sans argument)
npm run build -- vincennes        # build d'une course dans dist/
npm run new-course -- <slug> --nom "Semi de X" --couleur "#1f6f8b" --organisateur "Club Y"
npm run import-gpx -- <slug>      # tracé + spots candidats depuis courses/<slug>/parcours.gpx
npm run deploy -- <slug>          # déploie la course sur SON Worker (jamais celui d'Antony)
npm run courses                   # tableau de bord des courses (courses/TABLEAU.md)
```

Chaque course est une app indépendante, sur sa propre URL
(`https://<slug>.semi-supporter.workers.dev`) : service worker, cache et
données mémorisées ne se mélangent pas. Le déploiement d'une démo demande
d'être connecté à Cloudflare une fois : `npx wrangler login`.

`npm run build` **sans argument construit Antony** : c'est ce que lance le
build automatique de Cloudflare pour la production d'Antony. Le script de
déploiement refuse le Worker `semi-antony-supporter`.

Statut d'une course (`event.json` → `status`) :
- `demo` : bandeau permanent « Démo non officielle — préparée pour … »,
  `noindex, nofollow`, robots.txt fermé, pied de page « non officielle,
  parcours et horaires indicatifs », aucun logo officiel ;
- `prototype` : non officielle, sans bandeau (Antony) ;
- `official` : validée par l'organisateur (indexable).

## Ajouter une course (≈ 30 min avec le GPX)

1. **Créer le dossier** : `npm run new-course -- <slug> --nom "Semi de X" --court "Semi de X" --couleur "#2e6b3a" --organisateur "Club Y" --ville "X"`,
   puis compléter `courses/<slug>/event.json` (date, heure, distance, boucles,
   `aConfirmer` sur ce qui n'est pas sûr) et `SUIVI.md`.
2. **Importer le tracé** : déposer le GPX dans `courses/<slug>/parcours.gpx`, puis
   `npm run import-gpx -- <slug>` (tracé simplifié et recalé, dénivelé, spots
   candidats nommés d'après la rue, tous « à confirmer »).
   **Pas de GPX publié ?** Lire les carrefours sur le plan officiel dans
   `courses/<slug>/waypoints.json` (modèle : `courses/paris14/`), puis
   `npm run gpx-from-waypoints -- <slug>` : réseau de rues OSM, plus court
   chemin, contrôles (longueurs, bornes km), aperçu `apercu.html` à
   valider ; un carrefour introuvable ou ambigu est listé (forcer `lat` /
   `lon`). Ensuite `import-gpx` comme ci-dessus.
3. **Choisir les spots** : dans `event.json`, garder 3 à 6 spots (les ★
   « passages multiples » d'abord), les renommer, retirer `aConfirmer` de ceux
   qui sont validés.
4. **Calculer** : `node scripts/compute-walking-routes.ts <slug>`,
   `node scripts/compute-walking-grid.ts <slug>`, `node scripts/build-basemap.ts <slug>`
   (outil `pmtiles` : variable `PMTILES` ou dans le PATH),
   `node scripts/generate-route-plan.ts <slug>`.
5. **Vérifier et publier** : `npm run dev -- <slug>` (lien démo
   `/?demo=1&now=<heure pendant la course>&name=Léa&pace=5:30`), puis
   `npm run deploy -- <slug>` et `npm run courses` (tableau de bord, QR code).

### Import GPX : ce que fait `npm run import-gpx -- <slug>`

- Lit `courses/<slug>/parcours.gpx` (trkpt, sinon rtept), calcule la
  distance (haversine) et le dénivelé positif (lissé : moyenne sur ± 50 m et
  seuil de 2 m, pour ignorer le bruit GPS).
- Simplifie le tracé (Douglas-Peucker, 5 m) et le recale sur la distance
  officielle de la course ; l'écart est signalé au-delà de 2 %.
- Boucles identiques (`loops` > 1) : le GPX peut ne contenir qu'une boucle ;
  s'il contient tout le parcours, la course passe en `loops: 1` (tracé
  entier).
- **Passages multiples** : endroits à moins de 40 m l'un de l'autre mais
  séparés de plus de 1 km sur le parcours — les meilleurs spots (6 au plus,
  espacés de 800 m, le plus de passages d'abord, ★).
- Candidats réguliers : départ, arrivée et un point environ tous les 2,5 km
  (`--tous-les 3` pour changer), avec tous leurs passages.
- Nom de rue par géocodage inverse **Nominatim** (OpenStreetMap, sans clé,
  1 requête/s, User-Agent identifiant l'outil) ; `--sans-rues` pour garder
  « Spot km 4,2 ».
- Écrit les candidats avec `"aConfirmer": true` ; les spots déjà validés
  sont conservés. `--course <id>` si l'événement a plusieurs courses.

## 🚨 Antony : remettre la version en production en 2 minutes

Version de référence (envoyée à la mairie) : tags git **`antony-prod-avant-multi`** et
**`antony-prod-avant-paris14`** (même commit)
(commit `e3209a0`), version Cloudflare **`ae3f3563-3d09-440f-8fae-3462527b93b9`**,
servie sur https://semi-antony-supporter.semi-supporter.workers.dev.

En cas de problème sur la production d'Antony, au choix :

1. **Le plus rapide (tableau de bord, ~1 min)** : Cloudflare → Workers & Pages →
   `semi-antony-supporter` → **Deployments** → version `ae3f3563…` → **Rollback**.
2. **En ligne de commande (~1 min)**, après `npx wrangler login` :
   ```bash
   npx wrangler rollback ae3f3563-3d09-440f-8fae-3462527b93b9 --name semi-antony-supporter
   ```
3. **Reconstruire depuis le tag (~2 min)** :
   ```bash
   git checkout antony-prod-avant-paris14   # = antony-prod-avant-multi
   npm ci && npm run build && npx wrangler deploy
   git checkout -   # revenir à la branche de travail
   ```

Ne pas oublier ensuite : si `main` avait été modifiée, la remettre sur le tag
(`git push origin antony-prod-avant-multi:main` — refusé si `main` a avancé :
voir avec Claude avant de forcer).

## 🔁 Antony : bascule vers l'architecture multi-courses (à déclencher par Paul)

La production d'Antony sert encore la version d'avant la refonte (tag
`antony-prod-avant-multi`). La bascule = fusionner `feat/multi-courses` dans
`main` ; Cloudflare reconstruit alors Antony (`npm run build` sans argument
= Antony) avec les **mêmes réglages** qu'aujourd'hui. Durée : ~10 min.

**Avant**
1. Récupérer les fichiers de la version en ligne (pages restées ouvertes) :
   `node scripts/fetch-legacy-assets.ts antony`, puis commiter
   `courses/antony/legacy-assets/` s'il a changé.
2. Vérifier le lien de test de la branche (build Cloudflare réel) :
   `node scripts/reference-ui.mjs compare https://feat-multi-courses-semi-antony-supporter.semi-supporter.workers.dev`
   → « Identique à la référence ».
3. Cloudflare → Worker `semi-antony-supporter` → Settings → Build : branche de
   production `main`, build `npm run build`, déploiement `npx wrangler deploy`
   (inchangés).

**Bascule**
4. ```bash
   git checkout main && git pull
   git merge --ff-only feat/multi-courses
   git push origin main
   ```
5. Attendre le build (Deployments, ~1 min), puis
   `node scripts/reference-ui.mjs compare https://semi-antony-supporter.semi-supporter.workers.dev`
   → identique. Ouvrir l'app déjà installée sur un téléphone : elle se recharge
   seule sur la nouvelle version.

**Service worker** : les téléphones déjà venus ont l'ancien service worker ;
il installe le nouveau, qui prend la main aussitôt (skipWaiting) et l'app se
recharge seule (état conservé). Si une saisie est en cours, l'app attend
(bandeau « Nouvelle version disponible ») : la page ancienne peut encore
charger ses écrans (carte) grâce aux fichiers conservés dans
`legacy-assets/`, servis sans être mis en cache. Répétée en local à partir
d'une copie exacte de la production, sans cache HTTP : pas de page blanche,
carte et prénom conservés, hors-ligne OK après mise à jour.

**Retour arrière (~1 min)** : Cloudflare → `semi-antony-supporter` →
Deployments → version précédente (`ae3f3563…` si c'est la première bascule)
→ **Rollback** (ou `npx wrangler rollback <version> --name semi-antony-supporter`).
Ensuite, ne plus pousser sur `main` avant d'avoir corrigé sur la branche
(chaque push sur `main` redéploie).

**À chaque future mise en production d'Antony** : relancer l'étape 1
(fichiers de la version en ligne) avant de pousser sur `main`.

## Configurer un événement (`courses/<slug>/event.json`)

- `event` : nom, date (`AAAA-MM-JJ`), `dateToConfirm`, fuseau.
- `settings.margin` : demi-largeur des fourchettes (`max(temps écoulé × %, plancher)`).
- `settings.walking` : vitesse de marche, facteur de détour (× vol d'oiseau),
  marge de sécurité de l'itinéraire.
- `settings.pace` : allure min/max acceptée (3:00–9:00).
- `races[]` : une entrée par course (le sélecteur n'apparaît que s'il y en a
  plusieurs) : distance, heure de départ, boucles, dénivelé
  (`elevationToConfirm`), tracé d'UNE boucle, `spots[]`.
- `spots[].km` : **toutes** les positions (km depuis le départ) où le
  parcours passe par ce spot. Les passages et leurs étiquettes en découlent.
  Ex. stade : `[0, 7, 14, 21.0975]` → Départ, Fin boucle 1, Fin boucle 2, Arrivée.
- `branding` (optionnel) : `colors` (`ink`, `sprint`, `signal`), `logo`,
  `tagline`, `official` (false = mention « Application non officielle »).
  Les couleurs de texte dérivées sont recalculées pour rester lisibles.
- `infos` (optionnel) : infos pratiques de l'onglet Infos (`title`, `text`,
  `toConfirm`).
- `races[].walkingRoutes` : distances À PIED réelles entre spots (km),
  générées par `node scripts/compute-walking-routes.ts` (itinéraires piétons
  OpenStreetMap). À relancer après tout ajout ou déplacement de spot ; une
  valeur peut être corrigée à la main si besoin. Le parcours peut être
  traversé à pied le jour J (attention aux coureurs).
  Sans ce bloc, l'app estime à vol d'oiseau × facteur de détour.
- `contentVersion` / `contentUpdatedAt` : à incrémenter à chaque modification
  (affichés dans « À propos »).

Une modification poussée sur `main` arrive chez les utilisateurs **sans
nouvelle version de l'app** (fichier relu au retour au premier plan). Après
un changement de tracé ou de spots : `node scripts/generate-route-plan.ts`.

### Ajouter le 5 km

Ajouter une 2e entrée dans `races` (ex. `"id": "5k"`, `"startTime": "13:15"`,
`"loops": 1`, son tracé et ses spots). Le sélecteur de course s'affiche alors
automatiquement.

## Variables de build (Cloudflare → Worker → Settings → Build → Variables)

| Variable | Valeurs |
| --- | --- |
| `VITE_TILE_PROVIDER` | `local` (défaut : fond hébergé avec l'app), `osm`, `maptiler`, `stadia` |
| `VITE_TILE_API_KEY` | clé MapTiler / Stadia |
| `VITE_CF_ANALYTICS_TOKEN` | token Cloudflare Web Analytics (Production seulement) |

Un nouveau domaine externe (tuiles…) doit aussi être ajouté à la CSP
(`app/public/_headers`) et à la règle de cache du service worker (`vite.config.ts`).

## Mises à jour et hors-ligne

- Le service worker (vite-plugin-pwa / Workbox) précache l'app, event.json
  (embarqué), les icônes et le plan statique ; les tuiles vues sont mises en
  cache (400 max, 14 jours) ; le fond de carte hébergé est mis en cache en
  entier au premier lancement (carte complète hors-ligne).
- Nouvelle version : vérifiée au retour au premier plan, au retour du réseau
  et toutes les 15 min ; l'app se recharge seule (état conservé) ou affiche
  « Nouvelle version disponible » si l'utilisateur est en train de saisir.

## Mesure d'audience

Cloudflare Web Analytics (gratuit, sans cookie de suivi), chargé seulement
si `VITE_CF_ANALYTICS_TOKEN` est défini, jamais en mode démo. Cloudflare
n'enregistre pas les paramètres d'URL (prénom, allure). Seules les pages
vues sont comptées : les appels `track(...)` du code (partage, installation,
agenda…) sont gardés pour un futur compteur mais sans effet aujourd'hui.

## Rappels « il arrive dans 10 min » : limite connue

Sans serveur de push, une PWA ne peut pas planifier une notification fiable
quand l'app est fermée (iOS suspend le JS en arrière-plan, l'API Notification
Triggers a été abandonnée). L'app propose donc :
1. **Ajouter à mon agenda** (.ics, alarme 10 min avant chaque passage du plan
   optimal) : fiable, app fermée et hors-ligne ;
2. des alertes (notification + vibration) **tant que l'app est ouverte** ;
   sur iPhone, uniquement une fois l'app installée (iOS 16.4+).

Un vrai push app fermée demanderait un petit backend (clés VAPID + envoi
planifié, ex. Cloudflare Worker + Cron Trigger), ce qui implique de stocker un
abonnement push par appareil.

## Intégrer le vrai tracé (GPX/KML)

```bash
node scripts/import-track.ts chemin/vers/tracé.gpx
```

Le script détecte si le fichier contient 1 boucle ou les 3 (il découpe et
garde la première), vérifie la longueur, et écrit `track.imported.json` à
recopier dans `races[].track` de `event.json`. Options : `--loop-length=7`,
`--loops=3`. Caler ensuite les `km` des spots avec `?calibrage=1`.

## Publier une annonce (2 minutes)

Les annonces s'affichent en bandeau en haut de l'app, chez tout le monde,
**sans nouvelle version de l'app** (l'app relit le fichier au retour au
premier plan, au retour du réseau et toutes les 15 min).

1. Ouvrir `courses/<slug>/annonces.json` (directement sur GitHub : icône ✏️).
2. Ajouter une entrée dans `annonces` :

   ```json
   {
     "id": "parking-stade-2027",
     "level": "important",
     "text": "Parking du stade complet : garez-vous rue Velpeau.",
     "start": "2027-03-21T12:00:00+01:00",
     "end": "2027-03-21T18:00:00+01:00"
   }
   ```

   - `id` : unique (sert à mémoriser qu'une annonce « info » a été fermée).
   - `level` : `info` (bleu, peut être fermée) ou `important` (rouge, toujours visible).
   - `start` / `end` : début et fin d'affichage, avec le fuseau (`+01:00` en
     mars, heure d'hiver ; `+02:00` en heure d'été).
   - `demoOnly: true` : visible seulement en mode démo (`?demo=1`).
3. Valider le commit sur `main` → Cloudflare redéploie en ~1 min → l'annonce
   apparaît chez les utilisateurs à leur prochain retour dans l'app.

Pour retirer une annonce : supprimer l'entrée (ou avancer sa date `end`).
Une entrée mal formée est ignorée sans casser les autres.

## Lancer en local

Prérequis : [Node.js](https://nodejs.org/) ≥ 20.

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173`. Recharge à chaud (HMR) : modifier un fichier
de config met à jour l'app instantanément.

Lancer les tests (toute la logique de calcul) :

```bash
npm run test
```

## Héberger gratuitement : Cloudflare (Worker « fichiers statiques »)

Site 100 % statique servi par un Worker Cloudflare sans code serveur
(`wrangler.jsonc`) : gratuit, requêtes illimitées, réseau mondial (des
milliers d'utilisateurs simultanés ne posent aucun problème). Le fond de
carte est hébergé avec l'app : aucun service tiers ni quota le jour J.
Un projet est indépendant des autres sites du même compte Cloudflare
(quota partagé : 500 builds/mois, un build à la fois).

### Mise en place (une fois)

1. Tableau de bord Cloudflare → **Workers & Pages → Create → Import a
   repository** → choisir ce dépôt (autoriser le dépôt dans l'app GitHub
   de Cloudflare si besoin).
2. Build command `npm run build`, deploy command `npx wrangler deploy`
   (défaut), branche de production **main**.
3. Worker → Settings → Build → **Builds for non-production branches** :
   activé, commande `npx wrangler preview` (nécessite le bloc
   `"previews": {}` de `wrangler.jsonc`).
4. Option mesure d'audience : **Web Analytics → Add a site**, copier le
   *token* dans Worker → Settings → Build → **Variables and secrets** (ce
   sont des variables *de build*) : `VITE_CF_ANALYTICS_TOKEN`.

### Circuit lien de test → production

- Pousser une branche (`git push origin feat/xxx`) → Cloudflare construit
  une version et donne un **lien de test**
  `https://<branche>-semi-antony-supporter.<compte>.workers.dev`
  (commande `npx wrangler preview` ; builds visibles dans le tableau de
  bord sous **Previews → <branche>**, pas dans la liste des builds).
- Une fois validé : fusionner la branche dans `main` (PR GitHub) →
  **production** `https://semi-antony-supporter.<compte>.workers.dev` en
  ~1 min. Tant que `main` n'a pas `wrangler.jsonc`, son build échoue : rien
  n'est publié en production (voulu jusqu'à validation).
- Retour arrière : Worker → Deployments → version précédente → *Rollback*.
- Les téléphones prennent la nouvelle version seuls (service worker :
  vérification au retour dans l'app et toutes les 15 min, rechargement
  automatique ou bandeau « Nouvelle version disponible »).

`app/public/_headers` (sécurité, cache) est appliqué par Cloudflare. Les routes
`/qr` et `/styleguide` sont servies par le mode « single-page-application »
de `wrangler.jsonc` (pas de `_redirects` : il provoquait une redirection
`/qr` → `/`).

### Fond de carte

`courses/<slug>/assets/carte/*.pmtiles` : extrait de la zone du parcours (≈ 3,5 Mo, données
OpenStreetMap via Protomaps), affiché par `protomaps-leaflet`. Le fichier
est téléchargé EN ENTIER (au premier lancement, en arrière-plan), gardé
dans le cache du navigateur et découpé en mémoire (`src/pwa/basemap.ts`) :
ne dépend pas des requêtes partielles du serveur (Cloudflare Workers les
ignore) et la carte est complète hors-ligne. Pour le régénérer (autre événement, carte plus
récente) : `node scripts/build-basemap.ts <slug>` (outil `pmtiles` requis), puis
reporter le bloc affiché dans `event.json` → `map`.

## Hors périmètre

Suivi de plusieurs coureurs, suivi temps réel (puce/chronométrage), push
serveur app fermée.

# Semi d'Antony — Assistant Supporter

Web app mobile-first, **installable sur téléphone (PWA)** et **utilisable
hors-ligne**, qui répond à *« où je me place et à quelle heure mon coureur
passe ? »* pour les supporters du semi-marathon d'Antony (3 boucles de 7 km).

Pas de compte, pas de backend : un lien (ou un QR code) suffit. Tout est
calculé sur le téléphone à partir de `public/data/event.json`. Le prénom et
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

## Structure

```
public/data/event.json         TOUTE la config de l'événement (voir ci-dessous)
public/data/annonces.json      Annonces de l'organisateur (bandeau)
public/manifest.webmanifest    Manifest PWA ; icônes dans public/icons (scripts/generate-icons.mjs)
public/parcours-plan.svg       Plan statique de repli (scripts/generate-route-plan.ts)
src/lib/                       Logique pure, testée (*.test.ts) :
  timing.ts                      horaires de passage, étiquettes Départ/Boucle/Fin boucle/Arrivée
  itinerary.ts                   temps de marche, faisabilité ✅⚠️❌, plan optimal (DP sur DAG)
  dayStatus.ts, clock.ts         mode jour J (prochain passage), fuseau, mode démo
  reminders.ts                   rappels 10 min avant, export agenda .ics
  annonces.ts, remoteData.ts     annonces, données en stale-while-revalidate
  format.ts, event.ts, geo.ts, mapMarkers.ts, analytics.ts, gpxKml.ts
src/pwa/                       Service worker (mises à jour auto), installation, plateforme
src/app/                       Écrans : assistant (Onboarding), coque à onglets (Shell),
                                 LiveTab, PlanTab, MapTab (chargé à la demande), InfosTab,
                                 useSupporter (assemble l'état, sans calcul), page /qr
src/ui/                        Design system : tokens.css (couleurs, typo, formes), composants,
                                 marque par événement (branding.ts), page /styleguide
wrangler.jsonc, public/_headers  Hébergement Cloudflare (fichiers statiques), en-têtes de sécurité et de cache
public/carte/                  Fond de carte de la zone (PMTiles), cf. scripts/build-basemap.ts
```

## 🚨 Antony : remettre la version en production en 2 minutes

Version de référence (envoyée à la mairie) : tag git **`antony-prod-avant-multi`**
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
   git checkout antony-prod-avant-multi
   npm ci && npm run build && npx wrangler deploy
   git checkout -   # revenir à la branche de travail
   ```

Ne pas oublier ensuite : si `main` avait été modifiée, la remettre sur le tag
(`git push origin antony-prod-avant-multi:main` — refusé si `main` a avancé :
voir avec Claude avant de forcer).

## Configurer un événement (`public/data/event.json`)

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
(`public/_headers`) et à la règle de cache du service worker (`vite.config.ts`).

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

1. Ouvrir `public/data/annonces.json` (directement sur GitHub : icône ✏️).
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

`public/_headers` (sécurité, cache) est appliqué par Cloudflare. Les routes
`/qr` et `/styleguide` sont servies par le mode « single-page-application »
de `wrangler.jsonc` (pas de `_redirects` : il provoquait une redirection
`/qr` → `/`).

### Fond de carte

`public/carte/*.pmtiles` : extrait de la zone du parcours (≈ 3,5 Mo, données
OpenStreetMap via Protomaps), affiché par `protomaps-leaflet`. Le fichier
est téléchargé EN ENTIER (au premier lancement, en arrière-plan), gardé
dans le cache du navigateur et découpé en mémoire (`src/pwa/basemap.ts`) :
ne dépend pas des requêtes partielles du serveur (Cloudflare Workers les
ignore) et la carte est complète hors-ligne. Pour le régénérer (autre événement, carte plus
récente) : `node scripts/build-basemap.ts` (outil `pmtiles` requis), puis
reporter le bloc affiché dans `event.json` → `map`.

## Hors périmètre

Suivi de plusieurs coureurs, suivi temps réel (puce/chronométrage), push
serveur app fermée.

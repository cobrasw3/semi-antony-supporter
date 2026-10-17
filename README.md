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
vercel.json                    En-têtes de sécurité (CSP, HSTS…) et de cache, réécriture /qr
```

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

## Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Valeurs |
| --- | --- |
| `VITE_TILE_PROVIDER` | `osm` (défaut), `maptiler`, `stadia` |
| `VITE_TILE_API_KEY` | clé MapTiler / Stadia |

Un nouveau fournisseur de tuiles doit aussi être ajouté à la CSP
(`vercel.json`) et à la règle de cache du service worker (`vite.config.ts`).

## Mises à jour et hors-ligne

- Le service worker (vite-plugin-pwa / Workbox) précache l'app, event.json
  (embarqué), les icônes et le plan statique ; les tuiles vues sont mises en
  cache (400 max, 14 jours).
- Nouvelle version : vérifiée au retour au premier plan, au retour du réseau
  et toutes les 15 min ; l'app se recharge seule (état conservé) ou affiche
  « Nouvelle version disponible » si l'utilisateur est en train de saisir.

## Mesure d'audience

Vercel Web Analytics (sans cookie) : à activer dans le tableau de bord
Vercel (projet → Analytics). URL envoyée sans paramètres (aucun prénom ni
allure). Événements : `partage`, `installation`, `ouverture_app_installee`,
`notifications_activees`, `agenda_telecharge`, `itineraire_ouvert`,
`plan_optimal`. ⚠️ Les événements personnalisés nécessitent un plan Vercel
Pro ; sur le plan Hobby, seules les pages vues sont comptées.

## Rappels « il arrive dans 10 min » : limite connue

Sans serveur de push, une PWA ne peut pas planifier une notification fiable
quand l'app est fermée (iOS suspend le JS en arrière-plan, l'API Notification
Triggers a été abandonnée). L'app propose donc :
1. **Ajouter à mon agenda** (.ics, alarme 10 min avant chaque passage du plan
   optimal) : fiable, app fermée et hors-ligne ;
2. des alertes (notification + vibration) **tant que l'app est ouverte** ;
   sur iPhone, uniquement une fois l'app installée (iOS 16.4+).

Un vrai push app fermée demanderait un petit backend (clés VAPID + envoi
planifié, ex. fonction Vercel + cron), ce qui implique de stocker un
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
3. Valider le commit sur `main` → Vercel redéploie en ~1 min → l'annonce
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

## Déployer gratuitement (obtenir un lien partageable)

### Option Vercel (recommandée, la plus simple)

1. Pousser ce dossier sur un dépôt GitHub (public ou privé).
2. Aller sur [vercel.com](https://vercel.com), se connecter avec GitHub.
3. "Add New… → Project", sélectionner ce dépôt.
4. Vercel détecte Vite automatiquement (build command `vite build`, output
   `dist`) — laisser les réglages par défaut et cliquer "Deploy".
5. Après ~1 minute, Vercel donne une URL du type
   `https://semi-antony-supporter.vercel.app` — c'est le lien à partager
   (et à transformer en QR code).

Chaque nouveau `git push` redéploie automatiquement **si le dépôt est relié
à Vercel** (Settings → Git → Connect Git Repository) : `main` en
production, les autres branches en preview. ⚠️ Au 17/10/2026, ce projet
n'est pas relié : il se déploie avec la CLI (`npx vercel` pour une
preview, `npx vercel --prod` pour la production).

### Option Netlify (équivalente)

1. Pousser le dossier sur GitHub.
2. Sur [netlify.com](https://netlify.com), "Add new site → Import an
   existing project", choisir le dépôt.
3. Build command : `npm run build` — Publish directory : `dist`.
4. Déployer : Netlify fournit une URL `https://<nom>.netlify.app`.

### Sans compte GitHub

`npx vercel` (ou `npx netlify-cli deploy`) depuis ce dossier permet de
déployer directement depuis la machine locale, sans dépôt Git — pratique
pour un test rapide avant de mettre en place un dépôt propre.

## Hors périmètre

Suivi de plusieurs coureurs, suivi temps réel (puce/chronométrage), push
serveur app fermée.

# Semi d'Antony — Assistant Supporter

Prototype de démonstration : une web app mobile-first qui répond à *« où je
me place et à quelle heure mon coureur passe ? »* pour les supporters du
semi-marathon d'Antony (3 boucles de 7 km).

Pas d'installation, pas de compte : un lien (ou un QR code) ouvert au
navigateur suffit. Tout le calcul se fait côté client, à partir de fichiers
de config.

## Structure

```
src/config/course.ts             Tracé du parcours (placeholder pour l'instant) + nb/longueur de boucles
src/config/observationPoints.ts  Points d'observation (nom, coordonnées, distance sur une boucle, accès, astuce)
src/config/settings.ts           Heure de départ, marge d'incertitude
src/lib/timing.ts                Calcul pur des horaires de passage (testé, voir timing.test.ts)
src/lib/format.ts                Parsing/formatage des saisies allure & temps visé + URL de partage
src/lib/geo.ts                   Distances, projection d'un point sur un tracé, découpage multi-boucles (testé)
src/lib/gpxKml.ts                Parsing GPX/KML -> tableau de coordonnées (testé)
scripts/import-track.ts          CLI : convertit un GPX/KML en coordonnées prêtes à intégrer (voir plus bas)
src/components/Carte.tsx         Carte Leaflet (tracé + marqueurs + popups + mode calibrage)
src/components/ChampAllure.tsx   Saisie allure / temps visé
src/components/Partage.tsx       Bouton de partage (QR code + lien avec allure encodée)
src/components/RecapPassages.tsx Récapitulatif trié des créneaux de passage
```

## ⚠️ Données à remplacer avant la démo

- `src/config/course.ts` : `PLACEHOLDER_LOOP_POINTS` est un tracé fictif. Voir
  "Intégrer le vrai tracé" ci-dessous pour le remplacer à partir d'un GPX/KML.
- `src/config/observationPoints.ts` : 3 points (Stade Georges Suant, Parc
  Heller, `⟨3e point à nommer⟩`) — accès et astuces encore marqués
  `⟨à vérifier⟩` par endroits, à confirmer avec le club.
- `src/config/settings.ts` : heure de départ (`14:30`) et marge
  d'incertitude (`±1 %` à `±3 %`), facilement ajustables.

## Intégrer le vrai tracé (GPX/KML)

```bash
node scripts/import-track.ts chemin/vers/tracé.gpx
```

Le script détecte automatiquement si le fichier contient 1 seule boucle
(7 km) ou les 3 (21 km, il les découpe alors en 3 tracés égaux et ne garde
que le premier), vérifie que la longueur obtenue est cohérente avec
7 km/boucle (prévient sinon), et écrit le résultat dans
`src/config/course.imported.ts` — à relire, puis à recopier dans
`course.ts` (remplace `PLACEHOLDER_LOOP_POINTS`) une fois le tracé validé
visuellement sur la carte.

Options : `--loop-length=7` (longueur de boucle attendue, en km) et
`--loops=3` pour forcer le nombre de boucles si la détection automatique se
trompe.

Une fois le vrai tracé en place, cale précisément la `distanceInLoopKm` de
chaque point d'observation en ouvrant l'app avec `?calibrage=1` (ex.
`http://localhost:5173/?calibrage=1`) : un clic sur la carte affiche
instantanément la distance-dans-la-boucle du point cliqué.

## Lancer en local

Prérequis : [Node.js](https://nodejs.org/) ≥ 20.

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173`. Recharge à chaud (HMR) : modifier un fichier
de config met à jour l'app instantanément.

Lancer les tests de `timing.ts` :

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

Chaque nouveau `git push` redéploie automatiquement.

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

## Ce qui n'est volontairement pas fait (hors périmètre v1)

Itinéraire piéton entre points, alertes "il arrive dans X min", suivi de
plusieurs coureurs, suivi temps réel — voir la conversation de conception
pour le contexte complet.

# Semi-marathon du Bois de Vincennes — fiche de suivi

> Démo **non officielle**, préparée pour Sport Passion Organisation. Rien n'est envoyé à
> l'organisateur tant que le parcours n'est pas intégré et vérifié.

## La course

| | |
|---|---|
| Course | Semi-marathon du Bois de Vincennes |
| Distance(s) | 21,1 km |
| Date 2027 | octobre 2027 (à confirmer) |
| Heure de départ | 9h30 (édition 2026, à confirmer) |
| Organisateur | Sport Passion Organisation |
| Parcours | 2 boucles dans le bois (≈ 8,5 km nord + 12,6 km sud), départ/arrivée esplanade du château, ~6 000 participants |

## Contacts publics trouvés

- *(à rechercher : site officiel de la course, page de l'organisateur, réseaux sociaux — sources publiques uniquement)*

## Sources des informations

- Recherches en ligne de Paul (tableau du prompt « Démos multi-courses », 23/10/2026) — liens exacts à compléter.

## Confirmé / à confirmer

Tout est **à confirmer** avec l'organisateur :
- [ ] Date de l'édition 2027
- [ ] Heure(s) de départ
- [ ] Tracé officiel → déposer le GPX dans `courses/vincennes/parcours.gpx` (site de la course ou OpenRunner)
- [ ] Spots supporters, ravitaillements, zones accessibles au public
- [ ] Nom exact de l'organisateur et autorisation d'utiliser le nom de la course

## Démo

- URL : https://vincennes.semi-supporter.workers.dev *(pas encore déployée)*
- Lien démo (une fois le parcours intégré) : https://vincennes.semi-supporter.workers.dev/?demo=1&now=10:30&name=Léa&pace=5:30
- QR code : `assets/qr-demo.png` (généré par `npm run courses`)

## Historique

| Date | Événement |
|---|---|
| 24/10/2026 | Dossier créé (infos connues, en attente du GPX) |

## Prix proposé

*(à définir)*

## Prochaine action

Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans `courses/vincennes/parcours.gpx`, puis `npm run import-gpx -- vincennes`.

# Semi-marathon de Rambouillet — fiche de suivi

> Démo **non officielle**, préparée pour ASCC Rambouillet Olympique. Rien n'est envoyé à
> l'organisateur tant que le parcours n'est pas intégré et vérifié.

## La course

| | |
|---|---|
| Course | Semi-marathon de Rambouillet |
| Distance(s) | 21,1 km |
| Date 2027 | 14 mars 2027 (à confirmer) |
| Heure de départ | 9h00 |
| Organisateur | ASCC Rambouillet Olympique |
| Parcours | Une seule boucle : ~7 km en ville puis ~14 km en forêt, départ stade du Vieux-Moulin, ~2 500 arrivants |

## Contacts publics trouvés

- *(à rechercher : site officiel de la course, page de l'organisateur, réseaux sociaux — sources publiques uniquement)*

## Sources des informations

- Recherches en ligne de Paul (tableau du prompt « Démos multi-courses », 23/10/2026) — liens exacts à compléter.

## Confirmé / à confirmer

Tout est **à confirmer** avec l'organisateur :
- [ ] Date de l'édition 2027
- [ ] Heure(s) de départ
- [ ] Tracé officiel → déposer le GPX dans `courses/rambouillet/parcours.gpx` (site de la course ou OpenRunner)
- [ ] Spots supporters, ravitaillements, zones accessibles au public
- [ ] Nom exact de l'organisateur et autorisation d'utiliser le nom de la course

## Démo

- URL : https://rambouillet.semi-supporter.workers.dev *(pas encore déployée)*
- Lien démo (une fois le parcours intégré) : https://rambouillet.semi-supporter.workers.dev/?demo=1&now=10:00&name=Léa&pace=5:30
- QR code : `assets/qr-demo.png` (généré par `npm run courses`)

## Historique

| Date | Événement |
|---|---|
| 24/10/2026 | Dossier créé (infos connues, en attente du GPX) |

## Prix proposé

*(à définir)*

## Prochaine action

Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans `courses/rambouillet/parcours.gpx`, puis `npm run import-gpx -- rambouillet`.

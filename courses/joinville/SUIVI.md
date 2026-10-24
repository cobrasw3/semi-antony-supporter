# Semi-marathon de Joinville — fiche de suivi

> Démo **non officielle**, préparée pour AC Paris Joinville, avec la ville de Joinville-le-Pont. Rien n'est envoyé à
> l'organisateur tant que le parcours n'est pas intégré et vérifié.

## La course

| | |
|---|---|
| Course | Semi-marathon de Joinville |
| Distance(s) | 21,1 km (+ 10 km) |
| Date 2027 | mars ou avril 2027 (à confirmer) |
| Heure de départ | 8h45 (édition 2025, à confirmer) ; heure du 10 km inconnue |
| Organisateur | AC Paris Joinville, avec la ville |
| Parcours | Départ quai de Polangis, arrivée place Bergisch Gladbach, passe par un parc |

## Contacts publics trouvés

- *(à rechercher : site officiel de la course, page de l'organisateur, réseaux sociaux — sources publiques uniquement)*

## Sources des informations

- Recherches en ligne de Paul (tableau du prompt « Démos multi-courses », 23/10/2026) — liens exacts à compléter.

## Confirmé / à confirmer

Tout est **à confirmer** avec l'organisateur :
- [ ] Date de l'édition 2027
- [ ] Heure(s) de départ
- ⚠️ Heure de départ du 10 km inconnue : valeur provisoire 8:45 dans event.json (marquée à confirmer).
- [ ] Tracé officiel → déposer le GPX dans `courses/joinville/parcours.gpx` (site de la course ou OpenRunner)
- [ ] Spots supporters, ravitaillements, zones accessibles au public
- [ ] Nom exact de l'organisateur et autorisation d'utiliser le nom de la course

## Démo

- URL : https://joinville.semi-supporter.workers.dev *(pas encore déployée)*
- Lien démo (une fois le parcours intégré) : https://joinville.semi-supporter.workers.dev/?demo=1&now=09:45&name=Léa&pace=5:30
- QR code : `assets/qr-demo.png` (généré par `npm run courses`)

## Historique

| Date | Événement |
|---|---|
| 24/10/2026 | Dossier créé (infos connues, en attente du GPX) |

## Prix proposé

*(à définir)*

## Prochaine action

Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans `courses/joinville/parcours.gpx`, puis `npm run import-gpx -- joinville`.

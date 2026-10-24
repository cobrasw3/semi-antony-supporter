# Foulées de Malakoff — fiche de suivi

> Démo **non officielle**, préparée pour les organisateurs des Foulées de Malakoff. Rien n'est envoyé à
> l'organisateur tant que le parcours n'est pas intégré et vérifié.

## La course

| | |
|---|---|
| Course | Foulées de Malakoff |
| Distance(s) | 10 km (+ 5 km) |
| Date 2027 | 6 février 2027 (à confirmer) |
| Heure de départ | 11h15 pour le 10 km (édition 2026, à confirmer) ; heure du 5 km inconnue |
| Organisateur | à confirmer |
| Parcours | 10 km en double boucle, 5 km en une boucle, en ville |

## Contacts publics trouvés

- *(à rechercher : site officiel de la course, page de l'organisateur, réseaux sociaux — sources publiques uniquement)*

## Sources des informations

- Recherches en ligne de Paul (tableau du prompt « Démos multi-courses », 23/10/2026) — liens exacts à compléter.

## Confirmé / à confirmer

Tout est **à confirmer** avec l'organisateur :
- [ ] Date de l'édition 2027
- [ ] Heure(s) de départ
- ⚠️ Heure de départ du 5 km inconnue : valeur provisoire 11:15 dans event.json (marquée à confirmer).
- [ ] Tracé officiel → déposer le GPX dans `courses/malakoff/parcours.gpx` (site de la course ou OpenRunner)
- [ ] Spots supporters, ravitaillements, zones accessibles au public
- [ ] Nom exact de l'organisateur et autorisation d'utiliser le nom de la course

## Démo

- URL : https://malakoff.semi-supporter.workers.dev *(pas encore déployée)*
- Lien démo (une fois le parcours intégré) : https://malakoff.semi-supporter.workers.dev/?demo=1&now=11:40&name=Léa&pace=5:30
- QR code : `assets/qr-demo.png` (généré par `npm run courses`)

## Historique

| Date | Événement |
|---|---|
| 24/10/2026 | Dossier créé (infos connues, en attente du GPX) |

## Prix proposé

*(à définir)*

## Prochaine action

Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans `courses/malakoff/parcours.gpx`, puis `npm run import-gpx -- malakoff`.

# Foulées Charentonnaises — fiche de suivi

> Démo **non officielle**, préparée pour les organisateurs des Foulées Charentonnaises. Rien n'est envoyé à
> l'organisateur tant que le parcours n'est pas intégré et vérifié.

## La course

| | |
|---|---|
| Course | Foulées Charentonnaises |
| Distance(s) | 15 km (2 tours différents) + 5 km ; « Challenge » = les deux ; courses enfants 2 400 m, 750 m, 1 500 m |
| Date 2027 | mi-février 2027 (à confirmer) |
| Heure de départ | 15 km : 8:45 · 5 km : 11:45 · enfants 11:00 / 11:15 / 11:30 (site officiel, édition 2026) |
| Organisateur | à confirmer |
| Parcours | Départ/arrivée près du gymnase Nelson Paillou (Charenton-Écoles). 15 km : tour 1 autour du lac Daumesnil, tour 2 par l'intérieur du bois (km balisés sur le plan officiel). 5 km : bitume, Valmy + bois. Plans officiels en image seulement (pas de GPX sur le site). |

## Contacts publics trouvés

- *(à rechercher : site officiel de la course, page de l'organisateur, réseaux sociaux — sources publiques uniquement)*

## Sources des informations

- Recherches en ligne de Paul (tableau du prompt « Démos multi-courses », 23/10/2026).
- Site officiel : https://www.lesfouleescharentonnaises.fr/les-courses/ (consulté le 24/10/2026) : horaires, départ, plans en image (`Parcours_15km-scaled.jpg`, `Foulees_2025-_5km.png`).
- GPX `les-foulees-charentonnaises_147906.gpx` (runtrail.run) : boucle de 5,09 km, proche du 5 km (pas du 15 km).

## Confirmé / à confirmer

Tout est **à confirmer** avec l'organisateur :
- [ ] Date de l'édition 2027
- [x] Heures de départ 2026 (site officiel) — à confirmer pour 2027
- Heures trouvées sur le site officiel (8:45 / 11:45).
- [ ] Tracé officiel → déposer le GPX dans `courses/charenton/parcours.gpx` (site de la course ou OpenRunner)
- [ ] Spots supporters, ravitaillements, zones accessibles au public
- [ ] Nom exact de l'organisateur et autorisation d'utiliser le nom de la course

## Démo

- URL : https://charenton.semi-supporter.workers.dev *(pas encore déployée)*
- Lien démo (une fois le parcours intégré) : https://charenton.semi-supporter.workers.dev/?demo=1&now=10:50&name=Léa&pace=5:30
- QR code : `assets/qr-demo.png` (généré par `npm run courses`)

## Historique

| Date | Événement |
|---|---|
| 24/10/2026 | Dossier créé (infos connues, en attente du GPX) |
| 24/10/2026 | Site officiel consulté : 15 km (2 tours différents) à 8:45, 5 km à 11:45, départ gymnase Nelson Paillou ; plans en image seulement. Le GPX runtrail ressemble au 5 km (diffère dans le bois : longe le lac). |
| 24/10/2026 | GPX reçu (`les-foulees-charentonnaises_147906.gpx`, export runtrail.run) : boucle de 5,09 km, 167 points avec altitude (44–58 m, D+ ≈ 33 m), départ/arrivée à 74 m près de Charenton-Écoles, passe par Valmy, Porte de Charenton et le lac Daumesnil. **Écart avec les 15 km annoncés : 3 tours ? autre course ?** Paul vérifie ; rien d'importé. |

## Prix proposé

*(à définir)*

## Prochaine action

Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans `courses/charenton/parcours.gpx`, puis `npm run import-gpx -- charenton`.

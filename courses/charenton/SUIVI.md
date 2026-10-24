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
- Lien démo 15 km : https://charenton.semi-supporter.workers.dev/?demo=1&now=09:20&name=Léa&pace=5:30
- Lien démo 5 km : https://charenton.semi-supporter.workers.dev/?demo=1&now=11:55&name=Léa&pace=5:30&race=5km
- QR code : `assets/qr-demo.png` (généré par `npm run courses`)

## Historique

| Date | Événement |
|---|---|
| 24/10/2026 | Dossier créé (infos connues, en attente du GPX) |
| 24/10/2026 | Site officiel consulté : 15 km (2 tours différents) à 8:45, 5 km à 11:45, départ gymnase Nelson Paillou ; plans en image seulement. Le GPX runtrail ressemble au 5 km (diffère dans le bois : longe le lac). |
| 24/10/2026 | **15 km reconstitué d'après le plan officiel** (`parcours-15km.gpx`) : plan géoréférencé sur 4 points communs avec le GPX runtrail (écarts 4–19 m), points de passage lus sur le plan (2 tours, détours de Valmy différents), itinéraire piéton OSM sur 61 tronçons sur 92, segments du plan ailleurs. Bornes km 1 à 15 retrouvées à ± 0,13 km après recalage sur 15 km (longueur mesurée 16,06 km, +7 %). Pas d'altitude. **À faire valider par l'organisateur.** 6 spots candidats (★ avenue de Gravelle : 5 passages). |
| 24/10/2026 | Comparaison GPX / plan officiel : le 15 km officiel = 2 tours d'≈ 7,5 km (km 1-7, 8-15), plus longs que la boucle runtrail (tour du lac par le nord, boucle avenue de Gravelle) → **pas 3 × la boucle**. Boucle runtrail importée **provisoirement pour le 5 km** (`parcours-5km.gpx`, +1,8 %, D+ 33 m, 5 spots candidats : rue de Paris départ/arrivée, Valmy, Reuilly, lac Daumesnil, route du Bac). Distances à pied, grille, fond de carte, plan de repli calculés. 15 km toujours sans tracé. |
| 24/10/2026 | GPX reçu (`les-foulees-charentonnaises_147906.gpx`, export runtrail.run) : boucle de 5,09 km, 167 points avec altitude (44–58 m, D+ ≈ 33 m), départ/arrivée à 74 m près de Charenton-Écoles, passe par Valmy, Porte de Charenton et le lac Daumesnil. **Écart avec les 15 km annoncés : 3 tours ? autre course ?** Paul vérifie ; rien d'importé. |

## Prix proposé

*(à définir)*

## Prochaine action

Choisir / renommer les spots (15 km et 5 km) ; faire valider le tracé reconstitué du 15 km et le tracé runtrail du 5 km par l'organisateur.

# 10K du 14e — fiche de suivi

> Démo **non officielle**, préparée pour l’Office du Mouvement Sportif du 14e
> (bandeau permanent, non indexée). Première démo envoyée après Antony.

## La course

| | |
|---|---|
| Course | 10K du 14e, 42e édition |
| Date | dimanche 17 janvier 2027 (sur le plan officiel) |
| Départ | 9h30 *(à confirmer)*, rue Gassendi (jonction rue des Plantes) |
| Arrivée | rue Saillard, en haut de la rue côté rue Charles-Divry *(point exact à confirmer)* |
| Distance | 10 km, 2 boucles de 5 km |
| Organisateur | Office du Mouvement Sportif du 14e |
| Parcours | rue des Plantes, rue de l’Abbé-Carton, (rue des Suisses), rue Pauly, rue Raymond-Losserand, rue Lebouis, rue de l’Ouest, rue du Texel, (place de Catalogne), rue du Commandant-Mouchotte, avenue du Maine, rue du Départ, boulevard Edgar-Quinet, rue Émile-Richard, rue Gassendi ; arrivée par la rue Mouton-Duvernet et la rue Saillard |

## Contacts publics trouvés

- *(à rechercher : site et réseaux de l’Office du Mouvement Sportif du 14e, mairie du 14e — sources publiques uniquement)*

## Sources des informations

- Plan officiel 2027 (`plan-officiel-2027.png`, fourni par Paul le 24/10/2026).
- Carrefours lus sur le plan par Paul (`waypoints.json`), complétés d’après OpenStreetMap (champ `correction`).
- Tracé calculé par `npm run gpx-from-waypoints -- paris14` (réseau OSM), **validé visuellement par Paul le 24/10/2026** ; aperçu : `apercu.html`.
- Stations de métro : OpenStreetMap (distances mesurées depuis chaque spot).

## Confirmé / à confirmer

- [x] Date (17 janvier 2027, sur le plan officiel)
- [ ] Heure de départ 9h30
- [ ] Point exact du départ (jonction Gassendi / rue des Plantes)
- [ ] Décroché par la rue des Suisses (Abbé-Carton → Pauly) et passage par la place de Catalogne (Texel → Mouchotte) — confirmés par le plan, à confirmer sur le terrain
- [ ] Bretelle d’arrivée (rue Mouton-Duvernet puis rue Saillard) et point exact de l’arrivée
- [ ] Spots supporters (6 proposés) et zones accessibles au public
- [ ] Autorisation d’utiliser le nom de la course

Tracé mesuré : boucle 4,94 km, total 10,17 km (+1,7 %, recalé sur 10 km). Les 9 bornes du plan tombent au bon endroit. Pas d’altitudes.

## Spots proposés (km de chaque passage, recalés sur 10 km)

| Spot | Passages | Métro (OSM) |
|---|---|---|
| Départ — rue Gassendi ★ | 0 · 4,9 · 9,7 | Mouton-Duvernet ≈ 380 m |
| Rue des Plantes / Abbé-Carton | 0,6 · 5,5 | Alésia ≈ 450 m |
| Rue Raymond-Losserand (Pernety) | 1,9 · 6,8 | Pernety, sur le parcours |
| Montparnasse — rue du Départ / bd Edgar-Quinet | 3,4 · 8,2 | Montparnasse-Bienvenüe ≈ 175 m, Edgar Quinet ≈ 210 m |
| Rue Émile-Richard / rue Gassendi | 4,4 · 9,3 | Raspail ≈ 390 m, Denfert-Rochereau ≈ 420 m |
| Arrivée — rue Saillard 🏁 | 10 | Mouton-Duvernet ≈ 260 m |

Plan optimal (honnête, boucles courtes) : à 4:00 et 5:00/km, **3 passages sans bouger au départ** ; à 6:00/km, 4 passages avec 3 km de marche (départ → Montparnasse → Pernety → départ). L’arrivée (à 270 m) ne peut pas s’enchaîner avec le dernier passage au départ.

## Démo

- URL : https://paris14.semi-supporter.workers.dev (Worker `paris14`, déployée le 24/10/2026)
- Avant la course : https://paris14.semi-supporter.workers.dev/?name=Léa&pace=5:00
- Pendant : https://paris14.semi-supporter.workers.dev/?demo=1&now=09:50&name=Léa&pace=5:00
- Après l’arrivée : https://paris14.semi-supporter.workers.dev/?demo=1&now=10:30&name=Léa&pace=5:00
- QR code (lien « pendant ») : `assets/qr-demo.png`

## Historique

| Date | Événement |
|---|---|
| 24/10/2026 | Dossier créé, tracé calculé depuis les carrefours du plan, corrigé d’après OSM, validé par Paul ; démo déployée |

## Prix proposé

*(à définir)*

## Prochaine action

Envoyer le lien de démo à l’Office du Mouvement Sportif du 14e (Paul) ; faire confirmer l’heure, le départ, l’arrivée et les spots.

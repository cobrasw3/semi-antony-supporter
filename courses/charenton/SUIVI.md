# Foulées Charentonnaises — fiche de suivi

> Démo **non officielle**, préparée pour les organisateurs des Foulées Charentonnaises. Rien n'est envoyé à
> l'organisateur tant que le parcours n'est pas intégré et vérifié.

## La course

| | |
|---|---|
| Course | Foulées Charentonnaises |
| Distance(s) | 15 km |
| Date 2027 | mi-février 2027 (à confirmer) |
| Heure de départ | à confirmer |
| Organisateur | à confirmer |
| Parcours | Ville + allées du bois de Vincennes, boucle dans le sud-est parisien, 2 000+ participants |

## Contacts publics trouvés

- *(à rechercher : site officiel de la course, page de l'organisateur, réseaux sociaux — sources publiques uniquement)*

## Sources des informations

- Recherches en ligne de Paul (tableau du prompt « Démos multi-courses », 23/10/2026) — liens exacts à compléter.

## Confirmé / à confirmer

Tout est **à confirmer** avec l'organisateur :
- [ ] Date de l'édition 2027
- [ ] Heure(s) de départ
- ⚠️ Heure de départ inconnue : valeur provisoire 10:00 dans event.json (marquée à confirmer).
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
| 24/10/2026 | GPX reçu (`les-foulees-charentonnaises_147906.gpx`, export runtrail.run) : boucle de 5,09 km, 167 points avec altitude (44–58 m, D+ ≈ 33 m), départ/arrivée à 74 m près de Charenton-Écoles, passe par Valmy, Porte de Charenton et le lac Daumesnil. **Écart avec les 15 km annoncés : 3 tours ? autre course ?** Paul vérifie ; rien d'importé. |

## Prix proposé

*(à définir)*

## Prochaine action

Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans `courses/charenton/parcours.gpx`, puis `npm run import-gpx -- charenton`.

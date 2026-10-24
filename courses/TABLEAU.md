# Tableau de bord des courses

> Généré par `npm run courses` le 24/10/2026 15:52:53. Ne pas modifier à la main :
> la source est `courses/<slug>/event.json` et `SUIVI.md`.

| Course | Statut | En ligne | À confirmer | Prochaine action |
|---|---|---|---|---|
| [Semi-marathon d’Antony](antony/SUIVI.md) | prête | en ligne | 3 | Attendre la réponse de la mairie (validation, GPX officiel, date 2027, ravitos). |
| [Foulées Charentonnaises](charenton/SUIVI.md) | 15 km : en attente du GPX · 5 km : spots à valider (5) | non déployée | 12 | Choisir / renommer les spots du 5 km (event.json) ; obtenir le tracé du 15 km (plan officiel en image : reconstituer ou demander le GPX) ; confirmer que le tracé du 5 km est à jour. |
| [Semi-marathon de Joinville](joinville/SUIVI.md) | Semi-marathon : en attente du GPX · 10 km : en attente du GPX | non déployée | 5 | Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans courses/joinville/parcours.gpx, puis npm run import-gpx -- joinville. |
| [Foulées de Malakoff](malakoff/SUIVI.md) | 10 km : en attente du GPX · 5 km : en attente du GPX | non déployée | 5 | Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans courses/malakoff/parcours.gpx, puis npm run import-gpx -- malakoff. |
| [Semi-marathon de Rambouillet](rambouillet/SUIVI.md) | en attente du GPX | non déployée | 5 | Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans courses/rambouillet/parcours.gpx, puis npm run import-gpx -- rambouillet. |
| [Semi-marathon du Bois de Vincennes](vincennes/SUIVI.md) | en attente du GPX | non déployée | 5 | Récupérer le GPX du parcours (site de la course ou OpenRunner) et le déposer dans courses/vincennes/parcours.gpx, puis npm run import-gpx -- vincennes. |

## Liens

- **Semi-marathon d’Antony** — https://semi-antony-supporter.semi-supporter.workers.dev
  - démo : https://semi-antony-supporter.semi-supporter.workers.dev/?demo=1&now=15:20&name=Paul&pace=5:30
  - QR code : [`antony/assets/qr-demo.png`](antony/assets/qr-demo.png)
- **Foulées Charentonnaises** — https://charenton.semi-supporter.workers.dev
  - démo : https://charenton.semi-supporter.workers.dev/?demo=1&now=11:55&name=Léa&pace=5:30&race=5km
  - QR code : [`charenton/assets/qr-demo.png`](charenton/assets/qr-demo.png)
- **Semi-marathon de Joinville** — https://joinville.semi-supporter.workers.dev
  - démo : https://joinville.semi-supporter.workers.dev/?demo=1&now=09:35&name=Léa&pace=5:30
  - QR code : [`joinville/assets/qr-demo.png`](joinville/assets/qr-demo.png)
- **Foulées de Malakoff** — https://malakoff.semi-supporter.workers.dev
  - démo : https://malakoff.semi-supporter.workers.dev/?demo=1&now=11:40&name=Léa&pace=5:30
  - QR code : [`malakoff/assets/qr-demo.png`](malakoff/assets/qr-demo.png)
- **Semi-marathon de Rambouillet** — https://rambouillet.semi-supporter.workers.dev
  - démo : https://rambouillet.semi-supporter.workers.dev/?demo=1&now=09:50&name=Léa&pace=5:30
  - QR code : [`rambouillet/assets/qr-demo.png`](rambouillet/assets/qr-demo.png)
- **Semi-marathon du Bois de Vincennes** — https://vincennes.semi-supporter.workers.dev
  - démo : https://vincennes.semi-supporter.workers.dev/?demo=1&now=10:20&name=Léa&pace=5:30
  - QR code : [`vincennes/assets/qr-demo.png`](vincennes/assets/qr-demo.png)

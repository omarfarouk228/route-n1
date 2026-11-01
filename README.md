# Route N1 · Taxi-brousse de Lomé à Dapaong

Jeu 3D dans le navigateur (PC et mobile) : tu conduis un taxi-brousse sur la **Nationale 1 du Togo**, de Lomé à Dapaong, en six étapes : Tsévié, Atakpamé, Sokodé, Kara, Mango, Dapaong.

Ce n'est pas une course : c'est un **voyage à gérer**. À chaque gare routière tu choisis tes passagers et tes colis, tu fais le plein et tu répares. Sur la route, tu doubles les camions surchargés, tu évites les nids-de-poule, tu passes les contrôles et tu montes la faille d'Alédjo. Il faut arriver avec le taxi entier, des passagers contents et de l'argent en caisse.

## Jouer

- **Gaz** : `↑` / `Z` / `W`
- **Frein / marche arrière** : `↓` / `S`
- **Direction** : `←` `→` / `Q` `D` / `A` `D`
- **Klaxon** : `Espace` / `H` (le camion ou le zém devant toi se range à droite ; les chèvres pressent le pas)
- **Caméra** : `C` · **Son** : `M` · **Pause** : `P` / `Échap`
- Sur mobile : boutons tactiles ◀ ▶, Klaxon, Frein, Gaz.

## Règles du voyage

| Élément | Effet |
| --- | --- |
| Passagers (7 places) | Ils paient à la montée. À l'arrivée : pourboire s'ils sont contents, discussion du prix s'ils ont été secoués. |
| Toit (6 colis) | Le taxi est plus lourd dans les montées. Un virage pris trop vite peut faire tomber un colis, que tu rembourses. |
| Profils | Commerçant·e (colis), pressé·e (bonus à l'heure), mal des transports, étudiant·e, ancien·ne (gros pourboire), passager avec une chèvre, fonctionnaire. |
| Essence | 50 L. Plein à la gare (650 F/L) ou chez les vendeuses au bord de la route (750 F/L) : arrête-toi sur le bas-côté droit. |
| État du taxi | Nids-de-poule, accrochages, sorties de route. À 0 %, le voyage s'arrête. |
| Contrôles routiers | Au-dessus de 20 km/h : amende de 5 000 F. |
| Météo | Pluie (moins d'adhérence), harmattan (poussière) ; cycle jour et nuit avec phares. |

## Le trajet

Le trajet réel fait environ 645 km ; il est **compressé** à environ 15 km de route jouable. Les bornes kilométriques et le HUD affichent les distances réelles. Les paysages changent du sud au nord : côte et cocotiers, plaine, plateaux, faille d'Alédjo (paroi rocheuse, lacets, ligne continue), savane avec baobabs et termitières, Sahel dans l'harmattan.

## Technique

- [Three.js](https://threejs.org) et [Vite](https://vite.dev), sans moteur de jeu.
- Tout est généré dans le code : route procédurale, terrain, bâtiments, véhicules, panneaux (textures canvas), sons (WebAudio). Il n'y a **aucun fichier image ni audio** à télécharger.
- Environ 150 Ko gzippés au total, et moins de 100 Mo de mémoire JavaScript en jeu.
- Qualité réduite automatiquement sur écran tactile (densité du décor, résolution).

## Développement

```bash
npm install
npm run dev      # http://127.0.0.1:5173 (laisser le terminal ouvert)
npm run build    # génère dist/
npm run preview  # sert dist/ sur http://127.0.0.1:4173
```

Chaque push sur `main` est déployé automatiquement sur GitHub Pages (`.github/workflows/deploy.yml`).

### Organisation

| Fichier | Rôle |
| --- | --- |
| `src/main.js` | Boucle de jeu, états (titre, gare, conduite, arrivée, fin), règles, caméra, lumière |
| `src/data.js` | Villes, étapes, biomes, prix, profils de passagers, répliques |
| `src/road.js` | Tracé procédural de la N1, terrain, falaises, marquages, nids-de-poule, éléments du parcours |
| `src/scenery.js` | Végétation et villages instanciés, panneaux, bornes, contrôles routiers |
| `src/traffic.js` | Camions, voitures, minibus, zémidjans, animaux qui traversent |
| `src/vehicle.js` | Physique arcade du taxi (repère de la route) |
| `src/models.js` | Modèles low-poly construits en code |
| `src/sky.js` | Ciel, cycle jour/nuit, météo, pluie |
| `src/audio.js` | Moteur, klaxon, chocs, pluie (WebAudio) |
| `src/ui.js` · `src/style.css` | HUD et écrans |

## Licence

Code © Omar Farouk. Tous droits réservés sauf mention contraire.

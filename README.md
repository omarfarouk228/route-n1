# Route N1 · Taxi-brousse de Lomé à Dapaong

Jeu 3D dans le navigateur (PC et mobile) : tu conduis un taxi-brousse sur la **Nationale 1 du Togo**, de Lomé à Dapaong, en six étapes : Tsévié, Atakpamé, Sokodé, Kara, Mango, Dapaong.

Ce n'est pas une course : c'est un **voyage à gérer**. La route suit le **vrai tracé de la N1** (OpenStreetMap), avec les vraies distances entre les villes. À chaque gare routière tu choisis tes passagers et tes colis, tu fais le plein et tu répares. Sur la route, tu doubles les camions surchargés, tu évites les nids-de-poule, tu passes les contrôles et tu montes la faille d'Alédjo. Il faut arriver avec le taxi entier, des passagers contents et de l'argent en caisse.

## Jouer

**En ligne : https://omarfarouk228.github.io/route-n1/**

- **Gaz** : `↑` / `Z` / `W`
- **Frein / marche arrière** : `↓` / `S`
- **Direction** : `←` `→` / `Q` `D` / `A` `D`
- **Klaxon** : `Espace` / `H` (le camion ou le zém devant toi se range à droite ; les chèvres pressent le pas)
- **Caméra** : `C` · **Son** : `M` · **Pause** : `P` / `Échap`
- **Radio** : `R` allumer/éteindre · `T` station suivante · `N` titre suivant · `V` ouvrir, réduire ou masquer la radio
- Sur mobile : boutons tactiles ◀ ▶, Klaxon, Frein, Gaz (portrait ou paysage).
- **Manette** (Xbox, PlayStation, USB ou Bluetooth) : RT / R2 accélère (gâchette progressive), LT / L2 freine, stick gauche ou croix pour tourner, X / Carré klaxonne, Y / Triangle caméra, LB / RB station précédente / suivante, Select allume la radio, R3 titre suivant, Start pause, A / Croix valide les écrans.

## Règles du voyage

| Élément | Effet |
| --- | --- |
| Passagers (7 places) | Ils paient à la montée. À l'arrivée : pourboire s'ils sont contents, discussion du prix s'ils ont été secoués. |
| Toit (6 colis) | Le taxi est plus lourd dans les montées. Un virage pris trop vite peut faire tomber un colis, que tu rembourses. |
| Profils | Commerçant·e (colis), pressé·e (bonus à l'heure), mal des transports, étudiant·e, ancien·ne (gros pourboire), passager avec une chèvre, fonctionnaire. |
| Essence | 50 L. Plein à la gare (650 F/L) ou chez les vendeuses au bord de la route (750 F/L) : arrête-toi sur le bas-côté droit. |
| État du taxi | Nids-de-poule, accrochages, sorties de route. À 0 %, le voyage s'arrête. |
| Contrôles routiers | Un bandeau « Contrôle en cours » s'affiche à l'approche. Passage au ralenti (au-dessus de 20 km/h : amende de 5 000 F) ou contrôle des papiers : barrière fermée, arrêt obligatoire. |
| Péages | Postes réels de la N1 : Davié, Sotouboua, Alédjo, Mango. Arrêt obligatoire au guichet, 500 F, puis la barrière se lève. Si tu la percutes, le taxi s'abîme. |
| Météo | Pluie (moins d'adhérence), harmattan (poussière) ; cycle jour et nuit avec phares. |

## Nouveautés

- **Carte réelle** : tracé de la N1 et contour du Togo issus d'OpenStreetMap ; mini-carte orientée pendant la conduite, carte complète à la gare, en pause et sur l'écran titre. La forme des virages suit la route réelle (compressée).
- **Garage** : break 7 places, minibus 12 places ou berline 4 places, chacun avec sa physique (masse, puissance, adhérence, consommation). Peinture (palette ou couleur libre), bandes, jantes, galerie, slogan peint sur la lunette arrière et plaque personnalisée.
- **Autoradio** : lecteur maison (lecture, pause, titre précédent ou suivant, barre de progression, volume) avec trois affichages : ouvert, réduit à une barre, ou masqué derrière une pastille, sans couper la musique. *N1 Groove* est une musique originale générée en direct (cloche gankogui, afrobeat, guitare highlife) qui fonctionne hors ligne. Les autres stations lisent des fichiers audio déposés dans `public/radio/<station>/` (voir plus bas).
- **Paysages par région** : cocotiers et palmiers à huile au sud, plantations de teck, bananiers, fromagers, nimiers, rôniers et baobabs au nord ; champs de maïs, d'igname, de manioc et de mil ; brûlis de saison sèche ; terrasses kabyè autour de Kara ; ponts sur le Haho et l'Oti avec forêt galerie.
- **Villes et villages** : immeubles R+1 en périphérie de Lomé, maisons en ciment et tôle, concessions de cases rondes avec greniers au nord, églises, mosquées (Sokodé), écoles avec le drapeau, kiosques aux enseignes peintes, stations-service, antennes, ligne électrique continue.
- **Personnages** : silhouettes modelées (visage, mains, pieds), pagnes et foulards en **motifs wax** dessinés dans le shader, porteuses de bassines, femmes avec bébé au dos, hommes en grand boubou, écoliers en kaki, policiers en béret. Animation de marche (jambes, genoux, bras), passants qui circulent sur l'accotement et s'écartent du taxi, vendeuses qui accourent aux vitres quand tu t'arrêtes (le confort des passagers remonte).
- **Animaux** : chèvres naines aux robes pie avec cornes et barbiche, moutons Djallonké, zébus peuls à bosse et cornes en lyre (avec leur bouvier), poules qui picorent ; ils marchent en traversant la route, broutent et remuent la queue.
- **Rendu** : ombres portées, nuages, montagnes à l'horizon, étalonnage et bloom, résolution dynamique pour tenir 60 images/s.
- **Ralentisseurs** : surtout dans certaines villes du sud, rares en rase campagne et dans le nord, comme sur la vraie N1.
- **Péages** aux emplacements officiels de la SAFER projetés sur le tracé : auvent, guichets, barrières, file des camions qui paient avant toi.
- **Échanges à la vitre** : quand tu t'arrêtes, chaque vendeuse tend sa marchandise ; un passager sort le bras avec un billet et récupère sachet d'eau, pain, bananes ou arachides.

## Le trajet

Le trajet réel fait 618 km (mesuré sur OpenStreetMap) ; il est **compressé** à environ 41 km de route jouable (5 à 8 km par étape). L'horloge du jeu suit les kilomètres réels parcourus, à environ 60 km/h de moyenne comme un vrai taxi-brousse : Lomé → Dapaong prend une douzaine d'heures de jeu, arrêts compris. Les bornes kilométriques et le HUD affichent les distances réelles. Les paysages changent du sud au nord : côte et cocotiers, plaine, plateaux, faille d'Alédjo (paroi rocheuse, lacets, ligne continue), savane avec baobabs et termitières, Sahel dans l'harmattan.

## Technique

- [Three.js](https://threejs.org) et [Vite](https://vite.dev), sans moteur de jeu.
- Tout est généré dans le code : route procédurale, terrain, bâtiments, véhicules, panneaux (textures canvas), sons (WebAudio). Il n'y a **aucun fichier image ni audio** à télécharger.
- Environ 200 Ko gzippés pour le code, et moins de 200 Mo de mémoire JavaScript en jeu, stable d'une étape à l'autre.
- Décor découpé en îlots : seul ce qui est dans le champ et en deçà de la brume est dessiné.
- Qualité réduite automatiquement sur écran tactile (densité du décor, pas d'ombres ni de post-traitement) et résolution dynamique sur PC.

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
| `src/geo.js` · `src/geo/*.json` | Tracé réel de la N1 et contour du Togo (OpenStreetMap), projection, positions des villes |
| `src/map.js` | Carte complète et mini-carte |
| `src/garage.js` | Véhicules et personnalisation |
| `src/radio.js` | Autoradio : station générée en direct et lecteur de fichiers audio |
| `scripts/radio-playlist.mjs` | Génère `public/radio/playlist.json` à partir des fichiers déposés (`npm run radio`) |
| `src/vendors.js` | Vendeuses ambulantes |
| `src/characters.js` · `src/walkers.js` | Personnages et animaux (squelette animé dans le shader, motifs wax), passants |
| `src/post.js` · `src/terrainmat.js` | Post-traitement, matériaux du sol et de l'eau |
| `scripts/` | Scripts Python qui régénèrent les données géographiques depuis l'API Overpass |
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

## Crédits

- Données géographiques © contributeurs [OpenStreetMap](https://www.openstreetmap.org/copyright), sous licence ODbL.
- Musiques des stations « Lomé Hits », « Rap 228 » et « Légendes » : titres publiés par les artistes sur [Audiomack](https://audiomack.com) et clips officiels publiés sur YouTube, lus via les lecteurs intégrés de ces plateformes. Tous droits réservés à leurs auteurs.

## Licence

Code © Omar Farouk. Tous droits réservés sauf mention contraire.

## Ajouter de la musique à la radio

1. Dépose les fichiers dans un dossier de station : `public/radio/lome/`, `public/radio/rap/`, `public/radio/legendes/` (ou crée un nouveau dossier pour une nouvelle station).
2. Nomme-les `Artiste - Titre.mp3` : le lecteur affichera l'artiste et le titre.
3. Lance `npm run radio` : la playlist `public/radio/playlist.json` est régénérée. Tu peux y corriger à la main un nom de station, une fréquence ou un titre ; ces corrections sont conservées.
4. Commit et push : la radio en ligne se met à jour.

Une station sans fichier n'apparaît pas dans le jeu. Formats lus : mp3, m4a, aac, ogg, opus, wav, webm, flac. Pour le poids du dépôt, préfère du mp3 ou de l'aac autour de 128 kbit/s (environ 3 Mo par titre).

Le dépôt est public : n'y mets que des titres dont tu as les droits de diffusion (tes propres morceaux, accord écrit de l'artiste ou du label, musique libre de droits).

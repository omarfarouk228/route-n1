# Route N1 · Taxi-brousse de Lomé à Dapaong

Jeu 3D dans le navigateur (PC et mobile) : tu conduis un taxi-brousse sur la **Nationale 1 du Togo**, de Lomé à Dapaong, en six étapes : Tsévié, Atakpamé, Sokodé, Kara, Mango, Dapaong.

Ce n'est pas une course : c'est un **voyage à gérer**, à l'aller puis, si tu veux, au retour vers Lomé. La route suit le **vrai tracé de la N1** (OpenStreetMap), avec les vraies distances entre les villes. À chaque gare routière tu choisis tes passagers et tes colis, tu fais le plein et tu répares. Sur la route, tu doubles les camions surchargés, tu évites les nids-de-poule, tu passes les contrôles et tu montes la faille d'Alédjo. Il faut arriver avec le taxi entier, des passagers contents et de l'argent en caisse.

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
| Météo | Pluie (moins d'adhérence, routes inondées), harmattan (poussière) ; cycle jour et nuit avec phares. |
| Marchandage | À la gare, demande 20 % de plus : selon son profil, le passager accepte, coupe la poire en deux ou part prendre un autre taxi. |
| Descentes en route | Certains passagers descendent dans un village de l'étape (Davié, Notsé, Blitta, Alédjo, Bafilo, Kantè) : range-toi sur le bas-côté droit. Un village dépassé, c'est un remboursement. |
| Bord de la route | Des voyageurs font signe à la sortie des villages : arrête-toi à leur hauteur pour les prendre, s'il reste de la place. |
| Demandes des passagers | Passager malade (arrête-toi vite), pause au prochain village, ancien qui demande de rouler doucement. |
| Imprévus | Crevaison (le taxi tire à droite, change la roue sur le bas-côté), moteur qui chauffe dans la faille, camion en panne derrière ses branchages, troupeau de zébus, route inondée. |
| Retour | À Dapaong, tu peux repartir vers Lomé avec ta caisse : six étapes de plus, la faille d'Alédjo en descente. |
| Carrière | Le bénéfice de chaque voyage (au-delà des 12 000 F avancés par le patron) va à ton épargne. À l'atelier : amortisseurs, pneus, radiateur, moteur, galerie, bidon de réserve. |
| Sauvegarde | Le voyage est sauvegardé à chaque gare : « Reprendre le voyage » sur l'écran titre. |

## Nouveautés

### v0.8 : les vraies traversées de villes
Chaque ville suit un plan relevé sur OpenStreetMap (novembre 2026) et dans la presse togolaise (`src/cities.js`) : repères dans l'ordre réel du sud au nord et du bon côté de la route.
- **Lomé** : boulevard Gnassingbé Eyadéma en 2x2 voies avec terre-plein jusqu'au péage de Davié, feux tricolores (GTA, Agoè-Nyivé, Agoè Zongo) avec passages piétons, stations Total, MRS, T-Oil, Sanol, gares CTK, LK, Zam Zam, mairies d'Agoè-Nyivé et de Togblékopé, marchés d'Agoè Zongo et d'Adétikopé, marché à bétail, pont sur le Zio, Hôtel Le Péage.
- **Tsévié** : commissariat et gendarmerie face à face, les deux Total presque face à face, grand marché, station de zémidjans, hôtel de ville. **Notsé** : mur d'Agbogbodzi, pavements de Dakpodji, église Sts Pierre et Paul.
- **Atakpamé** : la N1 longe le pied des collines par Agbonou (collines à gauche en allant vers le nord), marché d'Agbonou, stations CAP et Oando.
- **Sokodé** : rond-point central, grand marché, mosquée Yéyé-Dji'ngri, cathédrale, grande mosquée de Kpangalam. **Alédjo** juste après la faille, puis **Bafilo**.
- **Kara** : pont sur la Kara, rond-point du carrefour Tomdè, gares Kara-Sud, Nagodé, LK. **Kantè** et **Mango** (rond-point du Monument de la Paix, mosquées) avec leurs ronds-points. **Dapaong** : chaussées séparées, gares LK et Stisali.
- Bâti : R+1 et R+2 crépis, maisons inachevées avec les fers en attente, boutiques-conteneurs, panneaux publicitaires sur portique, caniveaux ouverts, lampadaires solaires ; au centre et au nord, rez-de-chaussée ocre et blancs. Les petites villes restent surtout de plain-pied.
- Nouveaux ponts nommés : Zio, Amou, Anié, Mô, Kara, Koumongou.
- Approximations : les distances sont compressées comme tout le trajet ; les monuments de rond-point de Kara, Kantè et Dapaong sont génériques (pas de source) ; les enseignes de stations portent le nom de la marque sans logo, avec des couleurs approchées.

### v0.7
- **Cinématique entre les étapes** : la N1 se trace sur la carte jusqu'à la ville d'arrivée, avec le jour, l'heure, les kilomètres parcourus et une présentation de la ville.
- **Vie au bord de la route** : bandes d'enfants qui saluent le taxi et courent derrière lui, passants qui lancent un mot dans une bulle (salutations en éwé au sud, « Alafia » au nord ; orthographe simplifiée, à faire vérifier), zémidjans chargés de bidons jaunes, de sacs de maïs, de charbon, de régimes de bananes ou d'un deuxième passager.
- **Hors ligne** : après une première visite, le jeu se lance sans réseau (service worker). La radio N1 Groove fonctionne hors ligne ; les titres en fichier demandent le réseau.

### v0.6
- **Passagers vivants** : portraits dessinés (coiffes, foulards wax, chapeau peul, kufi), répliques au quai, marchandage du prix.
- **Taxi-brousse réaliste** : descentes dans les villages de l'étape, voyageurs qui font signe au bord de la route, demandes des passagers pendant le trajet.
- **Imprévus de la N1** : crevaison, surchauffe dans la faille, camion en panne signalé par des branchages, troupeau de zébus, route inondée après l'averse.
- **Retour vers Lomé** et **carrière** : épargne d'un voyage à l'autre, atelier d'améliorations, record en étapes bouclées.
- **Sauvegarde** à chaque gare et reprise depuis l'écran titre.
- **Partage** : image Open Graph, icône d'écran d'accueil, manifeste.
- Correctifs : la station N1 Groove reprenait mal après « Recommencer l'étape » ou « Abandonner » ; la panne sèche sans argent n'offrait que l'abandon (les passagers peuvent maintenant se cotiser, ou le zém fait crédit).

### Versions précédentes

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
- Tout le monde 3D est généré dans le code : route procédurale, terrain, bâtiments, véhicules, panneaux (textures canvas), portraits (SVG), sons (WebAudio). Les seuls fichiers audio sont les titres de la radio, chargés à la demande.
- Environ 225 Ko gzippés pour le code, et moins de 200 Mo de mémoire JavaScript en jeu, stable d'une étape à l'autre.
- Décor découpé en îlots : seul ce qui est dans le champ et en deçà de la brume est dessiné.
- Qualité réduite automatiquement sur écran tactile (densité du décor, pas d'ombres ni de post-traitement) et résolution dynamique sur PC.

## Développement

```bash
npm install
npm run dev      # http://localhost:5173 (laisser le terminal ouvert)
npm test         # règles, trajet retour, marchandage, équilibrage
npm run build    # génère dist/
npm run preview  # sert dist/ sur http://localhost:4173
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
| `src/cities.js` | Plans des traversées de villes (repères OSM, 2x2 voies, feux, ronds-points, collines) |
| `src/streetlife.js` | Enfants qui saluent, passants qui parlent (bulles projetées au-dessus des personnages) |
| `public/sw.js` | Jeu hors ligne (service worker) |
| `src/roadside.js` | Voyageurs qui font signe au bord de la route, passagers qui descendent en route |
| `src/rules.js` | Règles pures : règlement des passagers, marchandage (testées par `npm test`) |
| `src/career.js` | Épargne, atelier d'améliorations, sauvegarde du voyage en cours |
| `src/portraits.js` | Portraits SVG des passagers |
| `scripts/test.mjs` | Tests des règles et de l'équilibrage (`npm test`) |
| `src/characters.js` · `src/walkers.js` | Personnages et animaux (squelette animé dans le shader, motifs wax), passants |
| `src/post.js` · `src/terrainmat.js` | Post-traitement, matériaux du sol et de l'eau |
| `scripts/` | Scripts Python qui régénèrent les données géographiques depuis l'API Overpass |
| `src/main.js` | Boucle de jeu, états (titre, gare, conduite, arrivée, fin), règles, caméra, lumière |
| `src/data.js` | Villes, étapes (aller et retour), biomes, prix, profils de passagers, répliques |
| `src/road.js` | Tracé procédural de la N1, terrain, falaises, marquages, nids-de-poule, éléments du parcours |
| `src/scenery.js` | Végétation et villages instanciés, panneaux, bornes, contrôles routiers |
| `src/traffic.js` | Camions, voitures, minibus, zémidjans, animaux qui traversent |
| `src/vehicle.js` | Physique arcade du taxi (repère de la route) |
| `src/models.js` | Modèles low-poly construits en code |
| `src/sky.js` | Ciel, cycle jour/nuit, météo, pluie |
| `src/audio.js` | Moteur, klaxon, chocs, pluie (WebAudio) |
| `src/ui.js` · `src/style.css` | HUD et écrans |

## Ajouter de la musique à la radio

1. Dépose les fichiers dans un dossier de station : `public/radio/lome/`, `public/radio/rap/`, `public/radio/legendes/` (ou crée un nouveau dossier pour une nouvelle station).
2. Nomme-les `Artiste - Titre.mp3` : le lecteur affichera l'artiste et le titre.
3. Lance `npm run radio` : la playlist `public/radio/playlist.json` est régénérée. Tu peux y corriger à la main un nom de station, une fréquence ou un titre ; ces corrections sont conservées.
4. Commit et push : la radio en ligne se met à jour.

Une station sans fichier n'apparaît pas dans le jeu. Formats lus : mp3, m4a, aac, ogg, opus, wav, webm, flac. Pour le poids du dépôt, préfère du mp3 ou de l'aac autour de 128 kbit/s (environ 3 Mo par titre).

Le dépôt est public : n'y mets que des titres dont tu as les droits de diffusion (tes propres morceaux, accord écrit de l'artiste ou du label, musique libre de droits).

## Crédits

- Données géographiques © contributeurs [OpenStreetMap](https://www.openstreetmap.org/copyright), sous licence ODbL.
- Radio : *N1 Groove* est une musique originale générée par le jeu. Station « Lomé Hits » : titres de Toofan (Africa Hoyee, Ce Magik, Apéritif), diffusés avec l'accord des artistes. Tous droits réservés à leurs auteurs.

## Licence

Code © Omar Farouk. Tous droits réservés sauf mention contraire.

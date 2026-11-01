import { pick, rand, round50, weighted } from './util.js';
import { stageKm, tOf } from './geo.js';

// Villes-étapes de la N1, du sud au nord.
export const CITIES = [
  { name: 'Lomé', gare: "Gare routière d'Agbalépédo", region: 'Maritime' },
  { name: 'Tsévié', gare: 'Gare de Tsévié', region: 'Maritime' },
  { name: 'Atakpamé', gare: "Gare d'Atakpamé", region: 'Plateaux' },
  { name: 'Sokodé', gare: 'Gare de Sokodé', region: 'Centrale' },
  { name: 'Kara', gare: 'Gare de Kara', region: 'Kara' },
  { name: 'Mango', gare: 'Gare de Mango', region: 'Savanes' },
  { name: 'Dapaong', gare: 'Gare de Dapaong', region: 'Savanes' },
];

// Le trajet est compressé : `km` est la distance réelle mesurée sur le tracé OpenStreetMap,
// `length` la longueur jouée en mètres. Les villes intermédiaires sont placées à leur vraie position relative.
const town = (name, i, shift = 0) => ({ t: +(tOf(name, i) + shift).toFixed(3), name });
export const STAGES = [
  {
    km: stageKm(0), length: 2200, rain: 0.15, harmattan: 0,
    zones: [{ until: 0.3, biome: 'urbain' }, { until: 1, biome: 'cote' }],
    towns: [town('Davié', 0)], rivers: [],
  },
  {
    km: stageKm(1), length: 3000, rain: 0.3, harmattan: 0,
    zones: [{ until: 0.55, biome: 'plaine' }, { until: 1, biome: 'plateaux' }],
    towns: [town('Notsé', 1)], rivers: [{ t: 0.4, name: 'Haho' }],
  },
  {
    km: stageKm(2), length: 3200, rain: 0.35, harmattan: 0,
    zones: [{ until: 0.42, biome: 'plateaux' }, { until: 1, biome: 'centre' }],
    towns: [town('Blitta', 2)], rivers: [{ t: 0.24, name: null }],
  },
  {
    km: stageKm(3), length: 2700, rain: 0.2, harmattan: 0.1,
    zones: [{ until: 0.46, biome: 'centre' }, { until: 0.63, biome: 'faille' }, { until: 1, biome: 'kabye' }],
    // Alédjo est juste au pied de la faille : on le place à l'entrée de la montée
    towns: [{ t: 0.4, name: 'Alédjo' }, town('Bafilo', 3)], landmark: "Faille d'Alédjo", rivers: [],
  },
  {
    km: stageKm(4), length: 3000, rain: 0.05, harmattan: 0.35,
    zones: [{ until: 0.22, biome: 'kabye' }, { until: 1, biome: 'savane' }],
    towns: [town('Kantè', 4)], rivers: [{ t: 0.955, name: 'Oti' }],
  },
  {
    km: stageKm(5), length: 2400, rain: 0, harmattan: 0.6,
    zones: [{ until: 0.35, biome: 'savane' }, { until: 1, biome: 'sahel' }],
    towns: [], rivers: [],
  },
];

export const TOTAL_KM = Math.round(STAGES.reduce((a, s) => a + s.km, 0));

// house : 'sud' (ciment, tôle), 'nord' (concessions de cases rondes), 'ville' (immeubles R+1)
// worship : poids église / mosquée ; mountains : hauteur des reliefs à l'horizon (0..1)
export const BIOMES = {
  urbain: {
    label: 'Périphérie de Lomé', ground: ['#7d8a52', '#a8936a'], shoulder: '#a86a40', hill: 0.6, curvy: 0.15, curveAmp: 0.5,
    potholes: 1.2, traffic: 1.7, density: 0.7, villageEvery: [140, 220], house: 'ville', worship: { church: 3, mosque: 1 },
    props: { coco: 4, mango: 3, neem: 2, bush: 2 }, crops: { maize: 1 }, mountains: 0, grass: 'green', bare: 0.45,
  },
  cote: {
    label: 'Côte', ground: ['#728c4a', '#a59a68'], shoulder: '#a86a40', hill: 1, curvy: 0.25, curveAmp: 0.6,
    potholes: 1.0, traffic: 1.35, density: 1.1, villageEvery: [320, 560], house: 'sud', worship: { church: 3, mosque: 0.5 },
    props: { coco: 5, oilpalm: 3, mango: 2, bush: 3, banana: 1 }, crops: { maize: 2, cassava: 2 }, mountains: 0, grass: 'green', bare: 0.2,
  },
  plaine: {
    label: 'Plaine', ground: ['#69843f', '#8a9450'], shoulder: '#a35d3a', hill: 3, curvy: 0.35, curveAmp: 0.8,
    potholes: 1.5, traffic: 1.1, density: 1, villageEvery: [480, 820], house: 'sud', worship: { church: 3, mosque: 1 },
    props: { oilpalm: 4, mango: 3, teak: 3, neem: 1.5, bush: 4, fromager: 0.4 }, crops: { maize: 3, cassava: 2, yam: 1 },
    plantation: 'teak', mountains: 0.25, grass: 'green', bare: 0.15,
  },
  plateaux: {
    label: 'Plateaux', ground: ['#557a3d', '#4a6a36'], shoulder: '#9a5634', hill: 8, curvy: 0.5, curveAmp: 1.0,
    potholes: 2, traffic: 1, density: 1.3, villageEvery: [560, 950], house: 'sud', worship: { church: 3, mosque: 1 },
    props: { teak: 4, mango: 3, banana: 2, oilpalm: 2, fromager: 0.6, bush: 5 }, crops: { cassava: 2, yam: 3, maize: 2 },
    plantation: 'teak', mountains: 0.9, grass: 'green', bare: 0.1,
  },
  centre: {
    label: 'Centre', ground: ['#88924a', '#a08f55'], shoulder: '#9e5836', hill: 5, curvy: 0.4, curveAmp: 0.9,
    potholes: 2, traffic: 0.9, density: 0.9, villageEvery: [560, 950], house: 'mixte', worship: { church: 1, mosque: 3 },
    props: { karite: 4, neem: 2, ronier: 1.5, mango: 2, bush: 4, rock: 1, termite: 1 }, crops: { yam: 4, maize: 2 },
    mountains: 0.55, grass: 'dry', tallGrass: 0.6, burnt: 0.25, bare: 0.25,
  },
  faille: {
    label: 'Faille', ground: ['#7f8c4a', '#8d7f58'], shoulder: '#9c5a36', hill: 6, curvy: 1, curveAmp: 1,
    potholes: 0.8, traffic: 0.8, density: 0.6, cliff: true, villageEvery: [99999, 99999], house: 'mixte', worship: {},
    props: { rock: 5, bush: 3, karite: 1 }, crops: {}, mountains: 1, grass: 'dry', bare: 0.3,
  },
  kabye: {
    label: 'Pays kabyè', ground: ['#8b9a4e', '#9a8a5a'], shoulder: '#a5532f', hill: 9, curvy: 0.45, curveAmp: 0.9,
    potholes: 1.5, traffic: 1, density: 0.85, villageEvery: [500, 850], house: 'mixte', worship: { church: 2, mosque: 1 },
    props: { karite: 3, neem: 2, mango: 2, ronier: 1, rock: 2, bush: 3 }, crops: { millet: 2, yam: 2, maize: 1 },
    terraces: true, mountains: 0.85, grass: 'dry', tallGrass: 0.4, burnt: 0.15, bare: 0.25,
  },
  savane: {
    label: 'Savane', ground: ['#ad9a58', '#9a8448'], shoulder: '#b4693a', hill: 2, curvy: 0.25, curveAmp: 0.6,
    potholes: 2.5, traffic: 0.8, density: 0.75, villageEvery: [560, 1000], house: 'nord', worship: { church: 1, mosque: 3 },
    props: { baobab: 1.5, ronier: 2, karite: 4, neem: 1.5, termite: 3, dry: 4, rock: 0.6 }, crops: { millet: 4, yam: 1 },
    mountains: 0.15, grass: 'dry', tallGrass: 1, burnt: 0.35, bare: 0.3,
  },
  sahel: {
    label: 'Sahel', ground: ['#c8a66a', '#b48c55'], shoulder: '#bb7542', hill: 1, curvy: 0.15, curveAmp: 0.5,
    potholes: 2, traffic: 0.7, density: 0.5, villageEvery: [650, 1100], house: 'nord', worship: { church: 1, mosque: 3 },
    props: { baobab: 1.2, dry: 5, karite: 1.5, neem: 1, ronier: 0.6, termite: 2 }, crops: { millet: 4 },
    mountains: 0, grass: 'dry', tallGrass: 0.5, burnt: 0.3, bare: 0.45,
  },
};
// compatibilité : anciens drapeaux
for (const B of Object.values(BIOMES)) B.huts = B.house === 'nord';

export const PRICES = {
  fuelGare: 650, // F / litre à la gare
  fuelRoad: 750, // F / litre chez la vendeuse au bord de la route
  repair: 140, // F / point d'état
  farePerKm: 20,
  bagPerHop: 400,
  fine: 5000,
  rescue: 5000, // un zém va chercher de l'essence
  rescueLiters: 6,
  goat: 5000,
  bagLost: 2000,
};

// capacités du véhicule choisi au garage (liaisons vivantes : mises à jour par setCapacity)
export let TANK = 50;
export let SEATS = 7;
export let ROOF = 6;
export function setCapacity(spec) { TANK = spec.tank; SEATS = spec.seats; ROOF = spec.roof; }

const FEMALE = ['Ama', 'Afi', 'Yawa', 'Sénam', 'Akouvi', 'Dzifa', 'Kafui', 'Tchilalo', 'Pidassa', 'Lardja', 'Fatoumata', 'Aïcha', 'Massama', 'Essi', 'Abla', 'Mawussi'];
const MALE = ['Kossi', 'Komlan', 'Edem', 'Mawuli', 'Essowè', 'Kpatcha', 'Abalo', 'Yendoubé', 'Moussa', 'Issifou', 'Kodjo', 'Koffi', 'Yao', 'Damipi', 'Sélom', 'Kokou'];

export const TRAITS = {
  commerce: { f: 'Commerçante', m: 'Commerçant', desc: 'Charge des sacs, paie les bagages', bags: [2, 3], sens: 1, fareMul: 1, icon: '🧺' },
  presse: { f: 'Pressée', m: 'Pressé', desc: 'Bonus si tu roules vite', bags: [0, 1], sens: 0.9, fareMul: 1.15, rush: true, icon: '⏱' },
  malade: { f: 'Mal des transports', m: 'Mal des transports', desc: 'Déteste les secousses', bags: [0, 1], sens: 2, fareMul: 1, icon: '🤢' },
  etudiant: { f: 'Étudiante', m: 'Étudiant', desc: 'Paie moins, ne se plaint pas', bags: [0, 1], sens: 0.5, fareMul: 0.7, icon: '🎒' },
  ancien: { f: 'Grand-mère', m: 'Grand-père', desc: 'Gros pourboire si le trajet est doux', bags: [1, 1], sens: 1.5, fareMul: 1, tipMul: 2.2, icon: '👵' },
  chevre: { f: 'Avec une chèvre', m: 'Avec une chèvre', desc: 'La chèvre voyage sur le toit', bags: [1, 1], sens: 1, fareMul: 1.1, goat: true, icon: '🐐' },
  agent: { f: 'Fonctionnaire', m: 'Fonctionnaire', desc: 'Paie le prix normal', bags: [0, 1], sens: 1, fareMul: 1, icon: '💼' },
};

const TRAIT_WEIGHTS = { commerce: 3, presse: 2, malade: 1.5, etudiant: 2, ancien: 1.2, chevre: 0.8, agent: 2 };

let pid = 0;
export function makeOffers(rng, cityIndex, aboard = []) {
  const offers = [];
  const taken = new Set(aboard.map((p) => p.first));
  const n = 5 + Math.floor(rng() * 4);
  for (let k = 0; k < n; k++) {
    const maxTo = Math.min(CITIES.length - 1, cityIndex + 3);
    const span = maxTo - cityIndex;
    // plus de demandes pour les villes proches
    const hop = 1 + Math.floor(Math.pow(rng(), 1.7) * span);
    const to = cityIndex + hop;
    const female = rng() < 0.5;
    const trait = weighted(rng, TRAIT_WEIGHTS);
    const T = TRAITS[trait];
    const pool = (female ? FEMALE : MALE).filter((x) => !taken.has(x));
    const first = pick(rng, pool.length ? pool : female ? FEMALE : MALE);
    taken.add(first);
    let name = first;
    if (trait === 'ancien') name = (female ? 'Mémé ' : 'Papa ') + name;
    else if (trait === 'commerce' && female) name = 'Tantie ' + name;
    const bags = T.bags[0] + Math.floor(rng() * (T.bags[1] - T.bags[0] + 1));
    let km = 0;
    for (let i = cityIndex; i < to; i++) km += STAGES[i].km;
    const fare = round50(km * PRICES.farePerKm * T.fareMul * rand(rng, 0.9, 1.1) + bags * PRICES.bagPerHop * hop);
    offers.push({ id: ++pid, name, first, female, trait, to, from: cityIndex, bags, fare, sat: 100, km });
  }
  return offers.sort((a, b) => a.to - b.to);
}

export function traitLabel(p) {
  const T = TRAITS[p.trait];
  return p.female ? T.f : T.m;
}

export const QUOTES = {
  bump: ['Doucement chauffeur !', 'Eh, mon dos !', 'Chauffeur, on n’est pas pressés de mourir oh !', 'Yéé, ces trous !', 'Ralentis un peu, on est chargés !'],
  curve: ['Chauffeur, tu vas nous renverser !', 'Doucement dans le virage !', 'Pardon, freine un peu !'],
  crash: ['Accident !', 'Ahi ! Le taxi !'],
  smooth: ['Ça, c’est un bon chauffeur.', 'On roule bien aujourd’hui.', 'Tranquille, ça va aller.'],
  offroad: ['Reviens sur le goudron !', 'On n’est pas au champ, chauffeur !'],
  goat: ['La chèvre sur le toit proteste.', 'Mééé ! (la chèvre n’aime pas ça)'],
};

export function weatherFor(rng, i) {
  const S = STAGES[i];
  const r = rng();
  if (r < S.rain) return 'rain';
  if (r < S.rain + S.harmattan) return 'harmattan';
  return 'clear';
}

export const WEATHER_LABEL = { clear: 'Ciel dégagé', rain: 'Pluie', harmattan: 'Harmattan (poussière)' };

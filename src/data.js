import { pick, rand, round50, weighted } from './util.js';

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

// Le trajet est compressé : `km` est la distance réelle (approx.), `length` la longueur jouée en mètres.
export const STAGES = [
  { km: 35, length: 2000, zones: [{ until: 1, biome: 'cote' }], towns: [{ t: 0.5, name: 'Davié' }], rain: 0.15, harmattan: 0 },
  { km: 125, length: 2800, zones: [{ until: 0.55, biome: 'plaine' }, { until: 1, biome: 'plateaux' }], towns: [{ t: 0.42, name: 'Notsé' }], rain: 0.3, harmattan: 0 },
  { km: 170, length: 3000, zones: [{ until: 1, biome: 'plateaux' }], towns: [{ t: 0.5, name: 'Blitta' }], rain: 0.35, harmattan: 0 },
  {
    km: 85, length: 2700,
    zones: [{ until: 0.26, biome: 'centre' }, { until: 0.6, biome: 'faille' }, { until: 1, biome: 'centre' }],
    towns: [{ t: 0.74, name: 'Bafilo' }], landmark: "Faille d'Alédjo", rain: 0.2, harmattan: 0.1,
  },
  { km: 150, length: 2800, zones: [{ until: 0.35, biome: 'centre' }, { until: 1, biome: 'savane' }], towns: [{ t: 0.45, name: 'Kantè' }], rain: 0.05, harmattan: 0.35 },
  { km: 80, length: 2300, zones: [{ until: 0.3, biome: 'savane' }, { until: 1, biome: 'sahel' }], towns: [], rain: 0, harmattan: 0.6 },
];

export const TOTAL_KM = STAGES.reduce((a, s) => a + s.km, 0);

export const BIOMES = {
  cote: {
    label: 'Côte', ground: ['#7da34f', '#c2b277'], shoulder: '#b8743f', hill: 1, curvy: 0.25, curveAmp: 0.6,
    potholes: 1.0, traffic: 1.35, density: 1.1, villageEvery: [320, 560],
    props: { palm: 6, mango: 2, bush: 3 },
  },
  plaine: {
    label: 'Plaine', ground: ['#6f9d45', '#93ad55'], shoulder: '#b0603a', hill: 3, curvy: 0.35, curveAmp: 0.8,
    potholes: 1.5, traffic: 1.1, density: 1, villageEvery: [480, 820],
    props: { mango: 4, teak: 3, bush: 4, palm: 1.5, karite: 1 },
  },
  plateaux: {
    label: 'Plateaux', ground: ['#4c8a3a', '#3d7433'], shoulder: '#a9552f', hill: 8, curvy: 0.55, curveAmp: 1.1,
    potholes: 2, traffic: 1, density: 1.25, villageEvery: [560, 950],
    props: { teak: 5, mango: 3, bush: 5, palm: 1, rock: 0.5 },
  },
  centre: {
    label: 'Centre', ground: ['#8ea24c', '#a59a55'], shoulder: '#ad5a33', hill: 5, curvy: 0.4, curveAmp: 0.9,
    potholes: 2, traffic: 0.9, density: 0.9, villageEvery: [560, 950],
    props: { karite: 4, mango: 2, bush: 4, rock: 1, termite: 1, teak: 1 },
  },
  faille: {
    label: 'Faille', ground: ['#7f8c4a', '#8d7f58'], shoulder: '#9c5a36', hill: 6, curvy: 1, curveAmp: 1,
    potholes: 0.8, traffic: 0.8, density: 0.6, cliff: true, villageEvery: [99999, 99999],
    props: { rock: 5, bush: 3, karite: 1 },
  },
  savane: {
    label: 'Savane', ground: ['#b9a456', '#a48d46'], shoulder: '#b4693a', hill: 2, curvy: 0.25, curveAmp: 0.6,
    potholes: 2.5, traffic: 0.8, density: 0.75, huts: true, villageEvery: [560, 1000],
    props: { baobab: 1.5, karite: 4, termite: 3, dry: 4, rock: 0.6 },
  },
  sahel: {
    label: 'Sahel', ground: ['#c8a66a', '#b48c55'], shoulder: '#bb7542', hill: 1, curvy: 0.15, curveAmp: 0.5,
    potholes: 2, traffic: 0.7, density: 0.5, huts: true, villageEvery: [650, 1100],
    props: { baobab: 1.2, dry: 5, karite: 1.5, termite: 2 },
  },
};

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

export const TANK = 50;
export const SEATS = 7;
export const ROOF = 6;

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
export function makeOffers(rng, cityIndex) {
  const offers = [];
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
    let name = pick(rng, female ? FEMALE : MALE);
    if (trait === 'ancien') name = (female ? 'Mémé ' : 'Papa ') + name;
    else if (trait === 'commerce' && female) name = 'Tantie ' + name;
    const bags = T.bags[0] + Math.floor(rng() * (T.bags[1] - T.bags[0] + 1));
    let km = 0;
    for (let i = cityIndex; i < to; i++) km += STAGES[i].km;
    const fare = round50(km * PRICES.farePerKm * T.fareMul * rand(rng, 0.9, 1.1) + bags * PRICES.bagPerHop * hop);
    offers.push({ id: ++pid, name, female, trait, to, from: cityIndex, bags, fare, sat: 100, km });
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

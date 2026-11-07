import { pick, rand, round50, weighted } from './util.js';
import { stageKm, tOf, kmOf, STAGE_CITIES } from './geo.js';
export { kmOf };

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
// longueur jouée : le trajet réel est compressé ; LEN_SCALE allonge toutes les étapes
export const LEN_SCALE = 2.5;
const town = (name, i, shift = 0) => ({ t: +(tOf(name, i) + shift).toFixed(3), name });
export const STAGES = [
  {
    km: stageKm(0), length: Math.round(2200 * LEN_SCALE), rain: 0.15, harmattan: 0,
    zones: [{ until: 0.6, biome: 'urbain' }, { until: 1, biome: 'cote' }],
    towns: [town('Davié', 0)], rivers: [{ t: 0.455, name: 'Zio' }],
  },
  {
    km: stageKm(1), length: Math.round(3000 * LEN_SCALE), rain: 0.3, harmattan: 0,
    zones: [{ until: 0.55, biome: 'plaine' }, { until: 1, biome: 'plateaux' }],
    towns: [town('Notsé', 1)], rivers: [{ t: 0.4, name: 'Haho' }, { t: 0.84, name: 'Amou' }],
  },
  {
    km: stageKm(2), length: Math.round(3200 * LEN_SCALE), rain: 0.35, harmattan: 0,
    zones: [{ until: 0.42, biome: 'plateaux' }, { until: 1, biome: 'centre' }],
    towns: [town('Blitta', 2)], rivers: [{ t: 0.15, name: 'Anié' }],
  },
  {
    km: stageKm(3), length: Math.round(2700 * LEN_SCALE), rain: 0.2, harmattan: 0.1,
    zones: [{ until: 0.43, biome: 'centre' }, { until: 0.55, biome: 'faille' }, { until: 1, biome: 'kabye' }],
    // OSM : péage d'Alédjo, lacets, tranchée de la faille, puis le village d'Alédjo juste après
    towns: [{ t: 0.58, name: 'Alédjo' }, town('Bafilo', 3)], landmark: "Faille d'Alédjo", rivers: [{ t: 0.33, name: 'Mô' }, { t: 0.95, name: 'Kara' }],
  },
  {
    km: stageKm(4), length: Math.round(3000 * LEN_SCALE), rain: 0.05, harmattan: 0.35,
    zones: [{ until: 0.22, biome: 'kabye' }, { until: 1, biome: 'savane' }],
    towns: [town('Kantè', 4)], rivers: [{ t: 0.78, name: 'Koumongou' }, { t: 0.93, name: 'Oti' }],
  },
  {
    km: stageKm(5), length: Math.round(2400 * LEN_SCALE), rain: 0, harmattan: 0.6,
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

// Postes de péage de la SAFER situés sur la N1 (coordonnées officielles projetées sur le tracé OSM, en km depuis Lomé)
export const TOLLS = [
  { name: 'Davié', km: 25.8 },
  { name: 'Sotouboua', km: 282.0 },
  { name: 'Alédjo', km: 367.0 },
  { name: 'Mango', km: 544.5, t: 0.965 }, // entrée sud de Mango, après le pont sur l'Oti
];

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
  toll: 500, // péage : véhicule léger 500 F (grille 2021), minibus 9-15 places 500 F (grille de juillet 2026)
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
export const nextPid = () => ++pid;
export const bumpPid = (n) => { pid = Math.max(pid, n); };

// sens du voyage : dir = 1 à l'aller (Lomé → Dapaong), -1 au retour ; k = numéro de l'étape dans ce sens
export const cityAt = (dir, k) => (dir > 0 ? k : CITIES.length - 1 - k);
export const legIndex = (dir, cityIndex) => (dir > 0 ? cityIndex : CITIES.length - 1 - cityIndex);
const kmBetween = (a, b) => Math.abs(kmOf(b) - kmOf(a));

// répliques de quai, selon le profil
export const BOARD_LINES = {
  commerce: ['Mes sacs de maïs vont au marché de {d}.', 'J’ai des pagnes à livrer à {d}, fais attention aux colis.', 'Chauffeur, le marché de {d} n’attend pas !'],
  presse: ['On part quand ? J’ai un rendez-vous à {d}.', 'Si tu roules bien, je te donne quelque chose en plus.', 'Je dois être à {d} avant midi.'],
  malade: ['Je supporte mal la route… doucement jusqu’à {d}.', 'Place près de la fenêtre, s’il te plaît.', 'Pas trop de virages, hein.'],
  etudiant: ['Je rentre à {d} pour les vacances.', 'Fais-moi un prix étudiant, tonton.', 'Je vais voir ma famille à {d}.'],
  ancien: ['Mon fils, conduis doucement jusqu’à {d}.', 'Je vais aux funérailles de mon frère à {d}.', 'À mon âge, on ne court plus.'],
  chevre: ['La chèvre est pour la fête à {d}.', 'Attache-la bien sur le toit.', 'Elle est sage, elle ne bougera pas.'],
  agent: ['Mutation à {d}, je prends mon poste lundi.', 'Mission de service à {d}.', 'Le prix normal, pas plus.'],
};

function fareFor(rng, T, km, bags, hop) {
  return round50(km * PRICES.farePerKm * T.fareMul * rand(rng, 0.9, 1.1) + bags * PRICES.bagPerHop * hop);
}

// un passager : `to` = ville d'arrivée (index de CITIES) ; `town` = village où il descend en route (étape `leg`)
export function makePassenger(rng, { from, to, town = null, leg, dir, taken, fromName }) {
  const female = rng() < 0.5;
  const trait = weighted(rng, TRAIT_WEIGHTS);
  const T = TRAITS[trait];
  const pool = (female ? FEMALE : MALE).filter((x) => !taken.has(x));
  const first = pick(rng, pool.length ? pool : female ? FEMALE : MALE);
  taken.add(first);
  let name = first;
  if (trait === 'ancien') name = (female ? 'Mémé ' : 'Papa ') + name;
  else if (trait === 'commerce' && female) name = 'Tantie ' + name;
  const hop = town ? 1 : Math.abs(to - from);
  const bags = town ? Math.min(1, T.bags[0] + Math.floor(rng() * 2)) : T.bags[0] + Math.floor(rng() * (T.bags[1] - T.bags[0] + 1));
  const destName = town || CITIES[to].name;
  const km = Math.round(kmBetween(fromName || CITIES[from].name, destName));
  const fare = fareFor(rng, T, km, bags, hop);
  const line = pick(rng, BOARD_LINES[trait]).replace('{d}', destName);
  return { id: ++pid, name, first, female, trait, to, from, town, leg, dir, bags, fare, sat: 100, km, line, look: Math.floor(rng() * 1e6) };
}

export function makeOffers(rng, cityIndex, aboard = [], dir = 1) {
  const offers = [];
  const taken = new Set(aboard.map((p) => p.first));
  const n = 5 + Math.floor(rng() * 4);
  const k = legIndex(dir, cityIndex);
  const last = dir > 0 ? CITIES.length - 1 : 0;
  const leg = legOf(dir, k);
  const towns = leg.towns.filter((t) => t.t > 0.08 && t.t < 0.92);
  for (let j = 0; j < n; j++) {
    // quelques voyageurs descendent dans un village de l'étape (comme dans un vrai taxi-brousse)
    if (towns.length && rng() < 0.28) {
      const t = pick(rng, towns);
      offers.push(makePassenger(rng, { from: cityIndex, to: cityIndex + dir, town: t.name, leg: k, dir, taken }));
      continue;
    }
    const span = Math.min(3, Math.abs(last - cityIndex));
    // plus de demandes pour les villes proches
    const hop = 1 + Math.floor(Math.pow(rng(), 1.7) * span);
    const to = cityIndex + dir * hop;
    offers.push(makePassenger(rng, { from: cityIndex, to, leg: k + hop - 1, dir, taken }));
  }
  return offers.sort((a, b) => Math.abs(a.to - cityIndex) - Math.abs(b.to - cityIndex) || (a.town ? -1 : 1));
}

// voyageur qui fait signe au bord de la route : il va à la prochaine ville-étape (ou un peu plus loin)
export function makeHailer(rng, { dir, k, aboard, villageName = null }) {
  const taken = new Set(aboard.map((p) => p.first));
  const from = cityAt(dir, k);
  const last = dir > 0 ? CITIES.length - 1 : 0;
  const hop = Math.min(Math.abs(last - from), rng() < 0.7 ? 1 : 2);
  const to = from + dir * hop;
  const p = makePassenger(rng, { from, to, leg: k + hop - 1, dir, taken });
  // payé pour la portion restante seulement : environ la moitié de l'étape
  p.fare = round50(p.fare * (hop === 1 ? 0.55 : 0.75));
  p.km = Math.round(p.km * (hop === 1 ? 0.5 : 0.75));
  p.roadside = villageName || true;
  return p;
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

// péages de chaque étape (position relative 0..1)
STAGES.forEach((st, i) => {
  const a = kmOf(STAGE_CITIES[i]), b = kmOf(STAGE_CITIES[i + 1]);
  st.tolls = TOLLS.filter((t) => t.km > a && t.km < b).map((t) => ({ name: t.name, t: t.t ?? +((t.km - a) / (b - a)).toFixed(3) }));
});

// étapes : géographie (geoIndex) et sens (reverse). Au retour, l'étape k parcourt l'étape 5-k à l'envers.
STAGES.forEach((st, i) => { st.geoIndex = i; st.reverse = false; st.from = i; st.to = i + 1; });
const flipT = (list) => list.map((o) => ({ ...o, t: +(1 - o.t).toFixed(3) })).sort((a, b) => a.t - b.t);
export const RSTAGES = STAGES.map((S, i) => {
  const z = S.zones, zones = [];
  for (let j = z.length - 1; j >= 0; j--) zones.push({ until: j === 0 ? 1 : +(1 - z[j - 1].until).toFixed(3), biome: z[j].biome });
  return { ...S, zones, towns: flipT(S.towns), rivers: flipT(S.rivers), tolls: flipT(S.tolls), geoIndex: i, reverse: true, from: i + 1, to: i };
});
export function legOf(dir, k) { return dir > 0 ? STAGES[k] : RSTAGES[STAGES.length - 1 - k]; }
export const LEGS = STAGES.length;

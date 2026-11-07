// Carrière du chauffeur : épargne gardée d'un voyage à l'autre, améliorations achetées à l'atelier.
// La sauvegarde du voyage en cours (reprise à la gare) est aussi ici.
import { VEHICLES } from './garage.js';

export const START_CASH = 12000; // avance du patron au départ de chaque voyage

export const UPGRADES = [
  { id: 'amortisseurs', name: 'Amortisseurs neufs', price: 7000, desc: 'Nids-de-poule et dos-d’âne secouent un tiers de moins les passagers et le taxi.' },
  { id: 'pneus', name: 'Pneus neufs et roue de secours', price: 5000, desc: 'Beaucoup moins de crevaisons, roue changée deux fois plus vite, un peu plus d’adhérence.' },
  { id: 'radiateur', name: 'Radiateur refait', price: 5000, desc: 'Le moteur chauffe moitié moins dans les montées, même chargé.' },
  { id: 'moteur', name: 'Moteur révisé', price: 9000, desc: '+8 % de puissance et 10 % d’essence en moins.' },
  { id: 'galerie', name: 'Galerie renforcée', price: 6000, desc: '+2 colis sur le toit.' },
  { id: 'reservoir', name: 'Bidon de réserve', price: 4000, desc: '+10 litres d’essence embarqués.' },
];

const KEY = 'n1.career';
export function loadCareer() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && typeof c.savings === 'number') return { trips: 0, returns: 0, km: 0, earned: 0, up: {}, ...c };
  } catch { /* stockage indisponible */ }
  return { savings: 0, trips: 0, returns: 0, km: 0, earned: 0, up: {} };
}
export function saveCareer(c) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

// caractéristiques du véhicule une fois les améliorations montées
export function vehicleSpec(model, up = {}) {
  const V = { ...VEHICLES[model] };
  if (up.moteur) { V.power *= 1.08; V.fuel *= 0.9; }
  if (up.pneus) V.grip *= 1.05;
  if (up.galerie) V.roof += 2;
  if (up.reservoir) V.tank += 10;
  V.shock = up.amortisseurs ? 0.65 : 1;
  V.heat = up.radiateur ? 0.5 : 1;
  V.flat = up.pneus ? 0.3 : 1;
  V.wheelTime = up.pneus ? 3.5 : 7;
  return V;
}

/* ------------------------------------------------------------ voyage en cours */
const RUN_KEY = 'n1.save';
const RUN_FIELDS = ['seed', 'dir', 'weathers', 'stage', 'reached', 'legs', 'cfg', 'money', 'fuel', 'hp', 'passengers', 'bags', 'hour', 'stats'];
export function saveRun(run, offers) {
  try {
    const o = { v: 2, t: Date.now(), offers };
    for (const k of RUN_FIELDS) o[k] = run[k];
    localStorage.setItem(RUN_KEY, JSON.stringify(o));
  } catch { /* ignore */ }
}
export function loadRun() {
  try {
    const o = JSON.parse(localStorage.getItem(RUN_KEY) || 'null');
    if (o && o.v === 2 && VEHICLES[o.cfg?.model]) return o;
  } catch { /* ignore */ }
  return null;
}
export function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ } }

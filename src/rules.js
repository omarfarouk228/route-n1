// Règles pures du voyage (sans Three.js ni DOM) : règlement des passagers, marchandage, équilibrage.
// Elles sont testées par `npm test` (scripts/test.mjs).
import { TRAITS } from './data.js';
import { round50, pick } from './util.js';

// règlement d'un passager qui descend : pourboire, discussion du prix ou remboursement
export function settle(p, { late = false, missed = false } = {}) {
  const T = TRAITS[p.trait];
  const e = p.female ? 'e' : '';
  const lines = [];
  let total = 0;
  if (missed) {
    const back = -round50(p.fare * 0.4);
    lines.push({ label: `${p.name} : « Chauffeur, tu as dépassé ${p.town || 'mon arrêt'} ! » (remboursement)`, amount: back });
    return { lines, total: back };
  }
  if (p.sat >= 85) { const tip = round50(p.fare * 0.15 * (T.tipMul || 1)); lines.push({ label: `${p.name} est ravi${e} : pourboire`, amount: tip }); total += tip; }
  else if (p.sat >= 60) lines.push({ label: `${p.name} descend sans rien dire`, amount: 0 });
  else if (p.sat >= 35) { const t = -round50(p.fare * 0.2); lines.push({ label: `${p.name} discute le prix (trajet secoué)`, amount: t }); total += t; }
  else { const t = -round50(p.fare * 0.45); lines.push({ label: `${p.name} exige un remboursement`, amount: t }); total += t; }
  if (T.rush) {
    if (!late) { const b = round50(p.fare * 0.2); lines.push({ label: `${p.name} est arrivé${e} à l’heure : bonus`, amount: b }); total += b; }
    else lines.push({ label: `${p.name} est arrivé${e} en retard`, amount: 0 });
  }
  return { lines, total };
}

// marchandage à la gare : demander plus que le prix affiché
const HAGGLE = {
  commerce: { p: 0.5, counter: 0.1, yes: ['Bon, d’accord, mais tu fais attention à mes sacs.'], no: ['Eh ! Le taxi d’à côté prend moins cher.'], mid: ['On coupe la poire en deux, chauffeur.'] },
  presse: { p: 0.8, yes: ['D’accord, d’accord, mais on part maintenant !'], no: ['Trop cher, je prends le minibus.'] },
  malade: { p: 0.5, yes: ['Si tu roules doucement, ça va.'], no: ['Non, je vais attendre le prochain.'] },
  etudiant: { p: 0.15, yes: ['Bon… je mange moins ce soir.'], no: ['Tonton, je suis étudiant ! Je pars à pied alors.'] },
  ancien: { p: 0.4, yes: ['Mon fils, Dieu te voit.'], no: ['À mon âge on ne me roule pas. Au revoir.'] },
  chevre: { p: 0.45, counter: 0.1, yes: ['La chèvre paie sa place, ça va.'], no: ['Ma chèvre ne vaut pas ce prix-là !'], mid: ['Un peu moins, la chèvre est petite.'] },
  agent: { p: 0.35, yes: ['C’est noté. Je connais le tarif, hein.'], no: ['Je connais le tarif officiel. Non merci.'] },
};
export function haggle(rng, o) {
  const H = HAGGLE[o.trait] || HAGGLE.agent;
  const r = rng();
  if (r < H.p) return { ok: true, fare: round50(o.fare * 1.2), sat: 88, line: pick(rng, H.yes) };
  if (H.counter && r < H.p + 0.25) return { ok: true, fare: round50(o.fare * (1 + H.counter)), sat: 94, line: pick(rng, H.mid) };
  return { ok: false, line: pick(rng, H.no) };
}

// délai pour un passager pressé (m/s moyens attendus)
export const RUSH_SPEED = 19;

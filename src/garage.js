// Garage : modèles de véhicules et personnalisation (sauvegardée dans le navigateur).
export const VEHICLES = {
  break: {
    name: 'Break 7 places', tag: 'Polyvalent',
    desc: 'Le taxi-brousse classique des gares togolaises : 7 places et une galerie solide pour les colis.',
    seats: 7, roof: 6, tank: 50, mass: 1350, power: 4300, vmax: 37, grip: 1, fuel: 1, len: 4.6, wid: 1.8,
  },
  minibus: {
    name: 'Minibus 12 places', tag: 'Gros chargement',
    desc: 'Plus de billets à vendre, mais lourd, gourmand et lent dans la faille d’Alédjo.',
    seats: 12, roof: 8, tank: 65, mass: 2100, power: 5600, vmax: 33, grip: 0.86, fuel: 1.45, len: 5.2, wid: 2.0,
  },
  berline: {
    name: 'Berline 4 places', tag: 'Rapide',
    desc: 'Nerveuse et économe : idéale pour les passagers pressés, mais seulement 4 places et un petit coffre.',
    seats: 4, roof: 2, tank: 45, mass: 1150, power: 4100, vmax: 40.5, grip: 1.12, fuel: 0.8, len: 4.4, wid: 1.78,
  },
};

export const PALETTE = [
  ['Jaune taxi', '#e9b53a'], ['Blanc ivoire', '#f1ece0'], ['Rouge', '#c8322b'], ['Bleu roi', '#2f5f9f'],
  ['Vert forêt', '#0f5c3c'], ['Noir', '#1d1c1a'], ['Violet', '#6b3a8c'], ['Orange', '#e8782a'],
  ['Gris métal', '#8f969c'], ['Turquoise', '#3aa6a0'], ['Bordeaux', '#7a2230'], ['Sable', '#c9a46a'],
];
export const STRIPES = [
  ['Vert/rouge', '#1f7a3a', '#d03a2f'], ['Togo', '#006a4e', '#ffce00'], ['Noir/blanc', '#1d1c1a', '#f1ece0'],
  ['Bleu/jaune', '#2f5f9f', '#f4c430'], ['Rouge/or', '#c8322b', '#e9b53a'], ['Aucune', null, null],
];
export const RIMS = [['Chrome', '#c9ccd0'], ['Noir', '#1d1c1a'], ['Or', '#c9a032'], ['Blanc', '#f1ece0'], ['Rouge', '#c8322b']];
export const SLOGANS = ['DIEU EST GRAND', 'MERCI MAMAN', 'PATIENCE', 'LA ROUTE EST LONGUE', 'GRÂCE DE DIEU', 'ON VA ARRIVER', 'TOUT VIENT DE DIEU', 'JALOUSIE NE PAIE PAS'];

export const DEFAULT_CFG = {
  model: 'break', body: '#e9b53a', stripe: 0, rims: '#c9ccd0', rack: true, slogan: 'DIEU EST GRAND', plate: 'TG 2410 BD',
};

export function loadCfg() {
  try {
    const c = JSON.parse(localStorage.getItem('n1.garage') || 'null');
    if (c && VEHICLES[c.model]) return { ...DEFAULT_CFG, ...c };
  } catch { /* stockage indisponible */ }
  return { ...DEFAULT_CFG };
}
export function saveCfg(cfg) {
  try { localStorage.setItem('n1.garage', JSON.stringify(cfg)); } catch { /* ignore */ }
}
export const cleanText = (t, n) => String(t || '').toUpperCase().replace(/[^A-Z0-9ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ' !.\-]/g, '').slice(0, n).trim();

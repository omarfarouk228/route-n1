// Traversées des villes par la N1, d'après OpenStreetMap (relevé du 7 novembre 2026) et la presse togolaise.
// Pour chaque ville : longueur jouée (demi-traversée `span`, en mètres de jeu) et repères dans l'ordre réel.
//   at   : position de -1 (entrée sud) à +1 (sortie nord), 0 = gare / centre ; pour Lomé, 0 = gare d'Agbalépédo et 1 = péage de Davié
//   side : 'G' ou 'D' en roulant vers le nord (au retour, tout est inversé)
//   d    : retrait par rapport au bord de la route (m de jeu)
// Les positions sont relatives (l'ordre et le côté sont sourcés ; les distances sont compressées comme le reste du trajet).
export const CITY_PLANS = {
  'Lomé': {
    span: 'toll', // de la gare jusqu'au péage de Davié
    dual: [[-0.05, 1.02]], // boulevard Gnassingbé Eyadéma en 2x2 voies avec terre-plein
    lights: [0.035, 0.07, 0.13, 0.32], // feux : GTA, 6,208, Agoè-Nyivé, Agoè Zongo
    urban: [[-0.05, 0.62]], dense: 1.45, style: 'ville',
    lamps: true, gutters: true,
    marks: [
      { at: 0.015, side: 'G', kind: 'station', brand: 'TOTAL', label: 'Lomé 2' },
      { at: 0.04, side: 'G', kind: 'station', brand: 'MRS' },
      { at: 0.06, side: 'G', kind: 'gare', label: 'CTK KANTAGUIBA' },
      { at: 0.08, side: 'G', kind: 'station', brand: 'TOTAL' },
      { at: 0.095, side: 'G', kind: 'gare', label: 'LK LOMÉ-KARA', d: 6 },
      { at: 0.105, side: 'D', kind: 'station', brand: 'TOTAL', label: 'Agoè' },
      { at: 0.115, side: 'D', kind: 'gare', label: 'ZAM ZAM' },
      { at: 0.125, side: 'D', kind: 'station', brand: 'T-OIL' },
      { at: 0.15, side: 'G', kind: 'church', label: 'TEMPLE EEPT', scale: 0.9 },
      { at: 0.16, side: 'D', kind: 'mairie', label: 'MAIRIE AGOÈ-NYIVÉ' },
      { at: 0.18, side: 'D', kind: 'church', label: 'STE MARIE THÉOTOKOS', scale: 1.15, d: 6 },
      { at: 0.2, side: 'G', kind: 'police', label: 'COMMISSARIAT' },
      { at: 0.24, side: 'G', kind: 'station', brand: 'SANOL' },
      { at: 0.29, side: 'G', kind: 'station', brand: 'TOTAL', label: 'Agoè Zongo' },
      { at: 0.34, side: 'G', kind: 'market', label: 'MARCHÉ D’AGOÈ ZONGO', d: 4 },
      { at: 0.37, side: 'G', kind: 'mosque' },
      { at: 0.4, side: 'D', kind: 'station', brand: 'MRS' },
      { at: 0.43, side: 'D', kind: 'station', brand: 'TOTAL' },
      { at: 0.47, side: 'G', kind: 'mairie', label: 'MAIRIE DE TOGBLÉKOPÉ' },
      { at: 0.66, side: 'G', kind: 'cattle', label: 'MARCHÉ À BÉTAIL' },
      { at: 0.7, side: 'D', kind: 'station', brand: 'TOTAL', label: 'Adétikopé' },
      { at: 0.73, side: 'G', kind: 'church', label: 'WINNERS CHAPEL' },
      { at: 0.76, side: 'D', kind: 'market', label: 'MARCHÉ D’ADÉTIKOPÉ', d: 5 },
      { at: 0.8, side: 'D', kind: 'station', brand: 'T-OIL' },
      { at: 0.93, side: 'D', kind: 'station', brand: 'SANOL' },
      { at: 1.04, side: 'D', kind: 'hotel', label: 'HÔTEL LE PÉAGE' },
    ],
  },
  'Tsévié': {
    span: 380, urban: [[-1, 1]], dense: 1.4, lamps: true, gutters: true,
    marks: [
      { at: -0.9, side: 'D', kind: 'hotel', label: 'AUBERGE GINA' },
      { at: -0.78, side: 'D', kind: 'station', brand: 'TOTAL', label: 'Tsévié 3' },
      { at: -0.66, side: 'D', kind: 'station', brand: 'OANDO' },
      { at: -0.55, side: 'G', kind: 'mosque' },
      { at: -0.44, side: 'D', kind: 'hospital', label: 'POLYCLINIQUE' },
      { at: -0.32, side: 'D', kind: 'police', label: 'COMMISSARIAT' },
      { at: -0.3, side: 'G', kind: 'police', label: 'GENDARMERIE' },
      { at: -0.18, side: 'D', kind: 'church', label: 'ÉGLISE CATHOLIQUE' },
      { at: -0.08, side: 'D', kind: 'station', brand: 'TOTAL', label: 'Tsévié 2' },
      { at: -0.06, side: 'G', kind: 'station', brand: 'TOTAL', label: 'Tsévié 1' },
      { at: 0.06, side: 'D', kind: 'market', label: 'GRAND MARCHÉ DE TSÉVIÉ', d: 8 },
      { at: 0.16, side: 'D', kind: 'zemstand', label: 'ZÉMIDJANS' },
      { at: 0.26, side: 'G', kind: 'mairie', label: 'HÔTEL DE VILLE' },
      { at: 0.36, side: 'D', kind: 'station', brand: 'ÉTOILE DU GOLFE' },
      { at: 0.5, side: 'D', kind: 'market', label: 'MARCHÉ', small: true },
    ],
  },
  'Notsé': {
    town: true, // petite ville : surtout du plain-pied
    span: 260, urban: [[-0.8, 0.8]], dense: 1.1,
    marks: [
      { at: -0.85, side: 'G', kind: 'hotel', label: 'HÔTEL DU BERCEAU' },
      { at: -0.62, side: 'G', kind: 'wall', label: 'AGBOGBODZI', sub: 'Mur historique de Notsé' },
      { at: -0.45, side: 'G', kind: 'heritage', label: 'PAVEMENTS DE DAKPODJI' },
      { at: -0.3, side: 'G', kind: 'police', label: 'COMMISSARIAT' },
      { at: -0.18, side: 'G', kind: 'station', brand: 'MRS' },
      { at: -0.04, side: 'G', kind: 'church', label: 'STS PIERRE ET PAUL', scale: 1.1 },
      { at: 0.08, side: 'D', kind: 'station', brand: 'TOTAL', label: 'Notsè I' },
      { at: 0.2, side: 'D', kind: 'hospital', label: 'HÔPITAL', d: 6 },
      { at: 0.32, side: 'G', kind: 'shop', label: 'MOOV STORE' },
      { at: 0.55, side: 'G', kind: 'mosque' },
      { at: 0.65, side: 'D', kind: 'station', brand: 'OANDO' },
      { at: 0.78, side: 'D', kind: 'station', brand: 'TOTAL' },
    ],
  },
  'Atakpamé': {
    span: 420, urban: [[-1, 1]], dense: 1.3, gutters: true,
    // la N1 longe le pied est des collines (quartier d'Agbonou) : les collines sont côté gauche en montant vers le nord
    hills: [{ side: 'G', from: -1.1, to: 1.1, h: 34, at: 30 }],
    marks: [
      { at: -0.92, side: 'D', kind: 'hotel', label: 'HÔTEL ISIS' },
      { at: -0.84, side: 'D', kind: 'hotel', label: 'LE FLAMBOYANT' },
      { at: -0.74, side: 'G', kind: 'station', brand: 'CAP' },
      { at: -0.66, side: 'D', kind: 'station', brand: 'OANDO' },
      { at: -0.5, side: 'D', kind: 'gare', label: 'KABIR TRANSPORT' },
      { at: -0.36, side: 'G', kind: 'hospital', label: 'CMS AGBONOU' },
      { at: -0.2, side: 'G', kind: 'market', label: 'MARCHÉ D’AGBONOU' },
      { at: -0.08, side: 'G', kind: 'mosque' },
      { at: 0.1, side: 'D', kind: 'station', brand: 'TOTAL' },
      { at: 0.22, side: 'G', kind: 'hospital', label: 'HÔPITAL ANNA MARIA' },
      { at: 0.34, side: 'D', kind: 'hotel', label: 'HÔTEL LE SAHÉLIEN' },
      { at: 0.5, side: 'G', kind: 'mosque', label: 'MOSQUÉE MOUBARAK' },
      { at: 0.62, side: 'D', kind: 'station', brand: 'OANDO' },
      { at: 0.86, side: 'G', kind: 'station', brand: 'CAP', label: 'Afidégnigban' },
    ],
  },
  'Blitta': {
    town: true, // petite ville : surtout du plain-pied
    span: 220, urban: [[-0.8, 0.8]], dense: 1,
    marks: [
      { at: -0.8, side: 'G', kind: 'mosque' },
      { at: -0.7, side: 'G', kind: 'market', label: 'MARCHÉ', small: true },
      { at: -0.3, side: 'G', kind: 'hotel', label: 'HÔTEL BOYILA' },
      { at: -0.15, side: 'D', kind: 'police', label: 'DSR BLITTA' },
      { at: 0.0, side: 'D', kind: 'church', label: 'BLITTA-GARE' },
      { at: 0.15, side: 'G', kind: 'station', brand: 'TOTAL', label: 'Blitta' },
      { at: 0.32, side: 'G', kind: 'market', label: 'MARCHÉ DE BLITTA-VILLAGE', d: 6 },
      { at: 0.5, side: 'D', kind: 'station', brand: 'SOMIE' },
    ],
  },
  'Sokodé': {
    span: 420, urban: [[-1, 1]], dense: 1.4, style: 'nordville', gutters: true,
    roundabouts: [{ at: 0.08, monument: 'colonne' }],
    marks: [
      { at: -0.9, side: 'G', kind: 'station', brand: 'T-OIL' },
      { at: -0.78, side: 'G', kind: 'hotel', label: 'HÔTEL CENTRAL' },
      { at: -0.66, side: 'D', kind: 'gare', label: 'NAGODÉ' },
      { at: -0.54, side: 'G', kind: 'shop', label: 'CENATIS · TISSAGE', d: 6 },
      { at: -0.42, side: 'D', kind: 'station', brand: 'TOTAL', label: 'Sokodé Entrée' },
      { at: -0.3, side: 'G', kind: 'mairie', label: 'MAIRIE DE SOKODÉ', d: 8 },
      { at: -0.12, side: 'D', kind: 'station', brand: 'CAP' },
      { at: 0.0, side: 'G', kind: 'market', label: 'GRAND MARCHÉ' },
      { at: 0.14, side: 'D', kind: 'mosque', label: 'MOSQUÉE YÉYÉ-DJI’NGRI', big: true },
      { at: 0.22, side: 'D', kind: 'station', brand: 'TOTAL', label: 'Sokodé Marché' },
      { at: 0.24, side: 'G', kind: 'gare', label: 'SÉROU TRANSPORT' },
      { at: 0.36, side: 'G', kind: 'church', label: 'CATHÉDRALE', scale: 1.5, d: 16 },
      { at: 0.5, side: 'G', kind: 'station', brand: 'TOTAL', label: 'Barrière' },
      { at: 0.53, side: 'G', kind: 'police', label: 'POLICE' },
      { at: 0.66, side: 'D', kind: 'mosque', label: 'GRANDE MOSQUÉE DE KPANGALAM', big: true },
      { at: 0.8, side: 'G', kind: 'station', brand: 'TOTAL', label: 'Kédia' },
      { at: 0.92, side: 'G', kind: 'police', label: 'GENDARMERIE' },
    ],
  },
  'Alédjo': {
    town: true, // petite ville : surtout du plain-pied
    span: 180, urban: [[-0.6, 0.9]], dense: 1, style: 'nordville',
    marks: [
      { at: -0.2, side: 'G', kind: 'gare', label: 'GARE D’ALÉDJO' },
      { at: -0.05, side: 'G', kind: 'market', label: 'MARCHÉ COMMUNAL', d: 6 },
      { at: 0.15, side: 'G', kind: 'mosque', label: 'MOSQUÉE AGARADE' },
      { at: 0.32, side: 'G', kind: 'mosque' },
      { at: 0.48, side: 'G', kind: 'church', label: 'ÉGLISE CATHOLIQUE' },
      { at: 0.62, side: 'G', kind: 'police', label: 'GENDARMERIE' },
      { at: 0.82, side: 'D', kind: 'market', label: 'MARCHÉ DE KOUMONDÈ', small: true },
    ],
  },
  'Bafilo': {
    town: true, // petite ville : surtout du plain-pied
    span: 220, urban: [[-0.8, 0.8]], dense: 1.1, style: 'nordville',
    marks: [
      { at: -0.2, side: 'G', kind: 'gare', label: 'GARE DE BAFILO' },
      { at: -0.12, side: 'D', kind: 'mosque', big: true },
      { at: 0.15, side: 'D', kind: 'church', label: 'ÉGLISE DE PENTECÔTE' },
      { at: 0.35, side: 'G', kind: 'shop', label: 'NAGODÉ TRANSFERT' },
    ],
  },
  'Kara': {
    span: 450, urban: [[-1, 1]], dense: 1.4, lamps: true, gutters: true,
    roundabouts: [{ at: -0.42, monument: 'jardin' }] /* carrefour Tomdè */,
    marks: [
      { at: -0.95, side: 'G', kind: 'church', label: 'PAROISSE DON BOSCO', d: 10 },
      { at: -0.86, side: 'G', kind: 'station', brand: 'MRS' },
      { at: -0.78, side: 'G', kind: 'gare', label: 'GARE DE KARA-SUD' },
      { at: -0.7, side: 'G', kind: 'station', brand: 'TOTAL', label: 'Kara II' },
      { at: -0.56, side: 'G', kind: 'gare', label: 'NAGODÉ' },
      { at: -0.54, side: 'D', kind: 'gare', label: 'S.A.T.' },
      { at: -0.5, side: 'D', kind: 'station', brand: 'TOTAL', label: 'Kara Tomdè' },
      { at: -0.47, side: 'G', kind: 'gare', label: 'LK' },
      { at: -0.32, side: 'G', kind: 'gare', label: 'MINIBUS TOMDÈ' },
      { at: -0.18, side: 'D', kind: 'hotel', label: 'CARREFOUR BLEU' },
      { at: 0.1, side: 'D', kind: 'station', brand: 'ZENER' },
      { at: 0.22, side: 'D', kind: 'police', label: 'BRIGADE' },
      { at: 0.32, side: 'D', kind: 'station', brand: 'SHELL' },
      { at: 0.6, side: 'D', kind: 'market', label: 'MARCHÉ DE TCHITCHAO' },
    ],
  },
  'Kantè': {
    town: true, // petite ville : surtout du plain-pied
    span: 220, urban: [[-0.8, 0.8]], dense: 1, style: 'nordville', lamps: true,
    roundabouts: [{ at: 0, monument: 'jardin' }],
    marks: [
      { at: -0.55, side: 'G', kind: 'station', brand: 'TOTAL' },
      { at: -0.3, side: 'D', kind: 'mairie', label: 'MAIRIE DE KANTÈ' },
      { at: -0.18, side: 'D', kind: 'mosque' },
      { at: 0.25, side: 'D', kind: 'station', brand: 'OANDO' },
      { at: 0.38, side: 'G', kind: 'hotel', label: 'AUBERGE' },
    ],
  },
  'Mango': {
    span: 360, urban: [[-0.8, 1]], dense: 1.2, style: 'nordville', lamps: true,
    roundabouts: [{ at: 0.62, monument: 'paix' }],
    marks: [
      { at: -0.6, side: 'D', kind: 'market', label: 'NOUVELLE PLACE DU MARCHÉ', d: 14 },
      { at: -0.45, side: 'G', kind: 'gare', label: 'NAGODÉ' },
      { at: -0.32, side: 'G', kind: 'station', brand: 'TOTAL', label: 'Mango' },
      { at: -0.2, side: 'D', kind: 'mosque' },
      { at: -0.05, side: 'D', kind: 'mosque', label: 'MOSQUÉE BABA TCHATCHA', d: 8, big: true },
      { at: 0.2, side: 'G', kind: 'hospital', label: 'CHP MANGO', d: 14 },
      { at: 0.4, side: 'D', kind: 'mosque' },
      { at: 0.58, side: 'G', kind: 'police', label: 'COMMISSARIAT' },
      { at: 0.75, side: 'G', kind: 'station', brand: 'CAP' },
      { at: 0.86, side: 'D', kind: 'police', label: 'GENDARMERIE' },
      { at: 0.94, side: 'D', kind: 'mosque', label: 'MOSQUÉE AN’NOUR' },
    ],
  },
  'Dapaong': {
    span: 450, urban: [[-1, 1]], dense: 1.3, style: 'nordville', lamps: true, gutters: true,
    dual: [[-0.9, 0.6]], // chaussées séparées sur la traversée (OSM)
    roundabouts: [{ at: 0.16, monument: 'jardin' }],
    marks: [
      { at: -0.95, side: 'G', kind: 'hotel', label: 'AUBERGE TOLÉRANCE' },
      { at: -0.86, side: 'D', kind: 'police', label: 'GENDARMERIE' },
      { at: -0.76, side: 'D', kind: 'station', brand: 'MRS' },
      { at: -0.66, side: 'D', kind: 'gare', label: 'LK', d: 8 },
      { at: -0.62, side: 'G', kind: 'gare', label: 'LK' },
      { at: -0.52, side: 'D', kind: 'station', brand: 'T-OIL' },
      { at: -0.36, side: 'G', kind: 'shop', label: 'RADIO MARIA', d: 12 },
      { at: -0.24, side: 'G', kind: 'police', label: 'POLICE' },
      { at: -0.1, side: 'G', kind: 'hotel', label: 'HÔTEL ÉLÉPHANT', d: 8 },
      { at: 0.04, side: 'G', kind: 'hotel', label: 'HÔTEL VENDÔME' },
      { at: 0.26, side: 'G', kind: 'gare', label: 'STISALI' },
      { at: 0.36, side: 'D', kind: 'station', brand: 'TOTAL', label: 'Dapaong 2' },
    ],
  },
};

// couleurs des enseignes de stations (approximation : nom seul, pas de logo)
export const BRANDS = {
  'TOTAL': ['#e4002b', '#ffffff'], 'MRS': ['#0f7a3a', '#ffffff'], 'T-OIL': ['#1d3f8f', '#ffffff'], 'CAP': ['#f4c430', '#1b1a17'],
  'OANDO': ['#1b8a4a', '#ffffff'], 'SANOL': ['#f08a24', '#1b1a17'], 'ÉTOILE DU GOLFE': ['#2f5f9f', '#f4c430'],
  'SOMIE': ['#7b2f8f', '#ffffff'], 'ZENER': ['#1b1a17', '#f4c430'], 'SHELL': ['#f4c430', '#c8322b'],
};

// zones de ville d'une étape (en mètres de route) : ville de départ (centre en 0), ville d'arrivée (centre en L), villes traversées
export function cityZones(road) {
  const L = road.length, rev = road.rev;
  const zones = [];
  const add = (name, center) => {
    const plan = CITY_PLANS[name];
    if (!plan) return;
    let span = plan.span;
    if (span === 'toll') {
      const t = road.tolls[0];
      if (!t) return;
      span = Math.abs(t.s - center);
    }
    const sOf = (at) => center + (rev ? -at : at) * span;
    zones.push({ name, plan, center, span, rev, sOf, sideSign: (side) => (side === 'G' ? -1 : 1) * (rev ? -1 : 1) });
  };
  add(road.fromCity.name, 0);
  add(road.toCity.name, L);
  for (const t of road.towns) add(t.name, t.s);
  return zones;
}

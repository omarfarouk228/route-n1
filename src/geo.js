// Données géographiques réelles (© contributeurs OpenStreetMap, ODbL) : tracé de la N1 et contour du Togo.
import route from './geo/n1_route.json';
import outline from './geo/togo_outline.json';

export const OSM_CREDIT = '© contributeurs OpenStreetMap (ODbL)';
export const PTS = route.pts; // [lat, lon] tous les `route.step` mètres, de Lomé à Dapaong
export const STEP = route.step;
export const OUTLINE = outline;
export const PLACES = Object.fromEntries(route.places.map((p) => [p.name, p]));
// Départ réel des taxis-brousse : gare routière d'Agbalépédo, au rond-point GTA (6,194 N).
// Le tracé OSM commence 5,5 km plus au sud (Tokoin) ; on place Lomé sur le boulevard à la hauteur de la gare.
PLACES['Lomé'] = { ...PLACES['Lomé'], i: 22, km: 5.5 };

const LAT0 = 8.5, LON0 = 0.9;
const KX = 111.32 * Math.cos((LAT0 * Math.PI) / 180), KY = 110.57;
// projection locale en km (x vers l'est, y vers le nord)
export const project = (lat, lon) => [(lon - LON0) * KX, (lat - LAT0) * KY];

export const STAGE_CITIES = ['Lomé', 'Tsévié', 'Atakpamé', 'Sokodé', 'Kara', 'Mango', 'Dapaong'];
export const kmOf = (name) => PLACES[name].km;
export const stageKm = (i) => +(kmOf(STAGE_CITIES[i + 1]) - kmOf(STAGE_CITIES[i])).toFixed(1);
// position relative (0..1) d'un lieu à l'intérieur d'une étape
export const tOf = (name, i) => (kmOf(name) - kmOf(STAGE_CITIES[i])) / stageKm(i);

const XY = PTS.map(([la, lo]) => project(la, lo));

// position réelle (indice fractionnaire dans PTS) pour une progression dans une étape
export function routeIndex(stage, t) {
  const a = PLACES[STAGE_CITIES[stage]].i, b = PLACES[STAGE_CITIES[stage + 1]].i;
  return a + (b - a) * Math.min(1, Math.max(0, t));
}
export function routeXY(fi) {
  const i = Math.min(XY.length - 2, Math.max(0, Math.floor(fi))), f = fi - i;
  const a = XY[i], b = XY[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
export function routeLatLon(fi) {
  const i = Math.min(PTS.length - 2, Math.max(0, Math.floor(fi))), f = fi - i;
  const a = PTS[i], b = PTS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

// cap lissé du tracé réel (fenêtre de ±3 km) : sert à donner à la route du jeu la vraie forme de la N1
const SMOOTH = 12;
const SM = XY.map((_, i) => {
  let x = 0, y = 0, n = 0;
  for (let k = -SMOOTH; k <= SMOOTH; k++) {
    const p = XY[Math.min(XY.length - 1, Math.max(0, i + k))];
    x += p[0]; y += p[1]; n++;
  }
  return [x / n, y / n];
});
const HEAD = [];
{
  let prev = 0;
  for (let i = 0; i < SM.length - 1; i++) {
    let h = Math.atan2(SM[i + 1][0] - SM[i][0], SM[i + 1][1] - SM[i][1]); // 0 = nord, sens horaire
    while (h - prev > Math.PI) h -= 2 * Math.PI;
    while (h - prev < -Math.PI) h += 2 * Math.PI;
    HEAD.push(h);
    prev = h;
  }
  HEAD.push(prev);
}
export function headingAt(fi) {
  const i = Math.min(HEAD.length - 2, Math.max(0, Math.floor(fi))), f = fi - i;
  return HEAD[i] + (HEAD[i + 1] - HEAD[i]) * f;
}

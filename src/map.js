// Cartes dessinées à partir des données OpenStreetMap : contour du Togo, tracé réel de la N1, villes.
import { PTS, OUTLINE, PLACES, STAGE_CITIES, project, routeIndex, routeXY, headingAt, OSM_CREDIT } from './geo.js';

const ROUTE_XY = PTS.map(([la, lo]) => project(la, lo));
const BORDER_XY = OUTLINE.map(([la, lo]) => project(la, lo));
const TOWNS = ['Davié', 'Notsé', 'Blitta', 'Alédjo', 'Bafilo', 'Kantè'];
const NEIGHBORS = [['GHANA', 6.9, 0.25], ['BÉNIN', 8.9, 2.2], ['BURKINA FASO', 11.3, 0.4], ['Golfe de Guinée', 5.95, 1.45]];

let bounds = null;
function getBounds() {
  if (bounds) return bounds;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of BORDER_XY) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  bounds = { x0, x1, y0, y1 };
  return bounds;
}

function setup(canvas, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
}

const C = { land: '#e9dfc4', land2: '#dccfae', border: '#7a6a4a', sea: '#9cc3c9', road: '#ffffff', done: '#f4c430', ink: '#1b1a17', red: '#d03a2f', green: '#0f5c3c' };

/* ------------------------------------------------------------ carte complète */
export function drawFullMap(canvas, { w, h, stage = 0, progress = 0, rev = false, showNeighbors = true, dark = false }) {
  const g = setup(canvas, w, h);
  const B = getBounds();
  const pad = 18;
  const sc = Math.min((w - pad * 2) / (B.x1 - B.x0), (h - pad * 2 - 14) / (B.y1 - B.y0));
  const ox = (w - (B.x1 - B.x0) * sc) / 2, oy = (h - 14 - (B.y1 - B.y0) * sc) / 2;
  const P = ([x, y]) => [ox + (x - B.x0) * sc, oy + (B.y1 - y) * sc];

  g.fillStyle = dark ? '#16211b' : '#f3ecdc';
  g.fillRect(0, 0, w, h);
  // mer
  const [, seaY] = P(project(6.12, 1.2));
  g.fillStyle = dark ? '#1d3a3f' : C.sea;
  g.fillRect(0, seaY + 2, w, h - seaY);
  // pays
  g.beginPath();
  BORDER_XY.forEach((p, i) => { const [x, y] = P(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.closePath();
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, dark ? '#4a4430' : '#e2cf9c');
  grd.addColorStop(1, dark ? '#2e4a30' : '#cfe0b0');
  g.fillStyle = grd;
  g.fill();
  g.lineWidth = 1.5; g.strokeStyle = dark ? '#b8a77a' : C.border; g.stroke();
  // voisins
  if (showNeighbors) {
    g.font = '700 10px Archivo, Arial, sans-serif'; g.fillStyle = dark ? 'rgba(255,255,255,0.45)' : 'rgba(27,26,23,0.45)'; g.textAlign = 'center';
    for (const [n, la, lo] of NEIGHBORS) { const [x, y] = P(project(la, lo)); if (y > 8 && y < h - 8) g.fillText(n, Math.max(30, Math.min(w - 30, x)), y); }
  }
  // N1 complète puis portion parcourue
  const line = (from, to, color, width) => {
    g.beginPath();
    for (let i = from; i <= to; i++) { const [x, y] = P(ROUTE_XY[i]); if (i === from) g.moveTo(x, y); else g.lineTo(x, y); }
    g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
  };
  line(0, ROUTE_XY.length - 1, dark ? '#0b0d0b' : '#5a4a32', 4.5);
  line(0, ROUTE_XY.length - 1, C.road, 2.2);
  const fi = routeIndex(stage, progress);
  if (rev) {
    // retour : l'aller est fait (jaune), la portion du retour déjà roulée est en vert
    line(0, ROUTE_XY.length - 1, C.ink, 5); line(0, ROUTE_XY.length - 1, C.done, 3);
    if (fi < ROUTE_XY.length - 1) line(Math.floor(fi), ROUTE_XY.length - 1, '#3fd38a', 3);
  } else if (fi > 0) { line(0, Math.floor(fi), C.ink, 5); line(0, Math.floor(fi), C.done, 3); }
  // villes
  g.textAlign = 'left';
  for (const name of TOWNS) {
    const [x, y] = P(ROUTE_XY[PLACES[name].i]);
    g.fillStyle = dark ? '#d9d2c0' : '#4a463d'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
    g.font = '600 9.5px Archivo, Arial, sans-serif'; g.fillText(name, x + 5, y + 3);
  }
  STAGE_CITIES.forEach((name, i) => {
    const [x, y] = P(ROUTE_XY[PLACES[name].i]);
    const passed = rev ? true : i <= stage;
    g.fillStyle = passed ? C.done : '#ffffff'; g.strokeStyle = C.ink; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.stroke();
    g.font = '800 11.5px Archivo, Arial, sans-serif';
    g.fillStyle = dark ? '#ffffff' : C.ink;
    const left = name === 'Kara' || name === 'Sokodé';
    g.textAlign = left ? 'right' : 'left';
    g.fillText(name.toUpperCase(), x + (left ? -9 : 9), y + 4);
  });
  // position du taxi
  const [px, py] = P(routeXY(fi));
  g.fillStyle = C.red; g.strokeStyle = '#fff'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(px, py, 6.5, 0, 7); g.fill(); g.stroke();
  // attribution
  g.textAlign = 'right'; g.font = '9px Archivo, Arial, sans-serif'; g.fillStyle = dark ? 'rgba(255,255,255,0.55)' : 'rgba(27,26,23,0.55)';
  g.fillText(OSM_CREDIT, w - 6, h - 5);
}

/* ------------------------------------------------------------ mini-carte (orientée dans le sens de la marche) */
export function drawMiniMap(canvas, { size, stage, progress, rev = false, kmPerPx = 0.32 }) {
  const g = setup(canvas, size, size);
  const fi = routeIndex(stage, progress);
  const [cx, cy] = routeXY(fi);
  const head = headingAt(fi) + (rev ? Math.PI : 0); // orientée dans le sens de la marche
  const S = 1 / kmPerPx;
  const R = size / 2;
  g.save();
  g.beginPath(); g.arc(R, R, R - 1, 0, 7); g.clip();
  g.fillStyle = '#e4d7b4'; g.fillRect(0, 0, size, size);
  g.translate(R, R);
  g.rotate(-head);
  const T = ([x, y]) => [(x - cx) * S, -(y - cy) * S];
  // hors du pays (grisé), puis pays
  g.fillStyle = '#c9c2ae'; g.fillRect(-size * 2, -size * 2, size * 4, size * 4);
  g.beginPath();
  BORDER_XY.forEach((p, i) => { const [x, y] = T(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.closePath(); g.fillStyle = '#e8dcb8'; g.fill();
  g.strokeStyle = '#8a7a58'; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.stroke(); g.setLineDash([]);
  // route : seulement la portion visible
  const span = Math.ceil((size * kmPerPx * 1.6) / 0.25);
  const i0 = Math.max(0, Math.floor(fi) - span), i1 = Math.min(ROUTE_XY.length - 1, Math.floor(fi) + span);
  const seg = (a, b, color, wdt) => {
    g.beginPath();
    for (let i = a; i <= b; i++) { const [x, y] = T(ROUTE_XY[i]); if (i === a) g.moveTo(x, y); else g.lineTo(x, y); }
    g.strokeStyle = color; g.lineWidth = wdt; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  };
  seg(i0, i1, '#5a4a32', 6); seg(i0, i1, '#ffffff', 3.5);
  if (rev) { if (i1 > Math.floor(fi)) seg(Math.floor(fi), i1, '#f4c430', 3.5); }
  else if (Math.floor(fi) > i0) { seg(i0, Math.floor(fi), '#f4c430', 3.5); }
  // villes visibles (texte remis droit)
  for (const name of [...STAGE_CITIES, ...TOWNS]) {
    const p = PLACES[name];
    if (Math.abs(p.i - fi) > span) continue;
    const [x, y] = T(ROUTE_XY[p.i]);
    const big = STAGE_CITIES.includes(name);
    g.fillStyle = big ? '#ffffff' : '#4a463d'; g.strokeStyle = '#1b1a17'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, big ? 4 : 2.5, 0, 7); g.fill(); if (big) g.stroke();
    g.save(); g.translate(x, y); g.rotate(head);
    g.font = `${big ? 800 : 600} ${big ? 10.5 : 9}px Archivo, Arial, sans-serif`; g.fillStyle = '#1b1a17'; g.textAlign = 'left';
    g.fillText(big ? name.toUpperCase() : name, 6, 3);
    g.restore();
  }
  g.restore();
  // flèche du taxi
  g.save(); g.translate(R, R);
  g.fillStyle = '#d03a2f'; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -9); g.lineTo(7, 7); g.lineTo(0, 3); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke();
  g.restore();
  // nord
  const nx = R + Math.sin(-head) * (R - 12), ny = R - Math.cos(-head) * (R - 12);
  g.fillStyle = '#1b1a17'; g.beginPath(); g.arc(nx, ny, 8, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '800 9px Archivo, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('N', nx, ny + 3);
  // bordure
  g.strokeStyle = '#1b1a17'; g.lineWidth = 3; g.beginPath(); g.arc(R, R, R - 1.5, 0, 7); g.stroke();
}

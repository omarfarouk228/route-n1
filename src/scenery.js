import * as THREE from 'three';
import * as M from './models.js';
import { MAT } from './models.js';
import * as CH from './characters.js';
import { SHOULDER } from './road.js';
import { rand, weighted } from './util.js';
import { TERRAIN_MAT, WATER_MAT, CONCRETE_MAT } from './terrainmat.js';
import { BRANDS } from './cities.js';

/* ------------------------------------------------------------ géométries partagées (construites une fois) */
let GEO = null;
function geos() {
  if (GEO) return GEO;
  GEO = {
    coco: M.coco(), oilpalm: M.oilpalm(), mango: M.mango(), teak: M.teak(), baobab: M.baobab(), karite: M.karite(),
    neem: M.neem(), ronier: M.ronier(), banana: M.banana(), fromager: M.fromager(),
    bush: M.bush(), dry: M.dry(), rock: M.rock(), termite: M.termite(),
    grassG: M.grassG(), grassD: M.grassD(), tallGrass: M.tallGrass(),
    maize: M.maizeRow(), millet: M.milletRow(), cassava: M.cassavaRow(), yam: M.yamRow(),
    houseA: M.houseA(), houseB: M.houseB(), houseC: M.houseC(), hut: M.hut(), compound: M.compound(), granary: M.granary(),
    building2a: M.building2('#e8d9b8', '#2f78a8'), building2b: M.building2('#f0c9a0', '#0f5c3c'), building2c: M.building2('#dfe6e2', '#c8322b'),
    church: M.church(), mosque: M.mosque(), school: M.school(), kioskA: M.kiosk('#2f78a8'), kioskB: M.kiosk('#e9b53a'), kioskC: M.kiosk('#c8322b'),
    station: M.fuelStation(), tower: M.tower(), flagpole: M.flagpole(),
    tollCanopy: M.tollCanopy(), stall: M.stall(), fuel: M.fuelStand(), pole: M.pole(), shelter: M.shelter(), taxi: M.taxiStatic(), cabin: M.checkpointCabin(),
    yamPile: M.yamPile(), charcoal: M.charcoal(), firewood: M.firewood(), basins: M.basins(), moto: M.motoParked(),
    // villes
    stationG: M.fuelStation('#0f7a3a'), stationB: M.fuelStation('#1d3f8f'), stationY: M.fuelStation('#e9b53a'), stationO: M.fuelStation('#f08a24'), stationK: M.fuelStation('#2a2a2a'),
    lamp: M.solarLamp(), billboard: M.billboard(), traffic: M.trafficPole(),
    contA: M.containerShop('#2f5f9f'), contB: M.containerShop('#f08a24'), contC: M.containerShop('#0f7a3a'), contD: M.containerShop('#c8322b'),
    unfinA: M.unfinished('#d9cbb0'), unfinB: M.unfinished('#e3c7a4'), nordA: M.buildingNord('#d9a273'), nordB: M.buildingNord('#efe6d2'), nordC: M.buildingNord('#c98a5a'),
    officeG: M.office('#0f5c3c'), officeB: M.office('#1d3f8f'), officeR: M.office('#c8322b'), market: M.marketHall(),
    parasolR: M.parasol('#c8322b'), parasolB: M.parasol('#2f78a8'), parasolY: M.parasol('#f4c430'), earthWall: M.earthWall(),
  };
  for (let i = 0; i < M.PEOPLE_VARIANTS; i++) GEO['person' + i] = M.person(i);
  for (let i = 0; i < CH.GOAT_VARIANTS; i++) GEO['goat' + i] = CH.goatGeo(i);
  for (let i = 0; i < 3; i++) { GEO['chicken' + i] = CH.chickenGeo(i); GEO['zebu' + i] = CH.zebuGeo(i); }
  for (let i = 0; i < 2; i++) GEO['sheep' + i] = CH.sheepGeo(i);
  GEO.police = CH.policeGeo();
  return GEO;
}
// types qui projettent une ombre (PC uniquement)
const SHADOW_TYPES = new Set(['coco', 'oilpalm', 'mango', 'teak', 'baobab', 'karite', 'neem', 'ronier', 'fromager', 'banana',
  'houseA', 'houseB', 'houseC', 'hut', 'compound', 'building2a', 'building2b', 'building2c', 'church', 'mosque', 'school', 'station', 'stall', 'shelter', 'taxi',
  'stationG', 'stationB', 'stationY', 'stationO', 'stationK', 'unfinA', 'unfinB', 'nordA', 'nordB', 'nordC', 'officeG', 'officeB', 'officeR', 'market']);

const CHAR_TYPE = /^(person|goat|chicken|zebu|sheep|police)/;
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

/* ------------------------------------------------------------ textures canvas */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const FONT = '"Archivo Black", "Arial Black", Arial, sans-serif';
function fitText(g, text, maxW, size) {
  let s = size;
  do { g.font = `${s}px ${FONT}`; s -= 3; } while (g.measureText(text).width > maxW && s > 12);
}

function signTexture(lines, style) {
  return canvasTex(512, 256, (g, w, h) => {
    const { bg = '#ffffff', fg = '#16161a', border = '#c8322b' } = style;
    g.fillStyle = border; g.fillRect(0, 0, w, h);
    g.fillStyle = bg; g.fillRect(18, 18, w - 36, h - 36);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (lines.length === 1) { fitText(g, lines[0], w - 70, 92); g.fillText(lines[0], w / 2, h / 2 + 4); }
    else {
      fitText(g, lines[0], w - 70, 76); g.fillText(lines[0], w / 2, h * 0.38);
      fitText(g, lines[1], w - 90, 44); g.fillText(lines[1], w / 2, h * 0.72);
    }
  });
}
function makeSign(lines, style = {}, size = [3.2, 1.6], postH = 1.6) {
  const grp = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ map: signTexture(lines, style) }));
  panel.position.y = postH + size[1] / 2;
  grp.add(panel);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshLambertMaterial({ color: '#8a8f94' }));
  back.position.set(0, panel.position.y, -0.02);
  back.rotation.y = Math.PI;
  grp.add(back);
  const postGeo = new THREE.BoxGeometry(0.1, postH + size[1], 0.1);
  const postMat = new THREE.MeshLambertMaterial({ color: '#7d8287' });
  for (const x of [-size[0] / 2 + 0.3, size[0] / 2 - 0.3]) {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(x, (postH + size[1]) / 2, -0.06);
    grp.add(p);
  }
  return grp;
}
function borneTexture(dest, km) {
  return canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8322b'; g.fillRect(0, 0, w, 70);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `44px ${FONT}`; g.fillText('N1', w / 2, 38);
    g.fillStyle = '#16161a';
    fitText(g, dest.toUpperCase(), w - 14, 24); g.fillText(dest.toUpperCase(), w / 2, 102);
    g.font = `46px ${FONT}`; g.fillText(String(km), w / 2, 150);
  });
}
function makeBorne(dest, km) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.3), new THREE.MeshLambertMaterial({ color: '#f5f2ea' }));
  body.position.y = 0.45;
  grp.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 10, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ color: '#c8322b' }));
  top.rotation.set(0, Math.PI / 2, Math.PI / 2);
  top.position.y = 0.9;
  grp.add(top);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.87), new THREE.MeshBasicMaterial({ map: borneTexture(dest, km) }));
  face.position.set(0, 0.46, 0.152);
  grp.add(face);
  return grp;
}

// enseignes peintes à la main (atlas 4×4) : boutiques typiques du bord de la N1
const SHOP_SIGNS = [
  ['BOUTIQUE', 'LA GRÂCE DE DIEU', '#f4c430', '#1b1a17'], ['COIFFURE', 'MIXTE · TRESSES', '#2f78a8', '#ffffff'],
  ['MAQUIS', 'CHEZ TANTI', '#c8322b', '#ffffff'], ['QUINCAILLERIE', 'DIEU MERCI', '#0f5c3c', '#ffffff'],
  ['COUTURE', 'AFI · MODÈLES', '#7b3f99', '#ffffff'], ['PHARMACIE', '+ DE LA ROUTE', '#ffffff', '#1f7a4f'],
  ['TRANSFERT', "D'ARGENT · CRÉDIT", '#f08a24', '#1b1a17'], ['VULCANISATEUR', 'PNEUS · ROUES', '#1b1a17', '#f4c430'],
  ['BAR', 'LA DÉTENTE', '#2f5f9f', '#f4c430'], ['PAIN CHAUD', 'BOULANGERIE', '#e9d9b0', '#7a3a1a'],
  ['MÉCANIQUE', 'GÉNÉRALE', '#4a4a4a', '#ffffff'], ['ÉPICERIE', 'LE BON PRIX', '#f4c430', '#c8322b'],
  ['TÉLÉPHONIE', 'MOBILE · ACCESSOIRES', '#ffffff', '#2f78a8'], ['SOUDURE', 'ATELIER', '#9a3a2a', '#ffffff'],
  ['RESTAURANT', 'PÂTE · SAUCE', '#1f7a4f', '#f4c430'], ['CENTRE DE SANTÉ', 'CONSULTATIONS', '#ffffff', '#c8322b'],
];
let SIGN_ATLAS = null;
function signAtlas() {
  if (SIGN_ATLAS) return SIGN_ATLAS;
  const tex = canvasTex(1024, 512, (g) => {
    SHOP_SIGNS.forEach(([a, b, bg, fg], k) => {
      const x = (k % 4) * 256, y = Math.floor(k / 4) * 128;
      g.fillStyle = bg; g.fillRect(x, y, 256, 128);
      g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(x + 7, y + 7, 242, 114);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitText(g, a, 220, 40); g.fillText(a, x + 128, y + 50);
      g.font = `600 20px Archivo, Arial, sans-serif`; g.fillText(b, x + 128, y + 92);
    });
  });
  SIGN_ATLAS = new THREE.MeshLambertMaterial({ map: tex });
  return SIGN_ATLAS;
}
let FLAG_MAT = null;
function flagMat() {
  if (FLAG_MAT) return FLAG_MAT;
  // drapeau du Togo : 5 bandes vert/jaune, canton rouge avec étoile blanche
  const tex = canvasTex(150, 90, (g) => {
    for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#ffce00' : '#006a4e'; g.fillRect(0, k * 18, 150, 18); }
    g.fillStyle = '#d21034'; g.fillRect(0, 0, 54, 54);
    g.fillStyle = '#ffffff'; g.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 7.5 : 18, a = -Math.PI / 2 + (k * Math.PI) / 5;
      g.lineTo(27 + Math.cos(a) * r, 27 + Math.sin(a) * r);
    }
    g.fill();
  });
  FLAG_MAT = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  return FLAG_MAT;
}

/* ------------------------------------------------------------ construction du décor d'une étape */
export function buildScenery(road, rng, quality = 1, shadows = false) {
  const G = geos();
  const group = new THREE.Group();
  const lists = {};
  const L = road.length;
  const signQuads = []; // [x,y,z]*4 + cellule
  const flags = [];

  const tollZones = road.tolls.map((t) => t.s);
  const reserved = []; // emplacements des repères de ville : le bâti générique les évite
  const isReserved = (s, off) => reserved.some((r) => Math.abs(r.s - s) < r.w && Math.sign(off) === r.side && Math.abs(off) < 40);
  const place = (type, s, off, { scale = 1, yaw = 0, face = false, onRoad = false, sy = 1, force = false, noShift = false } = {}) => {
    if (!force && Math.abs(off) < 18 && tollZones.some((ts) => Math.abs(ts - s) < 34)) return 0;
    if (!force && !onRoad && road.islandW(s, 9) && Math.abs(off) < 15) return 0; // rond-point dégagé
    // boulevard : tout ce qui est à gauche est repoussé derrière la chaussée d'en face
    if (!noShift && !onRoad && off < 0 && road.isDual(s)) off -= 9.6;
    if (onRoad) road.toWorld(s, off, _p); else road.groundAt(s, off, _p);
    const h = road.headingAt(s);
    const ry = face ? h + (off > 0 ? Math.PI / 2 : -Math.PI / 2) + yaw : yaw;
    _q.setFromAxisAngle(UP, ry);
    _s.set(scale, scale * sy, scale);
    _m.compose(_p, _q, _s);
    (lists[type] ||= []).push(_m.clone());
    return ry;
  };
  const person = (s, off, variants) => {
    const v = variants ? variants[Math.floor(rng() * variants.length)] : Math.floor(rng() * M.PEOPLE_VARIANTS);
    place('person' + v, s, off, { yaw: rng() * 6.28 });
  };
  // panneau d'enseigne posé contre la façade d'un kiosque
  const shopSign = (s, off) => {
    const cell = Math.floor(rng() * SHOP_SIGNS.length);
    const h = road.headingAt(s);
    road.groundAt(s, off, _p);
    const dir = off > 0 ? 1 : -1;
    const ry = h + (off > 0 ? Math.PI / 2 : -Math.PI / 2);
    const fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
    const cx = _p.x + fx * 1.16, cz = _p.z + fz * 1.16, y0 = _p.y + 2.2, W = 1.5, H = 0.75;
    void dir;
    signQuads.push({ c: [[cx - rx * W, y0, cz - rz * W], [cx + rx * W, y0, cz + rz * W], [cx - rx * W, y0 + H, cz - rz * W], [cx + rx * W, y0 + H, cz + rz * W]], cell });
  };
  const flag = (s, off) => {
    place('flagpole', s, off);
    road.groundAt(s, off, _p);
    flags.push({ pos: _p.clone(), ry: road.headingAt(s) + Math.PI / 2 });
  };

  const busy = road.tolls.map((t) => [t.s - 45, t.s + 45]);
  const isBusy = (s) => busy.some(([a, b]) => s > a && s < b);
  const nearRiver = (s, pad = 0) => road.rivers.some((r) => Math.abs(r.s - s) < r.w / 2 + 6 + pad);

  /* --- agglomérations --------------------------------------------------- */
  const southHouse = () => ['houseA', 'houseB', 'houseC'][Math.floor(rng() * 3)];
  const settlement = (s0, span, opts) => {
    const B = road.biomeAt(Math.max(0, Math.min(L, s0)));
    const style = opts.style || B.house;
    const dense = opts.dense || 1;
    busy.push([s0 - span - 10, s0 + span + 10]);
    for (let s = s0 - span; s < s0 + span; s += rand(rng, 8, 13) / dense) {
      if (nearRiver(s, 20) || road.islandW(s, 10)) continue;
      for (const side of [-1, 1]) {
        if (rng() < 0.18 || isReserved(s, side)) continue;
        const north = style === 'nord' || (style === 'mixte' && rng() < 0.5);
        if (style === 'nordville' || (opts.city && style !== 'ville' && (B.house === 'nord' || B.house === 'mixte') && rng() < 0.6)) {
          // ville du centre et du nord : rez-de-chaussée crépis ocre et blanc, quelques étages, cases au second rang
          const r = rng();
          place(r < 0.62 ? ['nordA', 'nordB', 'nordC'][Math.floor(rng() * 3)] : r < 0.8 ? 'unfinA' : ['building2a', 'building2b'][Math.floor(rng() * 2)], s, side * rand(rng, 12.5, 15), { face: true, yaw: rand(rng, -0.04, 0.04) });
          if (rng() < 0.35) place(rng() < 0.5 ? 'compound' : 'hut', s, side * rand(rng, 26, 36), { yaw: rng() * 6.28 });
          s += 4;
        } else if (style === 'ville' || (opts.city && rng() < 0.45)) {
          // sud : R+1 et R+2 crépis, beaucoup de maisons inachevées avec les fers en attente
          const r = rng();
          place(r < 0.6 ? ['building2a', 'building2b', 'building2c'][Math.floor(rng() * 3)] : ['unfinA', 'unfinB'][Math.floor(rng() * 2)], s, side * rand(rng, 13, 16), { face: true, yaw: rand(rng, -0.04, 0.04) });
          s += 4;
        } else if (north) {
          if (rng() < 0.6) place('compound', s, side * rand(rng, 17, 30), { yaw: rng() * 6.28, scale: rand(rng, 0.85, 1.1) });
          else place('hut', s, side * rand(rng, 12, 22), { face: true, yaw: rng() * 6.28 });
          if (rng() < 0.3) place('granary', s + 4, side * rand(rng, 11, 14), { yaw: rng() * 6.28 });
        } else {
          place(southHouse(), s, side * rand(rng, 12, 26), { face: true, yaw: rand(rng, -0.15, 0.15), scale: rand(rng, 0.9, 1.1) });
        }
      }
      // façade commerçante au bord de la route
      if (rng() < 0.42 * dense) {
        const side = rng() < 0.5 ? -1 : 1;
        if (opts.city && style !== 'nord' && rng() < 0.3) {
          // conteneur reconverti en boutique
          place(['contA', 'contB', 'contC', 'contD'][Math.floor(rng() * 4)], s, side * rand(rng, 9.8, 10.6), { face: true });
        } else if (style !== 'nord' && rng() < 0.55) {
          const off = side * rand(rng, 9.6, 10.6);
          place(['kioskA', 'kioskB', 'kioskC'][Math.floor(rng() * 3)], s, off, { face: true });
          shopSign(s, off);
        } else place('stall', s, side * rand(rng, 8.8, 9.8), { face: true });
        if (rng() < 0.85) person(s + rand(rng, -1.5, 1.5), side * rand(rng, 7.6, 8.6));
      }
      // marchandises posées sur l'accotement
      if (rng() < 0.3 * dense) {
        const side = rng() < 0.5 ? -1 : 1;
        const goods = B.house === 'sud' || B.house === 'ville' ? ['basins', 'basins', 'firewood'] : ['yamPile', 'charcoal', 'firewood', 'basins'];
        place(goods[Math.floor(rng() * goods.length)], s, side * rand(rng, 7.7, 8.4), { face: true, yaw: rand(rng, -0.3, 0.3) });
        if (rng() < 0.6) person(s + 1.2, side * rand(rng, 8.2, 9.2), [0, 2, 9, 11]);
      }
      if (rng() < 0.35 * dense) person(s, (rng() < 0.5 ? -1 : 1) * rand(rng, 7.5, 9.5));
      // basse-cour en liberté : poules, chèvres, moutons
      if (rng() < 0.5 * dense) {
        const side = rng() < 0.5 ? -1 : 1, off = side * rand(rng, 9.5, 15), n = 2 + Math.floor(rng() * 4);
        for (let k = 0; k < n; k++) place('chicken' + Math.floor(rng() * 3), s + rand(rng, -2.5, 2.5), off + rand(rng, -1.5, 1.5), { yaw: rng() * 6.28 });
      }
      if (rng() < 0.32 * dense) {
        const side = rng() < 0.5 ? -1 : 1, n = 1 + Math.floor(rng() * 3);
        for (let k = 0; k < n; k++) {
          const t = rng() < 0.7 ? 'goat' + Math.floor(rng() * CH.GOAT_VARIANTS) : 'sheep' + Math.floor(rng() * 2);
          place(t, s + rand(rng, -4, 4), side * rand(rng, 9.4, 17), { yaw: rng() * 6.28, scale: rand(rng, 0.85, 1.05) });
        }
      }
      if (rng() < 0.12 * dense) for (let k = 0; k < 3; k++) place('moto', s + k * 1.1, -(rand(rng, 8, 8.6)), { yaw: road.headingAt(s) + Math.PI / 2 + rand(rng, -0.2, 0.2) });
    }
    // équipements
    const worship = B.worship || {};
    if (opts.named || opts.city || rng() < 0.4) {
      const w = Object.keys(worship).length ? weighted(rng, worship) : null;
      if (w) place(w, s0 + rand(rng, -span * 0.6, span * 0.6), (rng() < 0.5 ? -1 : 1) * rand(rng, 30, 42), { face: true, scale: opts.city && w === 'mosque' && opts.bigMosque ? 1.5 : 1 });
    }
    if (opts.named || opts.city) {
      const ss = s0 + rand(rng, -span * 0.5, span * 0.5), side = rng() < 0.5 ? -1 : 1;
      place('school', ss, side * 34, { face: true });
      flag(ss + 9, side * 26);
      place('tower', s0 + rand(rng, -span, span), (rng() < 0.5 ? -1 : 1) * rand(rng, 45, 70));
      for (let k = 0; k < 5; k++) person(ss + rand(rng, -6, 6), side * rand(rng, 24, 30), [8]);
    }
    if (opts.city && !opts.noStation) {
      place('station', s0 + span * 0.7, 18, { face: true });
      if (opts.secondWorship && Object.keys(worship).length) place(weighted(rng, worship), s0 - span * 0.5, -40, { face: true });
    }
    // poteaux électriques plus serrés en agglomération
  };

  /* --- traversées de villes (plans sourcés dans cities.js) ---------------- */
  const LO = -88, HI = L + 215;
  const inRoad = (s) => s > LO && s < HI;
  const facing = (s, off) => road.headingAt(s) + (road.rev ? 0 : Math.PI) + (off > 0 ? -0.3 : 0.3) * (road.rev ? -1 : 1);
  const labelSign = (s, off, lines, style, size = [3.4, 1.4], postH = 2.2) => {
    if (!inRoad(s)) return;
    const sg = makeSign(lines, style, size, postH);
    if (off < 0 && road.isDual(s)) off -= 9.6;
    road.groundAt(s, off, sg.position);
    sg.rotation.y = facing(s, off);
    group.add(sg);
    extras.push(sg);
  };
  const STYLE = {
    mairie: { bg: '#0f5c3c', fg: '#ffffff', border: '#f4c430' }, police: { bg: '#1d3f8f', fg: '#ffffff', border: '#ffffff' },
    hospital: { bg: '#ffffff', fg: '#c8322b', border: '#c8322b' }, hotel: { bg: '#3a2a1e', fg: '#f4c430', border: '#f4c430' },
    gare: { bg: '#f4c430', fg: '#1b1a17', border: '#1b1a17' }, market: { bg: '#c8322b', fg: '#ffffff', border: '#ffffff' },
    shop: { bg: '#f08a24', fg: '#1b1a17', border: '#1b1a17' }, worship: { bg: '#f1ece0', fg: '#1b1a17', border: '#6b5a45' },
    heritage: { bg: '#6b3e26', fg: '#ffffff', border: '#ffffff' },
  };
  const STATION_GEO = { 'TOTAL': 'station', 'MRS': 'stationG', 'OANDO': 'stationG', 'T-OIL': 'stationB', 'ÉTOILE DU GOLFE': 'stationB', 'CAP': 'stationY', 'SHELL': 'stationY', 'SANOL': 'stationO', 'SOMIE': 'stationK', 'ZENER': 'stationK' };
  const landmark = (z, m) => {
    const s = z.sOf(m.at);
    if (!inRoad(s) || nearRiver(s, 8)) return;
    const sd = z.sideSign(m.side);
    const d = m.d || 0;
    const big = (k) => ({ station: 14, market: 16, gare: 14, mosque: 14, church: 14, mairie: 12, police: 10, hotel: 10, hospital: 12, shop: 8, wall: 10, heritage: 6, cattle: 16, zemstand: 6 }[k] || 10);
    reserved.push({ s, w: big(m.kind), side: sd });
    const off = (o) => sd * (o + d);
    switch (m.kind) {
      case 'station': {
        place(STATION_GEO[m.brand] || 'station', s, off(18), { face: true, force: true });
        const [bg, fg] = BRANDS[m.brand] || ['#c8322b', '#ffffff'];
        labelSign(s - 8, off(9.2), m.label ? [m.brand, m.label] : [m.brand], { bg, fg, border: fg }, [2.4, 1.3], 3.4);
        for (let k = 0; k < 2; k++) person(s + rand(rng, -5, 5), off(rand(rng, 13, 20)));
        break;
      }
      case 'market': {
        if (m.small) { for (let k = 0; k < 4; k++) place(['parasolR', 'parasolB', 'parasolY'][k % 3], s + (k - 1.5) * 3.2, off(rand(rng, 9.2, 11)), { yaw: rng() * 6.28 }); }
        else {
          place('market', s, off(19), { face: true });
          for (let k = 0; k < 6; k++) place(['parasolR', 'parasolB', 'parasolY'][k % 3], s + (k - 2.5) * 3.4, off(rand(rng, 9.2, 10.8)), { yaw: rng() * 6.28 });
          for (let k = 0; k < 3; k++) place(['basins', 'yamPile', 'charcoal'][k], s + rand(rng, -9, 9), off(8.4), { face: true });
        }
        for (let k = 0; k < (m.small ? 5 : 12); k++) person(s + rand(rng, -11, 11), off(rand(rng, 8.4, 22)));
        labelSign(s - 10, off(8.6), [m.label], STYLE.market, [3.6, 1.2], 2.4);
        break;
      }
      case 'gare': {
        place('shelter', s, off(11), { face: true });
        for (let k = 0; k < 3; k++) place('taxi', s - 9 + k * 6.5, off(16), { yaw: road.headingAt(s) + 0.3 });
        for (let k = 0; k < 6; k++) person(s + rand(rng, -9, 9), off(rand(rng, 8.6, 13)));
        labelSign(s - 6, off(8.8), ['GARE', m.label], STYLE.gare, [3.2, 1.4], 2.4);
        break;
      }
      case 'mosque':
        place('mosque', s, off(m.big ? 24 : 20), { face: true, scale: m.big ? 1.55 : 1 });
        if (m.label) labelSign(s - 10, off(8.8), [m.label], STYLE.worship, [3.6, 1.1], 1.6);
        break;
      case 'church':
        place('church', s, off(20), { face: true, scale: m.scale || 1 });
        if (m.label) labelSign(s - 9, off(8.8), [m.label], STYLE.worship, [3.6, 1.1], 1.6);
        break;
      case 'mairie': case 'police': case 'hospital': {
        place(m.kind === 'mairie' ? 'officeG' : m.kind === 'police' ? 'officeB' : 'officeR', s, off(17), { face: true });
        if (m.kind !== 'hospital') flag(s + 6.5, off(10.5));
        if (m.kind === 'police') place('police', s - 3, off(8.6), { yaw: road.headingAt(s) + (sd > 0 ? Math.PI / 2 : -Math.PI / 2) });
        labelSign(s - 7.5, off(9), [m.label], STYLE[m.kind], [3.6, 1.1], 1.4);
        break;
      }
      case 'hotel':
        place(rng() < 0.5 ? 'building2a' : 'building2c', s, off(15), { face: true });
        labelSign(s - 6, off(9), [m.label], STYLE.hotel, [3.4, 1.1], 2.6);
        break;
      case 'shop':
        place('contA', s, off(10.2), { face: true });
        labelSign(s - 4.5, off(8.8), [m.label], STYLE.shop, [3.2, 1.0], 2.2);
        break;
      case 'zemstand':
        for (let k = 0; k < 6; k++) place('moto', s + k * 1.1, off(8.4), { yaw: road.headingAt(s) + Math.PI / 2 + rand(rng, -0.2, 0.2), force: true });
        for (let k = 0; k < 4; k++) person(s + rand(rng, -3, 7), off(rand(rng, 9, 10.5)), [1, 5, 10, 13]);
        break;
      case 'wall':
        place('earthWall', s, off(12), { face: true });
        labelSign(s - 10, off(8.6), [m.label, m.sub || ''], STYLE.heritage, [3.6, 1.5], 1.4);
        break;
      case 'heritage':
        labelSign(s, off(8.4), [m.label, 'Site archéologique'], STYLE.heritage, [3.6, 1.5], 1.2);
        break;
      case 'cattle':
        for (let k = 0; k < 9; k++) place('zebu' + Math.floor(rng() * 3), s + rand(rng, -10, 10), off(rand(rng, 12, 22)), { yaw: rng() * 6.28 });
        for (let k = 0; k < 3; k++) person(s + rand(rng, -8, 8), off(rand(rng, 11, 18)), [4, 7]);
        labelSign(s - 12, off(8.8), [m.label], STYLE.market, [3.4, 1.1], 1.8);
        break;
      default: break;
    }
  };
  function buildCities() {
    const out = [];
    for (const z of road.zones) {
      const P = z.plan;
      for (const m of P.marks) landmark(z, m);
      // bâti urbain entre les repères
      for (const [a, b] of P.urban || []) {
        let s0 = Math.max(LO, Math.min(z.sOf(a), z.sOf(b))), s1 = Math.min(HI, Math.max(z.sOf(a), z.sOf(b)));
        if (s1 - s0 < 30) continue;
        settlement((s0 + s1) / 2, (s1 - s0) / 2, { city: !P.town, style: P.town ? (P.style === 'nordville' ? 'mixte' : null) : P.style || null, dense: P.dense || 1.3, noStation: true, named: true });
      }
      const ur = (P.urban || []).map(([a, b]) => [Math.min(z.sOf(a), z.sOf(b)), Math.max(z.sOf(a), z.sOf(b))]);
      // lampadaires solaires
      if (P.lamps) for (const [a, b] of ur) for (let s = Math.max(LO, a); s < Math.min(HI, b); s += 46) {
        if (nearRiver(s, 4) || road.islandW(s, 9)) continue;
        place('lamp', s, 8.1, { face: true, force: true });
        if (road.isDual(s)) place('lamp', s + 23, -5.3, { face: true, force: true, noShift: true });
      }
      // panneaux publicitaires sur portique (Lomé et grandes villes)
      if ((P.dense || 1) >= 1.3) for (const [a, b] of ur) for (let s = Math.max(LO, a) + 60; s < Math.min(HI, b); s += rand(rng, 160, 260)) {
        const side = rng() < 0.5 ? -1 : 1;
        if (isReserved(s, side) || nearRiver(s, 10)) continue;
        place('billboard', s, side * 11.5, { face: true, yaw: side * 0.5 * (road.rev ? 1 : -1) });
        adBoards.push({ s, off: side * 11.5 });
      }
    }
    // feux tricolores : potence de chaque côté, trois lampes allumées par le jeu
    const MATS = ['#ff3b2f', '#ffb400', '#27d36b'].map((c) => new THREE.MeshBasicMaterial({ color: c }));
    for (const l of road.lights) {
      const heads = [];
      const dual = road.isDual(l.s);
      // potence à droite pour notre sens ; en face, sur le terre-plein (boulevard) ou sur le bas-côté gauche
      for (const side of [1, -1]) {
        const ls = l.s + (side > 0 ? -3.5 : 3.5);
        const poleOff = side > 0 ? 7.6 : dual ? -5.3 : -7.6;
        place('traffic', ls, poleOff, { yaw: road.headingAt(ls) + (side > 0 ? -Math.PI / 2 : Math.PI / 2), force: true, noShift: true });
        const lampOff = side > 0 ? 4.35 : dual ? -8.6 : -4.35;
        road.groundAt(ls, lampOff, _p);
        const facingY = road.headingAt(ls) + (side > 0 ? Math.PI : 0);
        const lamps = [0, 1, 2].map((k) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), MATS[k].clone());
          m.position.set(_p.x + Math.sin(facingY) * 0.18, _p.y + 4.78 - k * 0.38, _p.z + Math.cos(facingY) * 0.18);
          group.add(m);
          extras.push(m);
          return m;
        });
        heads.push({ lamps, dir: side });
      }
      out.push({ light: l, heads });
    }
    // monuments des ronds-points
    for (const i of road.islands) {
      if (!i.pos) continue;
      const mm = new THREE.Mesh(M.monument(i.monument), MAT);
      mm.position.copy(i.pos);
      mm.rotation.y = i.h;
      mm.castShadow = shadows;
      group.add(mm);
      extras.push(mm);
    }
    return out;
  }
  const adBoards = [];
  const extras = []; // objets isolés des villes (enseignes, feux, affiches) : masqués au-delà de la brume
  const startCity = road.fromCity, endCity = road.toCity;
  const lights = buildCities();
  // affiches des panneaux publicitaires (réclames génériques, sans marque réelle)
  const ADS = [
    [['RECHARGE ICI', 'Crédit · Transfert · Mobile money'], { bg: '#f4c430', fg: '#1b1a17', border: '#1b1a17' }],
    [['CIMENT SOLIDE', 'Bâtir pour nos enfants'], { bg: '#9aa0a6', fg: '#1b1a17', border: '#c8322b' }],
    [['ÉCOLE LES ÉLITES', 'Inscriptions ouvertes'], { bg: '#1d3f8f', fg: '#ffffff', border: '#f4c430' }],
    [['LE PAGNE QUI DURE', 'Wax · Bazin · Kenté'], { bg: '#7b2f8f', fg: '#ffffff', border: '#f08a24' }],
    [['ROULEZ PRUDEMMENT', 'La route ne pardonne pas'], { bg: '#ffffff', fg: '#c8322b', border: '#c8322b' }],
    [['CASQUE OBLIGATOIRE', 'Zémidjan, protège ta tête'], { bg: '#0f5c3c', fg: '#ffffff', border: '#ffffff' }],
    [['SAVON DOUX', 'Propre comme le jour'], { bg: '#2f9fd0', fg: '#ffffff', border: '#ffffff' }],
    [['PALUDISME', 'Dormez sous moustiquaire'], { bg: '#ffffff', fg: '#0f5c3c', border: '#0f5c3c' }],
  ];
  for (const ad of adBoards) {
    const [lines, style] = ADS[Math.floor(rng() * ADS.length)];
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 2.75), new THREE.MeshBasicMaterial({ map: signTexture(lines, style) }));
    const off = ad.off < 0 && road.isDual(ad.s) ? ad.off - 9.6 : ad.off;
    road.groundAt(ad.s, off, _p);
    const ry = road.headingAt(ad.s) + (off > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.sign(ad.off) * 0.5 * (road.rev ? 1 : -1);
    panel.position.set(_p.x + Math.sin(ry) * 0.02, _p.y + 5.5, _p.z + Math.cos(ry) * 0.02);
    panel.rotation.y = ry;
    group.add(panel);
    extras.push(panel);
  }
  // gare routière de départ : abri, taxis garés, voyageurs
  place('shelter', 6, -11, { face: true });
  for (let k = 0; k < 4; k++) place('taxi', -18 + k * 7, -8.4 - (k % 2) * 0.3, { yaw: road.headingAt(-18 + k * 7) + 0.25 });
  for (let k = 0; k < 9; k++) person(rand(rng, -12, 18), -rand(rng, 8.6, 11));
  place('shelter', L + 30, -11, { face: true });
  for (let k = 0; k < 3; k++) place('taxi', L + 40 + k * 7, -8.4, { yaw: road.headingAt(L + 40) + 0.25 });
  for (let k = 0; k < 6; k++) person(L + rand(rng, 20, 60), -rand(rng, 8.6, 11));

  for (const v of road.villages) {
    if (v.named && road.zones.some((z) => z.name === v.name)) continue; // ville détaillée par son plan
    settlement(v.s, v.named ? 110 : 45, { named: v.named, dense: v.named ? 1.3 : 0.9 });
  }

  // vendeuses d'essence au bord de la route
  for (const f of road.fuelStops) {
    place('fuel', f.s, 8.3, { face: true });
    place('person' + 3, f.s - 1.2, 8.9, { yaw: road.headingAt(f.s) - Math.PI / 2 });
    const sign = makeSign(['ESSENCE', '750 F le litre'], { bg: '#f4c430', fg: '#16161a', border: '#16161a' }, [2.2, 1.1], 1.0);
    road.groundAt(f.s - 14, 7.8, sign.position);
    sign.rotation.y = road.headingAt(f.s - 14) + Math.PI - 0.35;
    group.add(sign);
  }

  /* --- champs et plantations ------------------------------------------- */
  const rowGap = { maize: 1.7, millet: 1.5, cassava: 1.9, yam: 1.4 };
  for (const f of road.fields) {
    if (f.crop === 'teak') {
      for (let s = f.s0 + 2; s < f.s1; s += 5) for (let o = f.o0 + 2; o < f.o1; o += 5) place('teak', s + rand(rng, -0.4, 0.4), f.side * o, { yaw: rng() * 6.28, scale: rand(rng, 0.85, 1.05) });
      continue;
    }
    const gap = rowGap[f.crop] / Math.max(0.55, quality);
    for (let o = f.o0 + 1; o < f.o1 - 0.5; o += gap) {
      for (let s = f.s0 + 2; s < f.s1 - 1; s += 4) place(f.crop, s, f.side * o, { yaw: road.headingAt(s), scale: rand(rng, 0.85, 1.1) });
    }
    if (rng() < 0.5) person(f.s0 + rand(rng, 4, 20), f.side * (f.o0 + rand(rng, 2, 8)));
  }

  /* --- végétation -------------------------------------------------------- */
  const inField = (s, off) => { const fl = road.fieldAt(s, off); return fl && fl.crop !== 'teak' ? fl : fl; };
  for (let s = -80; s < L + 200; s += rand(rng, 2.5, 6) / quality) {
    const B = road.biomeAt(Math.max(0, Math.min(L, s)));
    if (rng() > B.density) continue;
    const side = rng() < 0.5 ? -1 : 1;
    const minOff = isBusy(s) ? 34 : 9.5;
    const off = side * (minOff + Math.pow(rng(), 1.6) * 140);
    if (inField(s, off) || nearRiver(s, 2)) continue;
    const cl = road.sample(Math.max(0, Math.min(L, s))).cliff;
    if (cl > 0.05 && Math.abs(off) < 26) continue;
    const type = weighted(rng, B.props);
    place(type, s, off, { yaw: rng() * 6.28, scale: rand(rng, 0.75, 1.35) });
  }
  // forêt galerie le long des rivières
  for (const r of road.rivers) {
    for (let k = 0; k < 70 * quality; k++) {
      const side = rng() < 0.5 ? -1 : 1;
      const along = (rng() * 2 - 1) * 150;
      const sAlong = r.s + side * (r.w / 2 + rand(rng, 2, 14));
      const off = along < 0 ? along - 9 : along + 9;
      place(weighted(rng, { mango: 3, fromager: 0.6, oilpalm: 2, bush: 4, banana: 1 }), sAlong, off, { yaw: rng() * 6.28, scale: rand(rng, 0.8, 1.3) });
    }
    if (r.name) {
      for (const [ds, ry] of [[-r.w / 2 - 24, Math.PI], [r.w / 2 + 24, 0]]) {
        const sign = makeSign([r.name.toUpperCase()], { bg: '#2f5f9f', fg: '#ffffff', border: '#ffffff' }, [2.4, 1.0], 1.2);
        road.toWorld(r.s + ds, ry ? -6.2 : 6.2, sign.position);
        sign.rotation.y = road.headingAt(r.s + ds) + ry - (ry ? -0.2 : 0.2);
        group.add(sign);
      }
    }
  }
  // herbes en bord de route, hautes herbes de savane
  for (let s = -60; s < L + 180; s += 2.1 / quality) {
    if (nearRiver(s)) continue;
    const B = road.biomeAt(Math.max(0, Math.min(L, s)));
    const t = B.grass === 'dry' ? 'grassD' : 'grassG';
    const side = rng() < 0.5 ? -1 : 1;
    place(t, s, side * rand(rng, SHOULDER + 0.3, SHOULDER + 5), { yaw: rng() * 6.28, scale: rand(rng, 0.7, 1.3) });
    if (B.tallGrass && rng() < B.tallGrass * 0.55 && !isBusy(s)) {
      const off = side * rand(rng, 10, 45);
      if (!road.fieldAt(s, off)) place('tallGrass', s, off, { yaw: rng() * 6.28, scale: rand(rng, 0.8, 1.3) });
    }
  }
  // troupeaux de zébus avec leur bouvier peul (savane et Sahel)
  for (let s = 150; s < L - 150; s += rand(rng, 260, 520)) {
    if (isBusy(s) || nearRiver(s, 20) || !/savane|sahel|centre|kabye/.test(road.biomeKey(s))) continue;
    const side = rng() < 0.5 ? -1 : 1, off = side * rand(rng, 16, 40), n = 3 + Math.floor(rng() * 5);
    if (road.fieldAt(s, off)) continue;
    for (let k = 0; k < n; k++) place('zebu' + Math.floor(rng() * 3), s + rand(rng, -9, 9), off + rand(rng, -5, 5), { yaw: rng() * 6.28, scale: rand(rng, 0.9, 1.05) });
    person(s + 6, off - side * 3, [4, 13]);
  }
  // gens qui marchent entre les villages
  for (let s = 100; s < L - 100; s += rand(rng, 40, 110)) {
    if (isBusy(s)) continue;
    person(s, (rng() < 0.5 ? -1 : 1) * rand(rng, 7.6, 8.8), [0, 3, 6, 8, 10, 2]);
  }
  // ligne électrique continue (poteaux + 3 câbles)
  const wire = [];
  let prev = null;
  for (let s = -80; s < L + 220; s += 46) {
    if (nearRiver(s, 8)) { prev = null; continue; }
    place('pole', s, -9.4);
    road.groundAt(s, -9.4, _p);
    const h = road.headingAt(s);
    const rx = -Math.cos(h), rz = Math.sin(h);
    const tops = [-0.7, 0, 0.7].map((o) => [_p.x + rx * o, _p.y + 7.55, _p.z + rz * o]);
    if (prev) for (let k = 0; k < 3; k++) {
      const a = prev[k], b = tops[k];
      for (let j = 0; j < 6; j++) {
        const t0 = j / 6, t1 = (j + 1) / 6;
        const sag = (t) => -Math.sin(t * Math.PI) * 0.9;
        wire.push(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0 + sag(t0), a[2] + (b[2] - a[2]) * t0);
        wire.push(a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1 + sag(t1), a[2] + (b[2] - a[2]) * t1);
      }
    }
    prev = tops;
  }
  if (wire.length) {
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    group.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#2a2a2a' })));
  }

  /* --- instanciation ------------------------------------------------------ */
  const lod = [];
  for (const [type, all] of Object.entries(lists)) {
    const isChar = CHAR_TYPE.test(type);
    // tout le décor est découpé en îlots (120 m pour les personnages, 360 m sinon) : la caméra n'envoie
    // à la carte graphique que ce qui est dans le champ, et updateLod masque ce qui est au-delà de la brume
    const cell = isChar ? 120 : 360;
    const chunks = new Map();
    for (const m of all) {
      const k = Math.floor(m.elements[12] / cell) + ',' + Math.floor(m.elements[14] / cell);
      if (!chunks.has(k)) chunks.set(k, []);
      chunks.get(k).push(m);
    }
    for (const mats of chunks.values()) {
      const im = new THREE.InstancedMesh(G[type], isChar ? CH.CHAR_MAT : MAT, mats.length);
      mats.forEach((m, k) => im.setMatrixAt(k, m));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      if (shadows && SHADOW_TYPES.has(type)) im.castShadow = true;
      im.receiveShadow = shadows;
      group.add(im);
      im.userData.far = isChar ? 0 : 1;
      lod.push(im);
    }
  }
  // enseignes (un seul maillage)
  if (signQuads.length) {
    const pos = [], uv = [];
    for (const q of signQuads) {
      const [a, b, c, d] = q.c;
      const u0 = (q.cell % 4) / 4, v1 = 1 - Math.floor(q.cell / 4) / 4, u1 = u0 + 0.25, v0 = v1 - 0.25;
      pos.push(...a, ...b, ...c, ...b, ...d, ...c);
      uv.push(u0, v0, u1, v0, u0, v1, u1, v0, u1, v1, u0, v1);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    sg.computeVertexNormals();
    const sm = new THREE.Mesh(sg, signAtlas());
    sm.material.side = THREE.DoubleSide;
    group.add(sm);
  }
  // drapeaux
  for (const f of flags) {
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), flagMat());
    fm.position.set(f.pos.x, f.pos.y + 6.4, f.pos.z);
    fm.rotation.y = f.ry;
    fm.translateX(0.75);
    fm.userData.flag = true;
    group.add(fm);
  }

  /* --- panneaux ------------------------------------------------------------ */
  const entry = (s, name, sub) => {
    const sign = makeSign(sub ? [name.toUpperCase(), sub] : [name.toUpperCase()], {}, [3.4, 1.5], 1.5);
    road.groundAt(s, 7.6, sign.position);
    sign.rotation.y = road.headingAt(s) + Math.PI - 0.2;
    group.add(sign);
  };
  for (const t of road.towns) entry(t.s - 100, t.name);
  entry(L - 150, endCity.name, endCity.region === startCity.region ? null : `Région ${endCity.region}`);
  const gareSign = makeSign(['GARE ROUTIÈRE', startCity.name], { bg: '#0f5c3c', fg: '#ffffff', border: '#f4c430' }, [4.4, 1.8], 2.2);
  road.groundAt(-6, -9.5, gareSign.position);
  gareSign.rotation.y = road.headingAt(-6) + Math.PI + 0.5;
  group.add(gareSign);
  if (road.faille) {
    const s = road.faille.s - 60;
    const sign = makeSign([road.stage.landmark.toUpperCase(), 'Site touristique'], { bg: '#6b3e26', fg: '#ffffff', border: '#ffffff' }, [3.8, 1.6], 1.6);
    road.groundAt(s, 7.8, sign.position);
    sign.rotation.y = road.headingAt(s) + Math.PI - 0.2;
    group.add(sign);
  }
  const kmTotal = road.stage.km;
  for (let s = 250; s < L - 150; s += 450) {
    if (nearRiver(s, 20)) continue;
    const km = Math.max(1, Math.round(kmTotal * (1 - s / L)));
    const b = makeBorne(endCity.name, km);
    road.groundAt(s, 5.9, b.position);
    b.position.y = road.sample(s).y - 0.12;
    b.rotation.y = road.headingAt(s) + Math.PI - 0.5;
    group.add(b);
  }

  /* --- contrôles routiers -------------------------------------------------- */
  const checkpoints = road.checkpoints.map((cp) => {
    const h = road.headingAt(cp.s);
    const cabin = new THREE.Mesh(G.cabin, MAT);
    road.groundAt(cp.s + 4, 10.2, cabin.position);
    cabin.rotation.y = h + Math.PI / 2;
    cabin.castShadow = shadows;
    group.add(cabin);
    const holder = new THREE.Group();
    road.toWorld(cp.s, 4.6, holder.position);
    holder.position.y += 0.95;
    holder.rotation.y = h;
    const pivot = new THREE.Group();
    pivot.add(new THREE.Mesh(M.barrierGeo(4.4), MAT));
    holder.add(pivot);
    group.add(holder);
    const sign = makeSign(['CONTRÔLE', 'Ralentir'], { bg: '#ffffff', fg: '#c8322b', border: '#c8322b' }, [2.4, 1.2], 1.3);
    road.groundAt(cp.s - 35, 7.4, sign.position);
    sign.rotation.y = h + Math.PI - 0.25;
    group.add(sign);
    for (let k = 0; k < 2; k++) {
      const pz = new THREE.Mesh(G.police, CH.CHAR_MAT);
      road.groundAt(cp.s + 1 + k * 1.2, 6.2 + k * 0.6, pz.position);
      pz.rotation.y = h - Math.PI / 2;
      group.add(pz);
    }
    const fp = new THREE.Mesh(G.flagpole, MAT);
    road.groundAt(cp.s + 6, 12.5, fp.position);
    group.add(fp);
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), flagMat());
    fm.position.copy(fp.position); fm.position.y += 6.4; fm.rotation.y = h + Math.PI / 2; fm.translateX(0.75);
    fm.userData.flag = true;
    group.add(fm);
    return { cp, pivot };
  });

  /* --- postes de péage ----------------------------------------------------- */
  const tolls = road.tolls.map((t) => {
    const h = road.headingAt(t.s);
    const root = new THREE.Group();
    road.toWorld(t.s, 0, root.position);
    root.rotation.y = h;
    group.add(root);
    // repère local : +z vers l'avant de la route, -x vers la droite (côté du taxi)
    const add = (geo, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadows && cast; m.receiveShadow = shadows; root.add(m); return m; };
    add(G.tollCanopy, MAT, 0, 0, 0);
    // fronton lumineux avec le nom du poste
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.1), new THREE.MeshBasicMaterial({ map: signTexture([`PÉAGE DE ${t.name.toUpperCase()}`], { bg: '#16161a', fg: '#f4c430', border: '#f4c430' }) }));
    fr.position.set(0, 6.05, -2.62);
    fr.rotation.y = Math.PI;
    root.add(fr);
    const fr2 = fr.clone(); fr2.position.z = 2.62; fr2.rotation.y = 0; root.add(fr2);
    // barrières (la nôtre à droite, celle d'en face à gauche)
    const pivots = [];
    for (const side of [-1, 1]) {
      const holder = new THREE.Group();
      holder.position.set(side * -3.9, 0.95, side * -1.2);
      if (side < 0) holder.rotation.y = Math.PI;
      const pivot = new THREE.Group();
      pivot.add(new THREE.Mesh(M.barrierGeo(3.7), MAT));
      holder.add(pivot);
      root.add(holder);
      pivots.push(pivot);
    }
    // caissier à son guichet et agent de la SAFER
    const cashier = new THREE.Mesh(G.police, CH.CHAR_MAT);
    cashier.position.set(-4.35, 0.25, 0.75); cashier.rotation.y = Math.PI / 2;
    root.add(cashier);
    const agent = new THREE.Mesh(G['person' + 10], CH.CHAR_MAT);
    agent.position.set(-5.2, 0, -3.2); agent.rotation.y = Math.PI * 0.85;
    root.add(agent);
    // panneaux d'approche
    for (const [ds, txt] of [[-300, ['PÉAGE', '300 m']], [-120, ['PÉAGE', 'Arrêt obligatoire']]]) {
      const sign = makeSign(txt, { bg: '#2f5f9f', fg: '#ffffff', border: '#ffffff' }, [2.4, 1.2], 1.3);
      road.groundAt(t.s + ds, 7.4, sign.position);
      sign.rotation.y = road.headingAt(t.s + ds) + Math.PI - 0.25;
      group.add(sign);
    }
    return { toll: t, pivots };
  });

  return { group, checkpoints, tolls, lod, lights, extras };
}

// masque les îlots de personnages et d'animaux trop loin de la caméra
export function updateLod(lod, cam, dist = 230, far = 640) {
  for (const im of lod) {
    const D = im.userData.far ? far : dist;
    const c = im.boundingSphere.center, r = im.boundingSphere.radius;
    const dx = c.x - cam.x, dz = c.z - cam.z;
    const lim = D + r;
    im.visible = dx * dx + dz * dz < lim * lim;
  }
}

const SHARED_MATS = () => new Set([MAT, CH.CHAR_MAT, TERRAIN_MAT, WATER_MAT, CONCRETE_MAT, SIGN_ATLAS, FLAG_MAT]);
export function disposeGroup(group) {
  const keep = SHARED_MATS();
  group.traverse((o) => {
    if (o.isMesh || o.isInstancedMesh || o.isLineSegments) {
      if (o.geometry && !isShared(o.geometry)) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (keep.has(m)) continue;
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}
function isShared(geo) {
  if (geo.userData.shared) return true;
  if (!GEO) return false;
  for (const k in GEO) if (GEO[k] === geo) return true;
  return false;
}

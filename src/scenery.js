import * as THREE from 'three';
import * as M from './models.js';
import { MAT } from './models.js';
import { SHOULDER } from './road.js';
import { CITIES, STAGES } from './data.js';
import { rand, weighted } from './util.js';
import { TERRAIN_MAT, WATER_MAT, CONCRETE_MAT } from './terrainmat.js';

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
    stall: M.stall(), fuel: M.fuelStand(), pole: M.pole(), shelter: M.shelter(), taxi: M.taxiStatic(), cabin: M.checkpointCabin(),
    yamPile: M.yamPile(), charcoal: M.charcoal(), firewood: M.firewood(), basins: M.basins(), moto: M.motoParked(),
  };
  for (let i = 0; i < M.PEOPLE_VARIANTS; i++) GEO['person' + i] = M.person(i);
  return GEO;
}
// types qui projettent une ombre (PC uniquement)
const SHADOW_TYPES = new Set(['coco', 'oilpalm', 'mango', 'teak', 'baobab', 'karite', 'neem', 'ronier', 'fromager', 'banana',
  'houseA', 'houseB', 'houseC', 'hut', 'compound', 'building2a', 'building2b', 'building2c', 'church', 'mosque', 'school', 'station', 'stall', 'shelter', 'taxi']);

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

  const place = (type, s, off, { scale = 1, yaw = 0, face = false, onRoad = false, sy = 1 } = {}) => {
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

  const busy = [];
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
      if (nearRiver(s, 20)) continue;
      for (const side of [-1, 1]) {
        if (rng() < 0.18) continue;
        const north = style === 'nord' || (style === 'mixte' && rng() < 0.5);
        if (style === 'ville' || (opts.city && rng() < 0.45)) {
          place(['building2a', 'building2b', 'building2c'][Math.floor(rng() * 3)], s, side * rand(rng, 13, 16), { face: true, yaw: rand(rng, -0.04, 0.04) });
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
        if (style !== 'nord' && rng() < 0.55) {
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
    if (opts.city) {
      place('station', s0 + span * 0.7, 18, { face: true });
      if (opts.secondWorship && Object.keys(worship).length) place(weighted(rng, worship), s0 - span * 0.5, -40, { face: true });
    }
    // poteaux électriques plus serrés en agglomération
  };

  const startCity = CITIES[road.index], endCity = CITIES[road.index + 1];
  settlement(0, 110, { city: true, dense: 1.6, bigMosque: startCity.name === 'Sokodé', secondWorship: true });
  settlement(L + 70, 160, { city: true, dense: 1.5, bigMosque: endCity.name === 'Sokodé', secondWorship: true });
  if (road.index === 0) settlement(-60, 60, { style: 'ville', dense: 1.8 });
  // gare routière de départ : abri, taxis garés, voyageurs
  place('shelter', 6, -11, { face: true });
  for (let k = 0; k < 4; k++) place('taxi', -18 + k * 7, -8.4 - (k % 2) * 0.3, { yaw: road.headingAt(-18 + k * 7) + 0.25 });
  for (let k = 0; k < 9; k++) person(rand(rng, -12, 18), -rand(rng, 8.6, 11));
  place('shelter', L + 30, -11, { face: true });
  for (let k = 0; k < 3; k++) place('taxi', L + 40 + k * 7, -8.4, { yaw: road.headingAt(L + 40) + 0.25 });
  for (let k = 0; k < 6; k++) person(L + rand(rng, 20, 60), -rand(rng, 8.6, 11));

  for (const v of road.villages) settlement(v.s, v.named ? 110 : 45, { named: v.named, dense: v.named ? 1.3 : 0.9 });

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
  for (const [type, mats] of Object.entries(lists)) {
    const im = new THREE.InstancedMesh(G[type], MAT, mats.length);
    mats.forEach((m, k) => im.setMatrixAt(k, m));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    if (shadows && SHADOW_TYPES.has(type)) im.castShadow = true;
    im.receiveShadow = shadows;
    group.add(im);
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
  const kmTotal = STAGES[road.index].km;
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
      const pz = new THREE.Mesh(G['person' + (k ? 1 : 5)], MAT);
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

  return { group, checkpoints };
}

const SHARED_MATS = () => new Set([MAT, TERRAIN_MAT, WATER_MAT, CONCRETE_MAT, SIGN_ATLAS, FLAG_MAT]);
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
  if (!GEO) return false;
  for (const k in GEO) if (GEO[k] === geo) return true;
  return false;
}

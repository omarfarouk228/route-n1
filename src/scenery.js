import * as THREE from 'three';
import * as M from './models.js';
import { MAT } from './models.js';
import { SHOULDER } from './road.js';
import { CITIES, STAGES } from './data.js';
import { rand, weighted } from './util.js';

// Géométries partagées, construites une seule fois.
let GEO = null;
function geos() {
  if (GEO) return GEO;
  GEO = {
    palm: M.palm(), mango: M.mango(), teak: M.teak(), baobab: M.baobab(), karite: M.karite(),
    bush: M.bush(), dry: M.dry(), rock: M.rock(), termite: M.termite(),
    houseA: M.houseA(), houseB: M.houseB(), houseC: M.houseC(), hut: M.hut(), stall: M.stall(),
    fuel: M.fuelStand(), pole: M.pole(), shelter: M.shelter(), taxi: M.taxiStatic(), cabin: M.checkpointCabin(),
  };
  for (let i = 0; i < M.PEOPLE_VARIANTS; i++) GEO['person' + i] = M.person(i);
  return GEO;
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

/* ------------------------------------------------------------ panneaux (texture canvas) */
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
  do { g.font = `${s}px ${FONT}`; s -= 4; } while (g.measureText(text).width > maxW && s > 16);
}

function signTexture(lines, style) {
  return canvasTex(512, 256, (g, w, h) => {
    const { bg = '#ffffff', fg = '#16161a', border = '#c8322b' } = style;
    g.fillStyle = border; g.fillRect(0, 0, w, h);
    g.fillStyle = bg; g.fillRect(18, 18, w - 36, h - 36);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (lines.length === 1) {
      fitText(g, lines[0], w - 70, 92);
      g.fillText(lines[0], w / 2, h / 2 + 4);
    } else {
      fitText(g, lines[0], w - 70, 76);
      g.fillText(lines[0], w / 2, h * 0.38);
      fitText(g, lines[1], w - 90, 44);
      g.fillText(lines[1], w / 2, h * 0.72);
    }
  });
}

function makeSign(lines, style = {}, size = [3.2, 1.6], postH = 1.6) {
  const grp = new THREE.Group();
  const tex = signTexture(lines, style);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ map: tex }));
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
    fitText(g, dest.toUpperCase(), w - 14, 24);
    g.fillText(dest.toUpperCase(), w / 2, 102);
    g.font = `46px ${FONT}`; g.fillText(String(km), w / 2, 150);
  });
}

function makeBorne(dest, km) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.3), new THREE.MeshLambertMaterial({ color: '#f5f2ea' }));
  body.position.y = 0.45;
  grp.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 10, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ color: '#c8322b' }));
  top.rotation.z = Math.PI / 2;
  top.rotation.y = Math.PI / 2;
  top.position.y = 0.9;
  grp.add(top);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.87), new THREE.MeshBasicMaterial({ map: borneTexture(dest, km) }));
  face.position.set(0, 0.46, 0.152);
  grp.add(face);
  return grp;
}

/* ------------------------------------------------------------ construction */
export function buildScenery(road, rng, quality = 1) {
  const G = geos();
  const group = new THREE.Group();
  const lists = {};
  const L = road.length;

  const place = (type, s, off, { scale = 1, yaw = 0, face = false, onRoad = false, sy = 1 } = {}) => {
    if (onRoad) road.toWorld(s, off, _p);
    else road.groundAt(s, off, _p);
    const h = road.headingAt(s);
    // face = orienté vers la route
    const ry = face ? h + (off > 0 ? Math.PI / 2 : -Math.PI / 2) + yaw : yaw;
    _q.setFromAxisAngle(UP, ry);
    _s.set(scale, scale * sy, scale);
    _m.compose(_p, _q, _s);
    (lists[type] ||= []).push(_m.clone());
  };

  const busy = []; // zones occupées par les villes et villages
  const isBusy = (s) => busy.some(([a, b]) => s > a && s < b);

  const person = (s, off) => place('person' + Math.floor(rng() * M.PEOPLE_VARIANTS), s, off, { yaw: rng() * 6.28 });

  const village = (s0, span, dense, huts) => {
    busy.push([s0 - span - 10, s0 + span + 10]);
    for (let s = s0 - span; s < s0 + span; s += rand(rng, 7, 13) / dense) {
      for (const side of [-1, 1]) {
        if (rng() < 0.25) continue;
        const off = side * rand(rng, 11.5, 30);
        const type = huts && rng() < 0.75 ? 'hut' : ['houseA', 'houseB', 'houseC'][Math.floor(rng() * 3)];
        place(type, s, off, { face: true, yaw: rand(rng, -0.2, 0.2), scale: rand(rng, 0.9, 1.1) });
      }
      if (rng() < 0.45 * dense) {
        const side = rng() < 0.5 ? -1 : 1;
        place('stall', s, side * rand(rng, 8.6, 9.6), { face: true });
        if (rng() < 0.8) person(s + rand(rng, -1.5, 1.5), side * rand(rng, 7.6, 8.4));
      }
      if (rng() < 0.3 * dense) person(s, (rng() < 0.5 ? -1 : 1) * rand(rng, 7.8, 10));
    }
    for (let s = s0 - span; s < s0 + span; s += 38) place('pole', s, -9.2);
  };

  // gares de départ et d'arrivée
  const startCity = CITIES[road.index], endCity = CITIES[road.index + 1];
  const northStart = road.biomeAt(0).huts, northEnd = road.biomeAt(L).huts;
  village(10, 95, 1.6, northStart);
  village(L + 60, 150, 1.5, northEnd);
  place('shelter', 6, -11, { face: true });
  for (let k = 0; k < 4; k++) place('taxi', -18 + k * 7, -8.4 - (k % 2) * 0.3, { yaw: road.headingAt(-18 + k * 7) + 0.25 });
  for (let k = 0; k < 6; k++) person(rand(rng, -10, 16), -rand(rng, 8.6, 10.5));
  place('shelter', L + 30, -11, { face: true });
  for (let k = 0; k < 3; k++) place('taxi', L + 40 + k * 7, -8.4, { yaw: road.headingAt(L + 40) + 0.25 });
  for (let k = 0; k < 5; k++) person(L + rand(rng, 20, 60), -rand(rng, 8.6, 10.5));

  // villages le long de la route
  for (const v of road.villages) {
    const B = road.biomeAt(v.s);
    village(v.s, v.named ? 110 : 45, v.named ? 1.3 : 0.9, !!B.huts);
  }
  // vendeuses d'essence
  for (const f of road.fuelStops) {
    place('fuel', f.s, 8.3, { face: true });
    place('person' + (2 + Math.floor(rng() * 2)), f.s - 1.2, 8.9, { yaw: road.headingAt(f.s) - Math.PI / 2 });
    const sign = makeSign(['ESSENCE', '750 F le litre'], { bg: '#f4c430', fg: '#16161a', border: '#16161a' }, [2.2, 1.1], 1.0);
    road.groundAt(f.s - 14, 7.8, sign.position);
    sign.rotation.y = road.headingAt(f.s - 14) + Math.PI - 0.35;
    group.add(sign);
  }

  // végétation
  const density = quality;
  for (let s = -80; s < L + 200; s += rand(rng, 2.5, 6) / density) {
    const B = road.biomeAt(Math.max(0, Math.min(L, s)));
    if (rng() > B.density) continue;
    const side = rng() < 0.5 ? -1 : 1;
    const near = isBusy(s);
    const minOff = near ? 34 : 9.5;
    const off = side * (minOff + Math.pow(rng(), 1.6) * 130);
    const type = weighted(rng, B.props);
    const cl = road.sample(Math.max(0, Math.min(L, s))).cliff;
    if (cl > 0.05 && Math.abs(off) < 26) continue; // pas d'objets accrochés à la paroi
    place(type, s, off, { yaw: rng() * 6.28, scale: rand(rng, 0.75, 1.35) });
  }

  // instanciation
  for (const [type, mats] of Object.entries(lists)) {
    const im = new THREE.InstancedMesh(G[type], MAT, mats.length);
    mats.forEach((m, k) => im.setMatrixAt(k, m));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  }

  // panneaux d'entrée de ville
  const entry = (s, name, sub) => {
    const sign = makeSign(sub ? [name.toUpperCase(), sub] : [name.toUpperCase()], {}, [3.4, 1.5], 1.5);
    road.groundAt(s, 7.6, sign.position);
    sign.rotation.y = road.headingAt(s) + Math.PI - 0.2;
    group.add(sign);
  };
  for (const t of road.towns) entry(t.s - 100, t.name);
  entry(L - 130, endCity.name, endCity.region === CITIES[road.index].region ? null : `Région ${endCity.region}`);
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

  // bornes kilométriques (distance réelle restante)
  const kmTotal = STAGES[road.index].km;
  for (let s = 250; s < L - 150; s += 450) {
    const km = Math.max(1, Math.round(kmTotal * (1 - s / L)));
    const b = makeBorne(endCity.name, km);
    road.groundAt(s, 5.9, b.position);
    b.position.y = road.sample(s).y - 0.12;
    b.rotation.y = road.headingAt(s) + Math.PI - 0.5;
    group.add(b);
  }

  // contrôles routiers : cabine + barrière qui se lève
  const checkpoints = road.checkpoints.map((cp) => {
    const h = road.headingAt(cp.s);
    const cabin = new THREE.Mesh(G.cabin, MAT);
    road.groundAt(cp.s + 4, 10.2, cabin.position);
    cabin.rotation.y = h + Math.PI / 2;
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
      const pz = new THREE.Mesh(G['person' + (4 + k) % M.PEOPLE_VARIANTS], MAT);
      road.groundAt(cp.s + 1 + k * 1.2, 6.2 + k * 0.6, pz.position);
      pz.rotation.y = h - Math.PI / 2;
      group.add(pz);
    }
    return { cp, pivot };
  });

  return { group, checkpoints };
}

export function disposeGroup(group) {
  group.traverse((o) => {
    if (o.isMesh || o.isInstancedMesh) {
      if (o.geometry && !isShared(o.geometry)) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m === MAT) continue;
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

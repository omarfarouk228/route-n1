import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/*
 * Personnages et animaux : formes arrondies (tours, sphères lissées), tissus wax dessinés dans le shader,
 * et squelette simplifié porté par les sommets (attribut « rig ») : marche, regard, broutage, queue.
 *
 * rig  = (partie, pivotY, pivotZ, amplitude)
 * rigB = (genouY, sens du genou ou vitesse, motif)
 * Parties : 1/2 jambes (cuisse), 7/8 tibias, 3/4 bras, 5 tête (tourne), 6 tête (broute), 9 queue.
 */

export const CHAR_U = { uTime: { value: 0 } };

const VERT_HEAD = /* glsl */ `
attribute vec4 rig;
attribute vec3 rigB;
attribute vec3 color2;
uniform float uTime;
uniform float uPhase;
uniform float uWalk;
uniform float uSeed;
uniform float uReach;
varying vec3 vObj;
varying vec3 vC2;
varying float vFab;
vec3 rgX(vec3 p, float py, float pz, float a) {
  float c = cos(a), s = sin(a); float y = p.y - py, z = p.z - pz;
  return vec3(p.x, py + y * c + z * s, pz - y * s + z * c);
}
vec3 rgY(vec3 p, float pz, float a) {
  float c = cos(a), s = sin(a); float z = p.z - pz;
  return vec3(p.x * c + z * s, p.y, pz - p.x * s + z * c);
}
vec4 rgAngles(float part) {
  float seed = uSeed;
#ifdef USE_INSTANCING
  seed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
#endif
  float w = uWalk, idle = 1.0 - uWalk, ph = uPhase, A = rig.w;
  float hip = 0.0, knee = 0.0, yaw = 0.0, pitch = 0.0;
  if (part == 1.0 || part == 7.0) { hip = A * sin(ph) * w; knee = A * 1.4 * max(0.0, cos(ph)) * w; }
  else if (part == 2.0 || part == 8.0) { hip = -A * sin(ph) * w; knee = A * 1.4 * max(0.0, -cos(ph)) * w; }
  else if (part == 3.0) hip = -A * sin(ph) * w + idle * 0.06 * sin(uTime * 1.3 + seed) + uReach * 1.35;
  else if (part == 4.0) hip = A * sin(ph) * w + idle * 0.06 * sin(uTime * 1.1 + seed * 1.7);
  else if (part == 5.0) yaw = A * idle * (0.7 * sin(uTime * 0.31 + seed) + 0.3 * sin(uTime * 0.83 + seed * 2.3));
  else if (part == 6.0) pitch = A * idle * smoothstep(0.0, 0.6, sin(uTime * 0.45 * rigB.y + seed)) + w * 0.06 * sin(ph * 2.0);
  else if (part == 9.0) yaw = A * sin(uTime * (2.5 + seed * 0.3) + seed);
  return vec4(hip, knee, yaw, pitch);
}
vec3 rgApply(vec3 p, vec4 a, float part, float k) {
  // k = 1 pour une position, 0 pour une normale (pas de pivot)
  if (part == 7.0 || part == 8.0) p = rgX(p, rigB.x * k, rig.z * k, -a.y * rigB.y);
  if ((part >= 1.0 && part <= 4.0) || part == 7.0 || part == 8.0) p = rgX(p, rig.y * k, rig.z * k, a.x);
  else if (part == 5.0 || part == 9.0) p = rgY(p, rig.z * k, a.z);
  else if (part == 6.0) p = rgX(p, rig.y * k, rig.z * k, -a.w);
  return p;
}
`;

const FRAG_HEAD = /* glsl */ `
varying vec3 vObj;
varying vec3 vC2;
varying float vFab;
float rgPattern(vec3 p, float f) {
  float t = floor(f + 0.5);
  if (t > 4.5) {
    // pelage tacheté
    float n = sin(p.x * 9.0 + sin(p.z * 7.0) * 1.7) * sin(p.z * 6.0 + sin(p.y * 8.0) * 1.5) + 0.5 * sin(p.y * 11.0 + p.x * 5.0);
    return smoothstep(0.38, 0.55, n);
  }
  vec2 uv = vec2(atan(p.x, p.z) * 0.17, p.y) * 13.0;
  vec2 g = fract(uv) - 0.5;
  float m;
  if (t < 1.5) { float r = length(g); m = smoothstep(0.44, 0.38, r) * smoothstep(0.17, 0.23, r) + smoothstep(0.11, 0.06, r); }
  else if (t < 2.5) { m = step(0.5, fract(uv.y * 0.5 + abs(g.x) * 0.9)); }
  else if (t < 3.5) { float d = abs(g.x) + abs(g.y); m = smoothstep(0.36, 0.3, d) * smoothstep(0.12, 0.18, d); }
  else { m = max(step(0.62, fract(uv.y * 0.5)), step(0.82, fract(uv.x * 0.5)) * 0.7); }
  float fw = length(fwidth(uv));
  return mix(m, 0.38, smoothstep(0.35, 0.9, fw));
}
`;

function patch(sh) {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\n' + VERT_HEAD)
    .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nfloat rgPart = floor(rig.x + 0.5);\nvec4 rgA = rgAngles(rgPart);\nobjectNormal = rgApply(objectNormal, rgA, rgPart, 0.0);')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vC2 = color2; vFab = rigB.z;\ntransformed = rgApply(transformed, rgA, rgPart, 1.0);\ntransformed.y += uWalk * 0.03 * abs(cos(uPhase));');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
    .replace('#include <color_fragment>', '#include <color_fragment>\nif (vFab > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vC2, rgPattern(vObj, vFab));');
}

// Un matériau par personnage animé (phase de marche propre) ; tous partagent le même programme GPU.
export function makeCharMat() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  const u = { uPhase: { value: 0 }, uWalk: { value: 0 }, uSeed: { value: Math.random() * 6.28 }, uReach: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, u, { uTime: CHAR_U.uTime }); patch(sh); };
  m.customProgramCacheKey = () => 'n1char';
  return m;
}
// matériau des personnages instanciés (au repos : regard, bras, broutage)
export const CHAR_MAT = makeCharMat();

/* ------------------------------------------------------------ primitives */
const _c = new THREE.Color();
const _c2 = new THREE.Color();
const PI = Math.PI;
let R = null;
function rig(o = {}) { R = { p: 0, hy: 0, pz: 0, a: 0, ky: 0, ks: 1, fab: 0, c2: null, ...o }; }
rig();

function xf(geo, o = {}) {
  const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = o;
  geo.scale(sx, sy, sz);
  if (rx) geo.rotateX(rx);
  if (rz) geo.rotateZ(rz);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  return geo;
}
function fin(geo, color, o) {
  if (o) xf(geo, o);
  if (geo.index) geo = geo.toNonIndexed();
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  const n = geo.attributes.position.count;
  _c.set(color);
  _c2.set(R.c2 || color);
  const col = new Float32Array(n * 3), c2 = new Float32Array(n * 3), rg = new Float32Array(n * 4), rb = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    c2[i * 3] = _c2.r; c2[i * 3 + 1] = _c2.g; c2[i * 3 + 2] = _c2.b;
    rg[i * 4] = R.p; rg[i * 4 + 1] = R.hy; rg[i * 4 + 2] = R.pz; rg[i * 4 + 3] = R.a;
    rb[i * 3] = R.ky; rb[i * 3 + 1] = R.ks; rb[i * 3 + 2] = R.fab;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('color2', new THREE.BufferAttribute(c2, 3));
  geo.setAttribute('rig', new THREE.BufferAttribute(rg, 4));
  geo.setAttribute('rigB', new THREE.BufferAttribute(rb, 3));
  return geo;
}
const S = (r, c, o, d = 1) => fin(new THREE.IcosahedronGeometry(r, d), c, o);
const C = (rt, rb, h, seg, c, o) => fin(new THREE.CylinderGeometry(rt, rb, h, seg), c, o);
const B = (w, h, d, c, o) => fin(new THREE.BoxGeometry(w, h, d), c, o);
const K = (r, h, seg, c, o) => fin(new THREE.ConeGeometry(r, h, seg), c, o);
// tour : profil [[rayon, y], ...] de bas en haut
const T = (prof, seg, c, o) => fin(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg), c, o);
// demi-sphère (cheveux, foulard, casquette)
const H = (r, c, o, seg = 12) => fin(new THREE.SphereGeometry(r, seg, 6, 0, PI * 2, 0, PI * 0.55), c, o);
// segment arrondi entre deux points
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion();
function L(a, b, r1, r2, c, seg = 7) {
  _a.set(...a); _b.set(...b); _d.subVectors(_b, _a);
  const len = _d.length();
  const g = new THREE.CylinderGeometry(r2, r1, len, seg, 1);
  g.translate(0, len / 2, 0);
  _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _d.normalize());
  g.applyQuaternion(_q);
  g.translate(_a.x, _a.y, _a.z);
  return fin(g, c);
}
function merge(list, scale = 1) {
  const g = mergeGeometries(list, false);
  if (scale !== 1) g.scale(scale, scale, scale);
  g.computeBoundingSphere();
  g.userData.shared = true;
  return g;
}

/* ------------------------------------------------------------ humains */
export const SKINS = ['#6e4229', '#7f4e33', '#8f5c3c', '#5c3521', '#9c6845'];
const DARK = '#15100c';

// tissu : couleur + motif wax (1 anneaux, 2 zigzags, 3 losanges, 4 bandes) + couleur du motif
const W = (c, fab = 0, c2 = null) => ({ c, fab, c2 });
const cloth = (w) => ({ fab: w.fab || 0, c2: w.c2 });

/*
 * Options : skin, top (tissu), bottom 'pagne' | 'pants' | 'shorts' | 'boubou', low (tissu du bas),
 * sleeves 'short' | 'long', head 'wrap' | 'hair' | 'kufi' | 'cap' | 'beret' | 'braids', hat (tissu),
 * load 'basin' | 'tray', goods, armUp, baby, bag, child, female, shoes.
 */
export function figure(o) {
  const p = [];
  const skin = o.skin || SKINS[0];
  const top = o.top, low = o.low || top;
  const fem = !!o.female;
  const skirt = o.bottom === 'pagne' || o.bottom === 'boubou';
  const legA = skirt ? 0.2 : 0.42;
  const shoe = o.shoes || (o.bottom === 'pants' ? '#1d1a18' : '#3a2a1c');
  const legC = o.bottom === 'pants' ? low.c : skin;

  // jambes
  for (const sd of [1, -1]) {
    const x = sd * 0.095, hp = sd > 0 ? 1 : 2, sh = sd > 0 ? 7 : 8;
    rig({ p: hp, hy: 0.9, a: legA, ...(o.bottom === 'pants' ? cloth(low) : {}) });
    p.push(L([x, 0.93, 0], [x, 0.49, 0.01], 0.078, 0.06, legC, 6));
    if (o.bottom === 'shorts') { rig({ p: hp, hy: 0.9, a: legA, ...cloth(low) }); p.push(L([x, 0.93, 0], [x, 0.66, 0.005], 0.088, 0.078, low.c, 6)); }
    rig({ p: sh, hy: 0.9, a: legA, ky: 0.49, ks: 1, ...(o.bottom === 'pants' ? cloth(low) : {}) });
    p.push(S(0.06, legC, { x, y: 0.49, z: 0.01 }));
    p.push(L([x, 0.49, 0.01], [x, 0.09, -0.01], 0.058, 0.042, legC, 6));
    rig({ p: sh, hy: 0.9, a: legA, ky: 0.49, ks: 1 });
    p.push(S(0.05, skin, { x, y: 0.07, z: 0.04, sx: 0.95, sy: 0.7, sz: 2.1 }));
    p.push(B(0.1, 0.025, 0.25, shoe, { x, y: 0.015, z: 0.045 }));
  }

  // bassin et bas du corps
  rig(cloth(low));
  if (o.bottom === 'pagne') {
    p.push(T([[0, 0.1], [0.17, 0.1], [0.185, 0.3], [0.2, 0.62], [0.205, 0.86], [0.18, 0.98], [0.16, 1.05], [0, 1.06]], 12, low.c, { sx: 1.08, sz: 0.92 }));
    rig({ fab: 0 });
    p.push(C(0.185, 0.185, 0.035, 16, o.band || low.c2 || low.c, { y: 0.995, sx: 1.08, sz: 0.92 })); // nœud de pagne
  } else if (o.bottom === 'boubou') {
    p.push(T([[0, 0.12], [0.3, 0.12], [0.29, 0.5], [0.26, 0.9], [0.22, 1.2], [0.2, 1.36], [0.11, 1.47], [0, 1.48]], 12, low.c, { sx: 1.3, sz: 0.78 }));
  } else {
    p.push(S(0.16, low.c, { y: 0.95, sx: 1.18, sy: 0.72, sz: 0.85 }));
  }

  // buste
  if (o.bottom !== 'boubou') {
    rig(cloth(top));
    const prof = fem
      ? [[0, 0.93], [0.165, 0.94], [0.175, 1.0], [0.15, 1.1], [0.165, 1.22], [0.175, 1.31], [0.175, 1.38], [0.12, 1.45], [0.055, 1.48], [0, 1.48]]
      : [[0, 0.9], [0.165, 0.9], [0.16, 1.02], [0.165, 1.16], [0.185, 1.3], [0.19, 1.38], [0.13, 1.45], [0.055, 1.48], [0, 1.48]];
    p.push(T(prof, 10, top.c, { sx: 1.22, sz: 0.78 }));
    if (fem) p.push(S(0.1, top.c, { y: 1.25, z: 0.045, sx: 1.55, sy: 0.75, sz: 0.85 }));
    if (fem && o.peplum) p.push(T([[0.21, 0.97], [0.19, 1.04], [0.16, 1.08]], 14, top.c, { sx: 1.18, sz: 0.85 }));
  }

  // bras
  const sleeveLong = o.sleeves === 'long' || o.bottom === 'boubou';
  for (const sd of [1, -1]) {
    const part = sd > 0 ? 3 : 4, x0 = sd * 0.2;
    const up = o.armUp && sd < 0;
    const sw = { p: up ? 0 : part, hy: 1.4, a: o.bottom === 'boubou' ? 0.18 : 0.32 };
    rig({ ...sw, ...cloth(top) });
    p.push(S(0.062, top.c, { x: x0, y: 1.39, z: 0 }));
    const elbow = up ? [sd * 0.31, 1.62, 0.02] : [sd * 0.235, 1.13, -0.015];
    const wrist = up ? [sd * 0.2, 1.86, 0.03] : [sd * 0.235, 0.88, 0.05];
    if (o.bottom === 'boubou') {
      // grandes manches : pan de tissu jusqu'au poignet
      p.push(L([x0, 1.42, 0], elbow, 0.08, 0.13, top.c, 6));
      p.push(L(elbow, [wrist[0], wrist[1] + 0.06, wrist[2]], 0.13, 0.12, top.c, 6));
    } else if (sleeveLong) {
      p.push(L([x0, 1.42, 0], elbow, 0.058, 0.05, top.c, 5));
      p.push(L(elbow, wrist, 0.05, 0.043, top.c, 5));
    } else {
      p.push(L([x0, 1.42, 0], [x0 + (elbow[0] - x0) * 0.45, 1.42 + (elbow[1] - 1.42) * 0.45, 0], 0.066, 0.06, top.c, 6));
    }
    rig(sw);
    if (!sleeveLong) {
      p.push(L([x0, 1.4, 0], elbow, 0.046, 0.038, skin, 5));
      p.push(L(elbow, wrist, 0.038, 0.032, skin, 5));
    }
    p.push(S(0.044, skin, { x: wrist[0], y: wrist[1] - (up ? -0.03 : 0.05), z: wrist[2] + 0.01, sx: 0.75, sy: 1.25 }));
  }

  // cou et tête (partie 5 : regarde autour ; charge sur la tête = tête fixe)
  const load = o.load;
  rig({ p: 5, hy: 1.5, a: load ? 0 : 0.55 });
  p.push(C(0.046, 0.055, 0.12, 8, skin, { y: 1.5 }));
  p.push(S(0.105, skin, { y: 1.625, sy: 1.14, sz: 1.06 }, 2));
  p.push(S(0.068, skin, { y: 1.565, z: 0.035, sy: 0.85 }));
  p.push(S(0.024, skin, { y: 1.615, z: 0.104, sz: 1.1 }));
  for (const sd of [1, -1]) {
    p.push(S(0.026, skin, { x: sd * 0.104, y: 1.62, sx: 0.5, sz: 0.8 }));
    p.push(S(0.016, '#efe8dc', { x: sd * 0.036, y: 1.648, z: 0.092 }, 0));
    p.push(S(0.0095, DARK, { x: sd * 0.036, y: 1.648, z: 0.104 }, 0));
  }
  p.push(B(0.05, 0.012, 0.01, '#2a1712', { y: 1.575, z: 0.1 }));
  // coiffes
  const hat = o.hat || W(DARK);
  rig({ p: 5, hy: 1.5, a: load ? 0 : 0.55, ...cloth(hat) });
  if (o.head === 'hair') p.push(H(0.112, DARK, { y: 1.63, z: -0.008, rx: -0.35 }));
  else if (o.head === 'braids') {
    p.push(H(0.113, DARK, { y: 1.63, z: -0.01, rx: -0.3 }));
    p.push(S(0.07, DARK, { y: 1.69, z: -0.1 }));
  } else if (o.head === 'wrap') {
    p.push(H(0.135, hat.c, { y: 1.62, z: -0.01, rx: -0.25, sx: 1.05, sy: 1.25, sz: 1.08 }));
    p.push(S(0.09, hat.c, { y: 1.75, z: -0.04, sx: 1.45, sy: 0.75, sz: 1.15 }));
    // nœud en éventail du foulard, vers l'arrière
    p.push(S(0.09, hat.c, { y: 1.8, z: -0.1, sx: 1.6, sy: 0.85, sz: 0.35, rx: -0.5 }));
    p.push(B(0.05, 0.05, 0.05, hat.c, { y: 1.71, z: -0.15 }));
  } else if (o.head === 'kufi') p.push(C(0.108, 0.112, 0.09, 12, hat.c, { y: 1.715 }));
  else if (o.head === 'cap') {
    p.push(H(0.118, hat.c, { y: 1.655, rx: -0.1 }));
    p.push(B(0.17, 0.015, 0.13, hat.c, { y: 1.675, z: 0.135 }));
  } else if (o.head === 'beret') {
    p.push(S(0.12, hat.c, { y: 1.715, x: 0.02, sx: 1.05, sy: 0.38, sz: 1.0, rz: -0.12 }));
  }
  // charge sur la tête
  rig({ p: 5, hy: 1.5, a: 0 });
  if (load === 'basin') {
    p.push(C(0.1, 0.1, 0.035, 10, '#d9c8a8', { y: 1.765 }));
    p.push(T([[0, 1.78], [0.2, 1.785], [0.33, 1.92], [0.345, 1.935], [0.33, 1.935]], 18, o.basin || '#2f78a8'));
    p.push(...goodsOn(o.goods || 'fruit', 1.92, 0.3));
  } else if (load === 'tray') {
    p.push(C(0.1, 0.1, 0.035, 10, '#d9c8a8', { y: 1.765 }));
    p.push(C(0.34, 0.34, 0.04, 18, '#8a6a42', { y: 1.8 }));
    p.push(...goodsOn(o.goods || 'bread', 1.82, 0.3));
  } else if (load === 'bundle') {
    p.push(C(0.1, 0.1, 0.035, 10, '#d9c8a8', { y: 1.765 }));
    for (let k = 0; k < 5; k++) p.push(C(0.035, 0.035, 0.9, 5, '#7a5a38', { x: -0.08 + k * 0.04, y: 1.82, rx: PI / 2, ry: 0.15 }));
  }

  // bébé au dos dans le pagne
  if (o.baby) {
    rig(cloth(low));
    p.push(S(0.17, low.c, { y: 1.18, z: -0.17, sx: 1.1, sy: 1.2, sz: 0.75 }));
    rig({});
    p.push(S(0.072, skin, { y: 1.4, z: -0.2 }));
    p.push(H(0.074, DARK, { y: 1.405, z: -0.205, rx: -0.4 }));
  }
  if (o.bag) {
    rig({});
    p.push(B(0.24, 0.28, 0.09, o.bag, { x: 0.0, y: 1.15, z: -0.19 }));
    p.push(B(0.03, 0.04, 0.4, o.bag, { x: 0.1, y: 1.38, z: -0.02, rx: 0.4 }));
  }
  return merge(p, o.child ? 0.7 : (o.scale || 1));
}

function goodsOn(kind, y, r) {
  const g = [];
  if (kind === 'bread') {
    for (let k = 0; k < 7; k++) g.push(C(0.04, 0.045, 0.42, 7, '#d29a52', { x: -0.2 + k * 0.065, y: y + 0.04, rx: PI / 2 }));
  } else if (kind === 'water') {
    for (let i = 0; i < 9; i++) g.push(B(0.11, 0.05, 0.16, '#e8f4fb', { x: ((i % 3) - 1) * 0.13, y: y + 0.02 + (i > 5 ? 0.05 : 0), z: (Math.floor(i / 3) - 1) * 0.15, ry: i * 0.3 }));
  } else if (kind === 'peanut') {
    g.push(S(r * 0.8, '#c99a5c', { y: y, sy: 0.4 }));
    for (let k = 0; k < 5; k++) g.push(B(0.07, 0.1, 0.07, '#f2efe6', { x: Math.cos(k * 1.25) * 0.18, y: y + 0.07, z: Math.sin(k * 1.25) * 0.18 }));
  } else {
    // fruits : oranges, mangues, bananes
    const cols = kind === 'banana' ? ['#e7c63a', '#d9b52c'] : ['#f08a24', '#e3a21a', '#7aa63a'];
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4, rr = k === 0 ? 0 : r * 0.55;
      g.push(S(0.058, cols[k % cols.length], { x: Math.cos(a) * rr, y: y + (k === 0 ? 0.08 : 0.03), z: Math.sin(a) * rr }));
    }
  }
  return g;
}

/* ------------------------------------------------------------ catalogue de passants */
const S0 = SKINS;
export const PEOPLE = [
  { female: true, skin: S0[1], bottom: 'pagne', low: W('#1f4fa0', 1, '#f2c230'), top: W('#1f4fa0', 1, '#f2c230'), peplum: true, head: 'wrap', hat: W('#1f4fa0', 1, '#f2c230') },
  { skin: S0[0], bottom: 'pants', low: W('#2f3036'), top: W('#2f78a8'), head: 'hair', sleeves: 'short' },
  { female: true, skin: S0[2], bottom: 'pagne', low: W('#0f7a4a', 3, '#f08a24'), top: W('#f08a24'), head: 'wrap', hat: W('#0f7a4a', 3, '#f08a24'), baby: true },
  { female: true, skin: S0[3], bottom: 'pagne', low: W('#7b2f8f', 2, '#f4c430'), top: W('#e9e2cf'), head: 'wrap', hat: W('#f4c430'), load: 'basin', basin: '#2f78a8', goods: 'fruit', armUp: true },
  { skin: S0[1], bottom: 'boubou', low: W('#e9e6dc'), top: W('#e9e6dc'), head: 'kufi', hat: W('#f2efe6') },
  { skin: S0[2], bottom: 'pants', low: W('#5a4a36'), top: W('#d9d2c0', 4, '#a8452c'), head: 'cap', hat: W('#c8322b'), sleeves: 'short' },
  { female: true, skin: S0[0], bottom: 'pagne', low: W('#d4581f', 1, '#1b4d3a'), top: W('#1b4d3a'), head: 'wrap', hat: W('#d4581f', 1, '#1b4d3a'), load: 'basin', basin: '#c9ced3', goods: 'water', armUp: true },
  { skin: S0[3], bottom: 'boubou', low: W('#2a56a0', 3, '#9fc3ef'), top: W('#2a56a0', 3, '#9fc3ef'), head: 'kufi', hat: W('#ffffff') },
  { child: true, skin: S0[1], bottom: 'shorts', low: W('#b59a62'), top: W('#c9ad74'), head: 'hair', sleeves: 'short', bag: '#2f5f9f' },
  { female: true, skin: S0[4], bottom: 'pagne', low: W('#2b8a9a', 2, '#ffffff'), top: W('#f4c430'), head: 'wrap', hat: W('#2b8a9a'), load: 'tray', goods: 'bread' },
  { skin: S0[4], bottom: 'pants', low: W('#2f3036'), top: W('#f4f0e0'), head: 'hair', sleeves: 'long' },
  { female: true, skin: S0[0], bottom: 'pagne', low: W('#b8262b', 4, '#1a1a1a'), top: W('#ffffff'), head: 'braids', peplum: true },
  { child: true, female: true, skin: S0[2], bottom: 'pagne', low: W('#b59a62'), top: W('#c9ad74'), head: 'braids', sleeves: 'short' },
  { skin: S0[2], bottom: 'pants', low: W('#3b4f2a'), top: W('#0f7a4a', 4, '#f4c430'), head: 'hair', sleeves: 'short', load: 'bundle', armUp: true },
];
export const PEOPLE_VARIANTS = PEOPLE.length;
export const WALKERS = [0, 1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13];
export const VENDOR_SPECS = [
  { female: true, skin: S0[2], bottom: 'pagne', low: W('#2f78a8', 2, '#ffffff'), top: W('#f4c430'), head: 'wrap', hat: W('#2f78a8'), load: 'tray', goods: 'bread' },
  { female: true, skin: S0[1], bottom: 'pagne', low: W('#c8322b', 1, '#f4c430'), top: W('#ffffff'), head: 'wrap', hat: W('#c8322b', 1, '#f4c430'), load: 'basin', basin: '#c9ced3', goods: 'water', armUp: true },
  { female: true, skin: S0[3], bottom: 'pagne', low: W('#0f7a4a', 3, '#f4c430'), top: W('#f08a24'), head: 'wrap', hat: W('#f4c430'), load: 'basin', basin: '#2f78a8', goods: 'banana', armUp: true },
  { female: true, skin: S0[0], bottom: 'pagne', low: W('#6a2f8f', 4, '#f08a24'), top: W('#e9e2cf'), head: 'wrap', hat: W('#6a2f8f'), load: 'tray', goods: 'peanut' },
];
const POLICE = { skin: S0[0], bottom: 'pants', low: W('#3d4a5c'), top: W('#8d9db3'), head: 'beret', hat: W('#1d2533'), sleeves: 'short', shoes: '#111' };

const cache = new Map();
const cached = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
export const personGeo = (i) => cached('p' + (i % PEOPLE.length), () => figure(PEOPLE[i % PEOPLE.length]));
export const vendorGeo = (i) => cached('v' + (i % VENDOR_SPECS.length), () => figure(VENDOR_SPECS[i % VENDOR_SPECS.length]));
export const policeGeo = () => cached('police', () => figure(POLICE));

// conducteur de zémidjan, assis
export function riderGeo(shirt) {
  return cached('rider' + shirt, () => {
    const p = [];
    const skin = SKINS[2];
    rig({});
    for (const sd of [1, -1]) {
      const x = sd * 0.13;
      p.push(L([x, 0.98, -0.12], [x + sd * 0.04, 0.95, 0.3], 0.075, 0.06, '#2f3036', 8));
      p.push(L([x + sd * 0.04, 0.95, 0.3], [x + sd * 0.05, 0.5, 0.36], 0.058, 0.045, '#2f3036', 8));
      p.push(B(0.1, 0.06, 0.24, '#1d1a18', { x: x + sd * 0.05, y: 0.47, z: 0.4 }));
    }
    p.push(S(0.17, '#2f3036', { y: 1.0, z: -0.12, sx: 1.2, sy: 0.7, sz: 1.0 }));
    p.push(T([[0, 0.98], [0.17, 0.98], [0.17, 1.12], [0.19, 1.3], [0.19, 1.4], [0.13, 1.48], [0, 1.5]], 14, shirt, { sx: 1.2, sz: 0.8, rx: 0.25, z: -0.38, y: -0.25 }));
    for (const sd of [1, -1]) {
      p.push(L([sd * 0.21, 1.33, -0.02], [sd * 0.26, 1.13, 0.22], 0.05, 0.042, shirt, 7));
      p.push(L([sd * 0.26, 1.13, 0.22], [sd * 0.3, 1.08, 0.5], 0.04, 0.034, skin, 5));
      p.push(S(0.045, skin, { x: sd * 0.3, y: 1.08, z: 0.53 }));
    }
    p.push(C(0.046, 0.055, 0.12, 8, skin, { y: 1.47, z: 0.02 }));
    p.push(S(0.105, skin, { y: 1.6, z: 0.05, sy: 1.14 }, 2));
    p.push(H(0.13, '#c8322b', { y: 1.6, z: 0.04, rx: -0.2, sy: 1.1 }));
    p.push(B(0.2, 0.08, 0.06, '#222', { y: 1.63, z: 0.16 }));
    return merge(p);
  });
}

/* ------------------------------------------------------------ animaux */
// quadrupède générique : parties 1/2 en diagonale, tête qui broute (6), queue (9)
function quad(o) {
  const p = [];
  const { c, c2, len, hgt, wid, leg, head, fab = 5 } = o;
  const coat = { fab: c2 ? fab : 0, c2 };
  const bodyY = hgt * 0.78;
  // corps
  rig(coat);
  p.push(S(1, c, { y: bodyY, sx: wid / 2, sy: hgt * 0.27, sz: len / 2 }, 2));
  p.push(S(1, c, { y: bodyY + hgt * 0.02, z: len * 0.3, sx: wid * 0.5, sy: hgt * 0.27, sz: len * 0.22 }, 1));
  p.push(S(1, c, { y: bodyY + hgt * 0.03, z: -len * 0.3, sx: wid * 0.52, sy: hgt * 0.26, sz: len * 0.22 }, 1));
  if (o.hump) p.push(S(1, o.humpC || c, { y: bodyY + hgt * 0.3, z: len * 0.32, sx: wid * 0.3, sy: hgt * 0.26, sz: len * 0.14, rx: -0.3 }, 1));
  if (o.wool) p.push(S(1, c, { y: bodyY + hgt * 0.04, sx: wid * 0.56, sy: hgt * 0.3, sz: len * 0.5 }, 1));
  // pattes : avant gauche + arrière droite en phase
  const hipF = bodyY - hgt * 0.06, hipB = bodyY - hgt * 0.04;
  const kneeY = hgt * 0.42;
  for (const [sd, zf, part] of [[1, len * 0.33, 1], [-1, len * 0.33, 2], [1, -len * 0.33, 2], [-1, -len * 0.33, 1]]) {
    const x = sd * wid * 0.3, front = zf > 0;
    const hy = front ? hipF : hipB;
    rig({ p: part, hy, pz: zf, a: 0.42, ...coat });
    p.push(L([x, hy + hgt * 0.08, zf + (front ? 0 : 0.04 * hgt)], [x, kneeY, zf + (front ? 0.01 : -0.03) * hgt], leg * 2.1, leg * 0.95, c, 7));
    rig({ p: part + 6, hy, pz: zf, a: 0.42, ky: kneeY, ks: front ? 1 : -0.6 });
    p.push(L([x, kneeY, zf + (front ? 0.01 : -0.03) * hgt], [x, hgt * 0.05, zf], leg * 0.8, leg * 0.62, o.legC || c, 6));
    p.push(C(leg * 0.62, leg * 0.8, hgt * 0.06, 6, '#2a2420', { x, y: hgt * 0.03, z: zf }));
  }
  // cou et tête
  const nz = len * 0.42, ny = bodyY + hgt * 0.1;
  rig({ p: 6, hy: ny, pz: nz, a: o.graze ?? 0.9, ks: o.peck || 1, ...coat });
  const hz = nz + head * 1.1, hy = ny + hgt * (o.headUp ?? 0.32);
  p.push(L([0, ny - hgt * 0.04, nz - head * 0.3], [0, hy, hz], o.neck || head * 0.75, (o.neck || head * 0.75) * 0.8, o.neckC || c, 8));
  p.push(S(head, c, { y: hy, z: hz + head * 0.4, sx: 0.78, sy: 0.82, sz: 1.5, rx: 0.55 }, 2));
  rig({ p: 6, hy: ny, pz: nz, a: o.graze ?? 0.9, ks: o.peck || 1 });
  p.push(S(head * 0.62, o.muzzle || c, { y: hy - head * 0.62, z: hz + head * 1.35, sx: 0.85, sz: 1.1 }));
  for (const sd of [1, -1]) {
    p.push(S(head * 0.14, DARK, { x: sd * head * 0.62, y: hy + head * 0.22, z: hz + head * 0.55 }, 0));
    // oreilles
    p.push(S(head * 0.45, o.earC || c, { x: sd * head * 0.95, y: hy + head * 0.15, z: hz + head * 0.05, sx: 1.4, sy: 0.35, sz: 0.75, rz: sd * (o.earDroop ?? 0.6) }));
    // cornes
    if (o.horns === 'goat') {
      p.push(L([sd * head * 0.35, hy + head * 0.65, hz + head * 0.2], [sd * head * 0.5, hy + head * 1.5, hz - head * 0.5], head * 0.16, head * 0.09, '#d9cbb0', 5));
      p.push(L([sd * head * 0.5, hy + head * 1.5, hz - head * 0.5], [sd * head * 0.62, hy + head * 1.55, hz - head * 1.2], head * 0.09, head * 0.03, '#d9cbb0', 5));
    } else if (o.horns === 'lyre') {
      const b = [sd * head * 0.55, hy + head * 0.75, hz + head * 0.1];
      const m = [sd * head * 1.9, hy + head * 1.4, hz + head * 0.05];
      p.push(L(b, m, head * 0.22, head * 0.15, '#e8dcc0', 6));
      p.push(L(m, [sd * head * 2.1, hy + head * 3.0, hz - head * 0.35], head * 0.15, head * 0.04, '#e8dcc0', 6));
    }
  }
  if (o.beard) p.push(K(head * 0.18, head * 0.7, 5, c2 || c, { y: hy - head * 1.0, z: hz + head * 0.9, rx: PI }));
  if (o.dewlap) { rig({ ...coat }); p.push(S(1, c, { y: bodyY - hgt * 0.12, z: len * 0.5, sx: wid * 0.12, sy: hgt * 0.22, sz: len * 0.12 })); }
  // queue
  rig({ p: 9, hy: bodyY, pz: -len * 0.5, a: 0.5 });
  if (o.tail === 'up') p.push(K(head * 0.18, head * 0.9, 5, c, { y: bodyY + hgt * 0.15, z: -len * 0.52, rx: -0.6 }));
  else {
    const tl = o.tailLen || hgt * 0.5;
    p.push(L([0, bodyY + hgt * 0.1, -len * 0.5], [0, bodyY + hgt * 0.1 - tl, -len * 0.56], head * 0.12, head * 0.06, c, 5));
    if (o.tuft) p.push(S(head * 0.2, DARK, { y: bodyY + hgt * 0.1 - tl - head * 0.1, z: -len * 0.56, sy: 1.6 }));
  }
  return merge(p);
}

const GOAT_COATS = [['#f1ece2', '#2a2420'], ['#6b4a30', '#1d1714'], ['#2a2522', '#e8e0d0'], ['#a87a50', '#f1ece2'], ['#f1ece2', null]];
export const GOAT_VARIANTS = GOAT_COATS.length;
export const goatGeo = (i = 0) => cached('goat' + (i % GOAT_COATS.length), () => {
  const [c, c2] = GOAT_COATS[i % GOAT_COATS.length];
  return quad({ c, c2, len: 0.72, hgt: 0.62, wid: 0.3, leg: 0.03, head: 0.085, horns: 'goat', beard: true, tail: 'up', earDroop: 0.5 });
});
export const sheepGeo = (i = 0) => cached('sheep' + (i % 2), () => {
  const [c, c2] = i % 2 ? ['#e9e1d0', '#5b3a24'] : ['#f2ece0', '#1d1714'];
  return quad({ c, c2, len: 0.78, hgt: 0.66, wid: 0.36, leg: 0.032, head: 0.09, tail: 'down', tailLen: 0.3, earDroop: 0.15, wool: true, muzzle: c2 || c });
});
export const zebuGeo = (i = 0) => cached('zebu' + (i % 3), () => {
  // robe unie (zébu peul blanc, gris, ou roux), cou et bosse plus sombres
  const v = [['#ece6da', null, '#b5ada0'], ['#b9b3a8', null, '#6f6a62'], ['#9a5a34', null, '#6a3a20']][i % 3];
  return quad({ c: v[0], c2: v[1], humpC: v[2], neckC: v[2], len: 1.85, hgt: 1.45, wid: 0.72, leg: 0.065, head: 0.17, horns: 'lyre', hump: true, dewlap: true, tail: 'down', tailLen: 0.8, tuft: true, earDroop: 0.7, muzzle: '#3a3330', neck: 0.17 });
});
export const chickenGeo = (i = 0) => cached('chick' + (i % 3), () => {
  const v = [['#8a4a24', '#2a1a12'], ['#f1ece2', '#c9b89a'], ['#2a2522', '#c27a3a']][i % 3];
  const p = [];
  rig({ fab: 5, c2: v[1] });
  p.push(S(0.12, v[0], { y: 0.24, sx: 0.85, sy: 0.85, sz: 1.2 }, 1));
  p.push(S(0.1, v[1], { y: 0.36, z: -0.13, sx: 0.25, sy: 1.0, sz: 0.8, rx: -0.6 }));
  p.push(S(0.08, v[0], { y: 0.31, z: -0.06, sx: 0.9, sy: 0.7, sz: 0.9 }));
  rig({});
  for (const sd of [1, -1]) {
    p.push(L([sd * 0.04, 0.16, 0], [sd * 0.045, 0.02, 0.01], 0.012, 0.01, '#d9a23a', 4));
    p.push(B(0.05, 0.012, 0.07, '#d9a23a', { x: sd * 0.045, y: 0.01, z: 0.03 }));
  }
  rig({ p: 6, hy: 0.28, pz: 0.08, a: 1.0, ks: 6, fab: 5, c2: v[1] });
  p.push(L([0, 0.28, 0.08], [0, 0.38, 0.13], 0.045, 0.035, v[0], 6));
  p.push(S(0.05, v[0], { y: 0.4, z: 0.15 }));
  rig({ p: 6, hy: 0.28, pz: 0.08, a: 1.0, ks: 6 });
  p.push(K(0.017, 0.05, 4, '#e3a21a', { y: 0.395, z: 0.21, rx: PI / 2 }));
  p.push(B(0.015, 0.05, 0.06, '#c8322b', { y: 0.455, z: 0.15 }));
  p.push(S(0.018, '#c8322b', { y: 0.36, z: 0.18 }, 0));
  return merge(p);
});

/* ------------------------------------------------------------ échanges à la vitre */
// avant-bras de passager qui sort par la vitre (le long de +x), main ouverte
export const armGeo = (skin = SKINS[1], sleeve = '#2f78a8') => cached('arm' + skin + sleeve, () => {
  rig({});
  return merge([
    L([-0.25, 0, 0], [0.02, 0, 0], 0.058, 0.055, sleeve, 7),
    L([0.02, 0, 0], [0.26, 0.01, 0], 0.042, 0.035, skin, 7),
    S(0.048, skin, { x: 0.31, y: 0.01, sx: 1.3, sy: 0.6, sz: 1.0 }),
  ]);
});
// billet de banque CFA (dans la main du passager)
export const noteGeo = () => cached('note', () => { rig({}); return merge([B(0.14, 0.004, 0.07, '#5a8f5a', { x: 0.34, y: 0.04 }), B(0.05, 0.005, 0.05, '#e8d9a8', { x: 0.36, y: 0.042 })]); });
// marchandise tendue par la vendeuse : sachet d'eau, pain, bananes
export const itemGeo = (kind) => cached('item' + kind, () => {
  rig({});
  if (kind === 'bread') return merge([C(0.045, 0.05, 0.36, 7, '#d29a52', { rz: PI / 2 })]);
  if (kind === 'banana') return merge([C(0.03, 0.025, 0.2, 6, '#e7c63a', { rz: 1.2, x: -0.02 }), C(0.03, 0.025, 0.2, 6, '#d9b52c', { rz: 1.4, y: 0.03 }), C(0.03, 0.025, 0.2, 6, '#e7c63a', { rz: 1.8, x: 0.02 })]);
  if (kind === 'peanut') return merge([C(0.05, 0.06, 0.14, 8, '#f2efe6'), S(0.05, '#c99a5c', { y: 0.07, sy: 0.5 })]);
  return merge([B(0.12, 0.05, 0.17, '#e8f4fb'), B(0.124, 0.052, 0.02, '#2f78a8', { z: 0.05 })]);
});
export const VENDOR_GOODS = VENDOR_SPECS.map((v) => v.goods);

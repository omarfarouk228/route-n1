import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { goatGeo as charGoat, CHAR_MAT } from './characters.js';

// Tous les modèles sont construits en code : géométries low-poly colorées par sommet.
export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

const _c = new THREE.Color();
const PI = Math.PI;

function finish(geo, color) {
  if (geo.index) geo = geo.toNonIndexed();
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  if (color == null) color = '#ffffff';
  _c.set(color);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

function xf(geo, o = {}) {
  const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = o;
  geo.scale(sx, sy, sz);
  if (rx) geo.rotateX(rx);
  if (rz) geo.rotateZ(rz);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  return geo;
}

export const box = (w, h, d, c, o) => finish(xf(new THREE.BoxGeometry(w, h, d), o), c);
export const cyl = (rt, rb, h, seg, c, o) => finish(xf(new THREE.CylinderGeometry(rt, rb, h, seg), o), c);
export const cone = (r, h, seg, c, o) => finish(xf(new THREE.ConeGeometry(r, h, seg), o), c);
export const ico = (r, c, o) => finish(xf(new THREE.IcosahedronGeometry(r, 0), o), c);
export const dode = (r, c, o) => finish(xf(new THREE.DodecahedronGeometry(r, 0), o), c);

export function merge(list) {
  const g = mergeGeometries(list, false);
  g.computeBoundingSphere();
  return g;
}

function frond(angle, droop, len, top, c) {
  const g = new THREE.BoxGeometry(0.55, 0.05, len);
  g.translate(0, 0, len / 2);
  g.rotateX(droop);
  g.rotateY(angle);
  g.translate(top.x, top.y, top.z);
  return finish(g, c);
}

const SKIN = '#4a2e1f';

/* ---------------------------------------------------------------- végétation */
export function palm() {
  const top = { x: -0.43, y: 7.1, z: 0 };
  const p = [cyl(0.16, 0.26, 7.2, 6, '#8b6b47', { y: 3.6, rz: 0.12 })];
  for (let k = 0; k < 7; k++) p.push(frond((k * 2 * PI) / 7 + 0.3, 0.35 + (k % 2) * 0.25, 3.3, top, k % 2 ? '#3d8a36' : '#4f9c3e'));
  p.push(ico(0.22, '#6b4f2a', { x: top.x + 0.25, y: top.y - 0.3, z: 0.1 }));
  p.push(ico(0.22, '#6b4f2a', { x: top.x - 0.2, y: top.y - 0.35, z: -0.15 }));
  return merge(p);
}
export function mango() {
  return merge([
    cyl(0.25, 0.38, 2.4, 6, '#5e4430', { y: 1.2 }),
    ico(2.5, '#2f6a2b', { y: 3.9, sy: 0.78 }),
    ico(1.7, '#3b7a31', { x: 1.3, y: 3.4, z: 0.7 }),
    ico(1.5, '#2a6127', { x: -1.2, y: 3.5, z: -0.6 }),
  ]);
}
export function teak() {
  return merge([
    cyl(0.14, 0.22, 6.5, 5, '#7a6250', { y: 3.25 }),
    ico(1.4, '#5f8c36', { y: 6.6, sy: 1.2 }),
    ico(1.1, '#6d9a3e', { x: 0.6, y: 5.2 }),
    ico(1.0, '#577f31', { x: -0.5, y: 4.6, z: 0.3 }),
  ]);
}
export function baobab() {
  const b = '#8e8070';
  return merge([
    cyl(1.05, 1.6, 5, 8, b, { y: 2.5 }),
    box(0.4, 2.4, 0.4, b, { x: 0.9, y: 5.7, rz: -0.65 }),
    box(0.4, 2.2, 0.4, b, { x: -0.9, y: 5.6, rz: 0.65 }),
    box(0.35, 2.0, 0.35, b, { z: 0.8, y: 5.5, rx: 0.6 }),
    ico(1.2, '#7a8a3c', { x: 1.9, y: 6.8, sy: 0.55 }),
    ico(1.1, '#6e7f36', { x: -1.9, y: 6.6, sy: 0.55 }),
    ico(1.0, '#7a8a3c', { z: 1.7, y: 6.5, sy: 0.55 }),
  ]);
}
export function karite() {
  return merge([
    cyl(0.2, 0.32, 2.6, 5, '#5a4634', { y: 1.3 }),
    ico(2.3, '#6a7a30', { y: 3.4, sy: 0.5 }),
    ico(1.4, '#5d6e2b', { x: 1, y: 3.1, sy: 0.5 }),
  ]);
}
export function bush() {
  return merge([ico(1.1, '#4b7a2e', { y: 0.55, sy: 0.7 }), ico(0.8, '#5b8a35', { x: 0.7, y: 0.45, sy: 0.7 })]);
}
export function dry() {
  return merge([ico(1.0, '#9c8a4c', { y: 0.5, sy: 0.65 }), ico(0.7, '#8a7a40', { x: 0.6, y: 0.4, sy: 0.6 })]);
}
export function rock() {
  return merge([dode(1.3, '#8a7f74', { y: 0.5, sy: 0.75 }), dode(0.8, '#9a8f82', { x: 1.1, y: 0.3, sy: 0.7 })]);
}
export function termite() {
  return merge([
    cone(0.95, 3.2, 6, '#a65a32', { y: 1.6 }),
    cone(0.45, 1.6, 5, '#a65a32', { x: 0.6, y: 1.9 }),
    cone(0.35, 1.2, 5, '#9c5230', { x: -0.5, y: 1.5, z: 0.3 }),
  ]);
}

/* ---------------------------------------------------------------- bâti */
export function houseA() {
  return merge([
    box(5, 2.6, 4, '#d8c6a2', { y: 1.3 }),
    box(5.04, 0.35, 4.04, '#8a6d55', { y: 0.17 }),
    box(5.6, 0.1, 4.7, '#9aa0a6', { y: 2.75, rx: 0.08 }),
    box(1, 1.9, 0.06, '#6a3f22', { y: 0.95, z: 2.01 }),
    box(1, 0.8, 0.06, '#2f4f6f', { x: 1.5, y: 1.5, z: 2.01 }),
    box(1, 0.8, 0.06, '#2f4f6f', { x: -1.5, y: 1.5, z: 2.01 }),
  ]);
}
export function houseB() {
  return merge([
    box(4.4, 2.5, 3.6, '#e5a274', { y: 1.25 }),
    box(4.44, 0.3, 3.64, '#7b5a45', { y: 0.15 }),
    box(4.9, 0.1, 4.4, '#9b5a3a', { y: 2.62, rx: -0.1 }),
    box(1, 1.9, 0.06, '#2f5f9f', { x: -0.8, y: 0.95, z: 1.81 }),
    box(0.9, 0.8, 0.06, '#2f5f9f', { x: 1.1, y: 1.5, z: 1.81 }),
    box(0.12, 2.3, 0.12, '#6a4a2e', { x: 2.1, y: 1.15, z: 2.5 }),
    box(0.12, 2.3, 0.12, '#6a4a2e', { x: -2.1, y: 1.15, z: 2.5 }),
    box(4.6, 0.08, 1.2, '#a7aaae', { y: 2.3, z: 2.4, rx: 0.12 }),
  ]);
}
export function houseC() {
  return merge([
    box(5.4, 2.8, 4.2, '#efe7d6', { y: 1.4 }),
    box(5.44, 0.6, 4.24, '#2f78a8', { y: 0.45 }),
    box(5.6, 0.35, 4.4, '#e2d8c2', { y: 2.95 }),
    box(1.1, 2, 0.06, '#6b4a2e', { y: 1, z: 2.11 }),
    box(1.1, 0.8, 0.06, '#203a52', { x: 1.7, y: 1.7, z: 2.11 }),
    box(1.1, 0.8, 0.06, '#203a52', { x: -1.7, y: 1.7, z: 2.11 }),
  ]);
}
export function hut() {
  return merge([
    cyl(1.8, 1.9, 2.2, 9, '#a8653c', { y: 1.1 }),
    cone(2.5, 2.1, 9, '#c7a35a', { y: 3.2 }),
    box(0.7, 1.4, 0.1, '#3a2618', { y: 0.7, z: 1.82 }),
  ]);
}
export function stall() {
  const w = '#6a4a2e';
  return merge([
    box(0.1, 2.2, 0.1, w, { x: 1.1, y: 1.1, z: 0.75 }),
    box(0.1, 2.2, 0.1, w, { x: -1.1, y: 1.1, z: 0.75 }),
    box(0.1, 2.2, 0.1, w, { x: 1.1, y: 1.1, z: -0.75 }),
    box(0.1, 2.2, 0.1, w, { x: -1.1, y: 1.1, z: -0.75 }),
    box(2.6, 0.08, 1.9, '#8a96a0', { y: 2.24 }),
    box(2.1, 0.08, 1.1, '#8a6a45', { y: 0.9 }),
    ico(0.2, '#e3a21a', { x: -0.6, y: 1.08 }),
    ico(0.2, '#d2452a', { x: -0.1, y: 1.08 }),
    ico(0.2, '#62a12e', { x: 0.4, y: 1.08 }),
    box(0.4, 0.25, 0.3, '#e9d9b0', { x: 0.85, y: 1.06 }),
  ]);
}
export function fuelStand() {
  const w = '#7a5a3a';
  const p = [
    box(1.6, 0.08, 0.7, w, { y: 0.85 }),
    box(0.08, 0.85, 0.08, w, { x: 0.7, y: 0.42, z: 0.28 }),
    box(0.08, 0.85, 0.08, w, { x: -0.7, y: 0.42, z: 0.28 }),
    box(0.08, 0.85, 0.08, w, { x: 0.7, y: 0.42, z: -0.28 }),
    box(0.08, 0.85, 0.08, w, { x: -0.7, y: 0.42, z: -0.28 }),
    box(0.4, 0.55, 0.28, '#d7b52a', { x: 1.2, y: 0.27 }),
    cyl(0.03, 0.03, 2.4, 4, '#dddddd', { x: -1, y: 1.2 }),
    cone(1.4, 0.5, 8, '#d03a2f', { x: -1, y: 2.45 }),
  ];
  for (let k = 0; k < 6; k++) {
    p.push(cyl(0.07, 0.07, 0.42, 5, '#e8a417', { x: -0.6 + k * 0.24, y: 1.1 }));
    p.push(cyl(0.03, 0.03, 0.08, 4, '#2a2a2a', { x: -0.6 + k * 0.24, y: 1.35 }));
  }
  return merge(p);
}
export function pole() {
  return merge([box(0.18, 8, 0.18, '#6b5a45', { y: 4 }), box(1.6, 0.1, 0.1, '#5a4a38', { y: 7.5 })]);
}
export function shelter() {
  const w = '#5b4a3a';
  return merge([
    box(0.15, 2.8, 0.15, w, { x: 3.5, y: 1.4, z: 1.4 }),
    box(0.15, 2.8, 0.15, w, { x: -3.5, y: 1.4, z: 1.4 }),
    box(0.15, 2.8, 0.15, w, { x: 3.5, y: 1.4, z: -1.4 }),
    box(0.15, 2.8, 0.15, w, { x: -3.5, y: 1.4, z: -1.4 }),
    box(7.6, 0.1, 3.4, '#a3a7ab', { y: 2.85, rx: 0.06 }),
    box(6, 0.1, 0.5, '#7a5a3a', { y: 0.5, z: -0.9 }),
  ]);
}

/* ---------------------------------------------------------------- personnages (voir characters.js) */
const sph = (r, c, o) => finish(xf(new THREE.IcosahedronGeometry(r, 1), o), c);
export { personGeo as person, PEOPLE_VARIANTS, VENDOR_SPECS, vendorGeo } from './characters.js';

/* ---------------------------------------------------------------- flore régionale */
export const coco = palm;
export function oilpalm() {
  const top = { x: 0, y: 4.6, z: 0 };
  const p = [cyl(0.32, 0.38, 4.6, 7, '#5f4a34', { y: 2.3 })];
  for (let k = 0; k < 4; k++) p.push(cyl(0.36, 0.36, 0.14, 7, '#4a3a28', { y: 1 + k * 0.9 }));
  for (let k = 0; k < 14; k++) p.push(frond((k * 2 * PI) / 14, k % 2 ? 0.15 : 0.55, 3.6, top, k % 3 ? '#2f6b2a' : '#3d7d30'));
  p.push(ico(0.35, '#a0401a', { x: 0.3, y: 4.3, z: 0.2 }));
  return merge(p);
}
export function banana() {
  const p = [cyl(0.12, 0.16, 2.2, 6, '#6f8a3a', { y: 1.1 })];
  for (let k = 0; k < 7; k++) {
    const g = new THREE.BoxGeometry(0.55, 0.03, 1.9);
    g.translate(0, 0, 0.95); g.rotateX(-0.5 + (k % 3) * 0.25); g.rotateY((k * 2 * PI) / 7); g.translate(0, 2.2, 0);
    p.push(finish(g, k % 2 ? '#5fa83a' : '#4b9a30'));
  }
  return merge(p);
}
export function fromager() {
  const b = '#9a9488';
  const p = [cyl(1.1, 1.8, 14, 8, b, { y: 7 })];
  for (let k = 0; k < 5; k++) p.push(box(0.25, 2.4, 1.8, b, { y: 1.2, ry: (k * 2 * PI) / 5, x: Math.sin((k * 2 * PI) / 5) * 1.3, z: Math.cos((k * 2 * PI) / 5) * 1.3 }));
  p.push(box(0.5, 0.5, 7, b, { y: 13, rx: 0.1 }));
  p.push(box(7, 0.5, 0.5, b, { y: 12.5 }));
  p.push(ico(4.2, '#3f7a2e', { y: 15.5, sy: 0.38, sx: 1.4 }));
  p.push(ico(3, '#4a8a35', { x: 3, y: 13.8, sy: 0.4 }));
  p.push(ico(3, '#386e29', { x: -3, y: 14, z: 1, sy: 0.4 }));
  return merge(p);
}
export function neem() {
  return merge([
    cyl(0.18, 0.28, 2.6, 6, '#5a4a3a', { y: 1.3 }),
    ico(2.1, '#2c5a26', { y: 3.9, sy: 0.85 }),
    ico(1.5, '#336a2b', { x: 1.1, y: 3.4, z: 0.5 }),
    ico(1.4, '#284f22', { x: -1, y: 3.6, z: -0.6 }),
  ]);
}
export function ronier() {
  const p = [
    cyl(0.28, 0.32, 5, 7, '#6a6258', { y: 2.5 }),
    cyl(0.42, 0.28, 3, 7, '#6a6258', { y: 6.5 }),
    cyl(0.25, 0.42, 4, 7, '#6a6258', { y: 10 }),
  ];
  for (let k = 0; k < 12; k++) {
    const a = (k * 2 * PI) / 12;
    const g = new THREE.CircleGeometry(1.15, 7, -0.9, 1.8);
    g.rotateX(-PI / 2 + 0.6); g.translate(0, 0, 1.4); g.rotateY(a); g.translate(0, 12.1, 0);
    p.push(finish(g, k % 2 ? '#5c7a34' : '#6f8a3c'));
  }
  return merge(p);
}

/* ---------------------------------------------------------------- herbes et cultures */
function tuftGeo(c1, c2, h = 0.6) {
  return merge([
    cone(0.18, h, 4, c1, { x: 0, y: h / 2, rz: 0.15 }),
    cone(0.15, h * 0.8, 4, c2, { x: 0.18, y: h * 0.4, rz: -0.3 }),
    cone(0.15, h * 0.9, 4, c1, { x: -0.16, y: h * 0.45, z: 0.1, rx: 0.3 }),
  ]);
}
export const grassG = () => tuftGeo('#5d8f34', '#6fa03c', 0.55);
export const grassD = () => tuftGeo('#c2a660', '#a88e4c', 0.6);
export function tallGrass() {
  const p = [];
  for (let k = 0; k < 6; k++) p.push(cone(0.12, 1.8 + (k % 3) * 0.4, 3, k % 2 ? '#c9ae66' : '#b4954e', { x: Math.sin(k * 1.7) * 0.35, y: 0.95 + (k % 3) * 0.2, z: Math.cos(k * 2.3) * 0.35, rz: (k % 3 - 1) * 0.15 }));
  return merge(p);
}
// rangées de culture : 4 m de rang par instance
export function maizeRow() {
  const p = [];
  for (let k = 0; k < 3; k++) {
    const z = -1.35 + k * 1.35;
    p.push(cyl(0.03, 0.04, 1.9, 3, '#7a9a3a', { y: 0.95, z }));
    p.push(box(1.0, 0.02, 0.14, '#6f9a34', { y: 1.25, z, ry: k * 1.3, rz: 0.25 }));
    p.push(cone(0.07, 0.35, 3, '#d9c06a', { y: 2.05, z }));
  }
  return merge(p);
}
export function milletRow() {
  const p = [];
  for (let k = 0; k < 4; k++) {
    const z = -1.5 + k;
    p.push(cyl(0.025, 0.035, 2.4, 3, '#b8a060', { y: 1.2, z, rz: (k % 2 - 0.5) * 0.08 }));
    p.push(cyl(0.07, 0.05, 0.4, 4, '#8a5a2e', { y: 2.5, z }));
  }
  return merge(p);
}
export function cassavaRow() {
  const p = [];
  for (let k = 0; k < 3; k++) {
    const z = -1.3 + k * 1.3;
    p.push(cyl(0.03, 0.04, 1.3, 4, '#8a6a5a', { y: 0.65, z }));
    p.push(ico(0.5, '#3f7a2e', { y: 1.35, z, sy: 0.5 }));
  }
  return merge(p);
}
export function yamRow() {
  const p = [];
  for (let k = 0; k < 4; k++) {
    const z = -1.5 + k;
    p.push(cone(0.45, 0.55, 6, '#7a4a2e', { y: 0.27, z }));
    p.push(cyl(0.015, 0.015, 1.5, 3, '#8a7a5a', { y: 1.0, z }));
    p.push(ico(0.18, '#4f8a34', { y: 1.6, z, sy: 0.7 }));
  }
  return merge(p);
}

/* ---------------------------------------------------------------- bâti régional */
export function compound() {
  // concession du nord : mur bas en banco, cases rondes, grenier
  const mud = '#a8653c', thatch = '#c7a35a';
  const p = [];
  const R = 7;
  for (let k = 0; k < 18; k++) {
    if (k === 0) continue; // entrée
    const a = (k * 2 * PI) / 18;
    p.push(box(2.5, 1.3, 0.35, mud, { x: Math.sin(a) * R, y: 0.65, z: Math.cos(a) * R, ry: a }));
  }
  const huts = [[-3, -2.5], [3, -2.8], [-3.8, 2.2], [0.5, -4.2]];
  huts.forEach(([x, z], i) => {
    const r = i === 3 ? 1.3 : 1.7;
    p.push(cyl(r, r + 0.08, 2.1, 9, i % 2 ? '#b0703f' : mud, { x, y: 1.05, z }));
    p.push(cone(r + 0.7, 2.0, 9, thatch, { x, y: 3.05, z }));
    p.push(box(0.6, 1.3, 0.1, '#3a2618', { x, y: 0.65, z: z + r }));
  });
  // grenier sur pilotis
  for (const [x, z] of [[2.2, 1.8], [3.0, 1.8], [2.2, 2.6], [3.0, 2.6]]) p.push(cyl(0.08, 0.08, 1, 4, '#5a4632', { x, y: 0.5, z }));
  p.push(cyl(1.0, 0.8, 1.5, 8, '#9a5e38', { x: 2.6, y: 1.75, z: 2.2 }));
  p.push(cone(1.4, 1.3, 8, thatch, { x: 2.6, y: 3.1, z: 2.2 }));
  return merge(p);
}
export function granary() {
  const p = [];
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) p.push(cyl(0.08, 0.08, 1, 4, '#5a4632', { x, y: 0.5, z }));
  p.push(cyl(1.0, 0.8, 1.5, 8, '#9a5e38', { y: 1.75 }));
  p.push(cone(1.4, 1.3, 8, '#c7a35a', { y: 3.1 }));
  return merge(p);
}
export function building2(wall = '#e8d9b8', trim = '#2f78a8') {
  const p = [
    box(9, 6.2, 6, wall, { y: 3.1 }),
    box(9.3, 0.25, 7.6, '#d8cdb5', { y: 3.15, z: 0.8 }),
    box(9.4, 0.5, 6.3, '#d8cdb5', { y: 6.45 }),
  ];
  for (let k = 0; k < 3; k++) {
    p.push(box(2.2, 2.4, 0.08, k === 1 ? '#c8322b' : trim, { x: -3 + k * 3, y: 1.3, z: 3.02 }));
    p.push(box(1.3, 1.3, 0.08, '#24384a', { x: -3 + k * 3, y: 4.7, z: 3.02 }));
  }
  for (let k = 0; k < 9; k++) p.push(box(0.06, 0.9, 0.06, '#3a3a3a', { x: -4.4 + k * 1.1, y: 3.7, z: 4.5 }));
  p.push(box(9.1, 0.06, 0.06, '#3a3a3a', { y: 4.15, z: 4.5 }));
  for (const x of [-4.4, 4.4]) p.push(box(0.3, 3, 0.3, '#d8cdb5', { x, y: 1.5, z: 4.4 }));
  return merge(p);
}
export function church() {
  const p = [
    box(7, 5, 12, '#f2ece0', { y: 2.5 }),
    box(4.2, 0.2, 12.6, '#9b3a2e', { x: -1.7, y: 5.8, rz: 0.6 }),
    box(4.2, 0.2, 12.6, '#9b3a2e', { x: 1.7, y: 5.8, rz: -0.6 }),
    box(3, 10, 3, '#f2ece0', { y: 5, z: 7 }),
    cone(2.2, 3, 4, '#9b3a2e', { y: 11.5, z: 7, ry: PI / 4 }),
    box(0.25, 1.8, 0.25, '#f4c430', { y: 13.8, z: 7 }),
    box(1.1, 0.25, 0.25, '#f4c430', { y: 14.1, z: 7 }),
    box(1.4, 2.8, 0.1, '#6a3f22', { y: 1.4, z: 8.52 }),
  ];
  for (let k = 0; k < 4; k++) for (const x of [-3.52, 3.52]) p.push(box(0.08, 1.8, 0.9, '#2f78a8', { x, y: 2.8, z: -4 + k * 2.6 }));
  return merge(p);
}
export function mosque() {
  const W = '#f1e8d2', G = '#1f7a4f';
  const p = [
    box(10, 4.2, 10, W, { y: 2.1 }),
    box(10.3, 0.4, 10.3, G, { y: 4.3 }),
    sph(3.2, '#e9e2cf', { y: 4.5, sy: 0.85 }),
    cyl(0.06, 0.06, 1.2, 4, '#f4c430', { y: 7.6 }),
    cyl(0.9, 1.1, 14, 8, W, { x: 5.6, y: 7, z: 5.6 }),
    cyl(1.3, 1.3, 0.4, 8, G, { x: 5.6, y: 11.5, z: 5.6 }),
    sph(0.9, G, { x: 5.6, y: 14.2, z: 5.6, sy: 1.1 }),
    box(2.2, 3, 0.1, G, { y: 1.5, z: 5.02 }),
  ];
  for (let k = 0; k < 3; k++) p.push(box(1, 1.8, 0.1, '#24384a', { x: -3.4 + k * 3.4, y: 2.6, z: 5.02 }));
  return merge(p);
}
export function school() {
  const p = [
    box(16, 3.2, 6, '#efe0b8', { y: 1.6 }),
    box(16.6, 0.15, 8, '#9aa0a6', { y: 3.35, z: 0.8, rx: 0.06 }),
    box(16.1, 0.8, 6.1, '#c8322b', { y: 0.4 }),
  ];
  for (let k = 0; k < 5; k++) p.push(box(1.6, 1.2, 0.08, '#24384a', { x: -6 + k * 3, y: 1.9, z: 3.02 }));
  for (let k = 0; k < 6; k++) p.push(box(0.25, 3, 0.25, '#efe0b8', { x: -7.5 + k * 3, y: 1.5, z: 4.6 }));
  return merge(p);
}
export function kiosk(c = '#2f78a8') {
  return merge([
    box(2.6, 2.4, 2.2, c, { y: 1.2 }),
    box(3, 0.12, 2.8, '#9aa0a6', { y: 2.5, z: 0.2 }),
    box(2.2, 1, 0.1, '#1b1a17', { y: 1.3, z: 1.11 }),
    box(2.4, 0.08, 0.6, '#d8cdb5', { y: 0.95, z: 1.35 }),
  ]);
}
export function fuelStation() {
  const p = [
    box(14, 0.6, 9, '#f4f0e0', { y: 5.3 }),
    box(14.05, 0.3, 9.05, '#c8322b', { y: 5.0 }),
    box(9, 3.4, 5, '#f4f0e0', { y: 1.7, z: -9 }),
    box(9.05, 0.6, 5.05, '#c8322b', { y: 3.1, z: -9 }),
  ];
  for (const [x, z] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) p.push(box(0.4, 5, 0.4, '#d8d8d8', { x, y: 2.5, z }));
  for (const x of [-2.5, 2.5]) {
    p.push(box(0.9, 0.3, 2.4, '#9aa0a6', { x, y: 0.15 }));
    p.push(box(0.6, 1.7, 0.9, '#c8322b', { x, y: 1.15 }));
    p.push(box(0.5, 0.5, 0.92, '#f4f0e0', { x, y: 1.6 }));
  }
  return merge(p);
}
export function tower() {
  const p = [];
  for (let k = 0; k < 8; k++) {
    const w = 2.2 - k * 0.22;
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(box(0.12, 4.2, 0.12, k % 2 ? '#f4f0e0' : '#d03a2f', { x: (x * w) / 2, y: 2.1 + k * 4, z: (z * w) / 2 }));
    p.push(box(w, 0.08, 0.08, '#9aa0a6', { y: k * 4 + 2, z: w / 2 }));
    p.push(box(0.08, 0.08, w, '#9aa0a6', { y: k * 4 + 2, x: w / 2 }));
  }
  p.push(cyl(0.6, 0.6, 0.2, 10, '#e8e8e8', { y: 30, z: 0.5, rx: PI / 2 }));
  p.push(box(0.4, 1.4, 0.2, '#e8e8e8', { y: 28.5, x: 0.5 }));
  return merge(p);
}
export function flagpole() {
  return merge([cyl(0.05, 0.07, 7, 5, '#cfcfcf', { y: 3.5 }), box(0.6, 0.3, 0.6, '#9aa0a6', { y: 0.15 })]);
}

/* ---------------------------------------------------------------- bord de route */
export function yamPile() {
  const p = [box(1.4, 0.06, 1, '#7a5a3a', { y: 0.03 })];
  const pos = [[-0.4, -0.2], [0, -0.2], [0.4, -0.2], [-0.2, 0.2], [0.2, 0.2], [-0.2, -0.05], [0.2, -0.05], [0, 0.1]];
  pos.forEach(([x, z], k) => p.push(cyl(0.11, 0.08, 0.55, 6, k % 2 ? '#8a6a48' : '#7a5a3c', { x, y: 0.12 + (k > 4 ? 0.18 : 0), z, rz: PI / 2, ry: k * 0.3 })));
  return merge(p);
}
export function charcoal() {
  const p = [];
  for (let k = 0; k < 5; k++) {
    p.push(cyl(0.28, 0.3, 0.9, 7, '#eceae4', { x: -1 + k * 0.5, y: 0.45 }));
    p.push(sph(0.26, '#1c1b1a', { x: -1 + k * 0.5, y: 0.95, sy: 0.5 }));
  }
  return merge(p);
}
export function firewood() {
  const p = [];
  for (let k = 0; k < 9; k++) p.push(cyl(0.06, 0.06, 1.6, 4, k % 2 ? '#6a4a30' : '#7a5a3c', { x: -0.3 + (k % 3) * 0.2, y: 0.08 + Math.floor(k / 3) * 0.12, rx: PI / 2 }));
  p.push(box(0.04, 0.5, 0.04, '#5a4632', { x: -0.45, y: 0.25 }));
  p.push(box(0.04, 0.5, 0.04, '#5a4632', { x: 0.45, y: 0.25 }));
  return merge(p);
}
export function basins() {
  const p = [box(1.6, 0.6, 0.8, '#7a5a3a', { y: 0.3 })];
  const goods = ['#d24a2a', '#e3a21a', '#62a12e'];
  for (let k = 0; k < 3; k++) {
    p.push(cyl(0.3, 0.2, 0.15, 10, '#c9ced3', { x: -0.5 + k * 0.5, y: 0.68 }));
    p.push(sph(0.2, goods[k], { x: -0.5 + k * 0.5, y: 0.76, sy: 0.5 }));
  }
  p.push(cyl(0.03, 0.03, 2.2, 4, '#dddddd', { x: 0.75, y: 1.1 }));
  p.push(cone(1.1, 0.4, 8, '#2f78a8', { x: 0.75, y: 2.2 }));
  return merge(p);
}
export function motoParked() {
  return merge([
    box(0.22, 0.45, 1.5, '#262626', { y: 0.6 }),
    box(0.3, 0.12, 0.7, '#111', { y: 0.88, z: -0.15 }),
    cyl(0.3, 0.3, 0.12, 8, '#1a1a1a', { rz: PI / 2, y: 0.3, z: 0.62 }),
    cyl(0.3, 0.3, 0.12, 8, '#1a1a1a', { rz: PI / 2, y: 0.3, z: -0.62 }),
    box(0.7, 0.05, 0.05, '#888', { y: 1.05, z: 0.55 }),
    box(0.25, 0.25, 0.08, '#c8322b', { y: 0.7, z: 0.78 }),
  ]);
}
export function cloud() {
  const blob = (r, x, y, z, sy = 0.62) => finish(xf(new THREE.IcosahedronGeometry(r, 1), { x, y, z, sy }), '#ffffff');
  return merge([
    blob(16, 0, 0, 0), blob(12, 15, -2, 3), blob(13, -14, -2.5, -2), blob(10, 5, 5, -5, 0.7),
    blob(9, -6, 4, 6, 0.7), blob(8, 24, -4, -2), blob(8, -23, -4, 3),
  ]);
}

/* ---------------------------------------------------------------- véhicules */
function wheelGeo(r = 0.36, w = 0.26) {
  return merge([cyl(r, r, w, 10, '#1d1d1d', { rz: PI / 2 }), cyl(r * 0.48, r * 0.48, w + 0.02, 6, '#b9b9b9', { rz: PI / 2 })]);
}

function taxiBodyParts() {
  const BODY = '#e9b53a', GLASS = '#26343f';
  return [
    box(1.8, 0.62, 4.6, BODY, { y: 0.75 }),
    box(1.66, 0.72, 2.95, BODY, { y: 1.42, z: -0.45 }),
    box(1.69, 0.46, 2.6, GLASS, { y: 1.47, z: -0.5 }),
    box(1.5, 0.5, 0.06, GLASS, { y: 1.44, z: 1.02, rx: -0.35 }),
    box(1.5, 0.45, 0.06, GLASS, { y: 1.47, z: -1.94 }),
    box(1.82, 0.12, 4.62, '#1f7a3a', { y: 0.86 }),
    box(1.82, 0.06, 4.62, '#d03a2f', { y: 0.95 }),
    box(1.86, 0.18, 0.15, '#cfcfcf', { y: 0.5, z: 2.33 }),
    box(1.86, 0.18, 0.15, '#cfcfcf', { y: 0.5, z: -2.33 }),
    box(1.2, 0.28, 0.05, '#222222', { y: 0.78, z: 2.31 }),
    box(0.32, 0.17, 0.05, '#fff6c8', { x: 0.62, y: 0.8, z: 2.31 }),
    box(0.32, 0.17, 0.05, '#fff6c8', { x: -0.62, y: 0.8, z: 2.31 }),
    box(0.26, 0.16, 0.05, '#c0261a', { x: 0.66, y: 0.85, z: -2.31 }),
    box(0.26, 0.16, 0.05, '#c0261a', { x: -0.66, y: 0.85, z: -2.31 }),
    box(0.06, 0.06, 2.7, '#2a2a2a', { x: 0.76, y: 1.84, z: -0.45 }),
    box(0.06, 0.06, 2.7, '#2a2a2a', { x: -0.76, y: 1.84, z: -0.45 }),
    box(1.56, 0.06, 0.06, '#2a2a2a', { y: 1.84, z: -1.7 }),
    box(1.56, 0.06, 0.06, '#2a2a2a', { y: 1.84, z: -0.45 }),
    box(1.56, 0.06, 0.06, '#2a2a2a', { y: 1.84, z: 0.8 }),
    box(0.5, 0.18, 0.06, '#f4f0e0', { y: 1.92, z: 0.95 }),
  ];
}

const WHEEL_POS = [[0.86, 0.36, 1.45], [-0.86, 0.36, 1.45], [0.86, 0.36, -1.45], [-0.86, 0.36, -1.45]];

const BAG_SLOTS = [[-0.4, -1.4], [0.4, -1.4], [-0.4, -0.45], [0.4, -0.45], [-0.4, 0.5], [0.4, 0.5]];
const BAG_COLORS = ['#3a6ea5', '#d03a2f', '#e9d9b0', '#7b3f99', '#0f7a4a', '#c87a2a'];

const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
export const GLASS_MAT = new THREE.MeshPhongMaterial({ color: '#1b2730', specular: '#a8b8c8', shininess: 110, transparent: true, opacity: 0.62 });

function textTexture(text, { w = 512, h = 72, bg = null, fg = '#ffffff', stroke = '#1b1a17', font = 'Archivo Black' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  let size = Math.floor(h * 0.72);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  do { g.font = `${size}px "${font}", "Arial Black", Arial, sans-serif`; size -= 2; } while (g.measureText(text).width > w - 24 && size > 10);
  if (stroke) { g.lineWidth = Math.max(3, size * 0.14); g.strokeStyle = stroke; g.strokeText(text, w / 2, h / 2 + 2); }
  g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function plateTexture(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 56;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, 256, 56);
  g.strokeStyle = '#1b1a17'; g.lineWidth = 4; g.strokeRect(3, 3, 250, 50);
  // petit drapeau du Togo
  for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#ffce00' : '#006a4e'; g.fillRect(10, 10 + k * 7, 26, 7); }
  g.fillStyle = '#d21034'; g.fillRect(10, 10, 12, 14);
  g.fillStyle = '#1b1a17'; g.font = 'bold 34px "Archivo", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 146, 30);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Définitions des carrosseries : pièces colorées, vitres, roues, galerie, places
function vehicleDef(model, o) {
  const B = o.body, D = shade(B, 0.62), CH = '#cfd2d6', BLK = '#1b1a18';
  const P = [], G = [];
  const both = (fn) => { fn(1); fn(-1); };
  if (model === 'minibus') {
    P.push(box(2.0, 1.75, 5.2, B, { y: 1.42 }));
    P.push(box(1.96, 0.62, 0.5, B, { y: 0.86, z: 2.62 }));
    P.push(box(2.04, 0.12, 5.1, BLK, { y: 0.5 }));
    G.push(box(2.03, 0.62, 4.0, null, { y: 1.86, z: -0.35 }));
    G.push(box(1.84, 0.82, 0.06, null, { y: 1.82, z: 2.62, rx: -0.12 }));
    G.push(box(1.7, 0.6, 0.06, null, { y: 1.85, z: -2.61 }));
    P.push(box(2.02, 0.1, 5.22, BLK, { y: 1.52 }));
    if (o.s1) { P.push(box(2.03, 0.18, 5.22, o.s1, { y: 1.1 })); P.push(box(2.03, 0.08, 5.22, o.s2, { y: 1.24 })); }
    both((x) => P.push(box(0.02, 1.2, 0.03, D, { x: x * 1.005, y: 1.25, z: 0.6 })));
    P.push(box(1.9, 0.2, 0.16, CH, { y: 0.56, z: 2.88 }));
    P.push(box(2.0, 0.2, 0.16, CH, { y: 0.56, z: -2.62 }));
    P.push(box(1.1, 0.3, 0.05, '#222', { y: 0.85, z: 2.88 }));
    both((x) => { P.push(cyl(0.12, 0.12, 0.05, 10, '#fff6c8', { x: x * 0.7, y: 0.92, z: 2.88, rx: PI / 2 })); P.push(box(0.12, 0.08, 0.05, '#f08a24', { x: x * 0.88, y: 0.72, z: 2.88 })); });
    both((x) => P.push(box(0.22, 0.3, 0.05, '#c0261a', { x: x * 0.82, y: 1.0, z: -2.62 })));
    both((x) => { P.push(box(0.2, 0.26, 0.06, D, { x: x * 1.14, y: 1.62, z: 2.35 })); P.push(box(0.12, 0.03, 0.03, BLK, { x: x * 1.04, y: 1.62, z: 2.35 })); });
    return { P, G, wheels: [[0.92, 0.4, 1.75], [-0.92, 0.4, 1.75], [0.92, 0.4, -1.75], [-0.92, 0.4, -1.75]], wr: 0.4, rackY: 2.31, rackLen: 4.2, rackZ: -0.3, rackW: 1.8,
      slots: [[-0.45, -1.8], [0.45, -1.8], [-0.45, -0.75], [0.45, -0.75], [-0.45, 0.3], [0.45, 0.3], [-0.45, 1.35], [0.45, 1.35]],
      seats: [[0.45, 1.75, 1.7], [-0.45, 1.75, 1.7], [0.55, 1.75, 0.6], [0, 1.75, 0.6], [-0.55, 1.75, 0.6], [0.55, 1.75, -0.4], [0, 1.75, -0.4], [-0.55, 1.75, -0.4], [0.55, 1.75, -1.4], [0, 1.75, -1.4], [-0.55, 1.75, -1.4], [0.5, 1.75, -2.2], [-0.5, 1.75, -2.2]],
      rear: { y: 1.85, z: -2.65, w: 1.6, h: 0.42 }, front: { y: 2.12, z: 2.66, w: 1.7, h: 0.18, rx: -0.12 }, plateZ: -2.71, plateY: 0.75, ladderZ: -2.66, exhaust: -2.6, len: 5.2 };
  }
  if (model === 'berline') {
    P.push(box(1.78, 0.58, 4.4, B, { y: 0.7 }));
    P.push(box(1.72, 0.12, 1.25, B, { y: 1.02, z: 1.5, rx: 0.07 }));
    P.push(box(1.72, 0.1, 0.95, B, { y: 1.02, z: -1.7, rx: -0.05 }));
    P.push(box(1.58, 0.6, 2.15, B, { y: 1.27, z: -0.2 }));
    P.push(box(1.54, 0.06, 2.0, B, { y: 1.6, z: -0.25 }));
    P.push(box(1.82, 0.1, 4.2, BLK, { y: 0.44 }));
    G.push(box(1.61, 0.42, 1.9, null, { y: 1.3, z: -0.22 }));
    G.push(box(1.48, 0.5, 0.06, null, { y: 1.27, z: 0.95, rx: -0.55 }));
    G.push(box(1.44, 0.44, 0.06, null, { y: 1.28, z: -1.36, rx: 0.5 }));
    if (o.s1) { P.push(box(1.8, 0.1, 4.42, o.s1, { y: 0.8 })); P.push(box(1.8, 0.05, 4.42, o.s2, { y: 0.88 })); }
    both((x) => { P.push(box(0.02, 0.5, 0.03, D, { x: x * 0.895, y: 0.78, z: -0.2 })); P.push(box(0.02, 0.04, 0.14, CH, { x: x * 0.9, y: 0.92, z: 0.4 })); P.push(box(0.02, 0.04, 0.14, CH, { x: x * 0.9, y: 0.92, z: -0.75 })); });
    P.push(box(1.82, 0.17, 0.14, CH, { y: 0.48, z: 2.22 }));
    P.push(box(1.82, 0.17, 0.14, CH, { y: 0.48, z: -2.22 }));
    P.push(box(1.0, 0.24, 0.05, '#222', { y: 0.74, z: 2.21 }));
    both((x) => { P.push(box(0.36, 0.15, 0.05, '#fff6c8', { x: x * 0.6, y: 0.78, z: 2.21 })); P.push(box(0.32, 0.15, 0.05, '#c0261a', { x: x * 0.62, y: 0.82, z: -2.21 })); });
    both((x) => P.push(box(0.16, 0.11, 0.06, B, { x: x * 0.95, y: 1.1, z: 0.75 })));
    P.push(box(0.62, 0.2, 0.26, '#f4c430', { y: 1.72, z: -0.2 }));
    P.push(box(0.64, 0.05, 0.28, BLK, { y: 1.61, z: -0.2 }));
    return { P, G, wheels: [[0.84, 0.34, 1.38], [-0.84, 0.34, 1.38], [0.84, 0.34, -1.38], [-0.84, 0.34, -1.38]], wr: 0.34, rackY: 1.64, rackLen: 1.4, rackZ: -0.85, rackW: 1.4,
      slots: [[-0.35, -0.85], [0.35, -0.85]],
      seats: [[0.38, 1.3, 0.2], [-0.38, 1.3, 0.2], [0.42, 1.3, -0.75], [0, 1.3, -0.75], [-0.42, 1.3, -0.75]],
      rear: { y: 1.28, z: -1.4, w: 1.3, h: 0.3, rx: 0.5 }, front: null, plateZ: -2.29, plateY: 0.66, ladderZ: null, exhaust: -2.2, len: 4.4 };
  }
  // break (taxi-brousse classique)
  P.push(box(1.8, 0.6, 4.6, B, { y: 0.74 }));
  P.push(box(1.74, 0.12, 1.25, B, { y: 1.07, z: 1.65, rx: 0.06 }));
  P.push(box(1.64, 0.7, 2.95, B, { y: 1.4, z: -0.45 }));
  P.push(box(1.6, 0.07, 2.9, B, { y: 1.78, z: -0.45 }));
  P.push(box(1.84, 0.1, 4.4, BLK, { y: 0.45 }));
  G.push(box(1.67, 0.46, 2.55, null, { y: 1.46, z: -0.52 }));
  G.push(box(1.5, 0.5, 0.06, null, { y: 1.44, z: 1.02, rx: -0.35 }));
  G.push(box(1.5, 0.45, 0.06, null, { y: 1.47, z: -1.94 }));
  if (o.s1) { P.push(box(1.82, 0.12, 4.62, o.s1, { y: 0.86 })); P.push(box(1.82, 0.06, 4.62, o.s2, { y: 0.95 })); }
  both((x) => {
    for (const z of [0.25, -0.75, -1.65]) P.push(box(0.02, 0.56, 0.03, D, { x: x * 0.905, y: 0.82, z }));
    for (const z of [0.05, -0.95]) P.push(box(0.02, 0.04, 0.14, CH, { x: x * 0.91, y: 1.0, z }));
    P.push(box(0.18, 0.12, 0.06, B, { x: x * 1.0, y: 1.17, z: 0.92 }));
    P.push(box(0.12, 0.03, 0.03, BLK, { x: x * 0.92, y: 1.15, z: 0.92 }));
    P.push(box(0.04, 0.32, 0.22, BLK, { x: x * 0.8, y: 0.38, z: -1.85 }));
    P.push(box(0.04, 0.32, 0.22, BLK, { x: x * 0.8, y: 0.38, z: 1.05 }));
    P.push(cyl(0.12, 0.12, 0.05, 10, '#fff6c8', { x: x * 0.6, y: 0.82, z: 2.3, rx: PI / 2 }));
    P.push(box(0.12, 0.08, 0.05, '#f08a24', { x: x * 0.8, y: 0.66, z: 2.3 }));
    P.push(box(0.26, 0.16, 0.05, '#c0261a', { x: x * 0.66, y: 0.85, z: -2.31 }));
  });
  P.push(box(1.86, 0.18, 0.15, CH, { y: 0.5, z: 2.33 }));
  P.push(box(1.86, 0.18, 0.15, CH, { y: 0.5, z: -2.33 }));
  P.push(box(0.9, 0.3, 0.05, '#222222', { y: 0.8, z: 2.31 }));
  P.push(box(0.96, 0.04, 0.06, CH, { y: 0.96, z: 2.31 }));
  return { P, G, wheels: WHEEL_POS, wr: 0.36, rackY: 1.84, rackLen: 2.7, rackZ: -0.45, rackW: 1.56,
    slots: BAG_SLOTS, seats: [[0.4, 1.42, 0.45], [-0.4, 1.42, 0.45], [0.5, 1.42, -0.45], [0, 1.42, -0.45], [-0.5, 1.42, -0.45], [0.5, 1.42, -1.35], [0, 1.42, -1.35], [-0.5, 1.42, -1.35]],
    rear: { y: 1.47, z: -1.98, w: 1.4, h: 0.3 }, front: { y: 1.72, z: 1.1, w: 1.45, h: 0.12, rx: -0.35 }, plateZ: -2.42, plateY: 0.58, ladderZ: -2.32, exhaust: -2.3, len: 4.6 };
}

// cfg : { model, body, s1, s2, rims, rack, slogan, plate }
export function makeVehicle(cfg) {
  const def = vehicleDef(cfg.model, cfg);
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const parts = [...def.P];
  // galerie et échelle arrière
  if (cfg.rack) {
    const y = def.rackY, L = def.rackLen, z0 = def.rackZ, W = def.rackW;
    for (const x of [-W / 2, W / 2]) parts.push(box(0.06, 0.06, L, '#2a2a2a', { x, y, z: z0 }));
    for (let k = 0; k <= 3; k++) parts.push(box(W, 0.05, 0.05, '#2a2a2a', { y, z: z0 - L / 2 + (k * L) / 3 }));
    for (const x of [-W / 2, W / 2]) for (const z of [z0 - L / 2, z0 + L / 2]) parts.push(box(0.05, 0.14, 0.05, '#2a2a2a', { x, y: y - 0.07, z }));
    if (def.ladderZ != null) {
      for (const x of [-0.25, 0.25]) parts.push(box(0.04, y - 0.6, 0.04, '#2a2a2a', { x, y: (y + 0.6) / 2, z: def.ladderZ }));
      for (let k = 0; k < 4; k++) parts.push(box(0.5, 0.03, 0.03, '#2a2a2a', { y: 0.8 + k * ((y - 0.9) / 4), z: def.ladderZ }));
    }
  }
  parts.push(cyl(0.04, 0.04, 0.3, 6, '#555', { x: -0.55, y: 0.36, z: def.exhaust, rx: PI / 2 }));
  const bodyMesh = new THREE.Mesh(merge(parts), MAT);
  body.add(bodyMesh);
  const glass = new THREE.Mesh(mergeGeometries(def.G.map((g) => { g.deleteAttribute('color'); return g; }), false), GLASS_MAT);
  body.add(glass);
  // conducteur et passagers visibles derrière les vitres
  const headGeo = merge([sph(0.13, '#3b2418', { sy: 1.1 }), box(0.34, 0.3, 0.2, '#6a6a6a', { y: -0.28 })]);
  const heads = new THREE.InstancedMesh(headGeo, MAT, def.seats.length);
  const m4 = new THREE.Matrix4();
  def.seats.forEach(([x, y, z], k) => { m4.makeTranslation(x, y, z); heads.setMatrixAt(k, m4); });
  heads.count = 1;
  body.add(heads);
  // slogan sur la lunette arrière, bandeau de pare-brise, plaques
  const decal = (tex, w, h, pos, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.set(...pos); m.rotation.set(rx, ry, 0, 'YXZ');
    body.add(m);
    return m;
  };
  if (cfg.slogan) {
    const r = def.rear;
    decal(textTexture(cfg.slogan, { fg: '#ffffff', stroke: '#1b1a17' }), r.w, r.h, [0, r.y, r.z - 0.012], Math.PI, r.rx ? -r.rx : 0);
    if (def.front) {
      const f = def.front;
      decal(textTexture(cfg.slogan, { bg: '#0f5c3c', fg: '#f4c430', stroke: null }), f.w, f.h, [0, f.y, f.z + 0.03], 0, f.rx || 0);
    }
  }
  const plate = plateTexture(cfg.plate || 'TG');
  decal(plate, 0.52, 0.12, [0, def.plateY, def.plateZ], Math.PI);
  decal(plate, 0.52, 0.12, [0, def.plateY - 0.08, def.len / 2 + 0.09], 0);
  // roues avec jantes à la couleur choisie
  const wg = merge([cyl(def.wr, def.wr, 0.26, 12, '#1d1d1d', { rz: PI / 2 }), cyl(def.wr * 0.55, def.wr * 0.55, 0.28, 8, cfg.rims || '#c9ccd0', { rz: PI / 2 }), cyl(def.wr * 0.15, def.wr * 0.15, 0.3, 6, '#3a3a3a', { rz: PI / 2 })]);
  const wheels = def.wheels.map(([x, y, z]) => {
    const w = new THREE.Mesh(wg, MAT);
    w.position.set(x, y, z);
    group.add(w);
    return w;
  });
  // colis sur la galerie (ou dans le coffre de la berline)
  const bags = def.slots.map(([x, z], i) => {
    const big = i % 3 === 0;
    const c = BAG_COLORS[i % BAG_COLORS.length];
    const g = big
      ? merge([cyl(0.33, 0.36, 0.55, 8, c, { y: 0.27 }), box(0.7, 0.04, 0.04, '#222', { y: 0.35 })])
      : merge([box(0.7, 0.42, 0.8, c, { y: 0.21 }), box(0.72, 0.04, 0.04, '#222', { y: 0.3 })]);
    const m = new THREE.Mesh(g, MAT);
    m.position.set(x, def.rackY + 0.03, z);
    m.visible = false;
    body.add(m);
    return m;
  });
  const goat = new THREE.Mesh(charGoat(0), CHAR_MAT);
  goat.position.set(0, def.rackY + 0.03, def.rackZ + def.rackLen / 2 - 0.3);
  goat.scale.setScalar(0.8);
  goat.visible = false;
  body.add(goat);
  return { group, body, wheels, bags, goat, heads, len: def.len, rackY: def.rackY };
}
export function makeTaxi() {
  return makeVehicle({ model: 'break', body: '#e9b53a', s1: '#1f7a3a', s2: '#d03a2f', rims: '#c9ccd0', rack: true, slogan: 'DIEU EST GRAND', plate: 'TG 2410 BD' });
}

export function taxiStatic() {
  const parts = taxiBodyParts();
  const wg = wheelGeo();
  for (const [x, y, z] of WHEEL_POS) parts.push(wg.clone().translate(x, y, z));
  parts.push(box(0.7, 0.42, 0.8, '#3a6ea5', { x: -0.4, y: 2.08, z: -1.2 }));
  parts.push(cyl(0.33, 0.36, 0.55, 7, '#d03a2f', { x: 0.4, y: 2.15, z: -0.3 }));
  return merge(parts);
}

function staticWheels(list, r, w) {
  const wg = wheelGeo(r, w);
  return list.map(([x, y, z]) => wg.clone().translate(x, y, z));
}

export function truckGeo(cab = '#2f78a8', load = '#e3d7b8') {
  const p = [
    box(2.3, 2.0, 1.9, cab, { y: 1.65, z: 3.3 }),
    box(2.1, 0.8, 0.05, '#26343f', { y: 2.15, z: 4.26 }),
    box(2.4, 0.3, 0.2, '#222', { y: 0.6, z: 4.3 }),
    box(0.3, 0.2, 0.05, '#fff6c8', { x: 0.8, y: 0.95, z: 4.27 }),
    box(0.3, 0.2, 0.05, '#fff6c8', { x: -0.8, y: 0.95, z: 4.27 }),
    box(2.2, 0.35, 8.2, '#2a2a2a', { y: 0.75 }),
    box(2.5, 1.6, 5.8, '#7d5a38', { y: 1.75, z: -1.3 }),
    box(2.62, 1.7, 5.6, load, { y: 3.35, z: -1.3 }),
    box(2.2, 0.8, 5.0, '#d8c49a', { y: 4.4, z: -1.3 }),
    box(2.66, 0.08, 0.08, '#333', { y: 3.6, z: 0.4 }),
    box(2.66, 0.08, 0.08, '#333', { y: 3.6, z: -1.3 }),
    box(2.66, 0.08, 0.08, '#333', { y: 3.6, z: -3.0 }),
    box(0.25, 0.2, 0.05, '#c0261a', { x: 0.9, y: 1.0, z: -4.21 }),
    box(0.25, 0.2, 0.05, '#c0261a', { x: -0.9, y: 1.0, z: -4.21 }),
    ...staticWheels([[1.1, 0.5, 3.1], [-1.1, 0.5, 3.1], [1.1, 0.5, -2.2], [-1.1, 0.5, -2.2], [1.1, 0.5, -3.4], [-1.1, 0.5, -3.4]], 0.5, 0.35),
  ];
  return merge(p);
}
export function carGeo(color) {
  return merge([
    box(1.8, 0.6, 4.3, color, { y: 0.65 }),
    box(1.6, 0.6, 2.2, color, { y: 1.25, z: -0.2 }),
    box(1.62, 0.42, 2.0, '#26343f', { y: 1.27, z: -0.2 }),
    box(0.3, 0.15, 0.05, '#fff6c8', { x: 0.6, y: 0.7, z: 2.16 }),
    box(0.3, 0.15, 0.05, '#fff6c8', { x: -0.6, y: 0.7, z: 2.16 }),
    box(0.3, 0.15, 0.05, '#c0261a', { x: 0.6, y: 0.75, z: -2.16 }),
    box(0.3, 0.15, 0.05, '#c0261a', { x: -0.6, y: 0.75, z: -2.16 }),
    ...staticWheels([[0.85, 0.34, 1.35], [-0.85, 0.34, 1.35], [0.85, 0.34, -1.35], [-0.85, 0.34, -1.35]], 0.34, 0.24),
  ]);
}
export function busGeo(color) {
  return merge([
    box(2, 1.9, 5, color, { y: 1.35 }),
    box(2.02, 0.6, 4.2, '#26343f', { y: 1.8, z: -0.2 }),
    box(1.8, 0.7, 0.05, '#26343f', { y: 1.75, z: 2.51 }),
    box(2.04, 0.15, 5.02, '#f4f0e0', { y: 1.2 }),
    box(1.6, 0.55, 2.6, '#6a4a8a', { y: 2.58, z: -0.5 }),
    box(0.8, 0.4, 0.8, '#d03a2f', { x: 0.3, y: 3.0, z: -0.9 }),
    box(0.3, 0.18, 0.05, '#fff6c8', { x: 0.65, y: 0.75, z: 2.51 }),
    box(0.3, 0.18, 0.05, '#fff6c8', { x: -0.65, y: 0.75, z: 2.51 }),
    ...staticWheels([[0.95, 0.38, 1.6], [-0.95, 0.38, 1.6], [0.95, 0.38, -1.6], [-0.95, 0.38, -1.6]], 0.38, 0.26),
  ]);
}
export function motoGeo() {
  return merge([
    box(0.2, 0.32, 1.2, '#262626', { y: 0.58 }),
    box(0.26, 0.1, 0.72, '#111', { y: 0.82, z: -0.18 }),
    box(0.3, 0.3, 0.4, '#8a1f1f', { y: 0.72, z: 0.36 }),
    cyl(0.3, 0.3, 0.1, 10, '#1a1a1a', { rz: PI / 2, y: 0.3, z: 0.62 }),
    cyl(0.3, 0.3, 0.1, 10, '#1a1a1a', { rz: PI / 2, y: 0.3, z: -0.62 }),
    cyl(0.12, 0.12, 0.12, 8, '#9a9a9a', { rz: PI / 2, y: 0.3, z: 0.62 }),
    cyl(0.12, 0.12, 0.12, 8, '#9a9a9a', { rz: PI / 2, y: 0.3, z: -0.62 }),
    cyl(0.025, 0.025, 0.6, 5, '#777', { y: 0.72, z: 0.58, rx: -0.35 }),
    box(0.72, 0.04, 0.04, '#888', { y: 1.05, z: 0.5 }),
    box(0.14, 0.12, 0.08, '#e9e6dc', { y: 0.95, z: 0.66 }),
    box(0.3, 0.06, 0.34, '#333', { y: 0.84, z: -0.62 }),
  ]);
}
export { goatGeo, zebuGeo } from './characters.js';

/* ---------------------------------------------------------------- mobilier routier */
// poste de péage : auvent sur toute la largeur, îlots, cabines vitrées, bandes d'arrêt
export function tollCanopy() {
  const p = [];
  const W = 15.4;
  p.push(box(W, 0.5, 5.6, '#e9e6dc', { y: 5.75 }));
  p.push(box(W + 0.2, 0.18, 5.8, '#c8322b', { y: 5.45 }));
  p.push(box(W - 0.6, 0.05, 5.0, '#f4f0e0', { y: 5.48 }));
  for (const x of [-5.6, 0, 5.6]) for (const z of [-2.2, 2.2]) p.push(box(0.4, 5.5, 0.4, '#d9d2c0', { x, y: 2.75, z }));
  for (const x of [-4.9, 4.9]) {
    // îlot et cabine
    p.push(box(1.6, 0.25, 8, '#c9c4b8', { x, y: 0.12 }));
    p.push(box(1.6, 0.06, 0.6, '#f4c430', { x, y: 0.27, z: -4 }));
    p.push(box(1.6, 0.06, 0.6, '#16161a', { x, y: 0.27, z: -3.4 }));
    p.push(box(1.3, 2.4, 1.8, '#f0ece2', { x: x + Math.sign(x) * 0.05, y: 1.45 }));
    p.push(box(1.36, 0.9, 1.5, '#26343f', { x: x + Math.sign(x) * 0.05, y: 1.75 }));
    p.push(box(1.5, 0.12, 2.0, '#c8322b', { x, y: 2.7 }));
    p.push(cyl(0.3, 0.3, 0.08, 10, '#c8322b', { x: x - Math.sign(x) * 0.9, y: 3.6, z: -0.6, rx: PI / 2 }));
  }
  // lignes d'arrêt sur la chaussée
  for (const x of [-1.95, 1.95]) p.push(box(3.6, 0.03, 0.4, '#f4f0e0', { x, y: 0.02, z: x > 0 ? 3.4 : -3.4 }));
  // ralentisseurs à l'approche
  for (const z of [-14, -9, 9, 14]) p.push(box(3.6, 0.06, 0.5, '#f4c430', { x: z < 0 ? -1.95 : 1.95, y: 0.03, z }));
  return merge(p);
}

export function checkpointCabin() {
  return merge([
    box(2.2, 2.4, 2.2, '#e8e2d0', { y: 1.2 }),
    box(2.6, 0.15, 2.6, '#5a5f66', { y: 2.48 }),
    box(1.2, 0.7, 0.06, '#26343f', { y: 1.5, z: 1.11 }),
    box(0.25, 1.1, 0.25, '#555', { x: -1.6, y: 0.55, z: 0 }),
    cone(0.25, 0.6, 6, '#f08a24', { x: -2.8, y: 0.3, z: 3 }),
    cone(0.25, 0.6, 6, '#f08a24', { x: -3.6, y: 0.3, z: 6 }),
  ]);
}
export function barrierGeo(len = 4.2) {
  const p = [];
  const n = 8;
  for (let k = 0; k < n; k++) p.push(box(len / n, 0.14, 0.14, k % 2 ? '#f4f0e0' : '#d03a2f', { x: (k + 0.5) * (len / n) }));
  return merge(p);
}

export function makeShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// branchages posés sur la chaussée derrière un véhicule en panne (signalisation d'usage sur les routes togolaises)
export function branches() {
  const parts = [];
  for (let k = 0; k < 4; k++) {
    const x = (k - 1.5) * 0.75, ry = 0.4 + k * 0.9;
    parts.push(cyl(0.05, 0.07, 2.2, 5, '#6b4a2e', { x, y: 0.12, rz: PI / 2, ry }));
    for (let j = 0; j < 5; j++) {
      const o = (j - 2) * 0.42;
      parts.push(ico(0.42 + (j % 2) * 0.12, j % 2 ? '#3f6e27' : '#5d8f34', { x: x + Math.cos(ry) * o, y: 0.38 + (j % 2) * 0.12, z: -Math.sin(ry) * o, sy: 0.85 }));
    }
  }
  return merge(parts);
}

// chargements de zémidjan : bidons jaunes, sacs de maïs, charbon, régimes de bananes (porte-bagages arrière et flancs)
const LOADS = new Map();
export function motoLoad(kind) {
  if (LOADS.has(kind)) return LOADS.get(kind);
  const p = [];
  if (kind === 'bidons') {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) p.push(box(0.17, 0.27, 0.24, j ? '#e8c22a' : '#d9ad1c', { x: (i - 0.5) * 0.19, y: 1.0 + j * 0.28, z: -0.68 }));
    for (const sd of [1, -1]) for (let k = 0; k < 2; k++) p.push(box(0.16, 0.26, 0.22, '#e8c22a', { x: sd * 0.32, y: 0.62, z: -0.42 - k * 0.25 }));
  } else if (kind === 'sacs') {
    p.push(box(0.78, 0.3, 0.46, '#e9e2cf', { y: 1.02, z: -0.66 }));
    p.push(box(0.12, 0.31, 0.47, '#2f8a4a', { y: 1.02, z: -0.66 }));
    p.push(box(0.66, 0.28, 0.42, '#d8cbb0', { y: 1.3, z: -0.68 }));
  } else if (kind === 'charbon') {
    for (let k = 0; k < 3; k++) p.push(box(0.6 - k * 0.08, 0.26, 0.42, k % 2 ? '#2b2724' : '#3a332c', { y: 1.0 + k * 0.25, z: -0.68, ry: k * 0.15 }));
    for (const sd of [1, -1]) p.push(box(0.2, 0.42, 0.36, '#2b2724', { x: sd * 0.34, y: 0.66, z: -0.5 }));
  } else if (kind === 'bananes') {
    for (const sd of [1, -1]) for (let k = 0; k < 2; k++) {
      p.push(cyl(0.04, 0.04, 0.5, 5, '#7a6a3a', { x: sd * 0.34, y: 0.72, z: -0.4 - k * 0.3 }));
      p.push(ico(0.2, k ? '#5d8f34' : '#6fa03c', { x: sd * 0.36, y: 0.66, z: -0.4 - k * 0.3, sy: 1.5 }));
    }
    p.push(ico(0.26, '#6fa03c', { y: 1.05, z: -0.66, sy: 1.3 }));
  }
  const g = merge(p);
  g.userData.shared = true;
  LOADS.set(kind, g);
  return g;
}

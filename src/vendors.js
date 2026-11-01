import * as THREE from 'three';
import { vendorGeo, VENDOR_SPECS, makeCharMat, itemGeo, CHAR_MAT } from './characters.js';
import { rand, pick } from './util.js';

// Vendeuses ambulantes : à l'arrêt près d'un village, d'un contrôle ou d'une vendeuse d'essence,
// elles accourent jusqu'aux vitres avec leurs plateaux et leurs bassines.
export const CRIES = [
  'Pure water ! Eau glacée !', 'Pain chaud, pain sucré !', 'Banane, arachide grillée !', 'Ablo ! Ablo chaud !',
  'Avocat, mangue, orange !', 'Koliko, igname frite !', 'Wagashi, fromage peulh !', 'Galettes, beignets chauds !',
];

export class Vendors {
  constructor(parent, shadows) {
    this.parent = parent;
    this.list = VENDOR_SPECS.map((_, i) => {
      const m = new THREE.Mesh(vendorGeo(i), makeCharMat());
      m.castShadow = shadows;
      m.visible = false;
      parent.add(m);
      // marchandise tenue dans la main tendue (suit le bras calculé comme dans le shader)
      const item = new THREE.Mesh(itemGeo(VENDOR_SPECS[i].goods), CHAR_MAT);
      item.visible = false;
      m.add(item);
      return { mesh: m, item, kind: VENDOR_SPECS[i].goods, active: false, s: 0, x: 0, ts: 0, tx: 0, home: null, phase: Math.random() * 6, arrived: false };
    });
    this.still = 0;
    this.cool = 0;
    this.sold = false;
    this.ex = null; // échange en cours à la vitre
    this.hand = null; // état de la main du passager : { side, extend, holding, kind }
  }

  reset() {
    for (const v of this.list) { v.active = false; v.mesh.visible = false; v.item.visible = false; v.mesh.material.userData.u.uReach.value = 0; }
    this.still = 0; this.cool = 0; this.sold = false; this.ex = null; this.hand = null;
  }

  dispose() { for (const v of this.list) { this.parent.remove(v.mesh); v.mesh.material.dispose(); } }

  // nearStop : le taxi est à l'arrêt dans une zone animée ; renvoie 'cry' ou 'sale' pour les messages
  update(dt, road, P, nearStop, rng) {
    const out = [];
    const speed = Math.abs(P.v);
    this.cool = Math.max(0, this.cool - dt);
    if (speed < 1.2 && nearStop) this.still += dt; else this.still = 0;
    // arrivée des vendeuses
    if (this.still > 0.9 && this.cool <= 0 && !this.list.some((v) => v.active)) {
      const n = 2 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const v = this.list[k];
        const side = k % 2 ? -1 : 1;
        v.active = true; v.arrived = false; v.mesh.visible = true;
        v.home = { s: P.s + rand(rng, -16, 16), x: side * rand(rng, 8.2, 10) };
        v.s = v.home.s; v.x = v.home.x;
        v.ts = P.s + (k - 1) * 1.1; v.tx = P.x + side * 1.45;
      }
      this.sold = false;
      out.push({ type: 'cry', text: pick(rng, CRIES) });
    }
    const leaving = speed > 2.5;
    this.anchorS = P.s;
    this.updateExchange(dt, leaving, out);
    for (const v of this.list) {
      if (!v.active) continue;
      // cible : la vitre du taxi tant qu'il est arrêté, sinon retour au bord de la route
      if (!leaving) { v.ts = P.s + (v.ts - P.s) * 0 + (this.list.indexOf(v) - 1) * 1.1; v.tx = P.x + Math.sign(v.home.x) * 1.45; }
      const ts = leaving ? v.home.s : v.ts, tx = leaving ? v.home.x : v.tx;
      const ds = ts - v.s, dx = tx - v.x;
      const d = Math.hypot(ds, dx);
      const sp = leaving ? 1.6 : 2.6;
      let moving = false;
      const u = v.mesh.material.userData.u;
      if (d > 0.15) {
        const k = Math.min(1, (sp * dt) / d);
        v.s += ds * k; v.x += dx * k;
        u.uPhase.value += d * k * 4.4;
        moving = true;
      } else if (!leaving && !v.arrived) {
        v.arrived = true;
        if (!this.sold && this.list.filter((o) => o.active).every((o) => o.arrived)) {
          this.sold = true;
          // chaque vendeuse tend sa marchandise à son tour, un passager paie par la vitre
          if (P.pax > 0) this.ex = { order: this.list.filter((o) => o.active), i: 0, t: 0 };
          else out.push({ type: 'sale', bought: false });
        }
      }
      if (leaving && (d < 0.3 || Math.abs(v.s - P.s) > 60)) { v.active = false; v.mesh.visible = false; v.item.visible = false; this.cool = 8; continue; }
      u.uWalk.value += ((moving ? 1 : 0) - u.uWalk.value) * Math.min(1, dt * 8);
      if (Math.abs(v.x) < 4.2) road.toWorld(v.s, v.x, v.mesh.position); else road.groundAt(v.s, v.x, v.mesh.position);
      const h = road.headingAt(v.s);
      // orientation monde : avant local (+z) vers la cible
      const fwdS = moving ? ds : 0, fwdX = moving ? dx : P.x - v.x;
      v.mesh.rotation.y = h + Math.atan2(-fwdX, fwdS);
    }
    return out;
  }

  updateExchange(dt, leaving, out) {
    const ex = this.ex;
    this.hand = null;
    for (const v of this.list) {
      const u = v.mesh.material.userData.u;
      const cur = ex && ex.order[ex.i] === v;
      if (!cur) { u.uReach.value = Math.max(0, u.uReach.value - dt * 2); v.item.visible = false; }
    }
    if (!ex) return;
    if (leaving) { this.ex = null; return; }
    const v = ex.order[ex.i];
    ex.t += dt;
    const t = ex.t;
    const env = (a, b, c, d) => (t < a ? 0 : t < b ? (t - a) / (b - a) : t < c ? 1 : t < d ? 1 - (t - c) / (d - c) : 0);
    const reach = env(0, 0.5, 1.7, 2.3);
    v.mesh.material.userData.u.uReach.value = reach;
    // main de la vendeuse : bras de 0,57 m depuis l'épaule (0,2 ; 1,4), tourné vers l'avant
    const a = reach * 1.35;
    v.item.position.set(0.235, 1.4 - 0.6 * Math.cos(a), 0.6 * Math.sin(a) + 0.04);
    v.item.visible = t < 1.15;
    this.hand = { side: Math.sign(v.home.x) || 1, extend: env(0.2, 0.7, 1.8, 2.4), holding: t < 1.15 ? 'note' : 'item', kind: v.kind, z: v.ts - this.anchorS };
    if (t >= 1.15 && !ex.paid) { ex.paid = true; out.push({ type: 'coin' }); }
    if (t > 2.5) {
      ex.i++; ex.t = 0; ex.paid = false;
      if (ex.i >= ex.order.length) { this.ex = null; out.push({ type: 'sale', bought: true }); }
    }
  }
}

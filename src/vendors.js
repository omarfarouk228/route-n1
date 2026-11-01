import * as THREE from 'three';
import { vendorGeo, VENDOR_SPECS, makeCharMat } from './characters.js';
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
      return { mesh: m, active: false, s: 0, x: 0, ts: 0, tx: 0, home: null, phase: Math.random() * 6, arrived: false };
    });
    this.still = 0;
    this.cool = 0;
    this.sold = false;
  }

  reset() {
    for (const v of this.list) { v.active = false; v.mesh.visible = false; }
    this.still = 0; this.cool = 0; this.sold = false;
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
        if (!this.sold && this.list.filter((o) => o.active).every((o) => o.arrived)) { this.sold = true; out.push({ type: 'sale' }); }
      }
      if (leaving && (d < 0.3 || Math.abs(v.s - P.s) > 60)) { v.active = false; v.mesh.visible = false; this.cool = 8; continue; }
      u.uWalk.value += ((moving ? 1 : 0) - u.uWalk.value) * Math.min(1, dt * 8);
      if (Math.abs(v.x) < 4.2) road.toWorld(v.s, v.x, v.mesh.position); else road.groundAt(v.s, v.x, v.mesh.position);
      const h = road.headingAt(v.s);
      // orientation monde : avant local (+z) vers la cible
      const fwdS = moving ? ds : 0, fwdX = moving ? dx : P.x - v.x;
      v.mesh.rotation.y = h + Math.atan2(-fwdX, fwdS);
    }
    return out;
  }
}

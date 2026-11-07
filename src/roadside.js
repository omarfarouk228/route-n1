import * as THREE from 'three';
import { personGeo, makeCharMat, WALKERS } from './characters.js';
import { rand } from './util.js';

// Voyageurs au bord de la route : ils font signe au taxi, montent quand on s'arrête à leur hauteur,
// et ceux qui descendent en route s'éloignent à pied.
export class Roadside {
  constructor(parent, road, rng, shadows) {
    this.parent = parent;
    this.road = road;
    this.pool = [];
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(personGeo(WALKERS[(k * 3 + 1) % WALKERS.length]), makeCharMat());
      m.castShadow = shadows;
      m.visible = false;
      parent.add(m);
      this.pool.push({ mesh: m, use: null });
    }
    // emplacements où quelqu'un attend : sortie des villages, côté droit de la route
    this.spots = [];
    for (const v of road.villages) {
      if (rng() > (v.named ? 0.75 : 0.42)) continue;
      const s = v.s + (v.named ? 70 : 34) + rand(rng, 0, 20);
      if (s > road.length - 260 || road.bridgeAt(s) || road.fuelStops.some((f) => Math.abs(f.s - s) < 30) || road.bumps.some((b) => Math.abs(b.s - s) < 12)) continue;
      this.spots.push({ s, x: 7.5, state: 'wait', p: null, village: v.name, t: 0 });
    }
    this.walkers = []; // passagers descendus qui s'éloignent
  }

  dispose() { for (const o of this.pool) { this.parent.remove(o.mesh); o.mesh.material.dispose(); } }
  reset() {
    for (const o of this.pool) { o.use = null; o.mesh.visible = false; }
    for (const sp of this.spots) { sp.state = sp.state === 'gone' ? 'gone' : 'wait'; sp.mesh = null; }
    this.walkers.length = 0;
  }

  take(use) {
    const o = this.pool.find((q) => !q.use);
    if (!o) return null;
    o.use = use; o.mesh.visible = true;
    o.mesh.geometry = personGeo(WALKERS[Math.floor(Math.random() * WALKERS.length)]);
    return o;
  }
  free(o) { if (!o) return; o.use = null; o.mesh.visible = false; }

  // un passager descend : il fait quelques pas vers le bas-côté puis s'en va
  alight(P) {
    const o = this.take('alight');
    if (!o) return;
    const side = P.x > 1 ? 1 : -1;
    this.walkers.push({ o, s: P.s - 0.6, x: P.x + side * 1.3, tx: side * 9.5, t: 0 });
  }

  // board(spot) : le voyageur marche jusqu'à la portière
  board(sp) { sp.state = 'boarding'; sp.t = 0; }

  update(dt, P) {
    const r = this.road;
    for (const sp of this.spots) {
      if (sp.state === 'gone' || sp.state === 'missed') continue;
      const d = sp.s - P.s;
      const near = d < 380 && d > -45;
      if (near && !sp.mesh) { const o = this.take(sp); if (o) sp.mesh = o; }
      if (!near && sp.mesh) { this.free(sp.mesh); sp.mesh = null; if (d <= -45 && sp.state === 'wait') sp.state = 'missed'; continue; }
      if (!sp.mesh) continue;
      const m = sp.mesh.mesh, u = m.material.userData.u;
      sp.t += dt;
      if (sp.state === 'boarding') {
        // vers la portière arrière droite
        const ts = P.s - 0.7, tx = P.x + 1.2;
        const ds = ts - sp.s, dx = tx - sp.x, dd = Math.hypot(ds, dx);
        if (dd < 0.35) { sp.state = 'gone'; this.free(sp.mesh); sp.mesh = null; continue; }
        const k = Math.min(1, (2.2 * dt) / dd);
        sp.s += ds * k; sp.x += dx * k;
        u.uWalk.value = 1; u.uPhase.value += 2.2 * dt * 4.4; u.uReach.value = 0;
        r.groundAt(sp.s, sp.x, m.position);
        m.rotation.y = r.headingAt(sp.s) + Math.atan2(-dx, ds);
        continue;
      }
      // il fait signe (bras tendu qui monte et descend) quand le taxi approche
      u.uWalk.value = 0;
      u.uReach.value = d < 220 && d > -10 ? 0.55 + 0.45 * Math.sin(sp.t * 7) : 0.1;
      r.groundAt(sp.s, sp.x, m.position);
      m.rotation.y = r.headingAt(sp.s) + Math.PI - 0.9; // tourné vers le taxi qui arrive
    }
    for (let n = this.walkers.length - 1; n >= 0; n--) {
      const w = this.walkers[n];
      w.t += dt;
      const dx = w.tx - w.x;
      const step = Math.min(Math.abs(dx), 1.3 * dt);
      w.x += Math.sign(dx) * step;
      if (Math.abs(dx) < 2) w.s -= 1.1 * dt; // puis il longe la route vers le village
      const m = w.o.mesh, u = m.material.userData.u;
      u.uWalk.value = 1; u.uPhase.value += 1.3 * dt * 4.4; u.uReach.value = 0;
      r.groundAt(w.s, w.x, m.position);
      m.rotation.y = r.headingAt(w.s) + (Math.abs(dx) < 2 ? Math.PI : Math.atan2(-Math.sign(dx), 0));
      if (w.t > 9 || w.s < P.s - 70) { this.free(w.o); this.walkers.splice(n, 1); }
    }
  }
}

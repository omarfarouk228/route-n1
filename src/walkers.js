import * as THREE from 'three';
import { personGeo, makeCharMat, WALKERS } from './characters.js';
import { rand } from './util.js';

// Passants qui marchent sur l'accotement, surtout dans les villages ; ils s'écartent quand le taxi approche.
export class Walkers {
  constructor(parent, shadows, max = 8) {
    this.parent = parent;
    this.max = max;
    this.timer = 0;
    this.list = [];
    for (let k = 0; k < max; k++) {
      const m = new THREE.Mesh(personGeo(WALKERS[k % WALKERS.length]), makeCharMat());
      m.castShadow = shadows;
      m.visible = false;
      parent.add(m);
      this.list.push({ mesh: m, on: false, s: 0, x: 0, bx: 0, dir: 1, v: 1.2 });
    }
  }

  reset() { for (const w of this.list) { w.on = false; w.mesh.visible = false; } }

  dispose() { for (const w of this.list) { this.parent.remove(w.mesh); w.mesh.material.dispose(); } }

  spawn(road, P, rng) {
    const w = this.list.find((o) => !o.on);
    if (!w) return;
    const L = road.length;
    // de préférence dans un village devant le taxi
    const ahead = road.villages.filter((v) => v.s > P.s + 50 && v.s < P.s + 320);
    let s;
    if (ahead.length && rng() < 0.8) {
      const v = ahead[Math.floor(rng() * ahead.length)];
      s = v.s + rand(rng, -1, 1) * (v.named ? 90 : 40);
    } else s = P.s + rand(rng, 90, 300);
    if (s < 10 || s > L - 10 || road.bridgeAt(s)) return;
    if (road.sample(s).cliff > 0.3) return;
    const side = rng() < 0.5 ? -1 : 1;
    w.on = true;
    w.mesh.visible = true;
    w.s = s;
    w.bx = w.x = side * rand(rng, 7.4, 8.6);
    w.dir = rng() < 0.5 ? -1 : 1;
    w.v = rand(rng, 0.95, 1.45);
    // garder une silhouette différente pour chaque passant visible
    w.mesh.geometry = personGeo(WALKERS[Math.floor(rng() * WALKERS.length)]);
  }

  update(dt, road, P, rng, density = 1) {
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.list.filter((w) => w.on).length < this.max) this.spawn(road, P, rng);
      this.timer = rand(rng, 1.2, 3.5) / Math.max(0.4, density);
    }
    for (const w of this.list) {
      if (!w.on) continue;
      w.s += w.dir * w.v * dt;
      // s'écarter si le taxi roule sur l'accotement tout près
      const near = Math.abs(P.s - w.s) < 9 && Math.abs(P.x - w.bx) < 3.2;
      const tx = near ? w.bx + Math.sign(w.bx) * 2.4 : w.bx;
      w.x += (tx - w.x) * Math.min(1, dt * 3);
      if (w.s < P.s - 40 || w.s > P.s + 420 || w.s < 0 || w.s > road.length) { w.on = false; w.mesh.visible = false; continue; }
      const u = w.mesh.material.userData.u;
      u.uWalk.value = 1;
      u.uPhase.value += w.v * dt * 4.4;
      road.groundAt(w.s, w.x, w.mesh.position);
      w.mesh.rotation.y = road.headingAt(w.s) + (w.dir > 0 ? 0 : Math.PI) + (tx - w.x) * 0.25 * w.dir * Math.sign(w.bx);
    }
  }
}

import * as THREE from 'three';
import * as M from './models.js';
import { MAT } from './models.js';
import { rand, pick, weighted, clamp } from './util.js';

const CAR_COLORS = ['#e9e6dc', '#c8322b', '#2f5f9f', '#9aa0a6', '#1f1f22', '#e9b53a', '#0f5c3c'];
const SHIRTS = ['#f4c430', '#2f78a8', '#d03a2f', '#0f7a4a', '#e9e2cf', '#7b3f99'];
const TRUCK_CABS = ['#2f78a8', '#c8322b', '#e9e6dc', '#0f5c3c', '#d9a020'];
const LOADS = ['#e3d7b8', '#d8cbb0', '#c9b48a', '#e9e2cf'];
const GOATS = ['#e8e0d0', '#6b4a30', '#2a2522', '#a87a50'];

const TYPES = {
  truck: { len: 8.6, wid: 2.5, geo: () => M.truckGeo(pick(Math.random, TRUCK_CABS), pick(Math.random, LOADS)) },
  car: { len: 4.4, wid: 1.8, geo: () => M.carGeo(pick(Math.random, CAR_COLORS)) },
  bus: { len: 5, wid: 2, geo: () => M.busGeo(pick(Math.random, ['#e9e6dc', '#f4c430', '#2f78a8'])) },
  moto: { len: 1.9, wid: 0.8, geo: () => M.motoGeo(pick(Math.random, SHIRTS)) },
  goat: { len: 0.9, wid: 0.6, animal: true, geo: () => M.goatGeo(pick(Math.random, GOATS)) },
  zebu: { len: 2.0, wid: 0.9, animal: true, geo: () => M.zebuGeo() },
};

const _v = new THREE.Vector3();

export class Traffic {
  constructor(parent, road, rng) {
    this.parent = parent;
    this.road = road;
    this.rng = rng;
    this.items = [];
    this.pool = {};
    this.tSame = 1;
    this.tOn = 2;
    this.tMoto = 3;
    this.events = []; // klaxons des véhicules d'en face, etc.
  }

  get(type) {
    const p = (this.pool[type] ||= []);
    let mesh = p.pop();
    if (!mesh) mesh = new THREE.Mesh(TYPES[type].geo(), MAT);
    mesh.visible = true;
    this.parent.add(mesh);
    return mesh;
  }

  release(it) {
    it.mesh.visible = false;
    this.parent.remove(it.mesh);
    this.pool[it.type].push(it.mesh);
  }

  spawn(type, s, x, v, extra = {}) {
    const T = TYPES[type];
    const it = { type, mesh: this.get(type), s, x, tx: x, baseX: x, v, baseV: v, len: T.len, wid: T.wid, dir: v >= 0 ? 1 : -1, animal: !!T.animal, cd: 0, honkT: 0, dodged: false, ...extra };
    this.items.push(it);
    this.place(it);
    return it;
  }

  clearAll() {
    for (const it of this.items) this.release(it);
    this.items.length = 0;
  }

  dispose() {
    this.clearAll();
    for (const list of Object.values(this.pool)) for (const m of list) m.geometry.dispose();
    this.pool = {};
  }

  place(it) {
    const r = this.road;
    r.toWorld(it.s, it.x, it.mesh.position);
    const h = r.headingAt(it.s);
    if (it.animal) it.mesh.rotation.y = h + (it.vx > 0 ? -Math.PI / 2 : Math.PI / 2);
    else it.mesh.rotation.y = h + (it.dir < 0 ? Math.PI : 0) + (it.tx - it.x) * 0.04 * it.dir;
  }

  free(s, x, len) {
    return !this.items.some((o) => Math.abs(o.s - s) < (o.len + len) / 2 + 14 && Math.abs(o.x - x) < 2.2);
  }

  update(dt, P, horn, active) {
    const r = this.road, rng = this.rng, L = r.length;
    const B = r.biomeAt(clamp(P.s, 0, L));
    const dens = B.traffic;
    this.events.length = 0;

    // --- apparitions
    const sameDir = this.items.filter((o) => o.dir === 1 && !o.animal && o.type !== 'moto').length;
    this.tSame -= dt;
    if (this.tSame <= 0 && sameDir < Math.round(1 + dens * 1.6)) {
      const s = P.s + rand(rng, 320, 620);
      if (s < L - 90 && this.free(s, 1.9, 9)) {
        const car = rng() < 0.22;
        this.spawn(car ? 'car' : 'truck', s, 1.9, car ? rand(rng, 18, 21) : rand(rng, 10.5, 14.5));
      }
      this.tSame = rand(rng, 3, 7);
    }
    this.tOn -= dt;
    if (this.tOn <= 0) {
      const s = P.s + rand(rng, 420, 600);
      const type = weighted(rng, { car: 4, bus: 2, truck: 3, moto: 1.5 });
      const x = type === 'moto' ? -4.8 : -1.9;
      const v = -{ car: rand(rng, 19, 26), bus: rand(rng, 16, 21), truck: rand(rng, 11, 16), moto: rand(rng, 9, 12) }[type];
      if (s < L + 120 && s > 40 && this.free(s, x, 9)) this.spawn(type, s, x, v);
      this.tOn = rand(rng, 2.5, 7.5) / dens;
    }
    this.tMoto -= dt;
    if (this.tMoto <= 0) {
      const s = P.s + rand(rng, 220, 420);
      if (s < L - 60 && this.free(s, 4.8, 2)) this.spawn('moto', s, 4.8, rand(rng, 8, 10.5));
      this.tMoto = rand(rng, 5, 11) / dens;
    }
    // traversées d'animaux
    for (const c of r.crossings) {
      if (c.done || c.s < P.s || c.s - P.s > 160) continue;
      c.done = true;
      const n = c.kind === 'zebu' ? 2 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 4);
      const dirX = rng() < 0.5 ? 1 : -1;
      for (let k = 0; k < n; k++) {
        this.spawn(c.kind, c.s + rand(rng, -2.5, 2.5) + k * 0.9, -dirX * (8 + k * 1.6), 0, { vx: dirX * rand(rng, 0.9, 1.4) });
      }
    }

    // --- déplacements
    const cps = r.checkpoints;
    for (let n = this.items.length - 1; n >= 0; n--) {
      const it = this.items[n];
      if (it.cd > 0) it.cd -= dt;
      if (it.animal) {
        // les animaux pressent le pas au klaxon
        if (horn && Math.abs(it.s - P.s) < 70 && it.s > P.s) it.flee = true;
        it.x += it.vx * dt * (it.flee ? 2.4 : 1);
        if (Math.abs(it.x) > 13 && Math.sign(it.x) === Math.sign(it.vx)) { this.release(it); this.items.splice(n, 1); continue; }
        this.place(it);
        continue;
      }
      if (it.dir === 1) {
        let desired = it.baseV;
        // suivre le véhicule de devant (y compris le joueur)
        let gap = 1e9, leadV = 0;
        for (const o of this.items) {
          if (o === it || o.animal || o.dir !== 1) continue;
          const d = o.s - it.s;
          if (d > 0 && d < gap && Math.abs(o.x - it.x) < 1.8) { gap = d; leadV = o.v; }
        }
        const dp = P.s - it.s;
        if (dp > 0 && dp < gap && Math.abs(P.x - it.x) < 1.9) { gap = dp; leadV = P.v; }
        gap -= it.len / 2 + 2.5;
        if (gap < 18) desired = Math.min(desired, Math.max(0, leadV) * (gap < 6 ? 0.4 : 0.95));
        for (const cp of cps) {
          const d = cp.s - it.s;
          if (d > -3 && d < 45) desired = Math.min(desired, 4.5);
        }
        it.v += clamp(desired - it.v, -7 * dt, 2.2 * dt);
        // klaxon : le camion ou le zém se range à droite
        if (horn && it.s > P.s && it.s - P.s < 65 && Math.abs(it.x - P.x) < 2.4) {
          it.tx = it.type === 'moto' ? 6.2 : 3.6;
          it.honkT = 7;
        }
        if (it.honkT > 0) { it.honkT -= dt; if (it.honkT <= 0) it.tx = it.baseX; }
      } else {
        // en face : se serre et klaxonne si le joueur est sur sa voie
        const d = it.s - P.s;
        if (P.x < 0.6 && d > 0 && d < 95 && it.type !== 'moto') {
          it.tx = -3.5;
          if (!it.dodged) { it.dodged = true; this.events.push('oncomingHorn'); }
        } else if (d < 0) it.tx = it.baseX;
      }
      it.x += (it.tx - it.x) * Math.min(1, dt * 1.6);
      it.s += it.v * dt;
      if (it.s < P.s - 80 || it.s > P.s + 900 || (it.dir === 1 && it.s > L + 100)) {
        this.release(it); this.items.splice(n, 1); continue;
      }
      this.place(it);
    }

    if (!active) return [];
    // --- collisions avec le taxi (repère route : s, x)
    const hits = [];
    for (const it of this.items) {
      if (it.cd > 0) continue;
      const ds = it.s - P.s, dx = it.x - P.x;
      if (Math.abs(ds) < (it.len + 4.5) / 2 && Math.abs(dx) < (it.wid + 1.75) / 2) {
        it.cd = 1.6;
        hits.push(it);
      }
    }
    return hits;
  }

  removeItem(it) {
    const n = this.items.indexOf(it);
    if (n >= 0) { this.release(it); this.items.splice(n, 1); }
  }
}

export function vehicleWorldPos(road, it) {
  return road.toWorld(it.s, it.x, _v);
}

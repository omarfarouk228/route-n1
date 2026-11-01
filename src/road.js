import * as THREE from 'three';
import { BIOMES } from './data.js';
import { MAT } from './models.js';
import { mulberry32, noise2, smoothstep, clamp, rand } from './util.js';

export const DS = 2; // pas d'échantillonnage de l'axe (m)
export const HALF_ROAD = 4; // demi-largeur du goudron
export const SHOULDER = 7.2; // bord extérieur des accotements en latérite
const S0 = -90; // la route commence un peu derrière la gare
const EXTRA = 220; // et se prolonge dans la ville d'arrivée

const TERRAIN_OFFS = [7.2, 8.6, 10.5, 13.5, 18, 25, 35, 50, 72, 105, 150];
const _col = new THREE.Color();
const _a = new THREE.Color();
const _b = new THREE.Color();

const BIOME_COLORS = {};
for (const [k, B] of Object.entries(BIOMES)) {
  BIOME_COLORS[k] = { g0: new THREE.Color(B.ground[0]), g1: new THREE.Color(B.ground[1]), sh: new THREE.Color(B.shoulder) };
}
const ROCK0 = new THREE.Color('#9a6b4b');
const ROCK1 = new THREE.Color('#7d746a');
const ASPH0 = new THREE.Color('#3b3b3d');
const ASPH1 = new THREE.Color('#4b4945');
const ASPH_PATCH = new THREE.Color('#2d2c2c');

export class Road {
  constructor(stage, stageIndex, seed) {
    this.stage = stage;
    this.index = stageIndex;
    this.length = stage.length;
    this.rng = mulberry32(seed);
    this.n = Math.ceil((this.length + EXTRA - S0) / DS) + 1;
    this._f = { x: 0, y: 0, z: 0, h: 0, k: 0, grade: 0 };
    this.boundaries = [];
    let acc = 0;
    for (const z of stage.zones) { acc = z.until * this.length; this.boundaries.push(acc); }
    this.generate();
    this.features();
  }

  idx(s) { return clamp((s - S0) / DS, 0, this.n - 1.001); }
  sAt(i) { return S0 + i * DS; }

  zoneIndex(s) {
    for (let z = 0; z < this.boundaries.length; z++) if (s <= this.boundaries[z]) return z;
    return this.boundaries.length - 1;
  }
  biomeKey(s) { return this.stage.zones[this.zoneIndex(s)].biome; }
  biomeAt(s) { return BIOMES[this.biomeKey(s)]; }

  // mélange de biomes autour des frontières de zones
  biomeMix(s) {
    const zi = this.zoneIndex(s);
    const a = this.stage.zones[zi].biome;
    const W = 160;
    const end = this.boundaries[zi];
    if (zi < this.stage.zones.length - 1 && s > end - W) {
      return { a, b: this.stage.zones[zi + 1].biome, t: smoothstep(end - W, end + W, s) };
    }
    if (zi > 0) {
      const start = this.boundaries[zi - 1];
      if (s < start + W) return { a: this.stage.zones[zi - 1].biome, b: a, t: smoothstep(start - W, start + W, s) };
    }
    return { a, b: a, t: 0 };
  }

  generate() {
    const n = this.n, rng = this.rng;
    this.px = new Float32Array(n); this.py = new Float32Array(n); this.pz = new Float32Array(n);
    this.h = new Float32Array(n); this.k = new Float32Array(n); this.grade = new Float32Array(n);
    this.cliff = new Float32Array(n);
    let x = 0, y = 0, z = 0, head = 0, kCur = 0, gCur = 0, segLeft = 0, kT = 0, gT = 0, flip = rng() < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const s = this.sAt(i);
      const key = this.biomeKey(clamp(s, 0, this.length));
      const B = BIOMES[key];
      if (segLeft <= 0) {
        if (B.cliff) {
          flip = -flip;
          segLeft = rand(rng, 55, 95);
          kT = flip * rand(rng, 0.012, 0.02);
          gT = 0.075;
        } else if (rng() < B.curvy) {
          segLeft = rand(rng, 90, 260);
          kT = (rng() < 0.5 ? -1 : 1) * rand(rng, 0.002, 0.009) * B.curveAmp;
          gT = (rng() * 2 - 1) * B.hill * 0.004;
        } else {
          segLeft = rand(rng, 140, 480);
          kT = 0;
          gT = (rng() * 2 - 1) * B.hill * 0.004;
        }
      }
      if (s < 120 || s > this.length - 160) { kT = 0; gT = 0; }
      segLeft -= DS;
      kCur += (kT - kCur) * Math.min(1, DS / 30);
      gCur += (gT - gCur) * Math.min(1, DS / 50);
      this.px[i] = x; this.py[i] = y; this.pz[i] = z; this.h[i] = head; this.k[i] = kCur; this.grade[i] = gCur;
      head += kCur * DS;
      x += Math.sin(head) * DS;
      z += Math.cos(head) * DS;
      y += gCur * DS;
    }
    // falaises de la faille : rampe de 70 m aux extrémités de la zone
    for (let i = 0; i < n; i++) {
      const s = this.sAt(i);
      let c = 0;
      for (let zi = 0; zi < this.stage.zones.length; zi++) {
        if (!BIOMES[this.stage.zones[zi].biome].cliff) continue;
        const a = zi ? this.boundaries[zi - 1] : 0, b = this.boundaries[zi];
        c = Math.max(c, smoothstep(a, a + 70, s) * (1 - smoothstep(b - 70, b, s)));
      }
      this.cliff[i] = c;
    }
  }

  sample(s) {
    const fi = this.idx(s), i = Math.floor(fi), t = fi - i, j = i + 1;
    const f = this._f;
    f.x = this.px[i] + (this.px[j] - this.px[i]) * t;
    f.y = this.py[i] + (this.py[j] - this.py[i]) * t;
    f.z = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
    f.h = this.h[i] + (this.h[j] - this.h[i]) * t;
    f.k = this.k[i] + (this.k[j] - this.k[i]) * t;
    f.grade = this.grade[i] + (this.grade[j] - this.grade[i]) * t;
    f.cliff = this.cliff[i];
    return f;
  }

  headingAt(s) { return this.sample(s).h; }

  // position sur la chaussée (hauteur de la route)
  toWorld(s, off, out) {
    const f = this.sample(s);
    out.set(f.x - Math.cos(f.h) * off, f.y, f.z + Math.sin(f.h) * off);
    return out;
  }

  // hauteur du terrain à l'index i pour un décalage latéral off
  terrainH(i, off) {
    const d = Math.abs(off);
    const base = this.py[i] - 0.15;
    if (d <= SHOULDER) return base;
    const h = this.h[i];
    const wx = this.px[i] - Math.cos(h) * off, wz = this.pz[i] + Math.sin(h) * off;
    const B = this.biomeAt(clamp(this.sAt(i), 0, this.length));
    const t = smoothstep(SHOULDER, SHOULDER + 28, d);
    let y = base;
    y += (noise2(wx * 0.012, wz * 0.012) * 2 - 1) * B.hill * 3.2 * t;
    y += (noise2(wx * 0.06, wz * 0.06) - 0.5) * 1.1 * t;
    y -= 0.55 * smoothstep(SHOULDER, 8.6, d) * (1 - smoothstep(9.5, 13, d));
    const c = this.cliff[i];
    if (c > 0) y += c * (24 + noise2(wx * 0.05, wz * 0.05) * 14) * smoothstep(9.5, 17, d);
    return y;
  }

  groundAt(s, off, out) {
    const i = Math.round(this.idx(s));
    const h = this.h[i];
    out.set(this.px[i] - Math.cos(h) * off, this.terrainH(i, off), this.pz[i] + Math.sin(h) * off);
    return out;
  }

  wallLimit(s) {
    return this.sample(s).cliff > 0.4 ? 8.4 : 16;
  }

  /* ------------------------------------------------------------ éléments du parcours */
  features() {
    const rng = this.rng, L = this.length;
    const st = this.stage;
    this.towns = st.towns.map((t) => ({ s: t.t * L, name: t.name, named: true, fuel: true }));
    // petits villages anonymes
    this.villages = [...this.towns];
    let s = 280 + rng() * 200;
    while (s < L - 300) {
      const B = this.biomeAt(s);
      const near = this.villages.some((v) => Math.abs(v.s - s) < 260);
      if (!near && !B.cliff) this.villages.push({ s, name: null, named: false, fuel: rng() < 0.5 });
      s += rand(rng, B.villageEvery[0], B.villageEvery[1]);
    }
    this.villages.sort((a, b) => a.s - b.s);
    // au moins une vendeuse d'essence au milieu de chaque étape
    if (!this.villages.some((v) => v.fuel && v.s > L * 0.3 && v.s < L * 0.75) && this.villages.length) {
      let best = this.villages[0];
      for (const v of this.villages) if (Math.abs(v.s - L / 2) < Math.abs(best.s - L / 2)) best = v;
      best.fuel = true;
    }
    this.fuelStops = this.villages.filter((v) => v.fuel).map((v) => ({ s: v.s + 28, side: 1, warned: false }));

    // contrôles routiers (jamais dans la faille)
    this.checkpoints = [];
    const nCp = L > 2500 && rng() < 0.5 ? 2 : 1;
    for (let k = 0; k < nCp; k++) {
      for (let tries = 0; tries < 20; tries++) {
        const cs = L * rand(rng, 0.25, 0.85);
        const ok = !this.biomeAt(cs).cliff && !this.checkpoints.some((c) => Math.abs(c.s - cs) < 500) && !this.villages.some((v) => Math.abs(v.s - cs) < 90);
        if (ok) { this.checkpoints.push({ s: cs, done: false, warned: false, open: 0 }); break; }
      }
    }

    // nids-de-poule
    this.potholes = [];
    for (let ps = 160; ps < L - 160; ps += 100) {
      const B = this.biomeAt(ps);
      const cnt = Math.floor(B.potholes * rng() * 1.6);
      const c0 = ps + rng() * 80;
      for (let k = 0; k < cnt; k++) {
        const lane = rng() < 0.65 ? 1 : -1;
        this.potholes.push({ s: c0 + rand(rng, -14, 14), x: lane * rand(rng, 0.4, 3.4), r: rand(rng, 0.35, 0.75), hit: false });
      }
    }
    this.potholes.sort((a, b) => a.s - b.s);

    // traversées d'animaux près des villages
    this.crossings = [];
    for (const v of this.villages) {
      if (rng() < 0.55) {
        const B = this.biomeAt(v.s);
        this.crossings.push({ s: v.s + rand(rng, -60, 60), kind: B.huts && rng() < 0.5 ? 'zebu' : 'goat', done: false });
      }
    }

    // messages au fil de la route
    this.notes = [];
    for (const v of this.towns) this.notes.push({ s: v.s - 110, text: `Bienvenue à ${v.name}`, kind: 'town' });
    if (st.landmark) {
      const zi = st.zones.findIndex((z) => BIOMES[z.biome].cliff);
      const fs = zi > 0 ? this.boundaries[zi - 1] : 0;
      this.faille = { s: fs, end: this.boundaries[zi] };
      this.notes.push({ s: fs - 120, text: `${st.landmark} : forte montée, ligne continue, interdit de doubler`, kind: 'landmark' });
    }
    for (const c of this.checkpoints) this.notes.push({ s: c.s - 260, text: 'Contrôle routier dans 250 m : passe sous 20 km/h', kind: 'warn' });
    for (const f of this.fuelStops) this.notes.push({ s: f.s - 220, text: 'Vendeuse d’essence à 200 m : arrête-toi sur le bas-côté droit', kind: 'fuel' });
    this.notes.sort((a, b) => a.s - b.s);
    for (const nt of this.notes) nt.shown = false;
  }

  /* ------------------------------------------------------------ maillages */
  buildMeshes() {
    const g = new THREE.Group();
    const rowsAll = (step) => {
      const rows = [];
      for (let i = 0; i < this.n; i += step) rows.push(i);
      if (rows[rows.length - 1] !== this.n - 1) rows.push(this.n - 1);
      return rows;
    };
    const inFaille = (i) => this.cliff[i] > 0.05;

    // goudron
    g.add(this.ribbon(rowsAll(1), [-HALF_ROAD, 0, HALF_ROAD], (i) => this.py[i], (i, off, out) => {
      const s = this.sAt(i);
      const n1 = noise2(s * 0.05, off * 0.4);
      out.copy(ASPH0).lerp(ASPH1, n1);
      if (noise2(s * 0.11 + 7, off * 0.7) > 0.78) out.lerp(ASPH_PATCH, 0.7);
    }));

    // accotements en latérite
    const shoulderColor = (i, off, out) => {
      const m = this.biomeMix(clamp(this.sAt(i), 0, this.length));
      out.copy(BIOME_COLORS[m.a].sh).lerp(BIOME_COLORS[m.b].sh, m.t);
      out.multiplyScalar(0.92 + noise2(this.sAt(i) * 0.08, off) * 0.16);
    };
    const shoulderH = (i, off) => this.py[i] - (Math.abs(off) > HALF_ROAD + 0.1 ? 0.12 : 0.02);
    g.add(this.ribbon(rowsAll(1), [-SHOULDER, -HALF_ROAD], shoulderH, shoulderColor));
    g.add(this.ribbon(rowsAll(1), [HALF_ROAD, SHOULDER], shoulderH, shoulderColor));

    // terrain des deux côtés
    const terrainColor = (i, off, out, y) => {
      const s = clamp(this.sAt(i), 0, this.length);
      const m = this.biomeMix(s);
      const A = BIOME_COLORS[m.a], B = BIOME_COLORS[m.b];
      const h = this.h[i];
      const wx = this.px[i] - Math.cos(h) * off, wz = this.pz[i] + Math.sin(h) * off;
      const nz = noise2(wx * 0.03, wz * 0.03);
      _a.copy(A.g0).lerp(A.g1, nz);
      _b.copy(B.g0).lerp(B.g1, nz);
      out.copy(_a).lerp(_b, m.t);
      const rel = y - this.py[i];
      if (rel > 4) out.lerp(_col.copy(ROCK0).lerp(ROCK1, noise2(wx * 0.1, wz * 0.1)), smoothstep(4, 9, rel) * this.cliff[i]);
      if (Math.abs(off) < 9) out.lerp(BIOME_COLORS[m.a].sh, 0.35);
    };
    const rightOffs = TERRAIN_OFFS;
    const leftOffs = TERRAIN_OFFS.map((o) => -o).reverse();
    const tRows = rowsAll(2);
    g.add(this.ribbon(tRows, leftOffs, (i, off) => this.terrainH(i, off), terrainColor));
    g.add(this.ribbon(tRows, rightOffs, (i, off) => this.terrainH(i, off), terrainColor));

    // marquage : pointillés au centre (ligne continue dans la faille), lignes de rive
    g.add(this.markings(inFaille));
    g.add(this.potholeMesh());
    return g;
  }

  ribbon(rows, offs, heightFn, colorFn) {
    const R = rows.length, C = offs.length;
    const pos = new Float32Array(R * C * 3);
    const col = new Float32Array(R * C * 3);
    for (let r = 0; r < R; r++) {
      const i = rows[r];
      const ch = Math.cos(this.h[i]), sh = Math.sin(this.h[i]);
      for (let c = 0; c < C; c++) {
        const off = offs[c];
        const y = heightFn(i, off);
        const v = (r * C + c) * 3;
        pos[v] = this.px[i] - ch * off;
        pos[v + 1] = y;
        pos[v + 2] = this.pz[i] + sh * off;
        colorFn(i, off, _col, y);
        col[v] = _col.r; col[v + 1] = _col.g; col[v + 2] = _col.b;
      }
    }
    const idx = [];
    for (let r = 0; r < R - 1; r++) {
      for (let c = 0; c < C - 1; c++) {
        const a = r * C + c, b = a + 1, cc = a + C, d = cc + 1;
        idx.push(a, b, cc, b, d, cc);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return new THREE.Mesh(geo, MAT);
  }

  markings(inFaille) {
    const pos = [];
    const quad = (i0, i1, off, w, lift = 0.025) => {
      const p = [];
      for (const i of [i0, i1]) {
        const ch = Math.cos(this.h[i]), sh = Math.sin(this.h[i]);
        for (const o of [off - w / 2, off + w / 2]) p.push([this.px[i] - ch * o, this.py[i] + lift, this.pz[i] + sh * o]);
      }
      // p0 = (i0, gauche), p1 = (i0, droite), p2 = (i1, gauche), p3 = (i1, droite)
      pos.push(...p[0], ...p[1], ...p[2], ...p[1], ...p[3], ...p[2]);
    };
    // pointillés : 4 m de trait, 6 m d'espace ; continus dans la faille
    for (let i = 0; i < this.n - 2; i++) {
      const s = this.sAt(i);
      const solid = inFaille(i);
      if (solid || ((s % 10) + 10) % 10 < 4) quad(i, i + 1, 0, 0.15);
    }
    // lignes de rive usées, par tronçons
    for (let i = 0; i < this.n - 2; i++) {
      const s = this.sAt(i);
      if (noise2(s * 0.02, 3.3) > 0.35) { quad(i, i + 1, 3.75, 0.12); quad(i, i + 1, -3.75, 0.12); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: '#e8e4d6', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    return m;
  }

  potholeMesh() {
    const geo = new THREE.CircleGeometry(1, 7);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ color: '#221f1c', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, this.potholes.length));
    im.count = this.potholes.length;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    this.potholes.forEach((ph, k) => {
      this.toWorld(ph.s, ph.x, p);
      p.y += 0.03;
      q.setFromAxisAngle(up, this.headingAt(ph.s) + ph.r * 3);
      sc.set(ph.r * 1.2, 1, ph.r);
      m4.compose(p, q, sc);
      im.setMatrixAt(k, m4);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    return im;
  }
}

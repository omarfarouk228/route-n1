import * as THREE from 'three';
import { BIOMES, CITIES } from './data.js';
import { cityZones } from './cities.js';
import { MAT } from './models.js';
import { mulberry32, noise2, smoothstep, clamp, rand, weighted, deName } from './util.js';
import { routeIndex, headingAt as realHeading } from './geo.js';
import { TERRAIN_MAT, WATER_MAT, CONCRETE_MAT } from './terrainmat.js';

export const DS = 2; // pas d'échantillonnage de l'axe (m)
export const HALF_ROAD = 4; // demi-largeur du goudron
export const SHOULDER = 7.2; // bord extérieur des accotements en latérite
const S0 = -90; // la route commence un peu derrière la gare
const EXTRA = 220; // et se prolonge dans la ville d'arrivée

const TERRAIN_OFFS = [7.2, 8.6, 10.5, 13.5, 17, 21, 26, 32, 40, 50, 62, 78, 100, 128, 160];
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
const SOIL = new THREE.Color('#7a4a2e');
const SOIL_DRY = new THREE.Color('#9a7048');
const CHAR = new THREE.Color('#2b2724');
const ASH = new THREE.Color('#6a5f55');
const MUD = new THREE.Color('#5e4e36');
const STONE = new THREE.Color('#7d6a52');
const ROAD2_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const CONCRETE = new THREE.Color('#bdb6a8');

export class Road {
  constructor(stage, stageIndex, seed, opts = {}) {
    this.stage = stage;
    this.index = stageIndex; // numéro de l'étape dans le sens du voyage
    this.geo = stage.geoIndex ?? stageIndex; // étape géographique (sens Lomé → Dapaong)
    this.rev = !!stage.reverse; // retour : l'étape est parcourue vers le sud
    this.fromCity = CITIES[stage.from ?? stageIndex];
    this.toCity = CITIES[stage.to ?? stageIndex + 1];
    this.weather = opts.weather || 'clear';
    this.length = stage.length;
    this.rng = mulberry32(seed);
    this.n = Math.ceil((this.length + EXTRA - S0) / DS) + 1;
    this._f = { x: 0, y: 0, z: 0, h: 0, k: 0, grade: 0 };
    this.boundaries = [];
    let acc = 0;
    for (const z of stage.zones) { acc = z.until * this.length; this.boundaries.push(acc); }
    this.rivers = (stage.rivers || []).map((r) => ({ s: r.t * this.length, name: r.name, depth: 7, w: 22 }));
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
          gT = this.rev ? -0.062 : 0.062; // au retour, on descend la faille
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
      if (this.rivers.some((r) => Math.abs(r.s - s) < 140)) { kT = 0; gT = 0; }
      segLeft -= DS;
      kCur += (kT - kCur) * Math.min(1, DS / 30);
      gCur += (gT - gCur) * Math.min(1, DS / 50);
      // courbure réelle de la N1 (tracé OpenStreetMap lissé) + relief procédural
      const tt = clamp(s / this.length, 0, 1), tt1 = clamp((s + DS) / this.length, 0, 1);
      const fi0 = routeIndex(this.geo, this.rev ? 1 - tt : tt), fi1 = routeIndex(this.geo, this.rev ? 1 - tt1 : tt1);
      const kReal = s < 0 || s > this.length ? 0 : clamp(-(realHeading(fi1) - realHeading(fi0)) / DS, -0.008, 0.008);
      const kTot = (B.cliff ? kCur : kCur * 0.55) + kReal;
      this.px[i] = x; this.py[i] = y; this.pz[i] = z; this.h[i] = head; this.k[i] = kTot; this.grade[i] = gCur;
      head += kTot * DS;
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
    const sI = this.sAt(i);
    if (off < 0 && d < 18 && this.isDual(sI)) return base;
    for (const hl of this.hills) {
      if (Math.sign(off) !== hl.side) continue;
      const k = smoothstep(hl.r[0] - 80, hl.r[0] + 40, sI) * (1 - smoothstep(hl.r[1] - 40, hl.r[1] + 80, sI));
      if (k > 0) y += k * hl.h * smoothstep(hl.at, hl.at + 45, d) * (0.8 + 0.4 * noise2(wx * 0.02, wz * 0.02));
    }
    const c = this.cliff[i];
    if (c > 0) y += c * (24 + noise2(wx * 0.05, wz * 0.05) * 14) * smoothstep(9.5, 17, d);
    const si = this.sAt(i);
    for (const r of this.rivers) {
      const ds = Math.abs(si - r.s);
      if (ds < r.w / 2 + 45) {
        const dip = r.depth * (1 - smoothstep(r.w / 2, r.w / 2 + 40, ds)) * smoothstep(SHOULDER, SHOULDER + 3, d);
        y = Math.min(y, base - dip + (y - base) * smoothstep(r.w / 2, r.w / 2 + 40, ds));
      }
    }
    return y;
  }

  // hauteur telle que le maillage l'affiche (interpolée entre colonnes et rangées) : les objets posés ne flottent pas
  meshH(i, off) {
    const d = Math.abs(off);
    if (d <= SHOULDER) return this.py[i] - 0.15;
    let c = 0;
    while (c < TERRAIN_OFFS.length - 2 && d > TERRAIN_OFFS[c + 1]) c++;
    const o0 = TERRAIN_OFFS[c], o1 = TERRAIN_OFFS[c + 1];
    const t = clamp((d - o0) / (o1 - o0), 0, 1);
    const sg = Math.sign(off);
    return this.terrainH(i, sg * o0) * (1 - t) + this.terrainH(i, sg * o1) * t;
  }

  groundAt(s, off, out) {
    const fi = this.idx(s);
    const i0 = Math.min(this.n - 1, Math.floor(fi / 2) * 2), i1 = Math.min(this.n - 1, i0 + 2);
    const t = i1 > i0 ? (fi - i0) / (i1 - i0) : 0;
    const f = this.sample(s);
    const y = this.meshH(i0, off) * (1 - t) + this.meshH(i1, off) * t;
    out.set(f.x - Math.cos(f.h) * off, y, f.z + Math.sin(f.h) * off);
    return out;
  }

  fieldAt(s, off) {
    const side = off < 0 ? -1 : 1, d = Math.abs(off);
    for (const f of this.fields) if (f.side === side && s >= f.s0 && s <= f.s1 && d >= f.o0 && d <= f.o1) return f;
    return null;
  }
  bridgeAt(s) {
    for (const r of this.rivers) if (Math.abs(s - r.s) < r.w / 2 + 16) return r;
    return null;
  }

  wallLimit(s, side = 1) {
    if (side < 0 && this.isDual(s)) return 4.45; // terre-plein central du boulevard
    return this.sample(s).cliff > 0.4 ? 8.4 : 16;
  }

  /* ------------------------------------------------------------ éléments du parcours */
  features() {
    const rng = this.rng, L = this.length;
    const st = this.stage;
    this.towns = st.towns.map((t) => ({ s: t.t * L, name: t.name, named: true, fuel: true }));
    this.tolls = (st.tolls || []).map((t) => ({ s: t.t * L, name: t.name, paid: false, wait: 0, warned: false, hit: 0 }));
    this.cityLayout();
    // petits villages anonymes (pas dans les traversées de villes)
    this.villages = [...this.towns];
    let s = 280 + rng() * 200;
    while (s < L - 300) {
      const B = this.biomeAt(s);
      const near = this.villages.some((v) => Math.abs(v.s - s) < 260) || this.inUrban(s, 140);
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

    // contrôles routiers (jamais dans la faille ni près d'un péage) ; certains demandent les papiers
    this.checkpoints = [];
    const nCp = Math.max(1, Math.round(L / 3800 + (rng() - 0.5)));
    for (let k = 0; k < nCp; k++) {
      for (let tries = 0; tries < 20; tries++) {
        const cs = L * rand(rng, 0.25, 0.85);
        const ok = !this.biomeAt(cs).cliff && !this.inUrban(cs, 60) && !this.checkpoints.some((c) => Math.abs(c.s - cs) < 500) && !this.villages.some((v) => Math.abs(v.s - cs) < 90) && !this.tolls.some((t) => Math.abs(t.s - cs) < 400);
        if (ok) { this.checkpoints.push({ s: cs, done: false, warned: false, open: 0, papers: rng() < 0.45, wait: 0, cleared: false }); break; }
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
    this.potholes = this.potholes.filter((p) => !(this.isDual(p.s) && rng() < 0.7) && !this.islandW(p.s, 14) && !this.lights.some((l) => Math.abs(l.s - p.s) < 20));
    this.potholes.sort((a, b) => a.s - b.s);

    // champs autour des villages (le sol est labouré sous les rangs)
    this.fields = [];
    const span = (v) => (v.named ? 118 : 52);
    const addField = (s0, len, side, crop) => {
      const o0 = rand(rng, 14, 24), o1 = o0 + rand(rng, 18, crop === 'teak' ? 70 : 42);
      const f = { s0, s1: s0 + len, side, o0, o1, crop };
      const clash = this.fields.some((g) => g.side === side && g.s0 < f.s1 + 8 && f.s0 < g.s1 + 8)
        || this.rivers.some((r) => Math.abs(r.s - (s0 + len / 2)) < 90)
        || this.biomeAt(s0).cliff || this.biomeAt(s0 + len).cliff || s0 < 60 || f.s1 > L - 60;
      if (!clash) this.fields.push(f);
    };
    for (const v of this.villages) {
      const B = this.biomeAt(v.s);
      const crops = B.crops || {};
      if (!Object.keys(crops).length) continue;
      const n = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const dir = rng() < 0.5 ? -1 : 1;
        const len = rand(rng, 26, 60);
        const s0 = v.s + dir * (span(v) + 12 + rng() * 120) - (dir < 0 ? len : 0);
        addField(s0, len, rng() < 0.5 ? -1 : 1, weighted(rng, crops));
      }
    }
    for (let ps = 200; ps < L - 200; ps += 260) {
      const B = this.biomeAt(ps);
      if (B.plantation && rng() < 0.5) addField(ps + rng() * 80, rand(rng, 60, 120), rng() < 0.5 ? -1 : 1, B.plantation);
      else if (B.crops && Object.keys(B.crops).length && rng() < 0.35) addField(ps + rng() * 80, rand(rng, 25, 50), rng() < 0.5 ? -1 : 1, weighted(rng, B.crops));
    }

    // ralentisseurs à l'entrée et à la sortie des agglomérations
    this.bumps = [];
    // sur la vraie N1, les dos-d'âne se concentrent dans certaines villes ; rares en rase campagne et dans le nord
    for (const v of this.villages) {
      const key = this.biomeKey(clamp(v.s, 0, L));
      const south = key === 'urbain' || key === 'cote' || key === 'plaine' || key === 'plateaux';
      const p = v.named ? (south ? 0.75 : 0.45) : (south ? 0.2 : 0.08);
      if (rng() < p) for (const d of [-1, 1]) this.bumps.push({ s: v.s + d * (span(v) + 6), hit: false });
    }
    this.bumps = this.bumps.filter((b) => !this.tolls.some((t) => Math.abs(t.s - b.s) < 60) && !this.isDual(b.s) && !this.islandW(b.s, 30));
    this.bumps.sort((a, b) => a.s - b.s);

    // traversées d'animaux près des villages
    this.crossings = [];
    for (const v of this.villages) {
      if (rng() < 0.55) {
        const B = this.biomeAt(v.s);
        this.crossings.push({ s: v.s + rand(rng, -60, 60), kind: B.huts && rng() < 0.5 ? 'zebu' : 'goat', done: false });
      }
    }

    // imprévus de l'étape : camion en panne (branchages posés sur la chaussée), troupeau de zébus, route inondée
    const okSpot = (cs, gap = 160) => !this.biomeAt(cs).cliff && !this.isDual(cs) && !this.islandW(cs, 60) && !this.lights.some((l) => Math.abs(l.s - cs) < 80) && !this.villages.some((v) => Math.abs(v.s - cs) < gap)
      && !this.tolls.some((t) => Math.abs(t.s - cs) < 300) && !this.checkpoints.some((c) => Math.abs(c.s - cs) < 300) && !this.bridgeAt(cs);
    const spot = (a, b, gap) => { for (let k = 0; k < 30; k++) { const cs = L * rand(rng, a, b); if (okSpot(cs, gap)) return cs; } return null; };
    this.broken = null;
    if (rng() < 0.6) { const bs = spot(0.2, 0.8, 140); if (bs) this.broken = { s: bs, spawned: false }; }
    const north = st.zones.some((z) => ['centre', 'kabye', 'savane', 'sahel'].includes(z.biome));
    this.herd = null;
    if (north && rng() < 0.65) {
      for (let k = 0; k < 30 && !this.herd; k++) {
        const hs = L * rand(rng, 0.15, 0.85);
        if (okSpot(hs, 60) && ['centre', 'kabye', 'savane', 'sahel'].includes(this.biomeKey(hs)) && (!this.broken || Math.abs(this.broken.s - hs) > 600)) this.herd = { s: hs };
      }
      if (this.herd) this.crossings.push({ s: this.herd.s, kind: 'herd', done: false });
    }
    this.floods = [];
    if (this.weather === 'rain') {
      const n = 1 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const fs = spot(0.15, 0.9, 40);
        if (fs && !this.floods.some((f) => Math.abs(f.s - fs) < 400) && (!this.broken || Math.abs(this.broken.s - fs) > 200)) this.floods.push({ s: fs, len: rand(rng, 18, 34), hit: false });
      }
    }
    this.potholes = this.potholes.filter((p) => !this.floods.some((f) => Math.abs(f.s - p.s) < f.len / 2 + 2));

    // messages au fil de la route
    this.notes = [];
    for (const v of this.towns) this.notes.push({ s: v.s - 110, text: `Bienvenue à ${v.name}`, kind: 'town' });
    if (st.landmark) {
      const zi = st.zones.findIndex((z) => BIOMES[z.biome].cliff);
      const fs = zi > 0 ? this.boundaries[zi - 1] : 0;
      this.faille = { s: fs, end: this.boundaries[zi] };
      this.notes.push({ s: fs - 120, text: `${st.landmark} : ${this.rev ? 'forte descente' : 'forte montée'}, ligne continue, interdit de doubler`, kind: 'landmark' });
    }
    for (const c of this.checkpoints) this.notes.push({ s: c.s - 260, text: 'Contrôle routier dans 250 m : passe sous 20 km/h', kind: 'warn' });
    for (const t of this.tolls) this.notes.push({ s: t.s - 320, text: `Péage ${deName(t.name)} dans 300 m : arrêt obligatoire, 500 F`, kind: 'warn' });
    for (const f of this.fuelStops) this.notes.push({ s: f.s - 220, text: 'Vendeuse d’essence à 200 m : arrête-toi sur le bas-côté droit', kind: 'fuel' });
    if (this.broken) this.notes.push({ s: this.broken.s - 230, text: 'Branchages sur la chaussée : un camion est en panne sur ta voie', kind: 'warn' });
    if (this.herd) this.notes.push({ s: this.herd.s - 210, text: 'Troupeau de zébus sur la route : ralentis, klaxonne', kind: 'warn' });
    for (const f of this.floods) this.notes.push({ s: f.s - f.len / 2 - 160, text: 'Route inondée après l’averse : traverse au pas', kind: 'warn' });
    for (const l of this.lights) this.notes.push({ s: l.s - 150, text: 'Feux tricolores : arrête-toi au rouge', kind: 'info', soft: true });
    for (const i of this.islands) this.notes.push({ s: i.s - 140, text: 'Rond-point : contourne le terre-plein par la droite', kind: 'info' });
    if (this.dual.length && this.dual[0][0] < 40) this.notes.push({ s: 30, text: 'Boulevard à 2x2 voies : la voie de gauche sert à doubler', kind: 'info' });
    for (const r of this.rivers) if (r.name) this.notes.push({ s: r.s - 90, text: `Pont sur le ${r.name}`, kind: 'town' });
    for (const v of this.villages) if (!v.named) this.notes.push({ s: v.s - span(v) - 60, text: 'Village : ralentisseurs, enfants et animaux', kind: 'info', soft: true });
    this.notes.sort((a, b) => a.s - b.s);
    for (const nt of this.notes) nt.shown = false;
  }

  /* ------------------------------------------------------------ traversées de villes (cities.js) */
  cityLayout() {
    const L = this.length;
    this.zones = cityZones(this);
    this.dual = []; this.lights = []; this.islands = []; this.urban = []; this.hills = [];
    const rng = (a, b) => [Math.min(a, b), Math.max(a, b)];
    for (const z of this.zones) {
      const P = z.plan;
      for (const [a, b] of P.dual || []) this.dual.push(rng(z.sOf(a), z.sOf(b)));
      for (const at of P.lights || []) this.lights.push({ s: z.sOf(at), phase: (at * 37) % 20, ran: false });
      for (const r of P.roundabouts || []) this.islands.push({ s: z.sOf(r.at), R: 5.2, monument: r.monument, city: z.name });
      for (const [a, b] of P.urban || []) this.urban.push({ r: rng(z.sOf(a), z.sOf(b)), zone: z });
      for (const h of P.hills || []) this.hills.push({ r: rng(z.sOf(h.from), z.sOf(h.to)), side: z.sideSign(h.side), h: h.h, at: h.at });
    }
    // on garde ce qui tombe sur la route jouée
    const inside = (s) => s > -95 && s < L + 225;
    this.lights = this.lights.filter((l) => inside(l.s) && !this.tolls.some((t) => Math.abs(t.s - l.s) < 120));
    this.islands = this.islands.filter((i) => i.s > 30 && i.s < L + 180 && !this.rivers.some((r) => Math.abs(r.s - i.s) < 60));
  }
  isDual(s) { for (const [a, b] of this.dual) if (s >= a && s <= b) return true; return false; }
  inUrban(s, pad = 0) { for (const u of this.urban) if (s >= u.r[0] - pad && s <= u.r[1] + pad) return u; return null; }
  // demi-largeur occupée par le terre-plein d'un rond-point à l'abscisse s (0 hors rond-point)
  islandW(s, pad = 0) {
    for (const i of this.islands) { const d = Math.abs(s - i.s); if (d < i.R + pad) return pad ? 1 : Math.sqrt(Math.max(0, i.R * i.R - d * d)); }
    return 0;
  }
  islandAt(s) { for (const i of this.islands) if (Math.abs(s - i.s) < i.R + 9) return i; return null; }
  // goudron : la chaussée, l'anneau d'un rond-point
  pavedHalf(s) {
    const i = this.islandAt(s);
    if (i) { const d = Math.abs(s - i.s); return Math.max(HALF_ROAD + 0.4, Math.sqrt(Math.max(0, (i.R + 8) ** 2 - d * d))); }
    return HALF_ROAD + 0.4;
  }
  // feu tricolore : 0 vert, 1 orange, 2 rouge (cycle de 22 s)
  lightState(l, time) {
    const t = ((time + l.phase) % 22 + 22) % 22;
    return t < 11 ? 0 : t < 14 ? 1 : 2;
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
    const shoulderH = (i, off) => {
      const a = Math.abs(off);
      if (a > 5.5 && this.bridgeAt(this.sAt(i))) return this.py[i] - 2.6; // poutre latérale du pont
      return this.py[i] - (a > HALF_ROAD + 0.1 ? 0.12 : 0.02);
    };
    const shColor = (i, off, out) => {
      if (this.bridgeAt(this.sAt(i))) { out.copy(CONCRETE); return; }
      shoulderColor(i, off, out);
    };
    g.add(this.ribbon(rowsAll(1), [-SHOULDER, -5.5, -HALF_ROAD], shoulderH, shColor));
    g.add(this.ribbon(rowsAll(1), [HALF_ROAD, 5.5, SHOULDER], shoulderH, shColor));

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
      if (rel > 1.5 && this.cliff[i] > 0) out.lerp(_col.copy(ROCK0).lerp(ROCK1, noise2(wx * 0.1, wz * 0.1)), smoothstep(1.5, 6, rel) * Math.min(1, this.cliff[i] * 1.5) * (Math.abs(off) < 40 ? 1 : 0.4));
      const Bm = BIOMES[m.t < 0.5 ? m.a : m.b];
      const sh = BIOME_COLORS[m.t < 0.5 ? m.a : m.b].sh;
      // latérite à nu
      if (Bm.bare && noise2(wx * 0.045 + 9, wz * 0.045 + 3) > 1 - Bm.bare * 0.55) out.lerp(sh, 0.55);
      // brûlis de saison sèche
      if (Bm.burnt) {
        const b = noise2(wx * 0.014 + 31, wz * 0.014 - 7);
        const th = 1 - Bm.burnt * 0.55;
        if (b > th) out.lerp(CHAR, Math.min(0.85, (b - th) * 9));
        else if (b > th - 0.04) out.lerp(ASH, 0.35);
      }
      // terrasses kabyè : murets de pierre sur les pentes
      if (Bm.terraces && rel > 2.5) {
        const fr = ((y / 1.7) % 1 + 1) % 1;
        if (fr < 0.22) out.lerp(STONE, 0.7); else out.lerp(SOIL_DRY, 0.25);
      }
      // champs labourés
      const fl = this.fieldAt(s, off);
      if (fl) out.lerp(fl.crop === 'millet' ? SOIL_DRY : SOIL, fl.crop === 'teak' ? 0.25 : 0.7);
      // berges boueuses
      if (this.rivers.length && rel < -3) out.lerp(MUD, smoothstep(-3, -6, rel));
      if (Math.abs(off) < 9) out.lerp(BIOME_COLORS[m.a].sh, 0.35);
    };
    const rightOffs = TERRAIN_OFFS;
    const leftOffs = TERRAIN_OFFS.map((o) => -o).reverse();
    const tRows = rowsAll(2);
    g.add(this.ribbon(tRows, leftOffs, (i, off) => this.terrainH(i, off), terrainColor));
    g.add(this.ribbon(tRows, rightOffs, (i, off) => this.terrainH(i, off), terrainColor));

    for (const r of this.rivers) g.add(this.riverMesh(r));
    // marquage : pointillés au centre (ligne continue dans la faille), lignes de rive
    g.add(this.markings(inFaille));
    g.add(this.potholeMesh());
    if (this.bumps.length) g.add(this.bumpMesh());
    for (const f of this.floods) g.add(this.floodMesh(f));
    for (const [a, b] of this.dual) g.add(this.dualMesh(a, b));
    for (const u of this.urban) if (u.zone.plan.gutters) g.add(this.gutterMesh(u.r[0], u.r[1]));
    for (const i of this.islands) g.add(this.islandMesh(i));
    return g;
  }

  // rivière (plan d'eau perpendiculaire), parapets en béton et piles du pont
  riverMesh(r) {
    const grp = new THREE.Group();
    const f = this.sample(r.s);
    const cx = f.x, cz = f.z, y0 = f.y - r.depth + 1.1;
    const fx = Math.sin(f.h), fz = Math.cos(f.h), rx = -Math.cos(f.h), rz = Math.sin(f.h);
    const W = r.w / 2 + 2, Lr = 190;
    const pts = [[-W, -Lr], [W, -Lr], [-W, Lr], [W, Lr]].map(([a, b]) => [cx + fx * a + rx * b, y0, cz + fz * a + rz * b]);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute([...pts[0], ...pts[2], ...pts[1], ...pts[1], ...pts[2], ...pts[3]], 3));
    wg.computeVertexNormals();
    const water = new THREE.Mesh(wg, WATER_MAT);
    water.receiveShadow = true;
    grp.add(water);
    // parapets
    const pos = [];
    const i0 = Math.floor(this.idx(r.s - r.w / 2 - 15)), i1 = Math.ceil(this.idx(r.s + r.w / 2 + 15));
    for (const side of [-1, 1]) {
      for (let i = i0; i < i1; i++) {
        for (const [o1, o2] of [[5.2, 5.2], [5.5, 5.5]]) {
          const off = side * o1;
          const a = [this.px[i] - Math.cos(this.h[i]) * off, this.py[i] - 0.05, this.pz[i] + Math.sin(this.h[i]) * off];
          const b = [this.px[i + 1] - Math.cos(this.h[i + 1]) * off, this.py[i + 1] - 0.05, this.pz[i + 1] + Math.sin(this.h[i + 1]) * off];
          const H = 0.95;
          pos.push(...a, ...b, a[0], a[1] + H, a[2], ...b, b[0], b[1] + H, b[2], a[0], a[1] + H, a[2]);
          void o2;
        }
        const offA = side * 5.2, offB = side * 5.5;
        const top = (ii, off) => [this.px[ii] - Math.cos(this.h[ii]) * off, this.py[ii] + 0.9, this.pz[ii] + Math.sin(this.h[ii]) * off];
        pos.push(...top(i, offA), ...top(i + 1, offA), ...top(i, offB), ...top(i + 1, offA), ...top(i + 1, offB), ...top(i, offB));
      }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    pg.computeVertexNormals();
    const para = new THREE.Mesh(pg, CONCRETE_MAT.clone());
    para.material.side = THREE.DoubleSide;
    para.castShadow = true;
    grp.add(para);
    // piles
    for (let ps = r.s - r.w / 2; ps <= r.s + r.w / 2 + 0.1; ps += r.w / 2) {
      for (const off of [-3, 3]) {
        const p = this.toWorld(ps, off, new THREE.Vector3());
        const pil = new THREE.Mesh(new THREE.BoxGeometry(1.1, r.depth + 1, 1.6), CONCRETE_MAT);
        pil.position.set(p.x, p.y - (r.depth + 1) / 2 - 0.2, p.z);
        pil.rotation.y = this.headingAt(ps);
        grp.add(pil);
      }
    }
    return grp;
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
    const mesh = new THREE.Mesh(geo, TERRAIN_MAT);
    mesh.receiveShadow = true;
    return mesh;
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
    // lignes d'arrêt des feux tricolores
    for (const l of this.lights) {
      const i = Math.floor(this.idx(l.s - 3));
      // passage piéton (bandes blanches) à la hauteur de la ligne d'arrêt
      if (i > 0 && i < this.n - 3) for (let x = -3.4; x <= 3.5; x += 1.0) { quad(i, i + 1, x, 0.5, 0.03); quad(i + 1, i + 2, x, 0.5, 0.03); }
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

  // ralentisseurs peints en jaune et noir
  bumpMesh() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 16;
    const gx = c.getContext('2d');
    for (let k = 0; k < 8; k++) { gx.fillStyle = k % 2 ? '#1b1a17' : '#e8c22a'; gx.fillRect(k * 16, 0, 16, 16); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.CylinderGeometry(0.6, 0.6, 8, 10, 1, false, 0, Math.PI);
    geo.rotateZ(Math.PI / 2); // demi-cylindre couché en travers de la route
    geo.scale(1, 0.22, 1);
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const im = new THREE.InstancedMesh(geo, mat, this.bumps.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    this.bumps.forEach((b, k) => {
      this.toWorld(b.s, 0, p);
      q.setFromAxisAngle(up, this.headingAt(b.s));
      m4.compose(p, q, one);
      im.setMatrixAt(k, m4);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.receiveShadow = true;
    return im;
  }

  // flaque boueuse en travers de la chaussée (bords irréguliers)
  floodMesh(f) {
    const pos = [];
    const N = 14, M = 10;
    const pt = (u, v) => {
      const s = f.s + (u - 0.5) * f.len * (0.75 + 0.25 * Math.sin(v * 9 + f.s));
      const w = (v - 0.5) * 2 * (HALF_ROAD + 1.4) * (0.82 + 0.18 * Math.sin(u * 7 + f.s * 0.3));
      const p = this.toWorld(s, w, new THREE.Vector3());
      return [p.x, p.y + 0.04, p.z];
    };
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = pt(i / N, j / M), b = pt((i + 1) / N, j / M), c = pt(i / N, (j + 1) / M), d = pt((i + 1) / N, (j + 1) / M);
      pos.push(...a, ...c, ...b, ...b, ...c, ...d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: '#6b5636', specular: '#cfd8e0', shininess: 80, transparent: true, opacity: 0.88, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.receiveShadow = true;
    return m;
  }
  rowsIn(a, b, step = 1) {
    const rows = [];
    const i0 = Math.max(0, Math.floor(this.idx(a))), i1 = Math.min(this.n - 1, Math.ceil(this.idx(b)));
    for (let i = i0; i <= i1; i += step) rows.push(i);
    return rows;
  }
  // boulevard : terre-plein central, chaussée d'en face (2 voies), marquages
  dualMesh(a, b) {
    const grp = new THREE.Group();
    const rows = this.rowsIn(a, b);
    if (rows.length < 2) return grp;
    const asph = (i, off, out) => { out.copy(ASPH0).lerp(ASPH1, noise2(this.sAt(i) * 0.05, off * 0.4)); };
    const ra = this.ribbon(rows, [-14.4, -10.3, -6.3], (i) => this.py[i] - 0.01, asph);
    ra.material = ROAD2_MAT; grp.add(ra);
    const curb = new THREE.Color('#d9d4c6'), grass = new THREE.Color('#6d8f3c');
    const mid = this.ribbon(rows, [-6.3, -6.15, -4.45, -4.3], (i, off) => this.py[i] + (Math.abs(off + 5.3) < 0.9 ? 0.22 : 0.02), (i, off, out) => { out.copy(Math.abs(off + 5.3) < 0.9 ? grass : curb); });
    mid.material = ROAD2_MAT; grp.add(mid);
    // bas-côté au-delà de la chaussée d'en face
    const sh = this.ribbon(rows, [-17, -14.4], (i) => this.py[i] - 0.1, (i, off, out) => { out.copy(BIOME_COLORS[this.biomeKey(clamp(this.sAt(i), 0, this.length))].sh); });
    sh.material = ROAD2_MAT; grp.add(sh);
    // marquages de la chaussée d'en face
    const pos = [];
    const quad = (i0, i1, off, w) => {
      const p = [];
      for (const i of [i0, i1]) { const ch = Math.cos(this.h[i]), s2 = Math.sin(this.h[i]); for (const o of [off - w / 2, off + w / 2]) p.push([this.px[i] - ch * o, this.py[i] + 0.02, this.pz[i] + s2 * o]); }
      pos.push(...p[0], ...p[1], ...p[2], ...p[1], ...p[3], ...p[2]);
    };
    for (let k = 0; k < rows.length - 1; k++) {
      const i = rows[k], s0 = this.sAt(i);
      if (((s0 % 10) + 10) % 10 < 4) quad(i, i + 1, -10.3, 0.15);
      quad(i, i + 1, -14.0, 0.12); quad(i, i + 1, -6.65, 0.12);
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    mg.computeVertexNormals();
    grp.add(new THREE.Mesh(mg, new THREE.MeshLambertMaterial({ color: '#e8e4d6', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    return grp;
  }
  // caniveaux ouverts en béton de part et d'autre de la route en ville
  gutterMesh(a, b) {
    const grp = new THREE.Group();
    const rows = this.rowsIn(Math.max(a, -88), Math.min(b, this.length + 218));
    if (rows.length < 2) return grp;
    const lip = new THREE.Color('#b8b1a3'), dark = new THREE.Color('#3a352e');
    for (const side of [-1, 1]) {
      const offs = [7.0, 7.12, 7.78, 7.9].map((o) => o * side);
      if (side < 0) offs.reverse();
      // tronçons continus (interrompus aux ponts, aux ronds-points et le long du terre-plein)
      const okRow = (i) => !(side < 0 && this.isDual(this.sAt(i))) && !this.bridgeAt(this.sAt(i)) && !this.islandAt(this.sAt(i));
      let seg = [];
      const flush = () => {
        if (seg.length > 2) {
          const m = this.ribbon(seg, offs, (i, off) => this.py[i] + (Math.abs(Math.abs(off) - 7.45) < 0.3 ? -0.45 : -0.02), (i, off, out) => { out.copy(Math.abs(Math.abs(off) - 7.45) < 0.3 ? dark : lip); });
          m.material = ROAD2_MAT;
          grp.add(m);
        }
        seg = [];
      };
      for (const i of rows) { if (okRow(i)) seg.push(i); else flush(); }
      flush();
    }
    return grp;
  }
  // rond-point : anneau de goudron et terre-plein central bordé de blanc et rouge
  islandMesh(isl) {
    const grp = new THREE.Group();
    const f = this.sample(isl.s);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(isl.R + 8, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#3f3e3d', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    ring.position.set(f.x, f.y + 0.012, f.z);
    ring.receiveShadow = true;
    grp.add(ring);
    const curb = new THREE.Mesh(new THREE.CylinderGeometry(isl.R, isl.R, 0.32, 40), new THREE.MeshLambertMaterial({ color: '#e9e6dc' }));
    curb.position.set(f.x, f.y + 0.16, f.z);
    grp.add(curb);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(isl.R - 0.25, isl.R - 0.25, 0.36, 40), new THREE.MeshLambertMaterial({ color: '#5f8a36' }));
    top.position.set(f.x, f.y + 0.18, f.z);
    grp.add(top);
    isl.pos = new THREE.Vector3(f.x, f.y + 0.36, f.z);
    isl.h = f.h;
    return grp;
  }
  floodAt(s) { for (const f of this.floods) if (Math.abs(s - f.s) < f.len / 2) return f; return null; }

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

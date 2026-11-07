import * as THREE from 'three';
import { personGeo, policeGeo, makeCharMat } from './characters.js';
import { clamp, smoothstep } from './util.js';

/*
 * Scènes jouées autour du taxi arrêté : changement de roue, moteur qui chauffe, contrôle des papiers,
 * passager malade, pause au village. Tout est calculé dans le repère du taxi (x > 0 côté conducteur,
 * à gauche ; z > 0 vers l'avant) et piloté par une progression p de 0 à 1 : la scène peut s'interrompre
 * et reprendre sans état caché.
 */
const DRIVER = 5; // homme en casquette (catalogue PEOPLE)
const PAX = [0, 2, 9, 11, 4, 10];
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

// position le long d'un chemin [p, x, z] (interpolation linéaire), avec direction de marche
function along(path, p, out) {
  let k = 0;
  while (k < path.length - 2 && p > path[k + 1][0]) k++;
  const [p0, x0, z0] = path[k], [p1, x1, z1] = path[Math.min(k + 1, path.length - 1)];
  const t = p1 > p0 ? clamp((p - p0) / (p1 - p0), 0, 1) : 1;
  out.set(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t);
  const moving = t > 0 && t < 1 && (x1 !== x0 || z1 !== z0);
  return { moving, dx: x1 - x0, dz: z1 - z0 };
}

function actor(geo) {
  const m = new THREE.Mesh(geo, makeCharMat());
  m.castShadow = true;
  m.visible = false;
  return m;
}

export class Scenes {
  constructor() {
    this.root = null;
    this.taxi = null;
  }

  // (re)construit les acteurs et accessoires sur le taxi courant (après chaque passage au garage)
  attach(taxi, spec) {
    if (this.root) this.root.parent?.remove(this.root);
    this.taxi = taxi;
    this.spec = spec;
    const root = (this.root = new THREE.Group());
    taxi.group.add(root);
    this.driver = actor(personGeo(DRIVER));
    this.pax = PAX.slice(0, 3).map((v) => actor(personGeo(v)));
    this.gendarme = actor(policeGeo());
    root.add(this.driver, this.gendarme, ...this.pax);
    // roue de secours (même maillage que les roues du taxi) et roue crevée posée au sol
    const wg = taxi.wheels[0].geometry;
    const mat = taxi.wheels[0].material;
    this.spare = new THREE.Mesh(wg, mat);
    this.spare.visible = false;
    root.add(this.spare);
    this.jack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.34), new THREE.MeshLambertMaterial({ color: '#c8322b' }));
    this.jack.visible = false;
    root.add(this.jack);
    // bidon d'eau jaune et papiers du véhicule
    this.bidon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.14), new THREE.MeshLambertMaterial({ color: '#e8c22a' }));
    this.bidon.visible = false;
    root.add(this.bidon);
    this.papers = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.14), new THREE.MeshLambertMaterial({ color: '#2f78a8' }));
    this.papers.visible = false;
    root.add(this.papers);
    // vapeur du capot
    const steamMat = new THREE.MeshLambertMaterial({ color: '#f2f2f2', transparent: true, opacity: 0.6, depthWrite: false });
    this.steam = Array.from({ length: 10 }, (_, k) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), steamMat.clone());
      m.visible = false;
      m.userData.t = k / 10;
      root.add(m);
      return m;
    });
    // roue avant droite (côté bas-côté) : x < 0, z > 0
    this.frIdx = taxi.wheels.findIndex((w) => w.position.x < 0 && w.position.z > 0);
    this.frHome = taxi.wheels[this.frIdx].position.clone();
    this.cam = null;
  }

  hideAll() {
    for (const m of [this.driver, this.gendarme, this.spare, this.jack, this.bidon, this.papers, ...this.pax, ...this.steam]) m.visible = false;
  }

  // place un personnage (pieds au sol) et l'oriente vers sa marche ou vers une cible
  put(m, pos, mv, faceTo, dt, reach = 0) {
    m.visible = true;
    m.position.copy(pos);
    const u = m.material.userData.u;
    u.uWalk.value += ((mv.moving ? 1 : 0) - u.uWalk.value) * Math.min(1, dt * 8);
    if (mv.moving) u.uPhase.value += dt * 6;
    u.uReach.value += (reach - u.uReach.value) * Math.min(1, dt * 6);
    let dx = mv.dx, dz = mv.dz;
    if (!mv.moving && faceTo) { dx = faceTo.x - pos.x; dz = faceTo.z - pos.z; }
    if (dx || dz) m.rotation.y = Math.atan2(dx, dz);
    m.rotation.x = 0;
  }

  /*
   * ctx : { dt, time, flat (0..1 ou null), flatOn, heat (bool), hot (bool), papers (0..1 ou null),
   *         sick (0..1 ou null), pause (0..1 ou null), nPax }
   * renvoie un cadrage de caméra (repère du taxi) quand une scène se joue
   */
  update(ctx) {
    if (!this.taxi) return null;
    const { dt } = ctx;
    const T = this.taxi, W = T.wheels[this.frIdx];
    this.hideAll();
    let cam = null;
    // roue crevée : aplatie tant qu'elle n'est pas changée
    W.position.copy(this.frHome);
    W.scale.set(1, ctx.flatOn ? 0.8 : 1, ctx.flatOn ? 1.08 : 1);
    if (ctx.flatOn) W.position.y -= 0.07;
    W.visible = true;
    const nPax = Math.min(3, ctx.nPax || 0);

    if (ctx.flat != null) {
      const p = ctx.flat;
      const rack = T.rackY || 2;
      // chauffeur : descend, va chercher la roue de secours à l'arrière, travaille à la roue, remonte
      const dPath = [[0, 0.75, 0.35], [0.05, 1.45, 0.35], [0.12, 1.45, -2.9], [0.18, -1.45, -2.9], [0.26, -1.55, 1.15], [0.3, -1.6, 1.75], [0.9, -1.6, 1.75], [0.95, -1.5, 2.8], [0.99, 1.45, 2.6], [1, 1.45, 0.35]];
      const mv = along(dPath, p, _a);
      const working = p > 0.3 && p < 0.9;
      this.put(this.driver, _a, mv, working ? _b.set(-0.9, 0, 1.75) : null, dt, working ? 0.55 + 0.35 * Math.sin(ctx.time * 7) : p > 0.18 && p < 0.3 ? 0.7 : 0);
      if (p < 0.02 || p > 0.995) this.driver.visible = false;
      // passagers : descendent sur le bas-côté et attendent en discutant
      for (let k = 0; k < nPax; k++) {
        const spot = [-3.1 - (k % 2) * 0.8, -1.2 - k * 1.1];
        const path = [[0, -0.6, -0.5], [0.06 + k * 0.02, -1.3, -0.5], [0.14 + k * 0.02, spot[0], spot[1]], [0.9, spot[0], spot[1]], [0.97, -1.3, -0.5], [1, -0.6, -0.5]];
        const pv = along(path, p, _a);
        this.put(this.pax[k], _a, pv, _b.set(-1.6, 0, 1.4), dt, k === 0 ? 0.3 + 0.3 * Math.sin(ctx.time * 9) : 0);
        if (p < 0.04 || p > 0.99) this.pax[k].visible = false;
      }
      // cric et levage de la caisse
      const lift = smoothstep(0.32, 0.4, p) * (1 - smoothstep(0.84, 0.9, p));
      if (p > 0.3 && p < 0.92) { this.jack.visible = true; this.jack.position.set(-0.72, 0.11 + lift * 0.08, 1.75); }
      T.body.position.y += lift * 0.1;
      T.body.rotation.z -= lift * 0.06;
      // roue crevée : dévissée, sortie, couchée au sol
      if (p > 0.42) {
        const out = smoothstep(0.42, 0.5, p), down = smoothstep(0.5, 0.58, p);
        W.position.set(this.frHome.x - out * 0.9 - down * 0.5, this.frHome.y + lift * 0.1 - down * (this.frHome.y - 0.13), this.frHome.z - down * 0.7);
        W.rotation.z = down * Math.PI / 2;
        W.scale.set(1, 0.8, 1.08);
        if (p > 0.6) {
          // la roue de secours prend sa place ; la crevée remontera sur la galerie
          W.visible = p < 0.95;
        }
      } else W.rotation.z = 0;
      // roue de secours : sur la galerie, portée par le chauffeur, appuyée au taxi, puis montée
      this.spare.visible = p < 0.995;
      if (p < 0.18) { this.spare.position.set(0, rack + 0.18, -1.6); this.spare.rotation.set(0, 0, Math.PI / 2); }
      else if (p < 0.3) {
        along(dPath, p, _a);
        this.spare.position.set(_a.x, 0.75, _a.z + 0.35);
        this.spare.rotation.set(0, 0, 0);
      } else if (p < 0.6) { this.spare.position.set(-1.5, 0.4, 1.0); this.spare.rotation.set(0, 0, 0.12); }
      else {
        const k = smoothstep(0.6, 0.72, p);
        this.spare.position.set(-1.5 + k * (this.frHome.x + 1.5), 0.4 + lift * 0.1, 1.0 + k * (this.frHome.z - 1.0));
        this.spare.rotation.set(0, 0, 0.12 * (1 - k));
      }
      if (p >= 0.995) { W.position.copy(this.frHome); W.rotation.z = 0; W.scale.set(1, 1, 1); W.visible = true; }
      cam = { pos: [-6.8, 2.3, 4.6], look: [-1.1, 0.7, 0.6] };
    } else W.rotation.z = 0;

    if (ctx.hot || ctx.heat) {
      // vapeur qui sort du capot
      for (const m of this.steam) {
        m.userData.t = (m.userData.t + dt * 0.55) % 1;
        const t = m.userData.t;
        m.visible = true;
        m.position.set(Math.sin(t * 9 + m.id) * 0.25, 1.05 + t * 1.8, 1.7 + t * 0.4);
        m.scale.setScalar(0.5 + t * 1.6);
        m.material.opacity = (ctx.hot ? 0.65 : 0.35) * (1 - t);
      }
    }
    if (ctx.hot && ctx.stopped) {
      // le chauffeur descend et verse de l'eau dans le radiateur
      const p = clamp(ctx.hotT / 3.5, 0, 1);
      const mv = along([[0, 0.75, 0.35], [0.25, 1.45, 0.35], [0.7, 1.0, 2.75], [1, 0.25, 2.75]], p, _a);
      this.put(this.driver, _a, mv, p >= 1 ? _b.set(0, 0, 1.6) : null, dt, p >= 1 ? 0.9 : 0);
      if (p < 0.03) this.driver.visible = false;
      if (p >= 0.7) {
        this.bidon.visible = true;
        this.bidon.position.set(_a.x - 0.15, 1.15 + (p >= 1 ? 0.1 * Math.sin(ctx.time * 3) : 0), _a.z - 0.45);
        this.bidon.rotation.x = p >= 1 ? -0.9 : 0;
      }
      cam = { pos: [4.2, 2.4, 7.2], look: [0.2, 1.0, 1.6] };
    }

    if (ctx.papers != null) {
      // le gendarme vient à la vitre du conducteur, prend les papiers, les rend
      const p = ctx.papers;
      const mv = along([[0, 2.6, 5.5], [0.3, 1.35, 0.6], [0.85, 1.35, 0.6], [1, 2.6, 4.5]], p, _a);
      const atWin = p > 0.3 && p < 0.85;
      this.put(this.gendarme, _a, mv, atWin ? _b.set(0.6, 0, 0.5) : null, dt, atWin ? 0.85 : 0);
      if (atWin) {
        this.papers.visible = true;
        const k = smoothstep(0.35, 0.45, p) * (1 - smoothstep(0.72, 0.8, p));
        this.papers.position.set(1.15 - (1 - k) * 0.3, 1.25, 0.6 + k * 0.05);
        this.papers.rotation.y = 0.3;
      }
      cam = { pos: [5.6, 2.3, 3.4], look: [1.0, 1.1, 0.5] };
    }

    if (ctx.sick != null || ctx.pause != null) {
      const p = ctx.sick ?? ctx.pause;
      const n = ctx.sick != null ? 1 : Math.max(1, nPax);
      for (let k = 0; k < n; k++) {
        const dest = ctx.sick != null ? [-2.9, -0.2] : [-4.2 - k * 0.9, -1.5 + k * 1.6];
        const pv = along([[0, -0.6, -0.5], [0.12, -1.3, -0.5], [0.35, dest[0], dest[1]], [0.85, dest[0], dest[1]], [0.97, -1.3, -0.5], [1, -0.6, -0.5]], p, _a);
        const still = p > 0.35 && p < 0.85;
        this.put(this.pax[k], _a, pv, still ? _b.set(-8, 0, dest[1]) : null, dt, still && ctx.sick != null ? 0.6 : 0);
        // passager malade : penché vers le fossé
        if (still && ctx.sick != null) this.pax[k].rotation.x = 0.35 + 0.08 * Math.sin(ctx.time * 5);
        if (p < 0.03 || p > 0.99) this.pax[k].visible = false;
      }
      cam = { pos: [-7.2, 2.2, 1.8], look: [-2.0, 0.9, -0.4] };
    }
    return cam;
  }
}

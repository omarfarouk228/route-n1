import * as THREE from 'three';
import { personGeo, makeCharMat } from './characters.js';
import { rand, pick } from './util.js';

// Vie au bord de la route : enfants qui saluent le taxi et courent à côté, passants qui lancent un mot.
// Les paroles s'affichent dans des bulles posées au-dessus des personnages (calque HTML projeté).
const KIDS = [8, 12]; // écolier en kaki, fillette en pagne (catalogue PEOPLE)
const KID_LINES = ['Taxi ! Taxi !', 'Bonne route !', 'Tonton, ça va ?', 'Bonjour chauffeur !', 'Yé yé yé !', 'Klaxonne !'];
// salutations : éwé au sud (« Woezɔ » = bienvenue, « Ŋdi » = bonjour le matin), « Alafia » au centre et au nord ; orthographe simplifiée
const GREET = {
  sud: ['Woézon !', 'Ndi na wo !', 'Bonne arrivée !', 'Chauffeur, tu vas où ?', 'Ça va un peu ?'],
  nord: ['Alafia !', 'Bonne arrivée !', 'Chauffeur, tu vas à Lomé ?', 'Ça va un peu ?', 'On dit quoi ?'],
};
const SOUTH = new Set(['urbain', 'cote', 'plaine', 'plateaux']);
const _v = new THREE.Vector3();

export class StreetLife {
  constructor(parent, road, rng, shadows, layer) {
    this.parent = parent;
    this.road = road;
    this.rng = rng;
    this.layer = layer;
    this.kids = [];
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(personGeo(KIDS[k % 2]), makeCharMat());
      m.castShadow = shadows;
      m.visible = false;
      m.scale.setScalar(0.92 + k * 0.05);
      parent.add(m);
      this.kids.push({ mesh: m, on: false });
    }
    this.villages = road.villages.map((v) => ({ s: v.s, named: v.named, done: false }));
    this.bubbles = [];
    this.greetCd = 4;
  }

  dispose() {
    for (const k of this.kids) { this.parent.remove(k.mesh); k.mesh.material.dispose(); }
    this.clearBubbles();
  }
  reset() {
    for (const k of this.kids) { k.on = false; k.mesh.visible = false; }
    for (const v of this.villages) v.done = false;
    this.clearBubbles();
  }
  clearBubbles() { for (const b of this.bubbles) b.el.remove(); this.bubbles.length = 0; }

  say(target, text, ms = 2400) {
    if (this.bubbles.some((b) => b.target === target)) return;
    if (this.bubbles.length >= 3) { this.bubbles[0].el.remove(); this.bubbles.shift(); }
    const el = document.createElement('div');
    el.className = 'bubble';
    el.textContent = text;
    this.layer.appendChild(el);
    this.bubbles.push({ el, target, t: ms / 1000 });
  }

  update(dt, P, camera, walkers) {
    const r = this.road, rng = this.rng;
    // une bande d'enfants par village, quand le taxi approche
    for (const v of this.villages) {
      if (v.done || v.s - P.s > 170 || v.s - P.s < 40) continue;
      v.done = true;
      if (rng() > (v.named ? 0.75 : 0.6) || this.kids.some((k) => k.on)) continue;
      const side = rng() < 0.6 ? 1 : -1;
      const n = 2 + Math.floor(rng() * 2);
      const s0 = v.s + rand(rng, -30, 10);
      if (r.bridgeAt(s0)) continue;
      for (let k = 0; k < n; k++) {
        const K = this.kids[k];
        Object.assign(K, { on: true, s: s0 + k * 1.3, x: side * rand(rng, 7.6, 8.8), state: 'wave', t: rand(rng, 0, 2), run: 0, said: false });
        K.mesh.visible = true;
        K.mesh.geometry = personGeo(KIDS[Math.floor(rng() * 2)]);
      }
    }
    for (const K of this.kids) {
      if (!K.on) continue;
      const u = K.mesh.material.userData.u;
      K.t += dt;
      const d = K.s - P.s;
      if (K.state === 'wave') {
        u.uWalk.value = 0;
        u.uReach.value = 0.5 + 0.5 * Math.sin(K.t * 9);
        if (!K.said && d < 45) { K.said = true; if (rng() < 0.7) this.say(K, pick(rng, KID_LINES)); }
        // le taxi passe : ils courent derrière lui quelques secondes
        if (d < 4 && Math.abs(P.v) > 1) { K.state = 'run'; K.run = rand(rng, 2.5, 4.5); }
      } else {
        K.run -= dt;
        const sp = K.run > 0 ? Math.min(4.2, Math.abs(P.v) + 0.5) : 0;
        K.s += sp * dt;
        u.uWalk.value = sp > 0.2 ? 1 : 0;
        u.uPhase.value += sp * dt * 5;
        u.uReach.value = sp > 0.2 ? 0.25 : 0.5 + 0.5 * Math.sin(K.t * 9);
      }
      if (d < -70 || d > 400) { K.on = false; K.mesh.visible = false; continue; }
      r.groundAt(K.s, K.x, K.mesh.position);
      const h = r.headingAt(K.s);
      K.mesh.rotation.y = K.state === 'run' && K.run > 0 ? h : h + Math.PI - Math.sign(K.x) * 0.7;
    }
    // un passant salue quand on passe doucement près de lui
    this.greetCd -= dt;
    if (this.greetCd <= 0 && Math.abs(P.v) < 12 && walkers) {
      const near = walkers.list.filter((w) => w.on && w.s - P.s > 6 && w.s - P.s < 28);
      if (near.length) {
        const key = r.biomeKey(Math.max(0, Math.min(r.length, P.s)));
        this.say(pick(rng, near).mesh, pick(rng, GREET[SOUTH.has(key) ? 'sud' : 'nord']));
        this.greetCd = rand(rng, 6, 12);
      } else this.greetCd = 1.5;
    }
    // bulles : projetées au-dessus de la tête
    const W = innerWidth, H = innerHeight;
    for (let n = this.bubbles.length - 1; n >= 0; n--) {
      const b = this.bubbles[n];
      b.t -= dt;
      const obj = b.target.mesh || b.target;
      if (b.t <= 0 || !obj.visible) { b.el.remove(); this.bubbles.splice(n, 1); continue; }
      _v.copy(obj.position); _v.y += 2.05;
      _v.project(camera);
      const vis = _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1;
      b.el.style.display = vis ? '' : 'none';
      if (vis) b.el.style.transform = `translate(${((_v.x + 1) / 2) * W}px, ${((1 - _v.y) / 2) * H}px) translate(-50%, -100%)`;
      b.el.style.opacity = Math.min(1, b.t * 3);
    }
  }
}

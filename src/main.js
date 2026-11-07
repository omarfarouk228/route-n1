import * as THREE from 'three';
import { CITIES, STAGES, TRAITS, PRICES, SEATS, ROOF, TANK, QUOTES, WEATHER_LABEL, makeOffers, makeHailer, weatherFor, legOf, cityAt, LEGS, bumpPid } from './data.js';
import { settle, haggle, RUSH_SPEED } from './rules.js';
import { START_CASH, loadCareer, saveCareer, vehicleSpec, UPGRADES, saveRun, loadRun, clearRun } from './career.js';
import { Roadside } from './roadside.js';
import { StreetLife } from './streetlife.js';
import { Road, SHOULDER, HALF_ROAD } from './road.js';
import { buildScenery, disposeGroup, updateLod } from './scenery.js';
import { Traffic } from './traffic.js';
import { Player } from './vehicle.js';
import { makeVehicle, makeShadowTexture, cloud as cloudGeo, branches as branchesGeo, MAT } from './models.js';
import { VEHICLES, STRIPES, loadCfg, saveCfg } from './garage.js';
import { setCapacity } from './data.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Sky, Rain, Clouds, Mountains, skyState, makeSkyState } from './sky.js';
import { BIOMES } from './data.js';
import { makeComposer } from './post.js';
import { Radio, loadPlaylist } from './radio.js';
import { Vendors } from './vendors.js';
import { Walkers } from './walkers.js';
import { CHAR_U, CHAR_MAT, armGeo, noteGeo, itemGeo, VENDOR_GOODS } from './characters.js';
import * as UI from './ui.js';
import { mulberry32, clamp, pick, fmtMoney, round50, deName } from './util.js';

/* ------------------------------------------------------------ rendu */
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const QUALITY = isTouch ? 0.6 : 1;
const SHADOWS = !isTouch;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
const MAX_PR = Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.5);
let pixelRatio = isTouch ? MAX_PR : Math.min(MAX_PR, 1.1);
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
if (SHADOWS) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#d9ebf6', 70, 470);
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 1000);
const hemi = new THREE.HemisphereLight('#eef6ff', '#6b5a3a', 1.0);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight('#fff1d6', 1.6);
scene.add(sunLight, sunLight.target);
if (SHADOWS) {
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera;
  sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 10; sc.far = 260;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.normalBias = 0.04;
}
const clouds = new Clouds(cloudGeo(), new THREE.MeshLambertMaterial({ color: '#ffffff', fog: false, emissive: '#7d8796' }));
scene.add(clouds.mesh);
const mountains = new Mountains();
scene.add(mountains.group);
const sky = new Sky();
scene.add(sky.mesh);
const rain = new Rain();
scene.add(rain.group);
const skySt = makeSkyState();
const WHITE = new THREE.Color('#ffffff');

// véhicule du joueur, reconstruit à chaque passage au garage
let garageCfg = loadCfg();
let career = loadCareer();
let taxi = null;
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.6, 5.4).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false }),
);
shadow.position.y = 0.05;
shadow.visible = !SHADOWS;
const headlight = new THREE.SpotLight('#fff2cc', 0, 95, 0.55, 0.6, 1.1);
headlight.position.set(0, 1.0, 2.2);
headlight.target.position.set(0, 0, 30);
function vehicleCfg(cfg) {
  const st = STRIPES[cfg.stripe] || STRIPES[0];
  return { model: cfg.model, body: cfg.body, s1: st[1], s2: st[2], rims: cfg.rims, rack: cfg.model === 'berline' ? cfg.rack : true, slogan: cfg.slogan, plate: cfg.plate };
}
function buildTaxi(cfg) {
  const old = taxi;
  if (old) {
    scene.remove(old.group);
    old.group.remove(shadow, headlight, headlight.target);
    old.group.traverse((o) => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.material && o.material.map) { o.material.map.dispose(); o.material.dispose(); }
    });
  }
  taxi = makeVehicle(vehicleCfg(cfg));
  taxi.group.rotation.order = 'YXZ';
  taxi.group.traverse((o) => { if (o.isMesh) o.castShadow = SHADOWS; });
  taxi.group.add(shadow, headlight, headlight.target);
  if (old) { taxi.group.position.copy(old.group.position); taxi.group.rotation.copy(old.group.rotation); }
  scene.add(taxi.group);
  const spec = vehicleSpec(cfg.model, career.up);
  setCapacity(spec);
  player.len = spec.len; player.wid = spec.wid;
  // bras de passager qui sort par la vitre pour payer les vendeuses
  const hand = new THREE.Group();
  const arm = new THREE.Mesh(armGeo(), CHAR_MAT);
  const note = new THREE.Mesh(noteGeo(), CHAR_MAT);
  hand.add(arm, note);
  const items = {};
  for (const k of new Set(VENDOR_GOODS)) { const m = new THREE.Mesh(itemGeo(k), CHAR_MAT); m.position.set(0.33, 0.06, 0); m.visible = false; items[k] = m; hand.add(m); }
  hand.visible = false;
  taxi.body.add(hand);
  taxi.hand = { group: hand, note, items, ext: 0, side: 1, y: taxi.rackY * 0.73, half: spec.wid / 2 };
}

function updateWindowHand(dt) {
  const H = taxi.hand, st = world.vendors.hand;
  const target = st ? st.extend : 0;
  H.ext += (target - H.ext) * Math.min(1, dt * 12);
  if (st) H.side = st.side;
  H.group.visible = H.ext > 0.02;
  if (!H.group.visible) return;
  // côté droit de la route = -x local du véhicule
  const sx = -H.side;
  H.group.rotation.y = sx > 0 ? 0 : Math.PI;
  H.group.position.set(sx * (H.half - 0.32 + H.ext * 0.36), H.y, clamp(st ? st.z * 0.5 : 0.2, -0.6, 0.9));
  H.note.visible = !st || st.holding === 'note';
  for (const [k, m] of Object.entries(H.items)) m.visible = !!st && st.holding === 'item' && st.kind === k;
}

// showroom du garage : plateau tournant, sol d'atelier, éclairage de studio
const showroom = new THREE.Group();
{
  const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#2b2824' }));
  floor.receiveShadow = true;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.22, 48), new THREE.MeshPhongMaterial({ color: '#3a3733', shininess: 40 }));
  plate.position.y = 0.11; plate.receiveShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.7, 0.06, 6, 64).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#f4c430' }));
  ring.position.y = 0.23;
  const key = new THREE.SpotLight('#fff3dd', 220, 40, 0.6, 0.6, 1.6);
  key.position.set(6, 12, 8);
  const rim = new THREE.SpotLight('#9fc4ff', 140, 40, 0.7, 0.6, 1.6);
  rim.position.set(-8, 7, -9);
  showroom.add(floor, plate, ring, key, key.target, rim, rim.target);
  showroom.visible = false;
  scene.add(showroom);
}

const post = isTouch ? null : makeComposer(renderer, scene, camera);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  post?.setSize(w, h, renderer.getPixelRatio());
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

/* ------------------------------------------------------------ état */
const input = new Input();
input.bindTouch(document.getElementById('touch'));
const sound = new Sound();
const player = new Player();
const radio = new Radio(sound, UI.radioUI());
radio.muted = sound.muted;
const playlistReady = loadPlaylist();
// affichage par défaut : réduit sur mobile, ouvert sur ordinateur (puis le choix du joueur est retenu)
radio.setView(radio.viewMode || (isTouch ? 'min' : 'open'));
radio.render();
const $id = (k) => document.getElementById(k);
$id('r-power').onclick = () => radio.power();
$id('r-next').onclick = () => radio.nextStation(1);
$id('r-prev').onclick = () => radio.nextStation(-1);
$id('r-skip').onclick = () => radio.nextTrack(1);
$id('r-back').onclick = () => radio.nextTrack(-1);
$id('r-play').onclick = () => { sound.init(); radio.toggle(); };
$id('r-mini-play').onclick = (e) => { e.stopPropagation(); sound.init(); radio.toggle(); };
$id('r-hide').onclick = () => radio.setView('hidden');
$id('radio-pill').onclick = () => radio.setView('open');
$id('r-vol').oninput = (e) => radio.setVolume(+e.target.value);
$id('r-prog').onpointerdown = (e) => { const r = e.currentTarget.getBoundingClientRect(); radio.seek((e.clientX - r.left) / r.width); };
// les réglages de la radio ne doivent pas garder le focus clavier (les flèches conduisent le taxi)
for (const el of document.querySelectorAll('#radio button, #radio input, #radio-pill')) el.addEventListener('pointerup', () => setTimeout(() => el.blur(), 0));
function toggleRadioPanel() { radio.setView(radio.viewMode === 'min' ? 'open' : 'min'); }
$id('r-head').onclick = toggleRadioPanel;
$id('r-head').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleRadioPanel(); } };

let run = null;
let world = null;
let state = 'boot';
let paused = false;
let offers = [];
let camMode = 0;
let snapshot = null;
let lastQuote = -99;
let clock = 0;
let hudTimer = 0;

const legWeathers = (rng, dir) => Array.from({ length: LEGS }, (_, k) => weatherFor(rng, legOf(dir, k).geoIndex));
function newRun() {
  const seed = (Math.random() * 2 ** 31) | 0;
  const rng = mulberry32(seed);
  const weathers = legWeathers(rng, 1);
  weathers[0] = 'clear';
  const vehicle = vehicleSpec(garageCfg.model, career.up);
  return {
    seed, rng, weathers, dir: 1, stage: 0, reached: 0, legs: 0, vehicle, cfg: { ...garageCfg },
    money: START_CASH, fuel: Math.round(vehicle.tank * 0.52), hp: 100, passengers: [], bags: 0, hour: 7.1,
    stats: { carried: 0, tips: 0, fines: 0, crashes: 0, km: 0 },
    stageTime: 0, stageLog: [],
  };
}
// ville où se trouve le taxi (index de CITIES) et ville d'arrivée de l'étape en cours
const hereCity = () => CITIES[cityAt(run.dir, run.stage)];
const nextCity = () => CITIES[cityAt(run.dir, run.stage + 1)];
const legKey = () => `${run.dir}:${run.stage}`;

function loadStage(i) {
  if (world) {
    scene.remove(world.group);
    world.traffic.dispose();
    world.vendors.dispose();
    world.walkers.dispose();
    world.roadside.dispose();
    world.street.dispose();
    disposeGroup(world.group);
  }
  const leg = legOf(run.dir, i);
  const salt = run.dir > 0 ? 0 : 50021;
  const road = new Road(leg, i, run.seed + salt + i * 7919, { weather: run.weathers[i] });
  const group = new THREE.Group();
  group.add(road.buildMeshes());
  const scen = buildScenery(road, mulberry32(run.seed + salt + i * 31), QUALITY, SHADOWS);
  group.add(scen.group);
  const tg = new THREE.Group();
  group.add(tg);
  const traffic = new Traffic(tg, road, mulberry32(run.seed + salt + i * 131), SHADOWS);
  // branchages derrière le camion en panne
  if (road.broken) {
    const bg = branchesGeo();
    for (const ds of [-30, -16]) {
      const m = new THREE.Mesh(bg, MAT);
      road.toWorld(road.broken.s + ds, 1.9, m.position);
      m.rotation.y = road.headingAt(road.broken.s + ds);
      m.castShadow = SHADOWS;
      group.add(m);
    }
  }
  const roadside = new Roadside(group, road, mulberry32(run.seed + salt + i * 977), SHADOWS);
  const street = new StreetLife(group, road, mulberry32(run.seed + salt + i * 433), SHADOWS, document.getElementById('bubbles'));
  const vendors = new Vendors(group, SHADOWS);
  const walkers = new Walkers(group, SHADOWS, isTouch ? 5 : 9);
  scene.add(group);
  world = { key: legKey(), road, group, traffic, vendors, walkers, roadside, street, lod: scen.lod, checkpoints: scen.checkpoints, tolls: scen.tolls, potIdx: 0, noteIdx: 0, bumpIdx: 0, weather: run.weathers[i], fuelling: false, fuelLiters: 0, fuelWarned: false };
  resetLegState();
  player.reset(16, 1.9);
  rain.group.visible = world.weather === 'rain';
}

/* ------------------------------------------------------------ règles */
// état propre à l'étape : crevaison, température moteur, demandes des passagers
function resetLegState() {
  Object.assign(world, { flat: null, flatDone: false, heat: 0, hot: false, req: null, reqCd: 40 + Math.random() * 40, reqCount: 0 });
}
function damage(x) { run.hp = Math.max(0, run.hp - x); }
function annoy(x) { for (const p of run.passengers) p.sat = Math.max(0, p.sat - x * TRAITS[p.trait].sens); }
function soothe(x) { for (const p of run.passengers) p.sat = Math.min(100, p.sat + x); }
function comfort() {
  if (!run.passengers.length) return 100;
  return run.passengers.reduce((a, p) => a + p.sat, 0) / run.passengers.length;
}
function quote(kind, force = false) {
  if (!run.passengers.length) return;
  if (!force && clock - lastQuote < 7) return;
  lastQuote = clock;
  const p = pick(Math.random, run.passengers);
  UI.toast(`<b>${p.name}</b> : « ${pick(Math.random, QUOTES[kind])} »`, 'quote', 3000);
}
function log(label, amount) { run.stageLog.push({ label, amount }); }

function loseBag() {
  const owners = run.passengers.filter((p) => p.bags > 0 && !TRAITS[p.trait].goat);
  if (!owners.length) return;
  const p = pick(run.rng, owners);
  p.bags--; run.bags--;
  p.sat = Math.max(0, p.sat - 30);
  run.money -= PRICES.bagLost;
  log(`Colis de ${p.name} tombé du toit`, -PRICES.bagLost);
  UI.toast(`Un colis de <b>${p.name}</b> tombe du toit ! Tu rembourses ${fmtMoney(PRICES.bagLost)}.`, 'bad', 3500);
  sound.bump(1.2);
}

function collide(it) {
  stats().crashes++;
  sound.crash();
  if (it.animal) {
    const zebu = it.type === 'zebu';
    const cost = zebu ? PRICES.goat * 3 : PRICES.goat;
    run.money -= cost;
    log(zebu ? 'Zébu heurté (dédommagement)' : it.type === 'sheep' ? 'Mouton heurté (dédommagement)' : 'Chèvre heurtée (dédommagement)', -cost);
    damage(zebu ? 10 + Math.abs(player.v) * 0.8 : 2 + Math.abs(player.v) * 0.2);
    annoy(10);
    player.v *= zebu ? 0.25 : 0.8;
    player.kick(2.5);
    world.traffic.removeItem(it);
    UI.toast(`Tu as heurté ${zebu ? 'un zébu' : it.type === 'sheep' ? 'un mouton' : 'une chèvre'} ! Le propriétaire réclame ${fmtMoney(cost)}.`, 'bad', 3500);
    return;
  }
  const rel = Math.abs(player.v - it.v);
  const dx = it.x - player.x;
  const side = Math.abs(dx) > (it.wid + 1.75) / 2 - 0.55;
  let dmg = clamp(rel * 1.1, 4, 70) * (side ? 0.45 : 1);
  if (side) {
    player.x -= Math.sign(dx) * 0.7;
    player.v *= 0.85;
  } else if (it.dir < 0) {
    player.v = -2;
    player.s -= 1.2;
    it.v = -2; it.baseV = -2;
  } else if (it.s > player.s) {
    player.v = Math.min(player.v, Math.max(0, it.v) * 0.6);
    player.s = it.s - (it.len + 4.6) / 2 - 0.3;
  } else {
    player.v = Math.max(player.v, it.v * 0.8);
    it.v *= 0.5;
  }
  damage(dmg);
  annoy(dmg * 0.9);
  player.kick(3);
  const names = { truck: 'un camion', car: 'une voiture', bus: 'un minibus', moto: 'un zémidjan' };
  UI.toast(`Accrochage avec ${names[it.type] || 'un véhicule'} ! −${Math.round(dmg)} % d’état`, 'bad', 3000);
  setTimeout(() => quote('crash', true), 600);
}
const stats = () => run.stats;

/* ------------------------------------------------------------ boucle de conduite */
function updateDrive(dt) {
  const r = world.road;
  const inp = input.read();
  const hornNow = input.consumeHorn();
  if (hornNow) sound.horn();
  sound.hornHold(inp.horn);
  const ev = player.update(dt, r, inp, run, world.weather);
  run.stageTime += dt;
  // horloge : suit les kilomètres réels parcourus (≈ 60 km/h de moyenne en taxi-brousse), plus le temps à l'arrêt
  run.hour += (Math.abs(player.v) * dt * (r.stage.km / r.length)) / 60 + (dt * 0.12) / 60;
  const speed = Math.abs(player.v);
  const V = run.vehicle;
  const cands = []; // alertes candidates (la plus prioritaire s'affiche)

  // nids-de-poule : chaque roue peut tomber dedans, on peut les enjamber
  const ph = r.potholes;
  while (world.potIdx < ph.length && ph[world.potIdx].s < player.s - 4) world.potIdx++;
  for (let k = world.potIdx; k < ph.length && ph[k].s < player.s + 4; k++) {
    const p = ph[k];
    if (p.hit || Math.abs(p.s - player.s) > p.r + 1.5) continue;
    const dx = Math.abs(p.x - player.x);
    if (Math.abs(dx - 0.86) < p.r + 0.14) {
      p.hit = true;
      if (speed > 3) {
        const str = Math.min(1.6, speed / 18) * (p.r / 0.6) * V.shock;
        damage(0.5 + str * 3);
        annoy(3 + str * 9);
        if (str > 0.7 && !world.flat && !world.flatDone && run.rng() < 0.3 * V.flat) startFlat();
        player.kick(1.2 + str * 2.4);
        player.v *= 1 - 0.06 * str;
        sound.bump(Math.min(1.5, 0.4 + str));
        if (str > 0.75) quote(run.passengers.some((q) => TRAITS[q.trait].goat) && Math.random() < 0.3 ? 'goat' : 'bump');
      }
    }
  }

  // ralentisseurs : à franchir au pas
  const bp = r.bumps;
  while (world.bumpIdx < bp.length && bp[world.bumpIdx].s < player.s - 3) world.bumpIdx++;
  for (let k = world.bumpIdx; k < bp.length && bp[k].s < player.s + 1; k++) {
    const b = bp[k];
    if (b.hit || Math.abs(b.s - player.s) > 0.8) continue;
    b.hit = true;
    const kmh = speed * 3.6;
    if (kmh > 25) {
      const str = Math.min(1.8, (kmh - 20) / 30) * V.shock;
      damage(0.5 + str * 2.5);
      annoy(4 + str * 12);
      player.kick(1.5 + str * 3);
      sound.bump(Math.min(1.6, 0.5 + str));
      if (kmh > 45) { UI.toast(`Ralentisseur pris à ${Math.round(kmh)} km/h !`, 'warn', 2200); quote('bump', true); }
    } else player.kick(0.6);
  }

  // confort
  if (ev.surface === 2 && speed > 3) { damage(dt * 0.6 * (speed / 10)); annoy(dt * 5); if (speed > 8) quote('offroad'); }
  else if (ev.surface === 1 && speed > 9) annoy(dt * 0.8);
  if (ev.wall) {
    damage(3 + ev.wall * 0.6); annoy(8); player.kick(2); sound.crash();
    UI.toast('Aïe, la paroi rocheuse !', 'bad');
  }
  if (ev.hardBrake) annoy(dt * 3.5);
  if (ev.lat > 4) {
    annoy(dt * (ev.lat - 4) * 1.6);
    if (ev.lat > 5.5) quote('curve');
    if (ev.lat > 6.2 && run.bags > 0 && run.rng() < dt * 0.5) loseBag();
  } else if (ev.lat < 2 && ev.surface === 0 && !ev.hardBrake) soothe(dt * 0.5);

  // crevaison : le taxi tire à droite et plafonne à 45 km/h ; on change la roue sur le bas-côté
  const parked = speed < 0.4 && player.x > 2.6;
  if (world.flat) {
    if (speed > 1) player.yaw += 0.06 * dt * Math.min(1, speed / 10);
    if (player.v > 12.5) player.v -= (player.v - 12.5) * Math.min(1, dt * 2);
    if (speed > 8) { damage(dt * 0.45); annoy(dt * 1.2); }
    if (parked) world.flat.fix += dt;
    const pct = Math.min(99, Math.round((world.flat.fix / V.wheelTime) * 100));
    cands.push({ pr: 3, kind: 'warn', text: 'Crevaison', sub: parked ? `On change la roue… ${pct} %` : 'Arrête-toi sur le bas-côté droit pour changer la roue' });
    if (world.flat.fix >= V.wheelTime) {
      world.flat = null; world.flatDone = true;
      UI.toast('Roue de secours montée. Les passagers remontent : on repart !', 'good', 3000);
      sound.ok();
    }
  }

  // surchauffe : longue montée, pied au plancher et taxi chargé (la faille d'Alédjo surtout)
  {
    const grade = Math.max(0, r.sample(player.s).grade);
    const loadF = (run.passengers.length * 70 + run.bags * 28) / (SEATS * 70 + ROOF * 28);
    const gain = player.throttle * grade * 0.62 * (0.5 + loadF) * V.heat;
    const cool = world.hot ? (speed < 0.5 ? 0.11 : 0.03) : 0.035 + (speed < 0.5 ? 0.05 : 0);
    world.heat = clamp(world.heat + (gain - cool) * dt, 0, 1);
    if (!world.hot && world.heat >= 1) {
      world.hot = true;
      damage(4);
      annoy(6);
      sound.noise(1.4, 2600, 0.25);
      UI.toast('De la vapeur sort du capot ! Le moteur a chauffé : arrête-toi pour le laisser refroidir.', 'bad', 4200);
      quote('crash', true);
    }
    if (world.hot) {
      if (player.v > 4) player.v -= (player.v - 4) * Math.min(1, dt * 1.5);
      if (world.heat < 0.55) { world.hot = false; UI.toast('Le moteur a refroidi. Doucement dans la montée.', 'good', 2600); }
      cands.push({ pr: 3, kind: 'warn', text: 'Moteur en surchauffe', sub: speed < 0.5 ? `Refroidissement… ${Math.round(world.heat * 100)} %` : 'Arrête-toi pour le laisser refroidir' });
    } else if (world.heat > 0.7) cands.push({ pr: 2, kind: 'warn', text: `Moteur chaud · ${Math.round(world.heat * 100)} %`, sub: 'Lève le pied, ou arrête-toi un moment' });
  }

  // route inondée : au pas ça passe, trop vite c'est la gerbe d'eau dans l'habitacle
  const fl = r.floodAt(player.s);
  if (fl && Math.abs(player.x) < HALF_ROAD + 1.4) {
    player.v -= player.v * Math.min(1, dt * 0.9);
    if (!fl.hit) {
      fl.hit = true;
      const kmh = speed * 3.6;
      if (kmh > 28) {
        const str = Math.min(1.5, (kmh - 20) / 35);
        damage(1.5 + str * 4); annoy(8 + str * 14); player.kick(2 + str * 2);
        player.yaw += (Math.random() - 0.5) * 0.2 * str;
        sound.noise(0.9, 700, 0.55);
        UI.toast(`Gerbe d’eau à ${Math.round(kmh)} km/h ! L’eau rentre par les vitres.`, 'bad', 3200);
        quote('bump', true);
      } else { soothe(2); sound.noise(0.6, 400, 0.25); UI.toast('Tu traverses la flaque au pas. Personne n’est mouillé.', 'good', 2400); }
    }
  }

  // contrôles routiers : passage au ralenti, ou contrôle des papiers (arrêt obligatoire, barrière fermée)
  let alert = null;
  const halfLen = (player.len || 4.5) / 2;
  for (const c of world.checkpoints) {
    const cp = c.cp;
    const d = cp.s - player.s;
    if (d < 170 && d > -15) {
      if (!cp.warned) {
        cp.warned = true;
        UI.banner('Contrôle routier', cp.papers ? 'Contrôle des papiers' : 'Gendarmerie', cp.papers ? 'Arrête-toi à la barrière' : 'Passe sous 20 km/h', 2600);
        sound.whistle();
      }
      // l'alerte disparaît dès que le contrôle est passé (un message le confirme)
      if (!cp.done) alert = cp.papers && !cp.cleared
        ? { kind: 'police', text: 'Contrôle en cours', sub: d > 12 ? `Arrête-toi à la barrière · ${Math.max(0, Math.round(d))} m` : speed < 0.6 ? 'Le gendarme vérifie tes papiers…' : 'Arrête-toi' }
        : { kind: 'police', text: 'Contrôle en cours', sub: `Ralentis sous 20 km/h · ${Math.round(speed * 3.6)} km/h` };
    }
    // contrôle des papiers : la barrière reste fermée tant qu'on ne s'est pas arrêté
    if (cp.papers && !cp.cleared) {
      const stopAt = cp.s - 1 - halfLen;
      if (player.s > stopAt && player.x > -0.5) {
        if (speed > 2.5) { damage(speed * 0.5); UI.toast('Tu as forcé la barrière du contrôle ! Amende.', 'bad', 3200); run.money -= PRICES.fine; stats().fines++; log('Barrière de contrôle forcée (amende)', -PRICES.fine); sound.crash(0.6); cp.cleared = true; cp.done = true; }
        else { player.s = stopAt; player.v = Math.min(player.v, 0); }
      }
      if (d < 14 && d > 0 && speed < 0.6) {
        cp.wait += dt;
        if (cp.wait > 2.6) {
          cp.cleared = true; cp.done = true;
          UI.toast('Gendarme : « Papiers du véhicule… C’est bon, bonne route chauffeur. »', 'good', 3200);
          sound.ok();
        }
      }
    }
    let open = cp.papers ? cp.cleared && d > -8 : d > -8 && d < 30;
    if (!open) for (const it of world.traffic.items) if (it.s > cp.s - 30 && it.s < cp.s + 8) { open = true; break; }
    c.pivot.rotation.z += ((open ? 1.35 : 0) - c.pivot.rotation.z) * Math.min(1, dt * 3);
    if (!cp.done && d < 0) {
      cp.done = true;
      const kmh = Math.round(speed * 3.6);
      if (kmh > 20) {
        run.money -= PRICES.fine;
        stats().fines++;
        log(`Contrôle passé à ${kmh} km/h (amende)`, -PRICES.fine);
        UI.toast(`Coup de sifflet ! Contrôle passé à ${kmh} km/h : amende de ${fmtMoney(PRICES.fine)}.`, 'bad', 3800);
        sound.whistle();
      } else {
        UI.toast('Contrôle : « C’est bon, bonne route chauffeur. »', 'good');
        sound.ok();
      }
    }
  }

  // postes de péage : arrêt obligatoire au guichet, 500 F
  for (const c of world.tolls) {
    const t = c.toll;
    const d = t.s - player.s;
    if (d < 140 && d > -10) {
      if (!t.warned) { t.warned = true; UI.banner('Poste de péage', t.name, 'Arrêt obligatoire au guichet · 500 F', 2600); }
      if (!t.paid) alert = { kind: 'toll', text: `Péage ${deName(t.name)}`, sub: d > 14 ? `Arrêt obligatoire · ${Math.round(d)} m` : speed < 0.6 ? 'Paiement au guichet…' : 'Arrête-toi au guichet' };
    }
    if (!t.paid) {
      const stopAt = t.s - 1.4 - halfLen;
      if (player.s > stopAt && Math.abs(player.x) < 4.2) {
        if (speed > 2.5 && t.hit <= 0) {
          damage(3 + speed * 0.6); annoy(8);
          UI.toast('Bam ! Tu as percuté la barrière du péage.', 'bad', 2600);
          sound.crash(0.6); t.hit = 2;
        }
        player.s = stopAt; player.v = Math.min(player.v, 0);
      }
      if (t.hit > 0) t.hit -= dt;
      if (d < 16 && d > 0 && speed < 0.6 && player.x > -0.5) {
        t.wait += dt;
        if (t.wait > 1.4) {
          t.paid = true;
          run.money -= PRICES.toll;
          log(`Péage ${deName(t.name)}`, -PRICES.toll);
          sound.coin();
          UI.toast(`Péage ${deName(t.name)} : ${fmtMoney(PRICES.toll)} payés. La barrière se lève.`, 'info', 2800);
        }
      }
    }
    // barrières : la nôtre s'ouvre une fois payé ; celle d'en face pour le trafic
    const ours = t.paid && d > -10 || world.traffic.items.some((it) => it.dir === 1 && it.tollOk === t && it.s > t.s - 8 && it.s < t.s + 6);
    const theirs = world.traffic.items.some((it) => it.dir === -1 && it.s > t.s - 6 && it.s < t.s + 10);
    c.pivots[0].rotation.z += ((ours ? 1.35 : 0) - c.pivots[0].rotation.z) * Math.min(1, dt * 3);
    c.pivots[1].rotation.z += ((theirs ? 1.35 : 0) - c.pivots[1].rotation.z) * Math.min(1, dt * 3);
  }
  updatePassengersOnRoad(dt, speed, cands);
  if (!alert && cands.length) alert = cands.sort((a, b) => b.pr - a.pr)[0];
  UI.alert(alert);

  // vendeuses d'essence
  let fuelling = false;
  for (const f of r.fuelStops) {
    if (Math.abs(f.s - player.s) < 16 && player.x > 3.2 && speed < 2) {
      const room = TANK - run.fuel;
      const afford = run.money / PRICES.fuelRoad;
      const l = Math.min(dt * 5, room, Math.max(0, afford));
      if (l > 0.001) {
        fuelling = true;
        run.fuel += l;
        run.money -= l * PRICES.fuelRoad;
        world.fuelLiters += l;
      }
    }
  }
  if (fuelling && !world.fuelling) UI.toast('La vendeuse verse les bouteilles dans le réservoir…', 'good');
  if (!fuelling && world.fuelling) {
    UI.toast(`+${world.fuelLiters.toFixed(1)} L d’essence (${fmtMoney(world.fuelLiters * PRICES.fuelRoad)})`, 'good');
    log(`Essence au bord de la route (${world.fuelLiters.toFixed(1)} L)`, -round50(world.fuelLiters * PRICES.fuelRoad));
    world.fuelLiters = 0;
  }
  world.fuelling = fuelling;
  if (run.fuel < 7 && !world.fuelWarned) {
    world.fuelWarned = true;
    UI.toast('Réserve ! Cherche une vendeuse d’essence au bord de la route.', 'warn', 4000);
  }

  // messages du parcours
  while (world.noteIdx < r.notes.length && r.notes[world.noteIdx].s < player.s) {
    const n = r.notes[world.noteIdx++];
    if (player.s - n.s >= 60) continue;
    if (n.kind === 'landmark') UI.banner('Site remarquable', r.stage.landmark, 'Forte montée · ligne continue · interdit de doubler', 4200);
    else if (n.kind === 'town') { const nm = n.text.replace('Bienvenue à ', ''); if (n.text.startsWith('Bienvenue')) UI.banner('Bienvenue à', nm, '', 2400); else UI.toast(n.text, 'info', 3200); }
    else UI.toast(n.text, n.kind === 'warn' ? 'warn' : 'info', 3200);
  }

  // vendeuses ambulantes
  const nearStop = r.villages.some((v) => Math.abs(v.s - player.s) < (v.named ? 115 : 50))
    || r.checkpoints.some((c) => Math.abs(c.s - player.s) < 30) || r.tolls.some((t) => Math.abs(t.s - player.s) < 30) || r.fuelStops.some((f) => Math.abs(f.s - player.s) < 20)
    || player.s < 60 || player.s > r.length - 80;
  player.pax = run.passengers.length;
  for (const e of world.vendors.update(dt, r, player, nearStop, run.rng)) {
    if (e.type === 'cry') UI.toast(`Une vendeuse : « ${e.text} »`, 'quote', 2600);
    else if (e.type === 'coin') { sound.coin(); soothe(5); }
    else if (e.type === 'sale' && e.bought) {
      soothe(6);
      UI.toast('Tes passagers ont acheté à boire et à manger par la vitre : confort +', 'good', 2800);
    }
  }
  updateWindowHand(dt);

  world.walkers.update(dt, r, player, run.rng, r.biomeAt(clamp(player.s, 0, r.length)).traffic || 1);
  world.roadside.update(dt, player);
  world.street.update(dt, player, camera, world.walkers);

  // trafic
  const hits = world.traffic.update(dt, player, hornNow, true);
  if (world.traffic.events.includes('oncomingHorn')) sound.farHorn();
  for (const it of hits) collide(it);

  sound.engine(speed, player.throttle, true);
  sound.surface(ev.surface, speed);

  // fins possibles
  if (run.hp <= 0) {
    endGame(false, { title: 'Le taxi rend l’âme', text: `Le moteur a lâché entre ${hereCity().name} et ${nextCity().name}. Les passagers finissent le trajet en zémidjan.` });
    return;
  }
  if (run.fuel <= 0 && speed < 0.3 && !world.fuelling) { openRescue(); return; }
  if (player.s >= r.length - 12) arrive();
}

/* ------------------------------------------------------------ passagers sur la route */
function startFlat() {
  world.flat = { fix: 0 };
  sound.noise(1.1, 3200, 0.3);
  sound.bump(1.4);
  UI.toast('Pchhh ! Crevaison. Le taxi tire à droite : range-toi sur le bas-côté pour changer la roue.', 'bad', 4200);
  setTimeout(() => quote('bump', true), 900);
}

// un passager descend en route (village de l'étape)
function dropPassenger(p, missed) {
  const late = TRAITS[p.trait].rush && run.stageTime > player.s / RUSH_SPEED;
  const res = settle(p, { missed, late });
  for (const l of res.lines) log(l.label, l.amount);
  run.money += res.total;
  run.stats.tips += res.total;
  run.stats.carried++;
  run.passengers = run.passengers.filter((q) => q !== p);
  run.bags = run.passengers.reduce((a, q) => a + q.bags, 0);
  if (missed) { annoy(4); UI.toast(`<b>${p.name}</b> : « Chauffeur, tu as dépassé ${p.town} ! » Il faut rembourser ${fmtMoney(-res.total)}.`, 'bad', 3800); sound.fail(); return; }
  world.roadside.alight(player);
  const amt = res.total > 0 ? ` · pourboire ${fmtMoney(res.total)}` : res.total < 0 ? ` · ${fmtMoney(res.total)}` : '';
  UI.toast(`<b>${p.name}</b> descend à ${p.town}${amt}. « Merci chauffeur, bonne route ! »`, res.total >= 0 ? 'good' : 'warn', 3400);
  if (res.total > 0) sound.coin();
}

const REQS = {
  sick: { text: 'Passager malade', sub: (p, t) => `${p.name} : « Arrête-toi, j’ai mal au cœur ! » · ${Math.ceil(t)} s` },
  pause: { text: 'Pause demandée', sub: (p, t) => `${p.name} : « Pause pipi au prochain village ! » · ${Math.ceil(t)} s` },
  slow: { text: 'Doucement !', sub: (p, t) => `${p.name} : « Pas plus de 50, mon fils. » · ${Math.ceil(t)} s` },
};
function updatePassengersOnRoad(dt, speed, cands) {
  const r = world.road;
  const parked = speed < 0.45 && player.x > 2.4;
  // descentes dans les villages de l'étape
  for (const p of [...run.passengers]) {
    if (!p.town || p.leg !== run.stage) continue;
    const t = r.towns.find((q) => q.name === p.town);
    if (!t) { dropPassenger(p, false); continue; }
    const d = t.s - player.s;
    if (d < 450 && d > -130) cands.push({ pr: 2.5, kind: 'stop', text: `Arrêt demandé : ${p.town}`, sub: d > 110 ? `${p.name} descend · ${Math.round(d)} m` : parked ? `${p.name} descend…` : 'Range-toi sur le bas-côté droit' });
    if (Math.abs(d) < 110 && parked) { p.dropT = (p.dropT || 0) + dt; if (p.dropT > 1.1) dropPassenger(p, false); }
    else if (d < -130) dropPassenger(p, true);
  }
  // voyageurs qui font signe au bord de la route
  for (const sp of world.roadside.spots) {
    if (sp.state !== 'wait') continue;
    const d = sp.s - player.s;
    if (d > 260 || d < -14) continue;
    if (!sp.p) sp.p = makeHailer(run.rng, { dir: run.dir, k: run.stage, aboard: run.passengers, villageName: sp.village });
    const p = sp.p;
    const room = run.passengers.length < SEATS && run.bags + p.bags <= ROOF;
    const dest = CITIES[p.to].name;
    cands.push({ pr: 1, kind: 'hail', text: 'Quelqu’un fait signe', sub: room ? `${dest} · ${fmtMoney(p.fare)} · arrête-toi à sa hauteur` : 'Le taxi est plein, continue' });
    if (room && Math.abs(d) < 18 && parked) {
      sp.wait = (sp.wait || 0) + dt;
      if (sp.wait > 0.7) {
        world.roadside.board(sp);
        p.sat = 100;
        run.passengers.push(p);
        run.bags += p.bags;
        run.money += p.fare;
        log(`${p.name} monté${p.female ? 'e' : ''} au bord de la route (${dest})`, p.fare);
        sound.coin();
        UI.toast(`<b>${p.name}</b> monte pour ${dest} : « ${p.line} » <b>+${fmtMoney(p.fare)}</b>`, 'good', 3800);
      }
    }
  }
  // demandes des passagers
  const R = world.req;
  if (!R) {
    if (run.passengers.length && speed > 5 && world.reqCount < 2) world.reqCd -= dt;
    if (world.reqCd <= 0) {
      world.reqCd = 60 + Math.random() * 60;
      const sick = run.passengers.filter((p) => p.trait === 'malade');
      const old = run.passengers.filter((p) => p.trait === 'ancien');
      const villageAhead = r.villages.some((v) => v.s - player.s > 200 && v.s - player.s < 1100);
      let req = null;
      if (sick.length && Math.random() < 0.8) req = { type: 'sick', p: pick(Math.random, sick), t: 24 };
      else if (old.length && Math.random() < 0.6) req = { type: 'slow', p: pick(Math.random, old), t: 20 };
      else if (villageAhead && Math.random() < 0.55) req = { type: 'pause', p: pick(Math.random, run.passengers), t: 70 };
      if (req) { world.req = req; world.reqCount++; req.hold = 0; sound.tone([740, 560], 0.18, 'triangle', 0.06); }
    }
    return;
  }
  if (!run.passengers.includes(R.p)) { world.req = null; return; }
  R.t -= dt;
  const kmh = speed * 3.6;
  let ok = false, fail = false;
  if (R.type === 'sick') { if (parked) R.hold += dt; ok = R.hold > 3; fail = R.t <= 0; }
  else if (R.type === 'pause') { const inVillage = r.villages.some((v) => Math.abs(v.s - player.s) < (v.named ? 120 : 60)); if (parked && inVillage) R.hold += dt; ok = R.hold > 4; fail = R.t <= 0; }
  else if (R.type === 'slow') { fail = kmh > 62; ok = R.t <= 0; }
  if (ok) {
    world.req = null;
    if (R.type === 'sick') { R.p.sat = Math.min(100, R.p.sat + 25); soothe(3); UI.toast(`<b>${R.p.name}</b> : « Merci chauffeur… ça va mieux. »`, 'good', 3000); }
    else if (R.type === 'pause') { soothe(10); UI.toast('Petite pause au village : tout le monde se dégourdit les jambes. Confort +', 'good', 3000); }
    else { R.p.sat = Math.min(100, R.p.sat + 14); UI.toast(`<b>${R.p.name}</b> : « Merci mon fils, Dieu te garde. »`, 'good', 3000); }
    sound.ok();
  } else if (fail) {
    world.req = null;
    if (R.type === 'sick') { R.p.sat = Math.max(0, R.p.sat - 35); annoy(9); UI.toast(`Trop tard : <b>${R.p.name}</b> a vomi par la fenêtre. Tout le monde râle.`, 'bad', 3600); }
    else if (R.type === 'pause') { annoy(10); UI.toast('Pas de pause : les passagers ronchonnent.', 'bad', 3000); }
    else { R.p.sat = Math.max(0, R.p.sat - 22); UI.toast(`<b>${R.p.name}</b> : « Je t’avais dit doucement ! »`, 'bad', 3000); }
    sound.fail();
  } else {
    const Q = REQS[R.type];
    cands.push({ pr: 2, kind: 'req', text: Q.text, sub: Q.sub(R.p, R.t) });
  }
}

/* ------------------------------------------------------------ transitions */
// le HUD et l'autoradio apparaissent ensemble
let radioStarted = false;
function hud(on) {
  UI.hud(on);
  if (!on) UI.alert(null);
  if (on && !radioStarted) {
    radioStarted = true;
    playlistReady.then(() => { if (radio.saved && 'station' in radio.saved) radio.restore(); else radio.tune(0); });
  }
}

// carte : étape géographique et progression dans le sens Lomé → Dapaong
function mapPos(progress = 0) {
  const leg = legOf(run.dir, run.stage);
  return { stage: leg.geoIndex, progress: leg.reverse ? 1 - progress : progress, rev: leg.reverse };
}

function startTitle() {
  buildTaxi(garageCfg);
  run = newRun();
  loadStage(0);
  state = 'title';
  hud(false);
  const saved = loadRun();
  UI.renderTitle({
    best: loadBest(), career, vehicle: VEHICLES[garageCfg.model].name,
    saved: saved && { label: savedLabel(saved), onResume: () => { sound.init(); resumeRun(saved); } },
    onStart: () => { sound.init(); clearRun(); openGare(); },
    onGarage: openGarage,
  });
  UI.show('s-title');
}
function savedLabel(o) {
  const c = CITIES[cityAt(o.dir, o.stage)].name;
  return `${o.dir > 0 ? 'Aller' : 'Retour'} · étape ${o.stage + 1}/${LEGS} · gare de ${c} · ${fmtMoney(o.money)}`;
}
// reprise d'un voyage sauvegardé : on revient à la gare de l'étape en cours
function resumeRun(o) {
  garageCfg = { ...garageCfg, ...o.cfg };
  buildTaxi(garageCfg);
  run = newRun();
  Object.assign(run, o);
  delete run.offers; delete run.v; delete run.t;
  run.vehicle = vehicleSpec(run.cfg.model, career.up);
  run.rng = mulberry32((run.seed ^ (run.legs * 7919 + run.stage * 131 + 17)) >>> 0);
  bumpPid(Math.max(0, ...run.passengers.map((p) => p.id), ...(o.offers || []).map((p) => p.id)));
  loadStage(run.stage);
  openGare(o.offers);
}

function openGarage() {
  sound.init();
  state = 'garage';
  let draft = { ...garageCfg };
  const render = () => UI.renderGarage({
    cfg: draft, career, upgrades: UPGRADES,
    onChange: (c) => { draft = c; buildTaxi(draft); render(); },
    onBuy: (id) => {
      const U = UPGRADES.find((u) => u.id === id);
      if (!U || career.up[id] || career.savings < U.price) return;
      career.savings -= U.price;
      career.up = { ...career.up, [id]: true };
      saveCareer(career);
      sound.coin();
      buildTaxi(draft);
      render();
    },
    onSave: (c) => { garageCfg = c; saveCfg(c); sound.ok(); startTitle(); },
    onCancel: () => { buildTaxi(garageCfg); startTitle(); },
  });
  render();
  UI.show('s-garage');
}

function openGare(savedOffers) {
  state = 'gare';
  if (!world || world.key !== legKey()) loadStage(run.stage);
  offers = savedOffers || makeOffers(run.rng, cityAt(run.dir, run.stage), run.passengers, run.dir);
  hud(false);
  UI.clearToasts();
  renderGare();
  UI.show('s-gare');
}

function renderGare() {
  saveRun(run, offers);
  UI.renderGare({
    run, offers, weather: run.weathers[run.stage], here: hereCity(), next: nextCity(), leg: legOf(run.dir, run.stage), map: mapPos(0),
    onToggle: (id) => {
      const o = offers.find((x) => x.id === id);
      if (!o || o.gone) return;
      const i = run.passengers.findIndex((p) => p.id === id);
      if (i >= 0) {
        run.passengers.splice(i, 1);
        run.bags -= o.bags;
        run.money -= o.fare;
      } else if (run.passengers.length < SEATS && run.bags + o.bags <= ROOF) {
        o.sat = o.startSat ?? 100; o.late = false;
        run.passengers.push(o);
        run.bags += o.bags;
        run.money += o.fare;
        sound.coin();
      }
      renderGare();
    },
    onHaggle: (id) => {
      const o = offers.find((x) => x.id === id);
      if (!o || o.haggled || o.gone || run.passengers.some((p) => p.id === id)) return;
      const h = haggle(run.rng, o);
      o.haggled = true;
      o.reply = h.line;
      if (h.ok) { o.fare = h.fare; o.startSat = h.sat; o.agreed = true; sound.coin(); }
      else { o.gone = true; sound.fail(); }
      renderGare();
    },
    onFuel: (l, price) => { run.fuel = Math.min(TANK, run.fuel + l); run.money -= price; sound.ok(); renderGare(); },
    onRepair: (p, price) => { run.hp = Math.min(100, run.hp + p); run.money -= price; sound.ok(); renderGare(); },
    onGo: startDrive,
  });
}

function startDrive() {
  sound.init();
  snapshot = JSON.stringify({ money: run.money, fuel: run.fuel, hp: run.hp, passengers: run.passengers, bags: run.bags, hour: run.hour, stats: run.stats });
  state = 'drive';
  paused = false;
  radio.pause(false);
  run.stageTime = 0;
  run.stageLog = [];
  player.reset(16, 1.9);
  world.traffic.clearAll();
  world.vendors.reset();
  world.walkers.reset();
  world.roadside.reset();
  world.street.reset();
  UI.show(null);
  hud(true);
  UI.clearToasts();
  const leg = legOf(run.dir, run.stage);
  UI.banner(`${run.dir > 0 ? 'Aller' : 'Retour'} · étape ${run.stage + 1} sur ${LEGS}`, `${hereCity().name} → ${nextCity().name}`, `${leg.km} km de N1 · ${WEATHER_LABEL[world.weather]}`, 3000);
  if (run.stage === 0 && run.dir > 0) {
    setTimeout(() => state === 'drive' && UI.toast(isTouch ? 'Astuce : le bouton Klaxon fait ranger les camions à droite.' : 'Astuce : <b>Espace</b> pour klaxonner, le camion devant toi se range à droite.', 'info', 4200), 3500);
  }
  const towns = run.passengers.filter((p) => p.town && p.leg === run.stage);
  if (towns.length) setTimeout(() => state === 'drive' && UI.toast(`Descentes en route : ${towns.map((p) => `<b>${p.name}</b> à ${p.town}`).join(', ')}. Arrête-toi sur le bas-côté droit.`, 'info', 4600), 6800);
  sound.rain(world.weather === 'rain');
  hudTimer = 0;
}

function restartStage() {
  const s = JSON.parse(snapshot);
  Object.assign(run, s);
  loadStage(run.stage);
  UI.modal('s-pause', false);
  startDrive();
}

function arrive() {
  state = 'arrival';
  sound.silence();
  hud(false);
  const ci = cityAt(run.dir, run.stage + 1);
  const city = CITIES[ci];
  const par = world.road.length / RUSH_SPEED;
  for (const p of run.passengers) if (TRAITS[p.trait].rush && run.stageTime > par) p.late = true;
  const lines = [...run.stageLog];
  let tipsTotal = 0;
  // passagers pour un village de l'étape restés à bord : ils ont été oubliés
  for (const p of run.passengers.filter((q) => q.town && q.leg === run.stage)) {
    const res = settle(p, { missed: true });
    lines.push(...res.lines); run.money += res.total; tipsTotal += res.total; run.stats.tips += res.total; run.stats.carried++;
  }
  for (const p of run.passengers.filter((q) => !q.town && q.to === ci)) {
    const res = settle(p, { late: p.late });
    lines.push(...res.lines);
    run.money += res.total;
    tipsTotal += res.total;
    run.stats.tips += res.total;
    run.stats.carried++;
  }
  run.passengers = run.passengers.filter((p) => !(p.to === ci && !p.town) && !(p.town && p.leg === run.stage));
  for (const p of run.passengers) p.sat = Math.min(100, p.sat + 15);
  run.bags = run.passengers.reduce((a, p) => a + p.bags, 0);
  run.hour += 0.35;
  run.stats.km = (run.stats.km || 0) + legOf(run.dir, run.stage).km;
  const cineMap = mapPos(1);
  const fromName = hereCity().name;
  run.stage++;
  run.legs++;
  run.reached = ci;
  if (tipsTotal > 0) sound.coin();
  const last = run.stage === LEGS;
  const canReturn = last && run.dir > 0;
  if (!last) saveRun(run, null);
  state = 'cine';
  UI.playCine({
    city: city.name, region: city.region, fromName, hour: run.hour, dayN: Math.floor((run.hour - 6) / 24) + 1,
    km: run.stats.km, stageN: run.stage, legs: LEGS, dir: run.dir, map: cineMap,
  }).then(() => showArrival({ city, lines, last, canReturn }));
}
function showArrival({ city, lines, last, canReturn }) {
  state = 'arrival';
  UI.renderArrival({
    run, city, lines, stageTime: run.stageTime, last, canReturn,
    extra: run.passengers.length ? `${run.passengers.length} passager${run.passengers.length > 1 ? 's' : ''} continue${run.passengers.length > 1 ? 'nt' : ''} le voyage.` : '',
    onNext: last ? () => endGame(true) : () => openGare(),
    onReturn: canReturn ? startReturn : null,
  });
  UI.show('s-arrival');
}

// à Dapaong : on repart vers Lomé avec la caisse, le taxi et l'heure du jour
function startReturn() {
  run.dir = -1;
  run.stage = 0;
  run.weathers = legWeathers(run.rng, -1);
  // une nuit à Dapaong : départ le lendemain vers 6 h 30
  run.hour = Math.ceil((run.hour + 6 - 6.6) / 24) * 24 + 6.6;
  run.passengers = [];
  run.bags = 0;
  UI.toast('Une nuit à Dapaong, puis cap au sud : la gare se remplit pour Lomé.', 'info', 3600);
  loadStage(0);
  openGare();
}

function openRescue() {
  state = 'rescue';
  sound.silence();
  const pax = run.passengers.length;
  UI.renderRescue({
    money: run.money, pax,
    onPay: () => {
      run.money -= PRICES.rescue;
      run.fuel += PRICES.rescueLiters;
      log('Zémidjan parti chercher de l’essence', -PRICES.rescue);
      UI.modal('s-modal', false);
      state = 'drive';
    },
    // sans argent : les passagers se cotisent (et le font sentir), ou le zém fait crédit
    onChipIn: () => {
      run.fuel += PRICES.rescueLiters;
      annoy(28);
      log('Les passagers se cotisent pour l’essence', 0);
      UI.modal('s-modal', false);
      UI.toast('Les passagers se cotisent pour l’essence… mais ils ne sont pas contents.', 'warn', 3600);
      state = 'drive';
    },
    onCredit: () => {
      run.money -= PRICES.rescue + 1000;
      run.fuel += PRICES.rescueLiters;
      log('Essence du zémidjan à crédit', -(PRICES.rescue + 1000));
      UI.modal('s-modal', false);
      state = 'drive';
    },
    onGiveUp: () => {
      UI.modal('s-modal', false);
      endGame(false, { title: 'Panne sèche', text: `Le taxi s’arrête au bord de la N1, entre ${hereCity().name} et ${nextCity().name}.` });
    },
  });
  UI.modal('s-modal', true);
}

function setPause(on) {
  if (state !== 'drive') return;
  paused = on;
  if (on) {
    input.releaseAll();
    sound.silence();
    const mp = mapPos(player.s / world.road.length);
    UI.renderPause({
      ...mp,
      onResume: () => setPause(false),
      onRestart: restartStage,
      onQuit: () => { UI.modal('s-pause', false); paused = false; radio.pause(false); endGame(false, { title: 'Voyage abandonné', text: `Tu as garé le taxi à ${CITIES[run.reached].name}.` }); },
    });
  } else if (world.weather === 'rain') sound.rain(true);
  radio.pause(on);
  UI.modal('s-pause', on);
}

/* ------------------------------------------------------------ fin de partie, record, partage */
// record : nombre d'étapes bouclées (aller puis retour), puis argent en caisse
function loadBest() {
  try {
    const b = JSON.parse(localStorage.getItem('n1.best') || 'null');
    if (b && b.legs == null && b.reached != null) b.legs = b.reached;
    return b;
  } catch { return null; }
}
function saveBest(b) {
  try { localStorage.setItem('n1.best', JSON.stringify(b)); } catch { /* stockage indisponible */ }
}

function endGame(win, reason) {
  state = 'end';
  paused = false;
  sound.silence();
  hud(false);
  UI.clearToasts();
  clearRun();
  if (win) sound.coin(); else sound.fail();
  // voyage interrompu : les passagers encore à bord sont remboursés
  if (!win && run.passengers.length) {
    const back = run.passengers.reduce((acc, p) => acc + p.fare, 0);
    run.money -= back;
    reason = { ...reason, text: `${reason.text} Les ${run.passengers.length} passager${run.passengers.length > 1 ? 's' : ''} encore à bord ${run.passengers.length > 1 ? 'sont remboursés' : 'est remboursé'} (${fmtMoney(back)}).` };
    run.passengers = [];
  }
  const best = loadBest();
  const mine = { money: Math.round(run.money), reached: run.reached, legs: run.legs };
  const isRecord = !best || mine.legs > best.legs || (mine.legs === best.legs && mine.money > best.money);
  if (isRecord) saveBest(mine);
  // carrière : le bénéfice (au-delà de l'avance du patron) va à l'épargne du chauffeur
  const profit = Math.max(0, Math.round(run.money) - START_CASH);
  career.savings += profit;
  career.earned += profit;
  career.km += Math.round(run.stats.km || 0);
  if (win) { career.trips++; if (run.dir < 0) career.returns++; }
  saveCareer(career);
  const roundTrip = win && run.dir < 0;
  UI.renderEnd({
    win, roundTrip, reason, run, best: isRecord ? mine : best, isRecord, profit, career,
    onRestart: startTitle,
    onShare: async () => {
      const url = location.origin + location.pathname;
      const text = roundTrip
        ? `J’ai fait Lomé → Dapaong → Lomé en taxi-brousse sur Route N1 avec ${fmtMoney(run.money)} en caisse. Tu fais mieux ?`
        : win
          ? `J’ai relié Lomé à Dapaong en taxi-brousse sur Route N1 avec ${fmtMoney(run.money)} en caisse. Tu fais mieux ?`
          : `Mon taxi-brousse s’est arrêté à ${CITIES[run.reached].name} sur Route N1 (${fmtMoney(run.money)} en caisse). Tu fais mieux ?`;
      try {
        if (navigator.share) { await navigator.share({ title: 'Route N1', text, url }); return 'Merci pour le partage !'; }
        await navigator.clipboard.writeText(`${text} ${url}`);
        return 'Texte copié : colle-le où tu veux.';
      } catch { return 'Partage annulé.'; }
    },
  });
  UI.show('s-end');
}

const canReturnBtn = () => !!document.querySelector('#a-return');
/* ------------------------------------------------------------ clavier global */
input.on('Enter', () => {
  const btn = { title: document.querySelector('#t-resume') ? '#t-resume' : '#t-start', gare: '#g-go', arrival: canReturnBtn() ? '#a-return' : '#a-next', end: '#e-restart', garage: '#g-save', cine: '#c-skip' }[state];
  if (btn && !document.querySelector('.screen.modal.on')) document.querySelector(btn)?.click();
});
input.on('KeyP', () => setPause(!paused));
// manette : A valide les écrans (ou reprend la partie), Start met en pause, B ferme la pause, LB station précédente
input.on('PadA', () => { if (paused) setPause(false); else if (state !== 'drive') input.emit('Enter'); });
input.on('PadB', () => { if (paused) setPause(false); });
input.on('PadStart', () => { if (state === 'drive') setPause(!paused); else input.emit('Enter'); });
input.on('PadLB', () => { if (state === 'drive') radio.nextStation(-1); });
input.on('PadConnected', () => UI.toast('Manette connectée : RT accélère, LT freine, stick pour tourner, X klaxonne, Start pause.', 'good', 4200));
input.on('PadDisconnected', () => { UI.toast('Manette déconnectée.', 'warn', 2400); if (state === 'drive' && !paused) setPause(true); });
input.on('Escape', () => setPause(!paused));
input.on('KeyC', () => { camMode = (camMode + 1) % 3; });
input.on('KeyM', toggleSound);
input.on('KeyR', () => { if (state === 'drive') radio.power(); });
input.on('KeyN', () => { if (state === 'drive') radio.nextTrack(); });
input.on('KeyT', () => { if (state === 'drive') radio.nextStation(1); });
input.on('KeyV', () => { if (state === 'drive') radio.cycleView(); });
document.getElementById('b-pause').onclick = () => setPause(true);
document.getElementById('b-cam').onclick = () => { camMode = (camMode + 1) % 3; };
document.getElementById('b-sound').onclick = toggleSound;
function toggleSound() {
  sound.setMuted(!sound.muted);
  radio.setMuted(sound.muted);
  document.getElementById('b-sound').classList.toggle('off', sound.muted);
}
document.getElementById('b-sound').classList.toggle('off', sound.muted);
document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); radio.background(document.hidden); });
// pause automatique quand on quitte la fenêtre
addEventListener('blur', () => setTimeout(() => { if (state === 'drive' && !paused && !document.hasFocus()) setPause(true); }, 0));

/* ------------------------------------------------------------ caméra et visuels */
const fw = new THREE.Vector3();
const desired = new THREE.Vector3();
const lookT = new THREE.Vector3();
const camLook = new THREE.Vector3();
let orbitA = 0.6;
const _g = new THREE.Vector3();

let turntable = 0;
function placeTaxi() {
  const inGarage = state === 'garage';
  showroom.visible = inGarage;
  world.group.visible = !inGarage;
  if (inGarage) {
    turntable += lastDt * 0.35;
    showroom.position.set(0, -400, 0);
    taxi.group.position.set(0, -399.78, 0);
    taxi.group.rotation.set(0, turntable, 0);
    taxi.body.position.y = 0; taxi.body.rotation.set(0, 0, 0);
    return;
  }
  const r = world.road;
  const f = r.sample(player.s);
  r.toWorld(player.s, player.x, taxi.group.position);
  if (Math.abs(player.x) > SHOULDER) {
    r.groundAt(player.s, player.x, _g);
    taxi.group.position.y = Math.max(_g.y, taxi.group.position.y - 0.7);
  }
  taxi.group.rotation.set(-Math.atan(f.grade), f.h - player.yaw, 0);
  taxi.body.position.y = player.bounce;
  taxi.body.rotation.x = player.pitch;
  taxi.body.rotation.z = player.roll;
  for (const w of taxi.wheels) w.rotation.x = player.wheelRot;
  taxi.goat.visible = run.passengers.some((p) => TRAITS[p.trait].goat);
  taxi.heads.count = Math.min(taxi.heads.instanceMatrix.count, 1 + run.passengers.length);
  taxi.bags.forEach((b, i) => { b.visible = i < run.bags - (taxi.goat.visible ? 1 : 0); });
}

function updateCamera(dt) {
  const pos = taxi.group.position;
  const h = taxi.group.rotation.y;
  fw.set(Math.sin(h), 0, Math.cos(h));
  if (state === 'drive' || state === 'rescue') {
    const portrait = camera.aspect < 0.9;
    let back = portrait ? 10.5 : 8.2, up = portrait ? 4.2 : 3.3, ahead = 10, k = 5;
    if (camMode === 1) { back = 14; up = 6.2; ahead = 16; }
    if (camMode === 2) { back = -0.2; up = 1.75; ahead = 25; k = 30; }
    desired.copy(pos).addScaledVector(fw, -back);
    desired.y += up;
    camera.position.lerp(desired, 1 - Math.exp(-dt * k));
    if (camMode !== 2) camera.position.y = Math.max(camera.position.y, pos.y + 1.6);
    lookT.copy(pos).addScaledVector(fw, ahead);
    lookT.y += camMode === 2 ? 1.2 : 1.3;
    camLook.lerp(lookT, 1 - Math.exp(-dt * (camMode === 2 ? 30 : 8)));
    const sh = player.shake * 0.25;
    camera.position.x += (Math.random() - 0.5) * sh;
    camera.position.y += (Math.random() - 0.5) * sh;
    camera.lookAt(camLook);
    const fov = (portrait ? 72 : 58) + Math.min(14, Math.abs(player.v) * 0.4);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 2); camera.updateProjectionMatrix(); }
  } else if (state === 'garage') {
    const narrow = camera.aspect < 0.9;
    desired.set(narrow ? 0 : 2.6, -400 + (narrow ? 3.6 : 2.3), narrow ? 11 : 8.6);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
    lookT.set(narrow ? 0 : 3.1, -399 + (narrow ? -0.4 : 0.1), 0);
    camLook.lerp(lookT, 1 - Math.exp(-dt * 6));
    camera.lookAt(camLook);
  } else {
    // plan cinématique : la caméra balaie l'avant du taxi, la route file derrière
    orbitA += dt;
    const a = Math.sin(orbitA * 0.11) * 0.75 + 0.35;
    const R = state === 'title' ? 9 : 8;
    const hr = world.road.headingAt(player.s);
    const lx = Math.sin(a) * R, lz = Math.cos(a) * R;
    const ch = Math.cos(hr), sh = Math.sin(hr);
    desired.set(pos.x + lx * ch + lz * sh, pos.y + 2.4, pos.z - lx * sh + lz * ch);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 2.5));
    lookT.copy(pos);
    lookT.y += 1.3;
    camLook.lerp(lookT, 1 - Math.exp(-dt * 4));
    camera.lookAt(camLook);
    if (Math.abs(camera.fov - 52) > 0.05) { camera.fov += (52 - camera.fov) * Math.min(1, dt * 2); camera.updateProjectionMatrix(); }
  }
}

function updateLighting() {
  skyState(run.hour, world.weather, skySt);
  sky.apply(skySt);
  sky.mesh.position.copy(camera.position);
  scene.fog.color.copy(skySt.bottom);
  scene.fog.near = skySt.fogNear;
  scene.fog.far = skySt.fogFar;
  hemi.intensity = 0.32 + skySt.sun * 0.62;
  hemi.color.copy(WHITE).lerp(skySt.top, 0.35);
  sunLight.intensity = skySt.sun * 1.5;
  sunLight.color.copy(WHITE).lerp(skySt.bottom, 0.4);
  sunLight.position.copy(taxi.group.position).addScaledVector(skySt.sunDir, 100);
  sunLight.target.position.copy(taxi.group.position);
  headlight.intensity = skySt.sun < 0.45 ? 160 * (1 - skySt.sun / 0.45) : 0;
  if (SHADOWS) sunLight.shadow.camera.updateProjectionMatrix();
  const B = world.road.biomeAt(clamp(player.s, 0, world.road.length));
  mountains.update(lastDt, camera, skySt, B.mountains || 0);
  clouds.update(lastDt, camera, skySt.cloud);
  clouds.mesh.material.color.copy(WHITE).lerp(skySt.bottom, 0.2).multiplyScalar(0.5 + skySt.sun * 0.5);
  clouds.mesh.material.emissive.copy(skySt.bottom).lerp(WHITE, 0.25).multiplyScalar(0.25 + skySt.sun * 0.45);
  post?.mood(skySt, world.weather);
}
let lastDt = 0.016;

// résolution dynamique : on vise 60 images/s en ajustant la définition de rendu
const perf = { t: 0, frames: 0 };
function adaptResolution(dt) {
  perf.t += dt; perf.frames++;
  if (perf.t < 2) return;
  const fps = perf.frames / perf.t;
  perf.t = 0; perf.frames = 0;
  let next = pixelRatio;
  if (fps < 50) next = Math.max(0.6, pixelRatio - 0.15);
  else if (fps > 58.5) next = Math.min(MAX_PR, pixelRatio + 0.1);
  if (Math.abs(next - pixelRatio) > 0.01) { pixelRatio = next; renderer.setPixelRatio(pixelRatio); resize(); }
}

function hudData() {
  const L = world.road.length;
  return {
    stage: run.stage, dir: run.dir, from: hereCity().name, to: nextCity().name, map: mapPos(clamp(player.s / L, 0, 1)),
    kmLeft: world.road.stage.km * (1 - clamp(player.s / L, 0, 1)),
    stageProgress: player.s / L, money: run.money, hour: run.hour, speed: player.v,
    fuel: run.fuel, hp: run.hp, comfort: comfort(), pax: run.passengers.length,
    weatherLabel: WEATHER_LABEL[world.weather],
  };
}

/* ------------------------------------------------------------ boucle principale */
let last = performance.now();
let freeCam = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  lastDt = dt;
  clock += dt;
  CHAR_U.uTime.value = clock;
  input.poll();
  radio.ui.tick(radio.progress);
  if (!world) return;
  if (state === 'drive' && !paused) {
    updateDrive(dt);
    hudTimer -= dt;
    if (hudTimer <= 0 && state === 'drive') { UI.updateHud(hudData()); hudTimer = 0.1; }
    if (state === 'drive') UI.updateMiniMap(dt, mapPos(clamp(player.s / world.road.length, 0, 1)));
  } else if (!paused && state !== 'rescue') {
    world.traffic.update(dt, player, false, false);
  }
  placeTaxi();
  if (!freeCam) updateCamera(dt);
  updateLod(world.lod, camera.position, isTouch ? 160 : 230, Math.max(260, scene.fog.far + 120));
  updateLighting();
  rain.update(dt, camera);
  if (post) post.composer.render(); else renderer.render(scene, camera);
  if (!document.hidden) adaptResolution(dt);
}

// mobile : le navigateur peut mettre le son en veille ; chaque toucher le réveille
addEventListener('pointerdown', () => { if (sound.ctx && sound.ctx.state !== 'running') sound.ctx.resume(); }, { passive: true });

addEventListener('resize', () => UI.fitTop());
startTitle();
requestAnimationFrame(frame);
document.fonts?.ready.then(() => setTimeout(UI.loaded, 150));
setTimeout(UI.loaded, 2500);

// jeu hors ligne (version publiée seulement) : la page signale au service worker ce qu'elle a chargé
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then((reg) => {
    const urls = [location.href, ...performance.getEntriesByType('resource').map((e) => e.name)];
    reg.active?.postMessage({ cache: urls });
  }).catch(() => { /* pas de cache hors ligne */ });
}

// accès de débogage pour les tests manuels
window.__n1 = { set freeCam(v) { freeCam = v; }, get pixelRatio() { return pixelRatio; }, get run() { return run; }, get world() { return world; }, player, input, get state() { return state; }, setHour: (h) => { run.hour = h; }, renderer, camera,
  goto: (i, weather, dir = 1) => { run.dir = dir; run.stage = i; run.reached = cityAt(dir, i); run.legs = i + (dir < 0 ? LEGS : 0); if (weather) run.weathers[i] = weather; openGare(); },
  get career() { return career; }, startReturn: () => startReturn(), heat: (v) => { world.heat = v; }, flat: () => startFlat() };

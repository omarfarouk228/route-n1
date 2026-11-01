import * as THREE from 'three';
import { CITIES, STAGES, TRAITS, PRICES, SEATS, ROOF, TANK, QUOTES, WEATHER_LABEL, makeOffers, weatherFor } from './data.js';
import { Road, SHOULDER } from './road.js';
import { buildScenery, disposeGroup } from './scenery.js';
import { Traffic } from './traffic.js';
import { Player } from './vehicle.js';
import { makeVehicle, makeShadowTexture, cloud as cloudGeo } from './models.js';
import { VEHICLES, STRIPES, loadCfg, saveCfg } from './garage.js';
import { setCapacity } from './data.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Sky, Rain, Clouds, Mountains, skyState, makeSkyState } from './sky.js';
import { BIOMES } from './data.js';
import { makeComposer } from './post.js';
import * as UI from './ui.js';
import { mulberry32, clamp, pick, fmtMoney, round50 } from './util.js';

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
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.map) { o.material.map.dispose(); o.material.dispose(); }
    });
  }
  taxi = makeVehicle(vehicleCfg(cfg));
  taxi.group.rotation.order = 'YXZ';
  taxi.group.traverse((o) => { if (o.isMesh) o.castShadow = SHADOWS; });
  taxi.group.add(shadow, headlight, headlight.target);
  if (old) { taxi.group.position.copy(old.group.position); taxi.group.rotation.copy(old.group.rotation); }
  scene.add(taxi.group);
  const spec = VEHICLES[cfg.model];
  setCapacity(spec);
  player.len = spec.len; player.wid = spec.wid;
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

function newRun() {
  const seed = (Math.random() * 2 ** 31) | 0;
  const rng = mulberry32(seed);
  const weathers = STAGES.map((_, i) => weatherFor(rng, i));
  weathers[0] = 'clear';
  return {
    seed, rng, weathers, stage: 0, reached: 0, vehicle: VEHICLES[garageCfg.model], cfg: { ...garageCfg },
    money: 12000, fuel: Math.round(VEHICLES[garageCfg.model].tank * 0.52), hp: 100, passengers: [], bags: 0, hour: 6.7,
    stats: { carried: 0, tips: 0, fines: 0, crashes: 0 },
    stageTime: 0, stageLog: [],
  };
}

function loadStage(i) {
  if (world) {
    scene.remove(world.group);
    world.traffic.dispose();
    disposeGroup(world.group);
  }
  const road = new Road(STAGES[i], i, run.seed + i * 7919);
  const group = new THREE.Group();
  group.add(road.buildMeshes());
  const scen = buildScenery(road, mulberry32(run.seed + i * 31), QUALITY, SHADOWS);
  group.add(scen.group);
  const tg = new THREE.Group();
  group.add(tg);
  const traffic = new Traffic(tg, road, mulberry32(run.seed + i * 131), SHADOWS);
  scene.add(group);
  world = { road, group, traffic, checkpoints: scen.checkpoints, potIdx: 0, noteIdx: 0, bumpIdx: 0, weather: run.weathers[i], fuelling: false, fuelLiters: 0, fuelWarned: false };
  player.reset(16, 1.9);
  rain.group.visible = world.weather === 'rain';
}

/* ------------------------------------------------------------ règles */
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
    log(zebu ? 'Zébu heurté (dédommagement)' : 'Chèvre heurtée (dédommagement)', -cost);
    damage(zebu ? 10 + Math.abs(player.v) * 0.8 : 2 + Math.abs(player.v) * 0.2);
    annoy(10);
    player.v *= zebu ? 0.25 : 0.8;
    player.kick(2.5);
    world.traffic.removeItem(it);
    UI.toast(`Tu as heurté ${zebu ? 'un zébu' : 'une chèvre'} ! Le propriétaire réclame ${fmtMoney(cost)}.`, 'bad', 3500);
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
  const ev = player.update(dt, r, inp, run, world.weather);
  run.stageTime += dt;
  run.hour += (dt * 0.8) / 60;
  const speed = Math.abs(player.v);

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
        const str = Math.min(1.6, speed / 18) * (p.r / 0.6);
        damage(0.5 + str * 3);
        annoy(3 + str * 9);
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
      const str = Math.min(1.8, (kmh - 20) / 30);
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

  // contrôles routiers
  for (const c of world.checkpoints) {
    const cp = c.cp;
    const d = cp.s - player.s;
    let open = d > -8 && d < 30;
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
    if (player.s - n.s < 60) UI.toast(n.text, n.kind === 'warn' ? 'warn' : n.kind === 'landmark' ? 'big' : 'info', n.kind === 'landmark' ? 4500 : 3200);
  }

  // trafic
  const hits = world.traffic.update(dt, player, hornNow, true);
  if (world.traffic.events.includes('oncomingHorn')) sound.farHorn();
  for (const it of hits) collide(it);

  sound.engine(speed, player.throttle, true);
  sound.surface(ev.surface, speed);

  // fins possibles
  if (run.hp <= 0) {
    endGame(false, { title: 'Le taxi rend l’âme', text: `Le moteur a lâché entre ${CITIES[run.stage].name} et ${CITIES[run.stage + 1].name}. Les passagers finissent le trajet en zémidjan.` });
    return;
  }
  if (run.fuel <= 0 && speed < 0.3 && !world.fuelling) { openRescue(); return; }
  if (player.s >= r.length - 12) arrive();
}

/* ------------------------------------------------------------ transitions */
function startTitle() {
  buildTaxi(garageCfg);
  run = newRun();
  loadStage(0);
  state = 'title';
  UI.hud(false);
  UI.renderTitle({ best: loadBest(), vehicle: VEHICLES[garageCfg.model].name, onStart: () => { sound.init(); openGare(); }, onGarage: openGarage });
  UI.show('s-title');
}

function openGarage() {
  sound.init();
  state = 'garage';
  let draft = { ...garageCfg };
  const render = () => UI.renderGarage({
    cfg: draft,
    onChange: (c) => { draft = c; buildTaxi(draft); render(); },
    onSave: (c) => { garageCfg = c; saveCfg(c); sound.ok(); startTitle(); },
    onCancel: () => { buildTaxi(garageCfg); startTitle(); },
  });
  render();
  UI.show('s-garage');
}

function openGare() {
  state = 'gare';
  if (!world || world.road.index !== run.stage) loadStage(run.stage);
  offers = makeOffers(run.rng, run.stage, run.passengers);
  UI.hud(false);
  UI.clearToasts();
  renderGare();
  UI.show('s-gare');
}

function renderGare() {
  UI.renderGare({
    run, offers, weather: run.weathers[run.stage],
    onToggle: (id) => {
      const o = offers.find((x) => x.id === id);
      const i = run.passengers.findIndex((p) => p.id === id);
      if (i >= 0) {
        run.passengers.splice(i, 1);
        run.bags -= o.bags;
        run.money -= o.fare;
      } else if (run.passengers.length < SEATS && run.bags + o.bags <= ROOF) {
        o.sat = 100; o.late = false;
        run.passengers.push(o);
        run.bags += o.bags;
        run.money += o.fare;
        sound.coin();
      }
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
  run.stageTime = 0;
  run.stageLog = [];
  player.reset(16, 1.9);
  world.traffic.clearAll();
  UI.show(null);
  UI.hud(true);
  UI.clearToasts();
  const from = CITIES[run.stage].name, to = CITIES[run.stage + 1].name;
  UI.toast(`${from} → ${to}`, 'big', 2600);
  if (run.stage === 0) {
    setTimeout(() => state === 'drive' && UI.toast(isTouch ? 'Astuce : le bouton Klaxon fait ranger les camions à droite.' : 'Astuce : <b>Espace</b> pour klaxonner, le camion devant toi se range à droite.', 'info', 4200), 3500);
  }
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
  UI.hud(false);
  const ci = run.stage + 1;
  const city = CITIES[ci];
  const par = STAGES[run.stage].length / 19;
  for (const p of run.passengers) if (TRAITS[p.trait].rush && run.stageTime > par) p.late = true;
  const lines = [...run.stageLog];
  let tipsTotal = 0;
  for (const p of run.passengers.filter((q) => q.to === ci)) {
    const T = TRAITS[p.trait];
    let tip = 0, label;
    const e = p.female ? 'e' : '';
    if (p.sat >= 85) { tip = round50(p.fare * 0.15 * (T.tipMul || 1)); label = `${p.name} est ravi${e} : pourboire`; }
    else if (p.sat >= 60) { label = `${p.name} descend sans rien dire`; }
    else if (p.sat >= 35) { tip = -round50(p.fare * 0.2); label = `${p.name} discute le prix (trajet secoué)`; }
    else { tip = -round50(p.fare * 0.45); label = `${p.name} exige un remboursement`; }
    lines.push({ label, amount: tip });
    if (T.rush) {
      if (!p.late) { const b = round50(p.fare * 0.2); lines.push({ label: `${p.name} est arrivé${e} à l’heure : bonus`, amount: b }); tip += b; }
      else lines.push({ label: `${p.name} est arrivé${e} en retard`, amount: 0 });
    }
    run.money += tip;
    tipsTotal += tip;
    run.stats.tips += tip;
    run.stats.carried++;
  }
  run.passengers = run.passengers.filter((p) => p.to !== ci);
  for (const p of run.passengers) p.sat = Math.min(100, p.sat + 15);
  run.bags = run.passengers.reduce((a, p) => a + p.bags, 0);
  run.hour += 0.35;
  run.stage = ci;
  run.reached = ci;
  if (tipsTotal > 0) sound.coin();
  const last = ci === CITIES.length - 1;
  UI.renderArrival({
    run, city, lines, stageTime: run.stageTime, last,
    extra: run.passengers.length ? `${run.passengers.length} passager${run.passengers.length > 1 ? 's' : ''} continue${run.passengers.length > 1 ? 'nt' : ''} le voyage.` : '',
    onNext: last ? () => endGame(true) : openGare,
  });
  UI.show('s-arrival');
}

function openRescue() {
  state = 'rescue';
  sound.silence();
  UI.renderRescue({
    money: run.money,
    onPay: () => {
      run.money -= PRICES.rescue;
      run.fuel += PRICES.rescueLiters;
      log('Zémidjan parti chercher de l’essence', -PRICES.rescue);
      UI.modal('s-modal', false);
      state = 'drive';
    },
    onGiveUp: () => {
      UI.modal('s-modal', false);
      endGame(false, { title: 'Panne sèche', text: `Le taxi s’arrête au bord de la N1, entre ${CITIES[run.stage].name} et ${CITIES[run.stage + 1].name}.` });
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
    UI.renderPause({
      onResume: () => setPause(false),
      onRestart: restartStage,
      onQuit: () => { UI.modal('s-pause', false); paused = false; endGame(false, { title: 'Voyage abandonné', text: `Tu as garé le taxi à ${CITIES[run.reached].name}.` }); },
    });
  } else if (world.weather === 'rain') sound.rain(true);
  UI.modal('s-pause', on);
}

/* ------------------------------------------------------------ fin de partie, record, partage */
function loadBest() {
  try { return JSON.parse(localStorage.getItem('n1.best') || 'null'); } catch { return null; }
}
function saveBest(b) {
  try { localStorage.setItem('n1.best', JSON.stringify(b)); } catch { /* stockage indisponible */ }
}

function endGame(win, reason) {
  state = 'end';
  paused = false;
  sound.silence();
  UI.hud(false);
  UI.clearToasts();
  if (win) sound.coin(); else sound.fail();
  const best = loadBest();
  const mine = { money: Math.round(run.money), reached: run.reached };
  const isRecord = !best || mine.reached > best.reached || (mine.reached === best.reached && mine.money > best.money);
  if (isRecord) saveBest(mine);
  UI.renderEnd({
    win, reason, run, best: isRecord ? mine : best, isRecord,
    onRestart: startTitle,
    onShare: async () => {
      const url = location.origin + location.pathname;
      const text = win
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

/* ------------------------------------------------------------ clavier global */
input.on('Enter', () => {
  const btn = { title: '#t-start', gare: '#g-go', arrival: '#a-next', end: '#e-restart', garage: '#g-save' }[state];
  if (btn && !document.querySelector('.screen.modal.on')) document.querySelector(btn)?.click();
});
input.on('KeyP', () => setPause(!paused));
input.on('Escape', () => setPause(!paused));
input.on('KeyC', () => { camMode = (camMode + 1) % 3; });
input.on('KeyM', toggleSound);
document.getElementById('b-pause').onclick = () => setPause(true);
document.getElementById('b-cam').onclick = () => { camMode = (camMode + 1) % 3; };
document.getElementById('b-sound').onclick = toggleSound;
function toggleSound() {
  sound.setMuted(!sound.muted);
  document.getElementById('b-sound').classList.toggle('off', sound.muted);
}
document.getElementById('b-sound').classList.toggle('off', sound.muted);
document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
addEventListener('blur', () => { if (state === 'drive' && !paused) setPause(true); });

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
    orbitA += dt * 0.1;
    const R = state === 'title' ? 9.5 : state === 'garage' ? 6.8 : 8.5;
    desired.set(pos.x + Math.sin(orbitA) * R, pos.y + (state === 'garage' ? 2.2 : 3.2), pos.z + Math.cos(orbitA) * R);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 3));
    lookT.copy(pos);
    lookT.y += 1.2;
    camLook.lerp(lookT, 1 - Math.exp(-dt * 4));
    camera.lookAt(camLook);
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
    stage: run.stage, kmLeft: STAGES[run.stage].km * (1 - clamp(player.s / L, 0, 1)),
    stageProgress: player.s / L, money: run.money, hour: run.hour, speed: player.v,
    fuel: run.fuel, hp: run.hp, comfort: comfort(), pax: run.passengers.length,
    weatherLabel: WEATHER_LABEL[world.weather],
  };
}

/* ------------------------------------------------------------ boucle principale */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  lastDt = dt;
  clock += dt;
  if (!world) return;
  if (state === 'drive' && !paused) {
    updateDrive(dt);
    hudTimer -= dt;
    if (hudTimer <= 0 && state === 'drive') { UI.updateHud(hudData()); hudTimer = 0.1; }
  } else if (!paused && state !== 'rescue') {
    world.traffic.update(dt, player, false, false);
  }
  placeTaxi();
  updateCamera(dt);
  updateLighting();
  rain.update(dt, camera);
  if (post) post.composer.render(); else renderer.render(scene, camera);
  if (!document.hidden) adaptResolution(dt);
}

startTitle();
requestAnimationFrame(frame);
document.fonts?.ready.then(() => setTimeout(UI.loaded, 150));
setTimeout(UI.loaded, 2500);

// accès de débogage pour les tests manuels
window.__n1 = { get pixelRatio() { return pixelRatio; }, get run() { return run; }, get world() { return world; }, player, input, get state() { return state; }, setHour: (h) => { run.hour = h; }, renderer, camera,
  goto: (i, weather) => { run.stage = i; run.reached = i; if (weather) run.weathers[i] = weather; openGare(); } };

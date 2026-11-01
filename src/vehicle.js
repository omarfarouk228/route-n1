import { HALF_ROAD, SHOULDER } from './road.js';
import { clamp } from './util.js';
import { SEATS, ROOF } from './data.js';

// Physique arcade dans le repère de la route : s (abscisse), x (décalage latéral, + = droite), yaw (angle par rapport à l'axe).
export class Player {
  constructor() {
    this.reset(18, 1.9);
  }

  reset(s, x) {
    this.s = s; this.x = x; this.yaw = 0; this.v = 0; this.steer = 0;
    this.bounce = 0; this.bounceV = 0; this.shake = 0; this.roll = 0; this.pitch = 0;
    this.wheelRot = 0; this.brakeHold = 0; this.lat = 0; this.surface = 0; this.throttle = 0;
  }

  update(dt, road, input, run, weather) {
    const f = road.sample(this.s);
    const load = run.passengers.length * 70 + run.bags * 28;
    const loadF = load / (SEATS * 70 + ROOF * 28);
    const mass = 1350 + load;
    const wet = weather === 'rain';
    const grip = wet ? 0.82 : 1;
    const ev = { hardBrake: false, wall: 0, lat: 0, surface: 0 };

    // direction
    const target = clamp((input.right ? 1 : 0) - (input.left ? 1 : 0) + (input.axis || 0), -1, 1);
    this.steer += (target - this.steer) * Math.min(1, dt * 7);
    const rate = (1.75 / (1 + Math.abs(this.v) / 13)) * (1 - loadF * 0.22) * grip;
    const yawRate = this.steer * rate * Math.sign(this.v || 1);
    this.yaw += yawRate * dt + f.k * this.v * dt;
    if (Math.abs(target) < 0.05) this.yaw -= this.yaw * Math.min(1, dt * 2.4 * grip);
    this.yaw = clamp(this.yaw, -0.75, 0.75);

    // moteur, frein, pente
    const fuelOk = run.fuel > 0;
    const thr = input.gas && fuelOk ? 1 : 0;
    this.throttle += (thr - this.throttle) * Math.min(1, dt * 5);
    let F = this.throttle * 3900 * Math.max(0, 1 - Math.max(0, this.v) / 38);
    F -= 0.85 * this.v * Math.abs(this.v) + 38 * this.v;
    F -= mass * 9.81 * f.grade;
    const ax = Math.abs(this.x);
    this.surface = ax > SHOULDER ? 2 : ax > HALF_ROAD + 0.4 ? 1 : 0;
    if (this.surface === 1) F -= 140 * this.v;
    if (this.surface === 2) F -= 520 * this.v;
    let a = F / mass;

    if (input.brake) {
      if (this.v > 0.3) {
        a -= 7.2 * (wet ? 0.72 : 1);
        if (this.v > 14) ev.hardBrake = true;
        this.brakeHold = 0;
      } else {
        this.brakeHold += dt;
        if (this.brakeHold > 0.35) a -= 2.4; // marche arrière lente
      }
    } else this.brakeHold = 0;

    const prev = this.v;
    this.v += a * dt;
    if (input.brake && prev > 0 && this.v < 0 && this.brakeHold < 0.35) this.v = 0;
    if (!input.brake && !thr && Math.abs(this.v) < 0.25 && Math.abs(f.grade) < 0.03) this.v = 0;
    this.v = clamp(this.v, -4, 40);

    // avance
    this.s += this.v * Math.cos(this.yaw) * dt;
    this.x += this.v * Math.sin(this.yaw) * dt;

    // murs (falaise de la faille ou limite du monde)
    const lim = road.wallLimit(this.s);
    if (Math.abs(this.x) > lim) {
      this.x = Math.sign(this.x) * lim;
      if (Math.abs(this.v) > 3) ev.wall = Math.abs(this.v);
      this.v *= 0.45;
      this.yaw *= -0.3;
    }
    if (this.s < -40) { this.s = -40; this.v = Math.max(0, this.v); }

    // carburant
    const lpm = 0.0034 * (1 + loadF * 0.55) * (0.45 + 0.55 * this.throttle) + Math.max(0, f.grade) * 0.025 * this.throttle;
    run.fuel = Math.max(0, run.fuel - lpm * Math.abs(this.v) * dt - (input.gas ? 0.002 * dt : 0.0004 * dt));

    // ressentis
    this.lat = Math.abs(this.v * this.v * f.k + yawRate * this.v * 0.6);
    ev.lat = this.lat;
    ev.surface = this.surface;

    // animation de caisse
    this.bounceV += (-this.bounce * 60 - this.bounceV * 7) * dt;
    if (this.surface > 0 && Math.abs(this.v) > 2) this.bounceV += (Math.random() - 0.5) * (this.surface === 2 ? 3 : 1.2) * Math.min(1, this.v / 15);
    this.bounce += this.bounceV * dt;
    this.roll += (clamp(-this.steer * this.v * 0.006 * (1 + loadF), -0.09, 0.09) - this.roll) * Math.min(1, dt * 5);
    this.pitch += (clamp(a * -0.006, -0.05, 0.05) - this.pitch) * Math.min(1, dt * 4);
    this.wheelRot += (this.v * dt) / 0.36;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    return ev;
  }

  kick(strength) {
    this.bounceV += strength;
    this.shake = Math.min(1, this.shake + strength * 0.25);
  }
}

// Sons synthétisés avec WebAudio : aucun fichier audio à télécharger.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('n1.muted') === '1'; } catch { /* stockage indisponible */ }
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iPhone : catégorie « lecture » pour que le son du jeu passe même en mode silencieux
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* non pris en charge */ }
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(ctx.destination);

    // moteur : deux oscillateurs filtrés
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 600;
    this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth';
    this.o2 = ctx.createOscillator(); this.o2.type = 'square';
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    this.o1.connect(this.engFilter); this.o2.connect(g2); g2.connect(this.engFilter);
    this.engFilter.connect(this.engGain); this.engGain.connect(this.master);
    this.o1.start(); this.o2.start();

    // klaxon tenu : deux notes de klaxon de voiture et leurs harmoniques, filtrées autour de 1,2 kHz
    // (les haut-parleurs de téléphone rendent mal les graves)
    this.hornGain = ctx.createGain(); this.hornGain.gain.value = 0;
    const hf = ctx.createBiquadFilter(); hf.type = 'peaking'; hf.frequency.value = 1200; hf.Q.value = 0.9; hf.gain.value = 9;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 280;
    for (const [f, type, g] of [[415, 'square', 0.5], [523, 'square', 0.45], [830, 'sawtooth', 0.25], [1046, 'sawtooth', 0.18]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.value = g;
      o.connect(og); og.connect(hp); o.start();
    }
    hp.connect(hf); hf.connect(this.hornGain); this.hornGain.connect(this.master);
    this.hornUntil = 0;

    // bruit blanc partagé
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // pluie
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
    const rf = ctx.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 2400; rf.Q.value = 0.6;
    const rs = ctx.createBufferSource(); rs.buffer = this.noiseBuf; rs.loop = true;
    rs.connect(rf); rf.connect(this.rainGain); this.rainGain.connect(this.master); rs.start();

    // roulement sur latérite
    this.gravelGain = ctx.createGain(); this.gravelGain.gain.value = 0;
    const gf = ctx.createBiquadFilter(); gf.type = 'lowpass'; gf.frequency.value = 500;
    const gs = ctx.createBufferSource(); gs.buffer = this.noiseBuf; gs.loop = true;
    gs.connect(gf); gf.connect(this.gravelGain); this.gravelGain.connect(this.master); gs.start();
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('n1.muted', m ? '1' : '0'); } catch { /* ignore */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05);
  }

  // v en m/s, throttle 0..1
  engine(v, throttle, on = true) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const gears = [0, 7, 13, 19, 25, 31, 50];
    let g = 0;
    while (g < gears.length - 2 && v > gears[g + 1]) g++;
    const rpm = 0.22 + 0.78 * ((v - gears[g]) / (gears[g + 1] - gears[g]));
    const f = 32 + rpm * 70 + throttle * 8;
    this.o1.frequency.setTargetAtTime(f, t, 0.05);
    this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.engFilter.frequency.setTargetAtTime(350 + rpm * 900 + throttle * 500, t, 0.08);
    this.engGain.gain.setTargetAtTime(on ? (0.07 + throttle * 0.07) * (this.duck ? 0.6 : 1) : 0, t, 0.1);
  }

  surface(level, v) {
    if (!this.ctx) return;
    this.gravelGain.gain.setTargetAtTime(level ? Math.min(0.25, v / 60) * level : 0, this.ctx.currentTime, 0.1);
  }

  rain(on) {
    if (!this.ctx) return;
    this.rainGain.gain.setTargetAtTime(on ? 0.12 : 0, this.ctx.currentTime, 0.5);
  }

  silence() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engGain.gain.setTargetAtTime(0, t, 0.1);
    this.gravelGain.gain.setTargetAtTime(0, t, 0.1);
    this.rainGain.gain.setTargetAtTime(0, t, 0.3);
    this.hornUntil = 0;
    this.hornHold(false);
  }

  tone(freqs, dur, type = 'square', vol = 0.12, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur - 0.05);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(this.master);
    for (const f of freqs) {
      const o = this.ctx.createOscillator();
      o.type = type; o.frequency.value = f;
      o.connect(g); o.start(t); o.stop(t + dur + 0.02);
    }
  }

  noise(dur, freq, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur);
  }

  // coup de klaxon (durée minimale), prolongé tant que la touche est tenue (voir hornHold)
  horn() {
    if (!this.ctx) return;
    this.init();
    this.hornUntil = this.ctx.currentTime + 0.32;
    this.hornHold(true);
  }
  hornHold(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const want = on || t < this.hornUntil;
    if (want === this.hornOn) return;
    this.hornOn = want;
    this.hornGain.gain.cancelScheduledValues(t);
    this.hornGain.gain.setTargetAtTime(want ? 0.2 : 0, t, want ? 0.012 : 0.04);
  }
  farHorn() { this.tone([330, 415], 0.5, 'sawtooth', 0.04); }
  bump(strength = 1) { this.noise(0.18, 180, 0.35 * strength); }
  crash() { this.noise(0.6, 900, 0.6); this.noise(0.4, 120, 0.8); }
  coin() { this.tone([880], 0.08, 'sine', 0.1); this.tone([1320], 0.12, 'sine', 0.1, 0.08); }
  whistle() { this.tone([2900], 0.25, 'sine', 0.05); this.tone([2900], 0.45, 'sine', 0.05, 0.3); }
  ok() { this.tone([660, 990], 0.15, 'triangle', 0.08); }
  fail() { this.tone([220], 0.4, 'sawtooth', 0.08); }
}

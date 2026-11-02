// Autoradio : une station originale générée en direct (sans fichier) et des stations de fichiers audio
// déposés dans public/radio/<station>/ et listés dans public/radio/playlist.json (voir `npm run radio`).
// Lecteur maison : lecture, pause, avance, barre de progression, volume ; trois affichages
// (ouvert, réduit à une barre, masqué derrière une pastille) sans couper la musique.

export const SYNTH = {
  id: 'groove', name: 'N1 Groove', freq: '88.1', kind: 'synth',
  desc: 'Musique originale du jeu, générée en direct : cloche gankogui, afrobeat et guitare highlife.',
  tracks: [{ title: 'Agbadza de la route', artist: 'Route N1', preset: 0 }, { title: 'Highlife du Mono', artist: 'Route N1', preset: 1 }, { title: 'Nuit à Kara', artist: 'Route N1', preset: 2 }],
};
// stations de fichiers : remplies au démarrage depuis playlist.json (les stations vides sont ignorées)
export const STATIONS = [SYNTH];

export async function loadPlaylist() {
  try {
    const base = import.meta.env.BASE_URL || './';
    const r = await fetch(`${base}radio/playlist.json`, { cache: 'no-cache' });
    if (!r.ok) return STATIONS;
    const data = await r.json();
    for (const st of data.stations || []) {
      const tracks = (st.tracks || []).filter((t) => t && t.src).map((t) => ({ ...t, src: /^https?:/.test(t.src) ? t.src : `${base}radio/${t.src}` }));
      if (!tracks.length) continue;
      STATIONS.push({ id: st.id, name: st.name || st.id, freq: st.freq || '', kind: 'file', desc: st.desc || '', tracks });
    }
  } catch { /* pas de playlist : seule la station générée est disponible */ }
  return STATIONS;
}

/* ------------------------------------------------------------ station originale (WebAudio) */
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// [tempo, accords (racine midi + qualité), gamme de basse]
const PRESETS = [
  { bpm: 108, chords: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']], bell: 'x.x.x..x.x.x..x.', kick: 'x.....x.x..x....', clap: '....x.......x...', swing: 0.06 },
  { bpm: 122, chords: [[48, 'M'], [53, 'M'], [55, 'M'], [48, 'M']], bell: 'x..x..x.x..x..x.', kick: 'x...x...x...x...', clap: '....x.......x..x', swing: 0.02 },
  { bpm: 96, chords: [[50, 'm'], [55, 'm'], [53, 'M'], [57, 'm']], bell: 'x.x..x.x.x..x.x.', kick: 'x......xx.......', clap: '....x.......x...', swing: 0.09 },
];
const TRIAD = { m: [0, 3, 7], M: [0, 4, 7] };

export class SynthStation {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.0;
    this.out.connect(out);
    this.timer = null;
    this.step = 0;
    this.preset = PRESETS[0];
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  play(presetIndex) {
    this.stop();
    this.preset = PRESETS[presetIndex % PRESETS.length];
    this.step = 0;
    this.next = this.ctx.currentTime + 0.08;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setTargetAtTime(0.32 * (this.level ?? 1), this.ctx.currentTime, 0.4);
    this.timer = setInterval(() => this.schedule(), 25);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }
  schedule() {
    const P = this.preset, sixteenth = 60 / P.bpm / 4;
    while (this.next < this.ctx.currentTime + 0.12) {
      const st = this.step % 16, bar = Math.floor(this.step / 16);
      const t = this.next + (st % 2 ? P.swing * sixteenth * 2 : 0);
      const [root, q] = P.chords[bar % P.chords.length];
      if (P.kick[st] === 'x') this.kick(t);
      if (P.clap[st] === 'x') this.clap(t);
      if (P.bell[st] === 'x') this.bell(t, st === 0 ? 1 : 0.7);
      this.shaker(t, st % 4 === 2 ? 0.9 : st % 2 ? 0.35 : 0.55);
      // basse : fondamentale, quinte, octave en motif syncopé
      const bassPat = [0, null, null, 7, null, null, 12, null, 0, null, 7, null, null, 10, null, 7];
      if (bassPat[st] != null) this.bass(t, NOTE(root - 12 + bassPat[st]), sixteenth * 1.6);
      // guitare highlife : arpège en doubles croches
      const tri = TRIAD[q];
      if (st % 2 === 0 || (bar % 2 && st % 3 === 0)) {
        const n = root + 12 + tri[(Math.floor(st / 2) + bar) % 3] + (st >= 8 ? 12 : 0);
        this.pluck(t, NOTE(n), 0.07);
      }
      // nappes d'accords en contretemps
      if (st === 2 || st === 10) for (const iv of tri) this.stab(t, NOTE(root + iv), sixteenth * 1.5);
      this.next += sixteenth;
      this.step++;
    }
  }
  env(t, a, d, peak, dest, type, f, detune = 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + d + 0.02);
    return o;
  }
  kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.32);
  }
  noiseHit(t, dur, freq, q, vol, type = 'bandpass') {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  clap(t) { this.noiseHit(t, 0.16, 1500, 0.8, 0.5); this.noiseHit(t + 0.012, 0.12, 2200, 1, 0.3); }
  shaker(t, v) { this.noiseHit(t, 0.05, 7000, 1.2, 0.09 * v, 'highpass'); }
  bell(t, v) {
    // cloche double (gankogui) : partiels inharmoniques
    this.env(t, 0.002, 0.18, 0.09 * v, this.out, 'square', 1250);
    this.env(t, 0.002, 0.25, 0.06 * v, this.out, 'sine', 1870);
  }
  bass(t, f, d) {
    const o = this.env(t, 0.01, d, 0.34, this.out, 'sawtooth', f);
    void o;
    this.env(t, 0.01, d, 0.28, this.out, 'sine', f);
  }
  pluck(t, f, vol) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), fl = this.ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(3200, t); fl.frequency.exponentialRampToValueAtTime(700, t + 0.2);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(fl); fl.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.3);
  }
  stab(t, f, d) { this.env(t, 0.01, d, 0.035, this.out, 'sawtooth', f, 8); this.env(t, 0.01, d, 0.03, this.out, 'sawtooth', f, -8); }
}

/* ------------------------------------------------------------ radio */
export class Radio {
  constructor(sound, ui) {
    this.sound = sound;
    this.ui = ui; // { render(state), view(v) }
    this.station = -1; // -1 = éteint
    this.track = 0;
    this.synth = null;
    this.order = {};
    this.muted = false;
    this.paused = false; // pause demandée par l'auditeur
    this.fails = 0;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => this.nextTrack());
    this.audio.addEventListener('error', () => this.onError());
    this.audio.addEventListener('play', () => { this.fails = 0; this.render(); });
    this.audio.addEventListener('pause', () => this.render());
    this.audio.addEventListener('loadedmetadata', () => this.render());
    try { this.saved = JSON.parse(localStorage.getItem('n1.radio') || 'null'); } catch { this.saved = null; }
    this.volume = this.saved?.volume ?? 0.8;
    this.audio.volume = this.volume;
    this.viewMode = ['open', 'min', 'hidden'].includes(this.saved?.view) ? this.saved.view : null;
  }
  get current() { return this.station >= 0 ? STATIONS[this.station] : null; }
  get isFile() { return this.current?.kind === 'file'; }
  get trackInfo() { const s = this.current; return s && s.tracks.length ? s.tracks[this.trackIndex()] : null; }
  get playing() { return this.current?.kind === 'synth' ? !this.muted && !this.paused : this.isFile && !this.audio.paused; }
  trackIndex() {
    const s = this.current;
    const ord = (this.order[s.id] ||= shuffle(s.tracks.map((_, i) => i)));
    return ord[this.track % ord.length];
  }
  save() { try { localStorage.setItem('n1.radio', JSON.stringify({ station: this.station >= 0 ? STATIONS[this.station].id : null, volume: this.volume, view: this.viewMode })); } catch { /* ignore */ } }
  restore() {
    const id = this.saved?.station;
    const i = typeof id === 'string' ? STATIONS.findIndex((s) => s.id === id) : typeof id === 'number' ? id : -1;
    if (id === null) { this.render(); return; }
    this.tune(i >= 0 && i < STATIONS.length ? i : 0);
  }

  tune(i) {
    this.stopAll();
    this.station = i;
    this.track = 0;
    this.paused = false;
    this.fails = 0;
    this.save();
    this.playCurrent();
  }
  power() { if (this.station >= 0) { this.stopAll(); this.station = -1; this.save(); this.render(); } else this.tune(0); }
  nextStation(d = 1) { this.tune(((this.station < 0 ? 0 : this.station) + d + STATIONS.length) % STATIONS.length); }
  nextTrack(d = 1) {
    if (!this.current) return;
    if (this.isFile && d < 0 && this.audio.currentTime > 4) { this.audio.currentTime = 0; return; }
    this.track = Math.max(0, this.track + d);
    this.paused = false;
    this.playCurrent();
  }
  toggle() {
    if (!this.current) { this.tune(0); return; }
    this.paused = !this.paused;
    if (this.isFile) { if (this.paused) this.audio.pause(); else this.resume(); }
    else if (this.paused) this.synth?.stop(); else if (!this.muted) this.synth?.play(this.trackInfo.preset);
    this.render();
  }
  seek(frac) { if (this.isFile && isFinite(this.audio.duration)) this.audio.currentTime = Math.max(0, Math.min(0.999, frac)) * this.audio.duration; }
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v)); this.audio.volume = this.volume;
    if (this.synth) { this.synth.level = this.volume; if (this.synth.timer) this.synth.out.gain.setTargetAtTime(0.32 * this.volume, this.synth.ctx.currentTime, 0.05); }
    this.save(); this.render();
  }
  // affichage : ouvert, réduit (barre), masqué (pastille) ; la musique continue dans tous les cas
  setView(v) { this.viewMode = v; this.save(); this.ui.view(v); }
  cycleView() { const order = ['open', 'min', 'hidden']; this.setView(order[(order.indexOf(this.viewMode || 'open') + 1) % 3]); }

  stopAll() {
    this.synth?.stop();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
  resume() {
    if (this.muted || this.paused) return;
    const p = this.audio.play();
    // lecture refusée par le navigateur (pas encore de geste) : on attend un appui sur ▶
    if (p && p.catch) p.catch(() => { this.paused = true; this.render('blocked'); });
  }
  onError() {
    if (!this.isFile || !this.audio.getAttribute('src')) return;
    this.fails++;
    if (this.fails >= this.current.tracks.length) { this.render('broken'); return; }
    this.nextTrack();
  }
  playCurrent() {
    const s = this.current;
    if (!s) return;
    const t = this.trackInfo;
    if (s.kind === 'synth') {
      this.audio.pause();
      this.sound.init();
      if (!this.synth) this.synth = new SynthStation(this.sound.ctx, this.sound.master);
      this.synth.level = this.volume;
      if (!this.muted && !this.paused) this.synth.play(t.preset);
      this.render();
      return;
    }
    this.synth?.stop();
    this.audio.src = t.src;
    this.audio.muted = this.muted;
    this.resume();
    this.render();
  }
  // pause du jeu : comme un autoradio, la musique continue ; onglet masqué : tout s'arrête
  pause(on) {
    const s = this.current;
    if (!s || this.muted || this.paused) return;
    if (s.kind === 'synth') { if (on) this.synth?.stop(); else this.synth?.play(this.trackInfo.preset); }
  }
  background(hidden) {
    if (!this.isFile || this.paused || this.muted) return;
    if (hidden) this.audio.pause(); else this.resume();
  }
  // couper le son coupe aussi la radio
  setMuted(m) {
    this.muted = m;
    this.audio.muted = m;
    if (!this.current) return;
    if (this.current.kind === 'synth') { if (m) this.synth?.stop(); else if (!this.paused) this.synth?.play(this.trackInfo.preset); }
    else if (!m) this.resume();
    this.render();
  }
  get progress() { const a = this.audio; return this.isFile && isFinite(a.duration) && a.duration > 0 ? { t: a.currentTime, d: a.duration } : null; }
  render(status) { this.ui.render({ station: this.current, track: this.trackInfo, status, playing: this.playing, muted: this.muted, volume: this.volume, file: this.isFile }); }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

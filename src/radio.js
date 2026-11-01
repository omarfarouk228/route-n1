// Autoradio : une station originale générée en direct (sans fichier) et des stations d'artistes togolais
// lues via le lecteur audio intégré d'Audiomack (titres publiés par les artistes, écoute gratuite, sans vidéo).
// Le lecteur Audiomack n'a pas d'API de pilotage : l'auditeur appuie sur ▶ dans le lecteur, et le jeu enchaîne
// le titre suivant à la fin du morceau (durée connue).

export const STATIONS = [
  {
    id: 'groove', name: 'N1 Groove', freq: '88.1', kind: 'synth',
    desc: 'Musique originale du jeu, générée en direct : cloche gankogui, afrobeat et guitare highlife.',
    tracks: [{ title: 'Agbadza de la route', artist: 'Route N1', preset: 0 }, { title: 'Highlife du Mono', artist: 'Route N1', preset: 1 }, { title: 'Nuit à Kara', artist: 'Route N1', preset: 2 }],
  },
  {
    id: 'lome', name: 'Lomé Hits', freq: '94.5', kind: 'am',
    desc: 'Toofan, Santrinos Raphaël, Almok : titres publiés par les artistes sur Audiomack.',
    tracks: [
      { a: 'toofan', s: 'gweta-1', artist: 'Toofan', title: 'Gweta', d: 225 },
      { a: 'santrinosraphael', s: 'waa', artist: 'Santrinos Raphaël ft. Zeynab', title: 'WAA', d: 197 },
      { a: 'toofan', s: 'orobo-3', artist: 'Toofan', title: 'Orobo', d: 197 },
      { a: 'santrinosraphael', s: 'maladie-damour', artist: 'Santrinos Raphaël', title: 'Maladie d’amour', d: 177 },
      { a: 'almok-officiel', s: 'cest-ma-priere-almok-officiel', artist: 'Almok', title: 'C’est ma prière', d: 250 },
      { a: 'toofan', s: 'ca-va-ca-vient', artist: 'Toofan ft. Willy Dumbo', title: 'Ça va ça vient', d: 145 },
      { a: 'santrinosraphael', s: 'lome-by-night', artist: 'Santrinos Raphaël', title: 'Lomé by Night', d: 206 },
      { a: 'toofan', s: 'ou-tu-es-1', artist: 'Toofan', title: 'Où tu es', d: 209 },
      { a: 'santrinosraphael', s: 'mawu-na', artist: 'Santrinos Raphaël', title: 'Mawu na', d: 207 },
      { a: 'toofan', s: 'dati-the-wood-1', artist: 'Toofan', title: 'Dati the Wood', d: 219 },
      { a: 'santrinosraphael', s: 'belle-vie', artist: 'Santrinos Raphaël', title: 'Belle Vie', d: 194 },
    ],
  },
  {
    id: 'rap', name: 'Rap 228', freq: '101.3', kind: 'am',
    desc: 'Rap togolais : Mic Flammez, Elow’n.',
    tracks: [
      { a: 'mic-flammez', s: 'agama', artist: 'Mic Flammez', title: 'Agama', d: 245 },
      { a: 'elown', s: 'classico', artist: 'Elow’n ft. Sindika', title: 'Classico', d: 178 },
      { a: 'mic-flammez', s: 'eperviers', artist: 'Mic Flammez', title: 'Éperviers', d: 197 },
      { a: 'elown', s: 'ca-va-aller', artist: 'Elow’n', title: 'Ça va aller', d: 158 },
      { a: 'mic-flammez', s: 'konti', artist: 'Mic Flammez & Conii Gangster', title: 'Konti', d: 165 },
      { a: 'elown', s: 'demain-sera-meilleur', artist: 'Elow’n', title: 'Demain sera meilleur', d: 168 },
      { a: 'mic-flammez', s: 'la-vie-1', artist: 'Mic Flammez', title: 'La vie', d: 203 },
    ],
  },
  {
    id: 'legendes', name: 'Légendes', freq: '106.7', kind: 'am',
    desc: 'Les voix qui ont fait le Togo : Bella Bellow, King Mensah, Afia Mala, Vaudou Game, Amen Viana.',
    tracks: [
      { a: 'bella-bellow', s: 'blewu', artist: 'Bella Bellow', title: 'Blewu', d: 121 },
      { a: 'king-mensah', s: 'madjo', artist: 'King Mensah', title: 'Madjo', d: 236 },
      { a: 'afia-mala', s: 'togo', artist: 'Afia Mala & Orquesta Aragón', title: 'Togo', d: 350 },
      { a: 'vaudou-game', s: 'koliko', artist: 'Vaudou Game', title: 'Koliko', d: 230 },
      { a: 'bella-bellow', s: 'zelie', artist: 'Bella Bellow', title: 'Zelié', d: 162 },
      { a: 'king-mensah', s: 'nana-benz', artist: 'King Mensah', title: 'Nana Benz', d: 275 },
      { a: 'afia-mala', s: 'lonlon-vanvan', artist: 'Afia Mala & Orquesta Aragón', title: 'Lonlon Vanvan', d: 283 },
      { a: 'amen-viana', s: 'rising-nation', artist: 'Amen Viana ft. Keziah Jones', title: 'Rising Nation', d: 222 },
      { a: 'bella-bellow', s: 'denyigban', artist: 'Bella Bellow', title: 'Denyigban', d: 154 },
      { a: 'afia-mala', s: 'sweet-africa', artist: 'Afia Mala & Orquesta Aragón', title: 'Sweet Africa', d: 346 },
    ],
  },
];

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
    this.out.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.4);
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
        const n = root + 12 + tri[(st / 2 + bar) % 3] + (st >= 8 ? 12 : 0);
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
    this.ui = ui; // { render(state), frame(src|null) }
    this.station = -1; // -1 = éteint
    this.track = 0;
    this.synth = null;
    this.order = {};
    this.playing = false; // lecture Audiomack lancée par l'auditeur
    this.elapsed = 0;
    this.muted = false;
    try { this.saved = JSON.parse(localStorage.getItem('n1.radio') || 'null'); } catch { this.saved = null; }
  }
  get current() { return this.station >= 0 ? STATIONS[this.station] : null; }
  get trackInfo() { const s = this.current; return s ? s.tracks[this.trackIndex()] : null; }
  trackIndex() {
    const s = this.current;
    if (!s) return 0;
    const ord = (this.order[s.id] ||= shuffle(s.tracks.map((_, i) => i)));
    return ord[this.track % ord.length];
  }
  save() { try { localStorage.setItem('n1.radio', JSON.stringify({ station: this.station })); } catch { /* ignore */ } }
  restore() { if (this.saved && this.saved.station >= 0) this.tune(this.saved.station); }

  tune(i) {
    this.stopAll();
    this.station = i;
    this.track = 0;
    this.save();
    this.playCurrent();
  }
  power() { if (this.station >= 0) { this.stopAll(); this.station = -1; this.save(); this.render(); } else this.tune(0); }
  nextStation(d = 1) { this.tune(((this.station < 0 ? 0 : this.station) + d + STATIONS.length) % STATIONS.length); }
  nextTrack() { if (!this.current) return; this.track++; this.playCurrent(); }

  stopAll() {
    this.synth?.stop();
    this.ui.frame(null);
    this.playing = false;
  }

  playCurrent() {
    const s = this.current;
    if (!s) return;
    const t = this.trackInfo;
    this.playing = false;
    this.elapsed = 0;
    if (s.kind === 'synth') {
      this.ui.frame(null);
      this.sound.init();
      if (!this.synth) this.synth = new SynthStation(this.sound.ctx, this.sound.master);
      if (!this.muted) this.synth.play(t.preset);
      this.render();
      return;
    }
    this.synth?.stop();
    this.ui.frame(this.muted ? null : `https://audiomack.com/embed/${t.a}/song/${t.s}`);
    this.render();
  }
  // l'auditeur a cliqué dans le lecteur Audiomack (lecture ou pause)
  playerClicked() {
    if (!this.current || this.current.kind !== 'am') return;
    this.playing = !this.playing;
    this.render();
  }
  // enchaîne le titre suivant à la fin du morceau ; le suivant démarre au prochain appui sur ▶
  update(dt) {
    if (!this.playing) return;
    this.elapsed += dt;
    const t = this.trackInfo;
    if (t && t.d && this.elapsed > t.d + 1.5) this.nextTrack();
  }
  // la station générée se tait pendant la pause ; Audiomack continue comme un vrai autoradio
  pause(on) {
    if (!this.current || this.current.kind !== 'synth' || this.muted) return;
    if (on) this.synth?.stop(); else this.synth?.play(this.trackInfo.preset);
  }
  // couper le son coupe aussi la radio (le lecteur Audiomack est déchargé)
  setMuted(m) {
    this.muted = m;
    if (this.current) this.playCurrent();
  }
  render(status) { this.ui.render({ station: this.current, track: this.trackInfo, status, index: this.station, playing: this.playing, muted: this.muted }); }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Autoradio : une station originale générée en direct (sans fichier) et des stations d'artistes togolais,
// chacune en deux modes :
//  - « Audio » : lecteur intégré d'Audiomack, sans vidéo (titres publiés par les artistes, écoute gratuite).
//    Pas d'API de pilotage : l'auditeur appuie sur ▶, le jeu enchaîne le titre suivant à la fin du morceau.
//  - « Clip » : clips officiels via le lecteur YouTube, qui doit rester visible (pause quand la radio est repliée).

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
    // clips officiels publiés sur YouTube par les artistes (mode « Clip »)
    clips: [
      { id: 'O9P1g9q1JtM', artist: 'Toofan', title: 'Teré Teré' },
      { id: 'OsOfpV2MnUY', artist: 'Santrinos Raphaël', title: 'Maladie d’amour' },
      { id: 'ayc94-jNXtc', artist: 'Toofan', title: 'Gbessi Gbeko' },
      { id: 'LQUOkoSsjM4', artist: 'Santrinos Raphaël', title: 'Vamidjo' },
      { id: '7_i7mytYGb4', artist: 'Almok', title: 'Molo molo' },
      { id: 'qcn2_UoWxTA', artist: 'Toofan', title: 'Déodorant' },
      { id: 'inAX5qgevzw', artist: 'Santrinos Raphaël ft. Tenor', title: 'Boulevard' },
      { id: 'ht2SPFqXZ_o', artist: 'Axel Merryl ft. Toofan', title: 'Gba Gba' },
      { id: 'lUe1SorRjhI', artist: 'Santrinos Raphaël', title: 'Bougez là-bas' },
      { id: 'zTm7JrD35F4', artist: 'Almok ft. DJ Arafat', title: 'Lébénè' },
      { id: 'MQUZX3zogmo', artist: 'Toofan', title: 'Africa Hoyee' },
      { id: '870XsTXIK2U', artist: 'Santrinos Raphaël', title: 'Fiançailles' },
      { id: 'PzS9kC_S0WE', artist: 'Almok', title: 'Nononini' },
      { id: 'xLItSYe0i7Q', artist: 'Santrinos Raphaël ft. Hiro', title: 'Pour la vie' },
      { id: 'uLBM-lGntvA', artist: 'Toofan', title: 'Ce magik' },
      { id: 'i5aU7q9peiM', artist: 'Almok', title: 'C ma prière' },
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
    // clips officiels publiés sur YouTube par les artistes (mode « Clip »)
    clips: [
      { id: 'jn6Wu6eDW08', artist: 'Mic Flammez', title: 'Bruiii' },
      { id: '9Ol25ZeEM2s', artist: 'Mic Flammez', title: 'Tsakatu' },
      { id: '0cS1QwVX8bY', artist: 'Toofan ft. Kassav', title: 'Ou lé' },
      { id: 'WT9KNu299a0', artist: 'Almok', title: 'Judas' },
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
    // clips officiels publiés sur YouTube par les artistes (mode « Clip »)
    clips: [
      { id: 'yRl68KjReWU', artist: 'King Mensah', title: 'Togo, je t’aime' },
      { id: 'kgwQDjeNsFY', artist: 'King Mensah', title: 'Egno' },
      { id: 'sN9StbxjJPw', artist: 'Vaudou Game', title: 'Pas contente' },
      { id: 'orHMn0yCJts', artist: 'King Mensah', title: 'Ewoe' },
      { id: '5Qix8-0xXjY', artist: 'Vaudou Game', title: 'La vie c’est bon' },
      { id: 'SNG8KRSz_ns', artist: 'King Mensah', title: 'Xonam' },
      { id: 'YZKOgX4_fqM', artist: 'King Mensah', title: 'Ega Begna' },
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

/* ------------------------------------------------------------ lecteur YouTube (chargé à la demande) */
let ytReady = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const sc = document.createElement('script');
    sc.src = 'https://www.youtube.com/iframe_api';
    sc.onerror = () => { ytReady = null; reject(new Error('YouTube indisponible')); };
    document.head.appendChild(sc);
  });
  return ytReady;
}

/* ------------------------------------------------------------ radio */
export class Radio {
  constructor(sound, ui) {
    this.sound = sound;
    this.ui = ui; // { render, frame(url|null), showVideo(on), host, collapsed() }
    this.station = -1; // -1 = éteint
    this.track = 0;
    this.synth = null;
    this.yt = null;
    this.order = {};
    this.playing = false; // lecture Audiomack lancée par l'auditeur
    this.elapsed = 0;
    this.muted = false;
    try { this.saved = JSON.parse(localStorage.getItem('n1.radio') || 'null'); } catch { this.saved = null; }
    this.mode = this.saved?.mode === 'clip' ? 'clip' : 'audio';
  }
  get current() { return this.station >= 0 ? STATIONS[this.station] : null; }
  get clipMode() { const s = this.current; return !!s && s.kind !== 'synth' && this.mode === 'clip'; }
  get list() { const s = this.current; return !s ? [] : s.kind === 'synth' ? s.tracks : this.mode === 'clip' ? s.clips : s.tracks; }
  get trackInfo() { const l = this.list; return l.length ? l[this.trackIndex()] : null; }
  trackIndex() {
    const s = this.current, l = this.list;
    if (!s || !l.length) return 0;
    const key = s.id + (s.kind === 'synth' ? '' : this.mode);
    const ord = (this.order[key] ||= shuffle(l.map((_, i) => i)));
    return ord[this.track % ord.length];
  }
  save() { try { localStorage.setItem('n1.radio', JSON.stringify({ station: this.station, mode: this.mode })); } catch { /* ignore */ } }
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
  // bascule Audio (Audiomack, sans vidéo) / Clip (YouTube)
  setMode(m) {
    if (m === this.mode) return;
    this.stopAll();
    this.mode = m;
    this.track = 0;
    this.save();
    if (this.current) this.playCurrent(); else this.render();
  }
  toggleMode() { this.setMode(this.mode === 'clip' ? 'audio' : 'clip'); }

  stopAll() {
    this.synth?.stop();
    this.ui.frame(null);
    if (this.yt) { try { this.yt.stopVideo(); } catch { /* lecteur pas prêt */ } }
    this.ui.showVideo(false);
    this.playing = false;
  }

  async playCurrent() {
    const s = this.current;
    if (!s) return;
    const t = this.trackInfo;
    this.playing = false;
    this.elapsed = 0;
    if (s.kind === 'synth') {
      this.ui.frame(null);
      this.ui.showVideo(false);
      this.sound.init();
      if (!this.synth) this.synth = new SynthStation(this.sound.ctx, this.sound.master);
      if (!this.muted) this.synth.play(t.preset);
      this.render();
      return;
    }
    this.synth?.stop();
    if (this.mode === 'audio') {
      this.ui.showVideo(false);
      if (this.yt) { try { this.yt.stopVideo(); } catch { /* ignore */ } }
      this.ui.frame(this.muted ? null : `https://audiomack.com/embed/${t.a}/song/${t.s}`);
      this.render();
      return;
    }
    // mode Clip : lecteur YouTube visible
    this.ui.frame(null);
    this.ui.showVideo(true);
    this.render('loading');
    try { await loadYT(); } catch { this.render('offline'); return; }
    if (!this.clipMode || this.trackInfo !== t) return; // l'auditeur a changé entre-temps
    const visible = !this.ui.collapsed();
    if (!this.yt) {
      this.yt = await new Promise((resolve) => {
        const p = new window.YT.Player(this.ui.host, {
          width: 220, height: 200, videoId: t.id,
          playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: () => resolve(p),
            onStateChange: (e) => { if (e.data === 0 && this.clipMode) this.nextTrack(); },
            onError: () => { if (this.clipMode) this.nextTrack(); },
          },
        });
      });
      this.yt.setVolume(70);
      if (this.muted) this.yt.mute();
      if (visible) this.yt.playVideo(); else this.yt.pauseVideo();
    } else if (visible) this.yt.loadVideoById(t.id); else this.yt.cueVideoById(t.id);
    this.render();
  }
  // le clip ne joue que lorsqu'il est visible (radio dépliée, HUD affiché, jeu en cours)
  clipVisible(on) {
    if (!this.clipMode || !this.yt) return;
    try { if (on && !this.muted) this.yt.playVideo(); else this.yt.pauseVideo(); } catch { /* lecteur pas prêt */ }
  }
  // l'auditeur a cliqué dans le lecteur Audiomack (lecture ou pause)
  playerClicked() {
    if (!this.current || this.current.kind === 'synth' || this.mode !== 'audio') return;
    this.playing = !this.playing;
    this.render();
  }
  // mode Audio : enchaîne le titre suivant à la fin du morceau
  update(dt) {
    if (!this.playing || this.mode !== 'audio') return;
    this.elapsed += dt;
    const t = this.trackInfo;
    if (t && t.d && this.elapsed > t.d + 1.5) this.nextTrack();
  }
  // pause du jeu : la station générée et le clip s'arrêtent ; Audiomack continue comme un autoradio
  pause(on) {
    const s = this.current;
    if (!s || this.muted) return;
    if (s.kind === 'synth') { if (on) this.synth?.stop(); else this.synth?.play(this.trackInfo.preset); }
    else if (this.clipMode) this.clipVisible(!on && !this.ui.collapsed());
  }
  // couper le son coupe aussi la radio
  setMuted(m) {
    this.muted = m;
    if (!this.current) return;
    if (this.clipMode) { try { if (m) this.yt?.mute(); else this.yt?.unMute(); } catch { /* ignore */ } this.render(); }
    else this.playCurrent();
  }
  render(status) { this.ui.render({ station: this.current, track: this.trackInfo, status, index: this.station, playing: this.playing, muted: this.muted, mode: this.mode }); }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

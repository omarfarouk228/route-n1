// Génère public/radio/playlist.json à partir des fichiers audio déposés dans public/radio/<station>/.
// Nom de fichier conseillé : « Artiste - Titre.mp3 » (sinon le titre est le nom du fichier).
// Le nom, la fréquence et la description d'une station déjà présente dans playlist.json sont conservés.
// Usage : npm run radio
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const ROOT = new URL('../public/radio/', import.meta.url).pathname;
const OUT = join(ROOT, 'playlist.json');
const AUDIO = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.opus', '.wav', '.webm', '.flac']);
const DEFAULTS = {
  lome: { name: 'Lomé Hits', freq: '94.5', desc: 'Les tubes de Lomé.' },
  rap: { name: 'Rap 228', freq: '101.3', desc: 'Rap togolais.' },
  legendes: { name: 'Légendes', freq: '106.7', desc: 'Les voix qui ont fait le Togo.' },
};

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { stations: [] };
const prevById = Object.fromEntries((prev.stations || []).map((s) => [s.id, s]));
const dirs = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory()).sort();
let freq = 90.1;
const stations = dirs.map((id) => {
  const old = prevById[id] || {};
  const oldTracks = Object.fromEntries((old.tracks || []).map((t) => [t.src, t]));
  const files = readdirSync(join(ROOT, id)).filter((f) => AUDIO.has(extname(f).toLowerCase())).sort((a, b) => a.localeCompare(b, 'fr'));
  const tracks = files.map((f) => {
    const src = `${id}/${f}`;
    if (oldTracks[src]) return oldTracks[src]; // titres corrigés à la main : on les garde
    const name = basename(f, extname(f)).replace(/_/g, ' ').trim();
    const k = name.indexOf(' - ');
    return k > 0 ? { src, artist: name.slice(0, k).trim(), title: name.slice(k + 3).trim() } : { src, artist: '', title: name };
  });
  const d = DEFAULTS[id] || {};
  freq += 2.2;
  return { id, name: old.name || d.name || id, freq: old.freq || d.freq || freq.toFixed(1), desc: old.desc ?? d.desc ?? '', tracks };
});
stations.sort((a, b) => parseFloat(a.freq) - parseFloat(b.freq));
writeFileSync(OUT, JSON.stringify({ stations }, null, 2) + '\n');
for (const s of stations) console.log(`${s.freq.padStart(5)}  ${s.name} : ${s.tracks.length} titre${s.tracks.length > 1 ? 's' : ''}`);

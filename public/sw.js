// Jeu hors ligne : Route N1 se met en cache à la première visite, puis se lance sans réseau.
// Les titres de la radio (fichiers audio lus par morceaux) ne sont pas mis en cache : hors ligne, N1 Groove reste disponible.
const CACHE = 'route-n1-v2';
const IV = { ignoreVary: true }; // les serveurs renvoient souvent « Vary: Origin » : sans cela, les scripts du jeu ne sortent pas du cache
const FONTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
const AUDIO = /\.(mp3|m4a|aac|ogg|opus|wav|webm|flac)(\?|$)/i;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './radio/playlist.json']).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// la page envoie la liste de ce qu'elle a déjà chargé (scripts, styles, polices)
self.addEventListener('message', (e) => {
  const urls = (e.data && e.data.cache) || [];
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(urls.filter(ok).map((u) => c.add(u).catch(() => {})))));
});
const ok = (u) => {
  try { const x = new URL(u); return !AUDIO.test(x.pathname) && (x.origin === self.location.origin || FONTS.includes(x.origin)); } catch { return false; }
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !ok(req.url) || req.headers.has('range')) return;
  // la page et la playlist : le réseau d'abord (dernière version), le cache sans réseau
  if (req.mode === 'navigate' || req.url.endsWith('playlist.json')) {
    const key = req.mode === 'navigate' ? './index.html' : req;
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); } return r; })
      .catch(() => caches.match(key, IV).then((r) => r || caches.match('./', IV))));
    return;
  }
  // le reste (scripts, styles, icônes, polices) : le cache tout de suite, mis à jour en arrière-plan
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, IV).then((hit) => {
    const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net.then((r) => r || Response.error());
  })));
});

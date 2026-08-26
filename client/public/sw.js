/* KAY DIANG — Service Worker.
   Rend l'APPLICATION elle-même disponible hors ligne (page, styles, images,
   textures du globe, polices). Les données personnelles des élèves (API,
   PDF à jeton, vidéos YouTube) ne sont JAMAIS mises en cache ici : les
   documents « hors ligne » sont gérés séparément par IndexedDB (offline.jsx),
   uniquement à la demande de l'élève. */

const V = 'kd-v8'; // bump : purge les anciens caches (correctifs non visibles sinon)
const SHELL = `${V}-shell`; // coquille de l'app
const STATIC = `${V}-static`; // assets construits + images
const FONTS = `${V}-fonts`; // polices Google

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => !k.startsWith(V)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navigation : réseau d'abord, repli sur la coquille hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const cp = r.clone();
          caches.open(SHELL).then((c) => c.put('/', cp));
          return r;
        })
        .catch(async () => (await caches.match('/')) || new Response('Hors ligne', { status: 503 }))
    );
    return;
  }

  // Assets statiques du site : servis du cache, rafraîchis en arrière-plan.
  if (
    url.origin === location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/textures/') ||
      url.pathname.startsWith('/metiers/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/sons/'))
  ) {
    e.respondWith(swr(req, STATIC));
    return;
  }

  // Polices : cache pour un rendu propre hors ligne.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(swr(req, FONTS));
    return;
  }

  // Tout le reste (API, YouTube, CDN) passe par le réseau sans être caché.
});

async function swr(req, nom) {
  const cache = await caches.open(nom);
  const hit = await cache.match(req);
  if (!hit) {
    try {
      const net = await fetch(req);
      if (net && net.status === 200 && (net.type === 'basic' || net.type === 'cors')) cache.put(req, net.clone());
      return net;
    } catch {
      return Response.error();
    }
  }
  fetch(req)
    .then((net) => {
      if (net && net.status === 200 && (net.type === 'basic' || net.type === 'cors')) cache.put(req, net.clone());
    })
    .catch(() => {});
  return hit;
}

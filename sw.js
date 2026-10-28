/* Service worker Merdeka Jaya - Slip Gaji
 * - Hanya menyimpan "cangkang" aplikasi (halaman, ikon, manifest) dari domain yang sama.
 * - Permintaan ke server data (Apps Script) TIDAK PERNAH disimpan: data gaji selalu diambil langsung.
 * - Halaman memakai strategi "jaringan dulu": pembaruan index.html langsung terpakai bila online.
 */
const VERSI = 'mj-slipgaji-v3';
const CANGKANG = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSI)
      .then((c) => c.addAll(CANGKANG))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nama) => Promise.all(nama.filter((n) => n !== VERSI).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // jangan sentuh Apps Script / Google Fonts
  if (req.headers.has('range') || /\.(mp3|m4a|ogg|wav)$/i.test(url.pathname)) return; // audio langsung dari jaringan

  // Halaman: jaringan dulu, cadangan dari cache bila offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const salinan = res.clone();
          caches.open(VERSI).then((c) => c.put('./index.html', salinan));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Berkas statis (ikon, manifest): cache dulu, perbarui di latar belakang
  e.respondWith(
    caches.match(req).then((cache) => {
      const jaringan = fetch(req)
        .then((res) => {
          if (res && res.ok) { const s = res.clone(); caches.open(VERSI).then((c) => c.put(req, s)); }
          return res;
        })
        .catch(() => cache);
      return cache || jaringan;
    })
  );
});

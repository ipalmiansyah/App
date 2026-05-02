// ═══════════════════════════════════════════════════════
//  SERVICE WORKER — Agenda Mengajar Guru
//  SMP Negeri 05 Sarolangun
// ═══════════════════════════════════════════════════════

const CACHE_NAME = 'agenda-guru-v1';

// File yang di-cache untuk offline
const CACHE_FILES = [
  './index.html',
  './monitor.html',
  './admin.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap',
];

// File suara — di-cache supaya bisa offline
const SUARA_FILES = [
  './suara/1. alarm.mp3',
  "./suara/2. masuk klas 2 bhs.mp3",
  "./suara/3. ganti plajaran jadi 2 bhs.mp3",
  "./suara/4. istirahat 2bhs.mp3",
  "./suara/5. masuk stlh istirahat 2 bhs.mp3",
  "./suara/6.jam pulang senin-jum'at.mp3",
  "./suara/7.jam pulang khusus sabtu jadi.mp3",
  "./suara/8. upacara bedera jadi.mp3",
  "./suara/9. Mars SMP.mp3",
];

// ── INSTALL: cache semua file ──
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache file utama
      cache.addAll(CACHE_FILES).catch(err => console.log('[SW] Cache utama error:', err));
      // Cache suara (tidak wajib, skip jika gagal)
      SUARA_FILES.forEach(file => {
        cache.add(file).catch(() => console.log('[SW] Suara tidak ditemukan:', file));
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: hapus cache lama ──
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Hapus cache lama:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: strategi cache-first untuk file lokal, network-first untuk API ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Apps Script API — selalu network (jangan cache)
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline - tidak bisa terhubung ke server' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // File suara — cache-first
  if (url.pathname.includes('/suara/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // File lokal (HTML, JS, CSS) — cache-first dengan update di background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});

// ── MESSAGE: update cache manual ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'clearCache') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ ok: true });
    });
  }
});

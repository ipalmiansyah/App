// Pemadam: hapus semua cache dan daftarkan diri keluar.
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(k){return Promise.all(k.map(function(n){return caches.delete(n)}))})
    .then(function(){return self.registration.unregister()})
    .then(function(){return self.clients.matchAll()})
    .then(function(c){c.forEach(function(w){w.navigate(w.url)})}));
});
self.addEventListener('fetch',function(e){e.respondWith(fetch(e.request))});

const CACHE = 'sangia-static-v22';
const STATIC = ['/', '/app.css', '/app.js', '/manifest.webmanifest', '/icons/icon-192.png'];
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(()=>self.skipWaiting()));});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch', event => {
  const req = event.request; if(req.method!=='GET' || req.url.includes('/api/')) return;
  if(new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).then(resp => {if(resp.ok){const clone=resp.clone();caches.open(CACHE).then(cache=>cache.put(req,clone));}return resp;}).catch(()=>caches.match(req)));
});

const CACHE = "wifi-qr-v2";
const FILES = ["./","./index.html","./style.css","./app.js","./manifest.json","https://unpkg.com/jsqr/dist/jsQR.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));

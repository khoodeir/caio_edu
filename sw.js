const CACHE = "caio-edu-shell-v4";
const SHELL = ["./", "./index.html", "./manifest.json", "./logo.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./caio.html", "./dashboard.html", "./manage_exams.html", "./parent_portal.html", "./scanner.html", "./student_delete.html", "./student_registration.html", "./student_serch.html"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || req.method !== "GET") return;
  const isPage = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/") || url.pathname.endsWith("sw.js");
  const save = response => {
    if (response && response.ok) { const copy = response.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return response;
  };
  if (isPage) {
    // pages: always try the network first so new versions show immediately; fall back to cache when offline
    event.respondWith(fetch(req).then(save).catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
  } else {
    // images / manifest: cache first for speed
    event.respondWith(caches.match(req).then(r => r || fetch(req).then(save)));
  }
});

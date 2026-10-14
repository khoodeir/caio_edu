// Bump this number on EVERY release so installed phones fetch the new files.
const CACHE = "caio-edu-shell-v7";
const SHELL = ["./", "./index.html", "./manifest.json", "./logo.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./caio.html", "./dashboard.html", "./manage_exams.html", "./parent_portal.html", "./scanner.html", "./student_delete.html", "./student_edit.html", "./student_registration.html", "./student_serch.html", "./caio-common.js", "./caio-download.js", "./audit_log.html"];
// Third-party libraries the pages need (QR scanner, Supabase client, charts).
// Cached after the first online visit so the scanner can open with no internet.
const CDN_HOSTS = ["cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // CDN scripts: cache-first, refresh in the background. Opaque responses are fine to cache.
  if (CDN_HOSTS.includes(url.hostname) && (req.destination === "script" || req.destination === "style" || url.pathname.endsWith(".js"))) {
    event.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  const isPage = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/") || url.pathname.endsWith("sw.js") || url.pathname.endsWith(".js");
  const save = response => {
    if (response && response.ok) { const copy = response.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return response;
  };
  if (isPage) {
    // pages + our own scripts: network first so new versions show immediately; fall back to cache when offline
    event.respondWith(fetch(req).then(save).catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
  } else {
    // images / manifest: cache first for speed
    event.respondWith(caches.match(req).then(r => r || fetch(req).then(save)));
  }
});

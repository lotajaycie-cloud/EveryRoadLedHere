// JM Wedding: offline cache for the program and song list. Generated; do not edit by hand.
const CACHE = "jm-wedding-c8dcee4da5";
const SCOPE = "/music";
const CORE = ["/music", "/music/files/jm-song-list.pdf", "/music/files/jm-song-list.xlsx", "/music/files/jm-program.pdf", "/music/files/jm-program.docx", "/music/files/jm-seating.pdf", "/music/files/jm-seating.png", "/music/files/jm-seating.xlsx", "/music/icons/apple-touch-icon.png", "/music/icons/icon-192.png", "/music/icons/icon-512.png", "/music/icons/icon-maskable-512.png", "/music/icons/favicon-32.png", "/music/manifest.webmanifest"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("jm-wedding-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!font && (url.origin !== location.origin || !url.pathname.startsWith(SCOPE))) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); if (res.ok) caches.open(CACHE).then(c => c.put(SCOPE, copy)); return res; })
      .catch(() => caches.match(SCOPE)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; });
    return hit ? (net.catch(() => {}), hit) : net;
  }));
});

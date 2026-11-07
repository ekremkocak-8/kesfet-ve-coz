// Keşfet ve Çöz · telefon uygulaması önbelleği (01.11.2026)
// Portal açılışında önce internetten en yeni sürüm alınır; internet yoksa son kaydedilen sürüm açılır.
// Supabase verileri, giriş, ödeme ve korumalı içerik (soru, PDF, çözüm) önbelleğe ALINMAZ.
const ONBELLEK = "kvc-portal-v5";   // 07.11.2026: tam ekran düğmesi yanıp söner, video etkinliği dosya yenileme
const KABUK = ["./", "./index.html", "./supabase.js", "./manifest.webmanifest", "./ikon/ikon-192.png", "./ikon/ikon-512.png", "./ikon/apple-touch-icon.png", "./ikon/favicon-32.png"];
const YAZI_TIPI = /^https?:\/\/[^/]+\/fonts\/[^/]+\.(css|woff2)$/;   // 06.11.2026: Google yerine sitenin /fonts/ klasörü

self.addEventListener("install", e => {
  e.waitUntil(caches.open(ONBELLEK).then(c => c.addAll(KABUK)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(L => Promise.all(L.filter(k => k.startsWith("kvc-") && k !== ONBELLEK).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const CEVRIMDISI = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Keşfet ve Çöz</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#f4f7f5;color:#1f2b27;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px;box-sizing:border-box}
.k{background:#fff;border:1px solid #dfe7e2;border-radius:16px;padding:28px;max-width:360px}button{margin-top:14px;border:0;border-radius:10px;padding:10px 18px;background:#3b7462;color:#fff;font-weight:700;font-size:15px}</style></head>
<body><div class="k"><h2>İnternet bağlantısı yok</h2><p>Keşfet ve Çöz'ü kullanmak için internete bağlan.</p><button onclick="location.reload()">Tekrar dene</button></div></body></html>`;

const KAPSAM = new URL(self.registration.scope);
const KABUK_URL = new Set(KABUK.map(k => new URL(k, KAPSAM).href));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  // yazı tipleri: önbellekten, arkada yenilenir
  if (YAZI_TIPI.test(r.url)) {
    e.respondWith(caches.open(ONBELLEK).then(async c => { const v = await c.match(r); const ag = fetch(r).then(x => { if (x.ok) c.put(r, x.clone()); return x; }).catch(() => v); return v || ag; }));
    return;
  }
  if (!r.url.startsWith(KAPSAM.href)) return;                       // portal dışı ve Supabase istekleri: dokunulmaz
  if (/\/(pdf|soru|kavram)\//.test(u.pathname.slice(KAPSAM.pathname.length - 1))) return;   // içerik dosyaları önbelleğe alınmaz
  const sayfa = r.mode === "navigate", kabuk = KABUK_URL.has(u.origin + u.pathname);
  if (!sayfa && !kabuk) return;
  const anahtar = sayfa ? new URL("./index.html", KAPSAM).href : u.origin + u.pathname;
  // önce internet (en yeni sürüm), olmazsa önbellek
  e.respondWith(fetch(r).then(x => { if (x.ok) { const kop = x.clone(); caches.open(ONBELLEK).then(c => c.put(anahtar, kop)); } return x; })
    .catch(async () => (await caches.match(anahtar)) || (sayfa ? new Response(CEVRIMDISI, { headers: { "Content-Type": "text/html; charset=utf-8" } }) : Response.error())));
});

// ---------- bildirimler (52_bildirim.sql + "bildirim" Edge Function) ----------
self.addEventListener("push", e => {
  let v = {}; try { v = e.data ? e.data.json() : {}; } catch (er) { v = { baslik: "Keşfet ve Çöz", govde: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(v.baslik || "Keşfet ve Çöz", {
    body: v.govde || "", icon: "ikon/ikon-192.png", badge: "ikon/favicon-32.png", tag: v.etiket || undefined, lang: "tr",
    data: { url: new URL(v.url || "./", self.registration.scope).href } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const hedef = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(L => {
    const acik = L.find(c => c.url.startsWith(self.registration.scope));
    if (acik) { acik.navigate(hedef).catch(() => {}); return acik.focus(); }
    return self.clients.openWindow(hedef);
  }));
});

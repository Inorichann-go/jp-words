// 오프라인 지원: 앱 화면은 저장해 두고, 인터넷이 되면 항상 최신 버전으로 갱신
const CACHE = 'jp-words-v7';
const APP = ['./', './index.html', './manifest.webmanifest', './icon-192.png?v=2', './icon-512.png?v=2', './apple-touch-icon.png?v=2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 앱 화면: 인터넷 먼저(최신 반영), 안 되면 저장본
  // 앱 이름·아이콘 정보(manifest)도 인터넷 먼저 → 이름을 바꾸면 바로 반영
  if (url.origin === location.origin && url.pathname.endsWith('.webmanifest')) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); if (res.ok) caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req)));
    return;
  }
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('/index.html'))) {
    const key = './index.html';
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      if (res.ok) caches.open(CACHE).then(c => c.put(key, copy));
      return res;
    }).catch(() => caches.match(key)));
    return;
  }
  // 같은 사이트 파일(아이콘 등) · 구글 폰트 · 동기화 라이브러리: 저장본 먼저, 뒤에서 갱신
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$|^cdn\.jsdelivr\.net$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
  // 유튜브 등 나머지는 그대로 인터넷으로
});

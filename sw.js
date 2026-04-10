const C='pitch-pitch-v2';
const A=['./','./index.html','./style.css','./script.js','./api.js','./manifest.json'];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>c.addAll(A)));
});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.hostname.includes('workers.dev')||u.hostname.includes('football-data')||u.hostname.includes('crests'))return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});

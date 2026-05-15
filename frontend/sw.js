const CACHE_NAME = 'coord-pwa-v51';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/config.js',
  '/js/supabase-client.js',
  '/js/store.js',
  '/js/core/geodesy.js',
  '/js/core/RoadMath.js',
  '/js/core/DxfExporter.js',
  '/js/views/Auth.js',
  '/js/views/Dashboard.js',
  '/js/views/UserManagement.js',
  '/js/views/ProjectDetail.js',
  '/js/views/modules/PointLib.js',
  '/js/views/modules/CoordCalc.js',
  '/js/views/modules/CoordConv.js',
  '/js/views/modules/LineLib.js',
  '/js/views/modules/PolyLib.js',
  '/js/views/modules/RoadLib.js',
  '/js/views/modules/StakeoutLib.js',
  '/js/app.js',
  'https://cdn.jsdelivr.net/npm/vue@3.3.13/dist/vue.global.prod.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.js'
];

// 安装：缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：离线优先策略
self.addEventListener('fetch', event => {
  // API 请求走网络优先
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  // 静态资源走缓存优先
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

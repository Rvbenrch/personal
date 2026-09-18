// ============================================
// Service Worker — Mi App Personal
// Estrategia: Cache First para assets estáticos,
// Network First para datos dinámicos
// ============================================

const CACHE_NAME = 'personal-app-v1';
const STATIC_ASSETS = [
  '/personal/',
  '/personal/index.html',
  '/personal/css/main.css',
  '/personal/css/components.css',
  '/personal/css/views.css',
  '/personal/css/animations.css',
  '/personal/js/app.js',
  '/personal/js/auth.js',
  '/personal/js/db.js',
  '/personal/js/ui.js',
  '/personal/js/food.js',
  '/personal/js/weight.js',
  '/personal/js/calendar.js',
  '/personal/js/hevy.js',
  '/personal/js/agenda.js',
  '/personal/js/settings.js',
  '/personal/manifest.json'
];

// Instalación: cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache First para assets, Network First para APIs
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear peticiones a Firebase, Gemini, o APIs externas
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('hevyapp.com') ||
      url.hostname.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // Para CDN de librerías: Cache First con fallback a network
  if (url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('esm.run') ||
      url.hostname.includes('esm.sh') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Para assets de la app: Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        // Solo cachear respuestas válidas
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Si falla todo, devolver la página principal para SPA routing
        if (request.mode === 'navigate') {
          return caches.match('/personal/index.html');
        }
      });
    })
  );
});

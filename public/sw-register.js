// Service worker REMOVAL script
// Unregisters any existing service workers so users never get blank pages
// from stale cached bundles after a new deployment.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    registrations.forEach(function(registration) {
      registration.unregister();
      console.log('[SW] Unregistered:', registration.scope);
    });
  });
  // Also clear all caches to ensure fresh assets load
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        caches.delete(cacheName);
        console.log('[SW] Cleared cache:', cacheName);
      });
    });
  }
}

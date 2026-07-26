if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function(reg) {
        console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
      })
      .catch(function(err) {
        console.error('[PWA] ServiceWorker registration failed:', err);
      });
  });
}

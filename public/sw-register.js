// Game 24 | 24点 — Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Game 24: SW registered', reg.scope))
      .catch(err => console.log('Game 24: SW registration failed', err));
  });
}

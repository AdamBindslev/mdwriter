/**
 * Flowscribe PWA Registration & Lifecycle Handler
 */
(function() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then((registration) => {
          // Check for service worker updates periodically
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('Flowscribe: Ny version er klar i baggrunden.');
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('Flowscribe PWA Service Worker fejl:', error);
        });
    });
  }
})();

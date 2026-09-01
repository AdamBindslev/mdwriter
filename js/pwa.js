/**
 * Flowscribe PWA Registration & Lifecycle Handler
 */
(function() {
  if ('serviceWorker' in navigator) {
    let refreshing = false;

    // Reload page immediately when a new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then((registration) => {
          // Immediately check for updates
          registration.update().catch(() => {});

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('Flowscribe: Ny version fundet - genindlæser med opdateringer...');
                  // Tell new worker to skip waiting if waiting
                  if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }
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

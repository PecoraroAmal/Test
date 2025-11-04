let deferredPrompt;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('Attempting to register Service Worker at /Test/sw.js');
    navigator.serviceWorker.register('/Test/sw.js', { scope: '/Test/' })
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
        registration.update();
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
    console.log('Fetching manifest at /Test/manifest.json');
    fetch('/Test/manifest.json')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load manifest.json: ${response.status} ${response.statusText}`);
        console.log('Manifest loaded successfully');
        return response.json();
      })
      .then(data => console.log('Manifest content:', data))
      .catch(error => console.error('Error fetching manifest:', error));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const installButton = document.getElementById('install-app');
  if (installButton) {
    console.log('Install button found in DOM');
    installButton.disabled = true;
    installButton.addEventListener('click', () => {
      console.log('Install button clicked, userAgent:', navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        showMessage('To install Test™, follow the iOS instructions below.', 'info');
      } else if (deferredPrompt) {
        console.log('Showing install prompt');
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          console.log('Prompt outcome:', choiceResult.outcome);
          if (choiceResult.outcome === 'accepted') {
            showMessage('Test™ installed successfully!', 'success');
          } else {
            showMessage('Installation cancelled.', 'info');
          }
          deferredPrompt = null;
        });
      } else {
        console.warn('Install prompt not available');
        showMessage('Installation prompt not available. Ensure you are using a supported browser (e.g., Chrome, Edge, Samsung Internet) on HTTPS. On Android: Open the browser menu (3 dots) > "Add to Home screen" or "Install app". Refresh the page and try again.', 'info');
      }
    });
    setTimeout(() => {
      installButton.disabled = false;
      console.log('Install button enabled');
    }, 2000);
  } else {
    console.error('Install button not found in DOM');
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt fired:', e);
  e.preventDefault();
  deferredPrompt = e;
  const installButton = document.getElementById('install-app');
  if (installButton) {
    console.log('Enabling install button due to beforeinstallprompt');
    installButton.disabled = false;
  }
});

window.addEventListener('appinstalled', () => {
  console.log('PWA installed');
  showMessage('Test™ installed and ready!', 'success');
});

function checkOnlineStatus() {
  if (!navigator.onLine) {
    showMessage('Offline! Some features may be unavailable.', 'info');
  }
}

window.addEventListener('online', checkOnlineStatus);
window.addEventListener('offline', checkOnlineStatus);
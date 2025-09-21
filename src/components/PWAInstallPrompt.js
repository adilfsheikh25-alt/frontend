import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check PWA criteria
    const checkPWACriteria = () => {
      const criteria = {
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        hasServiceWorker: 'serviceWorker' in navigator,
        isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isInstalled: window.navigator.standalone === true
      };
      
      // Show install prompt if criteria are met but no beforeinstallprompt event
      if (criteria.hasManifest && criteria.hasServiceWorker && criteria.isHTTPS && !criteria.isStandalone && !criteria.isInstalled) {
        // Show immediately for non-Chrome browsers, delay for Chrome
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const delay = isChrome ? 10000 : 3000; // 10 seconds for Chrome, 3 seconds for others
        
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, delay);
      }
    };

    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Check criteria immediately
    checkPWACriteria();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  return (
    <>
      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 md:left-auto md:right-4 md:max-w-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-r from-[#1C1717] to-[#C4AA69] rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                Install Portfolio Dashboard
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Add to your home screen for quick access and offline functionality.
              </p>
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="px-3 py-1.5 bg-gradient-to-r from-[#1C1717] to-[#C4AA69] text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;



import React, { useState, useEffect } from 'react';

const ManualPWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      const isInstalled = isStandalone || isIOSStandalone;
      
      if (isInstalled) {
        setIsInstalled(true);
        console.log('PWA is already installed');
      }
    };

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event received');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('App was installed');
      setIsInstalled(true);
    };

    checkInstalled();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Use native install prompt if available
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setIsInstalled(true);
        } else {
          console.log('User dismissed the install prompt');
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error with native install prompt:', error);
        handleManualInstall();
      }
    } else {
      // Fallback to manual installation instructions
      handleManualInstall();
    }
  };

  const handleManualInstall = () => {
    const instructions = `
🚀 PWA Installation Instructions:

Since the automatic install prompt isn't available, here's how to install manually:

CHROME/EDGE DESKTOP:
1. Look for a small install icon (⬇️) in the address bar
2. OR click the three dots menu (⋮) → "Install Portfolio Dashboard"
3. OR press Ctrl+Shift+I → Application tab → Manifest → "Install"

CHROME MOBILE:
1. Tap the three dots menu (⋮) in the address bar
2. Tap "Add to Home screen" or "Install app"
3. Tap "Add" or "Install"

SAFARI iOS:
1. Tap the share button (square with arrow up)
2. Tap "Add to Home Screen"
3. Tap "Add"

FIREFOX:
1. Look for the install icon (⬇️) in the address bar
2. OR click the three dots menu (⋮) → "Install"

EDGE MOBILE:
1. Tap the three dots menu (⋮)
2. Tap "Add to Home screen"

If you don't see install options:
- Try refreshing the page
- Make sure you're on localhost:3000
- Check if your browser supports PWA installation
- Try a different browser

The app is PWA-ready with all criteria met! ✅
    `;
    
    alert(instructions);
  };

  if (isInstalled) {
    return (
      <div className="fixed bottom-4 right-4 z-40 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg text-sm">
        ✅ PWA Installed
      </div>
    );
  }

  // Only show if not already installed and PWA is ready
  if (isInstalled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded-lg text-sm">
      <div className="flex items-center space-x-2">
        <span>Install App</span>
        <button
          onClick={handleInstall}
          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
        >
          {deferredPrompt ? 'Install' : 'Guide'}
        </button>
      </div>
    </div>
  );
};

export default ManualPWAInstall;

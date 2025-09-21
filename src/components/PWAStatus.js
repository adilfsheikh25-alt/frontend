import React, { useState, useEffect } from 'react';

const PWAStatus = () => {
  const [pwaStatus, setPwaStatus] = useState({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    hasServiceWorker: false
  });

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        setPwaStatus(prev => ({ ...prev, isInstalled: true }));
      }
    };

    // Check service worker status
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          setPwaStatus(prev => ({ ...prev, hasServiceWorker: !!registration }));
        } catch (error) {
          console.log('Service worker check failed:', error);
        }
      }
    };

    // Listen for online/offline events
    const handleOnline = () => setPwaStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPwaStatus(prev => ({ ...prev, isOnline: false }));

    checkInstalled();
    checkServiceWorker();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show status when offline or when PWA is installed
  if (!pwaStatus.isInstalled && pwaStatus.isOnline) return null;

  return (
    <div className="fixed top-4 right-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-2 text-xs">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${pwaStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-gray-700">
          {pwaStatus.isOnline ? 'Online' : 'Offline'}
        </span>
        {pwaStatus.isInstalled && (
          <span className="text-green-600">• PWA</span>
        )}
      </div>
    </div>
  );
};

export default PWAStatus;



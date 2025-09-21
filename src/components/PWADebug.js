import React, { useState, useEffect } from 'react';

const PWADebug = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const updateDebugInfo = () => {
      const info = {
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        hasServiceWorker: 'serviceWorker' in navigator,
        isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isIOSStandalone: window.navigator.standalone === true,
        userAgent: navigator.userAgent,
        hasDeferredPrompt: !!window.deferredPrompt,
        isOnline: navigator.onLine,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setDebugInfo(info);
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 left-4 z-50 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-50 hover:opacity-100"
      >
        PWA Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black bg-opacity-90 text-white p-3 rounded-lg max-w-sm text-xs">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold">PWA Debug Info</h4>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="space-y-1">
        <p>Manifest: {debugInfo.hasManifest ? '✅' : '❌'}</p>
        <p>Service Worker: {debugInfo.hasServiceWorker ? '✅' : '❌'}</p>
        <p>HTTPS: {debugInfo.isHTTPS ? '✅' : '❌'}</p>
        <p>Standalone: {debugInfo.isStandalone ? '✅' : '❌'}</p>
        <p>iOS Standalone: {debugInfo.isIOSStandalone ? '✅' : '❌'}</p>
        <p>Deferred Prompt: {debugInfo.hasDeferredPrompt ? '✅' : '❌'}</p>
        <p>Online: {debugInfo.isOnline ? '✅' : '❌'}</p>
        <p>Browser: {debugInfo.userAgent?.split(' ')[0]}</p>
        <p>Time: {debugInfo.timestamp}</p>
      </div>
    </div>
  );
};

export default PWADebug;

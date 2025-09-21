import React, { useState, useEffect } from 'react';

const ChromeInstallHelper = () => {
  const [isChrome, setIsChrome] = useState(false);
  const [userEngagement, setUserEngagement] = useState(0);
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    // Check if it's Chrome
    const checkChrome = () => {
      const isChromeBrowser = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      setIsChrome(isChromeBrowser);
    };

    // Track user engagement
    const trackEngagement = () => {
      const events = ['click', 'scroll', 'keydown', 'touchstart'];
      
      const handleEngagement = () => {
        setUserEngagement(prev => {
          const newEngagement = prev + 1;
          
          // Show helper after some engagement
          if (newEngagement === 5 && isChrome) {
            setShowHelper(true);
          }
          
          return newEngagement;
        });
      };

      events.forEach(event => {
        document.addEventListener(event, handleEngagement, { once: false });
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleEngagement);
        });
      };
    };

    checkChrome();
    const cleanup = trackEngagement();

    return cleanup;
  }, [isChrome]);

  const handleChromeInstall = () => {
    // Try to trigger Chrome's install prompt
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
    } else {
      // Show manual instructions for Chrome
      const instructions = `
Chrome PWA Installation:

1. Look for the install icon (⬇️) in the address bar
2. If not visible, try:
   - Refresh the page
   - Navigate to different pages in the app
   - Wait a few minutes for Chrome to detect engagement
   - Try clicking around the app more

3. Alternative method:
   - Press F12 (Developer Tools)
   - Go to "Application" tab
   - Click "Manifest" in the left sidebar
   - Click "Install" button

4. Or use the three dots menu (⋮):
   - Click three dots in address bar
   - Look for "Install Portfolio Dashboard"

Chrome requires more user engagement than Firefox to show the install prompt.
      `;
      
      alert(instructions);
    }
  };

  if (!isChrome || !showHelper) return null;

  return (
    <div className="fixed top-4 left-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg text-sm max-w-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Chrome Install Helper</p>
          <p className="text-xs">Engagement: {userEngagement} interactions</p>
        </div>
        <button
          onClick={handleChromeInstall}
          className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 ml-2"
        >
          Install
        </button>
        <button
          onClick={() => setShowHelper(false)}
          className="text-yellow-600 hover:text-yellow-800 ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ChromeInstallHelper;

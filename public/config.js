window.__CONFIG__ = Object.assign({}, window.__CONFIG__, {
  BACKEND_URL: (function() {
    try {
      var isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isLocal) return 'http://localhost:5000/api';
      return 'https://backend-zuva.onrender.com/api';
    } catch (e) {
      return 'http://localhost:5000/api';
    }
  })()
});



// API Configuration
export const API_CONFIG = {
  ANGEL_BROKING: {
    BASE_URL: 'https://apiconnect.angelone.in',
    LOGIN_URL: 'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword',
    TOKEN_URL: 'https://apiconnect.angelone.in/rest/auth/angelbroking/jwt/v1/generateTokens',
    PROFILE_URL: 'https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getProfile',
    MARKET_DATA_URL: 'https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/'
  },
  BACKEND: {
    BASE_URL: (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL)
      || (typeof window !== 'undefined' && window.__CONFIG__ && window.__CONFIG__.BACKEND_URL)
      || (function() {
        if (typeof window !== 'undefined') {
          const { hostname } = window.location;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:5000/api';
          }
          return `${window.location.origin.replace(/\/$/, '')}/api`;
        }
        return 'http://localhost:5000/api';
      })()
  }
};

// Pre-configured API credentials (as provided by user)
export const ANGEL_CREDENTIALS = {
  API_KEY: 'dXCRFMDC',
  SECRET_KEY: '96fc6c13-e0be-4fb1-ade7-08dd1914e16e'
};

// Helper function to get Angel Broking API headers (deprecated - use smartApiService.getDynamicApiHeaders instead)
export const getAngelApiHeaders = () => {
  console.warn('getAngelApiHeaders is deprecated. Use smartApiService.getDynamicApiHeaders() instead.');
  return {
    'X-PrivateKey': '',
    'Accept': 'application/json',
    'X-SourceID': API_CONFIG.ANGEL_BROKING.SOURCE_ID,
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '127.0.0.1',
    'X-MACAddress': '00:00:00:00:00:00',
    'X-UserType': API_CONFIG.ANGEL_BROKING.USER_TYPE,
    'Authorization': 'Bearer ',
    'Content-Type': 'application/json'
  };
};

// Helper function to check if Angel Broking API is configured (deprecated - use smartApiService.isApiConfigured instead)
export const isAngelApiConfigured = () => {
  console.warn('isAngelApiConfigured is deprecated. Use smartApiService.isApiConfigured() instead.');
  return false;
};

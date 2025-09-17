// Login Service for handling Angel Broking API credentials
const loginService = {
  // Authenticate with Angel Broking using client code, PIN, and TOTP
  async authenticateWithAngel(clientCode, pin, totp, apiKey, secretKey) {
    try {
      console.log('Starting Angel Broking authentication...');
      
      // Step 1: Login with password (client code + PIN + TOTP)
      const loginResponse = await this.loginByPassword(clientCode, pin, totp, apiKey);
      
      if (!loginResponse.success) {
        throw new Error(loginResponse.message || 'Login failed');
      }

      // Step 2: Store the tokens
      const { jwtToken, refreshToken, feedToken } = loginResponse.data;
      
      // Store all credentials
      this.storeApiCredentials(apiKey, secretKey, jwtToken, refreshToken, feedToken, clientCode);
      
      console.log('Angel Broking authentication successful');
      return true;
    } catch (error) {
      console.error('Angel Broking authentication error:', error);
      return false;
    }
  },

  // Login with password (client code + PIN + TOTP)
  async loginByPassword(clientCode, pin, totp, apiKey) {
    try {
      const loginData = {
        clientcode: clientCode,
        password: pin,
        totp: totp,
        state: "live"
      };

      const response = await fetch('https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': apiKey
        },
        body: JSON.stringify(loginData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Login response:', data);
      
      return {
        success: data.status === true,
        message: data.message,
        data: data.data
      };
    } catch (error) {
      console.error('Login by password error:', error);
      throw error;
    }
  },

  // Generate new tokens using refresh token
  async generateTokens(refreshToken, apiKey) {
    try {
      const response = await fetch('https://apiconnect.angelone.in/rest/auth/angelbroking/jwt/v1/generateTokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': apiKey
        },
        body: JSON.stringify({
          refreshToken: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Token generation response:', data);
      
      if (data.status && data.data) {
        // Update stored tokens
        this.updateTokens(data.data.jwtToken, data.data.refreshToken, data.data.feedToken);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token generation error:', error);
      return false;
    }
  },

  // Get user profile from Angel Broking
  async getUserProfile() {
    try {
      const credentials = this.getApiCredentials();
      if (!credentials.isLoggedIn) {
        throw new Error('Not logged in');
      }

      const response = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getProfile', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-UserType': 'USER',
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('User profile response:', data);
      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  },

  // Store API credentials after successful login
  storeApiCredentials(apiKey, secretKey, accessToken, refreshToken, feedToken, clientCode) {
    try {
      localStorage.setItem('angel_api_key', apiKey);
      localStorage.setItem('angel_secret_key', secretKey);
      localStorage.setItem('angel_access_token', accessToken);
      localStorage.setItem('angel_refresh_token', refreshToken);
      localStorage.setItem('angel_feed_token', feedToken);
      localStorage.setItem('angel_client_code', clientCode);
      localStorage.setItem('angel_login_time', new Date().toISOString());
      
      console.log('API credentials stored successfully');
      return true;
    } catch (error) {
      console.error('Error storing API credentials:', error);
      return false;
    }
  },

  // Get stored API credentials
  getApiCredentials() {
    try {
      console.log('🔍 getApiCredentials() called');
      const apiKey = localStorage.getItem('angel_api_key');
      const secretKey = localStorage.getItem('angel_secret_key');
      const accessToken = localStorage.getItem('angel_access_token');
      const refreshToken = localStorage.getItem('angel_refresh_token');
      const feedToken = localStorage.getItem('angel_feed_token');
      const clientCode = localStorage.getItem('angel_client_code');
      const loginTime = localStorage.getItem('angel_login_time');
      
      console.log('localStorage values:', {
        apiKey: apiKey ? '***' + apiKey.slice(-4) : null,
        secretKey: secretKey ? '***' + secretKey.slice(-4) : null,
        accessToken: accessToken ? '***' + accessToken.slice(-4) : null,
        refreshToken: refreshToken ? '***' + refreshToken.slice(-4) : null,
        feedToken: feedToken ? '***' + feedToken.slice(-4) : null,
        clientCode,
        loginTime
      });
      
      const result = {
        apiKey,
        secretKey,
        accessToken,
        refreshToken,
        feedToken,
        clientCode,
        loginTime,
        isLoggedIn: !!(apiKey && accessToken)
      };
      
      console.log('Final result:', {
        ...result,
        apiKey: result.apiKey ? '***' + result.apiKey.slice(-4) : null,
        secretKey: result.secretKey ? '***' + result.secretKey.slice(-4) : null,
        accessToken: result.accessToken ? '***' + result.accessToken.slice(-4) : null,
        refreshToken: result.refreshToken ? '***' + result.refreshToken.slice(-4) : null,
        feedToken: result.feedToken ? '***' + result.feedToken.slice(-4) : null
      });
      
      return result;
    } catch (error) {
      console.error('Error getting API credentials:', error);
      return { isLoggedIn: false };
    }
  },

  // Update tokens (for refresh)
  updateTokens(jwtToken, refreshToken, feedToken) {
    try {
      if (jwtToken) localStorage.setItem('angel_access_token', jwtToken);
      if (refreshToken) localStorage.setItem('angel_refresh_token', refreshToken);
      if (feedToken) localStorage.setItem('angel_feed_token', feedToken);
      localStorage.setItem('angel_token_update_time', new Date().toISOString());
      
      console.log('Tokens updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating tokens:', error);
      return false;
    }
  },

  // Clear API credentials on logout
  clearApiCredentials() {
    try {
      localStorage.removeItem('angel_api_key');
      localStorage.removeItem('angel_secret_key');
      localStorage.removeItem('angel_access_token');
      localStorage.removeItem('angel_refresh_token');
      localStorage.removeItem('angel_feed_token');
      localStorage.removeItem('angel_client_code');
      localStorage.removeItem('angel_login_time');
      localStorage.removeItem('angel_token_update_time');
      
      sessionStorage.removeItem('angel_api_key');
      sessionStorage.removeItem('angel_secret_key');
      sessionStorage.removeItem('angel_access_token');
      sessionStorage.removeItem('angel_refresh_token');
      sessionStorage.removeItem('angel_feed_token');
      sessionStorage.removeItem('angel_client_code');
      
      console.log('API credentials cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing API credentials:', error);
      return false;
    }
  },

  // Check if user is logged in with valid credentials
  isLoggedIn() {
    try {
      console.log('🔍 loginService.isLoggedIn() called');
      const credentials = this.getApiCredentials();
      console.log('Retrieved credentials:', credentials);
      const result = credentials.isLoggedIn;
      console.log('isLoggedIn result:', result);
      return result;
    } catch (error) {
      console.error('Error in isLoggedIn:', error);
      return false;
    }
  },

  // Check if access token needs refresh
  async checkAndRefreshToken() {
    try {
      const credentials = this.getApiCredentials();
      if (!credentials.isLoggedIn || !credentials.refreshToken) {
        return false;
      }

      // Check if token is expired (simplified check)
      const loginTime = new Date(credentials.loginTime);
      const now = new Date();
      const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);

      // If more than 24 hours, try to refresh
      if (hoursSinceLogin > 24) {
        console.log('Token may be expired, attempting refresh...');
        return await this.generateTokens(credentials.refreshToken, credentials.apiKey);
      }

      return true;
    } catch (error) {
      console.error('Token refresh check error:', error);
      return false;
    }
  },

  // Auto-login: Try to get credentials from session
  async autoLogin() {
    try {
      console.log('Attempting auto-login...');
      
      // Check if we have stored credentials
      if (this.isLoggedIn()) {
        // Check if token needs refresh
        const tokenValid = await this.checkAndRefreshToken();
        if (tokenValid) {
          console.log('Auto-login successful with existing credentials');
          return true;
        }
      }
      
      console.log('Auto-login failed - no valid credentials found');
      return false;
    } catch (error) {
      console.error('Auto-login error:', error);
      return false;
    }
  }
};

export default loginService;

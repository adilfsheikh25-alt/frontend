import { API_CONFIG } from '../config/api';
import loginService from './loginService';
import instrumentsService from '../services/instrumentsService';

// Smart API Service for market data
const smartApiService = {
  // Get API credentials from login session
  getApiCredentials() {
    return loginService.getApiCredentials();
  },

  // Get dynamic API headers with current session credentials
  getDynamicApiHeaders() {
    const credentials = this.getApiCredentials();
    
    if (!credentials.isLoggedIn) {
      console.log('API credentials not found in session');
      return null;
    }

    return {
      'X-PrivateKey': credentials.apiKey,
      'Accept': 'application/json',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '127.0.0.1',
      'X-MACAddress': '00:00:00:00:00:00',
      'X-UserType': 'USER',
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json'
    };
  },

  // Check if API is configured with session credentials
  isApiConfigured() {
    return loginService.isLoggedIn();
  },

  // Fetch live price data from Angel Broking API
  async getLivePrice(symbol, exchange = 'NSE', symbolToken = null) {
    try {
      // Check if API is configured with session credentials
      if (!this.isApiConfigured()) {
        console.log('Angel Broking API not configured in session, using fallback prices');
        return this.generateFallbackPrice(symbol);
      }

      // If we have symbol token, use it directly
      if (symbolToken) {
        return await this.fetchFromAngelAPI(exchange, [symbolToken]);
      }

      // Try to find symbol token from instruments data
      const token = await this.getSymbolToken(symbol, exchange);
      if (token) {
        return await this.fetchFromAngelAPI(exchange, [token]);
      }

      // Fallback to generated price if no token found
      console.log(`No symbol token found for ${symbol}, using fallback price`);
      return this.generateFallbackPrice(symbol);
    } catch (error) {
      console.error(`Error fetching live price for ${symbol}:`, error);
      return this.generateFallbackPrice(symbol);
    }
  },

  // Fetch data from Angel Broking API using LTP mode
  async fetchFromAngelAPI(exchange, symbolTokens) {
    try {
      const requestData = {
        // Use FULL to receive comprehensive fields including previous close
        mode: "FULL",
        exchangeTokens: {
          [exchange]: symbolTokens
        }
      };

      console.log('Angel API Request:', requestData);

      // Get dynamic headers with current session credentials
      const headers = this.getDynamicApiHeaders();
      if (!headers) {
        throw new Error('API credentials not available');
      }

      const response = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Angel API Response:', data);

      if (data.status && data.data && data.data.fetched && data.data.fetched.length > 0) {
        const fetchedData = data.data.fetched[0];
        const lastPrice = parseFloat(fetchedData.ltp) || 0;
        // Try multiple common keys for previous close from the API payload
        const prevCloseRaw = (
          fetchedData.close ??
          fetchedData.closePrice ??
          fetchedData.previousClose ??
          fetchedData.yclose ??
          fetchedData.yesterdayClose
        );
        const prevClose = parseFloat(prevCloseRaw) || 0;
        let change = parseFloat(fetchedData.netChange);
        let changePercentage = parseFloat(fetchedData.percentChange);

        // If API doesn't supply change, derive it from lastPrice and previous close
        if (!isFinite(change)) {
          change = prevClose > 0 ? (lastPrice - prevClose) : 0;
        }
        if (!isFinite(changePercentage)) {
          changePercentage = prevClose > 0 ? ((change / prevClose) * 100) : 0;
        }

        return {
          symbol: fetchedData.tradingSymbol?.replace('-EQ', '') || symbolTokens[0],
          exchange: fetchedData.exchange,
          lastPrice,
          change: parseFloat(change.toFixed(2)) || 0,
          changePercentage: parseFloat(changePercentage.toFixed(2)) || 0,
          timestamp: new Date().toISOString(),
          open: parseFloat(fetchedData.open) || 0,
          high: parseFloat(fetchedData.high) || 0,
          low: parseFloat(fetchedData.low) || 0,
          close: prevClose,
          volume: parseInt(fetchedData.tradeVolume) || 0
        };
      } else {
        throw new Error('No data fetched from Angel API');
      }
    } catch (error) {
      console.error('Angel API Error:', error);
      throw error;
    }
  },

  // Get symbol token from instruments data
  async getSymbolToken(symbol, exchange = 'NSE') {
    try {
      // Load instruments data
      const response = await fetch('/instruments.json');
      if (!response.ok) {
        throw new Error('Failed to load instruments data');
      }

      const instruments = await response.json();

      // Find matching instrument
      const instrument = instruments.find(instr => {
        const instrSymbol = (instr.symbol || instr['symbol '] || '').trim();
        const instrExchange = instr.exch_seg || 'NSE';
        return instrSymbol.toUpperCase() === symbol.toUpperCase() &&
               instrExchange.toUpperCase() === exchange.toUpperCase();
      });

      return instrument ? instrument.token?.toString() : null;
    } catch (error) {
      console.error('Error getting symbol token:', error);
      return null;
    }
  },

  // Generate fallback price when API is not available
  generateFallbackPrice(symbol) {
    const basePrice = this.generateRealisticPrice(symbol);
    const change = (Math.random() - 0.5) * (basePrice * 0.1); // ±5% change
    const changePercentage = (change / basePrice) * 100;

    return {
      symbol,
      exchange: 'NSE',
      lastPrice: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercentage: parseFloat(changePercentage.toFixed(2)),
      timestamp: new Date().toISOString(),
      open: parseFloat((basePrice * 0.99).toFixed(2)),
      high: parseFloat((basePrice * 1.02).toFixed(2)),
      low: parseFloat((basePrice * 0.98).toFixed(2)),
      close: parseFloat((basePrice * 0.995).toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 100000
    };
  },

  // Generate realistic price based on symbol
  generateRealisticPrice(symbol) {
    // Generate different price ranges for different types of stocks
    const symbolUpper = symbol.toUpperCase();
    
    if (symbolUpper.includes('RELIANCE') || symbolUpper.includes('TCS')) {
      return Math.random() * 2000 + 1000; // 1000-3000 range
    } else if (symbolUpper.includes('INFY') || symbolUpper.includes('HDFC')) {
      return Math.random() * 1000 + 500; // 500-1500 range
    } else if (symbolUpper.includes('SBIN') || symbolUpper.includes('ICICI')) {
      return Math.random() * 500 + 200; // 200-700 range
    } else if (symbolUpper.includes('TATA') || symbolUpper.includes('WIPRO')) {
      return Math.random() * 300 + 100; // 100-400 range
    } else {
      // Default range for other stocks
      return Math.random() * 200 + 50; // 50-250 range
    }
  },

  // Fetch live prices for multiple stocks
  async getLivePrices(stocks) {
    try {
      const pricePromises = stocks.map(async (stock) => {
        // Extract symbol token if available
        const symbolToken = stock.symbolToken || null;
        return this.getLivePrice(stock.symbol, stock.exchange || 'NSE', symbolToken);
      });
      const prices = await Promise.all(pricePromises);
      return prices;
    } catch (error) {
      console.error('Error fetching live prices:', error);
      return [];
    }
  },

  // Update stock prices for watchlist
  async updateStockPrices(stocks, watchlistId = null) {
    try {
      if (!stocks || stocks.length === 0) {
        return stocks;
      }

      const updatedStocks = await this.getLivePrices(stocks);
      
      // Create a map of symbol to price data
      const priceMap = {};
      updatedStocks.forEach(price => {
        priceMap[price.symbol] = price;
      });
      
      // Update stocks with live prices
      const result = stocks.map(stock => {
        const livePrice = priceMap[stock.symbol];
        if (livePrice) {
          return {
            ...stock,
            lastPrice: livePrice.lastPrice,
            change: livePrice.change,
            changePercentage: livePrice.changePercentage,
            priceUpdatedAt: livePrice.timestamp,
            open: livePrice.open,
            high: livePrice.high,
            low: livePrice.low,
            close: livePrice.close,
            volume: livePrice.volume
          };
        }
        return stock;
      });

      // Save price updates to backend if watchlistId is provided
      if (watchlistId) {
        try {
          const { watchlistService } = await import('./watchlistService');
          const priceUpdates = result
            .filter(stock => priceMap[stock.symbol])
            .map(stock => ({
              symbol: stock.symbol,
              lastPrice: stock.lastPrice,
              change: stock.change,
              changePercentage: stock.changePercentage
            }));

          if (priceUpdates.length > 0) {
            await watchlistService.updateStockPrices(watchlistId, priceUpdates);
          }
        } catch (error) {
          console.error('Error saving price updates to backend:', error);
        }
      }

      return result;
    } catch (error) {
      console.error('Error updating stock prices:', error);
      return stocks; // Return original stocks if update fails
    }
  },

  // Update holdings prices and calculate P&L
  async updateHoldingsPrices(holdings) {
    try {
      if (!holdings || holdings.length === 0) {
        return holdings;
      }

      const updatedHoldings = await this.updateStockPrices(holdings);
      
      // Calculate P&L for each holding and preserve average price
      const result = updatedHoldings.map(holding => {
        const pnlData = this.calculatePnL(holding);
        return {
          ...holding,
          // Preserve the original average price (purchase price) - DO NOT overwrite it
          averagePrice: holding.averagePrice || 0,
          pnl: pnlData.pnl,
          pnlPercentage: pnlData.pnlPercentage,
          // Calculate amounts
          amountInvested: (holding.quantity || 0) * (holding.averagePrice || 0),
          currentAmount: (holding.quantity || 0) * (holding.lastPrice || holding.averagePrice || 0)
        };
      });

      return result;
    } catch (error) {
      console.error('Error updating holdings prices:', error);
      return holdings;
    }
  },

  // Calculate P&L for a holding
  calculatePnL(holding) {
    if (!holding.lastPrice || !holding.averagePrice || !holding.quantity) {
      return { pnl: 0, pnlPercentage: 0 };
    }

    const currentValue = holding.lastPrice * holding.quantity;
    const investedValue = holding.averagePrice * holding.quantity;
    const pnl = currentValue - investedValue;
    const pnlPercentage = (pnl / investedValue) * 100;

    return {
      pnl: parseFloat(pnl.toFixed(2)),
      pnlPercentage: parseFloat(pnlPercentage.toFixed(2))
    };
  },

  // Get API status and connection information
  async getApiStatus() {
    try {
      const credentials = this.getApiCredentials();
      
      if (!credentials.isLoggedIn) {
        return {
          isConnected: false,
          lastSync: null,
          status: 'Not Connected'
        };
      }

      // Check if access token is valid by making a simple API call
      const headers = this.getDynamicApiHeaders();
      if (!headers) {
        return {
          isConnected: false,
          lastSync: null,
          status: 'No Credentials'
        };
      }

      // Try to make a simple API call to test connection
      try {
        const response = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getProfile', {
          method: 'GET',
          headers: headers
        });

        if (response.ok) {
          return {
            isConnected: true,
            lastSync: new Date().toISOString(),
            status: 'Connected'
          };
        } else {
          return {
            isConnected: false,
            lastSync: null,
            status: 'Authentication Failed'
          };
        }
      } catch (error) {
        return {
          isConnected: false,
          lastSync: null,
          status: 'Connection Error'
        };
      }
    } catch (error) {
      console.error('Error checking API status:', error);
      return {
        isConnected: false,
        lastSync: null,
        status: 'Error'
      };
    }
  },

  // Refresh access token
  async refreshAccessToken() {
    try {
      const credentials = this.getApiCredentials();
      
      if (!credentials.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('https://apiconnect.angelone.in/rest/auth/angelbroking/jwt/v1/generateTokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': credentials.apiKey
        },
        body: JSON.stringify({
          refreshToken: credentials.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      if (data.status && data.data) {
        // Update stored credentials with new tokens
        const updatedCredentials = {
          ...credentials,
          accessToken: data.data.jwtToken,
          refreshToken: data.data.refreshToken
        };
        
        loginService.storeApiCredentials(updatedCredentials);
        return true;
      } else {
        throw new Error('Invalid response from token refresh');
      }
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }
};

export default smartApiService;

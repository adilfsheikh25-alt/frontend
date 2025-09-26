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
        console.log(`Angel Broking API not configured in session, skipping live price for ${symbol}`);
        return null; // Do not generate random fallback
      }

      // If we have symbol token, use it directly
      if (symbolToken) {
        console.log(`Using provided symbol token ${symbolToken} for ${symbol}`);
        return await this.fetchFromAngelAPI(exchange, [symbolToken]);
      }

      // Try to find symbol token from instruments data
      console.log(`Looking up symbol token for ${symbol} on ${exchange}`);
      const token = await this.getSymbolToken(symbol, exchange);
      if (token) {
        console.log(`Found symbol token ${token} for ${symbol}`);
        return await this.fetchFromAngelAPI(exchange, [token]);
      }

      // Fallback to generated price if no token found
      console.log(`No symbol token found for ${symbol}, using fallback price`);
      return this.generateFallbackPrice(symbol);
    } catch (error) {
      console.error(`Error fetching live price for ${symbol}:`, error);
      console.log(`Skipping fallback price for ${symbol} due to API error`);
      return null;
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
      console.log('Angel API Response Status:', data.status);
      console.log('Angel API Response Data:', data.data);

      // Check if we have valid data
      if (data.status && data.data) {
        // Return array of fetched results (handle multiple tokens)
        if (data.data.fetched && data.data.fetched.length > 0) {
          return data.data.fetched.map(fd => {
            const lastPrice = parseFloat(fd.ltp) || 0;
            const prevCloseRaw = (
              fd.close ??
              fd.closePrice ??
              fd.previousClose ??
              fd.yclose ??
              fd.yesterdayClose
            );
            const prevClose = parseFloat(prevCloseRaw) || 0;
            let change = parseFloat(fd.netChange);
            let changePercentage = parseFloat(fd.percentChange);

            if (!isFinite(change)) {
              change = prevClose > 0 ? (lastPrice - prevClose) : 0;
            }
            if (!isFinite(changePercentage)) {
              changePercentage = prevClose > 0 ? ((change / prevClose) * 100) : 0;
            }

            return {
              symbol: (fd.tradingSymbol || '').replace('-EQ', ''),
              exchange: fd.exchange,
              symbolToken: (fd.symbolToken || fd.exchangeToken || '').toString(),
              lastPrice,
              change: parseFloat(change.toFixed(2)) || 0,
              changePercentage: parseFloat(changePercentage.toFixed(2)) || 0,
              timestamp: new Date().toISOString(),
              open: parseFloat(fd.open) || 0,
              high: parseFloat(fd.high) || 0,
              low: parseFloat(fd.low) || 0,
              close: prevClose,
              volume: parseInt(fd.tradeVolume) || 0
            };
          });
        } else if (data.data.unfetched && data.data.unfetched.length > 0) {
          console.log('Angel API Unfetched Symbols:', data.data.unfetched);
          throw new Error(`Symbols not found in API: ${data.data.unfetched.map(s => s.symbol).join(', ')}`);
        } else {
          console.log('Angel API: No fetched or unfetched data');
          throw new Error('No data fetched from Angel API - empty response');
        }
      } else {
        console.log('Angel API: Invalid response structure');
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      console.error('Angel API Error:', error);
      throw error;
    }
  },

  // Helper: chunk an array
  _chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  },

  // Batched live prices for many stocks (50 tokens per request per exchange)
  async getLivePrices(stocks) {
    try {
      // Resolve tokens per stock
      const withTokens = await Promise.all(stocks.map(async (s) => {
        const token = s.symbolToken || await (await import('../services/instrumentsService')).default.getSymbolToken(s.symbol, s.exchange || 'NSE');
        return { ...s, symbolToken: token };
      }));

      // Group by exchange
      const exchangeToTokens = {};
      withTokens.forEach(s => {
        const ex = (s.exchange || 'NSE').toUpperCase();
        if (!s.symbolToken) return;
        if (!exchangeToTokens[ex]) exchangeToTokens[ex] = new Set();
        exchangeToTokens[ex].add(s.symbolToken);
      });

      const priceMap = {};

      // For each exchange, batch tokens by 50
      for (const [exchange, tokenSet] of Object.entries(exchangeToTokens)) {
        const tokens = Array.from(tokenSet);
        const batches = this._chunk(tokens, 50);
        for (const batch of batches) {
          try {
            const results = await this.fetchFromAngelAPI(exchange, batch);
            results.forEach(r => {
              // Map by token and by symbol
              if (r.symbolToken) priceMap[r.symbolToken] = r;
              if (r.symbol) priceMap[r.symbol] = r;
            });
          } catch (e) {
            console.error(`Batch fetch error for ${exchange}:`, e);
          }
        }
      }

      // Return results in array form for callers
      return Object.values(priceMap);
    } catch (error) {
      console.error('Error fetching live prices (batched):', error);
      return [];
    }
  },

  // Update stock prices for watchlist / holdings
  async updateStockPrices(stocks, watchlistId = null) {
    try {
      if (!stocks || stocks.length === 0) {
        return stocks;
      }

      const updatedStocks = await this.getLivePrices(stocks);
      
      // Create a map of symbol and token to price data
      const priceMap = {};
      updatedStocks.forEach(price => {
        if (!price) return;
        if (price.symbol) priceMap[price.symbol] = price;
        if (price.symbolToken) priceMap[price.symbolToken] = price;
      });
      
      // Update stocks with live prices
      const result = stocks.map(stock => {
        const livePrice = priceMap[stock.symbol] || (stock.symbolToken ? priceMap[stock.symbolToken] : undefined);
        if (livePrice) {
          console.log(`✅ Got live price for ${stock.symbol}: ${livePrice.lastPrice} (was ${stock.lastPrice})`);
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
        } else {
          console.log(`❌ No live price found for ${stock.symbol} (token: ${stock.symbolToken})`);
        }
        return stock;
      });

      // Save price updates to backend if watchlistId is provided
      if (watchlistId) {
        try {
          const { watchlistService } = await import('./watchlistService');
          const priceUpdates = result
            .filter(stock => (priceMap[stock.symbol] || (stock.symbolToken && priceMap[stock.symbolToken])))
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

      console.log('🔄 Updating prices for holdings:', holdings.length);
      const updatedHoldings = await this.updateStockPrices(holdings);
      console.log('📊 Updated holdings from API:', updatedHoldings);
      
      // Calculate P&L for each holding and preserve average price
      const result = updatedHoldings.map(holding => {
        // If lastPrice is still the same as averagePrice, it means price fetch failed
        const priceFetched = holding.lastPrice !== holding.averagePrice;
        console.log(`📈 ${holding.symbol}: lastPrice=${holding.lastPrice}, averagePrice=${holding.averagePrice}, priceFetched=${priceFetched}`);
        
        const pnlData = this.calculatePnL(holding);
        return {
          ...holding,
          // Preserve the original average price (purchase price) - DO NOT overwrite it
          averagePrice: holding.averagePrice || 0,
          // Only update lastPrice if we actually got a different price from API
          lastPrice: priceFetched ? holding.lastPrice : holding.averagePrice,
          pnl: pnlData.pnl,
          pnlPercentage: pnlData.pnlPercentage,
          // Calculate amounts
          amountInvested: (holding.quantity || 0) * (holding.averagePrice || 0),
          currentAmount: (holding.quantity || 0) * (priceFetched ? holding.lastPrice : holding.averagePrice || 0)
        };
      });

      console.log('✅ Final holdings with prices:', result);
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
  },

  // Search scrip to get token and trading symbol/name from Angel API
  async searchScrip(symbol, exchange = 'NSE') {
    try {
      if (!this.isApiConfigured()) {
        return null;
      }

      const headers = this.getDynamicApiHeaders();
      if (!headers) return null;

      const payload = {
        exchange: exchange.toUpperCase(),
        searchscrip: symbol.toUpperCase()
      };

      const response = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/searchScrip', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.status || !Array.isArray(data.data) || data.data.length === 0) {
        return null;
      }

      // Prefer the exact EQ match if available, otherwise first result
      const eqMatch = data.data.find(d => (d.tradingsymbol || '').toUpperCase().endsWith('-EQ')) || data.data[0];

      return {
        exchange: eqMatch.exchange,
        tradingSymbol: (eqMatch.tradingsymbol || eqMatch.tradingsymb || '').replace('-EQ', ''),
        symbolToken: (eqMatch.symboltoken || eqMatch.exchange_token || '').toString(),
        name: eqMatch.name || symbol
      };
    } catch (error) {
      console.error('searchScrip error:', error);
      return null;
    }
  },

  // Search scrips (return full list) to get tokens and trading symbols
  async searchScripList(symbol, exchange = 'NSE') {
    try {
      if (!this.isApiConfigured()) {
        return [];
      }
      const headers = this.getDynamicApiHeaders();
      if (!headers) return [];

      const payload = {
        exchange: exchange.toUpperCase(),
        searchscrip: (symbol || '').toUpperCase()
      };

      const response = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/searchScrip', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!data.status || !Array.isArray(data.data)) {
        return [];
      }
      return data.data.map(d => ({
        exchange: d.exchange,
        tradingSymbol: (d.tradingsymbol || d.tradingsymb || '').trim(),
        symbolToken: (d.symboltoken || d.exchange_token || '').toString(),
        name: d.name || ''
      }));
    } catch (error) {
      console.error('searchScripList error:', error);
      return [];
    }
  }
};

export default smartApiService;
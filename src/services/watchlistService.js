const API_BASE_URL = 'http://localhost:5000/api';

// Get client ID from Angel Broking login or generate new one
const getClientId = () => {
  // First try to get the client code from Angel Broking login
  const angelClientCode = localStorage.getItem('angel_client_code');
  if (angelClientCode) {
    console.log('🔑 Using Angel Broking client code:', angelClientCode);
    return angelClientCode;
  }
  
  // Fallback to generated client ID if no Angel Broking login
  let clientId = localStorage.getItem('client_id');
  if (!clientId) {
    clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('client_id', clientId);
    console.log('🆔 Generated fallback client ID:', clientId);
  }
  return clientId;
};

// Watchlist API calls
export const watchlistService = {
  // Get all watchlists for the client
  async getWatchlists() {
    try {
      console.log('🔄 Frontend: Attempting to fetch watchlists from API...');
      const response = await fetch(`${API_BASE_URL}/watchlists`, {
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Frontend: Successfully fetched watchlists from API');
      return result.data || result; // Handle both {data: [...]} and [...] formats
    } catch (error) {
      console.error('❌ Frontend: API failed, falling back to localStorage:', error);
      // Fallback to localStorage if API fails
      return this.getLocalWatchlists();
    }
  },

  // Get stocks in a specific watchlist
  async getStocks(watchlistId) {
    try {
      console.log('🔄 Frontend: Attempting to fetch stocks from API...');
      const response = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}/stocks`, {
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Frontend: Successfully fetched stocks from API');
      return result.data || result; // Handle both {data: [...]} and [...] formats
    } catch (error) {
      console.error('❌ Frontend: API failed, falling back to localStorage:', error);
      // Fallback to localStorage if API fails
      return this.getLocalStocks(watchlistId);
    }
  },

  // Create a new watchlist
  async createWatchlist(name) {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlists`, {
        method: 'POST',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.data || result; // Handle both {data: {...}} and {...} formats
    } catch (error) {
      console.error('Error creating watchlist:', error);
      // Fallback to localStorage if API fails
      return this.createLocalWatchlist(name);
    }
  },

  // Add stock to watchlist
  async addStock(watchlistId, stockData) {
    try {
      console.log('🔄 Frontend: Sending stock data to backend:', stockData);
      console.log('🔄 Frontend: Watchlist ID:', watchlistId);
      console.log('🔄 Frontend: API URL:', `${API_BASE_URL}/watchlists/${watchlistId}/stocks`);
      console.log('🔄 Frontend: Client ID:', getClientId());
      
      const response = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}/stocks`, {
        method: 'POST',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stockData)
      });
      
      console.log('🔄 Frontend: Response status:', response.status);
      console.log('🔄 Frontend: Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔄 Frontend: Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔄 Frontend: Response data:', result);
      
      const stock = result.data || result; // Handle both {data: {...}} and {...} formats
      console.log('🔄 Frontend: Extracted stock data:', stock);
      
      if (!stock) {
        console.error('❌ Frontend: No stock data returned from backend');
        return null;
      }
      
      console.log('✅ Frontend: Successfully added stock:', stock);
      return stock;
    } catch (error) {
      console.error('❌ Frontend: Error adding stock:', error);
      // Fallback to localStorage if API fails
      return this.addLocalStock(watchlistId, stockData);
    }
  },

  // Update stock in watchlist
  async updateStock(watchlistId, stockId, stockData) {
    try {
      console.log('🔄 Frontend: Attempting to update stock via API...');
      const response = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}/stocks/${stockId}`, {
        method: 'PUT',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stockData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Frontend: Stock updated successfully via API');
      return result.data || result; // Handle both {data: {...}} and {...} formats
    } catch (error) {
      console.error('❌ Frontend: API failed, falling back to localStorage:', error);
      // Fallback to localStorage if API fails
      return this.updateLocalStock(watchlistId, stockId, stockData);
    }
  },

  // Update stock prices in database
  async updateStockPrices(watchlistId, priceUpdates) {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}/stocks/prices`, {
        method: 'PUT',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceUpdates })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error updating stock prices:', error);
      return null;
    }
  },

  // Remove stock from watchlist
  async removeStock(watchlistId, stockId) {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}/stocks/${stockId}`, {
        method: 'DELETE',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error removing stock:', error);
      // Fallback to localStorage if API fails
      return this.removeLocalStock(watchlistId, stockId);
    }
  },

  // Delete watchlist
  async deleteWatchlist(watchlistId) {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}`, {
        method: 'DELETE',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting watchlist:', error);
      // Fallback to localStorage if API fails
      return this.deleteLocalWatchlist(watchlistId);
    }
  },

  // Rename watchlist
  async renameWatchlist(watchlistId, newName) {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}`, {
        method: 'PUT',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error renaming watchlist:', error);
      // Fallback to localStorage if API fails
      return this.renameLocalWatchlist(watchlistId, newName);
    }
  },

  // Fallback localStorage methods
  getLocalWatchlists() {
    try {
      const watchlists = JSON.parse(localStorage.getItem('watchlists') || '[]');
      if (!Array.isArray(watchlists) || watchlists.length === 0) {
        // Create default watchlist if none exist
        const defaultWatchlist = { id: 'default', name: 'My Watchlist', stocks: [] };
        localStorage.setItem('watchlists', JSON.stringify([defaultWatchlist]));
        return [defaultWatchlist];
      }
      // Ensure all watchlists have required properties
      return watchlists.filter(watchlist => 
        watchlist && 
        typeof watchlist === 'object' && 
        watchlist.id && 
        watchlist.name && 
        Array.isArray(watchlist.stocks)
      );
    } catch (error) {
      console.error('Error parsing watchlists from localStorage:', error);
      const defaultWatchlist = { id: 'default', name: 'My Watchlist', stocks: [] };
      localStorage.setItem('watchlists', JSON.stringify([defaultWatchlist]));
      return [defaultWatchlist];
    }
  },

  getLocalStocks(watchlistId) {
    try {
      const watchlists = JSON.parse(localStorage.getItem('watchlists') || '[]');
      const watchlist = Array.isArray(watchlists) ? watchlists.find(w => w && w.id === watchlistId) : null;
      if (watchlist && Array.isArray(watchlist.stocks)) {
        // Ensure all stocks have required properties
        return watchlist.stocks.filter(stock => 
          stock && 
          typeof stock === 'object' && 
          stock.symbol && 
          stock.name
        );
      }
      return [];
    } catch (error) {
      console.error('Error parsing stocks from localStorage:', error);
      return [];
    }
  },

  createLocalWatchlist(name) {
    const watchlists = JSON.parse(localStorage.getItem('watchlists') || '[]');
    const newWatchlist = { id: 'watchlist_' + Date.now(), name, stocks: [] };
    watchlists.push(newWatchlist);
    localStorage.setItem('watchlists', JSON.stringify(watchlists));
    return newWatchlist;
  },

  addLocalStock(watchlistId, stockData) {
    try {
      const watchlists = JSON.parse(localStorage.getItem('watchlists') || '[]');
      const watchlist = Array.isArray(watchlists) ? watchlists.find(w => w && w.id === watchlistId) : null;
      if (watchlist && Array.isArray(watchlist.stocks)) {
        // Ensure stockData has required properties
        if (!stockData || !stockData.symbol || !stockData.name) {
          console.error('Invalid stock data:', stockData);
          return null;
        }
        
        const newStock = { 
          ...stockData, 
          id: 'stock_' + Date.now(),
          symbol: stockData.symbol || '',
          name: stockData.name || '',
          quantity: stockData.quantity || 0,
          priceAddedAt: stockData.priceAddedAt || '',
          addedDate: stockData.addedDate || new Date().toISOString().split('T')[0]
        };
        
        watchlist.stocks.push(newStock);
        localStorage.setItem('watchlists', JSON.stringify(watchlists));
        return newStock;
      }
      return null;
    } catch (error) {
      console.error('Error adding local stock:', error);
      return null;
    }
  },

  updateLocalStock(watchlistId, symbol, stockData) {
    const watchlists = JSON.parse(localStorage.getItem('watchlists') || '[]');
    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (watchlist) {
      const stockIndex = watchlist.stocks.findIndex(s => s.symbol === symbol);
      if (stockIndex !== -1) {
        watchlist.stocks[stockIndex] = { ...watchlist.stocks[stockIndex], ...stockData };
        localStorage.setItem('watchlists', JSON.stringify(watchlists));
        return watchlist.stocks[stockIndex];
      }
    }
    return null;
  },

  removeLocalStock(watchlistId, stockId) {
    const watchlists = JSON.parse(localStorage.getItem('watchlists') || '[]');
    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (watchlist) {
      watchlist.stocks = watchlist.stocks.filter(s => s.id !== stockId);
      localStorage.setItem('watchlists', JSON.stringify(watchlists));
      return true;
    }
    return false;
  },

  deleteLocalWatchlist(watchlistId) {
    const watchlists = JSON.parse(localStorage.getItem('watchlists') || '[]');
    const filteredWatchlists = watchlists.filter(w => w.id !== watchlistId);
    localStorage.setItem('watchlists', JSON.stringify(filteredWatchlists));
    return true;
  },

  renameLocalWatchlist(watchlistId, newName) {
    const watchlists = JSON.parse(localStorage.getItem('watchlists') || '[]');
    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (watchlist) {
      watchlist.name = newName;
      localStorage.setItem('watchlists', JSON.stringify(watchlists));
      return watchlist;
    }
    return null;
  },

  // Clear all watchlists
  async clearAllWatchlists() {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlists/clear`, {
        method: 'DELETE',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error clearing all watchlists:', error);
      // Fallback to localStorage if API fails
      return this.clearLocalWatchlists();
    }
  },

  // Clear all watchlists (local storage fallback)
  clearLocalWatchlists() {
    try {
      localStorage.removeItem('watchlists');
      return { success: true, message: 'Local watchlists cleared' };
    } catch (error) {
      console.error('Error clearing local watchlists:', error);
      return { success: false, message: 'Failed to clear local watchlists' };
    }
  }
};

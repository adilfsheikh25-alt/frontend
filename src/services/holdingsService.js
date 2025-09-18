import { API_CONFIG } from '../config/api';
const API_BASE_URL = API_CONFIG.BACKEND.BASE_URL;

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

// Holdings API calls
export const holdingsService = {
  // Check if API is accessible
  async checkApiHealth() {
    try {
      // Try to access the holdings endpoint to check if API is working
      const response = await fetch(`${API_BASE_URL}/holdings`, { 
        method: 'GET',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        }
      });
      return response.ok || response.status === 401; // 401 means API is reachable but unauthorized
    } catch (error) {
      console.log('❌ Service: API health check failed:', error);
      return false;
    }
  },

  // Get all holdings for the client
  async getHoldings() {
    try {
      const response = await fetch(`${API_BASE_URL}/holdings`, {
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.data || result; // Handle both {data: [...]} and [...] formats
    } catch (error) {
      console.error('Error fetching holdings:', error);
      // Fallback to localStorage if API fails
      return this.getLocalHoldings();
    }
  },

  // Add new holding
  async addHolding(holdingData) {
    try {
      console.log('🔄 Frontend: Sending holding data to backend:', holdingData);
      console.log('🔄 Frontend: API URL:', `${API_BASE_URL}/holdings`);
      console.log('🔄 Frontend: Client ID:', getClientId());
      
      const response = await fetch(`${API_BASE_URL}/holdings`, {
        method: 'POST',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(holdingData)
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
      return result.data || result; // Handle both {data: {...}} and {...} formats
    } catch (error) {
      console.error('❌ Frontend: Error adding holding:', error);
      // Fallback to localStorage if API fails
      return this.addLocalHolding(holdingData);
    }
  },

  // Update holding (no localStorage fallback; must succeed on backend)
  async updateHolding(symbol, exchange, holdingData) {
    console.log('🔄 Service: Updating holding:', { symbol, exchange, holdingData });
    console.log('🔄 Service: API URL:', `${API_BASE_URL}/holdings/${symbol}?exchange=${exchange}`);
    console.log('🔄 Service: Client ID:', getClientId());

    const response = await fetch(`${API_BASE_URL}/holdings/${symbol}?exchange=${exchange}`, {
      method: 'PUT',
      headers: {
        'X-Client-ID': getClientId(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(holdingData)
    });

    console.log('🔄 Service: Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ Service: HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Service: Update successful, result:', result);
    return result.data || result; // Handle both {data: {...}} and {...} formats
  },

  // Remove holding
  async removeHolding(symbol) {
    try {
      const response = await fetch(`${API_BASE_URL}/holdings/${symbol}`, {
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
      console.error('Error removing holding:', error);
      // Fallback to localStorage if API fails
      return this.removeLocalHolding(symbol);
    }
  },

  // Clear all holdings
  async clearHoldings() {
    try {
      const response = await fetch(`${API_BASE_URL}/holdings/clear`, {
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
      console.error('Error clearing holdings:', error);
      // Fallback to localStorage if API fails
      return this.clearLocalHoldings();
    }
  },

  // Bulk import holdings
  async bulkImport(holdingsData) {
    try {
      const response = await fetch(`${API_BASE_URL}/holdings/bulk`, {
        method: 'POST',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ holdings: holdingsData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error bulk importing holdings:', error);
      // Fallback to localStorage if API fails
      return this.bulkImportLocal(holdingsData);
    }
  },

  // Get holdings summary
  async getSummary() {
    try {
      const response = await fetch(`${API_BASE_URL}/holdings/summary`, {
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.data; // Extract data from response
    } catch (error) {
      console.error('Error fetching holdings summary:', error);
      // Fallback to localStorage if API fails
      return this.getLocalSummary();
    }
  },

  // Update prices for all holdings
  async updatePrices() {
    try {
      const response = await fetch(`${API_BASE_URL}/holdings/update-prices`, {
        method: 'PUT',
        headers: {
          'X-Client-ID': getClientId(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating prices:', error);
      return false;
    }
  },

  // Update holding prices in database
  async updateHoldingPrices(priceUpdates) {
    try {
      const response = await fetch(`${API_BASE_URL}/holdings/prices`, {
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
      console.error('Error updating holding prices:', error);
      return null;
    }
  },

  // Update multiple holding prices at once (alias for updateHoldingPrices)
  async updateMultipleHoldingPrices(priceUpdates) {
    return this.updateHoldingPrices(priceUpdates);
  },

  // Fallback localStorage methods
  getLocalHoldings() {
    try {
      const holdings = JSON.parse(localStorage.getItem('holdings') || '[]');
      // Ensure all holdings have required properties
      return Array.isArray(holdings) ? holdings.filter(holding => 
        holding && 
        typeof holding === 'object' && 
        holding.symbol && 
        holding.name
      ) : [];
    } catch (error) {
      console.error('Error parsing holdings from localStorage:', error);
      return [];
    }
  },

  addLocalHolding(holdingData) {
    try {
      const holdings = JSON.parse(localStorage.getItem('holdings') || '[]');
      
      // Ensure holdingData has required properties
      if (!holdingData || !holdingData.symbol || !holdingData.name) {
        console.error('Invalid holding data:', holdingData);
        return null;
      }
      
      const newHolding = { 
        ...holdingData, 
        id: 'holding_' + Date.now(),
        symbol: holdingData.symbol || '',
        name: holdingData.name || '',
        quantity: holdingData.quantity || 0,
        priceAddedAt: holdingData.priceAddedAt || '',
        addedDate: holdingData.addedDate || new Date().toISOString().split('T')[0]
      };
      
      holdings.push(newHolding);
      localStorage.setItem('holdings', JSON.stringify(holdings));
      return newHolding;
    } catch (error) {
      console.error('Error adding local holding:', error);
      return null;
    }
  },

  updateLocalHolding(symbol, holdingData) {
    try {
      console.log('🔄 LocalStorage: Updating holding with symbol:', symbol);
      const holdings = JSON.parse(localStorage.getItem('holdings') || '[]');
      const holdingIndex = holdings.findIndex(h => h.symbol === symbol);
      
      if (holdingIndex !== -1) {
        console.log('✅ LocalStorage: Found holding at index:', holdingIndex);
        holdings[holdingIndex] = { ...holdings[holdingIndex], ...holdingData };
        localStorage.setItem('holdings', JSON.stringify(holdings));
        console.log('✅ LocalStorage: Holding updated successfully');
        return holdings[holdingIndex];
      } else {
        console.log('❌ LocalStorage: Holding not found with symbol:', symbol);
        return null;
      }
    } catch (error) {
      console.error('❌ LocalStorage: Error updating holding:', error);
      return null;
    }
  },

  removeLocalHolding(symbol) {
    try {
      console.log('🔄 LocalStorage: Removing holding with symbol:', symbol);
      const holdings = JSON.parse(localStorage.getItem('holdings') || '[]');
      const filteredHoldings = holdings.filter(h => h.symbol !== symbol);
      localStorage.setItem('holdings', JSON.stringify(filteredHoldings));
      console.log('✅ LocalStorage: Holding removed successfully');
      return true;
    } catch (error) {
      console.error('❌ LocalStorage: Error removing holding:', error);
      return false;
    }
  },

  clearLocalHoldings() {
    localStorage.setItem('holdings', JSON.stringify([]));
    return true;
  },

  bulkImportLocal(holdingsData) {
    const holdings = JSON.parse(localStorage.getItem('holdings') || '[]');
    const newHoldings = holdingsData.map(data => ({
      ...data,
      id: 'holding_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }));
    const allHoldings = [...holdings, ...newHoldings];
    localStorage.setItem('holdings', JSON.stringify(allHoldings));
    return { count: newHoldings.length, holdings: allHoldings };
  },

  getLocalSummary() {
    const holdings = JSON.parse(localStorage.getItem('holdings') || '[]');
    const totalValue = holdings.reduce((sum, h) => sum + (h.lastPrice * h.quantity), 0);
    const totalQuantity = holdings.reduce((sum, h) => sum + h.quantity, 0);
    
    return {
      totalHoldings: holdings.length,
      totalValue,
      totalQuantity,
      averagePrice: holdings.length > 0 ? totalValue / totalQuantity : 0
    };
  }
};

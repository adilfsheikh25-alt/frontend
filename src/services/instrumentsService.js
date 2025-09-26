// Instruments data service with caching and lazy loading
class InstrumentsService {
  constructor() {
    this.instrumentsData = null;
    this.isLoading = false;
    this.loadPromise = null;
  }

  async getInstruments() {
    // Return cached data if available
    if (this.instrumentsData) {
      return this.instrumentsData;
    }

    // If already loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = this.loadInstruments();

    try {
      this.instrumentsData = await this.loadPromise;
      return this.instrumentsData;
    } finally {
      this.isLoading = false;
    }
  }

  async loadInstruments() {
    try {
      console.log('📊 Loading instruments data...');
      const response = await fetch('/instruments.json');
      
      if (!response.ok) {
        throw new Error(`Failed to load instruments: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Instruments data loaded successfully');
      return data;
    } catch (error) {
      console.error('❌ Error loading instruments data:', error);
      // Return empty array as fallback
      return [];
    }
  }

  // Get company name from symbol with caching
  async getCompanyNameFromSymbol(symbol, exchange = 'NSE') {
    try {
      const instruments = await this.getInstruments();
      
      if (!Array.isArray(instruments)) {
        console.warn('⚠️ Instruments data is not an array');
        return symbol; // Return symbol as fallback
      }

      const instrument = instruments.find(item => {
        const instrSymbol = (item.symbol || item['symbol '] || '').trim();
        const instrExchange = item.exch_seg || 'NSE';
        const symbolMatch = instrSymbol.toUpperCase() === symbol.toUpperCase();
        
        // More flexible exchange matching for BSE
        let exchangeMatch = false;
        if (exchange.toUpperCase() === 'BSE') {
          // BSE might be stored as 'BSE', 'BOM', or other variations
          exchangeMatch = instrExchange.toUpperCase() === 'BSE' || 
                         instrExchange.toUpperCase() === 'BOM' ||
                         instrExchange.toUpperCase().includes('BSE');
        } else {
          exchangeMatch = instrExchange.toUpperCase() === exchange.toUpperCase();
        }
        
        return symbolMatch && exchangeMatch;
      });

      if (instrument) {
        const rawName = (instrument.name || instrument['name '] || '').trim();
        // Clean up special characters and encoding issues
        const cleanName = rawName
          .replace(/\uFFFD/g, '') // Remove replacement character
          .replace(/[^\x20-\x7E]/g, '') // Remove only control characters, keep printable ASCII
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        return cleanName || symbol;
      }
      
      return symbol;
    } catch (error) {
      console.error('❌ Error getting company name:', error);
      return symbol; // Return symbol as fallback
    }
  }

  // Get symbol token with caching
  async getSymbolToken(symbol, exchange = 'NSE') {
    try {
      const instruments = await this.getInstruments();
      
      if (!Array.isArray(instruments)) {
        return null;
      }

      const instrument = instruments.find(item => {
        const instrSymbol = (item.symbol || item['symbol '] || '').trim();
        const instrExchange = item.exch_seg || 'NSE';
        const symbolMatch = instrSymbol.toUpperCase() === symbol.toUpperCase();
        
        // More flexible exchange matching for BSE
        let exchangeMatch = false;
        if (exchange.toUpperCase() === 'BSE') {
          // BSE might be stored as 'BSE', 'BOM', or other variations
          exchangeMatch = instrExchange.toUpperCase() === 'BSE' || 
                         instrExchange.toUpperCase() === 'BOM' ||
                         instrExchange.toUpperCase().includes('BSE');
        } else {
          exchangeMatch = instrExchange.toUpperCase() === exchange.toUpperCase();
        }
        
        return symbolMatch && exchangeMatch;
      });

      return instrument ? instrument.token?.toString() : null;
    } catch (error) {
      console.error('❌ Error getting symbol token:', error);
      return null;
    }
  }

  // Search instruments with caching
  async searchInstruments(query, limit = 10) {
    try {
      const instruments = await this.getInstruments();
      
      if (!Array.isArray(instruments)) {
        return [];
      }

      const searchQuery = query.toLowerCase();
      const results = instruments.filter(item => {
        const symbol = (item.symbol || item['symbol '] || '').trim().toLowerCase();
        const name = (item.name || item['name '] || '').trim().toLowerCase();
        return symbol.includes(searchQuery) || name.includes(searchQuery);
      }).slice(0, limit);

      return results;
    } catch (error) {
      console.error('❌ Error searching instruments:', error);
      return [];
    }
  }

  // Find instrument by token (string or number)
  async getInstrumentByToken(token) {
    try {
      const instruments = await this.getInstruments();
      if (!Array.isArray(instruments)) {
        return null;
      }

      const tokenStr = token?.toString().trim();
      if (!tokenStr) return null;

      const instrument = instruments.find(item => {
        const itemToken = (item.token?.toString() || item['token ']?.toString() || '').trim();
        return itemToken === tokenStr;
      });

      return instrument || null;
    } catch (error) {
      console.error('❌ Error finding instrument by token:', error);
      return null;
    }
  }

  // Clear cache (useful for testing or memory management)
  clearCache() {
    this.instrumentsData = null;
    this.isLoading = false;
    this.loadPromise = null;
  }
}

// Export singleton instance
export default new InstrumentsService();



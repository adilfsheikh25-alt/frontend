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

      const instrument = instruments.find(item => 
        item.symbol === symbol && item.exchange === exchange
      );

      return instrument ? instrument.name : symbol;
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

      const instrument = instruments.find(item => 
        item.symbol === symbol && item.exchange === exchange
      );

      return instrument ? instrument.token : null;
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
      const results = instruments.filter(item => 
        item.symbol.toLowerCase().includes(searchQuery) ||
        item.name.toLowerCase().includes(searchQuery)
      ).slice(0, limit);

      return results;
    } catch (error) {
      console.error('❌ Error searching instruments:', error);
      return [];
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



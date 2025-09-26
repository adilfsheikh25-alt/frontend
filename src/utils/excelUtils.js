// Excel/CSV Import/Export Utilities
import instrumentsService from '../services/instrumentsService';
import smartApiService from '../services/smartApiService';

// Text cleaners for symbols/names coming from CSVs
const cleanSymbol = (text) => {
  const t = (text || '').toString();
  return t
    .replace(/\uFFFD|�/g, '') // remove replacement chars
    .replace(/[^A-Za-z0-9_.-]/g, '') // keep common symbol charset
    .trim()
    .toUpperCase();
};

const cleanNameText = (text) => {
  const t = (text || '').toString();
  return t
    .replace(/\uFFFD|�/g, '')
    .replace(/[^\x20-\x7E]/g, '') // printable ASCII only
    .replace(/\s+/g, ' ')
    .trim();
};

// Utility function to get company name from instruments data
const getCompanyNameFromSymbol = async (symbol, exchange = 'NSE') => {
  return await instrumentsService.getCompanyNameFromSymbol(symbol, exchange);
};

// Enhanced utility function to get stock data from symbol or token
const getStockDataFromSymbol = async (symbol, exchange = 'NSE') => {
  console.log(`🔍 getStockDataFromSymbol: Starting for ${symbol} on ${exchange}`);
  
  try {
    const querySymbol = cleanSymbol(symbol);

    // Load instruments data
    const instruments = await instrumentsService.getInstruments();

    // If the input looks like a numeric token, search by token first
    let instrument;
    const isNumericToken = /^\d+$/.test((querySymbol || '').toString().trim());
    if (isNumericToken) {
      const tokenStr = (querySymbol || '').toString().trim();
      instrument = instruments.find(item => {
        const itemToken = (item.token?.toString() || item['token ']?.toString() || '').trim();
        return itemToken === tokenStr;
      });
    }

    // Otherwise find by symbol + exchange
    if (!instrument) {
      instrument = instruments.find(item => {
        const instrSymbol = (item.symbol || item['symbol '] || '').trim();
        const instrExchange = item.exch_seg || 'NSE';
        const symbolMatch = instrSymbol.toUpperCase() === querySymbol.toUpperCase();
        let exchangeMatch = false;
        if (exchange.toUpperCase() === 'BSE') {
          exchangeMatch = instrExchange.toUpperCase() === 'BSE' || 
                         instrExchange.toUpperCase() === 'BOM' ||
                         instrExchange.toUpperCase().includes('BSE');
        } else {
          exchangeMatch = instrExchange.toUpperCase() === exchange.toUpperCase();
        }
        return symbolMatch && exchangeMatch;
      });
    }

    let name = querySymbol;
    let symbolToken = '';
    let resolvedSymbol = querySymbol;
    let resolvedExchange = exchange;

    if (instrument) {
      resolvedSymbol = cleanSymbol((instrument.symbol || instrument['symbol '] || '').trim());
      resolvedExchange = instrument.exch_seg || exchange;
      const rawName = (instrument.name || instrument['name '] || '').trim();
      name = cleanNameText(rawName) || resolvedSymbol;
      symbolToken = instrument.token?.toString() || '';
    }

    const result = {
      symbol: resolvedSymbol,
      exchange: resolvedExchange,
      name: name,
      symbolToken: symbolToken,
      lastPrice: 0,
      change: 0,
      changePercentage: 0,
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ getStockDataFromSymbol: Success for ${symbol}:`, result);
    return result;
  } catch (error) {
    console.error(`❌ getStockDataFromSymbol: Error for ${symbol}:`, error);
    const fallback = {
      symbol: cleanSymbol(symbol),
      exchange: exchange,
      name: cleanNameText(symbol),
      symbolToken: '',
      lastPrice: 0,
      change: 0,
      changePercentage: 0,
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
      timestamp: new Date().toISOString()
    };
    console.log(`⚠️ getStockDataFromSymbol: Using fallback for ${symbol}:`, fallback);
    return fallback;
  }
};

// Simple throttle for parallel API calls
const throttle = async (items, limit, iteratee) => {
  const ret = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => iteratee(item));
    ret.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) await Promise.race(executing);
    }
  }
  return Promise.all(ret);
};

// Export watchlist to Excel/CSV
export const exportWatchlist = (watchlist) => {
  const data = watchlist.stocks || [];
  
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = [
    'Symbol',
    'Exchange', 
    'Last Price',
    'Change',
    'Change %',
    'Price Added At',
    'Added Date',
    'Symbol Token'
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(stock => [
      stock.symbol || '',
      stock.exchange || 'NSE',
      stock.lastPrice || 0,
      stock.change || 0,
      stock.changePercentage || 0,
      stock.priceAddedAt || '',
      stock.addedDate || '',
      stock.symbolToken || ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${watchlist.name}_watchlist.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export holdings to Excel/CSV
export const exportHoldings = (holdings) => {
  if (holdings.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = [
    'Symbol',
    'Exchange',
    'Quantity',
    'Average Price',
    'Last Price',
    'Amount Invested',
    'Current Amount',
    'P&L',
    'P&L %',
    'Price Added At',
    'Added Date',
    'Symbol Token'
  ];

  const csvContent = [
    headers.join(','),
    ...holdings.map(holding => [
      holding.symbol || '',
      holding.exchange || 'NSE',
      holding.quantity || 0,
      holding.averagePrice || 0,
      holding.lastPrice || 0,
      holding.amountInvested || 0,
      holding.currentAmount || 0,
      holding.pnl || 0,
      holding.pnlPercentage || 0,
      holding.priceAddedAt || '',
      holding.addedDate || '',
      holding.symbolToken || ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'holdings.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Import watchlist from CSV with automatic name and LTP fetching
export const importWatchlist = (file, onSuccess, onError) => {
  const reader = new FileReader();
  
  reader.onload = async (event) => {
    try {
      const csv = event.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      console.log('📥 Import: CSV Headers:', headers);
      console.log('📥 Import: Total lines:', lines.length);
      
      const stocks = [];
      
      // Collect inputs
      const inputs = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const symbol = values[0] || '';
          let exchange = 'NSE';
          if (values[1] && (values[1].toUpperCase() === 'NSE' || values[1].toUpperCase() === 'BSE')) {
            exchange = values[1].toUpperCase();
          } else if (values[2] && (values[2].toUpperCase() === 'NSE' || values[2].toUpperCase() === 'BSE')) {
            exchange = values[2].toUpperCase();
          }
          if (symbol) inputs.push({ symbol, exchange, values });
        }
      }

      // Throttle API lookups
      const results = await throttle(inputs, 5, async (item) => {
        const stockData = await getStockDataFromSymbol(item.symbol, item.exchange);
        return { item, stockData };
      });

      for (const r of results) {
        const { symbol, exchange, values } = r.item;
        const sd = r.stockData;
        const stock = {
          symbol: sd.symbol || symbol,
          name: sd.name || symbol,
          exchange: sd.exchange || exchange,
          lastPrice: sd.lastPrice,
          change: sd.change,
          changePercentage: sd.changePercentage,
          priceAddedAt: values[5] || sd.lastPrice.toString(),
          addedDate: values[6] || new Date().toISOString().split('T')[0],
          symbolToken: sd.symbolToken || values[7] || '',
          open: sd.open,
          high: sd.high,
          low: sd.low,
          close: sd.close,
          volume: sd.volume,
          priceUpdatedAt: sd.timestamp
        };
        stocks.push(stock);
      }

      onSuccess(stocks);
    } catch (error) {
      console.error('Error importing watchlist:', error);
      onError('Error parsing CSV file. Please check the file format.');
    }
  };
  
  reader.onerror = () => {
    onError('Error reading file.');
  };
  
  reader.readAsText(file);
};

// Import holdings from CSV with automatic name and LTP fetching
export const importHoldings = (file, onSuccess, onError) => {
  const reader = new FileReader();
  
  reader.onload = async (event) => {
    try {
      const csv = event.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      console.log('📥 Holdings Import: CSV Headers:', headers);
      console.log('📥 Holdings Import: Total lines:', lines.length);
      
      const holdings = [];
      
      const inputs = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const symbol = values[0] || '';
          let exchange = 'NSE';
          if (values[1] && (values[1].toUpperCase() === 'NSE' || values[1].toUpperCase() === 'BSE')) {
            exchange = values[1].toUpperCase();
          } else if (values[2] && (values[2].toUpperCase() === 'NSE' || values[2].toUpperCase() === 'BSE')) {
            exchange = values[2].toUpperCase();
          }
          const quantity = parseInt(values[2]) || 0;
          if (symbol && quantity > 0) inputs.push({ symbol, exchange, values, quantity });
        }
      }

      const results = await throttle(inputs, 5, async (item) => {
        const stockData = await getStockDataFromSymbol(item.symbol, item.exchange);
        return { item, stockData };
      });

      for (const r of results) {
        const { symbol, exchange, values, quantity } = r.item;
        const sd = r.stockData;
        let pnl = parseFloat(values[6]) || 0;
        let pnlPercentage = parseFloat(values[7]) || 0;
        const avg = parseFloat(values[3]) || 0;
        if (pnl === 0 && avg > 0 && sd.lastPrice > 0) {
          const currentValue = quantity * sd.lastPrice;
          const investedValue = quantity * avg;
          pnl = currentValue - investedValue;
          pnlPercentage = (pnl / investedValue) * 100;
        }
        const holding = {
          symbol: sd.symbol || symbol,
          name: sd.name || symbol,
          exchange: sd.exchange || exchange,
          quantity: quantity,
          averagePrice: avg,
          lastPrice: sd.lastPrice,
          pnl: parseFloat(pnl.toFixed(2)),
          pnlPercentage: parseFloat(pnlPercentage.toFixed(2)),
          priceAddedAt: values[8] || sd.lastPrice.toString(),
          addedDate: values[9] || new Date().toISOString().split('T')[0],
          symbolToken: sd.symbolToken || values[10] || '',
          amountInvested: quantity * avg,
          currentAmount: quantity * sd.lastPrice,
          open: sd.open,
          high: sd.high,
          low: sd.low,
          close: sd.close,
          volume: sd.volume,
          priceUpdatedAt: sd.timestamp
        };
        holdings.push(holding);
      }

      onSuccess(holdings);
    } catch (error) {
      console.error('Error importing holdings:', error);
      onError('Error parsing CSV file. Please check the file format.');
    }
  };
  
  reader.onerror = () => {
    onError('Error reading file.');
  };
  
  reader.readAsText(file);
};

// Test function to verify stock data fetching works
export const testStockDataFetching = async (symbol = 'RELIANCE', exchange = 'NSE') => {
  console.log(`🧪 Testing stock data fetching for ${symbol} on ${exchange}`);
  try {
    const result = await getStockDataFromSymbol(symbol, exchange);
    console.log(`🧪 Test result for ${symbol}:`, result);
    return result;
  } catch (error) {
    console.error(`🧪 Test failed for ${symbol}:`, error);
    throw error;
  }
};

// Generate sample CSV template for watchlist
export const generateWatchlistTemplate = () => {
  const headers = [
    'Symbol',
    'Exchange', 
    'Last Price',
    'Change',
    'Change %',
    'Price Added At',
    'Added Date',
    'Symbol Token'
  ];

  const sampleData = [
    ['RELIANCE', 'NSE', '2500.50', '25.30', '1.02%', '2500.00', '2024-01-15', '2881'],
    ['TCS', 'NSE', '3800.75', '-15.25', '-0.40%', '3800.00', '2024-01-15', '11536'],
    ['INFY', 'NSE', '1650.00', '12.50', '0.76%', '1650.00', '2024-01-15', '4085'],
    ['SBIN', 'BSE', '600.00', '5.25', '0.88%', '594.75', '2024-01-15', '3045']
  ];

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'watchlist_template.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generate sample CSV template for holdings
export const generateHoldingsTemplate = () => {
  const headers = [
    'Symbol',
    'Exchange',
    'Quantity',
    'Average Price',
    'Last Price',
    'Amount Invested',
    'Current Amount',
    'P&L',
    'P&L %',
    'Price Added At',
    'Added Date',
    'Symbol Token'
  ];

  const sampleData = [
    ['RELIANCE', 'NSE', '10', '2500.00', '2500.50', '25000.00', '25005.00', '5.00', '0.02%', '2500.00', '2024-01-15', '2881'],
    ['TCS', 'NSE', '5', '3800.00', '3800.75', '19000.00', '19003.75', '3.75', '0.02%', '3800.00', '2024-01-15', '11536']
  ];

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'holdings_template.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

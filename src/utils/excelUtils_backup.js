// Excel/CSV Import/Export Utilities

// Utility function to get company name from instruments data
const getCompanyNameFromSymbol = async (symbol, exchange = 'NSE') => {
  try {
    const response = await fetch('/instruments.json');
    if (!response.ok) {
      console.warn('Failed to load instruments data for name lookup');
      return symbol; // Fallback to symbol if instruments not available
    }
    
    const instruments = await response.json();
    const instrument = instruments.find(instr => {
      const instrSymbol = (instr.symbol || instr['symbol '] || '').trim();
      const instrExchange = instr.exch_seg || 'NSE';
      return instrSymbol.toUpperCase() === symbol.toUpperCase() &&
             instrExchange.toUpperCase() === exchange.toUpperCase();
    });
    
    if (instrument) {
      const rawName = (instrument.name || instrument['name '] || '').trim();
      // Clean up special characters and encoding issues
      const cleanName = rawName
        .replace(/�/g, '') // Remove replacement character
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      return cleanName || symbol;
    }
    
    return symbol;
  } catch (error) {
    console.error('Error looking up company name:', error);
    return symbol; // Fallback to symbol on error
  }
};

// Export watchlist to Excel/CSV
export const exportWatchlist = (watchlist) => {
  const data = watchlist.stocks || [];
  
  // Prepare CSV data
  const headers = ['Symbol', 'Exchange', 'Last Price', 'Change', 'Change %', 'Price Added At', 'Added Date', 'Symbol Token'];
  const csvData = [
    headers.join(','),
    ...data.map(stock => [
      stock.symbol,
      stock.exchange,
      stock.lastPrice || 0,
      stock.change || 0,
      stock.changePercentage || 0,
      stock.priceAddedAt || '',
      stock.addedDate || '',
      stock.symbolToken || ''
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
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
  const data = holdings || [];
  
  // Prepare CSV data
  const headers = ['Symbol', 'Exchange', 'Quantity', 'Average Price', 'Last Price', 'Current Value', 'P&L', 'P&L %', 'Price Added At', 'Added Date', 'Symbol Token'];
  const csvData = [
    headers.join(','),
    ...data.map(holding => [
      holding.symbol,
      holding.exchange,
      holding.quantity || 0,
      holding.averagePrice || 0,
      holding.lastPrice || 0,
      (holding.quantity * holding.lastPrice) || 0,
      holding.pnl || 0,
      holding.pnlPercentage || 0,
      holding.priceAddedAt || '',
      holding.addedDate || '',
      holding.symbolToken || ''
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `holdings_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Import watchlist from CSV
export const importWatchlist = (file, onSuccess, onError) => {
  const reader = new FileReader();
  
  reader.onload = async (event) => {
    try {
      const csv = event.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const stocks = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const symbol = values[0] || '';
          const exchange = values[1] || 'NSE';
          
          if (symbol) {
            // Get company name from instruments data
            const name = await getCompanyNameFromSymbol(symbol, exchange);
            
            const stock = {
              symbol: symbol,
              name: name, // Add the company name
              exchange: exchange,
              lastPrice: parseFloat(values[2]) || 0,
              change: parseFloat(values[3]) || 0,
              changePercentage: parseFloat(values[4]) || 0,
              priceAddedAt: values[5] || '',
              addedDate: values[6] || new Date().toISOString().split('T')[0],
              symbolToken: values[7] || ''
            };
            
            stocks.push(stock);
          }
        }
      }
      
      onSuccess(stocks);
    } catch (error) {
      onError('Error parsing CSV file. Please check the file format.');
    }
  };
  
  reader.onerror = () => {
    onError('Error reading file.');
  };
  
  reader.readAsText(file);
};

// Import holdings from CSV
export const importHoldings = (file, onSuccess, onError) => {
  const reader = new FileReader();
  
  reader.onload = async (event) => {
    try {
      const csv = event.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const holdings = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const symbol = values[0] || '';
          const exchange = values[1] || 'NSE';
          const quantity = parseInt(values[2]) || 0;
          
          if (symbol && quantity > 0) {
            // Get company name from instruments data
            const name = await getCompanyNameFromSymbol(symbol, exchange);
            
            const holding = {
              symbol: symbol,
              name: name, // Add the company name
              exchange: exchange,
              quantity: quantity,
              averagePrice: parseFloat(values[3]) || 0,
              lastPrice: parseFloat(values[4]) || 0,
              pnl: parseFloat(values[6]) || 0,
              pnlPercentage: parseFloat(values[7]) || 0,
              priceAddedAt: values[8] || '',
              addedDate: values[9] || new Date().toISOString().split('T')[0],
              symbolToken: values[10] || ''
            };
            
            holdings.push(holding);
          }
        }
      }
      
      onSuccess(holdings);
    } catch (error) {
      onError('Error parsing CSV file. Please check the file format.');
    }
  };
  
  reader.onerror = () => {
    onError('Error reading file.');
  };
  
  reader.readAsText(file);
};

// Generate sample CSV template for watchlist
export const generateWatchlistTemplate = () => {
  const headers = ['Symbol', 'Exchange', 'Last Price', 'Change', 'Change %', 'Price Added At', 'Added Date', 'Symbol Token'];
  const sampleData = [
    ['RELIANCE', 'NSE', '2450.50', '25.50', '1.05', '2450.50', '2023-12-15', '2885'],
    ['TCS', 'NSE', '3850.00', '-15.00', '-0.39', '3850.00', '2023-12-15', '11536'],
    ['INFY', 'NSE', '1650.75', '12.25', '0.75', '1650.75', '2023-12-15', '4080'],
    ['HDFC', 'NSE', '1425.30', '-8.70', '-0.61', '1425.30', '2023-12-15', '1333'],
    ['ICICIBANK', 'NSE', '950.45', '5.20', '0.55', '950.45', '2023-12-15', '4963'],
    ['WIPRO', 'NSE', '420.80', '-2.10', '-0.50', '420.80', '2023-12-15', '3787'],
    ['BHARTIARTL', 'NSE', '875.60', '18.40', '2.15', '875.60', '2023-12-15', '271'],
    ['ITC', 'NSE', '485.25', '3.75', '0.78', '485.25', '2023-12-15', '4244'],
    ['SBIN', 'NSE', '580.90', '7.30', '1.27', '580.90', '2023-12-15', '3045'],
    ['TITAN', 'NSE', '3250.00', '45.00', '1.40', '3250.00', '2023-12-15', '8997']
  ];
  
  const csvData = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'watchlist_demo.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generate sample CSV template for holdings
export const generateHoldingsTemplate = () => {
  const headers = ['Symbol', 'Exchange', 'Quantity', 'Average Price', 'Last Price', 'Current Value', 'P&L', 'P&L %', 'Price Added At', 'Added Date', 'Symbol Token'];
  const sampleData = [
    ['RELIANCE', 'NSE', '100', '2450.50', '2475.00', '247500.00', '2450.00', '1.00', '2450.50', '2023-12-15', '2885'],
    ['TCS', 'NSE', '50', '3850.00', '3835.00', '191750.00', '-750.00', '-0.39', '3850.00', '2023-12-15', '11536'],
    ['INFY', 'NSE', '200', '1650.75', '1663.00', '332600.00', '2450.00', '0.74', '1650.75', '2023-12-15', '4080'],
    ['HDFC', 'NSE', '75', '1425.30', '1416.60', '106245.00', '-652.50', '-0.61', '1425.30', '2023-12-15', '1333'],
    ['ICICIBANK', 'NSE', '150', '950.45', '955.65', '143347.50', '780.00', '0.55', '950.45', '2023-12-15', '4963'],
    ['WIPRO', 'NSE', '300', '420.80', '418.70', '125610.00', '-630.00', '-0.50', '420.80', '2023-12-15', '3787'],
    ['BHARTIARTL', 'NSE', '120', '875.60', '894.00', '107280.00', '2208.00', '2.10', '875.60', '2023-12-15', '271'],
    ['ITC', 'NSE', '250', '485.25', '489.00', '122250.00', '937.50', '0.77', '485.25', '2023-12-15', '4244'],
    ['SBIN', 'NSE', '180', '580.90', '588.20', '105876.00', '1314.00', '1.26', '580.90', '2023-12-15', '3045'],
    ['TITAN', 'NSE', '40', '3250.00', '3295.00', '131800.00', '1800.00', '1.38', '3250.00', '2023-12-15', '8997']
  ];
  
  const csvData = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'holdings_demo.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};











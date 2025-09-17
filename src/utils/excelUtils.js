// Excel/CSV Import/Export Utilities
import instrumentsService from '../services/instrumentsService';

// Utility function to get company name from instruments data
const getCompanyNameFromSymbol = async (symbol, exchange = 'NSE') => {
  return await instrumentsService.getCompanyNameFromSymbol(symbol, exchange);
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
    ['INFY', 'NSE', '1650.00', '12.50', '0.76%', '1650.00', '2024-01-15', '4085']
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

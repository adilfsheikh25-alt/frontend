import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit, Eye, Download, Upload, Settings, TrendingUp, Play, Pause, Clock } from 'lucide-react';
import AddStockDialog from './AddStockDialog';
import WatchlistManager from './WatchlistManager';
import { watchlistService } from '../services/watchlistService';
import smartApiService from '../services/smartApiService';
import autoRefreshService from '../services/autoRefreshService';
import instrumentsService from '../services/instrumentsService';
import { generateWatchlistTemplate } from '../utils/excelUtils';

// Utility function to get company name from instruments data
const getCompanyNameFromSymbol = async (symbol, exchange = 'NSE') => {
  return await instrumentsService.getCompanyNameFromSymbol(symbol, exchange);
};

const Watchlist = () => {
  const [watchlists, setWatchlists] = useState([]);
  const [activeWatchlist, setActiveWatchlist] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showWatchlistManager, setShowWatchlistManager] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [nextRefreshIn, setNextRefreshIn] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [importQueue, setImportQueue] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [currentImportIndex, setCurrentImportIndex] = useState(0);

  // Load watchlists and stocks on component mount
  useEffect(() => {
    loadWatchlists();
    setAutoRefreshEnabled(autoRefreshService.isEnabled());
  }, []);



  // Load stocks when active watchlist changes
  useEffect(() => {
    if (activeWatchlist) {
      loadStocks();
    }
  }, [activeWatchlist]);

  // Countdown timer for auto-refresh
  useEffect(() => {
    if (!autoRefreshEnabled) {
      setNextRefreshIn(0);
      return;
    }

    const interval = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) {
          return autoRefreshService.getInterval();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  // Listen for auto-refresh settings changes
  useEffect(() => {
    const checkAutoRefreshStatus = () => {
      setAutoRefreshEnabled(autoRefreshService.isEnabled());
    };

    // Check status every second
    const interval = setInterval(checkAutoRefreshStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Function to ensure all stocks have addedDate field
  const ensureStocksHaveDates = (stocksList) => {
    return stocksList.map(stock => {
      let dateValue = stock.addedDate || stock.priceAddedAt || new Date().toISOString().split('T')[0];
      
      // If it's a full ISO string, extract just the date part
      if (dateValue && dateValue.includes('T')) {
        dateValue = dateValue.split('T')[0];
      }
      
      // Format date as DD/MM/YYYY for better readability
      if (dateValue && dateValue.includes('-')) {
        const [year, month, day] = dateValue.split('-');
        dateValue = `${day}/${month}/${year}`;
      }
      
      return {
        ...stock,
        addedDate: dateValue
      };
    });
  };

  const loadWatchlists = async () => {
    try {
      setLoading(true);
      let watchlistsData = await watchlistService.getWatchlists();
      
      // Ensure we have at least one watchlist
      if (!watchlistsData || watchlistsData.length === 0) {
        console.log('No watchlists found, creating default watchlist...');
        const defaultWatchlist = await watchlistService.createWatchlist('My Watchlist');
        if (defaultWatchlist) {
          watchlistsData = [defaultWatchlist];
          console.log('Default watchlist created:', defaultWatchlist);
        }
      }
      
      if (Array.isArray(watchlistsData) && watchlistsData.length > 0) {
        setWatchlists(watchlistsData);
        setActiveWatchlist(watchlistsData[0]); // Set first watchlist as active
        console.log('Watchlists loaded:', watchlistsData);
      } else {
        console.error('Failed to load or create watchlists');
        setWatchlists([]);
      }
    } catch (error) {
      console.error('Error loading watchlists:', error);
      setWatchlists([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStocks = async () => {
    if (!activeWatchlist) {
      console.log('❌ LoadStocks: No active watchlist');
      return;
    }
    
    try {
      console.log('🔄 LoadStocks: Loading stocks for watchlist:', activeWatchlist.id);
      setLoading(true);
      const stocksData = await watchlistService.getStocks(activeWatchlist.id);
      
      console.log('🔄 LoadStocks: Raw stocks data from service:', stocksData);
      
      if (Array.isArray(stocksData)) {
        // Fetch live prices for the stocks
        if (stocksData.length > 0) {
          console.log('🔄 LoadStocks: Fetching live prices for', stocksData.length, 'stocks');
          const stocksWithPrices = await smartApiService.updateStockPrices(stocksData, activeWatchlist.id);
          console.log('🔄 LoadStocks: Stocks with prices:', stocksWithPrices);
          
          // Ensure all stocks have addedDate field
          const stocksWithDates = ensureStocksHaveDates(stocksWithPrices);
          console.log('🔄 LoadStocks: Final stocks with dates:', stocksWithDates);
          setStocks(stocksWithDates);
        } else {
          console.log('🔄 LoadStocks: No stocks found, setting empty array');
          setStocks(stocksData);
        }
        console.log('✅ LoadStocks: Successfully loaded', stocksData.length, 'stocks');
      } else {
        console.error('❌ LoadStocks: Invalid stocks data format:', stocksData);
        setStocks([]);
      }
    } catch (error) {
      console.error('❌ LoadStocks: Error loading stocks:', error);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (stockData) => {
    if (!activeWatchlist) {
      console.error('No active watchlist selected');
      return;
    }
    
    try {
      console.log('🔄 Manual Add: Adding stock with data:', stockData);
      console.log('🔄 Manual Add: Active watchlist:', activeWatchlist);
      
      // Validate required fields
      if (!stockData.symbol || !stockData.symbol.trim()) {
        throw new Error('Stock symbol is required');
      }
      
      if (!stockData.name || !stockData.name.trim()) {
        throw new Error('Stock name is required');
      }
      
      // Ensure all required fields are properly mapped
      const processedStockData = {
        symbol: stockData.symbol?.toUpperCase().trim(),
        name: stockData.name?.trim(),
        exchange: stockData.exchange || 'NSE',
        symbolToken: stockData.symbolToken || '',
        priceAddedAt: stockData.priceAddedAt || '',
        addedDate: stockData.addedDate
      };
      
      // Ensure the date is in YYYY-MM-DD format for database compatibility
      if (processedStockData.addedDate) {
        if (processedStockData.addedDate.includes('/')) {
          // Convert from DD/MM/YYYY to YYYY-MM-DD
          const [day, month, year] = processedStockData.addedDate.split('/');
          processedStockData.addedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else if (processedStockData.addedDate.includes('-')) {
          // Already in YYYY-MM-DD format, ensure proper padding
          const [year, month, day] = processedStockData.addedDate.split('-');
          processedStockData.addedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      } else {
        // Set default date if none provided
        processedStockData.addedDate = new Date().toISOString().split('T')[0];
      }
      
      console.log('🔄 Manual Add: Processed stock data:', processedStockData);
      console.log('🔄 Manual Add: Adding to watchlist ID:', activeWatchlist.id);
      
      const newStock = await watchlistService.addStock(activeWatchlist.id, processedStockData);
      console.log('🔄 Manual Add: New stock received:', newStock);
      
      if (newStock) {
        // Ensure the new stock has addedDate field
        const stockWithDate = ensureStocksHaveDates([newStock])[0];
        
        setStocks(prev => {
          const updatedStocks = [...prev, stockWithDate];
          console.log('✅ Manual Add: Updated stocks state. Previous count:', prev.length, 'New total:', updatedStocks.length);
          return updatedStocks;
        });
        
        // Handle import queue if we're importing
        if (isImporting) {
          handleImportNext();
        } else {
          setShowAddDialog(false);
        }
        
        // Show success message
        console.log('✅ Manual Add: Stock added successfully to database');
      } else {
        console.error('❌ Manual Add: No stock returned from service');
        throw new Error('Failed to add stock - no data returned from server');
      }
    } catch (error) {
      console.error('❌ Manual Add: Error adding stock:', error);
      console.error('❌ Manual Add: Error details:', {
        message: error.message,
        stack: error.stack,
        stockData: stockData
      });
      
      // Re-throw the error so the dialog can handle it
      throw error;
    }
  };

  // Handle next item in import queue
  const handleImportNext = () => {
    const nextIndex = currentImportIndex + 1;
    console.log('🔄 Import: Moving to next item', { currentIndex: currentImportIndex, nextIndex, totalItems: importQueue.length });
    
    if (nextIndex < importQueue.length) {
      setCurrentImportIndex(nextIndex);
      console.log('🔄 Import: Updated index, dialog should show next item:', importQueue[nextIndex]);
      // Dialog will automatically show next item due to key prop change
    } else {
      // Import complete
      console.log('✅ Import: All items processed, completing import');
      setIsImporting(false);
      setImportQueue([]);
      setCurrentImportIndex(0);
      setShowAddDialog(false);
      console.log(`Import complete! Added ${importQueue.length} stocks.`);
    }
  };

  // Handle import cancel
  const handleImportCancel = () => {
    setIsImporting(false);
    setImportQueue([]);
    setCurrentImportIndex(0);
    setShowAddDialog(false);
  };

  // Handle add all remaining stocks
  const handleAddAllRemaining = async () => {
    if (!activeWatchlist || importQueue.length === 0) return;
    
    const remainingStocks = importQueue.slice(currentImportIndex);
    console.log('🔄 Import: Adding all remaining stocks:', remainingStocks);
    
    try {
      const addedStocks = [];
      let successCount = 0;
      let failCount = 0;
      
      // Add all remaining stocks from current index
      for (let i = currentImportIndex; i < importQueue.length; i++) {
        const stockData = importQueue[i];
        console.log(`🔄 Import: Adding stock ${i + 1}/${importQueue.length}:`, stockData);
        
        // Validate required fields
        if (!stockData.symbol || !stockData.symbol.trim()) {
          console.warn(`⚠️ Import: Skipping stock ${i + 1}/${importQueue.length} - missing symbol`);
          continue;
        }
        
        if (!stockData.name || !stockData.name.trim()) {
          console.warn(`⚠️ Import: Skipping stock ${i + 1}/${importQueue.length} (${stockData.symbol}) - missing name`);
          continue;
        }
        
        // Process the stock data
        const processedStockData = {
          symbol: stockData.symbol?.toUpperCase().trim(),
          name: stockData.name?.trim(),
          exchange: stockData.exchange || 'NSE',
          symbolToken: stockData.symbolToken || '',
          priceAddedAt: stockData.priceAddedAt || '',
          addedDate: stockData.addedDate
        };
        
        // Ensure the date is in YYYY-MM-DD format for database compatibility
        if (processedStockData.addedDate) {
          if (processedStockData.addedDate.includes('/')) {
            // Convert from DD/MM/YYYY to YYYY-MM-DD
            const [day, month, year] = processedStockData.addedDate.split('/');
            processedStockData.addedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else if (processedStockData.addedDate.includes('-')) {
            // Already in YYYY-MM-DD format, ensure proper padding
            const [year, month, day] = processedStockData.addedDate.split('-');
            processedStockData.addedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } else {
          // Set default date if none provided
          processedStockData.addedDate = new Date().toISOString().split('T')[0];
        }
        
        try {
          console.log(`🔄 Import: Attempting to add stock ${i + 1}/${importQueue.length}: ${stockData.symbol}`);
          console.log(`🔄 Import: Processed stock data:`, processedStockData);
          
          const newStock = await watchlistService.addStock(activeWatchlist.id, processedStockData);
          
          if (newStock) {
            const stockWithDate = ensureStocksHaveDates([newStock])[0];
            addedStocks.push(stockWithDate);
            successCount++;
            console.log(`✅ Import: Added stock ${i + 1}/${importQueue.length}: ${stockData.symbol}`, newStock);
          } else {
            failCount++;
            console.error(`❌ Import: Failed to add stock ${i + 1}/${importQueue.length}: ${stockData.symbol} - No stock returned from service`);
          }
        } catch (stockError) {
          // Check if it's a duplicate stock error
          if (stockError.message && stockError.message.includes('already exists')) {
            console.warn(`⚠️ Import: Skipping duplicate stock ${stockData.symbol} - already exists in watchlist`);
            // Don't count duplicates as failures, just skip them
          } else {
            failCount++;
            console.error(`❌ Import: Error adding stock ${stockData.symbol}:`, stockError);
            console.error(`❌ Import: Error details:`, {
              message: stockError.message,
              stack: stockError.stack,
              stockData: processedStockData
            });
          }
        }
      }
      
      // Update state with all added stocks at once to avoid race conditions
      if (addedStocks.length > 0) {
        setStocks(prev => {
          const newStocks = [...prev, ...addedStocks];
          console.log(`✅ Import: Updated stocks state. Previous count: ${prev.length}, Added: ${addedStocks.length}, New total: ${newStocks.length}`);
          return newStocks;
        });
        console.log(`✅ Import: Successfully added ${addedStocks.length} stocks to state`);
      }
      
      // Import complete
      setIsImporting(false);
      setImportQueue([]);
      setCurrentImportIndex(0);
      setShowAddDialog(false);
      
      // Force a refresh of stocks from the database to ensure consistency
      setTimeout(() => {
        console.log('🔄 Import: Refreshing stocks from database...');
        loadStocks();
      }, 100);
      
      // Show completion message with accurate counts
      const totalProcessed = successCount + failCount;
      if (failCount > 0) {
        console.log(`Import complete! Successfully added ${successCount} out of ${totalProcessed} stocks. ${failCount} stocks failed to import.`);
      } else {
        console.log(`Import complete! Successfully added ${successCount} stocks.`);
      }
    } catch (error) {
      console.error('❌ Import: Error adding all remaining stocks:', error);
      console.error(`Error adding stocks: ${error.message || 'Unknown error'}`);
    }
  };

  const handleEditStock = async (stockData) => {
    if (!editingStock) return;
    
    try {
      // Format the date to YYYY-MM-DD format for database consistency
      const formattedDate = stockData.addedDate ? 
        new Date(stockData.addedDate).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      
      // Ensure all required fields are properly mapped
      const updatedStockData = {
        symbol: stockData.symbol?.toUpperCase(),
        name: stockData.name,
        exchange: stockData.exchange || 'NSE',
        symbolToken: stockData.symbolToken,
        addedDate: formattedDate,
        priceAddedAt: parseFloat(stockData.priceAddedAt) || 0,
        lastPrice: parseFloat(stockData.lastPrice) || 0,
        targetPrice: parseFloat(stockData.targetPrice) || 0,
        stopLoss: parseFloat(stockData.stopLoss) || 0
      };
      
      console.log('🔄 Watchlist: Sending update request for:', editingStock.symbol, 'with data:', updatedStockData);
      
      const result = await watchlistService.updateStock(
        activeWatchlist.id, 
        editingStock.symbol, 
        updatedStockData
      );
      
      console.log('📥 Watchlist: Received response from service:', result);
      
      // Extract the updated stock from the response
      const responseData = result.data || result;
      
      // Create a final stock object with all necessary data
      const updatedStock = {
        ...editingStock,
        ...updatedStockData,
        ...responseData,
        // Ensure numeric fields are properly converted
        lastPrice: parseFloat(updatedStockData.lastPrice) || 0,
        targetPrice: parseFloat(updatedStockData.targetPrice) || 0,
        stopLoss: parseFloat(updatedStockData.stopLoss) || 0
      };
      
      console.log('🔄 Watchlist: Final stock data:', updatedStock);
      
      // Ensure the stock has a properly formatted date
      const finalStock = ensureStocksHaveDates([updatedStock])[0];
      
      // Update the stocks state with the updated stock
      setStocks(prev => {
        const newStocks = prev.map(s => {
          const isMatch = s.symbol?.toUpperCase() === editingStock.symbol?.toUpperCase();
          console.log(`🔍 Watchlist: Comparing "${s.symbol}" with "${editingStock.symbol}" = ${isMatch}`);
          return isMatch ? finalStock : s;
        });
        console.log('📊 Watchlist: New stocks state:', newStocks);
        return newStocks;
      });
      
      // Close the dialog and reset editing state
      setEditingStock(null);
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const handleRemoveStock = async (stock) => {
    if (!activeWatchlist) return;
    
    try {
      // Use symbol instead of stockId for deletion
      const success = await watchlistService.removeStock(activeWatchlist.id, stock.symbol);
      if (success) {
        setStocks(prev => prev.filter(s => s.symbol !== stock.symbol));
      }
    } catch (error) {
      console.error('Error removing stock:', error);
    }
  };

  const handleWatchlistCreate = async (name) => {
    try {
      console.log('Creating watchlist with name:', name);
      const newWatchlist = await watchlistService.createWatchlist(name);
      console.log('Watchlist creation response:', newWatchlist);
      
      if (newWatchlist) {
        setWatchlists(prev => [...prev, newWatchlist]);
        setActiveWatchlist(newWatchlist);
        setShowWatchlistManager(false);
        console.log('✅ Watchlist created successfully');
      } else {
        console.error('No watchlist returned from service');
        console.error('Failed to create watchlist');
      }
    } catch (error) {
      console.error('Error creating watchlist:', error);
      console.error(`Error creating watchlist: ${error.message || 'Unknown error'}`);
    }
  };

  const handleWatchlistChange = (watchlist) => {
    setActiveWatchlist(watchlist);
  };

  const handleWatchlistDelete = async (watchlistId) => {
    try {
      const success = await watchlistService.deleteWatchlist(watchlistId);
      if (success) {
        setWatchlists(prev => prev.filter(w => w.id !== watchlistId));
        if (activeWatchlist && activeWatchlist.id === watchlistId) {
          setActiveWatchlist(watchlists.length > 1 ? watchlists.find(w => w.id !== watchlistId) : null);
        }
      }
    } catch (error) {
      console.error('Error deleting watchlist:', error);
    }
  };

  const handleWatchlistRename = async (watchlistId, newName) => {
    try {
      const updatedWatchlist = await watchlistService.renameWatchlist(watchlistId, newName);
      if (updatedWatchlist) {
        setWatchlists(prev => prev.map(w => w.id === watchlistId ? updatedWatchlist : w));
        if (activeWatchlist && activeWatchlist.id === watchlistId) {
          setActiveWatchlist(updatedWatchlist);
        }
      }
    } catch (error) {
      console.error('Error renaming watchlist:', error);
    }
  };

  const handleExport = (watchlist = activeWatchlist) => {
    if (!watchlist || !Array.isArray(stocks) || stocks.length === 0) return;
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Symbol,Name,Quantity,Price Added At,Added Date\n" +
      stocks.map(stock => {
        // Ensure date is in DD/MM/YYYY format for export
        let exportDate = stock.addedDate || '';
        if (exportDate && exportDate.includes('/')) {
          // Already in DD/MM/YYYY format
          exportDate = exportDate;
        } else if (exportDate && exportDate.includes('-')) {
          // Convert from YYYY-MM-DD to DD/MM/YYYY
          const [year, month, day] = exportDate.split('-');
          exportDate = `${day}/${month}/${year}`;
        }
        
        return `${stock.symbol},${stock.name},${stock.quantity},${stock.priceAddedAt || ''},${exportDate}`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${watchlist.name}_watchlist.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (file) => {
    console.log('🔄 Watchlist: handleImport called with:', file);
    console.log('🔄 Watchlist: file type:', typeof file);
    console.log('🔄 Watchlist: file instanceof File:', file instanceof File);
    console.log('🔄 Watchlist: file instanceof Blob:', file instanceof Blob);
    console.log('🔄 Watchlist: file name:', file?.name);
    console.log('🔄 Watchlist: file size:', file?.size);
    
    if (!file) {
      console.log('❌ Watchlist: No file provided');
      console.error('No file selected for import');
      return;
    }
    
    // Check if it's a valid file object
    if (!(file instanceof File) && !(file instanceof Blob)) {
      console.error('❌ Watchlist: Invalid file type:', file);
      console.error('❌ Watchlist: File constructor:', file.constructor);
      console.error('Invalid file type for import');
      return;
    }
    
    // Check file extension
    const fileName = file.name || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    console.log('🔄 Watchlist: File name:', fileName);
    console.log('🔄 Watchlist: File extension:', fileExtension);
    
    if (fileExtension && !['csv'].includes(fileExtension)) {
      console.error('❌ Watchlist: Invalid file extension:', fileExtension);
      console.error('Invalid file type for import');
      return;
    }
    
    console.log('✅ Watchlist: File validation passed, proceeding with import...');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        const importedStocks = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',');
            const symbol = values[0]?.trim();
            const exchange = values[1]?.trim() || 'NSE';
            let dateValue = values[4]?.trim() || new Date().toISOString().split('T')[0];
            
            if (symbol) {
              // Get company name from instruments data
              const name = await getCompanyNameFromSymbol(symbol, exchange);
              
              // Format date as YYYY-MM-DD for dialog compatibility
              if (dateValue && dateValue.includes('/')) {
                const [day, month, year] = dateValue.split('/');
                dateValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              
              importedStocks.push({
                symbol: symbol,
                name: name,
                exchange: exchange,
                priceAddedAt: values[3]?.trim() || '',
                addedDate: dateValue,
                symbolToken: values[7]?.trim() || ''
              });
            }
          }
        }
        
        if (importedStocks.length > 0) {
          // Start import process with dialog
          setImportQueue(importedStocks);
          setCurrentImportIndex(0);
          setIsImporting(true);
          setShowAddDialog(true);
        }
      } catch (error) {
        console.error('Error importing CSV:', error);
        console.error('Error importing CSV file');
      }
    };
    
    reader.onerror = (error) => {
      console.error('❌ Watchlist: FileReader error:', error);
      console.error('Error reading file');
    };
    
    reader.readAsText(file);
  };

  // Auto-refresh function (no loading state)
  const handleAutoSync = useCallback(async () => {
    if (!Array.isArray(stocks) || stocks.length === 0 || !activeWatchlist) return;
    
    try {
      console.log('🔄 Auto-refresh: Starting price sync for watchlist...');
      
      // Update prices for all stocks and save to backend
      const updatedStocks = await smartApiService.updateStockPrices(stocks, activeWatchlist.id);
      console.log('📊 Auto-refresh: Updated stocks data:', updatedStocks);
      
      // Build a map of previous prices by symbol for flicker detection
      const previousBySymbol = {};
      stocks.forEach(s => { previousBySymbol[s.symbol] = s; });

      // Ensure all stocks retain their addedDate field
      const stocksWithDates = ensureStocksHaveDates(updatedStocks.map(s => {
        const prev = previousBySymbol[s.symbol];
        const priceChanged = prev ? Number(prev.lastPrice) !== Number(s.lastPrice) : false;
        return { ...s, __flash: !!priceChanged };
      }));
      console.log('📅 Auto-refresh: Stocks with dates:', stocksWithDates);
      setStocks(stocksWithDates);
      setLastRefreshTime(new Date().toLocaleTimeString());
      console.log('✅ Auto-refresh: Watchlist state updated successfully');

      // Clear flicker flag after animation ends
      setTimeout(() => {
        setStocks(prev => prev.map(s => ({ ...s, __flash: false })));
      }, 600);
    } catch (error) {
      console.error('❌ Auto-refresh: Error syncing prices:', error);
    }
  }, [stocks, activeWatchlist]);

  // Manual refresh function (with loading state)
  const handleSync = useCallback(async () => {
    if (!Array.isArray(stocks) || stocks.length === 0 || !activeWatchlist) return;
    
    try {
      console.log('🔄 Manual refresh: Starting price sync for watchlist...');
      setLoading(true);
      
      // Update prices for all stocks and save to backend
      const updatedStocks = await smartApiService.updateStockPrices(stocks, activeWatchlist.id);
      console.log('📊 Manual refresh: Updated stocks data:', updatedStocks);
      
      // Build a map of previous prices by symbol for flicker detection
      const previousBySymbol = {};
      stocks.forEach(s => { previousBySymbol[s.symbol] = s; });

      // Ensure all stocks retain their addedDate field
      const stocksWithDates = ensureStocksHaveDates(updatedStocks.map(s => {
        const prev = previousBySymbol[s.symbol];
        const priceChanged = prev ? Number(prev.lastPrice) !== Number(s.lastPrice) : false;
        return { ...s, __flash: !!priceChanged };
      }));
      console.log('📅 Manual refresh: Stocks with dates:', stocksWithDates);
      setStocks(stocksWithDates);
      setLastRefreshTime(new Date().toLocaleTimeString());
      console.log('✅ Manual refresh: Watchlist state updated successfully');

      // Clear flicker flag after animation ends
      setTimeout(() => {
        setStocks(prev => prev.map(s => ({ ...s, __flash: false })));
      }, 600);
    } catch (error) {
      console.error('❌ Manual refresh: Error syncing prices:', error);
    } finally {
      setLoading(false);
    }
  }, [stocks, activeWatchlist]);

  // Register with auto-refresh service when handleAutoSync changes
  useEffect(() => {
    if (Array.isArray(stocks) && stocks.length > 0 && activeWatchlist && handleAutoSync) {
      autoRefreshService.register('watchlist', handleAutoSync);
    }
    
    // Cleanup on unmount or when handleAutoSync changes
    return () => {
      autoRefreshService.unregister('watchlist');
    };
  }, [handleAutoSync, stocks, activeWatchlist]);

  const handleClearAll = async () => {
    if (!activeWatchlist || !confirm('Are you sure you want to clear all stocks from this watchlist?')) return;
    
    try {
      for (const stock of stocks) {
        await watchlistService.removeStock(activeWatchlist.id, stock.symbol);
      }
      setStocks([]);
    } catch (error) {
      console.error('Error clearing stocks:', error);
    }
  };

  const filteredStocks = Array.isArray(stocks) ? stocks.filter(stock => {
    // Safety check: ensure stock has required properties
    if (!stock || typeof stock !== 'object') return false;
    
    const symbol = stock.symbol || '';
    const name = stock.name || '';
    
    return symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
           name.toLowerCase().includes(searchTerm.toLowerCase());
  }) : [];

  // Debug function to test adding a single stock
  const testAddStock = async () => {
    if (!activeWatchlist) {
      console.error('No active watchlist selected');
      return;
    }
    
    const testStockData = {
      symbol: 'TEST',
      name: 'Test Company',
      exchange: 'NSE',
      symbolToken: '12345',
      priceAddedAt: '100.00',
      addedDate: new Date().toISOString().split('T')[0]
    };
    
    console.log('🧪 Testing add stock with data:', testStockData);
    
    try {
      const result = await watchlistService.addStock(activeWatchlist.id, testStockData);
      console.log('✅ Test successful:', result);
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  };
  
  // Make test function available globally for debugging
  window.testAddStock = testAddStock;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Watchlist</h1>
        
        {/* Watchlist Selection and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <select
              value={activeWatchlist?.id || ''}
              onChange={(e) => {
                const watchlist = Array.isArray(watchlists) ? watchlists.find(w => w.id === e.target.value) : null;
                handleWatchlistChange(watchlist);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {Array.isArray(watchlists) ? watchlists.map(watchlist => (
                <option key={watchlist.id} value={watchlist.id}>
                  {watchlist.name}
                </option>
              )) : <option value="">Loading...</option>}
            </select>
            
            <button
              onClick={() => setShowWatchlistManager(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Manage Watchlists</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSync}
                disabled={!Array.isArray(stocks) || stocks.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Refresh Prices</span>
              </button>
              
              {/* Auto-refresh indicator */}
              {autoRefreshEnabled && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg">
                  <div className="flex items-center space-x-1">
                    <Play className="w-4 h-4" />
                    <span className="text-sm font-medium">Auto</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{nextRefreshIn}s</span>
                  </div>
                  {lastRefreshTime && (
                    <div className="text-xs text-green-600">
                      Last: {lastRefreshTime}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={handleExport}
              disabled={!Array.isArray(stocks) || stocks.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            
            <button
              onClick={generateWatchlistTemplate}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Demo CSV</span>
            </button>
            
            <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleImport(e.target.files[0])}
                className="hidden"
              />
            </label>
            

          </div>
            </div>
            
        {/* Search and Add Stock */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
              <input
                type="text"
              placeholder="Search stocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock</span>
            </button>
            
            <button
              onClick={handleSync}
              disabled={!activeWatchlist || stocks.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              <span>Sync</span>
            </button>
            
            <button
              onClick={handleClearAll}
              disabled={!activeWatchlist || stocks.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stocks Table */}
      {activeWatchlist && Array.isArray(watchlists) && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-black">
              {activeWatchlist.name} ({filteredStocks.length} stocks)
            </h2>
        </div>
        
          {filteredStocks.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Eye className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No stocks in this watchlist</p>
              <p className="text-sm">Add some stocks to get started</p>
            </div>
          ) : (
        <div className="overflow-x-auto">
              <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">LTP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Change</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Price Added At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Added Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStocks.map((stock, index) => (
                    <tr key={stock.id || `stock-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{stock.symbol}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stock.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm text-gray-900 ${stock.__flash ? 'price-flash' : ''}`}>₹{stock.lastPrice || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        {stock.change !== undefined ? (
                          <div className={`text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'} ${stock.__flash ? 'price-flash' : ''}`}>
                            {stock.change >= 0 ? '+' : ''}₹{Number(stock.change).toFixed(2)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">N/A</div>
                        )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">₹{stock.priceAddedAt || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stock.addedDate || 'N/A'}</div>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingStock(stock);
                              setShowAddDialog(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                    <button
                            onClick={() => handleRemoveStock(stock)}
                            className="text-red-600 hover:text-red-900"
                    >
                            <Trash2 className="w-4 h-4" />
                    </button>
                        </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
            )}
          </div>
        )}

      {/* Add/Edit Stock Dialog */}
      {showAddDialog && (
        <AddStockDialog
          key={isImporting ? `import-${currentImportIndex}` : `edit-${editingStock?.symbol || 'new'}`}
          isOpen={showAddDialog}
          onClose={() => {
            if (isImporting) {
              handleImportCancel();
            } else {
              setShowAddDialog(false);
              setEditingStock(null);
            }
          }}
          onAddStock={editingStock ? handleEditStock : handleAddStock}
          editData={editingStock ? {
            ...editingStock,
            addedDate: editingStock.addedDate && editingStock.addedDate.includes('/') 
              ? new Date(editingStock.addedDate.split('/').reverse().join('-')).toISOString().split('T')[0]
              : editingStock.addedDate || new Date().toISOString().split('T')[0]
          } : (isImporting && importQueue[currentImportIndex] ? {
            ...importQueue[currentImportIndex],
            addedDate: importQueue[currentImportIndex].addedDate || new Date().toISOString().split('T')[0]
          } : null)}
          type="watchlist"
          isImporting={isImporting}
          importProgress={isImporting ? {
            current: currentImportIndex + 1,
            total: importQueue.length,
            onSkip: handleImportNext,
            onAddAll: handleAddAllRemaining
          } : null}
        />
      )}

      {/* Watchlist Manager Dialog */}
      {showWatchlistManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Watchlist Manager</h2>
                <button
                  onClick={() => setShowWatchlistManager(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
                  </div>
              <WatchlistManager
                watchlists={watchlists}
                activeWatchlist={activeWatchlist}
                onWatchlistChange={handleWatchlistChange}
                onWatchlistCreate={handleWatchlistCreate}
                onWatchlistDelete={handleWatchlistDelete}
                onWatchlistRename={handleWatchlistRename}
                onExport={handleExport}
                onImport={handleImport}
              />
                </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;

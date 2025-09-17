import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit, Download, Upload, FileText, RefreshCw, TrendingUp, Play, Pause, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import AddStockDialog from './AddStockDialog';
import { holdingsService } from '../services/holdingsService';
import smartApiService from '../services/smartApiService';
import autoRefreshService from '../services/autoRefreshService';
import instrumentsService from '../services/instrumentsService';
import { generateHoldingsTemplate } from '../utils/excelUtils';

// Utility function to get company name from instruments data
const getCompanyNameFromSymbol = async (symbol, exchange = 'NSE') => {
  return await instrumentsService.getCompanyNameFromSymbol(symbol, exchange);
};

const Holdings = () => {
  const [holdings, setHoldings] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [nextRefreshIn, setNextRefreshIn] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [importQueue, setImportQueue] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [currentImportIndex, setCurrentImportIndex] = useState(0);

  // Load holdings on component mount
  useEffect(() => {
    loadHoldings();
    setAutoRefreshEnabled(autoRefreshService.isEnabled());
  }, []);



  // Load summary when holdings change
  useEffect(() => {
    if (Array.isArray(holdings) && holdings.length > 0) {
      loadSummary();
    }
  }, [holdings]);

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

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, notification.duration);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadHoldings = async () => {
    try {
      setLoading(true);
      const holdingsData = await holdingsService.getHoldings();
      
      // Fetch live prices and calculate P&L for the holdings
      if (holdingsData && holdingsData.length > 0) {
        const holdingsWithPrices = await smartApiService.updateHoldingsPrices(holdingsData);
        
        // Ensure all amounts are correctly calculated
        const holdingsWithCorrectAmounts = holdingsWithPrices.map(holding => ({
          ...holding,
          amountInvested: (holding.quantity || 0) * (holding.averagePrice || 0),
          currentAmount: (holding.quantity || 0) * (holding.lastPrice || holding.averagePrice || 0)
        }));
        
        setHoldings(holdingsWithCorrectAmounts);
      } else {
        setHoldings(holdingsData || []);
      }
    } catch (error) {
      console.error('Error loading holdings:', error);
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to recalculate all amounts
  const recalculateAmounts = () => {
    if (!Array.isArray(holdings) || holdings.length === 0) return;
    
    const holdingsWithRecalculatedAmounts = holdings.map(holding => ({
      ...holding,
      amountInvested: (holding.quantity || 0) * (holding.averagePrice || 0),
      currentAmount: (holding.quantity || 0) * (holding.lastPrice || holding.averagePrice || 0)
    }));
    
    setHoldings(holdingsWithRecalculatedAmounts);
    console.log('✅ Amounts recalculated for all holdings');
  };

  const loadSummary = async () => {
    try {
      // Calculate summary locally from current holdings data to match dashboard logic
      if (!Array.isArray(holdings) || holdings.length === 0) {
        setSummary(null);
        return;
      }

      const totalHoldings = holdings.length;
      const totalQuantity = holdings.reduce((sum, h) => sum + (h.quantity || 0), 0);
      
      // Total value: current market value
      const totalValue = holdings.reduce((sum, h) => {
        const quantity = h.quantity || 0;
        const lastPrice = h.lastPrice || h.averagePrice || 0;
        return sum + (quantity * lastPrice);
      }, 0);
      
      // Total investment: purchase value
      const totalInvestment = holdings.reduce((sum, h) => {
        const quantity = h.quantity || 0;
        const averagePrice = h.averagePrice || 0;
        return sum + (quantity * averagePrice);
      }, 0);
      
      // Average price: weighted average of purchase prices
      const averagePrice = totalQuantity > 0 ? totalInvestment / totalQuantity : 0;
      
      setSummary({
        totalHoldings,
        totalValue,
        totalQuantity,
        totalInvestment,
        averagePrice
      });
    } catch (error) {
      console.error('Error calculating summary:', error);
    }
  };

  const handleAddStock = async (stockData) => {
    try {
      console.log('Adding holding with data:', stockData); // Debug log
      
      // Ensure all required fields are properly mapped
      const holdingData = {
        symbol: stockData.symbol?.toUpperCase(),
        name: stockData.name,
        quantity: parseInt(stockData.quantity) || 0,
        averagePrice: parseFloat(stockData.averagePrice) || 0,
        lastPrice: parseFloat(stockData.averagePrice) || 0, // Set initial lastPrice to purchase price
        exchange: stockData.exchange || 'NSE',
        symbolToken: stockData.symbolToken,
        addedDate: stockData.addedDate,
        amountInvested: (parseInt(stockData.quantity) || 0) * (parseFloat(stockData.averagePrice) || 0),
        currentAmount: (parseInt(stockData.quantity) || 0) * (parseFloat(stockData.averagePrice) || 0)
      };
      
      // Average price should be the purchase price entered by user
      // We don't auto-fill it with current market price
      
      console.log('Processed holding data:', holdingData); // Debug log
      const newHolding = await holdingsService.addHolding(holdingData);
      console.log('New holding received:', newHolding); // Debug log
      
      if (newHolding) {
        setHoldings(prev => {
          const updatedHoldings = [...prev, newHolding];
          console.log('Updated holdings:', updatedHoldings); // Debug log
          return updatedHoldings;
        });
        
        // Handle import queue if we're importing
        if (isImporting) {
          handleImportNext();
        } else {
          setShowAddDialog(false);
        }
        
        // Show success notification
        setNotification({
          type: 'success',
          message: `Stock ${newHolding.symbol} added successfully!`,
          duration: 3000
        });
      } else {
        console.error('No holding returned from service');
      }
    } catch (error) {
      console.error('Error adding holding:', error);
      
      // Show error notification
      setNotification({
        type: 'error',
        message: `Failed to add stock. ${error.message || 'Please try again.'}`,
        duration: 5000
      });
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
      setNotification({
        type: 'success',
        message: `Import complete! Added ${importQueue.length} holdings.`,
        duration: 5000
      });
    }
  };

  // Handle import cancel
  const handleImportCancel = () => {
    setIsImporting(false);
    setImportQueue([]);
    setCurrentImportIndex(0);
    setShowAddDialog(false);
  };

  // Handle add all remaining holdings
  const handleAddAllRemaining = async () => {
    if (importQueue.length === 0) return;
    
    console.log('🔄 Import: Adding all remaining holdings:', importQueue.slice(currentImportIndex));
    
    try {
      // Add all remaining holdings from current index
      for (let i = currentImportIndex; i < importQueue.length; i++) {
        const holdingData = importQueue[i];
        console.log(`🔄 Import: Adding holding ${i + 1}/${importQueue.length}:`, holdingData);
        
        // Process the holding data
        const processedHoldingData = {
          symbol: holdingData.symbol?.toUpperCase(),
          name: holdingData.name,
          quantity: parseInt(holdingData.quantity) || 0,
          averagePrice: parseFloat(holdingData.averagePrice) || 0,
          lastPrice: parseFloat(holdingData.averagePrice) || 0,
          exchange: holdingData.exchange || 'NSE',
          symbolToken: holdingData.symbolToken,
          addedDate: holdingData.addedDate,
          amountInvested: (parseInt(holdingData.quantity) || 0) * (parseFloat(holdingData.averagePrice) || 0),
          currentAmount: (parseInt(holdingData.quantity) || 0) * (parseFloat(holdingData.averagePrice) || 0)
        };
        
        const newHolding = await holdingsService.addHolding(processedHoldingData);
        
        if (newHolding) {
          setHoldings(prev => [...prev, newHolding]);
          console.log(`✅ Import: Added holding ${i + 1}/${importQueue.length}: ${holdingData.symbol}`);
        } else {
          console.error(`❌ Import: Failed to add holding ${i + 1}/${importQueue.length}: ${holdingData.symbol}`);
        }
      }
      
      // Import complete
      setIsImporting(false);
      setImportQueue([]);
      setCurrentImportIndex(0);
      setShowAddDialog(false);
      setNotification({
        type: 'success',
        message: `Import complete! Added ${importQueue.length - currentImportIndex} holdings.`,
        duration: 5000
      });
    } catch (error) {
      console.error('❌ Import: Error adding all remaining holdings:', error);
      setNotification({
        type: 'error',
        message: `Error adding holdings: ${error.message || 'Unknown error'}`,
        duration: 5000
      });
    }
  };

  const handleEditStock = async (stockData) => {
    if (!editingStock) return;
    
    console.log('🔄 Holdings: handleEditStock called with:', { stockData, editingStock });
    setIsEditing(true);
    
    try {
      console.log('🔄 Holdings: Starting stock update process...');
      
      // Validate required fields
      if (!stockData.symbol || !stockData.quantity || !stockData.averagePrice) {
        console.error('❌ Holdings: Missing required fields for update');
        alert('Please fill in all required fields (Symbol, Quantity, Purchase Price)');
        return;
      }
      
      // Create updated holding data
      const updatedHolding = {
        ...editingStock,
        symbol: stockData.symbol?.toUpperCase().trim(),
        name: stockData.name?.trim() || stockData.symbol?.toUpperCase().trim(),
        quantity: Math.max(0, parseInt(stockData.quantity) || 0),
        averagePrice: Math.max(0, parseFloat(stockData.averagePrice) || 0),
        lastPrice: parseFloat(stockData.lastPrice || stockData.averagePrice) || 0,
        exchange: stockData.exchange || 'NSE',
        symbolToken: stockData.symbolToken?.trim() || '',
        addedDate: stockData.addedDate || new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };
      
      // Calculate amounts
      updatedHolding.amountInvested = updatedHolding.quantity * updatedHolding.averagePrice;
      updatedHolding.currentAmount = updatedHolding.quantity * updatedHolding.lastPrice;
      
      console.log('🔄 Holdings: Updated holding data:', updatedHolding);
      
      // Update via backend only (no local fallback)
      console.log('🔄 Holdings: Attempting backend update...');
      await holdingsService.updateHolding(
        editingStock.symbol,
        editingStock.exchange || 'NSE',
        updatedHolding
      );
      console.log('✅ Holdings: Backend update successful');

      // After backend success, refresh holdings from server to ensure persistence
      await loadHoldings();

      // Close dialog and show success
      setEditingStock(null);
      setShowAddDialog(false);

      setNotification({
        type: 'success',
        message: `Stock ${updatedHolding.symbol} updated successfully!`,
        duration: 3000
      });
      
    } catch (error) {
      console.error('❌ Holdings: Error in handleEditStock:', error);
      setNotification({
        type: 'error',
        message: `Failed to update stock: ${error.message}`,
        duration: 5000
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleRemoveHolding = async (holding) => {
    try {
      // Use symbol instead of holdingId for deletion
      const success = await holdingsService.removeHolding(holding.symbol);
      if (success) {
        setHoldings(prev => prev.filter(h => h.symbol !== holding.symbol));
        
        // Show success notification
        setNotification({
          type: 'success',
          message: `Stock ${holding.symbol} removed successfully!`,
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error removing holding:', error);
      
      // Show error notification
      setNotification({
        type: 'error',
        message: `Failed to remove stock ${holding.symbol}. Please try again.`,
        duration: 5000
      });
    }
  };

  const handleClearHoldings = async () => {
    if (!confirm('Are you sure you want to clear all holdings?')) return;
    
    try {
      const success = await holdingsService.clearHoldings();
      if (success) {
        setHoldings([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error clearing holdings:', error);
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert('No file selected. Please select a CSV file to import.');
      return;
    }
    
    // Validate file type
    const fileName = file.name || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    if (fileExtension && !['csv'].includes(fileExtension)) {
      alert('Invalid file type. Please select a valid CSV file.');
      // Reset the input
      event.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        const importedHoldings = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',');
            const symbol = values[0]?.trim();
            const exchange = values[1]?.trim() || 'NSE';
            
            if (symbol) {
              // Get company name from instruments data if not provided in CSV
              let name = values[1]?.trim();
              if (!name || name === exchange) {
                name = await getCompanyNameFromSymbol(symbol, exchange);
              }
              
              // Handle both old and new CSV formats
              if (headers.length >= 5 && headers[3]?.includes('Purchase Price')) {
                // New format with Amount Invested and Current Amount
                const quantity = parseInt(values[2]) || 0;
                const averagePrice = parseFloat(values[3]) || 0;
                const lastPrice = parseFloat(values[5]) || parseFloat(values[3]) || 0;
                
                if (quantity > 0) {
                  importedHoldings.push({
                    symbol: symbol,
                    name: name,
                    exchange: exchange, // Include exchange field
                    quantity: quantity,
                    averagePrice: averagePrice,
                    lastPrice: lastPrice,
                    addedDate: new Date().toISOString().split('T')[0],
                    amountInvested: quantity * averagePrice,
                    currentAmount: quantity * lastPrice
                  });
                }
              } else {
                // Old format (backward compatibility)
                const quantity = parseInt(values[2]) || 0;
                const averagePrice = parseFloat(values[3]) || 0;
                const lastPrice = parseFloat(values[3]) || 0;
                
                if (quantity > 0) {
                  importedHoldings.push({
                    symbol: symbol,
                    name: name,
                    exchange: exchange, // Include exchange field
                    quantity: quantity,
                    averagePrice: averagePrice,
                    lastPrice: lastPrice,
                    addedDate: values[4]?.trim() || new Date().toISOString().split('T')[0],
                    amountInvested: quantity * averagePrice,
                    currentAmount: quantity * lastPrice
                  });
                }
              }
            }
          }
        }
        
        if (importedHoldings.length > 0) {
          // Start import process with dialog
          setImportQueue(importedHoldings);
          setCurrentImportIndex(0);
          setIsImporting(true);
          setShowAddDialog(true);
        }
      } catch (error) {
        console.error('Error importing CSV:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (!Array.isArray(holdings) || holdings.length === 0) return;
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Symbol,Name,Quantity,Purchase Price,Amount Invested,Last Price,Current Amount,Change,Change %,P&L,P&L %\n" +
      holdings.map(holding => {
        const amountInvested = (() => {
          // Use database value if available, otherwise calculate
          if (holding.amountInvested !== undefined && holding.amountInvested !== null) {
            return parseFloat(holding.amountInvested) || 0;
          }
          return (holding.averagePrice || 0) * (holding.quantity || 0);
        })();
        const currentAmount = (() => {
          // Use database value if available, otherwise calculate
          if (holding.currentAmount !== undefined && holding.currentAmount !== null) {
            return parseFloat(holding.currentAmount) || 0;
          }
          return (holding.lastPrice || 0) * (holding.quantity || 0);
        })();
        const change = (holding.lastPrice || 0) - (holding.averagePrice || 0);
        const changePercentage = holding.averagePrice ? ((change / holding.averagePrice) * 100) : 0;
        const pnl = currentAmount - amountInvested;
        const pnlPercentage = amountInvested ? ((pnl / amountInvested) * 100) : 0;
        
        return `${holding.symbol},${holding.name},${holding.quantity},${holding.averagePrice || 0},${amountInvested.toFixed(2)},${holding.lastPrice || 0},${currentAmount.toFixed(2)},${change.toFixed(2)},${changePercentage.toFixed(2)}%,${pnl.toFixed(2)},${pnlPercentage.toFixed(2)}%`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "holdings.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-refresh function (no loading state)
  const handleAutoSync = useCallback(async () => {
    if (!Array.isArray(holdings) || holdings.length === 0) return;
    
    try {
      console.log('🔄 Auto-refresh: Starting price sync for holdings...');
      
      // Update prices and calculate P&L for all holdings
      const updatedHoldings = await smartApiService.updateHoldingsPrices(holdings);
      console.log('📊 Auto-refresh: Updated holdings data:', updatedHoldings);
      
      // Build a map of previous prices by symbol for flicker detection
      const previousBySymbol = {};
      holdings.forEach(h => { previousBySymbol[h.symbol] = h; });

      // Ensure amounts are recalculated after price updates
      const holdingsWithRecalculatedAmounts = updatedHoldings.map(holding => {
        const prev = previousBySymbol[holding.symbol];
        const priceChanged = prev ? Number(prev.lastPrice) !== Number(holding.lastPrice) : false;
        return {
          ...holding,
          amountInvested: (holding.quantity || 0) * (holding.averagePrice || 0),
          currentAmount: (holding.quantity || 0) * (holding.lastPrice || holding.averagePrice || 0),
          __flash: !!priceChanged
        };
      });
      
      console.log('💰 Auto-refresh: Holdings with recalculated amounts:', holdingsWithRecalculatedAmounts);
      setHoldings(holdingsWithRecalculatedAmounts);
      setLastRefreshTime(new Date().toLocaleTimeString());
      console.log('✅ Auto-refresh: Holdings state updated successfully');

      // Clear flicker flag after animation ends
      setTimeout(() => {
        setHoldings(prev => prev.map(h => ({ ...h, __flash: false })));
      }, 600);
    } catch (error) {
      console.error('❌ Auto-refresh: Error syncing prices:', error);
    }
  }, [holdings]);

  // Manual refresh function (with loading state)
  const handleSync = useCallback(async () => {
    if (!Array.isArray(holdings) || holdings.length === 0) return;
    
    try {
      console.log('🔄 Manual refresh: Starting price sync for holdings...');
      setLoading(true);
      
      // Update prices and calculate P&L for all holdings
      const updatedHoldings = await smartApiService.updateHoldingsPrices(holdings);
      console.log('📊 Manual refresh: Updated holdings data:', updatedHoldings);
      
      // Build a map of previous prices by symbol for flicker detection
      const previousBySymbol = {};
      holdings.forEach(h => { previousBySymbol[h.symbol] = h; });

      // Ensure amounts are recalculated after price updates
      const holdingsWithRecalculatedAmounts = updatedHoldings.map(holding => {
        const prev = previousBySymbol[holding.symbol];
        const priceChanged = prev ? Number(prev.lastPrice) !== Number(holding.lastPrice) : false;
        return {
          ...holding,
          amountInvested: (holding.quantity || 0) * (holding.averagePrice || 0),
          currentAmount: (holding.quantity || 0) * (holding.lastPrice || holding.averagePrice || 0),
          __flash: !!priceChanged
        };
      });
      
      console.log('💰 Manual refresh: Holdings with recalculated amounts:', holdingsWithRecalculatedAmounts);
      setHoldings(holdingsWithRecalculatedAmounts);
      setLastRefreshTime(new Date().toLocaleTimeString());
      console.log('✅ Manual refresh: Holdings state updated successfully');

      // Clear flicker flag after animation ends
      setTimeout(() => {
        setHoldings(prev => prev.map(h => ({ ...h, __flash: false })));
      }, 600);
    } catch (error) {
      console.error('❌ Manual refresh: Error syncing prices:', error);
    } finally {
      setLoading(false);
    }
  }, [holdings]);

  // Register with auto-refresh service when handleAutoSync changes
  useEffect(() => {
    if (Array.isArray(holdings) && holdings.length > 0 && handleAutoSync) {
      autoRefreshService.register('holdings', handleAutoSync);
    }
    
    // Cleanup on unmount or when handleAutoSync changes
    return () => {
      autoRefreshService.unregister('holdings');
    };
  }, [handleAutoSync, holdings]);

  const handleRecalculate = async () => {
    if (!Array.isArray(holdings) || holdings.length === 0) return;
    
    try {
      setLoading(true);
      // Use local recalculation function to ensure amounts are correct
      recalculateAmounts();
      console.log('✅ Amounts recalculated successfully');
    } catch (error) {
      console.error('Error recalculating holdings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHoldings = Array.isArray(holdings) ? holdings.filter(holding => {
    // Safety check: ensure holding has required properties
    if (!holding || typeof holding !== 'object') return false;
    
    const symbol = holding.symbol || '';
    const name = holding.name || '';
    
    return symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
           name.toLowerCase().includes(searchTerm.toLowerCase());
  }) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 overflow-y-auto">
      {/* Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 cursor-pointer hover:opacity-90 ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}
          onClick={() => setNotification(null)}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Holdings</h1>
        
        {/* Summary Cards */}
        {summary && Array.isArray(holdings) && holdings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {/* Total Holdings Card */}
            <div className="relative bg-[#FFD682] rounded-3xl shadow-lg overflow-hidden">
              {/* Cut-out corner with icon */}
              <div className="absolute top-0 right-0 w-12 h-12 bg-white rounded-bl-full flex items-start justify-end p-1.5">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-black" />
                </div>
              </div>
              
              <div className="p-4 text-black">
                <p className="text-sm font-medium mb-1">Total Holdings</p>
                <p className="text-xl font-bold mb-1">{summary.totalHoldings}</p>
                <p className="text-xs text-gray-600 mb-2">Last month: {Math.max(0, summary.totalHoldings - 2)}</p>
                
                {/* Percentage change pill */}
                <div className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  +{summary.totalHoldings > 0 ? '15' : '0'}%
                </div>
              </div>
            </div>

            {/* Total Value Card */}
            <div className="relative bg-[#cb102d] rounded-3xl shadow-lg overflow-hidden">
              {/* Cut-out corner with icon */}
              <div className="absolute top-0 right-0 w-12 h-12 bg-white rounded-bl-full flex items-start justify-end p-1.5">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-black" />
                </div>
              </div>
              
              <div className="p-4 text-white">
                <p className="text-sm font-medium mb-1">Total Value</p>
                <p className="text-xl font-bold mb-1">₹{summary.totalValue?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-300 mb-2">Last month: ₹{(summary.totalValue * 0.95)?.toFixed(2) || '0.00'}</p>
                
                {/* Percentage change pill */}
                <div className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  +{summary.totalValue > 0 ? '20' : '0'}%
                </div>
              </div>
            </div>

            {/* Total Invested Card */}
            <div className="relative bg-[#cb102d] rounded-3xl shadow-lg overflow-hidden">
              {/* Cut-out corner with icon */}
              <div className="absolute top-0 right-0 w-12 h-12 bg-white rounded-bl-full flex items-start justify-end p-1.5">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-black" />
                </div>
              </div>
              
              <div className="p-4 text-white">
                <p className="text-sm font-medium mb-1">Total Invested</p>
                <p className="text-xl font-bold mb-1">₹{summary.totalInvestment?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-300 mb-2">Last month: ₹{(summary.totalInvestment * 0.95)?.toFixed(2) || '0.00'}</p>
                
                {/* Percentage change pill */}
                <div className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  +{summary.totalInvestment > 0 ? '10' : '0'}%
                </div>
              </div>
            </div>

            {/* Total P&L Card */}
            <div className="relative bg-[#cb102d] rounded-3xl shadow-lg overflow-hidden">
              {/* Cut-out corner with icon */}
              <div className="absolute top-0 right-0 w-12 h-12 bg-white rounded-bl-full flex items-start justify-end p-1.5">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-black" />
                </div>
              </div>
              
              <div className="p-4 text-white">
                <p className="text-sm font-medium mb-1">Total P&L</p>
                <p className="text-xl font-bold mb-1">₹{(summary.totalValue - summary.totalInvestment)?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-300 mb-2">Last month: ₹{((summary.totalValue - summary.totalInvestment) * 0.9)?.toFixed(2) || '0.00'}</p>
                
                {/* Percentage change pill */}
                <div className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  +{((summary.totalValue - summary.totalInvestment) > 0 ? '42' : '0')}%
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Search and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search holdings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
          <button
              onClick={() => setShowAddDialog(true)}
              disabled={isEditing}
              className={`flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
                isEditing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
              <Plus className="w-4 h-4" />
              <span>Add Holding</span>
          </button>


            <div className="flex items-center space-x-2">
              <button
                onClick={handleSync}
                disabled={!Array.isArray(holdings) || holdings.length === 0 || isEditing}
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
              onClick={handleRecalculate}
              disabled={!Array.isArray(holdings) || holdings.length === 0 || isEditing}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recalculate Amounts</span>
            </button>
            
            <button
              onClick={handleExport}
              disabled={!Array.isArray(holdings) || holdings.length === 0 || isEditing}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            
            <button
              onClick={generateHoldingsTemplate}
              disabled={isEditing}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Demo CSV</span>
            </button>
            
            <label className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
              isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}>
              <Upload className="w-4 h-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                disabled={isEditing}
                className="hidden"
              />
            </label>
            

            
            <button
              onClick={handleClearHoldings}
              disabled={!Array.isArray(holdings) || holdings.length === 0 || isEditing}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">
            Portfolio Holdings ({filteredHoldings.length} stocks)
          </h2>
        </div>
        
        {!Array.isArray(holdings) || filteredHoldings.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-lg">
              {!Array.isArray(holdings) ? 'Error loading holdings' : 'No holdings found'}
            </p>
            <p className="text-sm">
              {!Array.isArray(holdings) ? 'Please refresh the page' : 'Add some holdings to get started'}
            </p>
          </div>
        ) : (
        <div>
            <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Purchase Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Amount Invested</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">LTP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Current Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Change</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">P&L</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHoldings.map((holding, index) => (
                  <tr key={holding.id || `holding-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{holding.symbol}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{holding.name}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{holding.quantity}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{holding.averagePrice || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{(() => {
                        // Use database value if available, otherwise calculate
                        if (holding.amountInvested !== undefined && holding.amountInvested !== null) {
                          const amount = parseFloat(holding.amountInvested) || 0;
                          return amount.toFixed(2);
                        }
                        const amount = (holding.averagePrice || 0) * (holding.quantity || 0);
                        return amount.toFixed(2);
                      })()}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`text-sm text-gray-900 ${holding.__flash ? 'price-flash' : ''}`}>₹{holding.lastPrice || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{(() => {
                        // Use database value if available, otherwise calculate
                        if (holding.currentAmount !== undefined && holding.currentAmount !== null) {
                          const amount = parseFloat(holding.currentAmount) || 0;
                          return amount.toFixed(2);
                        }
                        const amount = (holding.lastPrice || 0) * (holding.quantity || 0);
                        return amount.toFixed(2);
                      })()}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                      {holding.change !== undefined ? (
                        <div className={`text-sm ${holding.change >= 0 ? 'text-green-600' : 'text-red-600'} ${holding.__flash ? 'price-flash' : ''}`}>
                          {holding.change >= 0 ? '+' : ''}₹{Number(holding.change).toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">N/A</div>
                      )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                      {holding.pnl !== undefined && holding.pnlPercentage !== undefined ? (
                        <div className={`text-sm ${holding.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {holding.pnl >= 0 ? '+' : ''}₹{holding.pnl} ({holding.pnlPercentage >= 0 ? '+' : ''}{holding.pnlPercentage}%)
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">N/A</div>
                      )}
                  </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingStock(holding);
                            setShowAddDialog(true);
                          }}
                          disabled={isEditing}
                          className={`edit-button text-indigo-600 hover:text-indigo-900 transition-colors duration-200 p-1 rounded hover:bg-indigo-50 ${
                            isEditing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={`Edit ${holding.symbol} - ${holding.name}`}
                        >
                          {isEditing ? (
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Edit className="w-4 h-4" />
                          )}
                        </button>
                    <button
                          onClick={() => handleRemoveHolding(holding)}
                          disabled={isEditing}
                          className={`text-red-600 hover:text-red-900 transition-colors duration-200 p-1 rounded hover:bg-red-50 ${
                            isEditing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={`Delete ${holding.symbol} - ${holding.name}`}
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
          editData={editingStock ? editingStock : (isImporting && importQueue[currentImportIndex] ? {
            ...importQueue[currentImportIndex],
            addedDate: importQueue[currentImportIndex].addedDate || new Date().toISOString().split('T')[0]
          } : null)}
          type="holdings"
          isImporting={isImporting}
          importProgress={isImporting ? {
            current: currentImportIndex + 1,
            total: importQueue.length,
            onSkip: handleImportNext,
            onAddAll: handleAddAllRemaining
          } : null}
        />
      )}
    </div>
  );
};

export default Holdings;

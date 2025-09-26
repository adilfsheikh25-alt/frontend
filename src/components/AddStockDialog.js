import React, { useState, useEffect } from 'react';
import { X, Plus, TrendingUp, AlertCircle, CheckCircle, Search, Package, Edit } from 'lucide-react';
import instrumentsService from '../services/instrumentsService';

const AddStockDialog = ({ isOpen, onClose, onAddStock, type = 'watchlist', editData = null, isImporting = false, importProgress = null }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '', // Add name field
    exchange: 'NSE',
    symbolToken: '',
    quantity: '',
    averagePrice: '',
    priceAddedAt: '',
    addedDate: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [instruments, setInstruments] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);

  const exchanges = [
    { value: 'NSE', label: 'NSE', color: 'bg-green-100 text-green-800' },
    { value: 'BSE', label: 'BSE', color: 'bg-blue-100 text-blue-800' },
    { value: 'MCX', label: 'MCX', color: 'bg-purple-100 text-purple-800' },
    { value: 'NFO', label: 'NFO', color: 'bg-orange-100 text-orange-800' },
    { value: 'CDS', label: 'CDS', color: 'bg-red-100 text-red-800' },
    { value: 'NCDEX', label: 'NCDEX', color: 'bg-indigo-100 text-indigo-800' }
  ];

  // Function to clean up special characters and encoding issues
  const cleanStockName = (name) => {
    if (!name) return '';
    
    // Remove or replace common encoding issues
    return name
      .replace(/�/g, '') // Remove replacement character
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Initialize form data when editing
  useEffect(() => {
    console.log('🔄 Dialog: useEffect triggered with editData:', editData);
    if (editData) {
      console.log('🔄 Dialog: Initializing form for editing:', editData);
      setFormData({
        symbol: editData.symbol || '',
        name: editData.name || editData.symbol || '', // Use name if available, fallback to symbol
        exchange: editData.exchange || '',
        symbolToken: editData.symbolToken || '',
        quantity: editData.quantity?.toString() || '',
        averagePrice: editData.averagePrice?.toString() || '',
        priceAddedAt: editData.priceAddedAt || '',
        addedDate: editData.addedDate || new Date().toISOString().split('T')[0]
      });
      setSearchTerm(editData.symbol || '');
      setError(''); // Clear any previous errors
    } else {
      // Set default values for new items
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      setFormData({
        symbol: '',
        name: '',
        exchange: '',
        symbolToken: '',
        quantity: '',
        averagePrice: '',
        priceAddedAt: '',
        addedDate: currentDate
      });
      setSearchTerm('');
      setError(''); // Clear any previous errors
    }
  }, [editData, type]);

  // Load instruments data on component mount
  useEffect(() => {
    const loadInstruments = async () => {
      try {
        console.log('Loading instruments data...');
        const response = await fetch('/instruments.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Instruments loaded:', data.length, 'stocks');
        console.log('Sample instrument:', data[0]);
        setInstruments(data);
      } catch (error) {
        console.error('Error loading instruments:', error);
        setError('Failed to load stock database. Please refresh the page.');
      }
    };
    loadInstruments();
  }, []);

  // Search stocks based on symbol, name, or token (respects selected exchange)
  const searchStocks = async (query) => {
    console.log('Searching for:', query);
    
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const results = await instrumentsService.searchInstruments(query, 10);
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (e) {
      console.error('Local search error:', e);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Handle stock selection
  const handleStockSelect = async (selectedStock) => {
    const symbol = (selectedStock.symbol || selectedStock['symbol '] || '').trim() || '';
    const name = cleanStockName((selectedStock.name || selectedStock['name '] || '').trim()) || symbol;
    const symbolToken = (selectedStock.token || selectedStock['token '])?.toString() || '';
    const exchange = selectedStock.exch_seg || formData.exchange || 'NSE';
    
    console.log('🔄 Dialog: Stock selected:', { symbol, name, exchange, symbolToken });
    
    setFormData(prevData => ({
      ...prevData,
      symbol: symbol,
      name: name,
      symbolToken: symbolToken,
      exchange: exchange // Update exchange from selected stock
    }));
    setSearchTerm(symbol);
    setShowSearchResults(false);
    setError('');
    
    // For holdings, we don't auto-fill average price - user should enter their purchase price
    // The average price should be the price at which they bought the share
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFormData({ ...formData, symbol: value });
    
    if (searchTimer) clearTimeout(searchTimer);
    if (value.length >= 2) {
      const t = setTimeout(() => searchStocks(value), 300);
      setSearchTimer(t);
    } else {
      setShowSearchResults(false);
      setFormData({ ...formData, symbol: value, symbolToken: '' });
    }
  };

  // Handle manual symbol entry (when user types without selecting from dropdown)
  const handleSymbolBlur = () => {
    if (formData.symbol && !formData.name) {
      // If user entered a symbol but no name, use the symbol as name
      setFormData(prev => ({
        ...prev,
        name: formData.symbol
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Add confirmation for edit mode
    if (editData) {
      const confirmed = window.confirm(
        `Are you sure you want to update ${editData.symbol}? This will modify your existing holding.`
      );
      if (!confirmed) {
        return;
      }
    }

    console.log('🔄 Dialog: Form submitted with data:', formData);
    console.log('🔄 Dialog: Form type:', type);
    console.log('🔄 Dialog: Edit mode:', !!editData);

    // Enhanced validation for both add and edit modes
    if (!formData.symbol || !formData.exchange) {
      setError('Please select a valid stock and exchange');
      return;
    }

    if (!formData.name || !formData.name.trim()) {
      setError('Please enter the company name');
      return;
    }

    if (type === 'holdings') {
      if (!formData.quantity || !formData.averagePrice) {
        setError('Please fill in quantity and average price (purchase price) for holdings');
        return;
      }
      
      // Additional validation for holdings
      const quantity = parseFloat(formData.quantity);
      const averagePrice = parseFloat(formData.averagePrice);
      
      if (isNaN(quantity) || quantity <= 0) {
        setError('Quantity must be a positive number');
        return;
      }
      
      if (isNaN(averagePrice) || averagePrice <= 0) {
        setError('Purchase price must be a positive number');
        return;
      }
    }

    if (type === 'watchlist' && !formData.priceAddedAt) {
      setError('Please fill in the price added at for watchlist items');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔄 Dialog: Calling onAddStock with:', formData);
      await onAddStock(formData);
      
      // Show success message for edit mode
      if (editData) {
        console.log('✅ Dialog: Stock updated successfully');
      } else {
        console.log('✅ Dialog: Stock added successfully');
      }
      
      handleClose();
    } catch (error) {
      console.error('❌ Dialog: Error in handleSubmit:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to process stock. ';
      if (error.message.includes('network')) {
        errorMessage += 'Please check your internet connection.';
      } else if (error.message.includes('400')) {
        errorMessage += 'Invalid data provided.';
      } else if (error.message.includes('404')) {
        errorMessage += 'Stock not found.';
      } else if (error.message.includes('500')) {
        errorMessage += 'Server error. Please try again later.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      symbol: '',
      name: '', // Reset name
      exchange: 'NSE',
      symbolToken: '',
      quantity: '',
      averagePrice: '',
      priceAddedAt: '',
      addedDate: ''
    });
    setSearchTerm('');
    setError('');
    setSearchResults([]);
    setShowSearchResults(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
                 {/* Header */}
         <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {editData ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {isImporting 
                    ? `Importing Stock ${importProgress?.current || 1} of ${importProgress?.total || 1}`
                    : editData 
                      ? 'Edit' 
                      : 'Add to'
                  } {type === 'holdings' ? 'Holdings' : 'Watchlist'}
                  {editData && <span className="ml-2 text-indigo-200">({editData.symbol})</span>}
                </h2>
                <p className="text-indigo-100 text-sm">
                  {isImporting
                    ? `Review and add stock ${importProgress?.current || 1} from your import file`
                    : editData 
                      ? `Update ${type === 'holdings' ? 'holding' : 'watchlist'} details`
                      : type === 'holdings' 
                        ? 'Add a new stock to your portfolio holdings' 
                        : 'Add a new stock to your watchlist'
                  }
                </p>
                {isImporting && importProgress && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-indigo-200 mb-1">
                      <span>Progress</span>
                      <span>{importProgress.current} / {importProgress.total}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

                 {/* Form */}
         <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Stock Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Stock <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by symbol, token, or name (API)"
                value={searchTerm}
                onChange={handleSearchChange}
                onBlur={handleSymbolBlur}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {searchResults.map((stock, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleStockSelect(stock)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {(stock.symbol || stock['symbol '] || '').trim()}
                            </span>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {stock.exch_seg || formData.exchange}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {cleanStockName(((stock.name || stock['name '] || '')).trim())}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400">Token: {(stock.token || stock['token '])}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Start typing to search for stocks</p>
          </div>

          {/* Manual Name Input (for custom entries) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter company name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
            <p className="text-xs text-gray-500 mt-1">Enter the company name manually if not found in search</p>
          </div>

          {/* Exchange Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Exchange <span className="text-red-500">*</span>
            </label>
                         <select
               value={formData.exchange}
               onChange={(e) => setFormData({...formData, exchange: e.target.value})}
               className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
             >
              <option value="">Select Exchange</option>
              {exchanges.map((exchange) => (
                <option key={exchange.value} value={exchange.value}>
                  {exchange.label}
                </option>
              ))}
            </select>
          </div>

                     {/* Holdings-specific fields */}
           {type === 'holdings' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Quantity <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="number"
                   placeholder="100"
                   value={formData.quantity}
                   onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                   className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Purchase Price <span className="text-red-500">*</span>
                 </label>
                                    <input
                     type="number"
                     step="0.01"
                     placeholder="2450.50"
                     value={formData.averagePrice}
                     onChange={(e) => setFormData({...formData, averagePrice: e.target.value})}
                     className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                   />
                   <p className="text-xs text-gray-500 mt-1">Enter the price at which you bought this stock</p>
               </div>
               
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Added Date
                 </label>
                 <input
                   type="date"
                   value={formData.addedDate}
                   onChange={(e) => setFormData({...formData, addedDate: e.target.value})}
                   className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                 />
               </div>
             </div>
           )}

                     {/* Watchlist-specific fields */}
           {type === 'watchlist' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Price Added At <span className="text-red-500">*</span>
                 </label>
                                   <input
                    type="text"
                    placeholder="e.g., 2450.50"
                    value={formData.priceAddedAt}
                    onChange={(e) => setFormData({...formData, priceAddedAt: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
               </div>
               
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Added Date
                 </label>
                                   <input
                    type="date"
                    value={formData.addedDate}
                    onChange={(e) => setFormData({...formData, addedDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
               </div>
             </div>
           )}

          {/* Selected Stock Info */}
          {formData.symbol && formData.symbolToken && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <h4 className="font-medium text-green-900">Selected Stock</h4>
                    <p className="text-sm text-green-700">
                      {formData.symbol} ({formData.exchange}) - Token: {formData.symbolToken}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Mode Summary */}
          {editData && formData.symbol && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <Edit className="h-5 w-5 text-blue-500" />
                <div>
                  <h4 className="font-medium text-blue-900">Update Summary</h4>
                  <div className="text-sm text-blue-700 space-y-1 mt-1">
                    {editData.quantity !== parseFloat(formData.quantity) && (
                      <p>Quantity: {editData.quantity} → {formData.quantity}</p>
                    )}
                    {editData.averagePrice !== parseFloat(formData.averagePrice) && (
                      <p>Purchase Price: ₹{editData.averagePrice} → ₹{formData.averagePrice}</p>
                    )}
                    {editData.name !== formData.name && (
                      <p>Name: {editData.name} → {formData.name}</p>
                    )}
                    {editData.exchange !== formData.exchange && (
                      <p>Exchange: {editData.exchange} → {formData.exchange}</p>
                    )}
                    {editData.symbolToken !== formData.symbolToken && (
                      <p>Symbol Token: {editData.symbolToken} → {formData.symbolToken}</p>
                    )}
                    {editData.addedDate !== formData.addedDate && (
                      <p>Added Date: {editData.addedDate} → {formData.addedDate}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                <span className="text-sm text-red-700 font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {isImporting && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    // Add all remaining stocks without dialog
                    if (importProgress?.onAddAll) {
                      importProgress.onAddAll();
                    }
                  }}
                  className="px-6 py-3 text-green-700 bg-green-100 rounded-xl hover:bg-green-200 transition-colors font-medium"
                >
                  Add All Remaining
                </button>
                <button
                  type="button"
                  onClick={() => importProgress?.onSkip && importProgress.onSkip()}
                  className="px-6 py-3 text-orange-700 bg-orange-100 rounded-xl hover:bg-orange-200 transition-colors font-medium"
                >
                  Skip
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              {isImporting ? 'Cancel Import' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.symbol || !formData.name || !formData.exchange || (type === 'holdings' && (!formData.quantity || !formData.averagePrice)) || (type === 'watchlist' && !formData.priceAddedAt)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{editData ? 'Updating...' : 'Adding...'}</span>
                </>
              ) : (
                <>
                  {editData ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editData ? 'Update Stock' : 'Add Stock'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockDialog;

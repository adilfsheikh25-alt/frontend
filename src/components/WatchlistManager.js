import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Eye, Download, Upload, FileSpreadsheet } from 'lucide-react';

const WatchlistManager = ({ watchlists, activeWatchlist, onWatchlistChange, onWatchlistCreate, onWatchlistDelete, onWatchlistRename, onExport, onImport }) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [editingWatchlist, setEditingWatchlist] = useState(null);
  const [error, setError] = useState('');

  const handleCreateWatchlist = () => {
    if (!newWatchlistName.trim()) {
      setError('Please enter a watchlist name');
      return;
    }
    
    const exists = watchlists.find(w => w.name.toLowerCase() === newWatchlistName.toLowerCase());
    if (exists) {
      setError('Watchlist with this name already exists');
      return;
    }

    onWatchlistCreate(newWatchlistName.trim());
    setNewWatchlistName('');
    setShowCreateDialog(false);
    setError('');
  };

  const handleRenameWatchlist = () => {
    if (!newWatchlistName.trim()) {
      setError('Please enter a watchlist name');
      return;
    }
    
    const exists = watchlists.find(w => w.name.toLowerCase() === newWatchlistName.toLowerCase() && w.id !== editingWatchlist.id);
    if (exists) {
      setError('Watchlist with this name already exists');
      return;
    }

    onWatchlistRename(editingWatchlist.id, newWatchlistName.trim());
    setNewWatchlistName('');
    setShowRenameDialog(false);
    setEditingWatchlist(null);
    setError('');
  };

  const handleDeleteWatchlist = (watchlist) => {
    if (window.confirm(`Are you sure you want to delete "${watchlist.name}"? This action cannot be undone.`)) {
      onWatchlistDelete(watchlist.id);
    }
  };

  const handleExport = (watchlist) => {
    onExport(watchlist);
  };

  const handleImport = (event) => {
    console.log('🔄 WatchlistManager: handleImport event:', event);
    console.log('🔄 WatchlistManager: event.target:', event.target);
    console.log('🔄 WatchlistManager: event.target.files:', event.target.files);
    
    const file = event.target.files[0];
    console.log('🔄 WatchlistManager: extracted file:', file);
    console.log('🔄 WatchlistManager: file type:', typeof file);
    console.log('🔄 WatchlistManager: file instanceof File:', file instanceof File);
    
    if (file) {
      // Validate file type before passing to parent
      const fileName = file.name || '';
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      if (fileExtension && !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
        alert('Invalid file type. Please select a valid CSV or Excel file.');
        // Reset the input
        event.target.value = '';
        return;
      }
      
      console.log('🔄 WatchlistManager: calling onImport with file');
      onImport(file);
      
      // Reset the input so the same file can be selected again
      event.target.value = '';
    } else {
      console.log('❌ WatchlistManager: No file selected');
      alert('No file selected. Please select a file to import.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Watchlist Manager</h2>
          <p className="text-gray-600 mt-1">Manage your multiple watchlists</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#43b18a] text-white rounded-lg hover:bg-[#3a9f7a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Watchlist</span>
        </button>
      </div>

      {/* Watchlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {watchlists.map((watchlist) => (
          <div
            key={watchlist.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all duration-200 ${
              activeWatchlist?.id === watchlist.id
                ? 'border-[#43b18a] bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {watchlist.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {watchlist.stocks?.length || 0} stocks
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onWatchlistChange(watchlist)}
                  className={`p-2 rounded-lg transition-colors ${
                    activeWatchlist?.id === watchlist.id
                      ? 'bg-[#43b18a] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Switch to this watchlist"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingWatchlist(watchlist);
                    setNewWatchlistName(watchlist.name);
                    setShowRenameDialog(true);
                  }}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  title="Rename watchlist"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteWatchlist(watchlist)}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  title="Delete watchlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => handleExport(watchlist)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              <label className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Import</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Create Watchlist Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Watchlist</h3>
              <input
                type="text"
                placeholder="Enter watchlist name"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#43b18a] focus:border-transparent"
                autoFocus
              />
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewWatchlistName('');
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWatchlist}
                  className="px-4 py-2 bg-[#43b18a] text-white rounded-lg hover:bg-[#3a9f7a] transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Watchlist Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rename Watchlist</h3>
              <input
                type="text"
                placeholder="Enter new name"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#43b18a] focus:border-transparent"
                autoFocus
              />
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRenameDialog(false);
                    setNewWatchlistName('');
                    setEditingWatchlist(null);
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameWatchlist}
                  className="px-4 py-2 bg-[#43b18a] text-white rounded-lg hover:bg-[#3a9f7a] transition-colors"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchlistManager;











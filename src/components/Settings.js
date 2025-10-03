import React, { useState, useEffect } from 'react';
import { 
  Eye, EyeOff, Copy, Check, RefreshCw, Shield, 
  Database, Key, Settings as SettingsIcon, Trash2,
  AlertTriangle, CheckCircle, Clock, Globe, Play, Pause
} from 'lucide-react';
import loginService from '../services/loginService';
import smartApiService from '../services/smartApiService';
import autoRefreshService from '../services/autoRefreshService';
import { watchlistService } from '../services/watchlistService';
import { holdingsService } from '../services/holdingsService';

const Settings = () => {
  const [credentials, setCredentials] = useState({
    apiKey: '',
    clientId: '',
    secretKey: '',
    accessToken: '',
    refreshToken: ''
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [apiStatus, setApiStatus] = useState({
    isConnected: false,
    lastSync: null,
    status: 'Unknown'
  });
  const [loading, setLoading] = useState(false);
  const [autoRefreshSettings, setAutoRefreshSettings] = useState({
    enabled: false,
    interval: 10
  });
  const [clearingData, setClearingData] = useState(false);
  const [clearDataMessage, setClearDataMessage] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadCredentials();
    checkApiStatus();
    loadAutoRefreshSettings();
    
    // Reset resolution to 100% and remove any scaling classes
    const root = document.getElementById('root');
    if (root) {
      root.classList.remove('resolution-90', 'resolution-100');
    }
    // Clear resolution setting from localStorage
    localStorage.removeItem('appResolution');
  }, []);

  const loadCredentials = async () => {
    try {
      const storedCredentials = loginService.getApiCredentials();
      if (storedCredentials) {
        setCredentials({
          apiKey: storedCredentials.apiKey || '',
          clientId: storedCredentials.clientId || '',
          secretKey: storedCredentials.secretKey || '',
          accessToken: storedCredentials.accessToken || '',
          refreshToken: storedCredentials.refreshToken || ''
        });
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const checkApiStatus = async () => {
    try {
      setLoading(true);
      const status = await smartApiService.getApiStatus();
      setApiStatus({
        isConnected: status.isConnected || false,
        lastSync: status.lastSync || null,
        status: status.status || 'Unknown'
      });
    } catch (error) {
      console.error('Error checking API status:', error);
    setApiStatus({
        isConnected: false,
        lastSync: null,
        status: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAutoRefreshSettings = () => {
    const settings = autoRefreshService.getSettings();
    setAutoRefreshSettings(settings);
  };

  const handleAutoRefreshToggle = () => {
    const newEnabled = autoRefreshService.toggle();
    setAutoRefreshSettings(prev => ({ ...prev, enabled: newEnabled }));
  };

  const handleIntervalChange = (newInterval) => {
    autoRefreshService.updateSettings({ interval: newInterval });
    setAutoRefreshSettings(prev => ({ ...prev, interval: newInterval }));
  };

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const clearCredentials = async () => {
    if (window.confirm('Are you sure you want to clear all API credentials? This will log you out.')) {
      try {
        loginService.clearApiCredentials();
        setCredentials({
          apiKey: '',
          clientId: '',
          secretKey: '',
          accessToken: '',
          refreshToken: ''
        });
        setApiStatus({
          isConnected: false,
          lastSync: null,
          status: 'Cleared'
        });
      } catch (error) {
        console.error('Error clearing credentials:', error);
      }
    }
  };

  const refreshTokens = async () => {
    try {
      setLoading(true);
      await smartApiService.refreshAccessToken();
      await loadCredentials();
      await checkApiStatus();
    } catch (error) {
      console.error('Error refreshing tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    const confirmMessage = `Are you sure you want to clear ALL data from the web app?\n\nThis will delete:\n• All watchlists and stocks\n• All holdings\n• All portfolio data\n\nThis action cannot be undone!`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setClearingData(true);
        setClearDataMessage('Clearing data...');
        
        // Clear holdings
        await holdingsService.clearHoldings();
        setClearDataMessage('Holdings cleared. Clearing watchlists...');
        
        // Clear watchlists
        await watchlistService.clearAllWatchlists();
        setClearDataMessage('All data cleared successfully!');
        
        // Clear any cached data
        localStorage.removeItem('portfolioMetrics');
        localStorage.removeItem('dashboardData');
        localStorage.removeItem('holdings');
        localStorage.removeItem('watchlists');
        
        setTimeout(() => {
          setClearDataMessage('');
          setClearingData(false);
          // Optionally reload the page to refresh the dashboard
          window.location.reload();
        }, 2000);
        
      } catch (error) {
        console.error('Error clearing data:', error);
        setClearDataMessage('Error clearing data. Please try again.');
        setTimeout(() => {
          setClearDataMessage('');
          setClearingData(false);
        }, 3000);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Connected':
      case 'Active':
        return 'text-green-600 bg-green-100';
      case 'Error':
      case 'Failed':
        return 'text-red-600 bg-red-100';
      case 'Unknown':
      case 'Checking':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Connected':
      case 'Active':
        return <CheckCircle className="w-4 h-4" />;
      case 'Error':
      case 'Failed':
        return <AlertTriangle className="w-4 h-4" />;
      case 'Unknown':
      case 'Checking':
        return <Clock className="w-4 h-4" />;
      default:
        return <SettingsIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your API credentials and application settings
        </p>
        
        {/* Settings Tabs */}
        <div className="mt-6 flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            General Settings
          </button>
        </div>
      </div>

      {activeTab === 'general' && (

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* API Credentials Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                <h2 className="text-xl font-bold text-gray-900">API Credentials</h2>
                <p className="text-sm text-gray-500">Your Angel Broking API credentials</p>
              </div>
                  </div>
                  <button
              onClick={() => setShowSecrets(!showSecrets)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {showSecrets ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span className="text-sm">Hide</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Show</span>
                </>
                    )}
                  </button>
        </div>

          <div className="space-y-4">
            {/* API Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">API Key</label>
              <div className="flex items-center space-x-2">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={credentials.apiKey}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
              <button
                  onClick={() => copyToClipboard(credentials.apiKey, 'apiKey')}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                  {copiedField === 'apiKey' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              </div>
            </div>

            {/* Client ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Client ID</label>
              <div className="flex items-center space-x-2">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={credentials.clientId}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                    <button
                  onClick={() => copyToClipboard(credentials.clientId, 'clientId')}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copiedField === 'clientId' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Secret Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Secret Key</label>
              <div className="flex items-center space-x-2">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={credentials.secretKey}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                    <button
                      onClick={() => copyToClipboard(credentials.secretKey, 'secretKey')}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copiedField === 'secretKey' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Access Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Access Token</label>
              <div className="flex items-center space-x-2">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={credentials.accessToken}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                    <button
                      onClick={() => copyToClipboard(credentials.accessToken, 'accessToken')}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copiedField === 'accessToken' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Refresh Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Refresh Token</label>
              <div className="flex items-center space-x-2">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={credentials.refreshToken}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(credentials.refreshToken, 'refreshToken')}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copiedField === 'refreshToken' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  </div>
                </div>

          <div className="flex items-center space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={refreshTokens}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Tokens</span>
            </button>
                    <button
              onClick={clearCredentials}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
                    </button>
                  </div>
        </div>

        {/* API Status Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">API Status</h2>
              <p className="text-sm text-gray-500">Current connection status</p>
                  </div>
                </div>

          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(apiStatus.status)}
                <div>
                  <p className="font-medium text-gray-900">Connection Status</p>
                  <p className="text-sm text-gray-500">Angel Broking API</p>
                  </div>
                </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(apiStatus.status)}`}>
                {apiStatus.status}
              </span>
              </div>

            {/* Last Sync */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">Last Sync</p>
                  <p className="text-sm text-gray-500">Data synchronization</p>
          </div>
        </div>
              <span className="text-sm text-gray-600">
                {formatDate(apiStatus.lastSync)}
              </span>
      </div>

            {/* Auto Refresh */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">Auto Refresh</p>
                  <p className="text-sm text-gray-500">Token refresh interval</p>
                </div>
              </div>
              <span className="text-sm text-gray-600">Every 30 minutes</span>
          </div>

            {/* Security Level */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">Security Level</p>
                  <p className="text-sm text-gray-500">Data protection</p>
                </div>
                </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                High
                  </span>
                </div>
              </div>

          <button
            onClick={checkApiStatus}
            disabled={loading}
            className="w-full mt-6 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        </div>
      </div>
      )}

      {/* Application Settings */}
      <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Application Settings</h2>
            <p className="text-sm text-gray-500">General application configuration</p>
          </div>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Database</p>
                <p className="text-sm text-gray-500">Local storage status</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Connected
                  </span>
                </div>

          {/* Cache Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Cache</p>
                <p className="text-sm text-gray-500">Data cache status</p>
                </div>
              </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Active
            </span>
            </div>

          {/* Theme */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Theme</p>
                <p className="text-sm text-gray-500">Application theme</p>
          </div>
        </div>
            <span className="text-sm text-gray-600">Light Mode</span>
      </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-gray-500" />
          <div>
                <p className="font-medium text-gray-900">Language</p>
                <p className="text-sm text-gray-500">Interface language</p>
              </div>
            </div>
            <span className="text-sm text-gray-600">English</span>
          </div>
        </div>
      </div>

      {/* Auto-Refresh Settings */}
      <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Auto-Refresh Settings</h2>
            <p className="text-sm text-gray-500">Configure automatic price updates</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Auto-Refresh Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {autoRefreshSettings.enabled ? (
                <Play className="w-5 h-5 text-green-500" />
              ) : (
                <Pause className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <p className="font-medium text-gray-900">Auto-Refresh</p>
                <p className="text-sm text-gray-500">
                  {autoRefreshSettings.enabled 
                    ? `Prices update every ${autoRefreshSettings.interval} seconds`
                    : 'Manual refresh only'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleAutoRefreshToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoRefreshSettings.enabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoRefreshSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Refresh Interval */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Refresh Interval</p>
                <p className="text-sm text-gray-500">How often to update prices</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {autoRefreshService.getAvailableIntervals().map((interval) => (
                <button
                  key={interval}
                  onClick={() => handleIntervalChange(interval)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    autoRefreshSettings.interval === interval
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {interval}s
                </button>
              ))}
            </div>
          </div>

          {/* Status Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Auto-Refresh Info</p>
                <p className="text-sm text-blue-700 mt-1">
                  When enabled, prices will automatically refresh every {autoRefreshSettings.interval} seconds. 
                  This helps keep your portfolio data up-to-date with live market prices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Data Management</h2>
            <p className="text-sm text-gray-500">Clear all data to start fresh</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Clear Data Warning */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Warning: Irreversible Action</p>
                <p className="text-sm text-red-700 mt-1">
                  Clearing all data will permanently delete all your watchlists, stocks, holdings, and portfolio data. 
                  This action cannot be undone. Make sure you have backed up any important data before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Clear Data Button */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Clear All Data</p>
                <p className="text-sm text-gray-500">
                  {clearingData ? clearDataMessage : 'Remove all stocks, watchlists, and holdings'}
                </p>
              </div>
            </div>
            <button
              onClick={clearAllData}
              disabled={clearingData}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearingData ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Clearing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All Data</span>
                </>
              )}
            </button>
          </div>

          {/* Data Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Watchlists</p>
                  <p className="text-xs text-blue-700">All watchlists and stocks</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Holdings</p>
                  <p className="text-xs text-green-700">All portfolio holdings</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Cache</p>
                  <p className="text-xs text-purple-700">Cached dashboard data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

    </div>
  );
};

export default Settings;





import React, { useState } from 'react';
import smartApiService from '../services/smartApiService';
import loginService from '../services/loginService';

const TestApi = () => {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testApiConnection = async () => {
    setIsLoading(true);
    setTestResult('Testing API connection...\n');

    try {
      // Test 1: Check login status
      const isLoggedIn = loginService.isLoggedIn();
      setTestResult(prev => prev + `Login Status: ${isLoggedIn ? 'Logged In' : 'Not Logged In'}\n`);

      // Test 2: Check API configuration
      const isConfigured = smartApiService.isApiConfigured();
      setTestResult(prev => prev + `API Configured: ${isConfigured ? 'Yes' : 'No'}\n`);

      // Test 3: Get credentials
      const credentials = smartApiService.getApiCredentials();
      setTestResult(prev => prev + `Credentials: ${JSON.stringify(credentials, null, 2)}\n`);

      // Test 4: Test price fetching
      setTestResult(prev => prev + 'Testing price fetch for SBIN...\n');
      const price = await smartApiService.getLivePrice('SBIN');
      setTestResult(prev => prev + `Price Result: ${JSON.stringify(price, null, 2)}\n`);

      // Test 5: Test multiple stocks
      setTestResult(prev => prev + 'Testing multiple stocks...\n');
      const stocks = [
        { symbol: 'RELIANCE', exchange: 'NSE' },
        { symbol: 'TCS', exchange: 'NSE' },
        { symbol: 'INFY', exchange: 'NSE' }
      ];
      const prices = await smartApiService.getLivePrices(stocks);
      setTestResult(prev => prev + `Multiple Prices: ${JSON.stringify(prices, null, 2)}\n`);

    } catch (error) {
      setTestResult(prev => prev + `Error: ${error.message}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCredentials = () => {
    loginService.clearApiCredentials();
    setTestResult('Credentials cleared\n');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">API Test Component</h2>
      
      <div className="space-y-4">
        <button
          onClick={testApiConnection}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test API Connection'}
        </button>

        <button
          onClick={clearCredentials}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Clear Credentials
        </button>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
            {testResult || 'No test results yet'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestApi;







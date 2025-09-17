import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';
import loginService from '../services/loginService';

const LoginDialog = ({ isOpen, onClose, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    apiKey: '',
    secretKey: '',
    accessToken: ''
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.apiKey || !formData.secretKey || !formData.accessToken) {
      setError('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = loginService.storeApiCredentials(
        formData.apiKey,
        formData.secretKey,
        formData.accessToken
      );

      if (success) {
        console.log('Manual login successful - API credentials stored');
        onLoginSuccess && onLoginSuccess();
        handleClose();
      } else {
        setError('Failed to store credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ apiKey: '', secretKey: '', accessToken: '' });
    setError('');
    setShowSecret(false);
    setShowToken(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Key className="w-5 h-5 mr-2" />
            Manual API Login
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Info Alert */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Auto-login failed</p>
              <p>Please enter your Angel Broking API credentials manually. These should be available in your Angel Broking account settings.</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your API Key"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret Key
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={formData.secretKey}
                  onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your Secret Key"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your Access Token"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>• Your credentials are stored locally and securely</p>
            <p>• They are only used for API calls to Angel Broking</p>
            <p>• You can clear them anytime by logging out</p>
            <p>• Auto-login will be attempted on next app start</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginDialog;

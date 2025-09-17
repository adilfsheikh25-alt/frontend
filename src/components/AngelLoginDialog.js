import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, AlertCircle, Smartphone, User, Lock } from 'lucide-react';
import loginService from '../services/loginService';

const AngelLoginDialog = ({ isOpen, onClose, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    clientCode: '',
    pin: '',
    totp: ''
  });
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Login, 2: TOTP

  // Pre-filled API credentials (as provided by user)
  const API_KEY = 'dXCRFMDC';
  const SECRET_KEY = '96fc6c13-e0be-4fb1-ade7-08dd1914e16e';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      // Step 1: Validate client code and PIN
      if (!formData.clientCode || !formData.pin) {
        setError('Please fill in all fields');
        return;
      }
      setStep(2);
      return;
    }

    // Step 2: Complete login with TOTP
    if (!formData.totp) {
      setError('Please enter the TOTP code from your authenticator app');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Attempting Angel Broking login...');
      
      // Call the login service to authenticate with Angel Broking
      const success = await loginService.authenticateWithAngel(
        formData.clientCode,
        formData.pin,
        formData.totp,
        API_KEY,
        SECRET_KEY
      );

      if (success) {
        console.log('Angel Broking login successful');
        onLoginSuccess && onLoginSuccess();
        handleClose();
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ clientCode: '', pin: '', totp: '' });
    setError('');
    setShowPin(false);
    setStep(1);
    onClose();
  };

  const goBackToStep1 = () => {
    setStep(1);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Key className="w-5 h-5 mr-2" />
            {step === 1 ? 'Angel Broking Login' : 'Enter TOTP Code'}
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
              <p className="font-medium">Angel Broking SmartAPI Login</p>
              <p>Enter your Angel Broking credentials to access live market data.</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {step === 1 ? (
              <>
                {/* Step 1: Client Code and PIN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.clientCode}
                      onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your Client Code"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PIN <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                      className="w-full pl-10 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your PIN"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: TOTP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TOTP Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.totp}
                      onChange={(e) => setFormData({ ...formData, totp: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter TOTP from authenticator app"
                      required
                      maxLength={6}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-digit code from your Google Authenticator or similar app
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex space-x-3">
            {step === 2 && (
              <button
                type="button"
                onClick={goBackToStep1}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Logging in...' : (step === 1 ? 'Next' : 'Login')}
            </button>
            {step === 1 && (
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>• Your credentials are used only for Angel Broking API authentication</p>
            <p>• TOTP code refreshes every 30 seconds</p>
            <p>• Session remains active for up to 28 hours</p>
            <p>• API Key and Secret are pre-configured</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AngelLoginDialog;







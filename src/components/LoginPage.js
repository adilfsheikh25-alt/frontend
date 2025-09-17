import React, { useState } from 'react';
import { TrendingUp, Key, Eye, EyeOff, AlertCircle, Smartphone, User, Lock, RefreshCw } from 'lucide-react';
import loginService from '../services/loginService';

const LoginPage = ({ onLoginSuccess }) => {
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
      console.log('🔐 Attempting Angel Broking login...');
      console.log('Client Code:', formData.clientCode);
      console.log('API Key:', API_KEY);
      
      // Call the login service to authenticate with Angel Broking
      const success = await loginService.authenticateWithAngel(
        formData.clientCode,
        formData.pin,
        formData.totp,
        API_KEY,
        SECRET_KEY
      );

      if (success) {
        console.log('✅ Angel Broking login successful');
        onLoginSuccess();
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
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
  };

  const goBackToStep1 = () => {
    setStep(1);
    setError('');
  };

  console.log('📱 LoginPage rendering');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="text-center p-8 border-b border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Angel Portfolio</h1>
          <p className="text-gray-600">Access your portfolio with Angel Broking</p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info Alert */}
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl flex items-start space-x-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Angel Broking SmartAPI Login</p>
                <p>Enter your credentials to access live market data and portfolio management.</p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {step === 1 ? (
                <>
                  {/* Step 1: Client Code and PIN */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Client Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.clientCode}
                        onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your Client Code"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PIN <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={formData.pin}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your PIN"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      TOTP Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.totp}
                        onChange={(e) => setFormData({ ...formData, totp: e.target.value })}
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter TOTP from authenticator app"
                        required
                        maxLength={6}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Enter the 6-digit code from your Google Authenticator or similar app
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={goBackToStep1}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>{step === 1 ? 'Next' : 'Login'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Info */}
          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p>• Your credentials are used only for Angel Broking API authentication</p>
            <p>• TOTP code refreshes every 30 seconds</p>
            <p>• Session remains active for up to 28 hours</p>
            <p>• API Key and Secret are pre-configured</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

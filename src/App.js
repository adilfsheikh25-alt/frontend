import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Holdings from './components/Holdings';
import Watchlist from './components/Watchlist';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Settings from './components/Settings';
import LoginPage from './components/LoginPage';
import loginService from './services/loginService';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(true);

  const handleLoginSuccess = () => {
    console.log('🎉 Login success callback triggered');
    setIsLoggedIn(true);
    console.log('✅ Login successful - API credentials stored');
  };

  const handleLogout = () => {
    console.log('🚪 Logout triggered');
    setIsLoggedIn(false);
    loginService.clearApiCredentials();
    console.log('✅ Logout successful - API credentials cleared');
  };

  // Check for existing login on app startup
  useEffect(() => {
    const checkExistingLogin = async () => {
      try {
        console.log('🔍 Checking for existing login...');
        const credentials = loginService.getApiCredentials();
        
        if (credentials.isLoggedIn) {
          console.log('✅ Found existing login credentials');
          setIsLoggedIn(true);
        } else {
          console.log('❌ No existing login credentials found');
        }
      } catch (error) {
        console.error('❌ Error checking existing login:', error);
      } finally {
        setIsAutoLoggingIn(false);
      }
    };

    checkExistingLogin();
  }, []);

  console.log('🔄 App render - isLoggedIn:', isLoggedIn, 'isAutoLoggingIn:', isAutoLoggingIn);

  // Show loading while checking for existing login
  if (isAutoLoggingIn) {
    console.log('⏳ Showing loading screen...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking login status...</p>
        </div>
      </div>
    );
  }

  // Show login page if not logged in
  if (!isLoggedIn) {
    console.log('📱 Rendering LoginPage');
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main application after login
  console.log('🏠 Rendering main application');
  return (
    <Router>
      <div className="App">
        <Header 
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          isAutoLoggingIn={isAutoLoggingIn}
        />
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/holdings" element={<Holdings />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;


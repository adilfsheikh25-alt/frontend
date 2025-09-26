import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, RefreshCw, LogOut } from 'lucide-react';
import loginService from '../services/loginService';

const Header = ({ isLoggedIn, onLogout, isAutoLoggingIn }) => {
  const location = useLocation();

  const getApiStatusColor = () => {
    if (isAutoLoggingIn) return 'bg-yellow-400';
    return isLoggedIn ? 'bg-green-400' : 'bg-red-400';
  };

  const getApiStatusText = () => {
    if (isAutoLoggingIn) return 'Connecting...';
    return isLoggedIn ? 'API Connected' : 'API Disconnected';
  };

  const handleLogout = () => {
    loginService.clearApiCredentials();
    onLogout();
  };

  return (
    <header className="text-white shadow-lg" style={{
      backgroundColor: '#004c4c'
    }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <TrendingUp className="w-8 h-8 text-white" />
              <span className="text-xl font-bold text-white">Angel Portfolio</span>
            </Link>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Overview
            </Link>
            <Link
              to="/holdings"
              className={`px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/holdings' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Holdings
            </Link>
            <Link
              to="/watchlist"
              className={`px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/watchlist' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Watchlist
            </Link>
            <Link
              to="/analytics"
              className={`px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/analytics' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Analytics
            </Link>
            <Link
              to="/news"
              className={`px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/news' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              News
            </Link>
            <Link
              to="/settings"
              className={`px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/settings' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Settings
            </Link>
          </nav>

          {/* API Status and Logout */}
          <div className="flex items-center space-x-4">
            {/* API Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getApiStatusColor()} ${isAutoLoggingIn ? 'animate-pulse' : ''}`}></div>
              <span className="text-xs text-white/80">
                {getApiStatusText()}
              </span>
              {isAutoLoggingIn && (
                <RefreshCw className="w-3 h-3 text-white/80 animate-spin" />
              )}
            </div>

            {/* Logout Button */}
            {!isAutoLoggingIn && isLoggedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-white rounded-lg transition-colors hover:opacity-80"
                style={{
                  backgroundColor: '#004c4c'
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;


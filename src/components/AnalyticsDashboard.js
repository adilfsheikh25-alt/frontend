import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Activity, Target, PieChart, LineChart } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const AnalyticsDashboard = ({ holdings, watchlist }) => {
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [dailyChange, setDailyChange] = useState(0);

  useEffect(() => {
    calculatePortfolioMetrics();
  }, [holdings]);

  const calculatePortfolioMetrics = () => {
    // Safety check for undefined holdings
    if (!holdings || !Array.isArray(holdings)) {
      setPortfolioValue(0);
      setTotalPnL(0);
      setDailyChange(0);
      return;
    }

    const totalValue = holdings.reduce((sum, holding) => {
      const quantity = holding.quantity || 0;
      const lastPrice = holding.lastPrice || holding.averagePrice || 0;
      return sum + (quantity * lastPrice);
    }, 0);
    
    const totalProfitLoss = holdings.reduce((sum, holding) => {
      const quantity = holding.quantity || 0;
      const lastPrice = holding.lastPrice || holding.averagePrice || 0;
      const averagePrice = holding.averagePrice || 0;
      const pnl = (lastPrice - averagePrice) * quantity;
      return sum + pnl;
    }, 0);
    
    const dailyChangeValue = holdings.reduce((sum, holding) => {
      const quantity = holding.quantity || 0;
      const perShareDailyChange = typeof holding.change === 'number' ? holding.change : 0;
      return sum + (perShareDailyChange * quantity);
    }, 0);
    
    setPortfolioValue(totalValue);
    setTotalPnL(totalProfitLoss);
    setDailyChange(dailyChangeValue);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Sample data for charts
  const portfolioPerformanceData = [
    { date: 'Mon', value: 450000 },
    { date: 'Tue', value: 465000 },
    { date: 'Wed', value: 472000 },
    { date: 'Thu', value: 468000 },
    { date: 'Fri', value: 485000 },
    { date: 'Sat', value: 482000 },
    { date: 'Sun', value: 485000 }
  ];

  const sectorAllocationData = [
    { name: 'Technology', value: 35, color: '#3B82F6' },
    { name: 'Banking', value: 25, color: '#10B981' },
    { name: 'Energy', value: 20, color: '#F59E0B' },
    { name: 'Healthcare', value: 15, color: '#EF4444' },
    { name: 'Others', value: 5, color: '#8B5CF6' }
  ];

  const topPerformersData = [
    { name: 'TCS', performance: 8.2, change: '+₹70' },
    { name: 'RELIANCE', performance: 5.4, change: '+₹130' },
    { name: 'HDFCBANK', performance: 3.8, change: '+₹60' },
    { name: 'INFY', performance: -2.1, change: '-₹30' }
  ];

  return (
    <div className="space-y-6 pt-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Portfolio Value</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(portfolioValue)}</p>
              <p className="text-blue-100 text-sm mt-2">+2.4% today</p>
            </div>
            <div className="bg-blue-400/20 p-3 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total P&L</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalPnL)}</p>
              <p className="text-green-100 text-sm mt-2">{formatPercentage((totalPnL / portfolioValue) * 100)}</p>
            </div>
            <div className="bg-green-400/20 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Daily Change</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(dailyChange)}</p>
              <p className="text-purple-100 text-sm mt-2">+1.8% vs yesterday</p>
            </div>
            <div className="bg-purple-400/20 p-3 rounded-lg">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Holdings</p>
              <p className="text-2xl font-bold mt-1">{holdings?.length || 0}</p>
              <p className="text-orange-100 text-sm mt-2">Active positions</p>
            </div>
            <div className="bg-orange-400/20 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Performance Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>7 Days</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={portfolioPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Portfolio Value']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>

        {/* Sector Allocation Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sector Allocation</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={sectorAllocationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {sectorAllocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Allocation']}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {sectorAllocationData.map((sector, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: sector.color }}
                ></div>
                <span className="text-sm text-gray-600">{sector.name}</span>
                <span className="text-sm font-medium text-gray-900">{sector.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers and Market Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performers</h3>
          <div className="space-y-4">
            {topPerformersData.map((stock, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    stock.performance >= 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-sm font-semibold ${
                      stock.performance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stock.performance >= 0 ? '+' : ''}{stock.performance}%
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{stock.name}</p>
                    <p className={`text-sm ${
                      stock.performance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stock.change}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center space-x-1 ${
                  stock.performance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stock.performance >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Insights */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Market Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Nifty 50</p>
                  <p className="text-sm text-gray-600">19,850.25</p>
                </div>
              </div>
              <div className="text-green-600 font-medium">+0.8%</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Bank Nifty</p>
                  <p className="text-sm text-gray-600">44,320.50</p>
                </div>
              </div>
              <div className="text-green-600 font-medium">+1.2%</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Market Sentiment</p>
                  <p className="text-sm text-gray-600">Bullish</p>
                </div>
              </div>
              <div className="text-green-600 font-medium">Positive</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;



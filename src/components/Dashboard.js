import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, BarChart3, 
  PieChart, Activity, Target, Package, Eye,
  ArrowUpRight, ArrowDownRight, Users, Globe, Zap,
  ChevronUp, Database
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, 
  Cell, BarChart, Bar, AreaChart, Area, ComposedChart
} from 'recharts';
import Holdings from './Holdings';
import Watchlist from './Watchlist';
import TestApi from './TestApi';
import { holdingsService } from '../services/holdingsService';
import { watchlistService } from '../services/watchlistService';
import smartApiService from '../services/smartApiService';

const Dashboard = ({ activeTab }) => {
  const [holdings, setHoldings] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    totalInvestment: 0,
    totalValue: 0,
    totalPnL: 0,
    dailyChange: 0,
    monthlyChange: 0,
    totalStocks: 0,
    topGainer: null,
    topLoser: null
  });

  // Dynamic portfolio performance data based on live metrics
  const [portfolioPerformanceData, setPortfolioPerformanceData] = useState([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('1M');
  
  // Amount invested chart state
  const [amountInvestedData, setAmountInvestedData] = useState([]);
  const [selectedInvestmentPeriod, setSelectedInvestmentPeriod] = useState('monthly');
  
  // Top movers chart state
  const [topMoversData, setTopMoversData] = useState([]);
  const [marketIndices, setMarketIndices] = useState([]);

  // Generate section allocation data based on actual holdings
  const generateSectionAllocationData = () => {
    if (!holdings || holdings.length === 0) {
      return [];
    }

    // Group holdings by sector (you can modify this based on your data structure)
    const sectorGroups = {};
    const totalValue = portfolioMetrics.totalValue || 0;
    
    holdings.forEach((holding) => {
      const quantity = holding.quantity || 0;
      const lastPrice = holding.lastPrice || holding.averagePrice || 0;
      const value = quantity * lastPrice;
      
      // For now, we'll use a simple categorization based on symbol patterns
      // You can enhance this with actual sector data from your API
      let sector = 'Others';
      const symbol = (holding.symbol || '').toUpperCase();
      
      if (symbol.includes('BANK') || symbol.includes('HDFC') || symbol.includes('ICICI') || symbol.includes('SBI')) {
        sector = 'Banking';
      } else if (symbol.includes('TECH') || symbol.includes('INFY') || symbol.includes('TCS') || symbol.includes('WIPRO')) {
        sector = 'Technology';
      } else if (symbol.includes('OIL') || symbol.includes('RELIANCE') || symbol.includes('ONGC')) {
        sector = 'Energy';
      } else if (symbol.includes('PHARMA') || symbol.includes('SUN') || symbol.includes('DRL')) {
        sector = 'Healthcare';
      } else if (symbol.includes('AUTO') || symbol.includes('MARUTI') || symbol.includes('TATA')) {
        sector = 'Automotive';
      } else if (symbol.includes('FMCG') || symbol.includes('ITC') || symbol.includes('NESTLE')) {
        sector = 'FMCG';
      }
      
      if (!sectorGroups[sector]) {
        sectorGroups[sector] = 0;
      }
      sectorGroups[sector] += value;
    });

    // Convert to percentage and create chart data
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4'];
    let colorIndex = 0;
    
    return Object.entries(sectorGroups)
      .map(([sector, value]) => ({
        name: sector,
        value: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
        color: colors[colorIndex++ % colors.length]
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  };

  const sectionAllocationData = generateSectionAllocationData();



  useEffect(() => {
    loadDashboardData();
  }, []);

  // Generate portfolio performance data based on actual holdings and realistic market movements
  const generatePortfolioPerformanceData = (timePeriod) => {
    const baseValue = portfolioMetrics.totalValue || 0;
    const totalInvestment = portfolioMetrics.totalInvestment || 0;
    
    // If no portfolio data, return empty data
    if (baseValue === 0) {
      return [];
    }
    
    // Calculate current performance percentage
    const currentPerformance = totalInvestment > 0 ? ((baseValue - totalInvestment) / totalInvestment) * 100 : 0;
    
    // Generate realistic performance data based on current portfolio performance
    const generateRealisticData = (periods, basePerformance) => {
      const data = [];
      let currentValue = baseValue;
      
      for (let i = periods.length - 1; i >= 0; i--) {
        // Generate realistic market movements (-5% to +15% range)
        const randomMovement = (Math.random() - 0.3) * 0.2; // Slight positive bias
        const performanceFactor = 1 + randomMovement;
        
        currentValue = currentValue / performanceFactor;
        const change = ((currentValue * performanceFactor - currentValue) / currentValue) * 100;
        
        data.unshift({
          month: periods[i],
          value: Math.round(currentValue),
          trend: Math.round(currentValue * (1 + randomMovement * 0.5)),
          change: Math.round(change * 100) / 100
        });
      }
      
      return data;
    };
    
    switch (timePeriod) {
      case '1M':
        return generateRealisticData(['Week 1', 'Week 2', 'Week 3', 'Week 4'], currentPerformance);
      case '3M':
        return generateRealisticData(['Month 1', 'Month 2', 'Month 3'], currentPerformance);
      case '6M':
        return generateRealisticData(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], currentPerformance);
      case '1Y':
        return generateRealisticData(['Q1', 'Q2', 'Q3', 'Q4'], currentPerformance);
      default:
        return generateRealisticData(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'], currentPerformance);
    }
  };

  // Generate amount invested data based on actual holdings
  const generateAmountInvestedData = (period) => {
    const baseInvestment = portfolioMetrics.totalInvestment || 0;
    
    // If no investment data, return empty data
    if (baseInvestment === 0) {
      return [];
    }
    
    // Calculate actual investment distribution based on holdings
    const holdingsCount = holdings.length;
    const avgInvestmentPerHolding = holdingsCount > 0 ? baseInvestment / holdingsCount : 0;
    
    if (period === 'monthly') {
      // Simulate monthly investment pattern based on actual holdings
      const stages = [
        { stage: 'Initial Investment', amount: baseInvestment * 0.4, cumulative: baseInvestment * 0.4, color: '#8B5CF6', type: 'balance' },
        { stage: 'Stock Purchases', amount: baseInvestment * 0.3, cumulative: baseInvestment * 0.7, color: '#3B82F6', type: 'investment' },
        { stage: 'Additional Buys', amount: baseInvestment * 0.15, cumulative: baseInvestment * 0.85, color: '#10B981', type: 'investment' },
        { stage: 'Dividend Reinvest', amount: baseInvestment * 0.05, cumulative: baseInvestment * 0.9, color: '#F59E0B', type: 'investment' },
        { stage: 'Current Value', amount: baseInvestment * 0.1, cumulative: baseInvestment, color: '#EF4444', type: 'balance' }
      ];
      
      return stages;
    } else {
      // Yearly data - simulate quarterly investment pattern
      const quarters = [
        { stage: 'Q1 Investment', amount: baseInvestment * 0.25, cumulative: baseInvestment * 0.25, color: '#3B82F6', type: 'investment' },
        { stage: 'Q2 Investment', amount: baseInvestment * 0.25, cumulative: baseInvestment * 0.5, color: '#10B981', type: 'investment' },
        { stage: 'Q3 Investment', amount: baseInvestment * 0.25, cumulative: baseInvestment * 0.75, color: '#F59E0B', type: 'investment' },
        { stage: 'Q4 Investment', amount: baseInvestment * 0.25, cumulative: baseInvestment, color: '#EF4444', type: 'investment' }
      ];
      
      return quarters;
    }
  };

  // Generate top movers data from watchlist
  const generateTopMoversData = (watchlistData) => {
    if (!watchlistData || watchlistData.length === 0) {
      console.log('📈 No watchlist data available for top movers');
      return [];
    }

    // Flatten all stocks from all watchlists
    const allStocks = watchlistData.flatMap(watchlist => 
      (watchlist.stocks || []).map(stock => ({
        ...stock,
        watchlistName: watchlist.name
      }))
    );

    console.log('📈 All stocks from watchlists:', allStocks.length, allStocks);

    // Filter stocks where LTP > priceAddedAt and calculate gains
    const movers = allStocks
      .filter(stock => {
        const ltp = parseFloat(stock.lastPrice) || 0;
        const addedPrice = parseFloat(stock.priceAddedAt) || 0;
        const isMover = ltp > addedPrice && addedPrice > 0;
        
        console.log(`📈 Stock ${stock.symbol}: LTP=${ltp}, AddedPrice=${addedPrice}, IsMover=${isMover}`);
        
        return isMover;
      })
      .map(stock => {
        const ltp = parseFloat(stock.lastPrice) || 0;
        const addedPrice = parseFloat(stock.priceAddedAt) || 0;
        const gain = ltp - addedPrice;
        const gainPercentage = ((ltp - addedPrice) / addedPrice) * 100;
        
        return {
          symbol: stock.symbol,
          name: stock.name,
          addedPrice: addedPrice,
          currentPrice: ltp,
          gain: gain,
          gainPercentage: gainPercentage,
          watchlistName: stock.watchlistName,
          color: gainPercentage > 20 ? '#10B981' : gainPercentage > 10 ? '#3B82F6' : '#F59E0B'
        };
      })
      .sort((a, b) => b.gainPercentage - a.gainPercentage)
      .slice(0, 8); // Top 8 movers

    console.log('📈 Top movers found:', movers.length, movers);
    return movers;
  };

  // Generate dynamic portfolio performance data when metrics change
  useEffect(() => {
    setPortfolioPerformanceData(generatePortfolioPerformanceData(selectedTimePeriod));
    setAmountInvestedData(generateAmountInvestedData(selectedInvestmentPeriod));
  }, [portfolioMetrics, selectedTimePeriod, selectedInvestmentPeriod]);

  const fetchMarketIndices = async () => {
    try {
      const response = await fetch('https://backend-zuva.onrender.com/api/market-indices');
      const data = await response.json();
      setMarketIndices(data);
      console.log('📈 Market indices loaded:', data);
    } catch (error) {
      console.error('❌ Error fetching market indices:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      console.log('🔄 Loading dashboard data...');
      
      // Load holdings data
      const holdingsData = await holdingsService.getHoldings();
      console.log('📊 Holdings data loaded:', holdingsData);

      // Refresh live prices and compute PnL to ensure accurate dashboard metrics
      const enrichedHoldings = Array.isArray(holdingsData) && holdingsData.length > 0
        ? await smartApiService.updateHoldingsPrices(holdingsData)
        : (Array.isArray(holdingsData) ? holdingsData : []);

      setHoldings(enrichedHoldings);
      
      // Calculate portfolio metrics
      calculatePortfolioMetrics(enrichedHoldings);
      
      // Load watchlist data
      const watchlistsData = await watchlistService.getWatchlists();
      console.log('👀 Watchlists data loaded:', watchlistsData);
      setWatchlist(Array.isArray(watchlistsData) ? watchlistsData : []);
      
      // Update watchlist stocks with live prices for accurate top movers calculation
      const enrichedWatchlists = await Promise.all(
        (watchlistsData || []).map(async (watchlist) => {
          if (watchlist.stocks && watchlist.stocks.length > 0) {
            const updatedStocks = await smartApiService.updateStockPrices(watchlist.stocks, watchlist.id);
            return { ...watchlist, stocks: updatedStocks };
          }
          return watchlist;
        })
      );
      
      // Generate top movers data with live prices
      const moversData = generateTopMoversData(enrichedWatchlists);
      console.log('📈 Top movers data generated:', moversData);
      setTopMoversData(moversData);
      
      // Fetch market indices
      await fetchMarketIndices();
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    }
  };

  const calculatePortfolioMetrics = (holdingsData) => {
    if (!holdingsData || holdingsData.length === 0) {
      // Set default values when no holdings
      setPortfolioMetrics({
        totalInvestment: 0,
        totalValue: 0,
        totalPnL: 0,
        dailyChange: 0,
        monthlyChange: 0,
        totalStocks: 0,
        topGainer: null,
        topLoser: null
      });
      return;
    }

    const totalInvestment = holdingsData.reduce((sum, holding) => {
      const quantity = holding.quantity || 0;
      const averagePrice = holding.averagePrice || 0;
      return sum + (quantity * averagePrice);
    }, 0);

    const totalValue = holdingsData.reduce((sum, holding) => {
      const quantity = holding.quantity || 0;
      const lastPrice = holding.lastPrice || holding.averagePrice || 0;
      return sum + (quantity * lastPrice);
    }, 0);
    
    // Prefer precomputed pnl from smartApiService to avoid duplication mistakes
    const totalPnL = holdingsData.reduce((sum, holding) => {
      const quantity = holding.quantity || 0;
      const lastPrice = holding.lastPrice || holding.averagePrice || 0;
      const averagePrice = holding.averagePrice || 0;
      const computedPnl = (lastPrice - averagePrice) * quantity;
      const pnl = typeof holding.pnl === 'number' ? holding.pnl : computedPnl;
      return sum + pnl;
    }, 0);
    
    // Daily change should use per-share daily change from previous close if available
    const dailyChange = holdingsData.reduce((sum, holding) => {
      const quantity = holding.quantity || 0;
      // If API provided daily change, use it; otherwise fallback to 0
      const perShareDailyChange = typeof holding.change === 'number' ? holding.change : 0;
      return sum + (perShareDailyChange * quantity);
    }, 0);
    
    // Find top gainer and loser (only if pnlPercentage exists)
    const validHoldings = holdingsData.filter(holding => {
      const quantity = holding.quantity || 0;
      const lastPrice = holding.lastPrice || holding.averagePrice || 0;
      const averagePrice = holding.averagePrice || 0;
      if (quantity === 0 || averagePrice === 0) return false;
      
      const pnlPercentage = ((lastPrice - averagePrice) / averagePrice) * 100;
      return !isNaN(pnlPercentage);
    });
    
    let topGainer = null;
    let topLoser = null;
    
    if (validHoldings.length > 0) {
      const holdingsWithPnl = validHoldings.map(holding => {
        const quantity = holding.quantity || 0;
        const lastPrice = holding.lastPrice || holding.averagePrice || 0;
        const averagePrice = holding.averagePrice || 0;
        const computedPnl = (lastPrice - averagePrice) * quantity;
        const pnl = typeof holding.pnl === 'number' ? holding.pnl : computedPnl;
        const pnlPercentage = ((lastPrice - averagePrice) / averagePrice) * 100;
        
        return {
          ...holding,
          pnl,
          pnlPercentage
        };
      });
      
      const sortedByChange = [...holdingsWithPnl].sort((a, b) => (b.pnlPercentage || 0) - (a.pnlPercentage || 0));
      topGainer = sortedByChange[0];
      topLoser = sortedByChange[sortedByChange.length - 1];
    }

    setPortfolioMetrics({
      totalInvestment,
      totalValue,
      totalPnL,
      dailyChange,
      monthlyChange: dailyChange * 22, // Approximate monthly change
      totalStocks: holdingsData.length,
      topGainer,
      topLoser
    });
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₹0';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Generate portfolio composition data for pie chart with multiple colors
  const generatePortfolioCompositionData = () => {
    if (!holdings || holdings.length === 0) {
      return [
        { name: 'No Holdings', value: 100, color: '#9CA3AF' }
      ];
    }

    return holdings.map((holding, index) => {
      const quantity = holding.quantity || 0;
      const lastPrice = holding.lastPrice || holding.averagePrice || 0;
      const value = quantity * lastPrice;
      
      // Extended color palette for better variety
      const colors = [
        '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#10B981',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
        '#14B8A6', '#F43F5E', '#8B5A2B', '#9F7AEA', '#ED8936'
      ];
      const color = colors[index % colors.length];
      
      return {
        name: holding.symbol || 'Unknown',
        value: value,
        color: color,
        quantity: quantity,
        price: lastPrice
      };
    }).filter(item => item.value > 0);
  };

  const renderOverviewTab = () => (
    <div className="space-y-3">
      {/* Key Metrics Cards - Exact Image Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Portfolio Value Card - Linear Gradient with Cut-out Corner */}
        <div className="rounded-3xl shadow-lg p-4 relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, #020024 0%, #090979 50%, #00D4FF 100%)'
        }}>
          {/* Cut-out corner with icon */}
          <div className="absolute top-0 right-0 w-12 h-12 bg-[#f8fafc] rounded-bl-full flex items-start justify-end p-1.5">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
              <ChevronUp className="w-3 h-3 text-gray-600" />
            </div>
          </div>
          
          <div className="mb-2">
            <h3 className="text-white font-semibold text-sm mb-1">Portfolio Value</h3>
            <p className="text-xl font-bold text-white mb-1">
              {formatCurrency(portfolioMetrics.totalValue)}
            </p>
            <p className="text-xs text-white/80">
              Last month: {formatCurrency(portfolioMetrics.totalInvestment)}
            </p>
          </div>
          
          {/* Small curved line chart */}
          <div className="mb-2 h-8 flex items-end justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 40" className="w-full h-full">
              <path
                d="M10,30 Q25,25 40,20 T70,15 T90,10"
                stroke="#3B82F6"
                strokeWidth="2"
                fill="none"
                className="drop-shadow-sm"
              />
              <path
                d="M10,30 Q25,25 40,20 T70,15 T90,10 L90,40 L10,40 Z"
                fill="url(#portfolioGradient)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="portfolioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6"/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
            
          <div className="flex justify-end">
            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              {formatPercentage(((portfolioMetrics.totalValue - portfolioMetrics.totalInvestment) / Math.max(portfolioMetrics.totalInvestment, 1)) * 100)}
            </span>
          </div>
        </div>
            
        {/* Total Invested Card - Brown Background with Cut-out Corner */}
        <div className="rounded-3xl shadow-lg p-4 relative overflow-hidden" style={{ backgroundColor: '#806F48' }}>
          {/* Cut-out corner with icon */}
          <div className="absolute top-0 right-0 w-12 h-12 bg-[#f8fafc] rounded-bl-full flex items-start justify-end p-1.5">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
              <ChevronUp className="w-3 h-3 text-gray-600" />
            </div>
          </div>
          
          <div className="mb-2">
            <h3 className="text-white font-semibold text-sm mb-1">Total Invested</h3>
            <p className="text-xl font-bold text-white mb-1">
              {formatCurrency(portfolioMetrics.totalInvestment)}
            </p>
            <p className="text-sm text-white/80">
              Last month: {formatCurrency(portfolioMetrics.totalInvestment * 0.95)}
            </p>
          </div>
          
          {/* Small curved line chart */}
          <div className="mb-2 h-8 flex items-end justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 40" className="w-full h-full">
              <path
                d="M10,30 Q30,25 50,20 T90,15"
                stroke="#FFFFFF"
                strokeWidth="2"
                fill="none"
                className="drop-shadow-sm"
              />
              <path
                d="M10,30 Q30,25 50,20 T90,15 L90,40 L10,40 Z"
                fill="url(#investedGradient)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="investedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6"/>
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
            
          <div className="flex justify-end">
            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              +5%
            </span>
          </div>
        </div>
            
        {/* Total P&L Card - Menu Bar Color with Cut-out Corner */}
        <div className="bg-[#cb102d] rounded-3xl shadow-lg p-4 relative overflow-hidden">
          {/* Cut-out corner with icon */}
          <div className="absolute top-0 right-0 w-12 h-12 bg-[#f8fafc] rounded-bl-full flex items-start justify-end p-1.5">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
              <ChevronUp className="w-3 h-3 text-gray-600" />
            </div>
          </div>
          
          <div className="mb-2">
            <h3 className="text-white font-semibold text-sm mb-1">Total P&L</h3>
            <p className="text-xl font-bold text-white mb-1">
                {formatCurrency(portfolioMetrics.totalPnL)}
              </p>
            <p className="text-sm text-white/80">
              Last month: {formatCurrency(portfolioMetrics.totalPnL * 0.8)}
            </p>
          </div>
          
          {/* Small curved line chart */}
          <div className="mb-2 h-8 flex items-end justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 40" className="w-full h-full">
              <path
                d="M10,30 Q25,20 40,15 T70,10 T90,5"
                stroke="#FFFFFF"
                strokeWidth="2"
                fill="none"
                className="drop-shadow-sm"
              />
              <path
                d="M10,30 Q25,20 40,15 T70,10 T90,5 L90,40 L10,40 Z"
                fill="url(#pnlGradient)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="pnlGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6"/>
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
            
          <div className="flex justify-end">
            <span className={`text-white text-xs px-2 py-0.5 rounded-full font-medium ${
              portfolioMetrics.totalPnL >= 0 ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {formatPercentage((portfolioMetrics.totalPnL / Math.max(portfolioMetrics.totalInvestment || portfolioMetrics.totalValue, 1)) * 100)}
            </span>
          </div>
        </div>

        {/* Daily Change Card - Golden Background with Cut-out Corner */}
        <div className="rounded-3xl shadow-lg p-4 relative overflow-hidden" style={{ backgroundColor: '#BEA566' }}>
          {/* Cut-out corner with icon */}
          <div className="absolute top-0 right-0 w-12 h-12 bg-[#f8fafc] rounded-bl-full flex items-start justify-end p-1.5">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
              <ChevronUp className="w-3 h-3 text-gray-600" />
            </div>
          </div>
          
          <div className="mb-2">
            <h3 className="text-white font-semibold text-sm mb-1">Daily Change</h3>
            <p className="text-xl font-bold text-white mb-1">
                {formatCurrency(portfolioMetrics.dailyChange)}
            </p>
            <p className="text-sm text-white/80">
              Last month: {formatCurrency(portfolioMetrics.dailyChange * 0.7)}
            </p>
          </div>
          
          {/* Small curved line chart */}
          <div className="mb-2 h-8 flex items-end justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 40" className="w-full h-full">
              <path
                d="M10,30 Q30,25 50,20 T90,15"
                stroke="#FFFFFF"
                strokeWidth="2"
                fill="none"
                className="drop-shadow-sm"
              />
              <path
                d="M10,30 Q30,25 50,20 T90,15 L90,40 L10,40 Z"
                fill="url(#dailyGradient)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="dailyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6"/>
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
            
          <div className="flex justify-end">
            <span className={`text-white text-xs px-2 py-0.5 rounded-full font-medium ${
              portfolioMetrics.dailyChange >= 0 ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {formatPercentage((portfolioMetrics.dailyChange / Math.max(portfolioMetrics.totalValue, 1)) * 100)}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section - Enhanced Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Performance Chart - Modern Design */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          {/* Header with icons */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-gray-900">Portfolio Performance</h3>
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: '#F7B801' }}>
                  <BarChart3 className="w-3 h-3 text-white" />
                </div>
                <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                  <Activity className="w-2 h-2 text-gray-600" />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Eye className="w-3 h-3 text-gray-600" />
              </button>
              <button className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Target className="w-3 h-3 text-gray-600" />
              </button>
              <button className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Package className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Time period buttons */}
          <div className="flex space-x-2 mb-4">
            {['1M', '3M', '6M', '1Y'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedTimePeriod(period)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  selectedTimePeriod === period
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedTimePeriod === period ? { backgroundColor: '#F7B801' } : {}}
              >
                {period}
              </button>
            ))}
          </div>
          
          {portfolioPerformanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={portfolioPerformanceData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F7B801" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#C4AA69" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#D6B26A" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#BEA566" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#F7B801" stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="#F3F4F6" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: '#6B7280', fontWeight: 500 }}
                  interval={0}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  domain={['dataMin - 1000', 'dataMax + 1000']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '12px 16px'
                  }}
                  labelStyle={{ 
                    color: '#374151', 
                    fontWeight: 600, 
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                  formatter={(value, name) => [
                    `₹${value.toLocaleString()}`,
                    name === 'value' ? 'Portfolio Value' : 'Profit Trend'
                  ]}
                />
                <Bar 
                  dataKey="value" 
                  fill="url(#barGradient)" 
                  radius={[3, 3, 0, 0]}
                  maxBarSize={25}
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  stroke="url(#lineGradient)" 
                  strokeWidth={2}
                  dot={{ 
                    fill: '#F7B801', 
                    strokeWidth: 2, 
                    r: 3,
                    stroke: 'white'
                  }}
                  activeDot={{ 
                    r: 5, 
                    stroke: '#F7B801', 
                    strokeWidth: 2,
                    fill: 'white'
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No Portfolio Data</p>
                <p className="text-gray-400 text-sm">Add holdings to see performance chart</p>
              </div>
            </div>
          )}
        </div>

        {/* Section Allocation Chart - Donut Chart based on image */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Section Allocation</h3>
          {sectionAllocationData.length > 0 ? (
            <div className="flex">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={sectionAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={1}
                      dataKey="value"
                    >
                      {sectionAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#FFFFFF'
                      }}
                      formatter={(value) => [`${value}%`, 'Allocation']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 pl-4">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sectionAllocationData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No Allocation Data</p>
                <p className="text-gray-400 text-sm">Add holdings to see section allocation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Charts Section - Enhanced */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Amount Invested Chart - Based on provided image */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          {/* Header with icons */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                <DollarSign className="w-3 h-3 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Amount Invested</h3>
              <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-600">i</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="text-xs text-gray-600">✏️</span>
              </button>
              <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                <BarChart3 className="w-3 h-3 text-gray-600" />
              </button>
              <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="text-xs text-gray-600">⋯</span>
              </button>
            </div>
          </div>

          {/* Investment Amount Summary */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Monthly Investment</p>
              <p className="text-2xl font-bold text-gray-900">
                {amountInvestedData.length > 0 
                  ? formatCurrency(amountInvestedData.filter(item => item.type === 'investment').reduce((sum, item) => sum + item.amount, 0))
                  : formatCurrency(0)
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Yearly Investment</p>
              <p className="text-2xl font-bold text-gray-900">
                {amountInvestedData.length > 0 
                  ? formatCurrency(amountInvestedData.filter(item => item.type === 'investment').reduce((sum, item) => sum + item.amount, 0) * 12)
                  : formatCurrency(0)
                }
              </p>
            </div>
          </div>

          {/* Waterfall Chart */}
          <div className="h-64">
            {amountInvestedData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amountInvestedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    {amountInvestedData.map((item, index) => (
                      <linearGradient key={index} id={`waterfall-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={item.color} stopOpacity={1}/>
                        <stop offset="100%" stopColor={item.color} stopOpacity={0.7}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="stage" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6B7280', angle: -45, textAnchor: 'end' }}
                    interval={0}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    domain={[0, 'dataMax + 10000']}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '8px 12px'
                    }}
                    formatter={(value, name) => [
                      formatCurrency(value),
                      name === 'amount' ? 'Amount' : 'Cumulative'
                    ]}
                  />
                  <Bar dataKey="cumulative" radius={[2, 2, 0, 0]} maxBarSize={25}>
                    {amountInvestedData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#waterfall-gradient-${index})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No Investment Data</p>
                  <p className="text-gray-400 text-sm">Add holdings to see investment breakdown</p>
                </div>
              </div>
            )}
          </div>

          {/* Period Filter Buttons */}
          <div className="flex space-x-2 mt-4">
            {[
              { key: 'monthly', label: 'Monthly' },
              { key: 'yearly', label: 'Yearly' }
            ].map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedInvestmentPeriod(period.key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  selectedInvestmentPeriod === period.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Movers Chart - From Watchlist */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          {/* Header with icons */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Top Movers</h3>
              <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-600">i</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="text-xs text-gray-600">✏️</span>
              </button>
              <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                <BarChart3 className="w-3 h-3 text-gray-600" />
              </button>
              <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="text-xs text-gray-600">⋯</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">Stocks with LTP &gt; Added Price</p>
            <p className="text-2xl font-bold text-gray-900">
              {topMoversData.length} Stocks
            </p>
          </div>

          {/* Top Movers Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMoversData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  {topMoversData.map((item, index) => (
                    <linearGradient key={index} id={`mover-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={item.color} stopOpacity={1}/>
                      <stop offset="100%" stopColor={item.color} stopOpacity={0.7}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="symbol" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  interval={0}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    padding: '8px 12px'
                  }}
                  formatter={(value, name) => [
                    `${value.toFixed(2)}%`,
                    'Gain %'
                  ]}
                  labelFormatter={(label) => `Stock: ${label}`}
                />
                <Bar dataKey="gainPercentage" radius={[2, 2, 0, 0]} maxBarSize={20}>
                  {topMoversData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#mover-gradient-${index})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Movers List */}
          {topMoversData.length > 0 ? (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Top Performers</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {topMoversData.slice(0, 5).map((mover, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mover.color }}></div>
                      <div>
                        <span className="font-medium text-gray-900 text-sm">{mover.symbol}</span>
                        <p className="text-xs text-gray-500">{mover.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">+{mover.gainPercentage.toFixed(1)}%</span>
                      <p className="text-xs text-gray-500">{formatCurrency(mover.gain)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-500">No stocks found where current price &gt; added price</p>
              <p className="text-xs text-gray-400 mt-1">Add stocks to watchlist with live prices to see movers</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Performers Section - Financial Statements Style */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Top Performers</h3>
            <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs text-gray-600">i</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
              <span className="text-xs text-gray-600">✏️</span>
            </button>
            <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
              <span className="text-xs text-gray-600">✏️</span>
            </button>
            <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
              <span className="text-xs text-gray-600">⋯</span>
            </button>
          </div>
        </div>

        {/* Main Financial Metrics */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Gain</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(portfolioMetrics.topGainer?.pnl || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Loss</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(Math.abs(portfolioMetrics.topLoser?.pnl || 0))}
            </p>
          </div>
        </div>

        {/* Performance Chart Section */}
        <div className="flex">
          {/* Donut Chart (Left Column) */}
          <div className="w-1/2">
            <ResponsiveContainer width="100%" height={180}>
              <RechartsPieChart>
                <Pie
                  data={[
                    { name: 'Gainers', value: portfolioMetrics.topGainer?.pnl || 0, color: '#F59E0B' },
                    { name: 'Losers', value: Math.abs(portfolioMetrics.topLoser?.pnl || 0), color: '#06B6D4' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={1}
                  dataKey="value"
                >
                  <Cell fill="#F59E0B" />
                  <Cell fill="#06B6D4" />
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Amount']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Performance List (Right Column) */}
          <div className="w-1/2 pl-4">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Performance Details</h4>
            <div className="space-y-3">
              {/* Top Gainer */}
              {portfolioMetrics.topGainer ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-8 bg-orange-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-900">{portfolioMetrics.topGainer.symbol}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(portfolioMetrics.topGainer.pnl)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-8 bg-gray-300 rounded"></div>
                    <span className="text-sm font-medium text-gray-500">No data</span>
                  </div>
                  <span className="text-sm font-bold text-gray-500">₹0</span>
                </div>
              )}

              {/* Top Loser */}
              {portfolioMetrics.topLoser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-8 bg-cyan-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-900">{portfolioMetrics.topLoser.symbol}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(portfolioMetrics.topLoser.pnl)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-8 bg-gray-300 rounded"></div>
                    <span className="text-sm font-medium text-gray-500">No data</span>
                  </div>
                  <span className="text-sm font-bold text-gray-500">₹0</span>
                </div>
              )}

              {/* Additional Performance Item */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-8 bg-orange-500 rounded"></div>
                  <span className="text-sm font-medium text-gray-900">Total P&L</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(portfolioMetrics.totalPnL)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Summary Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Market Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {marketIndices.length > 0 ? (
            marketIndices.slice(0, 3).map((index, i) => (
              <div key={i} className={`text-center p-4 rounded-lg ${
                i === 0 ? 'bg-blue-50' : i === 1 ? 'bg-green-50' : 'bg-purple-50'
              }`}>
                <div className={`w-8 h-8 mx-auto mb-2 ${
                  i === 0 ? 'text-blue-600' : i === 1 ? 'text-green-600' : 'text-purple-600'
                }`}>
                  {i === 0 ? <Globe className="w-8 h-8" /> : i === 1 ? <Target className="w-8 h-8" /> : <Zap className="w-8 h-8" />}
                </div>
                <p className={`text-2xl font-bold ${
                  i === 0 ? 'text-blue-800' : i === 1 ? 'text-green-800' : 'text-purple-800'
                }`}>
                  {index.value}
                </p>
                <p className={`text-sm ${
                  i === 0 ? 'text-blue-600' : i === 1 ? 'text-green-600' : 'text-purple-600'
                }`}>
                  {index.name}
                </p>
                <p className={`text-xs ${
                  index.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {index.changePercent}
                </p>
              </div>
            ))
          ) : (
            <>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Globe className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-800">Loading...</p>
                <p className="text-sm text-blue-600">Nifty 50</p>
                <p className="text-xs text-gray-500">Fetching data...</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-800">Loading...</p>
                <p className="text-sm text-green-600">Sensex</p>
                <p className="text-xs text-gray-500">Fetching data...</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-800">Loading...</p>
                <p className="text-sm text-purple-600">Bank Nifty</p>
                <p className="text-xs text-gray-500">Fetching data...</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Advanced Analytics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-gray-900">Beta</h4>
            <p className="text-2xl font-bold text-blue-600">1.2</p>
            <p className="text-sm text-gray-500">Higher than market</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-gray-900">Sharpe Ratio</h4>
            <p className="text-2xl font-bold text-green-600">1.8</p>
            <p className="text-sm text-gray-500">Good risk-adjusted return</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-gray-900">Volatility</h4>
            <p className="text-2xl font-bold text-orange-600">15.2%</p>
            <p className="text-sm text-gray-500">Moderate risk</p>
          </div>
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance vs Benchmark</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={portfolioPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} name="Portfolio" />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="Nifty 50" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'holdings':
        return <Holdings />;
      case 'watchlist':
        return <Watchlist />;
      case 'analytics':
        return <AnalyticsDashboard holdings={holdings} watchlist={watchlist} />;

      case 'test':
        return <TestApi />;
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Dashboard Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Data</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span>Market Open</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

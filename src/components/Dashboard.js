import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, BarChart3, 
  PieChart, Activity, Target, Package, Eye,
  ArrowUpRight, ArrowDownRight, Users, Globe, Zap,
  ChevronUp, Database
} from 'lucide-react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);
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
  const [amountInvestedLineData, setAmountInvestedLineData] = useState([]);
  const [highlightLabel, setHighlightLabel] = useState('Sat');
  
  // Top performers chart state
  const [topPerformersData, setTopPerformersData] = useState([]);
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

  // Line series data for "Amount Invested" card (styled like the reference image)
  const generateAmountInvestedLineSeries = (period) => {
    const baseInvestment = portfolioMetrics.totalInvestment || 0;
    // Provide sensible defaults even if no data yet
    const nominal = baseInvestment > 0 ? baseInvestment : 50000;

    if (period === 'monthly') {
      // Weekly series Mon-Sun as in the screenshot
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      // Create a gentle upward line with a noticeable jump on Saturday
      return days.map((d, i) => ({
        day: d,
        value: Math.round(nominal * (0.7 + i * 0.05 + (d === 'Sat' ? 0.25 : 0)))
      }));
    } else {
      // Yearly: 7 points to keep the visual similar and compact
      const labels = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov', 'Dec'];
      return labels.map((label, i) => ({
        day: label,
        value: Math.round(nominal * (0.6 + i * 0.1))
      }));
    }
  };

  // Generate top performers data from watchlist strictly where LTP > priceAddedAt
  const generateTopPerformersData = (watchlistData) => {
    console.log('🔍 generateTopPerformersData called with:', watchlistData);
    
    if (!watchlistData || watchlistData.length === 0) {
      console.log('📈 No watchlist data available for top performers');
      return [];
    }

    // Flatten all stocks from all watchlists
    const allStocks = watchlistData.flatMap(watchlist => {
      console.log('🔍 Processing watchlist:', watchlist.name, 'stocks:', watchlist.stocks);
      return (watchlist.stocks || []).map(stock => ({
        ...stock,
        watchlistName: watchlist.name
      }));
    });

    console.log('📈 All stocks from watchlists:', allStocks.length, allStocks);

    // Helper: sanitize numeric input like "₹1,234.56" or strings with spaces
    const toNumber = (value) => {
      if (value === null || value === undefined) return NaN;
      const cleaned = String(value).replace(/[^0-9.\-]/g, '');
      if (cleaned.trim() === '') return NaN;
      return parseFloat(cleaned);
    };

    // Filter strictly: LTP > priceAddedAt, then compute gains
    const movers = allStocks
      .map(stock => {
        const ltp = toNumber(stock.lastPrice);
        const addedPrice = toNumber(stock.priceAddedAt);
        
        console.log(`🔍 Debug ${stock.symbol}: LTP=${ltp}, AddedPrice=${addedPrice}, RawLTP=${stock.lastPrice}, RawAddedPrice=${stock.priceAddedAt}`);
        
        if (isNaN(ltp) || isNaN(addedPrice) || addedPrice <= 0 || ltp <= addedPrice) {
          console.log(`❌ Filtered out ${stock.symbol}: LTP=${ltp}, AddedPrice=${addedPrice}, Valid=${!isNaN(ltp) && !isNaN(addedPrice) && addedPrice > 0 && ltp > addedPrice}`);
          return null;
        }
        
        const gain = ltp - addedPrice;
        const gainPercentage = (gain / addedPrice) * 100;
        console.log(`✅ Valid mover ${stock.symbol}: Gain=${gain}, Gain%=${gainPercentage}`);
        
        return {
          symbol: stock.symbol,
          name: stock.name,
          addedPrice,
          currentPrice: ltp,
          gain,
          gainPercentage,
          watchlistName: stock.watchlistName,
          color: '#10B981'
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.gainPercentage - a.gainPercentage)
      .slice(0, 8); // Top 8 movers

    console.log('📈 Top performers found:', movers.length, movers);
    return movers;
  };

  // Generate dynamic portfolio performance data when metrics change
  useEffect(() => {
    setPortfolioPerformanceData(generatePortfolioPerformanceData(selectedTimePeriod));
    setAmountInvestedData(generateAmountInvestedData(selectedInvestmentPeriod));
    setAmountInvestedLineData(generateAmountInvestedLineSeries(selectedInvestmentPeriod));
    // Keep highlight consistent with weekly example
    setHighlightLabel(selectedInvestmentPeriod === 'monthly' ? 'Sat' : 'Nov');
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
      console.log('👀 Watchlists data type:', typeof watchlistsData, 'isArray:', Array.isArray(watchlistsData));
      setWatchlist(Array.isArray(watchlistsData) ? watchlistsData : []);
      
      // Update watchlist stocks with live prices for accurate top performers calculation
      const enrichedWatchlists = await Promise.all(
        (watchlistsData || []).map(async (watchlist) => {
          console.log('🔍 Processing watchlist for enrichment:', watchlist.name, 'stocks count:', watchlist.stocks?.length);
          if (watchlist.stocks && watchlist.stocks.length > 0) {
            const updatedStocks = await smartApiService.updateStockPrices(watchlist.stocks, watchlist.id);
            console.log('🔍 Updated stocks for', watchlist.name, ':', updatedStocks);
            return { ...watchlist, stocks: updatedStocks };
          }
          return watchlist;
        })
      );
      
      console.log('🔍 Enriched watchlists:', enrichedWatchlists);
      
      // Generate top performers data with live prices
      const performersData = generateTopPerformersData(enrichedWatchlists);
      console.log('📈 Top performers data generated:', performersData);
      setTopPerformersData(performersData);
      
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
        {/* Portfolio Value Card */}
        <div className="rounded-3xl shadow-lg p-4 relative overflow-hidden" style={{
          backgroundColor: '#d81159'
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
            
        {/* Total Invested Card */}
        <div className="rounded-3xl shadow-lg p-4 relative overflow-hidden" style={{ backgroundColor: '#0063FF' }}>
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
            
        {/* Total P&L Card */}
        <div className="rounded-3xl shadow-lg p-4 relative overflow-hidden" style={{ backgroundColor: '#FCBA22' }}>
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

        {/* Daily Change Card */}
        <div className="rounded-3xl shadow-lg p-4 relative overflow-hidden" style={{ backgroundColor: '#C80036' }}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Portfolio Performance Chart - Modern Design */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
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
            <div style={{ height: '200px' }}>
                <Line 
                data={{
                  labels: portfolioPerformanceData.map(item => item.month),
                  datasets: [
                    {
                      label: 'Portfolio Value',
                      data: portfolioPerformanceData.map(item => item.value),
                      borderColor: '#F7B801',
                      backgroundColor: 'rgba(247, 184, 1, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: '#F7B801',
                      pointBorderColor: '#ffffff',
                      pointBorderWidth: 2,
                      pointRadius: 5,
                      pointHoverRadius: 7,
                    },
                    {
                      label: 'Profit Trend',
                      data: portfolioPerformanceData.map(item => item.trend),
                      borderColor: '#BEA566',
                      backgroundColor: 'rgba(190, 165, 102, 0.1)',
                      borderWidth: 2,
                      fill: false,
                      tension: 0.4,
                      pointBackgroundColor: '#BEA566',
                      pointBorderColor: '#ffffff',
                      pointBorderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                          size: 12,
                          weight: '500'
                        }
                      }
                    },
                    tooltip: {
                      backgroundColor: 'white',
                      titleColor: '#374151',
                      bodyColor: '#6B7280',
                      borderColor: '#E5E7EB',
                      borderWidth: 1,
                      cornerRadius: 12,
                      displayColors: true,
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString()}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        color: '#6B7280',
                        font: {
                          size: 12,
                          weight: '500'
                        }
                      }
                    },
                    y: {
                      grid: {
                        color: '#F3F4F6',
                        drawBorder: false
                      },
                      ticks: {
                        color: '#9CA3AF',
                        font: {
                          size: 12
                        },
                        callback: function(value) {
                          return `₹${(value / 1000).toFixed(0)}K`;
                        }
                      }
                    }
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index'
                  }
                }}
              />
            </div>
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Section Allocation</h3>
          {sectionAllocationData.length > 0 ? (
            <div className="flex">
              <div className="w-1/2">
                <div style={{ height: '160px' }}>
                  <Doughnut
                    data={{
                      labels: sectionAllocationData.map(item => item.name),
                      datasets: [{
                        data: sectionAllocationData.map(item => item.value),
                        backgroundColor: sectionAllocationData.map(item => item.color),
                        borderWidth: 0,
                        cutout: '60%'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                        backgroundColor: '#1F2937',
                          titleColor: '#FFFFFF',
                          bodyColor: '#FFFFFF',
                          borderColor: 'transparent',
                          cornerRadius: 8,
                          callbacks: {
                            label: function(context) {
                              return `${context.label}: ${context.parsed}%`;
                            }
                          }
                        }
                      },
                      cutout: '60%'
                    }}
                  />
                </div>
              </div>
              <div className="w-1/2 pl-4">
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {sectionAllocationData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Amount Invested Chart - Styled like reference (red line) */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          {/* Header with icons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Amount Invested</h3>
                <p className="text-sm text-gray-500">Investment trend over time</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="text-sm text-gray-600">✏️</span>
              </button>
              <button className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <BarChart3 className="w-4 h-4 text-gray-600" />
              </button>
              <button className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="text-sm text-gray-600">⋯</span>
              </button>
            </div>
          </div>

          {/* Investment Amount Summary */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-2">Total Invested</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(portfolioMetrics.totalInvestment)}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-green-600 font-medium">+1.25%</span>
                <TrendingUp className="w-4 h-4 text-green-600 ml-1" />
            </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-2">Current Value</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(portfolioMetrics.totalValue)}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-green-600 font-medium">+2.4%</span>
                <TrendingUp className="w-4 h-4 text-green-600 ml-1" />
              </div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="h-48">
            {amountInvestedLineData.length > 0 ? (
              <Line
                data={{
                  labels: amountInvestedLineData.map(item => item.day),
                  datasets: [{
                    label: 'Amount Invested',
                    data: amountInvestedLineData.map(item => item.value),
                    borderColor: '#ff4d5a',
                    backgroundColor: 'rgba(255, 77, 90, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ff4d5a',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#ff4d5a',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: 'white',
                      titleColor: '#374151',
                      bodyColor: '#6B7280',
                      borderColor: '#E5E7EB',
                      borderWidth: 1,
                      cornerRadius: 12,
                      displayColors: true,
                      callbacks: {
                        label: function(context) {
                          return `Amount Invested: ${formatCurrency(context.parsed.y)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        color: '#6B7280',
                        font: {
                          size: 14,
                          weight: '500'
                        }
                      }
                    },
                    y: {
                      grid: {
                        color: '#F3F4F6',
                        drawBorder: false
                      },
                      ticks: {
                        color: '#9CA3AF',
                        font: {
                          size: 14,
                          weight: '500'
                        },
                        callback: function(value) {
                          return `₹${(value / 1000).toFixed(0)}K`;
                        }
                      }
                    }
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index'
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No Investment Data</p>
                  <p className="text-gray-400 text-sm">Add holdings to see investment trend</p>
                </div>
              </div>
            )}
          </div>

          {/* Period Filter Buttons */}
          <div className="flex space-x-3 mt-6">
            {[
              { key: 'monthly', label: 'Monthly' },
              { key: 'yearly', label: 'Yearly' }
            ].map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedInvestmentPeriod(period.key)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  selectedInvestmentPeriod === period.key
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Performers from Watchlist */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          {/* Header with icons */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
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
                <BarChart3 className="w-3 h-3 text-gray-600" />
              </button>
              <button className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="text-xs text-gray-600">⋯</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">Best performing stocks from watchlist</p>
            <p className="text-2xl font-bold text-gray-900">
              {topPerformersData.length} Stocks
            </p>
          </div>

          {/* Top Performers List */}
          {topPerformersData.length > 0 ? (
            <div className="space-y-3">
              {topPerformersData.slice(0, 10).map((mover, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">#{index + 1}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{mover.symbol}</span>
                      <p className="text-xs text-gray-500">{mover.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600">+{mover.gainPercentage.toFixed(1)}%</span>
                    <p className="text-xs text-gray-500">{formatCurrency(mover.gain)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm">No top performers found</p>
              <p className="text-xs text-gray-400 mt-1">Add stocks to your watchlist to see top performers</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Performers Section - Financial Statements Style */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
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
        <div className="grid grid-cols-2 gap-8 mb-8">
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
            <div style={{ height: '140px' }}>
              <Doughnut
                data={{
                  labels: ['Gainers', 'Losers'],
                  datasets: [{
                    data: [
                      portfolioMetrics.topGainer?.pnl || 0,
                      Math.abs(portfolioMetrics.topLoser?.pnl || 0)
                    ],
                    backgroundColor: ['#F59E0B', '#06B6D4'],
                    borderWidth: 0,
                    cutout: '70%'
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                    backgroundColor: '#1F2937',
                      titleColor: '#FFFFFF',
                      bodyColor: '#FFFFFF',
                      borderColor: 'transparent',
                      cornerRadius: 8,
                      callbacks: {
                        label: function(context) {
                          return `${context.label}: ${formatCurrency(context.parsed)}`;
                        }
                      }
                    }
                  },
                  cutout: '70%'
                }}
              />
            </div>
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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
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
    <div style={{ backgroundColor: '#F3F8FF' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Dashboard Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
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

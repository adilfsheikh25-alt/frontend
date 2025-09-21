import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './NewsPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const NewsPage = () => {
    const [currentCategory, setCurrentCategory] = useState('latest');
    const [newsData, setNewsData] = useState({
        latest: [],
        stocks: [],
        corporate: [],
        earnings: [],
        orders: [],
        global: [],
        markets: [],
        ipo: [],
        portfolio: []
    });
    const [marketIndices, setMarketIndices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchNews = useCallback(async (category) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/news/${category}`);
            setNewsData(prev => ({ ...prev, [category]: response.data }));
        } catch (err) {
            console.error(`Error fetching ${category} news:`, err);
            setError(`Failed to load ${category} news.`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchMarketIndices = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/market-indices`);
            setMarketIndices(response.data);
        } catch (err) {
            console.error('Error fetching market indices:', err);
            setError('Failed to load market indices.');
        }
    }, []);

    useEffect(() => {
        fetchMarketIndices();
        fetchNews(currentCategory);

        const interval = setInterval(() => {
            fetchMarketIndices();
            fetchNews(currentCategory);
        }, 300000); // Refresh every 5 minutes

        return () => clearInterval(interval);
    }, [fetchNews, fetchMarketIndices, currentCategory]);

    const handleCategoryChange = (category) => {
        setCurrentCategory(category);
        if (newsData[category].length === 0) {
            fetchNews(category);
        }
    };

    const filteredNews = newsData[currentCategory].filter(news =>
        news.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        news.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const createNewsItem = (news) => {
        const stockDataHtml = news.stockData ? (
            <div className="stock-data">
                <span className="stock-symbol">{news.stockData.symbol}</span>
                <span className={`stock-price ${news.stockData.isPositive ? '' : 'negative'}`}>{news.stockData.price}</span>
                <span className={`stock-change ${news.stockData.isPositive ? 'positive' : 'negative'}`}>
                    <i className={`fas fa-arrow-${news.stockData.isPositive ? 'up' : 'down'}`}></i>
                    {news.stockData.change}
                </span>
            </div>
        ) : null;

        const imageHtml = news.image ? (
            <img src={news.image} alt={news.title} className="news-image" onError={(e) => e.target.style.display = 'none'} />
        ) : null;

        const titleHtml = news.link ? (
            <h3 className="news-title">
                <a href={news.link} target="_blank" rel="noopener noreferrer">{news.title}</a>
            </h3>
        ) : (
            <h3 className="news-title">{news.title}</h3>
        );

        return (
            <div className="news-item" key={news.id || news.title} data-category={news.category}>
                <div className="news-item-header">
                    {titleHtml}
                    <span className="news-time">{news.time}</span>
                </div>
                {imageHtml}
                <p className="news-description">{news.description}</p>
                {stockDataHtml}
            </div>
        );
    };

    return (
        <div className="news-scraper-container">
            <header className="header">
                <div className="logo">Financial News</div>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search news..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button onClick={() => fetchNews(currentCategory)}><i className="fas fa-sync-alt"></i> Refresh</button>
                </div>
            </header>

            <div className="market-indices">
                <div className="indices-container">
                    {marketIndices.map((index, i) => (
                        <div className="index-item" key={i}>
                            <span className="index-name">{index.name}</span>
                            <span className="index-value">{index.value}</span>
                            <span className={`index-change ${index.isPositive ? 'positive' : 'negative'}`}>
                                {index.change} ({index.changePercent})
                            </span>
                            <i className={`fas fa-arrow-${index.isPositive ? 'up' : 'down'} trend-icon ${index.isPositive ? 'positive' : 'negative'}`}></i>
                        </div>
                    ))}
                </div>
            </div>

            <nav className="news-categories">
                {['latest', 'stocks', 'corporate', 'earnings', 'orders', 'global', 'markets', 'ipo'].map(category => (
                    <button
                        key={category}
                        className={`news-tab ${currentCategory === category ? 'active' : ''}`}
                        onClick={() => handleCategoryChange(category)}
                    >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                ))}
            </nav>

            <main className="news-content">
                <section className="latest-market-updates">
                    <h2>Latest Market Updates</h2>
                    {isLoading && <div className="loading-spinner"></div>}
                    {error && <div className="error-message">{error}</div>}
                    <div className="news-list">
                        {filteredNews.length > 0 ? (
                            filteredNews.map(createNewsItem)
                        ) : (
                            !isLoading && <p>No news found for this category.</p>
                        )}
                    </div>
                </section>

                <section className="portfolio-news">
                    <h2>Portfolio News</h2>
                    <button className="refresh-button" onClick={() => fetchNews('portfolio')}>
                        <i className="fas fa-sync-alt"></i> Refresh
                    </button>
                    {isLoading && <div className="loading-spinner"></div>}
                    {error && <div className="error-message">{error}</div>}
                    <div className="news-list">
                        {newsData.portfolio.length > 0 ? (
                            newsData.portfolio.map(createNewsItem)
                        ) : (
                            !isLoading && <p>No portfolio news found.</p>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default NewsPage;


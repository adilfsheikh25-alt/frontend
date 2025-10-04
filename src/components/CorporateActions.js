import React, { useState } from 'react';
import { API_CONFIG } from '../config/api';

const CorporateActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');

  const handleScrape = async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_CONFIG.BACKEND.BASE_URL.replace(/\/$/, '')}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          options: { 
            maxAge: 0,
            forceRefresh: forceRefresh
          } 
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setEvents(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType) => {
    const iconStyle = { width: '16px', height: '16px', marginRight: '4px', display: 'inline-block' };
    
    switch (eventType.toLowerCase()) {
      case 'dividend':
        return <img src="/icons/dividend.svg" alt="Dividend" style={iconStyle} />;
      case 'split':
        return <img src="/icons/split.svg" alt="Split" style={iconStyle} />;
      case 'bonus':
        return <img src="/icons/bonus.svg" alt="Bonus" style={iconStyle} />;
      default:
        return <span style={{ width: '16px', height: '16px', marginRight: '4px', display: 'inline-block' }}>📊</span>;
    }
  };

  const filteredEvents = filter === 'all' ? events : events.filter(event => 
    event.event_type.toLowerCase() === filter.toLowerCase()
  );

  return (
    <div className="p-4 bg-white min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Corporate Actions</h1>
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Events</option>
            <option value="dividend">Dividend</option>
            <option value="split">Split</option>
            <option value="bonus">Bonus</option>
            <option value="stock result">Stock Result</option>
          </select>
          <button
            onClick={() => handleScrape(false)}
            className="px-4 py-2 rounded text-white"
            style={{ backgroundColor: '#004c4c' }}
            disabled={loading}
          >
            {loading ? 'Fetching...' : 'Fetch Latest'}
          </button>
          <button
            onClick={() => handleScrape(true)}
            className="px-4 py-2 rounded text-white"
            style={{ backgroundColor: '#059669' }}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Force Refresh'}
          </button>
        </div>
      </div>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="overflow-auto max-h-96">
          <table className="min-w-full">
            <thead style={{ backgroundColor: '#FFFBF8' }} className="sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Stock Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Event</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">LTP (1D Change%)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((e, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{e.announcement_date || ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{e.company || ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center">
                      {getEventIcon(e.event_type)}
                      {e.event_type || ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{e.ltp || ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{e.details || ''}</td>
                </tr>
              ))}
              {!loading && filteredEvents.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-gray-500 text-center" colSpan={5}>
                    {events.length === 0 ? 'No data. Click Fetch Latest.' : `No ${filter} events found.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredEvents.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
            Showing {filteredEvents.length} of {events.length} events
            {filter !== 'all' && ` (filtered by ${filter})`}
          </div>
        )}
      </div>
    </div>
  );
};

export default CorporateActions;









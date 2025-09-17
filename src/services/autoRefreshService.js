// Auto-refresh service for continuous LTP price updates
class AutoRefreshService {
  constructor() {
    this.intervals = new Map(); // Store intervals for different components
    this.settings = this.loadSettings();
    this.callbacks = new Map(); // Store refresh callbacks for different components
  }

  // Load settings from localStorage
  loadSettings() {
    const defaultSettings = {
      enabled: false,
      interval: 10, // seconds
      intervals: [5, 10, 20, 30, 60] // available intervals
    };

    try {
      const stored = localStorage.getItem('autoRefreshSettings');
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading auto-refresh settings:', error);
    }

    return defaultSettings;
  }

  // Save settings to localStorage
  saveSettings() {
    try {
      localStorage.setItem('autoRefreshSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving auto-refresh settings:', error);
    }
  }

  // Update settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    // Restart auto-refresh if enabled and interval changed
    if (this.settings.enabled) {
      this.stopAll();
      this.startAll();
    }
  }

  // Register a component for auto-refresh
  register(componentId, refreshCallback) {
    this.callbacks.set(componentId, refreshCallback);
    
    // Start auto-refresh if enabled
    if (this.settings.enabled) {
      this.start(componentId);
    }
  }

  // Unregister a component
  unregister(componentId) {
    this.stop(componentId);
    this.callbacks.delete(componentId);
  }

  // Start auto-refresh for a specific component
  start(componentId) {
    if (!this.settings.enabled || !this.callbacks.has(componentId)) {
      return;
    }

    // Clear existing interval for this component
    this.stop(componentId);

    const intervalMs = this.settings.interval * 1000;
    const intervalId = setInterval(async () => {
      try {
        console.log(`🔄 Auto-refresh: Triggering refresh for ${componentId}`);
        const callback = this.callbacks.get(componentId);
        if (callback) {
          await callback();
          console.log(`✅ Auto-refresh: Successfully completed refresh for ${componentId}`);
        } else {
          console.warn(`⚠️ Auto-refresh: No callback found for ${componentId}`);
        }
      } catch (error) {
        console.error(`❌ Auto-refresh error for ${componentId}:`, error);
      }
    }, intervalMs);

    this.intervals.set(componentId, intervalId);
    console.log(`Auto-refresh started for ${componentId} (${this.settings.interval}s interval)`);
  }

  // Stop auto-refresh for a specific component
  stop(componentId) {
    const intervalId = this.intervals.get(componentId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(componentId);
      console.log(`Auto-refresh stopped for ${componentId}`);
    }
  }

  // Start auto-refresh for all registered components
  startAll() {
    if (!this.settings.enabled) {
      return;
    }

    for (const componentId of this.callbacks.keys()) {
      this.start(componentId);
    }
  }

  // Stop auto-refresh for all components
  stopAll() {
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId);
    }
    this.intervals.clear();
    console.log('All auto-refresh stopped');
  }

  // Toggle auto-refresh on/off
  toggle() {
    this.settings.enabled = !this.settings.enabled;
    this.saveSettings();

    if (this.settings.enabled) {
      this.startAll();
    } else {
      this.stopAll();
    }

    return this.settings.enabled;
  }

  // Get current settings
  getSettings() {
    return { ...this.settings };
  }

  // Get available intervals
  getAvailableIntervals() {
    return [...this.settings.intervals];
  }

  // Check if auto-refresh is enabled
  isEnabled() {
    return this.settings.enabled;
  }

  // Get current interval in seconds
  getInterval() {
    return this.settings.interval;
  }

  // Get time until next refresh (approximate)
  getTimeUntilNextRefresh() {
    if (!this.settings.enabled || this.intervals.size === 0) {
      return 0;
    }
    
    // This is an approximation since we don't track exact timing
    // In a real implementation, you might want to track start times
    return this.settings.interval;
  }
}

// Create singleton instance
const autoRefreshService = new AutoRefreshService();

export default autoRefreshService;

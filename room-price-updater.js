// Enhanced Room Price Updater with Real-time Updates
class RoomPriceUpdater {
  constructor(roomType) {
    this.roomType = roomType;
    this.lastUpdateTimestamp = 0;
    this.storageKey = 'methodsRoomPrices';
    this.roomStorageKey = `${roomType}RoomPrices`;
    this.updateInterval = null;
    this.init();
  }

  init() {
    console.log(`Initializing price updater for ${this.roomType} room`);
    
    // Initial price update
    this.updatePricesOnPage();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start periodic checking
    this.startPeriodicCheck();
  }

  setupEventListeners() {
    // Listen for storage changes (cross-tab updates)
    window.addEventListener('storage', (e) => {
      if (e.key === this.roomStorageKey || e.key === this.storageKey) {
        console.log(`Storage change detected for ${this.roomType}`);
        this.updatePricesOnPage();
      }
    });
    
    // Listen for custom price update events (same-tab updates)
    window.addEventListener('priceUpdate', (e) => {
      if (e.detail.roomType === this.roomType) {
        console.log(`Price update event received for ${this.roomType}`);
        this.updatePricesFromEvent(e.detail);
      }
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible, check for updates
        this.checkForUpdates();
      }
    });
  }

  startPeriodicCheck() {
    // Check for updates every 3 seconds
    this.updateInterval = setInterval(() => {
      this.checkForUpdates();
    }, 3000);
  }

  checkForUpdates() {
    try {
      const roomPriceData = localStorage.getItem(this.roomStorageKey);
      if (roomPriceData) {
        const data = JSON.parse(roomPriceData);
        if (data.timestamp && data.timestamp > this.lastUpdateTimestamp) {
          console.log(`New price data detected for ${this.roomType}`);
          this.updatePricesOnPage();
          this.lastUpdateTimestamp = data.timestamp;
        }
      }
    } catch (error) {
      console.error('Error checking for price updates:', error);
    }
  }

  updatePricesFromEvent(eventData) {
    try {
      const prices = eventData.prices;
      if (prices && prices.morning && prices.evening) {
        this.updateMorningPrices(prices.morning);
        this.updateEveningPrices(prices.evening);
        this.updateMainPrice(prices.morning.hourly);
        this.lastUpdateTimestamp = eventData.timestamp;
        
        // Show update notification
        this.showUpdateNotification('Prices updated from admin panel!');
        
        console.log(`Prices updated from event for ${this.roomType}:`, prices);
      }
    } catch (error) {
      console.error('Error updating prices from event:', error);
    }
  }

  updatePricesOnPage() {
    try {
      let prices = null;
      
      // Try to get room-specific data first
      const roomPriceData = localStorage.getItem(this.roomStorageKey);
      if (roomPriceData) {
        const data = JSON.parse(roomPriceData);
        if (data.morning && data.evening) {
          prices = {
            morning: data.morning,
            evening: data.evening
          };
          this.lastUpdateTimestamp = data.timestamp || Date.now();
        }
      }
      
      // Fallback to general price data
      if (!prices) {
        const generalPriceData = localStorage.getItem(this.storageKey);
        if (generalPriceData) {
          const allPrices = JSON.parse(generalPriceData);
          if (allPrices.prices && allPrices.prices[this.roomType]) {
            prices = allPrices.prices[this.roomType];
          }
        }
      }

      // Apply default prices if nothing found
      if (!prices) {
        prices = this.getDefaultPrices();
      }

      if (prices && prices.morning && prices.evening) {
        this.updateMorningPrices(prices.morning);
        this.updateEveningPrices(prices.evening);
        this.updateMainPrice(prices.morning.hourly);
        
        console.log(`Prices updated for ${this.roomType} room:`, prices);
      }
    } catch (error) {
      console.error('Error updating room prices:', error);
      // Apply default prices on error
      const defaultPrices = this.getDefaultPrices();
      this.updateMorningPrices(defaultPrices.morning);
      this.updateEveningPrices(defaultPrices.evening);
      this.updateMainPrice(defaultPrices.morning.hourly);
    }
  }

  updateMorningPrices(morningPrices) {
    if (!morningPrices) return;

    // Update morning rates display
    const morningContent = document.getElementById('morning');
    if (morningContent) {
      const ratesDiv = morningContent.querySelector('.rates');
      if (ratesDiv) {
        ratesDiv.innerHTML = `
          <div>Hourly: EGP ${this.formatPrice(morningPrices.hourly)}</div>
          <div>Daily: EGP ${this.formatPrice(morningPrices.daily)}</div>
          <div>Monthly: EGP ${this.formatPrice(morningPrices.monthly)}</div>
        `;
      }
    }

    // Update individual span elements (fallback)
    this.updateSpanElement('.morning-hourly', morningPrices.hourly);
    this.updateSpanElement('.morning-daily', morningPrices.daily);
    this.updateSpanElement('.morning-monthly', morningPrices.monthly);
  }

  updateEveningPrices(eveningPrices) {
    if (!eveningPrices) return;

    // Update evening rates display
    const eveningContent = document.getElementById('evening');
    if (eveningContent) {
      const ratesDiv = eveningContent.querySelector('.rates');
      if (ratesDiv) {
        ratesDiv.innerHTML = `
          <div>Hourly: EGP ${this.formatPrice(eveningPrices.hourly)}</div>
          <div>Daily: EGP ${this.formatPrice(eveningPrices.daily)}</div>
          <div>Monthly: EGP ${this.formatPrice(eveningPrices.monthly)}</div>
        `;
      }
    }

    // Update individual span elements (fallback)
    this.updateSpanElement('.evening-hourly', eveningPrices.hourly);
    this.updateSpanElement('.evening-daily', eveningPrices.daily);
    this.updateSpanElement('.evening-monthly', eveningPrices.monthly);
  }

  updateSpanElement(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = this.formatPrice(value);
    }
  }

  updateMainPrice(hourlyPrice) {
    if (!hourlyPrice) return;

    // Update the main price display
    const priceElement = document.querySelector('.price');
    if (priceElement) {
      priceElement.textContent = `EGP ${this.formatPrice(hourlyPrice)} / hour`;
    }
  }

  getDefaultPrices() {
    const defaultPrices = {
      training: {
        morning: { hourly: 100, daily: 800, monthly: 18000 },
        evening: { hourly: 120, daily: 900, monthly: 20000 }
      },
      private: {
        morning: { hourly: 80, daily: 600, monthly: 15000 },
        evening: { hourly: 100, daily: 750, monthly: 18000 }
      },
      meeting: {
        morning: { hourly: 150, daily: 1200, monthly: 25000 },
        evening: { hourly: 180, daily: 1400, monthly: 30000 }
      }
    };

    return defaultPrices[this.roomType] || defaultPrices.training;
  }
  
  formatPrice(price) {
    if (typeof price !== 'number') return '0';
    return new Intl.NumberFormat('en-US').format(price);
  }
  
  showUpdateNotification(message = 'Prices updated!') {
    // Remove existing notification
    const existingNotification = document.querySelector('.price-update-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'price-update-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
      animation: slideInRight 0.3s ease-out;
      font-size: 14px;
      max-width: 300px;
    `;
    
    // Add animation keyframes
    if (!document.querySelector('#price-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'price-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after 4 seconds with animation
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  // Cleanup method
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    window.removeEventListener('storage', this.handleStorageChange);
    window.removeEventListener('priceUpdate', this.handlePriceUpdate);
  }
}

// Enhanced initialization with better room type detection
document.addEventListener('DOMContentLoaded', () => {
  let roomType = null;
  
  // Multiple ways to detect room type
  const currentPage = window.location.pathname.toLowerCase();
  const pageTitle = document.title.toLowerCase();
  const h1Text = document.querySelector('h1')?.textContent.toLowerCase() || '';
  
  // Check URL patterns first
  if (currentPage.includes('room_one') || currentPage.includes('amoun')) {
    roomType = 'training';
  } else if (currentPage.includes('room_two') || currentPage.includes('horus')) {
    roomType = 'private';
  } else if (currentPage.includes('room_three') || currentPage.includes('isis')) {
    roomType = 'meeting';
  }
  
  // Check page content if URL detection failed
  if (!roomType) {
    if (h1Text.includes('amoun') || pageTitle.includes('training')) {
      roomType = 'training';
    } else if (h1Text.includes('horus') || pageTitle.includes('private')) {
      roomType = 'private';
    } else if (h1Text.includes('isis') || pageTitle.includes('meeting')) {
      roomType = 'meeting';
    }
  }
  
  // Check for specific room names in content
  if (!roomType) {
    const bodyText = document.body.textContent.toLowerCase();
    if (bodyText.includes('amoun room')) {
      roomType = 'training';
    } else if (bodyText.includes('horus room')) {
      roomType = 'private';
    } else if (bodyText.includes('isis room')) {
      roomType = 'meeting';
    }
  }
  
  if (roomType) {
    console.log(`Initializing price updater for ${roomType} room`);
    window.roomPriceUpdater = new RoomPriceUpdater(roomType);
  } else {
    console.warn('Could not detect room type for price updates. Available elements:', {
      currentPage,
      pageTitle,
      h1Text,
      bodyText: document.body.textContent.substring(0, 200)
    });
  }
});

// Export for manual initialization if needed
window.RoomPriceUpdater = RoomPriceUpdater;
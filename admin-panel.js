class AdminPanel {
  constructor() {
    this.storageKey = 'methodsRoomPrices';
    this.backupKey = 'methodsRoomPricesBackup';
    this.version = '2.1';
    this.priceData = this.loadPriceData();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadCurrentPrices();
    this.displayWelcomeMessage();
    this.displayDataStats();
    this.createInitialBackup();
  }

  setupEventListeners() {
    // Individual room update buttons
    document.querySelectorAll('.btn-update').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const roomType = e.target.getAttribute('data-room');
        this.updateRoomPrices(roomType);
      });
    });

    // Bulk actions
    const saveAllBtn = document.getElementById('save-all-btn');
    if (saveAllBtn) {
      saveAllBtn.addEventListener('click', () => this.saveAllChanges());
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetToDefaults());
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => this.importData(e));
    }

    // Auto-save on input change (debounced)
    document.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('input', this.debounce(() => {
        this.autoSave();
      }, 2000));
    });
  }

  loadPriceData() {
    try {
      const savedData = localStorage.getItem(this.storageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.version && parsed.prices) {
          return parsed.prices;
        }
      }
    } catch (error) {
      console.error('Error loading price data:', error);
    }

    // Return default prices if no saved data
    return this.getDefaultPrices();
  }

  getDefaultPrices() {
    return {
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
  }

  loadCurrentPrices() {
    // Populate form fields with current prices
    Object.keys(this.priceData).forEach(roomType => {
      Object.keys(this.priceData[roomType]).forEach(timeSlot => {
        Object.keys(this.priceData[roomType][timeSlot]).forEach(duration => {
          const inputId = `${roomType}-${timeSlot}-${duration}`;
          const input = document.getElementById(inputId);
          if (input) {
            input.value = this.priceData[roomType][timeSlot][duration];
          }
        });
      });
    });
  }

  updateRoomPrices(roomType) {
    const btn = document.querySelector(`[data-room="${roomType}"]`);
    if (!btn) return;

    btn.classList.add('loading');
    btn.textContent = 'Updating...';

    setTimeout(() => {
      try {
        // Collect all prices for this room
        const roomPrices = {
          morning: {
            hourly: parseInt(document.getElementById(`${roomType}-morning-hourly`).value) || 0,
            daily: parseInt(document.getElementById(`${roomType}-morning-daily`).value) || 0,
            monthly: parseInt(document.getElementById(`${roomType}-morning-monthly`).value) || 0
          },
          evening: {
            hourly: parseInt(document.getElementById(`${roomType}-evening-hourly`).value) || 0,
            daily: parseInt(document.getElementById(`${roomType}-evening-daily`).value) || 0,
            monthly: parseInt(document.getElementById(`${roomType}-evening-monthly`).value) || 0
          }
        };

        // Validate prices
        if (this.validatePrices(roomPrices)) {
          // Update local data
          this.priceData[roomType] = roomPrices;
          
          // Save to localStorage with proper structure
          this.savePriceData();
          
          // Update room pages immediately
          this.updateRoomPages(roomType, roomPrices);
          
          // Trigger cross-tab updates
          this.broadcastPriceUpdate(roomType, roomPrices);
          
          this.showSuccess(`${this.getRoomDisplayName(roomType)} prices updated successfully!`);
          this.displayDataStats();
        } else {
          throw new Error('Invalid price values');
        }
      } catch (error) {
        this.showError('Failed to update prices. Please check your values.');
        console.error('Price update error:', error);
      } finally {
        btn.classList.remove('loading');
        btn.textContent = 'Update Prices';
      }
    }, 800);
  }

  saveAllChanges() {
    const saveBtn = document.getElementById('save-all-btn');
    if (!saveBtn) return;

    saveBtn.classList.add('loading');
    saveBtn.textContent = 'Saving...';

    setTimeout(() => {
      try {
        let hasChanges = false;

        // Collect all current form values
        Object.keys(this.priceData).forEach(roomType => {
          const roomPrices = {
            morning: {
              hourly: parseInt(document.getElementById(`${roomType}-morning-hourly`).value) || 0,
              daily: parseInt(document.getElementById(`${roomType}-morning-daily`).value) || 0,
              monthly: parseInt(document.getElementById(`${roomType}-morning-monthly`).value) || 0
            },
            evening: {
              hourly: parseInt(document.getElementById(`${roomType}-evening-hourly`).value) || 0,
              daily: parseInt(document.getElementById(`${roomType}-evening-daily`).value) || 0,
              monthly: parseInt(document.getElementById(`${roomType}-evening-monthly`).value) || 0
            }
          };

          if (this.validatePrices(roomPrices)) {
            // Check if prices actually changed
            if (JSON.stringify(this.priceData[roomType]) !== JSON.stringify(roomPrices)) {
              this.priceData[roomType] = roomPrices;
              this.updateRoomPages(roomType, roomPrices);
              this.broadcastPriceUpdate(roomType, roomPrices);
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          this.savePriceData();
          this.showSuccess('All room prices updated successfully!');
          this.displayDataStats();
        } else {
          this.showSuccess('No changes detected.');
        }
      } catch (error) {
        this.showError('Failed to save all changes.');
        console.error('Bulk save error:', error);
      } finally {
        saveBtn.classList.remove('loading');
        saveBtn.textContent = 'Save All Changes';
      }
    }, 1500);
  }

  resetToDefaults() {
    if (confirm('Are you sure you want to reset all prices to default values? This action cannot be undone.')) {
      // Reset to default prices
      this.priceData = this.getDefaultPrices();
      
      // Update form fields
      this.loadCurrentPrices();
      
      // Save to storage
      this.savePriceData();
      
      // Update all room pages
      Object.keys(this.priceData).forEach(roomType => {
        this.updateRoomPages(roomType, this.priceData[roomType]);
        this.broadcastPriceUpdate(roomType, this.priceData[roomType]);
      });

      this.showSuccess('All prices reset to default values!');
      this.displayDataStats();
    }
  }

  validatePrices(roomPrices) {
    // Validate that all prices are positive numbers
    for (const timeSlot of Object.keys(roomPrices)) {
      for (const duration of Object.keys(roomPrices[timeSlot])) {
        const price = roomPrices[timeSlot][duration];
        if (isNaN(price) || price < 0) {
          return false;
        }
      }
    }
    return true;
  }

  savePriceData() {
    try {
      const dataToSave = {
        prices: this.priceData,
        version: this.version,
        lastUpdated: new Date().toISOString(),
        timestamp: Date.now(),
        updatedBy: this.getAdminUsername()
      };

      // Save main data
      localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
      
      // Save individual room data for quick access
      Object.keys(this.priceData).forEach(roomType => {
        const roomData = {
          ...this.priceData[roomType],
          lastUpdated: dataToSave.lastUpdated,
          timestamp: dataToSave.timestamp,
          roomType: roomType,
          updatedBy: dataToSave.updatedBy
        };
        localStorage.setItem(`${roomType}RoomPrices`, JSON.stringify(roomData));
      });

      // Create backup
      this.createBackup();
      
      return true;
    } catch (error) {
      console.error('Error saving price data:', error);
      return false;
    }
  }

  updateRoomPages(roomType, roomPrices) {
    // Store individual room data with timestamp
    const roomPageData = {
      ...roomPrices,
      lastUpdated: new Date().toISOString(),
      timestamp: Date.now(),
      roomType: roomType,
      updatedBy: this.getAdminUsername()
    };

    localStorage.setItem(`${roomType}RoomPrices`, JSON.stringify(roomPageData));
  }

  broadcastPriceUpdate(roomType, roomPrices) {
    // Create custom event for same-window updates
    const updateEvent = new CustomEvent('priceUpdate', {
      detail: {
        roomType: roomType,
        prices: roomPrices,
        timestamp: Date.now(),
        source: 'admin'
      }
    });
    window.dispatchEvent(updateEvent);

    // Trigger storage event for cross-tab communication
    const storageData = {
      ...roomPrices,
      lastUpdated: new Date().toISOString(),
      timestamp: Date.now(),
      roomType: roomType,
      updatedBy: this.getAdminUsername()
    };

    // Force storage event by removing and setting
    localStorage.removeItem(`${roomType}RoomPrices`);
    setTimeout(() => {
      localStorage.setItem(`${roomType}RoomPrices`, JSON.stringify(storageData));
    }, 100);
  }

  autoSave() {
    try {
      let hasChanges = false;
      const newPriceData = { ...this.priceData };

      Object.keys(newPriceData).forEach(roomType => {
        const roomPrices = {
          morning: {
            hourly: parseInt(document.getElementById(`${roomType}-morning-hourly`).value) || 0,
            daily: parseInt(document.getElementById(`${roomType}-morning-daily`).value) || 0,
            monthly: parseInt(document.getElementById(`${roomType}-morning-monthly`).value) || 0
          },
          evening: {
            hourly: parseInt(document.getElementById(`${roomType}-evening-hourly`).value) || 0,
            daily: parseInt(document.getElementById(`${roomType}-evening-daily`).value) || 0,
            monthly: parseInt(document.getElementById(`${roomType}-evening-monthly`).value) || 0
          }
        };

        if (this.validatePrices(roomPrices)) {
          if (JSON.stringify(this.priceData[roomType]) !== JSON.stringify(roomPrices)) {
            newPriceData[roomType] = roomPrices;
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        this.priceData = newPriceData;
        this.savePriceData();
        
        // Update room pages
        Object.keys(this.priceData).forEach(roomType => {
          this.updateRoomPages(roomType, this.priceData[roomType]);
          this.broadcastPriceUpdate(roomType, this.priceData[roomType]);
        });
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }

  createBackup() {
    try {
      const backupData = {
        prices: this.priceData,
        version: this.version,
        backupDate: new Date().toISOString(),
        originalTimestamp: Date.now()
      };
      localStorage.setItem(this.backupKey, JSON.stringify(backupData));
      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }

  createInitialBackup() {
    if (!localStorage.getItem(this.backupKey)) {
      this.createBackup();
    }
  }

  exportData() {
    try {
      const exportData = {
        prices: this.priceData,
        version: this.version,
        exportDate: new Date().toISOString(),
        exportedBy: this.getAdminUsername()
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `methods-room-prices-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      this.showSuccess('Price data exported successfully!');
    } catch (error) {
      this.showError('Failed to export data.');
      console.error('Export error:', error);
    }
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if (importedData.prices && this.validateImportedData(importedData.prices)) {
          if (confirm('This will replace all current prices. Are you sure?')) {
            this.priceData = importedData.prices;
            this.loadCurrentPrices();
            this.savePriceData();
            
            // Update all room pages
            Object.keys(this.priceData).forEach(roomType => {
              this.updateRoomPages(roomType, this.priceData[roomType]);
              this.broadcastPriceUpdate(roomType, this.priceData[roomType]);
            });
            
            this.showSuccess('Price data imported successfully!');
            this.displayDataStats();
          }
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        this.showError('Failed to import data. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }

  validateImportedData(data) {
    const requiredRooms = ['training', 'private', 'meeting'];
    const requiredTimeSlots = ['morning', 'evening'];
    const requiredDurations = ['hourly', 'daily', 'monthly'];

    for (const room of requiredRooms) {
      if (!data[room]) return false;
      for (const timeSlot of requiredTimeSlots) {
        if (!data[room][timeSlot]) return false;
        for (const duration of requiredDurations) {
          if (typeof data[room][timeSlot][duration] !== 'number' || data[room][timeSlot][duration] < 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  displayWelcomeMessage() {
    const welcomeElement = document.getElementById('admin-welcome');
    const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
    if (welcomeElement && sessionData.username) {
      welcomeElement.textContent = `Welcome, ${sessionData.username}`;
    }
  }

  displayDataStats() {
    const statsElement = document.getElementById('data-stats');
    if (statsElement) {
      try {
        const data = localStorage.getItem(this.storageKey);
        const lastUpdated = data ? JSON.parse(data).lastUpdated : 'Never';
        const dataSize = data ? new Blob([data]).size : 0;
        
        statsElement.innerHTML = `
          <p><strong>Version:</strong> ${this.version}</p>
          <p><strong>Last Updated:</strong> ${lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}</p>
          <p><strong>Data Size:</strong> ${(dataSize / 1024).toFixed(2)} KB</p>
          <p><strong>Rooms Configured:</strong> ${Object.keys(this.priceData).length}</p>
        `;
      } catch (error) {
        statsElement.innerHTML = '<p>Error loading stats</p>';
      }
    }
  }

  getAdminUsername() {
    const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
    return sessionData.username || 'Admin';
  }

  getRoomDisplayName(roomType) {
    const names = {
      training: 'AMOUN ROOM',
      private: 'HORUS ROOM',
      meeting: 'ISIS ROOM'
    };
    return names[roomType] || roomType;
  }

  showSuccess(message) {
    const successElement = document.getElementById('success-message');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 5000);
    }
  }

  showError(message) {
    alert(message);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
  new AdminPanel();
});
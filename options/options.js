class OptionsManager {
  constructor() {
    this.settings = {};
    this.initialize();
  }

  async initialize() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.localizeInterface();
    this.loadStatistics();
  }

  async loadSettings() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        this.settings = response.settings;
      } else {
        this.settings = {
          enableSidebar: true,
          requireConfirmation: true,
          threshold: 75,
          enableToast: true,
          language: 'en'
        };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showStatus('Failed to load settings', 'error');
    }
  }

  setupEventListeners() {
    document.getElementById('enableSidebar').addEventListener('change', () => {
      this.markSettingsChanged();
    });

    document.getElementById('requireConfirmation').addEventListener('change', () => {
      this.markSettingsChanged();
    });

    document.getElementById('enableToast').addEventListener('change', () => {
      this.markSettingsChanged();
    });

    document.getElementById('threshold').addEventListener('change', () => {
      this.markSettingsChanged();
    });

    document.getElementById('language').addEventListener('change', () => {
      this.markSettingsChanged();
    });

    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('clearHistory').addEventListener('click', () => {
      this.clearHistory();
    });
  }

  updateUI() {
    document.getElementById('enableSidebar').checked = this.settings.enableSidebar !== false;
    document.getElementById('requireConfirmation').checked = this.settings.requireConfirmation !== false;
    document.getElementById('enableToast').checked = this.settings.enableToast !== false;
    document.getElementById('threshold').value = this.settings.threshold || 75;
    document.getElementById('language').value = this.settings.language || 'en';

    const manifest = browser.runtime.getManifest();
    document.getElementById('version').textContent = manifest.version;
  }

  markSettingsChanged() {
    const saveBtn = document.getElementById('saveSettings');
    saveBtn.textContent = 'Save Settings *';
    saveBtn.style.background = '#ff9800';
  }

  async saveSettings() {
    const newSettings = {
      enableSidebar: document.getElementById('enableSidebar').checked,
      requireConfirmation: document.getElementById('requireConfirmation').checked,
      enableToast: document.getElementById('enableToast').checked,
      threshold: parseInt(document.getElementById('threshold').value),
      language: document.getElementById('language').value
    };

    try {
      const response = await browser.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: newSettings
      });

      if (response.success) {
        this.settings = { ...this.settings, ...newSettings };
        this.showStatus('Settings saved successfully!', 'success');
        
        const saveBtn = document.getElementById('saveSettings');
        saveBtn.textContent = 'Save Settings';
        saveBtn.style.background = '#1a73e8';

        if (newSettings.language !== this.settings.language) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        this.showStatus('Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  async clearHistory() {
    if (!confirm('Are you sure you want to clear all cleaning history? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await browser.runtime.sendMessage({ type: 'CLEAR_CLEANED_VIDEOS' });
      
      if (response.success) {
        this.showStatus('Cleaning history cleared successfully!', 'success');
        this.loadStatistics();
      } else {
        this.showStatus('Failed to clear history', 'error');
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
      this.showStatus('Failed to clear history', 'error');
    }
  }

  async loadStatistics() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_CLEANED_VIDEOS' });
      
      if (response.success) {
        const totalCleaned = response.videos.length;
        document.getElementById('totalCleaned').textContent = totalCleaned.toLocaleString();
      } else {
        document.getElementById('totalCleaned').textContent = 'Error loading';
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
      document.getElementById('totalCleaned').textContent = 'Error loading';
    }
  }

  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message status-${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }

  localizeInterface() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const message = browser.i18n.getMessage(key);
      if (message) {
        if (element.tagName === 'INPUT' && element.type === 'button') {
          element.value = message;
        } else {
          element.textContent = message;
        }
      }
    });

    document.title = `${browser.i18n.getMessage('extensionName')} - Options`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
}); 
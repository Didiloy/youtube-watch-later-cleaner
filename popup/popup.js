class PopupManager {
  constructor() {
    this.settings = {};
    this.cleanedVideos = [];
    this.initialize();
  }

  async initialize() {
    await this.loadSettings();
    await this.loadCleanedVideos();
    this.setupEventListeners();
    this.updateUI();
    this.localizeInterface();
  }

  async loadSettings() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        this.settings = response.settings;
        this.settings.autoRescanAfterCleaning = this.settings.autoRescanAfterCleaning === undefined ? true : this.settings.autoRescanAfterCleaning;
      } else {
        console.error('Failed to load settings:', response.error);
        this.settings = {
          enableSidebar: true,
          requireConfirmation: true,
          threshold: 75,
          enableToast: true,
          language: 'en',
          autoRescanAfterCleaning: true
        };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = {
        enableSidebar: true,
        requireConfirmation: true,
        threshold: 75,
        enableToast: true,
        language: 'en',
        autoRescanAfterCleaning: true
      };
    }
  }

  async loadCleanedVideos() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_CLEANED_VIDEOS' });
      if (response.success) {
        this.cleanedVideos = response.videos;
      }
    } catch (error) {
      console.error('Failed to load cleaned videos:', error);
    }
  }

  setupEventListeners() {
    document.getElementById('enableSidebar').addEventListener('change', (e) => {
      this.updateSetting('enableSidebar', e.target.checked);
    });

    document.getElementById('requireConfirmation').addEventListener('change', (e) => {
      this.updateSetting('requireConfirmation', e.target.checked);
    });

    document.getElementById('threshold').addEventListener('change', (e) => {
      this.updateSetting('threshold', parseInt(e.target.value));
    });

    document.getElementById('enableToast').addEventListener('change', (e) => {
      this.updateSetting('enableToast', e.target.checked);
    });

    document.getElementById('language').addEventListener('change', (e) => {
      this.updateSetting('language', e.target.value);
      setTimeout(() => window.location.reload(), 100);
    });

    document.getElementById('autoRescanAfterCleaning').addEventListener('change', (e) => {
      this.updateSetting('autoRescanAfterCleaning', e.target.checked);
    });

    document.getElementById('refreshVideos').addEventListener('click', () => {
      this.refreshVideosList();
    });

    document.getElementById('clearHistory').addEventListener('click', () => {
      this.clearHistory();
    });

    const enableToastCheckbox = document.getElementById('enableToast');
    const languageSelect = document.getElementById('language');
    const autoRescanCheckbox = document.getElementById('autoRescanAfterCleaning');
    const cleanedVideosList = document.getElementById('cleanedVideosList');
    const noVideosMessage = document.getElementById('noVideos');
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    
    try {
      await browser.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: this.settings
      });
    } catch (error) {
      console.error('Failed to save setting:', key, error);
      this.showStatus(this.getLocalizedMessage('settingSavedError', { settingName: key }) || `Failed to save ${key}.`, 'error');
    }
  }

  updateUI() {
    document.getElementById('enableSidebar').checked = this.settings.enableSidebar || false;
    document.getElementById('requireConfirmation').checked = this.settings.requireConfirmation !== false;
    document.getElementById('threshold').value = this.settings.threshold || 75;
    document.getElementById('enableToast').checked = this.settings.enableToast !== false;
    document.getElementById('language').value = this.settings.language || 'en';
    document.getElementById('autoRescanAfterCleaning').checked = this.settings.autoRescanAfterCleaning === undefined ? true : this.settings.autoRescanAfterCleaning;
    
    this.renderCleanedVideos();
  }

  renderCleanedVideos() {
    const container = document.getElementById('cleanedVideosList');
    const noVideosMessage = document.getElementById('noVideos');
    const clearBtn = document.getElementById('clearHistory');

    while (container.firstChild && container.firstChild !== noVideosMessage) {
      container.removeChild(container.firstChild);
    }

    if (this.cleanedVideos.length === 0) {
      noVideosMessage.style.display = 'block';
      clearBtn.style.display = 'none';
    } else {
      noVideosMessage.style.display = 'none';
      clearBtn.style.display = 'block';

      this.cleanedVideos.slice(0, 20).forEach(video => {
        const videoItem = document.createElement('a');
        videoItem.className = 'video-item';
        videoItem.href = video.url || '#';
        videoItem.title = video.url ? `Open video: ${video.title}` : 'Video URL not available';
        videoItem.target = '_blank';
        videoItem.rel = 'noopener noreferrer';

        if (!video.url || video.url === '#') {
          videoItem.addEventListener('click', (e) => e.preventDefault());
          videoItem.style.cursor = 'default';
        }

        const title = document.createElement('div');
        title.className = 'video-title';
        title.textContent = video.title || 'Unknown Video';

        const date = document.createElement('div');
        date.className = 'video-date';
        date.textContent = this.formatDate(video.cleanedAt);

        videoItem.appendChild(title);
        videoItem.appendChild(date);
        if (noVideosMessage.parentNode === container) {
            container.insertBefore(videoItem, noVideosMessage);
        } else {
            container.appendChild(videoItem);
        }
      });
    }
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Unknown date';
    }
  }

  async refreshVideosList() {
    const btn = document.getElementById('refreshVideos');
    const originalText = browser.i18n.getMessage('popupRefreshList') || 'Refresh List';
    const refreshingText = browser.i18n.getMessage('refreshingList') || 'Refreshing...';

    btn.disabled = true;
    btn.textContent = refreshingText;

    try {
      await this.loadCleanedVideos();
      this.renderCleanedVideos();
    } catch (error) {
      console.error('Failed to refresh:', error);
    }

    btn.disabled = false;
    btn.textContent = originalText;
  }

  async clearHistory() {
    if (!confirm('Are you sure you want to clear all cleaned video history?')) {
      return;
    }

    try {
      await browser.runtime.sendMessage({ type: 'CLEAR_CLEANED_VIDEOS' });
      this.cleanedVideos = [];
      this.renderCleanedVideos();
      this.showStatus('History cleared', 'success');
    } catch (error) {
      console.error('Failed to clear history:', error);
      this.showStatus('Failed to clear history', 'error');
    }
  }

  showStatus(message, type = 'info') {
    const existing = document.querySelector('.status-message');
    if (existing) {
      existing.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;

    const container = document.querySelector('.popup-container');
    container.insertBefore(statusDiv, container.firstChild);

    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.remove();
      }
    }, 3000);
  }

  async localizeInterface() {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const message = this.getLocalizedMessage(key);
      if (message && message !== key) {
        if (el.tagName === 'INPUT' && el.type === 'submit' || el.tagName === 'BUTTON') {
          el.value = message;
        } else if (el.hasAttribute('data-i18n-placeholder')) {
          el.placeholder = message;
        } else {
          el.textContent = message;
        }
      }

      const labelKey = el.getAttribute('data-i18n-label');
      if (labelKey) {
        const labelMessage = this.getLocalizedMessage(labelKey);
        if (labelMessage && labelMessage !== labelKey) {
          const labelElement = document.querySelector(`label[for="${el.id}"]`) || el.previousElementSibling;
          if (labelElement && (labelElement.tagName === 'LABEL' || labelElement.classList.contains('setting-label'))) {
            const spanInsideLabel = labelElement.querySelector('span[data-i18n]') || labelElement.querySelector('span');
            if(spanInsideLabel) spanInsideLabel.textContent = labelMessage;
            else labelElement.textContent = labelMessage;
          }
        }
      }
    });
  }

  getLocalizedMessage(key, substitutions) {
    try {
      let message = browser.i18n.getMessage(key);
      if (!message) return key;

      if (substitutions) {
        if (Array.isArray(substitutions)) {
            for (let i = 0; i < substitutions.length; i++) {
                 message = message.replace(`$${i+1}$`, substitutions[i])
                                .replace(`{${i}}`, substitutions[i]);
            }
        } else if (typeof substitutions === 'object') {
            for (const k in substitutions) {
                message = message.replace(new RegExp(`{${k}}`, 'g'), substitutions[k]);
            }
        }
      }
      return message;
    } catch (e) {
      return key;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 
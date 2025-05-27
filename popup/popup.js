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
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
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

    document.getElementById('refreshVideos').addEventListener('click', () => {
      this.refreshVideosList();
    });

    document.getElementById('clearHistory').addEventListener('click', () => {
      this.clearHistory();
    });
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    
    try {
      await browser.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: { [key]: value }
      });
    } catch (error) {
      console.error('Failed to save setting:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  updateUI() {
    document.getElementById('enableSidebar').checked = this.settings.enableSidebar || false;
    document.getElementById('requireConfirmation').checked = this.settings.requireConfirmation !== false;
    document.getElementById('threshold').value = this.settings.threshold || 75;
    document.getElementById('enableToast').checked = this.settings.enableToast !== false;
    document.getElementById('language').value = this.settings.language || 'en';
    
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
    btn.disabled = true;
    btn.textContent = 'Refreshing...';

    try {
      await this.loadCleanedVideos();
      this.renderCleanedVideos();
      this.showStatus('Video list refreshed', 'success');
    } catch (error) {
      console.error('Failed to refresh:', error);
      this.showStatus('Failed to refresh video list', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Refresh List';
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
    const targetLang = this.settings.language || 'en';
    let messages = {};

    try {
      // Attempt to fetch the specific language file if not English (default)
      // browser.i18n.getMessage will handle English or browser default automatically if targetLang is 'en'
      // or if the specific fetch fails and we fall back.
      if (targetLang !== 'en') { 
        const response = await fetch(browser.runtime.getURL(`_locales/${targetLang}/messages.json`));
        if (response.ok) {
          messages = await response.json();
        } else {
          // Fallback to default i18n if specific lang file fails to load (e.g. not found)
          console.warn(`Could not load messages for ${targetLang}, falling back to default i18n.`);
        }
      }
    } catch (error) {
      console.error(`Error loading messages for ${targetLang}:`, error);
      // Fallback to default i18n on any error
    }

    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      let message = '';

      if (messages[key] && messages[key].message) {
        message = messages[key].message;
      } else {
        // Fallback to browser.i18n.getMessage() if key not in loaded file or if it's default lang
        message = browser.i18n.getMessage(key);
      }
      
      if (message) {
        if (element.tagName === 'INPUT' && element.type === 'button') {
          element.value = message;
        } else {
          element.textContent = message;
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 
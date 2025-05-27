class BackgroundManager {
  constructor() {
    this.initializeExtension();
    this.setupMessageListeners();
  }

  async initializeExtension() {
    const defaultSettings = {
      enableSidebar: true,
      requireConfirmation: true,
      threshold: 75,
      enableToast: true,
      language: 'en',
      cleanedVideos: []
    };

    try {
      const stored = await browser.storage.local.get(Object.keys(defaultSettings));
      const settings = { ...defaultSettings };
      
      for (const key of Object.keys(defaultSettings)) {
        if (stored[key] !== undefined) {
          settings[key] = stored[key];
        }
      }
      
      await browser.storage.local.set(settings);
    } catch (error) {
      console.error('Failed to initialize extension settings:', error);
    }
  }

  setupMessageListeners() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'GET_SETTINGS':
          return this.getSettings();
        case 'SAVE_SETTINGS':
          return this.saveSettings(message.settings);
        case 'ADD_CLEANED_VIDEO':
          return this.addCleanedVideo(message.video);
        case 'GET_CLEANED_VIDEOS':
          return this.getCleanedVideos();
        case 'CLEAR_CLEANED_VIDEOS':
          return this.clearCleanedVideos();
        default:
          return Promise.resolve({ success: false, error: 'Unknown message type' });
      }
    });
  }

  async getSettings() {
    try {
      const settings = await browser.storage.local.get([
        'enableSidebar',
        'requireConfirmation', 
        'threshold',
        'enableToast',
        'language'
      ]);
      return { success: true, settings };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return { success: false, error: error.message };
    }
  }

  async saveSettings(newSettings) {
    try {
      await browser.storage.local.set(newSettings);
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error: error.message };
    }
  }

  async addCleanedVideo(video) {
    try {
      const { cleanedVideos = [] } = await browser.storage.local.get('cleanedVideos');
      const newVideo = {
        ...video,
        cleanedAt: new Date().toISOString(),
        id: Date.now().toString()
      };
      
      cleanedVideos.unshift(newVideo);
      
      if (cleanedVideos.length > 1000) {
        cleanedVideos.splice(1000);
      }
      
      await browser.storage.local.set({ cleanedVideos });
      return { success: true };
    } catch (error) {
      console.error('Failed to add cleaned video:', error);
      return { success: false, error: error.message };
    }
  }

  async getCleanedVideos() {
    try {
      const { cleanedVideos = [] } = await browser.storage.local.get('cleanedVideos');
      return { success: true, videos: cleanedVideos };
    } catch (error) {
      console.error('Failed to get cleaned videos:', error);
      return { success: false, error: error.message };
    }
  }

  async clearCleanedVideos() {
    try {
      await browser.storage.local.set({ cleanedVideos: [] });
      return { success: true };
    } catch (error) {
      console.error('Failed to clear cleaned videos:', error);
      return { success: false, error: error.message };
    }
  }
}

new BackgroundManager(); 
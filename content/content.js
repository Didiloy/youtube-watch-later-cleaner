class YouTubeWatchLaterCleaner {
  constructor() {
    this.settings = {};
    this.seenVideos = [];
    this.cleaningInProgress = false;
    this.sidebar = null;
    this.toastContainer = null;
    this.lastCleanedCount = 0;
    this.failedCleanings = [];
    
    this.initialize();
  }

  async initialize() {
    if (!this.isWatchLaterPage()) {
      return;
    }

    await this.loadSettings();

    // If the main feature is disabled, do nothing further on the page.
    if (!this.settings.enableSidebar) {
      console.log('YouTube Watch Later Cleaner is disabled in settings. No actions will be performed.');
      return;
    }

    await this.waitForPageLoad();
    
    // Only create sidebar and proceed if the feature is enabled.
    // This check is somewhat redundant due to the one above, but good for clarity.
    if (this.settings.enableSidebar) { 
      this.createSidebar();
    }
    
    this.scanForSeenVideos();
    this.setupPageObserver();
  }

  isWatchLaterPage() {
    return window.location.href.includes('/playlist?list=WL');
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
      this.settings = {
        enableSidebar: true,
        requireConfirmation: true,
        threshold: 75,
        enableToast: true,
        language: 'en'
      };
    }
  }

  async waitForPageLoad() {
    return new Promise((resolve) => {
      const checkForContent = () => {
        const videos = document.querySelectorAll('ytd-playlist-video-renderer');
        if (videos.length > 0) {
          resolve();
        } else {
          setTimeout(checkForContent, 500);
        }
      };
      checkForContent();
    });
  }

  createSidebar() {
    if (this.sidebar) {
      this.sidebar.remove();
    }

    this.sidebar = document.createElement('div');
    this.sidebar.id = 'wl-cleaner-sidebar';
    this.sidebar.innerHTML = `
      <div class="wl-sidebar-header">
        <h3>${browser.i18n.getMessage('sidebarTitle')}</h3>
      </div>
      <div class="wl-sidebar-content">
        <div class="wl-status" id="wl-status">
          ${browser.i18n.getMessage('scanning')}
        </div>
        <div class="wl-actions">
          <button id="wl-clean-btn" class="wl-btn wl-btn-primary" disabled>
            ${browser.i18n.getMessage('cleanNow')}
          </button>
        </div>
        <div class="wl-log" id="wl-log">
          <div class="wl-log-title">${browser.i18n.getMessage('cleaningLog')}:</div>
          <div class="wl-log-content" id="wl-log-content">
            No cleaning performed yet.
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.sidebar);
    this.setupSidebarEvents();
  }

  setupSidebarEvents() {
    const cleanBtn = document.getElementById('wl-clean-btn');

    cleanBtn?.addEventListener('click', () => {
      this.startCleaning();
    });
  }

  // Helper for updating sidebar status message consistently
  updateSidebarStatusMessage(message) {
    const statusEl = document.getElementById('wl-status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  async scanForSeenVideos() {
    this.seenVideos = [];
    this.updateSidebarStatusMessage(browser.i18n.getMessage('scrollingToLoad')); // Initial message

    // Phase 1: Load all video elements into the DOM
    await this.scrollToLoadAllVideos(); // Uses its own specific status updates

    // Phase 2: Scroll through viewport to ensure progress bars are rendered
    await this.performViewportScanAndRenderScroll();

    // Phase 3: Actual detection
    this.updateSidebarStatusMessage("Analyzing video content...");
    await this.sleep(500); // Brief pause for UI update

    const videos = document.querySelectorAll('ytd-playlist-video-renderer');
    
    videos.forEach((video, index) => {
      if (this.isVideoSeen(video)) {
        this.seenVideos.push({
          element: video,
          index: index,
          title: this.extractVideoTitle(video),
          url: this.extractVideoUrl(video),
          deselected: false // Initialize deselection state
        });
      }
    });

    this.updateSidebarStatus(); // This updates based on seenVideos.length
    this.highlightSeenVideos();
  }

  async scrollToLoadAllVideos() {
    this.updateSidebarStatusMessage(browser.i18n.getMessage('scrollingToLoad'));

    let lastVideoCount = 0;
    let stableScrollAttempts = 0; 
    const maxScrollAttempts = 20; // Max attempts to prevent infinite loops (e.g., 20 attempts * 2.5s = 50s max)
    let currentScrollAttempts = 0;

    // Try to find a more specific scrollable container for playlists
    const scrollContainer = 
        document.querySelector('ytd-browse[page-subtype="playlist"] #primary #contents.ytd-browse') || // Common playlist scroll area
        document.querySelector('#primary #contents') || // A more general content area
        document.documentElement; // Fallback to the whole document

    // Perform an initial scroll to the current bottom, in case content is already there
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    await this.sleep(500); // Brief pause

    while (stableScrollAttempts < 3 && currentScrollAttempts < maxScrollAttempts) {
        currentScrollAttempts++;
        const initialScrollHeight = scrollContainer.scrollHeight;
        
        // Scroll to the absolute bottom of the identified container
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        await this.sleep(2000); // Wait for new content to load and for the DOM to update

        const videos = document.querySelectorAll('ytd-playlist-video-renderer');
        const currentVideoCount = videos.length;
        const newScrollHeight = scrollContainer.scrollHeight;

        if (currentVideoCount > lastVideoCount || newScrollHeight > initialScrollHeight) {
            // If new videos were loaded OR the page got longer (implying more potential content)
            stableScrollAttempts = 0; // Reset stability counter
        } else {
            // No new videos and scroll height didn't change significantly
            stableScrollAttempts++;
        }
        lastVideoCount = currentVideoCount;

        this.updateSidebarStatusMessage(`${browser.i18n.getMessage('scrollingToLoad')} (${currentVideoCount} videos, attempt ${currentScrollAttempts}/${maxScrollAttempts})`);
    }

    const finalMessage = currentScrollAttempts >= maxScrollAttempts
        ? `Max scroll attempts reached while loading. Found ${lastVideoCount} videos.`
        : `Initial video loading complete. Found ${lastVideoCount} videos. Preparing detailed scan...`;
    this.updateSidebarStatusMessage(finalMessage);
    await this.sleep(1000); // Give a small pause for user to read before next phase
  }

  async performViewportScanAndRenderScroll() {
    this.updateSidebarStatusMessage("Preparing to scan all videos by scrolling...");
    await this.sleep(1000); // Give user time to read message

    const videos = Array.from(document.querySelectorAll('ytd-playlist-video-renderer'));
    const totalVideos = videos.length;

    if (totalVideos === 0) {
        this.updateSidebarStatusMessage("No videos found to scan by scrolling.");
        await this.sleep(1500);
        return;
    }

    this.updateSidebarStatusMessage(`Scanning playlist: Scrolling down (0% complete) to ensure all ${totalVideos} videos render their details.`);

    // Scroll Down, ensuring each item is centered in viewport
    for (let i = 0; i < totalVideos; i++) {
        videos[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        const percent = Math.round(((i + 1) / totalVideos) * 100);
        this.updateSidebarStatusMessage(`Scanning playlist: Scrolling down (${percent}% complete) to ensure video ${i + 1}/${totalVideos} renders.`);
        await this.sleep(250); // Time for rendering. Adjust if needed based on playlist size/performance.
    }
    
    this.updateSidebarStatusMessage("Scanning playlist: Reached bottom. Scrolling back to top...");
    await this.sleep(1000);

    // Scroll back to Top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Wait for the smooth scroll to actually finish.
    await new Promise(resolve => {
        let scrollTimeout;
        let lastScrollY = window.scrollY;
        let stationaryCount = 0;

        const scrollListener = () => {
            clearTimeout(scrollTimeout);
            if (window.scrollY === lastScrollY) {
                stationaryCount++;
            } else {
                stationaryCount = 0;
            }
            lastScrollY = window.scrollY;

            if (window.scrollY === 0 || stationaryCount > 5) { // Reached top or hasn't moved for ~750ms
                window.removeEventListener('scroll', scrollListener);
                resolve();
                return;
            }
            
            scrollTimeout = setTimeout(() => { // Failsafe / alternative end condition
                 if (window.scrollY === 0 || stationaryCount > 2 ) { // Check again if we are at top or stable
                    window.removeEventListener('scroll', scrollListener);
                    resolve();
                 }
                 // Continue listening if not resolved by failsafe
            }, 150);
        };
        window.addEventListener('scroll', scrollListener, { passive: true });
        // Initial check in case already at top or scroll is very fast
        if (window.scrollY === 0) {
             window.removeEventListener('scroll', scrollListener);
             resolve();
        } else {
            scrollListener();
        }
        // General timeout as a final fallback if scroll events are missed or stop unexpectedly
        setTimeout(() => {
            window.removeEventListener('scroll', scrollListener);
            resolve(); 
        }, 3000 + totalVideos * 50); // Adjust timeout based on list length, e.g., 3s + 50ms per video for scroll up
    });

    this.updateSidebarStatusMessage("Viewport scan complete. Analyzing videos for cleaning...");
    await this.sleep(500);
  }

  isVideoSeen(videoElement) {
    const progressBar = videoElement.querySelector('#progress');
    if (!progressBar) {
      const thumbnailOverlays = videoElement.querySelectorAll('ytd-thumbnail-overlay-resume-playback-renderer');
      if (thumbnailOverlays.length === 0) {
        return false;
      }
    }

    const progressBars = videoElement.querySelectorAll('#progress, .ytd-thumbnail-overlay-resume-playback-renderer #progress');
    
    for (const bar of progressBars) {
      const style = window.getComputedStyle(bar);
      const width = parseFloat(style.width);
      const parentWidth = parseFloat(window.getComputedStyle(bar.parentElement).width);
      
      if (width && parentWidth) {
        const percentage = (width / parentWidth) * 100;
        if (percentage >= this.settings.threshold) {
          return true;
        }
      }
    }

    const privacyOverlay = videoElement.querySelector('[aria-label*="Private"], [aria-label*="Unavailable"]');
    if (privacyOverlay) {
      return true;
    }

    return false;
  }

  extractVideoTitle(videoElement) {
    const titleElement = videoElement.querySelector('#video-title, .ytd-playlist-video-renderer #video-title');
    return titleElement?.textContent?.trim() || 'Unknown Video';
  }

  extractVideoUrl(videoElement) {
    const linkElement = videoElement.querySelector('a#video-title, a.ytd-playlist-video-renderer');
    return linkElement?.href || '';
  }

  highlightSeenVideos() {
    document.querySelectorAll('.wl-seen-highlight').forEach(el => {
      el.classList.remove('.wl-seen-highlight', '.wl-deselected-highlight');
      // Clean up old listeners if any - more robust to re-create or manage listeners carefully
      const oldClickListener = el.clickListenerRef; // Assuming we store it
      if (oldClickListener) {
        el.removeEventListener('click', oldClickListener);
      }
    });

    this.seenVideos.forEach(video => {
      video.element.classList.add('wl-seen-highlight');
      if (video.deselected) {
        video.element.classList.add('wl-deselected-highlight');
      }

      // Store and use a reference for easy removal if needed, or bind a new one
      const clickListener = (event) => {
        // Prevent click from propagating to YT player or links if badge is part of video thumbnail
        event.preventDefault();
        event.stopPropagation();
        this.toggleDeselection(video);
      };
      video.element.clickListenerRef = clickListener; // Store ref for potential removal
      video.element.addEventListener('click', clickListener);
      video.element.style.cursor = 'pointer'; // Indicate the whole item is clickable for deselection
    });
  }

  toggleDeselection(videoToToggle) {
    videoToToggle.deselected = !videoToToggle.deselected;
    videoToToggle.element.classList.toggle('wl-deselected-highlight', videoToToggle.deselected);
    this.updateSidebarStatus(); // Update count of videos to be cleaned
  }

  updateSidebarStatus() {
    const statusEl = document.getElementById('wl-status');
    const cleanBtn = document.getElementById('wl-clean-btn');
    const currentlySelectedVideos = this.seenVideos.filter(v => !v.deselected);
    const numSelected = currentlySelectedVideos.length;

    if (statusEl) {
      if (this.seenVideos.length === 0) { // No videos detected at all
        statusEl.textContent = browser.i18n.getMessage('noVideosToClean');
        cleanBtn?.setAttribute('disabled', 'true');
      } else if (numSelected === 0) { // Videos detected, but all are deselected
        statusEl.textContent = browser.i18n.getMessage('noVideosSelectedForCleaning');
        cleanBtn?.setAttribute('disabled', 'true');
      } else {
        statusEl.textContent = browser.i18n.getMessage('videosSelectedForCleaning').replace('{count}', numSelected);
        cleanBtn?.removeAttribute('disabled');
      }
    }
  }

  async startCleaning() {
    const videosToClean = this.seenVideos.filter(v => !v.deselected);
    if (this.cleaningInProgress || videosToClean.length === 0) {
      return;
    }

    if (this.settings.requireConfirmation) {
      const message = browser.i18n.getMessage('confirmCleanSelected').replace('{count}', videosToClean.length);
      if (!confirm(message)) {
        return;
      }
    }

    this.cleaningInProgress = true;
    this.failedCleanings = [];
    this.lastCleanedCount = 0;

    const statusEl = document.getElementById('wl-status');
    const cleanBtn = document.getElementById('wl-clean-btn');
    
    if (statusEl) {
      statusEl.textContent = browser.i18n.getMessage('cleaning');
    }
    if (cleanBtn) {
      cleanBtn.disabled = true;
      cleanBtn.textContent = 'Cleaning...';
    }

    for (const video of videosToClean) {
      const success = await this.removeVideo(video);
      if (success) {
        this.lastCleanedCount++;
        await this.logCleanedVideo(video);
        if (this.settings.enableToast) {
          this.showToast(browser.i18n.getMessage('videoRemoved').replace('{title}', video.title));
        }
      } else {
        this.failedCleanings.push(video);
      }
      
      await this.sleep(1000);
    }

    this.cleaningInProgress = false;
    this.updateCleaningLog();
    
    if (cleanBtn) {
      cleanBtn.disabled = false;
      cleanBtn.textContent = browser.i18n.getMessage('cleanNow');
    }

    setTimeout(() => {
      this.scanForSeenVideos();
    }, 2000);
  }

  async removeVideo(video) {
    try {
      const menuButton = video.element.querySelector('button[aria-label*="Action menu"], button[aria-label*="More actions"], ytd-menu-renderer button');
      if (!menuButton) {
        console.warn('Menu button not found for video:', video.title);
        return false;
      }

      menuButton.click();
      await this.sleep(500);

      // Attempt to find the remove option in a more language-agnostic way
      let removeOption = null;
      const menuItems = Array.from(document.querySelectorAll(
        'ytd-menu-service-item-renderer, tp-yt-paper-item' // Standard menu item selectors
      ));

      // Strategy 1: Look for known SVG paths for playlist removal or trash icons
      // These paths would need to be identified by inspecting YouTube's DOM.
      // Example (these are illustrative and need to be verified/updated):
      const REMOVE_ICON_SVG_PATH_1 = "M15 4H9v2h6V4zm0 4H9v2h6V8zm0 4H9v2h6v-2zM7 4H5v14h2V4zm14-2H3v18h18V2zM5 16V4h2v12H5zm12-10h-2V4h2v2zm0 4h-2V8h2v2zm0 4h-2v-2h2v2z"; // Example for a generic list remove
      const TRASH_ICON_SVG_PATH = "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"; // Example for trash icon
      const TRASH_ICON_SVG_PATH_2 = "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H7v15h10V5z";

      for (const item of menuItems) {
        const svgPath = item.querySelector('path[d]');
        if (svgPath) {
            const pathData = svgPath.getAttribute('d');
            // NOTE: Exact SVG path matching is very brittle if YT changes icons even slightly.
            // A more robust way would be to look for ARIA labels associated with these icons or specific classes.
            // For now, we are illustrating the concept.
            if (pathData === REMOVE_ICON_SVG_PATH_1 || pathData === TRASH_ICON_SVG_PATH || pathData === TRASH_ICON_SVG_PATH_2) {
             removeOption = item;
             break;
            }
            // A more general approach: check aria-label first as it's more reliable than SVG paths.
            const ariaLabel = item.getAttribute('aria-label') || item.textContent;
            if (ariaLabel) {
                const labelText = ariaLabel.toLowerCase();
                // Keywords that are less likely to be fully translated or might appear in ARIA labels
                if ((labelText.includes("remove") || labelText.includes("delete")) && labelText.includes("playlist")) {
                    removeOption = item;
                    break;
                }
                 if (labelText.includes("trash") || labelText.includes("delete")) { // More generic delete
                    removeOption = item;
                    break;
                }
            }
        }
      }
      
      // Strategy 2: If no icon match, fall back to text-based search (original method, but more targeted)
      if (!removeOption) {
        removeOption = menuItems.find(item => {
          const text = item.textContent?.toLowerCase() || "";
          // Focus on keywords that are common for this action across languages if possible,
          // or ensure the English one is prioritized.
          const isEnglishRemove = text.includes('remove from watch later');
          const isGenericRemove = (text.includes('remove') || text.includes('delete')) && text.includes('playlist');
          // French specific as a fallback - ideally handled by i18n if YouTube offers consistent attributes
          const isFrenchRemove = text.includes('supprimer de "à regarder plus tard"'); 

          return isEnglishRemove || isGenericRemove || isFrenchRemove;
        });
      }

      if (!removeOption) {
        console.warn('Remove option not found for video:', video.title);
        const backdrop = document.querySelector('tp-yt-iron-dropdown[opened] #backdrop, ytd-menu-popup-renderer');
        if (backdrop) {
          backdrop.click();
        }
        return false;
      }

      removeOption.click();
      await this.sleep(500);

      return true;
    } catch (error) {
      console.error('Failed to remove video:', video.title, error);
      return false;
    }
  }

  async logCleanedVideo(video) {
    try {
      await browser.runtime.sendMessage({
        type: 'ADD_CLEANED_VIDEO',
        video: {
          title: video.title,
          url: video.url
        }
      });
    } catch (error) {
      console.error('Failed to log cleaned video:', error);
    }
  }

  updateCleaningLog() {
    const logContent = document.getElementById('wl-log-content');
    if (!logContent) return;

    let logText = '';
    if (this.lastCleanedCount > 0) {
      logText += browser.i18n.getMessage('cleanComplete').replace('{count}', this.lastCleanedCount);
    }
    
    if (this.failedCleanings.length > 0) {
      logText += `\n${this.failedCleanings.length} ${browser.i18n.getMessage('failed')}`;
    }

    if (!logText) {
      logText = browser.i18n.getMessage('noVideosToClean');
    }

    logContent.textContent = logText;
  }

  showToast(message) {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'wl-toast-container';
      document.body.appendChild(this.toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'wl-toast';
    toast.textContent = message;
    
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('wl-toast-show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('wl-toast-show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
  }

  setupPageObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          if (addedNodes.some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node.matches?.('ytd-playlist-video-renderer') || 
             node.querySelector?.('ytd-playlist-video-renderer'))
          )) {
            shouldRescan = true;
          }
        }
      });

      if (shouldRescan && !this.cleaningInProgress) {
        setTimeout(() => {
          this.scanForSeenVideos();
        }, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new YouTubeWatchLaterCleaner();
  });
} else {
  new YouTubeWatchLaterCleaner();
} 
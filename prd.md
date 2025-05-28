## DOM-Based Firefox Extension for YouTube Watch Later Cleanup

### 1. Concept Summary

This Firefox extension enhances the YouTube Watch Later playlist page by visually scanning which videos are considered "seen" (based on red progress bar thresholds), and optionally removing them from the list via DOM manipulation. No YouTube API or OAuth is used.

---

### 2. Core Features

* **Detection of Seen Videos:**

  * Relies on red progress bar within video thumbnails.
  * User-configurable threshold (e.g., 80% progress = "seen").
  * DOM-based only: no backend, no API.

* **Cleaning Workflow:**

  * Auto-scans the Watch Later page when loaded.
  * Auto-scrolls to load more videos.
  * Highlights eligible videos visually.
  * Uses DOM simulation to click three-dot menu and "Remove from Watch Later".
  * Optionally shows a floating sidebar to trigger cleaning.
  * User setting: confirmation prompt ON/OFF before delete.

* **User Interface:**

  * Floating sidebar on the `/playlist?list=WL` page.
  * Extension popup includes:

    * Preview list of videos to be cleaned.
    * Log of previously cleaned videos.
    * Setting toggles.

* **Localization:**

  * Support for English and French.
  * Text strings extracted and stored in `_locales/en/messages.json` and `_locales/fr/messages.json`.

* **Cleaning Behavior:**

  * Ignores live streams and scheduled videos.
  * Cleans private and unavailable videos.
  * No retry on failure, but displays a message in the sidebar.

* **Permissions:**

  * Requires `host_permissions` for `https://www.youtube.com/*`.

* **Storage:**

  * Locally stores cleaned video metadata (e.g., title, date cleaned) via `storage.local`.
  * No telemetry, no external data transmission.
  * No export feature for logs.

---

### 3. Settings

* Red progress bar threshold: \[50%, 75%, 90%, 100%]
* Require confirmation before cleaning: \[ON/OFF]
* Enable floating sidebar on playlist: \[ON/OFF]
* Enable toast notifications: \[ON/OFF]
* Language: \[EN/FR]
* Auto-rescan after cleaning: \[ON/OFF]

---

### 4. UI Components

**Popup (Dashboard)**

```
+----------------------------------------+
|  Watch Later DOM Cleaner               |
+----------------------------------------+
|  [✓]  Enable sidebar                   |
|  [✓]  Ask confirmation before cleaning |
|  [50%] Threshold for "seen"           |
|  [✓]  Enable toast                     |
|  Language: [EN ▾]                      |
|  [✓]  Auto-rescan after cleaning       |
|----------------------------------------|
|  Cleaned videos:                       |
|  • Video Title 1   - 2025-05-23      |
|  • Video Title 2   - 2025-05-22      |
|  ...                                   |
+----------------------------------------+
```

**Floating Sidebar on Playlist Page**

```
+---------------------------+
|  Watch Later Cleaner      |
+---------------------------+
|  8 seen videos detected   |
|  [Clean Now] [Settings]   |
|  Cleaning log:            |
|  - 3 failed (details)     |
+---------------------------+
```

**Toast (if enabled)**

```
[Video "X" removed from Watch Later]
```

---

### 5. Limitations & Assumptions

* **DOM fragility:** Class names or structures may change, breaking functionality.
* **Performance:** DOM scanning and scrolling are limited by browser execution speed.
* **Security:** All operations remain local; no external communication.
* **No API dependency:** Fully browser-based and does not rely on Google OAuth or YouTube Data API.

---


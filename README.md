# YouTube Watch Later Cleaner

A Firefox extension that automatically detects and removes "seen" videos from your YouTube Watch Later playlist based on progress bar analysis.

## Features

### 🎯 Smart Detection
- Analyzes red progress bars to determine which videos have been watched
- Configurable threshold (50%, 75%, 90%, 100%)
- Automatically detects private and unavailable videos
- Ignores live streams and scheduled videos

### 🎛️ User-Friendly Interface
- **Floating Sidebar**: Quick access to cleaning functions directly on YouTube
- **Extension Popup**: Dashboard with settings and cleaned video history
- **Options Page**: Comprehensive settings management
- **Toast Notifications**: Real-time feedback when videos are removed

### 🔧 Customizable Settings
- Enable/disable floating sidebar
- Confirmation prompts before cleaning
- Adjustable "seen" threshold percentage
- Toast notification toggle
- Multi-language support (English/French)

### 🛡️ Privacy & Security
- **100% Local**: No external servers or API calls
- **No YouTube API**: Works entirely through DOM manipulation
- **Local Storage**: All data stored in your browser
- **No Telemetry**: No data collection or transmission

## Installation

1. Download the extension files
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension directory

## Usage

### Automatic Scanning
1. Navigate to your YouTube Watch Later playlist (`youtube.com/playlist?list=WL`)
2. The extension automatically scans for seen videos
3. Seen videos are highlighted with a red outline and "SEEN" badge

### Manual Cleaning
1. Click the "Clean Now" button in the floating sidebar
2. Confirm the action if confirmation is enabled
3. Watch as seen videos are automatically removed

### Settings Management
- **Extension Icon**: Click the extension icon in the toolbar for quick settings
- **Options Page**: Right-click the extension icon → "Options" for detailed settings
- **Sidebar Settings**: Click "Settings" in the floating sidebar

## File Structure

```
youtube-watch-later-cleaner/
├── manifest.json                 # Extension manifest
├── background/
│   └── background.js            # Background script for settings management
├── content/
│   ├── content.js              # Main content script for YouTube integration
│   └── content.css             # Styles for sidebar and visual elements
├── popup/
│   ├── popup.html              # Extension popup interface
│   ├── popup.css               # Popup styles
│   └── popup.js                # Popup functionality
├── options/
│   ├── options.html            # Options page interface
│   ├── options.css             # Options page styles
│   └── options.js              # Options page functionality
├── _locales/
│   ├── en/
│   │   └── messages.json       # English translations
│   └── fr/
│       └── messages.json       # French translations
├── icons/                      # Extension icons (to be added)
└── README.md                   # This file
```

## Technical Details

### DOM-Based Operation
- Uses CSS selectors to identify video elements
- Analyzes progress bar width to determine watch percentage
- Simulates user clicks on menu buttons and options
- No YouTube API dependencies

### Settings Storage
- Uses Firefox's `browser.storage.local` API
- Stores user preferences and cleaned video history
- Automatically migrates settings between versions

### Performance Optimizations
- Lazy loading with page observation
- Automatic scrolling to load all videos
- Debounced rescanning on page changes
- Efficient DOM queries with modern selectors

## Permissions Explained

- `storage`: Store user settings and cleaned video history locally
- `tabs`: Access the current tab information
- `host_permissions` for `youtube.com`: Inject content scripts into YouTube pages

## Development

### Prerequisites
- Firefox Developer Edition (recommended)
- Basic knowledge of JavaScript, HTML, CSS
- Understanding of Firefox extension development

### Local Development
1. Clone or download the extension files
2. Load the extension in Firefox using `about:debugging`
3. Make changes to the code
4. Click "Reload" in the debugging interface to test changes

### Building for Production
1. Ensure all files are present and functional
2. Test thoroughly on different YouTube page states
3. Validate manifest.json syntax
4. Package as .zip file for submission to Firefox Add-ons

## Limitations

- **DOM Fragility**: YouTube's frequent UI changes may require updates
- **Performance**: Large playlists may take time to scan completely
- **Browser Support**: Designed specifically for Firefox (Manifest V2)
- **YouTube Changes**: Dependent on YouTube's current DOM structure

## Troubleshooting

### Extension Not Working
1. Check if you're on the Watch Later playlist page
2. Refresh the page to reload the extension
3. Verify extension is enabled in `about:addons`

### Videos Not Detected
1. Adjust the threshold percentage in settings
2. Ensure videos have visible progress bars
3. Scroll down to load more videos

### Cleaning Failures
1. Check browser console for error messages
2. Verify YouTube's UI hasn't changed significantly
3. Try refreshing the page and scanning again

## Contributing

This extension is open for improvements and bug fixes. Common areas for contribution:
- Better YouTube DOM selector resilience
- Additional language translations
- UI/UX improvements
- Performance optimizations

## License

This project is provided as-is for educational and personal use. Please respect YouTube's Terms of Service when using this extension.

## Version History

### v1.0.0
- Initial release
- Core cleaning functionality
- Multi-language support (EN/FR)
- Floating sidebar interface
- Settings management
- Local storage for preferences and history 
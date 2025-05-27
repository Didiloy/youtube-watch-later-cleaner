# Quick Installation Guide

## Step 1: Prepare Icons (Optional)
If you want custom icons instead of the basic placeholders:

**Option A**: Use the HTML generator
1. Open `create-icons.html` in your browser
2. Click "Download All Icons" 
3. Save the generated images to the `icons/` folder with the correct names

**Option B**: Replace with your own icons
- Replace files in `icons/` folder with your own 16x16, 32x32, 48x48, and 96x96 PNG files

## Step 2: Install in Firefox

1. **Open Firefox** and navigate to `about:debugging`

2. **Click "This Firefox"** in the left sidebar

3. **Click "Load Temporary Add-on"**

4. **Select the `manifest.json` file** from this project directory

5. **The extension is now loaded!** You should see it in your extensions list.

## Step 3: Test the Extension

1. **Go to YouTube** and navigate to your Watch Later playlist:
   ```
   https://www.youtube.com/playlist?list=WL
   ```

2. **Look for the floating sidebar** on the right side of the page (if enabled in settings)

3. **Click the extension icon** in your toolbar to access the popup dashboard

4. **Test the cleaning functionality** on videos you've already watched

## Troubleshooting

### Extension not appearing?
- Make sure you selected the `manifest.json` file, not a folder
- Check the browser console (F12) for any error messages
- Verify all files are present in the correct structure

### Sidebar not showing?
- Make sure you're on the Watch Later playlist page (`/playlist?list=WL`)
- Check if sidebar is enabled in extension settings
- Refresh the page to reload the content script

### Settings not saving?
- Check the browser console for error messages
- Verify you have the latest version of Firefox
- Try disabling and re-enabling the extension

## Development Mode

This extension is loaded as a temporary add-on for development/testing. To make permanent changes:

1. Make your code modifications
2. Go back to `about:debugging`
3. Click "Reload" next to the extension name
4. Test your changes

## Next Steps

- Customize the extension settings via the popup or options page
- Test with different threshold settings
- Try the multi-language support (English/French)
- Monitor the cleaning history in the popup dashboard

For more detailed information, see the main `README.md` file. 
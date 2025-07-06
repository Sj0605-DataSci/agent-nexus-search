# Discover Minds Chrome Extension

A Chrome extension that shows a beautiful notification popup when installed, just like in your screenshot.

## Features

- 🍀 Shows installation notification with clover icon
- 🎨 Dark theme matching Chrome's design
- ⚡ Smooth animations and transitions
- 🔧 Test notification functionality
- 📱 Clean, modern UI

## Installation

1. **Download the files**: Save all the provided files in a folder called `discover-minds-extension`

2. **Required files**:

   - `manifest.json`
   - `background.js`
   - `content.js`
   - `popup.html`
   - `popup.js`

3. **Create icons** (optional but recommended):

   - Create `icon16.png`, `icon48.png`, and `icon128.png` with a clover or similar icon
   - Or use emoji-based icons in the code

4. **Load the extension**:

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select your `discover-minds-extension` folder

5. **Test it**:
   - The notification should appear automatically when you install
   - You can test it again by clicking the extension icon and pressing "Test Notification"

## File Structure

```
discover-minds-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for handling installation
├── content.js            # Content script for showing notifications
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── icon16.png            # 16x16 icon (optional)
├── icon48.png            # 48x48 icon (optional)
└── icon128.png           # 128x128 icon (optional)
```

## How it works

1. When the extension is installed, `background.js` detects the installation event
2. It sends a message to the content script to show the notification
3. `content.js` creates and displays the notification popup that matches your design
4. The notification auto-closes after 5 seconds or when the X button is clicked

## Customization

You can customize the notification by editing the styles in `content.js`:

- Change colors, fonts, or layout
- Modify the notification text
- Adjust timing and animations
- Add more functionality to the popup

## Notes

- The extension works on all websites (`<all_urls>` permission)
- Uses Chrome's Manifest V3 (latest standard)
- Includes proper error handling and cleanup
- No external dependencies required

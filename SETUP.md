# Setup Instructions

## Before First Use

### 1. Create Extension Icons

The extension requires three icon files:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon48.png` (48x48 pixels)
- `icons/icon128.png` (128x128 pixels)

**Option 1: Use the Icon Generator**
1. Open `icons/create-icons.html` in your browser
2. Click the download buttons for each size
3. Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

**Option 2: Create Your Own**
- Use any image editor to create icons representing document filing/legal assistance
- Ensure they are the correct sizes and saved as PNG files

### 2. Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right corner)
3. Click "Load unpacked"
4. Select the `divorce-ez` folder (the folder containing `manifest.json`)
5. The extension should now appear in your extensions list

### 3. First Time Setup

1. Click the extension icon in Chrome toolbar
2. Upload your documents (driver's license, tax returns, etc.)
3. Wait for processing to complete
4. Visit mycase.utcourts.gov/InterviewWEB
5. The auto-fill UI will appear - click "Auto-Fill Forms"

## Troubleshooting

### Icons Not Showing
- Make sure all three icon files exist in the `icons/` folder
- Check that file names match exactly: `icon16.png`, `icon48.png`, `icon128.png`

### OCR Not Working
- Ensure you have an internet connection (Tesseract.js loads from CDN)
- Check browser console for errors (F12 → Console tab)
- Try with a clearer/higher quality document image

### Auto-Fill Not Working
- Make sure you're on the correct MyCase page: `mycase.utcourts.gov/InterviewWEB/*`
- Check that you have stored data (go to Options page)
- Look for the green "Divorce EZ Auto-Fill" box in the top right of the page
- Try refreshing the page after uploading documents

### Data Not Saving
- Check browser console for errors
- Ensure Chrome storage is not full (check `chrome://settings/content/all`)
- Try clearing and re-uploading documents

## Notes

- The extension uses CDN links for Tesseract.js and PDF.js - internet connection required for OCR
- All data is stored locally - no cloud sync
- Sensitive fields are encrypted using XOR encryption (basic - consider upgrading for production)

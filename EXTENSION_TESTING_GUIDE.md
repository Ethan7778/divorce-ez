# Chrome Extension Testing Guide

This guide will help you test the Chrome extension and verify that it can:
1. Connect to the web platform
2. Sync data from uploaded documents
3. Auto-fill forms on the MyCase InterviewWEB system

## Prerequisites

- ✅ Web platform is deployed and working
- ✅ You have a user account on the platform
- ✅ You've uploaded at least one document on the platform
- ✅ Chrome browser installed

## Step 1: Load the Extension in Chrome

1. **Open Chrome Extensions Page:**
   - Go to `chrome://extensions/` in your browser
   - Or: Menu (⋮) → Extensions → Manage Extensions

2. **Enable Developer Mode:**
   - Toggle "Developer mode" switch in the top-right corner

3. **Load the Extension:**
   - Click "Load unpacked"
   - Navigate to your project folder: `C:\Users\ethan\OneDrive\Documents\SandBox\divorce-ez`
   - Select the folder and click "Select Folder"

4. **Verify Extension Loaded:**
   - You should see "Utah Divorce Filing Assistant" in your extensions list
   - Check for any errors (red text) - if you see errors, note them down

## Step 2: Configure Extension URLs

The extension needs to know where to connect. Check these files are configured:

**File: `popup/login.js`** (should already be configured):
```javascript
const SUPABASE_URL = 'https://jjqyweuffxyorqumuyyu.supabase.co'
const PLATFORM_URL = 'https://divorce-ez-4thewin.vercel.app/'
```

**File: `scripts/api-service.js`** (should already be configured):
```javascript
let PLATFORM_URL = 'https://jjqyweuffxyorqumuyyu.supabase.co/functions/v1/api';
```

**Note:** The extension currently expects a Supabase Edge Function at `/functions/v1/api/user/data`. If this doesn't exist yet, you'll need to either:
- Create the Edge Function, OR
- Update the code to fetch directly from Supabase database (we can do this)

## Step 3: Test Extension Login

1. **Open Extension Popup:**
   - Click the extension icon in Chrome toolbar
   - You should see the Divorce EZ popup

2. **Connect to Platform:**
   - Click "Connect to Platform" button
   - A login window should open

3. **Login:**
   - Enter your email and password (same as web platform)
   - Click "Login"
   - You should see "Successfully connected to Divorce EZ Platform!"

4. **Check Sync Status:**
   - Close the login window
   - In the main popup, you should see "Connected to platform"
   - Click "Sync Now" to fetch data from the platform

## Step 4: Test Data Sync

1. **Upload Document on Web Platform:**
   - Go to your deployed site: `https://divorce-ez-4thewin.vercel.app`
   - Login if needed
   - Go to Document Upload module
   - Upload a test document (Driver's License, Pay Stub, etc.)
   - Wait for processing to complete

2. **Sync in Extension:**
   - Open extension popup
   - Click "Sync Now"
   - You should see "Synced successfully!"
   - Check "Last synced" timestamp updates

3. **View Stored Data:**
   - Click "View Stored Data" button
   - You should see the extracted data from your uploaded document
   - Verify personal_info and financial_info are populated

## Step 5: Test Auto-Fill on MyCase Site

1. **Navigate to MyCase:**
   - Go to: `https://mycase.utcourts.gov/InterviewWEB/#/gi/120996`
   - Or any MyCase InterviewWEB form page

2. **Check for Auto-Fill UI:**
   - After the page loads, look for a green box in the top-right corner
   - It should say "Divorce EZ Auto-Fill" with buttons

3. **Test Auto-Fill:**
   - Click "Auto-Fill Forms" button
   - The extension should attempt to fill form fields
   - Check the status message shows "Filled X field(s)"

4. **Verify Data:**
   - Check that form fields are populated with your data
   - Compare with what you uploaded on the platform

## Step 6: Debugging (If Things Don't Work)

### Check Extension Console:
1. Right-click extension icon → "Inspect popup"
2. Or: Go to `chrome://extensions/` → Click "service worker" link (for background script)
3. Look for error messages in the Console tab

### Check Content Script:
1. Go to MyCase page
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for messages from the extension (should see "Divorce EZ" logs)

### Common Issues:

**Issue: "Not authenticated" error**
- Solution: Make sure you logged in via "Connect to Platform"
- Check that SUPABASE_URL is correct in `popup/login.js`

**Issue: "Failed to fetch user data"**
- Solution: The Edge Function might not exist yet
- We may need to create it or change the code to fetch directly from Supabase

**Issue: Auto-fill UI doesn't appear**
- Solution: Check content script is running (F12 Console on MyCase page)
- Verify the page URL matches the pattern in `manifest.json`: `https://mycase.utcourts.gov/InterviewWEB/*`

**Issue: Fields not filling**
- Solution: The form field names might not match our patterns
- Check Console for "No stored data" or mapping errors
- We may need to adjust the field mapping in `scripts/content.js`

## Step 7: Test End-to-End Flow

1. ✅ Upload document on web platform
2. ✅ Sync data in extension
3. ✅ Navigate to MyCase form
4. ✅ See auto-fill UI appear
5. ✅ Click "Auto-Fill Forms"
6. ✅ Verify fields are populated correctly

## Next Steps

If the Edge Function doesn't exist, we have two options:

**Option A: Create Supabase Edge Function**
- Create an Edge Function that fetches user data from the database
- More secure, handles authentication properly

**Option B: Fetch Directly from Supabase**
- Modify the extension to query Supabase database directly
- Simpler, but requires proper RLS policies

Let me know which approach you prefer, or if you encounter any issues during testing!

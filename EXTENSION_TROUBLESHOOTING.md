# Extension Troubleshooting Guide

## Sync Button Not Working / Can't See Data

### Step 1: Check Authentication Status

1. Open the extension popup
2. Look at the connection status indicator:
   - **Green dot** = Connected (you can sync)
   - **Red/gray dot** = Not connected (you need to log in)

### Step 2: Log In to Extension

If you see "Not connected to platform":

1. Click the **"Connect to Platform"** button
2. A login window will open
3. Choose one:
   - **Sign in with Google** (OAuth)
   - **Email/Password** (if you have an account)
4. After successful login, the window will close automatically
5. The popup should refresh and show "Connected to platform"

### Step 3: Sync Data

After logging in:

1. The **"Sync Now"** button should be enabled (not grayed out)
2. Click **"Sync Now"**
3. Wait for the sync to complete (you'll see a progress bar)
4. You should see "Data synced successfully!"

### Step 4: View Your Data

1. Click **"View Stored Data"** button
2. This opens the Options page showing all your synced data
3. You can also see a summary in the popup under "Synced Data"

## Common Issues

### "Sync Now" Button is Disabled

**Cause**: Not logged in to the extension

**Solution**:
1. Click "Connect to Platform"
2. Log in with your credentials
3. The button should enable automatically

### "No data stored yet" in View Stored Data

**Cause**: Either:
- You haven't synced yet
- No data exists on the web platform

**Solution**:
1. Make sure you've uploaded documents on the web platform first
2. Click "Sync Now" in the extension popup
3. Wait for sync to complete
4. Check "View Stored Data" again

### Can't Log In

**Possible causes**:
- Wrong email/password
- OAuth not configured properly
- Network issues

**Solution**:
1. Try logging in on the web platform first: https://divorce-huw6ts83v-ethans-projects-a966bcc9.vercel.app
2. If that works, try the extension login again
3. Check browser console for errors (F12 → Console tab)

### Extension Shows "Not connected" After Login

**Solution**:
1. Close and reopen the extension popup
2. The connection status should update
3. If still not connected, check:
   - Browser console for errors
   - Chrome storage (chrome://extensions → your extension → "Inspect views: service worker")

## Debugging Steps

### Check Extension Console

1. Right-click the extension icon → **"Inspect popup"**
2. Go to **Console** tab
3. Look for error messages
4. Common messages:
   - `"Auth check response:"` - Shows authentication status
   - `"Token check:"` - Shows if tokens are stored
   - `"Not authenticated. Response:"` - Shows why auth failed

### Check Service Worker Console

1. Go to `chrome://extensions/`
2. Find "Utah Divorce Filing Assistant"
3. Click **"Inspect views: service worker"**
4. Check Console for errors
5. Look for:
   - `"Starting sync from platform..."`
   - `"API service initialized"`
   - `"Authentication status:"`

### Check Stored Data

1. Open extension popup
2. Click **"View Stored Data"**
3. Or manually check:
   - Right-click extension icon → Inspect popup
   - Go to **Application** tab → **Storage** → **Local Storage**
   - Look for `accessToken`, `refreshToken`, `personal_info`, `financial_info`

## Quick Checklist

- [ ] Extension is installed and enabled
- [ ] Clicked "Connect to Platform" and logged in
- [ ] Connection status shows "Connected to platform" (green dot)
- [ ] "Sync Now" button is enabled (not grayed out)
- [ ] Clicked "Sync Now" and saw "Data synced successfully!"
- [ ] Clicked "View Stored Data" to see your information

## Still Having Issues?

1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Find your extension
   - Click the reload icon (circular arrow)

2. **Clear extension storage** (if needed):
   - Right-click extension icon → Inspect popup
   - Application tab → Clear storage → Clear site data

3. **Check web platform**:
   - Make sure you can log in at: https://divorce-huw6ts83v-ethans-projects-a966bcc9.vercel.app
   - Verify documents are uploaded
   - Check that data extraction completed

4. **Check browser console** for specific error messages

# OAuth Setup for Chrome Extension

## The Problem
OAuth in the extension isn't working because Supabase needs the extension's redirect URL to be whitelisted.

## Solution

### Step 1: Get Your Extension ID
1. Go to `chrome://extensions/`
2. Find "Utah Divorce Filing Assistant"
3. Copy the Extension ID (long string like `abcdefghijklmnopqrstuvwxyz123456`)

### Step 2: Get the Redirect URL
The redirect URL format is:
```
chrome-extension://[YOUR-EXTENSION-ID]/popup/login.html
```

Replace `[YOUR-EXTENSION-ID]` with your actual extension ID.

### Step 3: Add to Supabase
1. Go to https://supabase.com/dashboard/project/jjqyweuffxyorqumuyyu
2. Navigate to **Authentication** → **URL Configuration**
3. In **"Redirect URLs"**, add:
   ```
   chrome-extension://[YOUR-EXTENSION-ID]/popup/login.html
   ```
   (Replace `[YOUR-EXTENSION-ID]` with your actual ID)

4. Click **"Save"**

### Step 4: Test
1. Reload the extension: `chrome://extensions/` → click reload icon
2. Open extension popup
3. Click "Connect to Platform"
4. Click "Sign in with Google"
5. Complete OAuth flow
6. Should redirect back to extension and log you in

## Troubleshooting

### OAuth still doesn't work?
1. **Check the redirect URL matches exactly** - no trailing slashes, correct extension ID
2. **Check browser console** (right-click extension icon → Inspect popup → Console)
3. **Check service worker console** (`chrome://extensions/` → "Inspect views: service worker")
4. **Verify Supabase settings saved** - wait 1-2 minutes for propagation

### Getting "redirect_uri_mismatch"?
- The redirect URL in Supabase must match EXACTLY what the extension uses
- Check the console log for the actual redirect URL being used
- Make sure there are no extra characters or spaces

### Extension ID changed?
- If you reload the extension in developer mode, the ID might change
- Update Supabase with the new redirect URL
- Or use a permanent extension ID by publishing to Chrome Web Store

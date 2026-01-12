# Configuration Guide

## Understanding the URLs

Your Chrome extension needs to connect to **two different services**:

### 1. Supabase Project URL (for Authentication)
- **What it is**: Your Supabase project URL
- **Format**: `https://[your-project-ref].supabase.co`
- **Where to find it**: Supabase Dashboard → Settings → API → Project URL
- **Used for**: User authentication (login/signup)

### 2. Platform/API URL (for Data Access)
You have **two options**:

#### Option A: Use Supabase Edge Function URL (Recommended)
- **What it is**: Direct URL to your Supabase Edge Function
- **Format**: `https://[your-project-ref].supabase.co/functions/v1/api`
- **Used for**: Fetching user data, progress, etc.
- **Pros**: Simpler, no additional setup needed
- **Cons**: URL includes `/functions/v1/api` path

#### Option B: Use Your Vercel Site URL
- **What it is**: Your deployed Vercel site URL
- **Format**: `https://your-app.vercel.app` or your custom domain
- **Used for**: If you proxy API calls through your Vercel site
- **Pros**: Cleaner URL, can add custom middleware
- **Cons**: Requires setting up API routes in Vercel

## Configuration Steps

### Step 1: Get Your Supabase URLs

1. Go to your Supabase project dashboard
2. Navigate to **Settings → API**
3. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Anon (public) key**

### Step 2: Update Extension Files

#### For Option A (Supabase Edge Function - Recommended):

**In `scripts/api-service.js`:**
```javascript
let PLATFORM_URL = 'https://[your-project-ref].supabase.co/functions/v1/api';
```

**In `popup/login.js`:**
```javascript
const SUPABASE_URL = 'https://[your-project-ref].supabase.co';
// PLATFORM_URL is only used for signup link, can be same or your Vercel site
const PLATFORM_URL = 'https://your-app.vercel.app'; // For signup link
```

#### For Option B (Vercel with API Routes):

You'll need to create API routes in your Vercel deployment that proxy to Supabase Edge Functions.

**In `scripts/api-service.js`:**
```javascript
let PLATFORM_URL = 'https://your-app.vercel.app';
```

**In `popup/login.js`:**
```javascript
const SUPABASE_URL = 'https://[your-project-ref].supabase.co';
const PLATFORM_URL = 'https://your-app.vercel.app';
```

### Step 3: Store Configuration (Optional)

Instead of hardcoding, you can store these in Chrome storage and let users configure them:

1. Create an options page where users can enter:
   - Supabase Project URL
   - Supabase Anon Key
   - Platform URL (if different)

2. Store in `chrome.storage.local`:
   ```javascript
   await chrome.storage.local.set({
     supabaseUrl: 'https://[your-project-ref].supabase.co',
     supabaseAnonKey: 'your-anon-key',
     platformUrl: 'https://your-app.vercel.app' // or Edge Function URL
   });
   ```

## Example Configuration

If your Supabase project is `abcdefgh.supabase.co`:

**Option A (Recommended):**
```javascript
// scripts/api-service.js
let PLATFORM_URL = 'https://abcdefgh.supabase.co/functions/v1/api';

// popup/login.js
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const PLATFORM_URL = 'https://your-app.vercel.app'; // Just for signup link
```

**Option B (Vercel):**
```javascript
// scripts/api-service.js
let PLATFORM_URL = 'https://your-app.vercel.app';

// popup/login.js
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const PLATFORM_URL = 'https://your-app.vercel.app';
```

## Quick Answer

**Yes, if you're deploying to Vercel**, you can use your Vercel URL, BUT:

1. **For authentication**: You MUST use your Supabase project URL (not Vercel)
2. **For API calls**: You can use either:
   - Supabase Edge Function URL directly (easier)
   - Your Vercel URL if you set up API routes that proxy to Supabase

The code currently expects the API to be at `${PLATFORM_URL}/api/user/data`, so if using Supabase Edge Functions directly, the URL should be:
`https://[project-ref].supabase.co/functions/v1/api`

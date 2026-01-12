# Quick Start - Configuration

## What URLs Do I Need?

You need **2 URLs**:

1. **Supabase Project URL** - For authentication
   - Find it: Supabase Dashboard → Settings → API → Project URL
   - Example: `https://abcdefghijklmnop.supabase.co`

2. **API/Platform URL** - For fetching user data
   - **Option 1 (Easiest)**: Use Supabase Edge Function URL
     - Format: `https://[your-project-ref].supabase.co/functions/v1/api`
   - **Option 2**: Use your Vercel site URL (if you set up API routes)
     - Format: `https://your-app.vercel.app`

## Quick Configuration

### Step 1: Update `popup/login.js`

Find these lines and replace:

```javascript
const SUPABASE_URL = 'https://your-project-ref.supabase.co' // ⬅️ Replace with YOUR Supabase URL
const PLATFORM_URL = 'https://your-app.vercel.app' // ⬅️ Replace with YOUR Vercel URL (or keep Supabase URL)
```

### Step 2: Update `scripts/api-service.js`

Find this line and replace:

```javascript
let PLATFORM_URL = 'https://your-platform-domain.com'; // ⬅️ Replace with:
```

**If using Supabase Edge Functions directly:**
```javascript
let PLATFORM_URL = 'https://[your-project-ref].supabase.co/functions/v1/api';
```

**If using Vercel:**
```javascript
let PLATFORM_URL = 'https://your-app.vercel.app';
```

## Example

If your Supabase project URL is `https://xyz123abc.supabase.co`:

**popup/login.js:**
```javascript
const SUPABASE_URL = 'https://xyz123abc.supabase.co'
const PLATFORM_URL = 'https://divorce-ez.vercel.app' // Your Vercel site
```

**scripts/api-service.js:**
```javascript
let PLATFORM_URL = 'https://xyz123abc.supabase.co/functions/v1/api';
```

That's it! The extension will now connect to your Supabase backend.

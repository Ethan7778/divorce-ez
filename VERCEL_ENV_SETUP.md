# Vercel Environment Variables Setup

## Required Environment Variables

Your Vercel deployment needs these environment variables to work:

1. **VITE_SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://[your-project-ref].supabase.co`
   - Example: `https://jjqyweuffxyorqumuyyu.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - Your Supabase anonymous/public key
   - Find it in: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **VITE_GEMINI_API_KEY** (Optional but recommended)
   - Your Google Gemini API key for improved document extraction
   - Get it from: https://makersuite.google.com/app/apikey or https://aistudio.google.com/app/apikey
   - Example: `AIzaSy...`
   - Note: If not set, the system will use regex parsing only (less accurate)

4. **VITE_GEMINI_MODEL** (Optional)
   - Gemini model to use (default: "gemini-1.5-flash")
   - Options: "gemini-1.5-flash" (cheaper, faster) or "gemini-1.5-pro" (more accurate)
   - Default: `gemini-1.5-flash`

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: Your Supabase project URL
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**
5. Repeat for `VITE_SUPABASE_ANON_KEY`

## After Adding Variables

1. **Redeploy** your project:
   - Go to **Deployments** tab
   - Click the **⋯** menu on the latest deployment
   - Select **Redeploy**
   - Or push a new commit to trigger automatic deployment

## Verify Setup

After redeploying, check:
1. Open your site URL
2. Open browser DevTools (F12) → Console tab
3. You should NOT see "Missing Supabase environment variables" error
4. The login page should load properly

## Quick Copy-Paste

Based on your `.env.local` file, your values should be:

```
VITE_SUPABASE_URL=https://jjqyweuffxyorqumuyyu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXl3ZXVmZnh5b3JxdW11eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzM2MTAsImV4cCI6MjA4MzgwOTYxMH0.7U8Gyl2y6xdlESnkMeBql0BUr3tS5lSVBky27CyFx84
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-1.5-flash
```

**⚠️ Important**: Make sure there are NO spaces around the `=` sign in Vercel's environment variable settings.

## Gemini API Setup

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key
5. Add it to Vercel environment variables as `VITE_GEMINI_API_KEY`
6. Redeploy your application

**Cost Note**: Gemini API is pay-as-you-go. With smart fallback (only ~20% of documents use Gemini), estimated cost is <$0.10/month for typical usage.

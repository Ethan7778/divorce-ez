# Supabase OAuth Configuration Guide

## The Problem
If OAuth redirects to `localhost:3000` or `localhost:5173` instead of your production URL, it's because Supabase's dashboard settings are overriding your code.

## Solution: Configure Supabase Dashboard

### Step 1: Go to Supabase Dashboard
1. Visit https://supabase.com/dashboard
2. Select your project: `jjqyweuffxyorqumuyyu`

### Step 2: Configure Authentication URLs
1. Go to **Authentication** → **URL Configuration** (left sidebar)
2. Find the **"Redirect URLs"** section
3. **REMOVE** any localhost entries:
   - ❌ Remove: `http://localhost:3000/**`
   - ❌ Remove: `http://localhost:5173/**`
   - ❌ Remove: `http://127.0.0.1:3000/**`
   - ❌ Remove: `http://127.0.0.1:5173/**`

4. **ADD** your production URL:
   - ✅ Add: `https://divorce-huw6ts83v-ethans-projects-a966bcc9.vercel.app/dashboard`
   - ✅ Add: `https://divorce-huw6ts83v-ethans-projects-a966bcc9.vercel.app/**` (wildcard for all routes)

5. Set **"Site URL"** to:
   - ✅ `https://divorce-huw6ts83v-ethans-projects-a966bcc9.vercel.app`

6. Click **"Save"**

### Step 3: Configure Google OAuth Provider
1. Go to **Authentication** → **Providers** (left sidebar)
2. Find **"Google"** in the list
3. Click to expand Google settings
4. Make sure it's **Enabled**
5. Enter your **Google Client ID** and **Client Secret** (from Google Cloud Console)
6. **Important**: In the **"Authorized redirect URIs"** section, add:
   - `https://jjqyweuffxyorqumuyyu.supabase.co/auth/v1/callback`
7. Click **"Save"**

### Step 4: Verify Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. In **"Authorized redirect URIs"**, make sure you have:
   - `https://jjqyweuffxyorqumuyyu.supabase.co/auth/v1/callback`

## Testing

After making these changes:
1. Wait 1-2 minutes for changes to propagate
2. Try OAuth login again on your production site
3. It should redirect to: `https://divorce-huw6ts83v-ethans-projects-a966bcc9.vercel.app/dashboard`

## Troubleshooting

### Still redirecting to localhost?
1. **Clear browser cache** and cookies for your site
2. **Check Supabase logs**: Go to Authentication → Logs to see what redirect URL was requested
3. **Verify the code**: Check browser console for the log message showing the redirect URL being used
4. **Double-check**: Make sure you saved changes in Supabase dashboard

### Getting "redirect_uri_mismatch" error?
- This means the redirect URL in your code doesn't match what's configured in Supabase
- Make sure the production URL is in Supabase's "Redirect URLs" list
- Make sure there are NO localhost URLs in the list

### OAuth works in development but not production?
- Supabase allows localhost redirects by default in development
- For production, you MUST add the production URL to the allowed list
- The code now forces production URL when not in development

## Quick Checklist

- [ ] Removed all localhost URLs from Supabase Redirect URLs
- [ ] Added production URL to Supabase Redirect URLs
- [ ] Set Site URL to production URL
- [ ] Google OAuth is enabled in Supabase
- [ ] Google Client ID and Secret are configured
- [ ] Supabase callback URL is in Google Cloud Console
- [ ] Saved all changes
- [ ] Waited 1-2 minutes for propagation
- [ ] Tested OAuth login

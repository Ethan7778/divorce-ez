# Vercel Deployment Troubleshooting

## Issue: UI Changes Not Appearing After Deployment

### Steps to Verify and Fix:

1. **Check Vercel Dashboard - Build Logs**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Go to "Deployments" tab
   - Click on the latest deployment
   - Check the "Build Logs" tab
   - Look for any errors or warnings

2. **Verify Vercel Project Settings**
   - Go to: Settings → General
   - Check these settings:
     - **Root Directory**: Should be `.` (empty) or not set
     - **Framework Preset**: Should be "Other" or "Vite"
     - **Build Command**: `cd divorce-ez-platform && npm install && npm run build`
     - **Output Directory**: `divorce-ez-platform/dist`
     - **Install Command**: `cd divorce-ez-platform && npm install`

3. **Check Branch Settings**
   - Go to: Settings → Git
   - Verify "Production Branch" is set to `main`
   - Check that Vercel is connected to the correct GitHub repository

4. **Force a Clean Build**
   - In Vercel Dashboard → Deployments
   - Click the "..." menu on latest deployment
   - Select "Redeploy"
   - Check "Use existing Build Cache" = OFF
   - Click "Redeploy"

5. **Verify Environment Variables**
   - Go to: Settings → Environment Variables
   - Ensure these are set for Production:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

6. **Check Build Output**
   - After deployment completes, check the build logs
   - Look for: "✓ built in X.XXs"
   - Verify no TypeScript or build errors

7. **Browser Cache Issues**
   - Open site in Incognito/Private window
   - Or use: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

8. **Verify Files Are Actually Deployed**
   - In Vercel Dashboard → Deployments → latest deployment
   - Click "Visit" to see the deployed site
   - Open DevTools (F12) → Sources tab
   - Check if the JavaScript files contain your new code
   - Look for "Canvas-style" or "sidebar" in the source files

### Common Issues:

**Issue 1: Vercel Using Wrong Root Directory**
- If Root Directory is set to `divorce-ez-platform`, change it to `.` (empty)

**Issue 2: Build Cache**
- Vercel might be using cached build artifacts
- Solution: Redeploy with "Use existing Build Cache" = OFF

**Issue 3: Build Failing Silently**
- Check build logs for errors
- Common errors: Missing dependencies, TypeScript errors, build timeout

**Issue 4: Wrong Branch**
- Verify Vercel is deploying from `main` branch
- Check Git → Production Branch setting

### Quick Test:

Add this to `divorce-ez-platform/src/pages/dashboard/Dashboard.tsx` at the top of the return statement to verify deployment:

```tsx
console.log('UI Version: 2.0.0 - Canvas Style')
```

Then check browser console on deployed site to see if this log appears.

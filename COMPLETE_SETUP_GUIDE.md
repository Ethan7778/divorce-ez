# Complete Setup Guide - Divorce EZ Platform

This guide will walk you through setting up both the Chrome Extension and Web Platform.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Chrome browser
- A Supabase account (free tier works)

---

## Part 1: Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: `divorce-ez` (or your choice)
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to you
4. Click "Create new project" (takes 2-3 minutes)

### Step 2: Get Your Supabase Credentials

1. In your Supabase project, go to **Settings → API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon (public) key**: `eyJhbGc...` (long string)
   - **Service Role Key**: (keep this secret!)

### Step 3: Set Up Database Schema

1. In Supabase, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `divorce-ez-platform/supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. You should see "Success. No rows returned"

### Step 4: Create Storage Bucket

1. Go to **Storage** in Supabase
2. Click "New bucket"
3. Name: `documents`
4. **Uncheck** "Public bucket" (keep it private)
5. Click "Create bucket"
6. Go to **Policies** tab
7. Click "New Policy" → "For full customization"
8. Use this policy (allows users to upload their own files):

```sql
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## Part 2: Web Platform Setup

### Step 1: Navigate to Platform Directory

```bash
cd divorce-ez-platform
```

If the directory doesn't exist, it should be in the parent directory or you may need to create it.

### Step 2: Install Dependencies

```bash
npm install
npm install tesseract.js pdfjs-dist
```

### Step 3: Configure Environment Variables

1. Create a `.env` file in `divorce-ez-platform/`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

Replace with your actual Supabase values from Part 1, Step 2.

### Step 4: Run Development Server

```bash
npm run dev
```

The platform should open at `http://localhost:5173`

### Step 5: Test the Platform

1. Open `http://localhost:5173`
2. Click "Sign Up" and create an account
3. You should receive a confirmation email (check spam)
4. Log in
5. Try uploading a document to test OCR

---

## Part 3: Chrome Extension Setup

### Step 1: Configure Extension URLs

You need to update two files with your Supabase URL:

#### File 1: `popup/login.js`

Find these lines (around line 6-7):
```javascript
const SUPABASE_URL = 'https://your-project-ref.supabase.co'
const PLATFORM_URL = 'https://your-app.vercel.app'
```

Replace with:
```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'  // Your Supabase Project URL
const PLATFORM_URL = 'https://xxxxx.supabase.co/functions/v1/api'  // For API calls
```

#### File 2: `scripts/api-service.js`

Find this line (around line 7):
```javascript
let PLATFORM_URL = 'https://your-platform-domain.com';
```

Replace with:
```javascript
let PLATFORM_URL = 'https://xxxxx.supabase.co/functions/v1/api';
```

**Note**: Replace `xxxxx` with your actual Supabase project reference.

### Step 2: Configure Supabase Anon Key (Optional)

For testing, you can hardcode the anon key in `popup/login.js`:

Find the `getSupabaseAnonKey` function and update:
```javascript
async function getSupabaseAnonKey() {
  const result = await chrome.storage.local.get(['supabaseAnonKey'])
  return result.supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY_HERE'
}
```

Or better: Create an options page where users can configure it.

### Step 3: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **"Load unpacked"**
4. Navigate to and select the `divorce-ez` folder (the one with `manifest.json`)
5. The extension should appear in your extensions list

### Step 4: Test Extension

1. Click the extension icon in Chrome toolbar
2. Click **"Connect to Platform"**
3. Enter your Supabase account email and password
4. You should see "Successfully connected!"
5. Try uploading a document to test local OCR

---

## Part 4: Deploy Edge Function (Optional - for API)

If you want to use the API Edge Function:

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Project

```bash
cd divorce-ez-platform
supabase link --project-ref xxxxx
```

Replace `xxxxx` with your project reference.

### Step 4: Deploy Function

```bash
supabase functions deploy api
```

**Note**: The Edge Function is optional if you're using browser OCR. The extension can work without it if you configure the API service to call Supabase directly.

---

## Part 5: Testing Everything

### Test Web Platform

1. ✅ Sign up/Login works
2. ✅ Upload a document (PDF or image)
3. ✅ See OCR processing progress
4. ✅ See extracted data saved
5. ✅ Dashboard modules work

### Test Chrome Extension

1. ✅ Extension loads without errors
2. ✅ Can login with Supabase credentials
3. ✅ Can sync data from platform
4. ✅ Can upload documents locally (fallback)
5. ✅ Visit MyCase site and see auto-fill UI

### Test Integration

1. Upload document on web platform
2. Open Chrome extension
3. Click "Sync Now"
4. Verify data appears in extension
5. Visit MyCase site and test auto-fill

---

## Troubleshooting

### Extension won't load
- Check `manifest.json` is valid JSON
- Check all file paths in manifest exist
- Look at Chrome extension errors page

### Can't login in extension
- Verify `SUPABASE_URL` is correct
- Verify anon key is correct
- Check browser console for errors

### OCR not working
- Check Tesseract.js files are in `lib/` folder
- Check browser console for errors
- Verify file type is supported (PDF, JPG, PNG)

### API calls failing
- Verify `PLATFORM_URL` is correct
- Check CORS settings in Supabase
- Verify Edge Function is deployed (if using)

### Database errors
- Verify migration ran successfully
- Check RLS policies are set up
- Verify user is authenticated

---

## Quick Reference

### Important URLs to Configure

1. **Supabase Project URL**: `https://xxxxx.supabase.co`
   - Used in: `popup/login.js` (SUPABASE_URL)
   - Used in: `.env` file (VITE_SUPABASE_URL)

2. **Supabase Anon Key**: `eyJhbGc...`
   - Used in: `.env` file (VITE_SUPABASE_ANON_KEY)
   - Used in: Extension options or hardcoded for testing

3. **API URL**: `https://xxxxx.supabase.co/functions/v1/api`
   - Used in: `scripts/api-service.js` (PLATFORM_URL)
   - Used in: `popup/login.js` (PLATFORM_URL for API calls)

### File Locations

- **Chrome Extension**: `divorce-ez/` folder
- **Web Platform**: `divorce-ez-platform/` folder
- **Database Migration**: `divorce-ez-platform/supabase/migrations/001_initial_schema.sql`

---

## Next Steps After Setup

1. **Deploy Web Platform** to Vercel/Netlify
2. **Update extension URLs** to point to deployed platform
3. **Test end-to-end** workflow
4. **Customize form mappings** in `scripts/content.js` for MyCase
5. **Add error handling** and user feedback

---

## Need Help?

- Check browser console for errors
- Check Supabase logs in dashboard
- Verify all URLs and keys are correct
- Make sure all dependencies are installed

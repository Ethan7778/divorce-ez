# Quick Start Checklist

Follow these steps in order to get everything running:

## ✅ Step 1: Supabase Setup (5 minutes)

- [ ] Create Supabase account at https://supabase.com
- [ ] Create new project
- [ ] Copy **Project URL** and **Anon Key** from Settings → API
- [ ] Run SQL migration: Go to SQL Editor → Paste `001_initial_schema.sql` → Run
- [ ] Create storage bucket named `documents` (private)
- [ ] Set up storage policies (see COMPLETE_SETUP_GUIDE.md)

**You'll need these values:**
- Supabase URL: `https://xxxxx.supabase.co`
- Anon Key: `eyJhbGc...`

---

## ✅ Step 2: Web Platform Setup (5 minutes)

```bash
# Navigate to platform directory
cd divorce-ez-platform

# Install dependencies
npm install
npm install tesseract.js pdfjs-dist

# Create .env file
# Copy the template below and fill in your Supabase values
```

**Create `.env` file:**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Start development server:**
```bash
npm run dev
```

- [ ] Platform opens at http://localhost:5173
- [ ] Can sign up and create account
- [ ] Can log in
- [ ] Can upload a test document

---

## ✅ Step 3: Chrome Extension Setup (3 minutes)

**Update URLs in extension:**

1. **Edit `popup/login.js`** (line ~6-7):
```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'  // Your Supabase URL
const PLATFORM_URL = 'https://xxxxx.supabase.co/functions/v1/api'  // API URL
```

2. **Edit `scripts/api-service.js`** (line ~7):
```javascript
let PLATFORM_URL = 'https://xxxxx.supabase.co/functions/v1/api';
```

**Load extension in Chrome:**
- [ ] Open `chrome://extensions/`
- [ ] Enable Developer mode
- [ ] Click "Load unpacked"
- [ ] Select the `divorce-ez` folder
- [ ] Extension appears in list

**Test extension:**
- [ ] Click extension icon
- [ ] Click "Connect to Platform"
- [ ] Login with Supabase credentials
- [ ] See "Successfully connected!"

---

## ✅ Step 4: Test Everything (5 minutes)

**Test Web Platform:**
- [ ] Upload a document (PDF or image)
- [ ] See OCR processing progress
- [ ] See extracted data saved
- [ ] Check dashboard shows progress

**Test Chrome Extension:**
- [ ] Click "Sync Now" in extension
- [ ] See data synced from platform
- [ ] Visit MyCase site: https://mycase.utcourts.gov/InterviewWEB
- [ ] See auto-fill UI appear
- [ ] Test auto-fill button

**Test Integration:**
- [ ] Upload document on web platform
- [ ] Sync in extension
- [ ] Verify data appears
- [ ] Test auto-fill on MyCase

---

## 🚨 Common Issues

### Extension won't load
- Check `manifest.json` is valid
- Check all file paths exist
- Look at Chrome extension errors

### Can't login
- Verify Supabase URL is correct
- Check anon key is correct
- Look at browser console (F12)

### OCR not working
- Check Tesseract.js files in `lib/` folder
- Check browser console for errors
- Verify file is PDF, JPG, or PNG

### Platform won't start
- Run `npm install` again
- Check Node.js version (need v18+)
- Check `.env` file exists and has correct values

---

## 📝 Configuration Summary

**Files to update with your Supabase URL:**

1. `divorce-ez-platform/.env`
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

2. `popup/login.js`
   ```javascript
   const SUPABASE_URL = 'https://xxxxx.supabase.co'
   const PLATFORM_URL = 'https://xxxxx.supabase.co/functions/v1/api'
   ```

3. `scripts/api-service.js`
   ```javascript
   let PLATFORM_URL = 'https://xxxxx.supabase.co/functions/v1/api';
   ```

**Replace `xxxxx` with your actual Supabase project reference!**

---

## 🎯 You're Done When...

- ✅ Web platform runs on localhost:5173
- ✅ Can create account and login
- ✅ Can upload documents and see OCR work
- ✅ Chrome extension loads without errors
- ✅ Can login to extension with Supabase account
- ✅ Can sync data between platform and extension
- ✅ Auto-fill UI appears on MyCase site

---

## Next Steps

1. **Deploy web platform** to Vercel/Netlify
2. **Update extension URLs** to point to deployed site
3. **Customize form mappings** for MyCase forms
4. **Add more document types** if needed
5. **Test with real documents**

---

## Need Help?

- Check `COMPLETE_SETUP_GUIDE.md` for detailed instructions
- Check browser console (F12) for errors
- Check Supabase dashboard for database issues
- Verify all URLs and keys are correct

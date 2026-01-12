# Web Platform Browser OCR Implementation

## Overview

The web platform should use **browser-based OCR** (Tesseract.js) just like the Chrome extension, not server-side processing.

## Implementation Steps

### 1. Install Dependencies

In `divorce-ez-platform/`:

```bash
npm install tesseract.js pdfjs-dist
```

### 2. Create Browser OCR Service

Create `src/services/ocrService.ts` that:
- Uses Tesseract.js for image OCR
- Uses PDF.js for PDF text extraction
- Processes documents in the browser
- Returns extracted text and structured data

### 3. Update DocumentUpload Component

- Process file in browser before upload
- Show OCR progress
- Extract data using DocumentParser logic
- Upload extracted data to Supabase (not raw file, or optionally both)

### 4. Update Document Service

- Remove Edge Function trigger
- Store extracted data directly in `extracted_data` table
- Optionally store file in Supabase Storage for reference

## Benefits

✅ **Privacy** - Documents processed locally, never sent to server
✅ **Speed** - No server round-trip
✅ **Cost** - No server processing costs
✅ **Consistency** - Same OCR as Chrome extension

## Next Steps

I'll create the browser OCR implementation files for the web platform. Should I proceed?

# Divorce EZ - Utah Divorce Filing Assistant

A Chrome extension that helps users filing for divorce in Utah by uploading financial documents and identification, extracting relevant information using OCR, and auto-filling forms on the MyCase InterviewWEB system.

## Features

- **Document Upload**: Upload driver's license, tax returns, pay stubs, bank statements, and W-2/1099 forms
- **OCR Processing**: Automatically extracts text and data from uploaded documents using Tesseract.js
- **PDF Support**: Parses PDF documents using PDF.js
- **Data Storage**: Securely stores extracted data locally with encryption for sensitive fields
- **Auto-Fill**: Automatically fills forms on mycase.utcourts.gov/InterviewWEB with extracted data
- **Data Management**: View, edit, and manage stored data through the options page

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extension directory

## Usage

1. Click the extension icon in Chrome toolbar
2. Select the document type you want to upload
3. Drag and drop or click to upload your document
4. Wait for processing to complete
5. Visit mycase.utcourts.gov/InterviewWEB to use auto-fill
6. Click "Auto-Fill Forms" button that appears on the page

## Privacy & Security

- All data is stored locally on your device
- Sensitive information (SSN, account numbers) is encrypted
- No data is sent to external servers
- You can clear all data at any time through the options page

## Technical Details

- **Manifest V3**: Modern Chrome extension format
- **Tesseract.js**: Client-side OCR for document text extraction
- **PDF.js**: PDF parsing library
- **Chrome Storage API**: Local data persistence
- **Content Scripts**: Form interaction on MyCase site

## Development

The extension consists of:
- `manifest.json` - Extension configuration
- `popup/` - Document upload interface
- `options/` - Data management page
- `scripts/` - Background worker, content script, document parser, and storage manager

## Notes

- OCR accuracy depends on document quality
- Some fields may require manual review/correction
- Form detection may need adjustment if MyCase site structure changes

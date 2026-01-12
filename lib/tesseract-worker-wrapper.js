/**
 * Tesseract Worker Wrapper for Chrome Extension
 * This wrapper intercepts worker creation and uses local files
 */

// Override Worker creation to use local files
const originalWorker = window.Worker;
window.Worker = function(scriptURL, options) {
  // If it's trying to load from CDN, replace with local path
  if (typeof scriptURL === 'string' && scriptURL.includes('cdn.jsdelivr.net')) {
    scriptURL = chrome.runtime.getURL('lib/worker.min.js');
  }
  return new originalWorker(scriptURL, options);
};

// Also handle blob URLs
const originalBlob = window.Blob;
window.Blob = function(blobParts, options) {
  // Check if blob contains CDN URLs and replace them
  if (blobParts && Array.isArray(blobParts)) {
    blobParts = blobParts.map(part => {
      if (typeof part === 'string' && part.includes('cdn.jsdelivr.net')) {
        return part.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js@[^/]+\/dist\/worker\.min\.js/g, 
          chrome.runtime.getURL('lib/worker.min.js'));
      }
      return part;
    });
  }
  return new originalBlob(blobParts, options);
};

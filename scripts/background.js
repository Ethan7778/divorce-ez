/**
 * Background Service Worker - Handles data management
 * Note: Document processing is done in popup.js since service workers can't access Tesseract.js/PDF.js
 */

importScripts('storage-manager.js');
importScripts('api-service.js');

const storageManager = new StorageManager();

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStoredData') {
    // Try to get from API first, fallback to local storage
    getDataWithFallback()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'saveData') {
    storageManager.saveData(request.data)
      .then(success => sendResponse({ success }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'clearData') {
    storageManager.clearData()
      .then(success => sendResponse({ success }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'authSuccess') {
    // User successfully authenticated, trigger sync
    syncFromPlatform()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'syncFromPlatform') {
    syncFromPlatform()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'isAuthenticated') {
    (async () => {
      try {
        await apiService.init();
        const isAuthenticated = await apiService.isAuthenticated();
        sendResponse({ success: true, isAuthenticated });
      } catch (error) {
        console.warn('Auth check error:', error);
        sendResponse({ success: true, isAuthenticated: false });
      }
    })();
    return true; // Keep the channel open for async response
  }
});

/**
 * Get data with fallback: try API first, then local storage
 */
async function getDataWithFallback() {
  try {
    await apiService.init();
    const isAuthenticated = await apiService.isAuthenticated();
    
    if (isAuthenticated) {
      try {
        const formData = await apiService.getUserFormData();
        if (formData) {
          // Cache in local storage
          await storageManager.saveData({
            personal_info: formData.personal_info || {},
            financial_info: formData.financial_info || {},
            synced: true,
          });
          return {
            personal_info: formData.personal_info || {},
            financial_info: formData.financial_info || {},
            synced: true,
          };
        }
      } catch (error) {
        console.warn('Failed to fetch from API, using local cache:', error);
      }
    }
  } catch (error) {
    console.warn('API service not available, using local storage:', error);
  }

  // Fallback to local storage
  return await storageManager.getData();
}

/**
 * Sync data from platform
 */
async function syncFromPlatform() {
  try {
    console.log('Starting sync from platform...');
    await apiService.init();
    console.log('API service initialized');
    
    const isAuthenticated = await apiService.isAuthenticated();
    console.log('Authentication status:', isAuthenticated);
    
    if (!isAuthenticated) {
      throw new Error('Not authenticated. Please log in first.');
    }

    console.log('Fetching user form data...');
    const formData = await apiService.getUserFormData();
    console.log('Form data received:', formData);
    
    if (formData) {
      const dataToSave = {
        personal_info: formData.personal_info || {},
        financial_info: formData.financial_info || {},
        synced: true,
        syncedAt: new Date().toISOString(),
      };

      console.log('Saving data to local storage:', dataToSave);
      await storageManager.saveData(dataToSave);
      await chrome.storage.local.set({ lastSyncTime: Date.now() });
      
      console.log('Sync completed successfully');
      return dataToSave;
    } else {
      console.warn('No form data returned from API');
      throw new Error('No data found. Please upload documents on the web platform first.');
    }
  } catch (error) {
    console.error('Sync error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set up initial storage
    chrome.storage.local.set({
      installed: true,
      installDate: new Date().toISOString()
    });
  }
});

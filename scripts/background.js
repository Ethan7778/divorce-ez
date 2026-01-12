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
    apiService.init().then(() => {
      apiService.isAuthenticated()
        .then(isAuthenticated => sendResponse({ success: true, isAuthenticated }))
        .catch(error => {
          // Don't fail on network errors - just return false
          console.warn('Auth check error:', error);
          sendResponse({ success: true, isAuthenticated: false });
        });
    }).catch(error => {
      console.warn('API service init error:', error);
      sendResponse({ success: true, isAuthenticated: false });
    });
    return true;
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
    await apiService.init();
    const isAuthenticated = await apiService.isAuthenticated();
    
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }

    const formData = await apiService.getUserFormData();
    
    if (formData) {
      const dataToSave = {
        personal_info: formData.personal_info || {},
        financial_info: formData.financial_info || {},
        synced: true,
        syncedAt: new Date().toISOString(),
      };

      await storageManager.saveData(dataToSave);
      await chrome.storage.local.set({ lastSyncTime: Date.now() });
      
      return dataToSave;
    }
  } catch (error) {
    console.error('Sync error:', error);
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

/**
 * Popup Script - Handles sync from web platform
 */

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuthStatus();
  await updateDataSummary();
  
  // Listen for auth success messages (when user logs in)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'authSuccess') {
      // Refresh auth status and data when user logs in
      checkAuthStatus();
      updateDataSummary();
    }
  });
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const syncButton = document.getElementById('syncButton');
  const loginButton = document.getElementById('loginButton');
  const viewDataButton = document.getElementById('viewDataButton');
  const optionsButton = document.getElementById('optionsButton');

  // Sync button
  if (syncButton) {
    syncButton.addEventListener('click', async () => {
      await syncWithPlatform();
    });
  }

  // Login button
  if (loginButton) {
    loginButton.addEventListener('click', () => {
      chrome.windows.create({
        url: chrome.runtime.getURL('popup/login.html'),
        type: 'popup',
        width: 400,
        height: 500,
      });
    });
  }

  // View data button
  if (viewDataButton) {
    viewDataButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Options button
  if (optionsButton) {
    optionsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
}

/**
 * Check authentication status and update UI
 */
async function checkAuthStatus() {
  const connectionStatus = document.getElementById('connectionStatus');
  const statusIndicator = document.getElementById('statusIndicator');
  const connectionStatusText = document.getElementById('connectionStatusText');
  const syncButton = document.getElementById('syncButton');
  const loginButton = document.getElementById('loginButton');

  try {
    // Check if we have tokens stored
    const tokenCheck = await chrome.storage.local.get(['accessToken', 'refreshToken', 'expiresAt']);
    console.log('Token check:', {
      hasAccessToken: !!tokenCheck.accessToken,
      hasRefreshToken: !!tokenCheck.refreshToken,
      expiresAt: tokenCheck.expiresAt ? new Date(tokenCheck.expiresAt).toLocaleString() : 'none',
      isExpired: tokenCheck.expiresAt ? Date.now() >= tokenCheck.expiresAt : true
    });

    const response = await chrome.runtime.sendMessage({ action: 'isAuthenticated' });
    console.log('Auth check response:', response);
    
    if (response && response.success && response.isAuthenticated) {
      // Connected
      statusIndicator.className = 'status-indicator connected';
      connectionStatusText.textContent = 'Connected to platform';
      if (syncButton) {
        syncButton.disabled = false;
        syncButton.style.cursor = 'pointer';
      }
      if (loginButton) {
        loginButton.style.display = 'none';
      }
      
      // Update last sync time
      const lastSyncResponse = await chrome.storage.local.get(['lastSyncTime']);
      if (lastSyncResponse.lastSyncTime) {
        const lastSync = document.getElementById('lastSync');
        const lastSyncTime = document.getElementById('lastSyncTime');
        if (lastSync) lastSync.style.display = 'block';
        if (lastSyncTime) lastSyncTime.textContent = new Date(lastSyncResponse.lastSyncTime).toLocaleString();
      }
    } else {
      // Not connected
      statusIndicator.className = 'status-indicator disconnected';
      connectionStatusText.textContent = 'Not connected to platform';
      if (syncButton) {
        syncButton.disabled = true;
        syncButton.style.cursor = 'not-allowed';
      }
      if (loginButton) {
        loginButton.style.display = 'block';
      }
      console.log('Not authenticated. Response:', response);
      console.log('To connect: Click "Connect to Platform" button and log in');
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    // On error, assume not connected but don't show error state
    statusIndicator.className = 'status-indicator disconnected';
    connectionStatusText.textContent = 'Not connected to platform';
    if (syncButton) {
      syncButton.disabled = true;
      syncButton.style.cursor = 'not-allowed';
    }
    if (loginButton) {
      loginButton.style.display = 'block';
    }
  }
}

/**
 * Sync data from platform
 */
async function syncWithPlatform() {
  const syncButton = document.getElementById('syncButton');
  const statusSection = document.getElementById('statusSection');
  const statusMessage = document.getElementById('statusMessage');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const connectionStatusText = document.getElementById('connectionStatusText');

  syncButton.disabled = true;
  statusSection.style.display = 'block';
  progressBar.style.display = 'block';
  statusMessage.textContent = 'Syncing data from platform...';
  statusMessage.className = 'status-message info';
  progressFill.style.width = '0%';

  // Animate progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 10;
    if (progress <= 90) {
      progressFill.style.width = progress + '%';
    }
  }, 200);

  try {
    const response = await chrome.runtime.sendMessage({ action: 'syncFromPlatform' });
    
    clearInterval(progressInterval);
    progressFill.style.width = '100%';

    if (response.success) {
      statusMessage.textContent = 'Data synced successfully!';
      statusMessage.className = 'status-message success';
      
      // Update last sync time
      const lastSync = document.getElementById('lastSync');
      const lastSyncTime = document.getElementById('lastSyncTime');
      lastSync.style.display = 'block';
      lastSyncTime.textContent = new Date().toLocaleString();
      
      // Update data summary
      await updateDataSummary();
      
      // Hide status after 3 seconds
      setTimeout(() => {
        statusSection.style.display = 'none';
        progressBar.style.display = 'none';
      }, 3000);
    } else {
      const errorMsg = response.error || 'Unknown error'
      statusMessage.textContent = `Sync failed: ${errorMsg}`;
      statusMessage.className = 'status-message error';
      console.error('Sync failed:', response);
      
      // Show more details in console for debugging
      if (response.error) {
        console.error('Sync error details:', response.error);
      }
    }
  } catch (error) {
    clearInterval(progressInterval);
    const errorMsg = error.message || 'Unknown error occurred'
    statusMessage.textContent = `Error: ${errorMsg}`;
    statusMessage.className = 'status-message error';
    console.error('Sync error:', error);
    console.error('Error stack:', error.stack);
  } finally {
    syncButton.disabled = false;
  }
}

/**
 * Update data summary display
 */
async function updateDataSummary() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStoredData' });
    
    if (response.success && response.data) {
      const data = response.data;
      const personalInfo = data.personal_info || {};
      const financialInfo = data.financial_info || {};
      
      // Count non-empty fields
      const personalCount = Object.values(personalInfo).filter(v => v != null && v !== '').length;
      const financialCount = Object.values(financialInfo).filter(v => v != null && v !== '').length;
      
      const dataSummary = document.getElementById('dataSummary');
      const personalInfoCount = document.getElementById('personalInfoCount');
      const financialInfoCount = document.getElementById('financialInfoCount');
      
      if (personalCount > 0 || financialCount > 0) {
        dataSummary.style.display = 'block';
        personalInfoCount.textContent = `${personalCount} field${personalCount !== 1 ? 's' : ''}`;
        financialInfoCount.textContent = `${financialCount} field${financialCount !== 1 ? 's' : ''}`;
      } else {
        dataSummary.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error updating data summary:', error);
  }
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  const statusSection = document.getElementById('statusSection');
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = 'status-message ' + type;
  statusSection.style.display = 'block';
}

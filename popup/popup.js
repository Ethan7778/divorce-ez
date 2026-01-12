/**
 * Popup Script - Handles sync from web platform
 */

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuthStatus();
  await updateDataSummary();
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
    const response = await chrome.runtime.sendMessage({ action: 'isAuthenticated' });
    
    if (response && response.success && response.isAuthenticated) {
      // Connected
      statusIndicator.className = 'status-indicator connected';
      connectionStatusText.textContent = 'Connected to platform';
      syncButton.disabled = false;
      loginButton.style.display = 'none';
      
      // Update last sync time
      const lastSyncResponse = await chrome.storage.local.get(['lastSyncTime']);
      if (lastSyncResponse.lastSyncTime) {
        const lastSync = document.getElementById('lastSync');
        const lastSyncTime = document.getElementById('lastSyncTime');
        lastSync.style.display = 'block';
        lastSyncTime.textContent = new Date(lastSyncResponse.lastSyncTime).toLocaleString();
      }
    } else {
      // Not connected
      statusIndicator.className = 'status-indicator disconnected';
      connectionStatusText.textContent = 'Not connected to platform';
      syncButton.disabled = true;
      loginButton.style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    // On error, assume not connected but don't show error state
    statusIndicator.className = 'status-indicator disconnected';
    connectionStatusText.textContent = 'Not connected to platform';
    syncButton.disabled = true;
    loginButton.style.display = 'block';
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
      statusMessage.textContent = `Sync failed: ${response.error || 'Unknown error'}`;
      statusMessage.className = 'status-message error';
    }
  } catch (error) {
    clearInterval(progressInterval);
    statusMessage.textContent = `Error: ${error.message}`;
    statusMessage.className = 'status-message error';
    console.error('Sync error:', error);
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

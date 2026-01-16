/**
 * Content Script - Detects and auto-fills forms on MyCase InterviewWEB pages
 * Handles single-page app navigation and dynamic content loading
 */

// Global state
let setupAttempts = 0;
let maxSetupAttempts = 5;
let mutationObserver = null;
let currentData = null;
let isInitialized = false;

// Initialize immediately and on various events
console.log('🔧 Divorce EZ Content Script loaded');

// Try to initialize immediately
tryInitAutoFill();

// Also listen for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitAutoFill);
} else {
  // Already loaded, try immediately
  tryInitAutoFill();
}

// Listen for hash changes (SPA navigation)
window.addEventListener('hashchange', () => {
  console.log('🔄 Hash changed, re-initializing...');
  setupAttempts = 0;
  tryInitAutoFill();
});

// Listen for popstate (back/forward navigation)
window.addEventListener('popstate', () => {
  console.log('🔄 Popstate event, re-initializing...');
  setupAttempts = 0;
  tryInitAutoFill();
});

/**
 * Try to initialize auto-fill with retry logic
 */
function tryInitAutoFill() {
  if (isInitialized) {
    // Already initialized, just update
    setupAutoFill();
    return;
  }

  const delays = [0, 1000, 3000, 5000, 8000]; // Try immediately, then 1s, 3s, 5s, 8s
  
  delays.forEach((delay, index) => {
    setTimeout(() => {
      if (setupAttempts < maxSetupAttempts) {
        setupAttempts++;
        console.log(`🔄 Setup attempt ${setupAttempts}/${maxSetupAttempts} (delay: ${delay}ms)`);
        setupAutoFill();
      }
    }, delay);
  });

  // Mark as initialized after first attempt
  if (!isInitialized) {
    isInitialized = true;
  }
}

/**
 * Setup auto-fill by detecting forms and mapping data
 */
async function setupAutoFill() {
  try {
    console.log('🚀 Setting up auto-fill...');
    
    // Get stored data
    let response;
    try {
      response = await chrome.runtime.sendMessage({ action: 'getStoredData' });
    } catch (error) {
      console.error('❌ Failed to communicate with extension:', error);
      // Still show UI even if we can't get data
      createAutoFillUI(null);
      return;
    }

    if (!response || !response.success) {
      console.log('⚠️ No stored data found for auto-fill');
      // Show UI anyway so user knows extension is working
      createAutoFillUI(null);
      return;
    }

    const data = response.data;
    currentData = data;
    
    console.log('📦 Retrieved data for auto-fill:', {
      hasData: !!data,
      keys: Object.keys(data || {}),
      hasPersonalInfo: !!(data && data.personal_info),
      hasFinancialInfo: !!(data && data.financial_info)
    });
    
    // Create auto-fill button/indicator (always show, even with no data)
    createAutoFillUI(data);

    // Set up MutationObserver to watch for dynamically added forms
    setupMutationObserver(data);

    // Detect and fill forms
    fillForms(data);
  } catch (error) {
    console.error('❌ Error setting up auto-fill:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Show UI with error state
    createAutoFillUI(null, error.message);
  }
}

/**
 * Set up MutationObserver to watch for dynamically added forms
 */
function setupMutationObserver(data) {
  // Clean up existing observer
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  // Create new observer
  mutationObserver = new MutationObserver((mutations) => {
    let shouldRefill = false;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if a form or input was added
          if (node.tagName === 'FORM' || 
              node.tagName === 'INPUT' || 
              node.tagName === 'TEXTAREA' || 
              node.tagName === 'SELECT' ||
              node.querySelector('form, input, textarea, select')) {
            shouldRefill = true;
          }
        }
      });
    });

    if (shouldRefill && data) {
      console.log('👀 New form elements detected, attempting to fill...');
      setTimeout(() => {
        fillForms(data);
      }, 500); // Small delay to ensure form is fully rendered
    }
  });

  // Start observing
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('👀 MutationObserver set up to watch for new forms');
}

/**
 * Create UI elements for auto-fill control
 * Always shows UI, even if no data is available
 */
function createAutoFillUI(data, errorMessage = null) {
  // Remove existing UI if it exists
  const existingUI = document.getElementById('divorce-ez-autofill-ui');
  if (existingUI) {
    existingUI.remove();
  }

  const container = document.createElement('div');
  container.id = 'divorce-ez-autofill-ui';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: #fff;
    border: 2px solid #4CAF50;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-family: Arial, sans-serif;
    max-width: 300px;
    font-size: 14px;
  `;

  const title = document.createElement('div');
  title.textContent = 'Divorce EZ Auto-Fill';
  title.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #333; font-size: 16px;';

  const status = document.createElement('div');
  status.id = 'divorce-ez-status';
  
  // Set status based on data availability
  if (errorMessage) {
    status.textContent = `Error: ${errorMessage}`;
    status.style.cssText = 'margin-bottom: 10px; color: #f44336; font-size: 12px;';
    container.style.borderColor = '#f44336';
  } else if (!data) {
    status.textContent = 'No data synced. Click "Sync Now" in extension popup.';
    status.style.cssText = 'margin-bottom: 10px; color: #ff9800; font-size: 12px;';
    container.style.borderColor = '#ff9800';
  } else {
    status.textContent = 'Ready to auto-fill';
    status.style.cssText = 'margin-bottom: 10px; color: #666; font-size: 12px;';
  }

  const fillButton = document.createElement('button');
  fillButton.id = 'divorce-ez-fill-button';
  fillButton.textContent = 'Auto-Fill Forms';
  fillButton.style.cssText = `
    background: #4CAF50;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
    margin-bottom: 5px;
    font-size: 14px;
  `;
  fillButton.disabled = !data;
  if (!data) {
    fillButton.style.opacity = '0.5';
    fillButton.style.cursor = 'not-allowed';
  }
  
  fillButton.onclick = async () => {
    try {
      fillButton.disabled = true;
      fillButton.textContent = 'Loading...';
      
      const response = await chrome.runtime.sendMessage({ action: 'getStoredData' });
      if (response && response.success && response.data) {
        currentData = response.data;
        fillForms(response.data);
        status.textContent = 'Forms filled!';
        status.style.color = '#4CAF50';
      } else {
        status.textContent = 'No data available. Please sync first.';
        status.style.color = '#ff9800';
      }
    } catch (error) {
      console.error('Error filling forms:', error);
      status.textContent = `Error: ${error.message}`;
      status.style.color = '#f44336';
    } finally {
      fillButton.disabled = false;
      fillButton.textContent = 'Auto-Fill Forms';
    }
  };

  const clearButton = document.createElement('button');
  clearButton.textContent = 'Clear All Fields';
  clearButton.style.cssText = `
    background: #f44336;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
    margin-bottom: 5px;
    font-size: 14px;
  `;
  clearButton.onclick = () => {
    clearAllFields();
    status.textContent = 'Fields cleared';
    status.style.color = '#f44336';
  };

  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh';
  refreshButton.style.cssText = `
    background: #2196F3;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
    font-size: 14px;
  `;
  refreshButton.onclick = async () => {
    try {
      refreshButton.disabled = true;
      refreshButton.textContent = 'Refreshing...';
      
      setupAttempts = 0;
      await setupAutoFill();
      
      status.textContent = 'Refreshed';
      status.style.color = '#2196F3';
    } catch (error) {
      console.error('Error refreshing:', error);
      status.textContent = `Error: ${error.message}`;
      status.style.color = '#f44336';
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = 'Refresh';
    }
  };

  container.appendChild(title);
  container.appendChild(status);
  container.appendChild(fillButton);
  container.appendChild(clearButton);
  container.appendChild(refreshButton);
  
  // Ensure body exists before appending
  if (document.body) {
    document.body.appendChild(container);
  } else {
    // Wait for body to be available
    const observer = new MutationObserver((mutations, obs) => {
      if (document.body) {
        document.body.appendChild(container);
        obs.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }

  console.log('✅ Auto-fill UI created');
}

/**
 * Fill forms with extracted data
 * Also handles standalone inputs (not in forms)
 */
function fillForms(data) {
  if (!data) {
    console.log('⚠️ No data provided to fillForms');
    return;
  }

  console.log('🔍 Starting auto-fill with data:', {
    hasPersonalInfo: !!data.personal_info,
    hasFinancialInfo: !!data.financial_info,
    personalInfoKeys: data.personal_info ? Object.keys(data.personal_info) : [],
    financialInfoKeys: data.financial_info ? Object.keys(data.financial_info) : [],
    hasIncome: !!(data.financial_info && data.financial_info.income),
    incomeKeys: data.financial_info && data.financial_info.income ? Object.keys(data.financial_info.income) : []
  });

  let filledCount = 0;
  const filledFields = [];

  // Find all forms
  const forms = document.querySelectorAll('form');
  console.log(`📋 Found ${forms.length} form(s)`);

  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, textarea, select');
    console.log(`📝 Form has ${inputs.length} input(s)`);
    
    inputs.forEach(input => {
      const fieldName = getFieldName(input);
      const value = mapDataToField(fieldName, data);
      
      if (value !== null) {
        fillField(input, value);
        filledCount++;
        
        // Track filled fields for debugging
        const fieldIdentifier = fieldName.name || fieldName.id || fieldName.label || 'unknown';
        filledFields.push({
          field: fieldIdentifier,
          value: value,
          type: input.type
        });
        
        // Add visual indicator
        addFieldIndicator(input, true);
        
        console.log(`✅ Filled field: ${fieldIdentifier} = ${value} (type: ${input.type})`);
      }
    });
  });

  // Also check for standalone inputs (not in forms) - MyCase might use these
  const standaloneInputs = document.querySelectorAll('input:not(form input), textarea:not(form textarea), select:not(form select)');
  console.log(`📝 Found ${standaloneInputs.length} standalone input(s)`);
  
  standaloneInputs.forEach(input => {
    // Skip if already in a form
    if (input.closest('form')) {
      return;
    }
    
    const fieldName = getFieldName(input);
    const value = mapDataToField(fieldName, data);
    
    if (value !== null) {
      fillField(input, value);
      filledCount++;
      
      const fieldIdentifier = fieldName.name || fieldName.id || fieldName.label || 'unknown';
      filledFields.push({
        field: fieldIdentifier,
        value: value,
        type: input.type
      });
      
      addFieldIndicator(input, true);
      console.log(`✅ Filled standalone field: ${fieldIdentifier} = ${value}`);
    }
  });

  // Log summary
  console.log(`📊 Auto-fill complete: Filled ${filledCount} field(s)`, filledFields);

  // Update status
  const status = document.getElementById('divorce-ez-status');
  if (status) {
    if (filledCount > 0) {
      status.textContent = `Filled ${filledCount} field(s)`;
      status.style.color = '#4CAF50';
    } else {
      status.textContent = 'No matching fields found';
      status.style.color = '#ff9800';
    }
  }
}

/**
 * Add visual indicator to form field (for debugging)
 */
function addFieldIndicator(input, filled) {
  // Remove existing indicator
  const existingIndicator = input.parentElement?.querySelector('.divorce-ez-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Only add indicator if filled (to avoid cluttering the page)
  if (filled) {
    const indicator = document.createElement('span');
    indicator.className = 'divorce-ez-indicator';
    indicator.textContent = '✓';
    indicator.style.cssText = `
      position: absolute;
      right: 5px;
      top: 50%;
      transform: translateY(-50%);
      color: #4CAF50;
      font-weight: bold;
      font-size: 14px;
      pointer-events: none;
      z-index: 1000;
    `;
    
    // Make input container relative if not already
    const container = input.parentElement;
    if (container && getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    
    // Insert indicator
    if (container) {
      container.appendChild(indicator);
      
      // Remove indicator after 3 seconds
      setTimeout(() => {
        if (indicator.parentElement) {
          indicator.remove();
        }
      }, 3000);
    }
  }
}

/**
 * Get field name/identifier from input element
 */
function getFieldName(input) {
  // Try multiple methods to identify the field
  const name = input.name || input.id || '';
  const label = getLabelForInput(input);
  const placeholder = input.placeholder || '';
  const ariaLabel = input.getAttribute('aria-label') || '';
  const dataTestId = input.getAttribute('data-testid') || '';
  const dataName = input.getAttribute('data-name') || '';
  const title = input.getAttribute('title') || '';
  
  // Get parent container text (for MyCase forms that use divs)
  const parentText = getParentText(input);
  
  return {
    name: name.toLowerCase(),
    label: label.toLowerCase(),
    placeholder: placeholder.toLowerCase(),
    ariaLabel: ariaLabel.toLowerCase(),
    dataTestId: dataTestId.toLowerCase(),
    dataName: dataName.toLowerCase(),
    title: title.toLowerCase(),
    parentText: parentText.toLowerCase(),
    type: input.type
  };
}

/**
 * Get text from parent elements (useful for MyCase forms)
 */
function getParentText(input) {
  let text = '';
  let element = input.parentElement;
  let depth = 0;
  
  // Check up to 3 levels up for text
  while (element && depth < 3) {
    // Check for label text
    const label = element.querySelector('label');
    if (label && label.textContent) {
      text += ' ' + label.textContent.trim();
    }
    
    // Check for text nodes
    const textNodes = Array.from(element.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim())
      .filter(t => t.length > 0);
    if (textNodes.length > 0) {
      text += ' ' + textNodes.join(' ');
    }
    
    // Check for aria-label on parent
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      text += ' ' + ariaLabel.trim();
    }
    
    element = element.parentElement;
    depth++;
  }
  
  return text.trim();
}

/**
 * Get label text for an input element
 */
function getLabelForInput(input) {
  // Try to find associated label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent;
  }

  // Try to find parent label
  const parentLabel = input.closest('label');
  if (parentLabel) return parentLabel.textContent;

  // Try to find preceding label
  let prev = input.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'LABEL') return prev.textContent;
    prev = prev.previousElementSibling;
  }

  return '';
}

/**
 * Map extracted data to form field
 */
function mapDataToField(fieldInfo, data) {
  const { name, label, placeholder, ariaLabel, dataTestId, dataName, title, parentText, type } = fieldInfo;
  // Combine all field identifiers for better matching
  const searchText = `${name} ${label} ${placeholder} ${ariaLabel} ${dataTestId} ${dataName} ${title} ${parentText}`.toLowerCase();

  const personalInfo = data.personal_info || {};
  const financialInfo = data.financial_info || {};
  const marriageInfo = data.marriage_info || {};
  const courtInfo = data.court_info || {};
  
  // Ensure income object exists (fallback to empty object if missing)
  const income = financialInfo.income || {};

  // Name fields
  if (searchText.match(/first\s*name|fname|given\s*name/i)) {
    return personalInfo.firstName || null;
  }
  if (searchText.match(/last\s*name|lname|surname|family\s*name/i)) {
    return personalInfo.lastName || null;
  }
  if (searchText.match(/middle\s*name|mname/i)) {
    return personalInfo.middleName || null;
  }
  if (searchText.match(/full\s*name|name/i) && !searchText.match(/first|last|middle|spouse/)) {
    const fullName = [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName]
      .filter(Boolean)
      .join(' ');
    return fullName || null;
  }

  // Spouse name
  if (searchText.match(/spouse|spouse's|spouse\s+name|partner/i)) {
    return personalInfo.spouseName || marriageInfo.legalNamesAtMarriage?.spouse2 || null;
  }

  // Date of birth
  if (searchText.match(/date\s*of\s*birth|dob|birth\s*date|birthday/i)) {
    return personalInfo.dateOfBirth || null;
  }

  // Dependents/children
  if (searchText.match(/dependent|child|children|minor/i)) {
    const dependents = personalInfo.dependents || [];
    if (dependents.length > 0) {
      // Return count or names depending on field type
      if (type === 'number' || searchText.match(/count|number|how\s*many/)) {
        return dependents.length;
      }
      // Return names as comma-separated list
      return dependents.map(d => d.name).filter(Boolean).join(', ') || null;
    }
    return null;
  }

  // Child name (specific child)
  if (searchText.match(/child\s+name|dependent\s+name/i)) {
    const dependents = personalInfo.dependents || [];
    if (dependents.length > 0) {
      return dependents[0].name || null;
    }
    return null;
  }

  // Child date of birth
  if (searchText.match(/child\s+dob|child\s+date\s+of\s+birth|dependent\s+dob/i)) {
    const dependents = personalInfo.dependents || [];
    if (dependents.length > 0) {
      return dependents[0].dateOfBirth || null;
    }
    return null;
  }

  // Address fields
  if (searchText.match(/street\s*address|street/i)) {
    return personalInfo.address?.street || null;
  }
  if (searchText.match(/city/i)) {
    return personalInfo.address?.city || null;
  }
  if (searchText.match(/state/i) && !searchText.match(/license|drivers|marriage/)) {
    return personalInfo.address?.state || null;
  }
  if (searchText.match(/zip|postal\s*code/i)) {
    return personalInfo.address?.zipCode || null;
  }
  if (searchText.match(/address|addr/i) && !searchText.match(/street|city|state|zip/)) {
    const addr = personalInfo.address;
    if (addr) {
      return [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') || null;
    }
    return null;
  }

  // Contact info
  if (searchText.match(/phone|telephone|mobile/i)) {
    return personalInfo.phone || null;
  }
  if (searchText.match(/email|e-mail/i)) {
    return personalInfo.email || null;
  }

  // SSN (use last 4 if available)
  if (searchText.match(/ssn|social\s*security|social\s*sec/i)) {
    return personalInfo.ssnLast4 || personalInfo.ssn || null;
  }

  // License number
  if (searchText.match(/license\s*number|dl\s*number|drivers?\s*license\s*number/i)) {
    return personalInfo.driverLicenseNumber || null;
  }
  if (searchText.match(/license\s*state|dl\s*state|drivers?\s*license\s*state/i)) {
    return personalInfo.driverLicenseState || null;
  }

  // Marriage date
  if (searchText.match(/marriage\s+date|date\s+of\s+marriage|married\s+date/i)) {
    return personalInfo.marriageDate || marriageInfo.marriageDate || null;
  }

  // Marriage place
  if (searchText.match(/marriage\s+place|place\s+of\s+marriage|married\s+at/i)) {
    return personalInfo.marriagePlace || marriageInfo.marriagePlace || null;
  }

  // Filing status
  if (searchText.match(/filing\s+status|tax\s+status/i)) {
    return personalInfo.filingStatus || null;
  }

  // Income fields - detailed breakdown
  if (searchText.match(/monthly\s*income|income\s*per\s*month/i)) {
    return income.monthly || null;
  }
  if (searchText.match(/annual\s*income|yearly\s*income|income\s*per\s*year/i)) {
    return income.annual || null;
  }
  if (searchText.match(/wage\s*income|wages|salary/i)) {
    return income.wage || null;
  }
  if (searchText.match(/self[\s-]?employment|business\s+income|self\s+employed/i)) {
    return income.selfEmployment || null;
  }
  if (searchText.match(/investment\s+income|interest\s+income|dividend/i)) {
    return income.investment || null;
  }
  if (searchText.match(/rental\s+income|rental/i)) {
    return income.rental || null;
  }
  // Tax return specific fields
  if (searchText.match(/total\s*income|line\s*9|form\s*1040\s*line\s*9/i)) {
    return income.totalIncome || income.annual || null;
  }
  if (searchText.match(/adjusted\s*gross\s*income|agi|line\s*11|form\s*1040\s*line\s*11/i)) {
    return income.adjustedGrossIncome || income.annual || null;
  }
  if (searchText.match(/income|gross\s*pay/i) && !searchText.match(/monthly|annual|wage|self|investment|rental|total|adjusted/)) {
    return income.annual || income.monthly || null;
  }

  // Employer - handle multiple employers
  if (searchText.match(/employer|company\s+name|work\s+for/i)) {
    const employers = financialInfo.employers || [];
    if (employers.length > 0) {
      // If field asks for multiple employers or list, return comma-separated
      if (type === 'textarea' || searchText.match(/all|list|multiple|employers/)) {
        return employers.map(e => e.name).filter(Boolean).join(', ') || null;
      }
      // Otherwise return first employer
      return employers[0].name || null;
    }
    return null;
  }

  // Expenses
  if (searchText.match(/housing|rent|mortgage/i)) {
    return financialInfo.expenses?.housing || null;
  }
  if (searchText.match(/utilities|utility/i)) {
    return financialInfo.expenses?.utilities || null;
  }
  if (searchText.match(/childcare|daycare|child\s+care/i)) {
    return financialInfo.expenses?.childcare || null;
  }
  if (searchText.match(/debt\s+payment|debt|loan\s+payment/i)) {
    return financialInfo.expenses?.debt || null;
  }
  if (searchText.match(/transportation|car\s+payment|gas|vehicle/i)) {
    return financialInfo.expenses?.transportation || null;
  }

  // Insurance
  if (searchText.match(/health\s+insurance|medical\s+insurance|insurance\s+premium/i)) {
    return financialInfo.insurance?.health || financialInfo.insurance?.premiums || null;
  }

  // Overtime
  if (searchText.match(/overtime|ot/i)) {
    return financialInfo.overtime || null;
  }

  // Bonuses
  if (searchText.match(/bonus|bonuses/i)) {
    return financialInfo.bonuses || null;
  }

  // Assets
  if (searchText.match(/assets?|asset\s+value/i)) {
    const assets = financialInfo.assets || [];
    const total = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
    return total > 0 ? total : null;
  }

  // Debts
  if (searchText.match(/debts?|liabilities?|debt\s+amount/i)) {
    const debts = financialInfo.debts || [];
    const total = debts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
    return total > 0 ? total : null;
  }

  // Bank accounts
  if (searchText.match(/bank\s*account|account\s*balance|bank\s*balance/i)) {
    const accounts = financialInfo.bankAccounts || [];
    const total = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    return total > 0 ? total : null;
  }

  return null;
}

/**
 * Fill a form field with value
 */
function fillField(input, value) {
  try {
    // Set value
    if (input.type === 'checkbox' || input.type === 'radio') {
      if (input.value === value || input.value === String(value)) {
        input.checked = true;
      }
    } else {
      input.value = value;
    }

    // Trigger events to notify the page
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  } catch (error) {
    console.error('Error filling field:', error);
  }
}

/**
 * Clear all form fields
 */
function clearAllFields() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  
  // Also clear standalone inputs
  const standaloneInputs = document.querySelectorAll('input:not(form input), textarea:not(form textarea), select:not(form select)');
  standaloneInputs.forEach(input => {
    if (!input.closest('form')) {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

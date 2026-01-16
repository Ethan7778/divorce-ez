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
let filledFields = new Set(); // Track which fields have been filled to prevent re-filling
let isUICollapsed = false; // Track if UI is collapsed

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

    // Set up MutationObserver to watch for dynamically added forms (but don't auto-fill)
    setupMutationObserver();
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
 * (Just for logging, doesn't auto-fill)
 */
function setupMutationObserver() {
  // Clean up existing observer
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  // Create new observer (just for logging, no auto-fill)
  mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if a form or input was added
          if (node.tagName === 'FORM' || 
              node.tagName === 'INPUT' || 
              node.tagName === 'TEXTAREA' || 
              node.tagName === 'SELECT' ||
              node.querySelector('form, input, textarea, select')) {
            console.log('👀 New form elements detected (use "Auto-Fill Forms" button to fill)');
          }
        }
      });
    });
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

  // Header with title and collapse/close buttons
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';

  const title = document.createElement('div');
  title.textContent = 'Divorce EZ Auto-Fill';
  title.style.cssText = 'font-weight: bold; color: #333; font-size: 16px; flex: 1;';

  // Collapse button
  const collapseButton = document.createElement('button');
  collapseButton.textContent = isUICollapsed ? '▼' : '▲';
  collapseButton.style.cssText = `
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 12px;
    color: #666;
    padding: 2px 6px;
    margin-right: 5px;
  `;
  collapseButton.title = isUICollapsed ? 'Expand' : 'Collapse';
  collapseButton.onclick = () => {
    isUICollapsed = !isUICollapsed;
    const content = container.querySelector('#divorce-ez-content');
    if (content) {
      content.style.display = isUICollapsed ? 'none' : 'block';
      collapseButton.textContent = isUICollapsed ? '▼' : '▲';
      collapseButton.title = isUICollapsed ? 'Expand' : 'Collapse';
    }
  };

  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 20px;
    color: #666;
    padding: 0;
    width: 24px;
    height: 24px;
    line-height: 20px;
  `;
  closeButton.title = 'Close';
  closeButton.onclick = () => {
    container.style.display = 'none';
  };

  header.appendChild(title);
  header.appendChild(collapseButton);
  header.appendChild(closeButton);

  // Content wrapper (for collapse functionality)
  const content = document.createElement('div');
  content.id = 'divorce-ez-content';
  content.style.display = isUICollapsed ? 'none' : 'block';

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
        // Clear filled fields tracking when manually filling
        filledFields.clear();
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
    filledFields.clear(); // Clear tracking when clearing fields
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

  content.appendChild(status);
  content.appendChild(fillButton);
  content.appendChild(clearButton);
  content.appendChild(refreshButton);
  
  container.appendChild(header);
  container.appendChild(content);
  
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
      // Create unique identifier for this field
      const fieldId = `${input.name || input.id || ''}_${input.type}_${input.form?.id || 'noform'}`;
      
      // Skip if already filled (unless field is empty)
      if (filledFields.has(fieldId) && input.value && input.value.trim() !== '') {
        return;
      }
      
      const fieldName = getFieldName(input);
      const value = mapDataToField(fieldName, data);
      
      if (value !== null) {
        // Only fill if field is empty or was previously filled by us
        if (!input.value || input.value.trim() === '' || filledFields.has(fieldId)) {
          fillField(input, value);
          filledFields.add(fieldId); // Mark as filled
          filledCount++;
          
          // Track filled fields for debugging
          const fieldIdentifier = fieldName.name || fieldName.id || fieldName.label || 'unknown';
          console.log(`✅ Filled field: ${fieldIdentifier} = ${value} (type: ${input.type})`);
          
          // Add visual indicator
          addFieldIndicator(input, true);
        }
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
    
    // Create unique identifier for this field
    const fieldId = `${input.name || input.id || ''}_${input.type}_standalone`;
    
    // Skip if already filled (unless field is empty)
    if (filledFields.has(fieldId) && input.value && input.value.trim() !== '') {
      return;
    }
    
    const fieldName = getFieldName(input);
    const value = mapDataToField(fieldName, data);
    
    if (value !== null) {
      // Only fill if field is empty or was previously filled by us
      if (!input.value || input.value.trim() === '' || filledFields.has(fieldId)) {
        fillField(input, value);
        filledFields.add(fieldId); // Mark as filled
        filledCount++;
        
        const fieldIdentifier = fieldName.name || fieldName.id || fieldName.label || 'unknown';
        console.log(`✅ Filled standalone field: ${fieldIdentifier} = ${value}`);
        
        addFieldIndicator(input, true);
      }
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
 * Improved matching with better pattern recognition
 */
function mapDataToField(fieldInfo, data) {
  const { name, label, placeholder, ariaLabel, dataTestId, dataName, title, parentText, type } = fieldInfo;
  // Combine all field identifiers for better matching
  const searchText = `${name} ${label} ${placeholder} ${ariaLabel} ${dataTestId} ${dataName} ${title} ${parentText}`.toLowerCase();
  
  // Normalize search text - remove common words that don't help matching
  const normalizedSearch = searchText
    .replace(/\b(enter|please|required|optional|field|input|text|box)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const personalInfo = data.personal_info || {};
  const financialInfo = data.financial_info || {};
  const marriageInfo = data.marriage_info || {};
  const courtInfo = data.court_info || {};
  
  // Ensure income object exists (fallback to empty object if missing)
  const income = financialInfo.income || {};

  // Name fields - improved matching
  // Check for first name (more specific patterns first)
  if (normalizedSearch.match(/\b(first|fname|given|firstname|first_name)\b/i) && 
      !normalizedSearch.match(/\b(last|middle|spouse|maiden)\b/i)) {
    return personalInfo.firstName || null;
  }
  // Check for last name
  if (normalizedSearch.match(/\b(last|lname|surname|family|lastname|last_name)\b/i) && 
      !normalizedSearch.match(/\b(first|middle|spouse|maiden)\b/i)) {
    return personalInfo.lastName || null;
  }
  // Check for middle name
  if (normalizedSearch.match(/\b(middle|mname|middlename|middle_name|mi)\b/i)) {
    return personalInfo.middleName || null;
  }
  // Check for full name (only if no specific name type mentioned)
  if (normalizedSearch.match(/\b(name|fullname|full_name)\b/i) && 
      !normalizedSearch.match(/\b(first|last|middle|spouse|maiden|given|surname)\b/i)) {
    const fullName = [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName]
      .filter(Boolean)
      .join(' ');
    return fullName || null;
  }

  // Spouse name
  if (normalizedSearch.match(/\b(spouse|partner|spouse's|spousename|spouse_name)\b/i)) {
    return personalInfo.spouseName || marriageInfo.legalNamesAtMarriage?.spouse2 || null;
  }

  // Date of birth
  if (normalizedSearch.match(/\b(dob|dateofbirth|date_of_birth|birthdate|birth_date|birthday|born)\b/i)) {
    return personalInfo.dateOfBirth || null;
  }

  // Dependents/children
  if (normalizedSearch.match(/\b(dependent|dependents|child|children|minor|kids)\b/i)) {
    const dependents = personalInfo.dependents || [];
    if (dependents.length > 0) {
      // Return count or names depending on field type
      if (type === 'number' || normalizedSearch.match(/\b(count|number|how\s*many|quantity)\b/i)) {
        return dependents.length;
      }
      // Return names as comma-separated list
      return dependents.map(d => d.name).filter(Boolean).join(', ') || null;
    }
    return null;
  }

  // Child name (specific child)
  if (normalizedSearch.match(/\b(child|dependent)\b/i) && 
      normalizedSearch.match(/\b(name)\b/i)) {
    const dependents = personalInfo.dependents || [];
    if (dependents.length > 0) {
      return dependents[0].name || null;
    }
    return null;
  }

  // Child date of birth
  if (normalizedSearch.match(/\b(child|dependent)\b/i) && 
      normalizedSearch.match(/\b(dob|dateofbirth|birthdate|birth)\b/i)) {
    const dependents = personalInfo.dependents || [];
    if (dependents.length > 0) {
      return dependents[0].dateOfBirth || null;
    }
    return null;
  }

  // Address fields - improved matching
  if (normalizedSearch.match(/\b(street|address|addr|streetaddress|street_address|line1|line\s*1)\b/i) && 
      !normalizedSearch.match(/\b(city|state|zip|postal|mailing|email)\b/i)) {
    return personalInfo.address?.street || null;
  }
  if (normalizedSearch.match(/\b(city|town)\b/i) && 
      !normalizedSearch.match(/\b(state|zip|postal|street|address)\b/i)) {
    return personalInfo.address?.city || null;
  }
  if (normalizedSearch.match(/\b(state|st)\b/i) && 
      !normalizedSearch.match(/\b(license|drivers|marriage|zip|postal|city|street)\b/i)) {
    return personalInfo.address?.state || null;
  }
  if (normalizedSearch.match(/\b(zip|postal|zipcode|zip_code|postalcode|postal_code|zcode)\b/i)) {
    return personalInfo.address?.zipCode || null;
  }
  // Full address (only if no specific part mentioned)
  if (normalizedSearch.match(/\b(address|addr|mailing|residence|residential)\b/i) && 
      !normalizedSearch.match(/\b(street|city|state|zip|postal|email)\b/i)) {
    const addr = personalInfo.address;
    if (addr) {
      return [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') || null;
    }
    return null;
  }

  // Contact info
  if (normalizedSearch.match(/\b(phone|telephone|mobile|cell|cellphone|cell_phone|phonenumber|phone_number)\b/i)) {
    return personalInfo.phone || null;
  }
  if (normalizedSearch.match(/\b(email|e-mail|e_mail|emailaddress|email_address)\b/i)) {
    return personalInfo.email || null;
  }

  // SSN (use last 4 if available)
  if (normalizedSearch.match(/\b(ssn|socialsecurity|social_security|socialsec|ss#|ss\s*#)\b/i)) {
    return personalInfo.ssnLast4 || personalInfo.ssn || null;
  }

  // License number
  if (normalizedSearch.match(/\b(license|dl|driverslicense|driver_license|drivers_license|licensenumber|license_number|dlnumber|dl_number)\b/i) && 
      normalizedSearch.match(/\b(number|#|num)\b/i) && 
      !normalizedSearch.match(/\b(state)\b/i)) {
    return personalInfo.driverLicenseNumber || null;
  }
  if (normalizedSearch.match(/\b(license|dl|driverslicense|driver_license|drivers_license)\b/i) && 
      normalizedSearch.match(/\b(state|st)\b/i)) {
    return personalInfo.driverLicenseState || null;
  }

  // Marriage date
  if (normalizedSearch.match(/\b(marriage|married)\b/i) && 
      normalizedSearch.match(/\b(date|when)\b/i)) {
    return personalInfo.marriageDate || marriageInfo.marriageDate || null;
  }

  // Marriage place
  if (normalizedSearch.match(/\b(marriage|married)\b/i) && 
      normalizedSearch.match(/\b(place|location|where|at|city|county)\b/i)) {
    return personalInfo.marriagePlace || marriageInfo.marriagePlace || null;
  }

  // Filing status
  if (normalizedSearch.match(/\b(filing|tax)\b/i) && 
      normalizedSearch.match(/\b(status)\b/i)) {
    return personalInfo.filingStatus || null;
  }

  // Income fields - improved matching with priority order
  // Monthly income (most specific first)
  if (normalizedSearch.match(/\b(monthly|per\s*month|month)\b/i) && 
      normalizedSearch.match(/\b(income|earnings|pay|wage|salary)\b/i)) {
    return income.monthly || null;
  }
  // Annual income
  if (normalizedSearch.match(/\b(annual|yearly|per\s*year|year|yearly)\b/i) && 
      normalizedSearch.match(/\b(income|earnings|pay|wage|salary)\b/i)) {
    return income.annual || null;
  }
  // Wage income
  if (normalizedSearch.match(/\b(wage|wages|salary|salaried|employment)\b/i) && 
      !normalizedSearch.match(/\b(self|business|investment|rental)\b/i)) {
    return income.wage || null;
  }
  // Self-employment
  if (normalizedSearch.match(/\b(self|selfemployment|self_employment|business|selfemployed|self_employed)\b/i) && 
      normalizedSearch.match(/\b(income|earnings|pay)\b/i)) {
    return income.selfEmployment || null;
  }
  // Investment income
  if (normalizedSearch.match(/\b(investment|interest|dividend|dividends)\b/i) && 
      normalizedSearch.match(/\b(income|earnings)\b/i)) {
    return income.investment || null;
  }
  // Rental income
  if (normalizedSearch.match(/\b(rental|rent)\b/i) && 
      normalizedSearch.match(/\b(income|earnings)\b/i)) {
    return income.rental || null;
  }
  // Tax return specific fields
  if (normalizedSearch.match(/\b(total\s*income|line\s*9|1040\s*line\s*9)\b/i)) {
    return income.totalIncome || income.annual || null;
  }
  if (normalizedSearch.match(/\b(adjusted\s*gross|agi|adjustedgross|adjusted_gross|line\s*11|1040\s*line\s*11)\b/i)) {
    return income.adjustedGrossIncome || income.annual || null;
  }
  // Generic income (last resort, only if no specific type mentioned)
  if (normalizedSearch.match(/\b(income|earnings|gross\s*pay|grosspay)\b/i) && 
      !normalizedSearch.match(/\b(monthly|annual|wage|self|investment|rental|total|adjusted|net)\b/i)) {
    return income.annual || income.monthly || null;
  }

  // Employer - handle multiple employers
  if (normalizedSearch.match(/\b(employer|company|work|employer_name|company_name|employername|companyname)\b/i)) {
    const employers = financialInfo.employers || [];
    if (employers.length > 0) {
      // If field asks for multiple employers or list, return comma-separated
      if (type === 'textarea' || normalizedSearch.match(/\b(all|list|multiple|employers)\b/i)) {
        return employers.map(e => e.name).filter(Boolean).join(', ') || null;
      }
      // Otherwise return first employer
      return employers[0].name || null;
    }
    return null;
  }

  // Expenses
  if (normalizedSearch.match(/\b(housing|rent|mortgage|rental)\b/i) && 
      !normalizedSearch.match(/\b(income)\b/i)) {
    return financialInfo.expenses?.housing || null;
  }
  if (normalizedSearch.match(/\b(utilities|utility|electric|water|gas)\b/i)) {
    return financialInfo.expenses?.utilities || null;
  }
  if (normalizedSearch.match(/\b(childcare|daycare|childcare|child\s*care)\b/i)) {
    return financialInfo.expenses?.childcare || null;
  }
  if (normalizedSearch.match(/\b(debt|loan|payment|liability|liabilities)\b/i) && 
      !normalizedSearch.match(/\b(income|asset)\b/i)) {
    return financialInfo.expenses?.debt || null;
  }
  if (normalizedSearch.match(/\b(transportation|car|vehicle|gas|gasoline|auto)\b/i)) {
    return financialInfo.expenses?.transportation || null;
  }

  // Insurance
  if (normalizedSearch.match(/\b(insurance|health|medical|premium|premiums)\b/i)) {
    return financialInfo.insurance?.health || financialInfo.insurance?.premiums || null;
  }

  // Overtime
  if (normalizedSearch.match(/\b(overtime|ot)\b/i)) {
    return financialInfo.overtime || null;
  }

  // Bonuses
  if (normalizedSearch.match(/\b(bonus|bonuses)\b/i)) {
    return financialInfo.bonuses || null;
  }

  // Assets
  if (normalizedSearch.match(/\b(asset|assets|assetvalue|asset_value)\b/i)) {
    const assets = financialInfo.assets || [];
    const total = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
    return total > 0 ? total : null;
  }

  // Debts
  if (normalizedSearch.match(/\b(debt|debts|liability|liabilities|debtamount|debt_amount)\b/i) && 
      !normalizedSearch.match(/\b(income|asset)\b/i)) {
    const debts = financialInfo.debts || [];
    const total = debts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
    return total > 0 ? total : null;
  }

  // Bank accounts
  if (normalizedSearch.match(/\b(bank|account|balance|bankaccount|bank_account|accountbalance|account_balance|bankbalance|bank_balance)\b/i)) {
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

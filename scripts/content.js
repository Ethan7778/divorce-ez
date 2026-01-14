/**
 * Content Script - Detects and auto-fills forms on MyCase InterviewWEB pages
 */

// Wait for page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoFill);
} else {
  initAutoFill();
}

/**
 * Initialize auto-fill functionality
 */
async function initAutoFill() {
  // Wait a bit for dynamic content to load
  setTimeout(() => {
    setupAutoFill();
  }, 1000);
}

/**
 * Setup auto-fill by detecting forms and mapping data
 */
async function setupAutoFill() {
  try {
    // Get stored data
    const response = await chrome.runtime.sendMessage({ action: 'getStoredData' });
    if (!response.success || !response.data) {
      console.log('No stored data found for auto-fill');
      return;
    }

    const data = response.data;
    
    // Create auto-fill button/indicator
    createAutoFillUI(data);

    // Detect and fill forms
    fillForms(data);
  } catch (error) {
    console.error('Error setting up auto-fill:', error);
  }
}

/**
 * Create UI elements for auto-fill control
 */
function createAutoFillUI(data) {
  // Check if UI already exists
  if (document.getElementById('divorce-ez-autofill-ui')) {
    return;
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
  `;

  const title = document.createElement('div');
  title.textContent = 'Divorce EZ Auto-Fill';
  title.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #333;';

  const status = document.createElement('div');
  status.id = 'divorce-ez-status';
  status.textContent = 'Ready to auto-fill';
  status.style.cssText = 'margin-bottom: 10px; color: #666; font-size: 12px;';

  const fillButton = document.createElement('button');
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
  `;
  fillButton.onclick = () => {
    chrome.runtime.sendMessage({ action: 'getStoredData' }, (response) => {
      if (response.success && response.data) {
        fillForms(response.data);
        status.textContent = 'Forms filled!';
        status.style.color = '#4CAF50';
      }
    });
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
  `;
  clearButton.onclick = () => {
    clearAllFields();
    status.textContent = 'Fields cleared';
    status.style.color = '#f44336';
  };

  container.appendChild(title);
  container.appendChild(status);
  container.appendChild(fillButton);
  container.appendChild(clearButton);
  document.body.appendChild(container);
}

/**
 * Fill forms with extracted data
 */
function fillForms(data) {
  const forms = document.querySelectorAll('form');
  let filledCount = 0;

  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      const fieldName = getFieldName(input);
      const value = mapDataToField(fieldName, data);
      
      if (value !== null) {
        fillField(input, value);
        filledCount++;
      }
    });
  });

  // Update status
  const status = document.getElementById('divorce-ez-status');
  if (status) {
    status.textContent = `Filled ${filledCount} field(s)`;
    status.style.color = '#4CAF50';
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
  
  return {
    name: name.toLowerCase(),
    label: label.toLowerCase(),
    placeholder: placeholder.toLowerCase(),
    type: input.type
  };
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
  const { name, label, placeholder, type } = fieldInfo;
  const searchText = `${name} ${label} ${placeholder}`.toLowerCase();

  const personalInfo = data.personal_info || {};
  const financialInfo = data.financial_info || {};
  const marriageInfo = data.marriage_info || {};
  const courtInfo = data.court_info || {};

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
    return financialInfo.income?.monthly || null;
  }
  if (searchText.match(/annual\s*income|yearly\s*income|income\s*per\s*year/i)) {
    return financialInfo.income?.annual || null;
  }
  if (searchText.match(/wage\s*income|wages|salary/i)) {
    return financialInfo.income?.wage || null;
  }
  if (searchText.match(/self[\s-]?employment|business\s+income|self\s+employed/i)) {
    return financialInfo.income?.selfEmployment || null;
  }
  if (searchText.match(/investment\s+income|interest\s+income|dividend/i)) {
    return financialInfo.income?.investment || null;
  }
  if (searchText.match(/rental\s+income|rental/i)) {
    return financialInfo.income?.rental || null;
  }
  if (searchText.match(/income|gross\s*pay/i) && !searchText.match(/monthly|annual|wage|self|investment|rental/)) {
    return financialInfo.income?.annual || financialInfo.income?.monthly || null;
  }

  // Employer
  if (searchText.match(/employer|company\s+name|work\s+for/i)) {
    const employers = financialInfo.employers || [];
    if (employers.length > 0) {
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
}

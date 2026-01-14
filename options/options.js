/**
 * Options Page Script - Manages stored data display and editing
 */

let storedData = null;
let isEditing = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadStoredData();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  document.getElementById('refreshButton').addEventListener('click', loadStoredData);
  document.getElementById('editButton').addEventListener('click', toggleEditMode);
  document.getElementById('clearButton').addEventListener('click', confirmClearData);
  document.getElementById('saveButton').addEventListener('click', saveData);
  document.getElementById('cancelButton').addEventListener('click', cancelEdit);
}

/**
 * Load stored data from storage
 */
async function loadStoredData() {
  const container = document.getElementById('dataContainer');
  container.innerHTML = '<div class="loading">Loading data...</div>';

  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStoredData' });
    
    if (response.success && response.data) {
      storedData = response.data;
      displayData(response.data);
    } else {
      container.innerHTML = `
        <div class="no-data">
          <div class="no-data-icon">📄</div>
          <p>No data stored yet.</p>
          <p style="margin-top: 10px; font-size: 12px;">Upload documents from the extension popup to get started.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading data:', error);
    container.innerHTML = '<div class="no-data">Error loading data. Please try again.</div>';
  }
}

/**
 * Display stored data
 */
function displayData(data) {
  const container = document.getElementById('dataContainer');
  console.log('Displaying data:', data);
  
  // Handle nested structure
  const personalInfo = data.personal_info || {};
  const financialInfo = data.financial_info || {};
  const marriageInfo = data.marriage_info || {};
  const courtInfo = data.court_info || {};

  let html = '';
  
  // Personal Info Section
  const personalFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'middleName', label: 'Middle Name' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'ssnLast4', label: 'SSN (Last 4)' },
    { key: 'spouseName', label: 'Spouse Name' },
    { key: 'filingStatus', label: 'Filing Status' },
    { key: 'maidenName', label: 'Maiden Name' },
  ];
  
  const addressInfo = personalInfo.address || {};
  const hasPersonalInfo = personalFields.some(field => personalInfo[field.key]) || 
                          addressInfo.street || addressInfo.city || 
                          personalInfo.dependents?.length > 0;
  
  if (hasPersonalInfo) {
    html += '<div class="data-section-header"><h3>Personal Information</h3></div>';
    personalFields.forEach(field => {
      const value = personalInfo[field.key];
      if (value !== null && value !== undefined && value !== '') {
        html += `
          <div class="data-item">
            <div class="data-label">${field.label}</div>
            <div class="data-value">${formatValue(value)}</div>
          </div>
        `;
      }
    });
    
    // Address
    if (addressInfo.street || addressInfo.city || addressInfo.state || addressInfo.zipCode) {
      const addressParts = [addressInfo.street, addressInfo.city, addressInfo.state, addressInfo.zipCode].filter(Boolean);
      if (addressParts.length > 0) {
        html += `
          <div class="data-item">
            <div class="data-label">Address</div>
            <div class="data-value">${addressParts.join(', ')}</div>
          </div>
        `;
      }
    }
    
    // Dependents
    if (personalInfo.dependents && Array.isArray(personalInfo.dependents) && personalInfo.dependents.length > 0) {
      html += '<div class="data-item"><div class="data-label">Dependents</div><div class="data-value">';
      personalInfo.dependents.forEach((dep, idx) => {
        html += `${dep.name || 'Unknown'}${dep.dateOfBirth ? ` (DOB: ${dep.dateOfBirth})` : ''}`;
        if (idx < personalInfo.dependents.length - 1) html += '<br>';
      });
      html += '</div></div>';
    }
  }
  
  // Financial Info Section
  const income = financialInfo.income || {};
  const expenses = financialInfo.expenses || {};
  const hasFinancialInfo = income.annual || income.monthly || income.wage || income.selfEmployment ||
                          financialInfo.employers?.length > 0 || expenses.housing || expenses.utilities ||
                          financialInfo.overtime || financialInfo.bonuses;
  
  if (hasFinancialInfo) {
    html += '<div class="data-section-header"><h3>Financial Information</h3></div>';
    
    // Income breakdown
    if (income.annual || income.monthly) {
      html += '<div class="data-item"><div class="data-label">Income</div><div class="data-value">';
      if (income.annual) html += `Annual: ${formatValue(income.annual)}<br>`;
      if (income.monthly) html += `Monthly: ${formatValue(income.monthly)}`;
      html += '</div></div>';
    }
    
    // Detailed income breakdown
    if (income.wage || income.selfEmployment || income.investment || income.rental) {
      html += '<div class="data-item"><div class="data-label">Income Breakdown</div><div class="data-value">';
      if (income.wage) html += `Wage: ${formatValue(income.wage)}<br>`;
      if (income.selfEmployment) html += `Self-Employment: ${formatValue(income.selfEmployment)}<br>`;
      if (income.investment) html += `Investment: ${formatValue(income.investment)}<br>`;
      if (income.rental) html += `Rental: ${formatValue(income.rental)}`;
      html += '</div></div>';
    }
    
    // Employers
    if (financialInfo.employers && Array.isArray(financialInfo.employers) && financialInfo.employers.length > 0) {
      html += '<div class="data-item"><div class="data-label">Employers</div><div class="data-value">';
      financialInfo.employers.forEach((emp, idx) => {
        html += `${emp.name || 'Unknown'}${emp.income ? ` (${formatValue(emp.income)})` : ''}`;
        if (idx < financialInfo.employers.length - 1) html += '<br>';
      });
      html += '</div></div>';
    }
    
    // Expenses
    if (expenses.housing || expenses.utilities || expenses.childcare || expenses.debt || expenses.transportation) {
      html += '<div class="data-item"><div class="data-label">Monthly Expenses</div><div class="data-value">';
      if (expenses.housing) html += `Housing: ${formatValue(expenses.housing)}<br>`;
      if (expenses.utilities) html += `Utilities: ${formatValue(expenses.utilities)}<br>`;
      if (expenses.childcare) html += `Childcare: ${formatValue(expenses.childcare)}<br>`;
      if (expenses.debt) html += `Debt: ${formatValue(expenses.debt)}<br>`;
      if (expenses.transportation) html += `Transportation: ${formatValue(expenses.transportation)}`;
      html += '</div></div>';
    }
    
    // Insurance
    if (financialInfo.insurance?.premiums || financialInfo.insurance?.health) {
      html += '<div class="data-item"><div class="data-label">Insurance</div><div class="data-value">';
      if (financialInfo.insurance.premiums) html += `Premiums: ${formatValue(financialInfo.insurance.premiums)}<br>`;
      if (financialInfo.insurance.health) html += `Health: ${formatValue(financialInfo.insurance.health)}`;
      html += '</div></div>';
    }
    
    // Overtime and bonuses
    if (financialInfo.overtime || financialInfo.bonuses) {
      html += '<div class="data-item"><div class="data-label">Additional Income</div><div class="data-value">';
      if (financialInfo.overtime) html += `Overtime: ${formatValue(financialInfo.overtime)}<br>`;
      if (financialInfo.bonuses) html += `Bonuses: ${formatValue(financialInfo.bonuses)}`;
      html += '</div></div>';
    }
  }
  
  // Marriage Info Section
  if (marriageInfo.marriageDate || marriageInfo.marriagePlace || marriageInfo.legalNamesAtMarriage) {
    html += '<div class="data-section-header"><h3>Marriage Information</h3></div>';
    if (marriageInfo.legalNamesAtMarriage) {
      if (marriageInfo.legalNamesAtMarriage.spouse1 || marriageInfo.legalNamesAtMarriage.spouse2) {
        html += '<div class="data-item"><div class="data-label">Names at Marriage</div><div class="data-value">';
        if (marriageInfo.legalNamesAtMarriage.spouse1) html += `Spouse 1: ${marriageInfo.legalNamesAtMarriage.spouse1}<br>`;
        if (marriageInfo.legalNamesAtMarriage.spouse2) html += `Spouse 2: ${marriageInfo.legalNamesAtMarriage.spouse2}`;
        html += '</div></div>';
      }
    }
    if (marriageInfo.marriageDate) {
      html += `<div class="data-item"><div class="data-label">Marriage Date</div><div class="data-value">${marriageInfo.marriageDate}</div></div>`;
    }
    if (marriageInfo.marriagePlace) {
      html += `<div class="data-item"><div class="data-label">Marriage Place</div><div class="data-value">${marriageInfo.marriagePlace}</div></div>`;
    }
    if (marriageInfo.maidenNames && Array.isArray(marriageInfo.maidenNames) && marriageInfo.maidenNames.length > 0) {
      html += `<div class="data-item"><div class="data-label">Maiden Names</div><div class="data-value">${marriageInfo.maidenNames.join(', ')}</div></div>`;
    }
  }
  
  // Court Info Section
  if (courtInfo.hasPriorOrders || courtInfo.orderTypes?.length > 0 || courtInfo.jurisdictions?.length > 0) {
    html += '<div class="data-section-header"><h3>Court Information</h3></div>';
    if (courtInfo.hasPriorOrders !== undefined) {
      html += `<div class="data-item"><div class="data-label">Has Prior Orders</div><div class="data-value">${courtInfo.hasPriorOrders ? 'Yes' : 'No'}</div></div>`;
    }
    if (courtInfo.orderTypes && Array.isArray(courtInfo.orderTypes) && courtInfo.orderTypes.length > 0) {
      html += `<div class="data-item"><div class="data-label">Order Types</div><div class="data-value">${courtInfo.orderTypes.join(', ')}</div></div>`;
    }
    if (courtInfo.jurisdictions && Array.isArray(courtInfo.jurisdictions) && courtInfo.jurisdictions.length > 0) {
      html += `<div class="data-item"><div class="data-label">Jurisdictions</div><div class="data-value">${courtInfo.jurisdictions.join(', ')}</div></div>`;
    }
    if (courtInfo.custodyConstraints && Array.isArray(courtInfo.custodyConstraints) && courtInfo.custodyConstraints.length > 0) {
      html += `<div class="data-item"><div class="data-label">Custody Constraints</div><div class="data-value">${courtInfo.custodyConstraints.join(', ')}</div></div>`;
    }
    if (courtInfo.hasDomesticViolence !== undefined) {
      html += `<div class="data-item"><div class="data-label">Domestic Violence Indicators</div><div class="data-value">${courtInfo.hasDomesticViolence ? 'Yes' : 'No'}</div></div>`;
    }
  }

  if (!html) {
    html = `
      <div class="no-data">
        <div class="no-data-icon">📄</div>
        <p>No data stored yet.</p>
        <p style="margin-top: 10px; font-size: 12px;">Sync data from the extension popup after uploading documents on the web platform.</p>
      </div>
    `;
  }

  container.innerHTML = html;
}

/**
 * Format value for display
 */
function formatValue(value) {
  if (typeof value === 'number') {
    if (value % 1 !== 0) {
      return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toLocaleString('en-US');
  }
  return String(value);
}

/**
 * Format document type for display
 */
function formatDocType(type) {
  const types = {
    driversLicense: "Driver's License",
    taxReturn: 'Tax Return',
    payStub: 'Pay Stub',
    bankStatement: 'Bank Statement',
    w2: 'W-2',
    '1099': '1099'
  };
  return types[type] || type;
}

/**
 * Toggle edit mode
 */
function toggleEditMode() {
  isEditing = !isEditing;
  const editSection = document.getElementById('editSection');
  const editForm = document.getElementById('editForm');
  
  if (isEditing) {
    editSection.style.display = 'block';
    generateEditForm();
  } else {
    editSection.style.display = 'none';
  }
}

/**
 * Generate edit form
 */
function generateEditForm() {
  const form = document.getElementById('editForm');
  const data = storedData || {};
  
  const fields = [
    { key: 'name', label: 'Full Name', type: 'text' },
    { key: 'dateOfBirth', label: 'Date of Birth', type: 'text', placeholder: 'MM/DD/YYYY' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'licenseNumber', label: 'License Number', type: 'text' },
    { key: 'ssn', label: 'Social Security Number', type: 'text', placeholder: 'XXX-XX-XXXX' },
    { key: 'employerName', label: 'Employer Name', type: 'text' },
    { key: 'grossPay', label: 'Gross Pay', type: 'number', step: '0.01' },
    { key: 'netPay', label: 'Net Pay', type: 'number', step: '0.01' },
    { key: 'totalIncome', label: 'Total Income', type: 'number', step: '0.01' },
    { key: 'adjustedGrossIncome', label: 'Adjusted Gross Income', type: 'number', step: '0.01' },
    { key: 'filingStatus', label: 'Filing Status', type: 'text' },
    { key: 'dependents', label: 'Dependents', type: 'number' },
    { key: 'taxYear', label: 'Tax Year', type: 'text' },
    { key: 'bankName', label: 'Bank Name', type: 'text' },
    { key: 'balance', label: 'Balance', type: 'number', step: '0.01' }
  ];

  let html = '';
  fields.forEach(field => {
    const value = data[field.key] || '';
    html += `
      <div class="form-group">
        <label for="edit_${field.key}">${field.label}</label>
        ${field.type === 'textarea' 
          ? `<textarea id="edit_${field.key}" placeholder="${field.placeholder || ''}">${value}</textarea>`
          : `<input type="${field.type}" id="edit_${field.key}" value="${value}" placeholder="${field.placeholder || ''}" ${field.step ? `step="${field.step}"` : ''}>`
        }
      </div>
    `;
  });

  form.innerHTML = html;
}

/**
 * Save edited data
 */
async function saveData() {
  const form = document.getElementById('editForm');
  const inputs = form.querySelectorAll('input, textarea');
  const updatedData = { ...storedData };

  inputs.forEach(input => {
    const key = input.id.replace('edit_', '');
    let value = input.value.trim();
    
    // Convert number fields
    if (input.type === 'number' && value !== '') {
      value = parseFloat(value);
    }
    
    updatedData[key] = value || null;
  });

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'saveData',
      data: updatedData
    });

    if (response.success) {
      storedData = updatedData;
      displayData(updatedData);
      toggleEditMode();
      alert('Data saved successfully!');
    } else {
      alert('Error saving data: ' + (response.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Error saving data. Please try again.');
  }
}

/**
 * Cancel edit
 */
function cancelEdit() {
  toggleEditMode();
}

/**
 * Confirm and clear all data
 */
function confirmClearData() {
  const confirmed = confirm(
    'Are you sure you want to clear all stored data? This action cannot be undone.'
  );

  if (confirmed) {
    clearAllData();
  }
}

/**
 * Clear all stored data
 */
async function clearAllData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearData' });
    
    if (response.success) {
      storedData = null;
      loadStoredData();
      alert('All data has been cleared.');
    } else {
      alert('Error clearing data. Please try again.');
    }
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Error clearing data. Please try again.');
  }
}

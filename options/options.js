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
  const fields = [
    { key: 'name', label: 'Full Name' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'address', label: 'Address' },
    { key: 'licenseNumber', label: 'License Number' },
    { key: 'ssn', label: 'Social Security Number' },
    { key: 'socialSecurityNumber', label: 'SSN (Alt)' },
    { key: 'employerName', label: 'Employer Name' },
    { key: 'grossPay', label: 'Gross Pay' },
    { key: 'netPay', label: 'Net Pay' },
    { key: 'totalIncome', label: 'Total Income' },
    { key: 'adjustedGrossIncome', label: 'Adjusted Gross Income' },
    { key: 'wages', label: 'Wages' },
    { key: 'filingStatus', label: 'Filing Status' },
    { key: 'dependents', label: 'Dependents' },
    { key: 'taxYear', label: 'Tax Year' },
    { key: 'bankName', label: 'Bank Name' },
    { key: 'accountNumber', label: 'Account Number' },
    { key: 'balance', label: 'Balance' },
    { key: 'formType', label: 'Form Type' }
  ];

  let html = '';
  
  fields.forEach(field => {
    const value = data[field.key];
    if (value !== null && value !== undefined && value !== '') {
      html += `
        <div class="data-item">
          <div class="data-label">${field.label}</div>
          <div class="data-value">${formatValue(value)}</div>
        </div>
      `;
    }
  });

  // Show documents processed
  if (data.documents) {
    html += '<div class="data-item"><div class="data-label">Documents Processed</div>';
    html += '<div class="data-value">';
    Object.keys(data.documents).forEach(docType => {
      html += `<span style="display: inline-block; margin-right: 10px; margin-bottom: 5px; padding: 4px 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px;">${formatDocType(docType)}</span>`;
    });
    html += '</div></div>';
  }

  if (!html) {
    html = '<div class="no-data">No data available</div>';
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

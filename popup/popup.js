/**
 * Popup Script - Handles document upload UI
 */

let selectedFile = null;
let selectedDocType = 'driversLicense';

// Import API service (will be loaded as module or global)
let apiService = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load API service
  try {
    const apiModule = await import('../scripts/api-service.js');
    apiService = apiModule.default || apiModule;
  } catch (error) {
    console.warn('API service not available:', error);
  }
  
  setupEventListeners();
  checkStoredData();
  checkAuthStatus();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const uploadButton = document.getElementById('uploadButton');
  const removeFileBtn = document.getElementById('removeFile');
  const viewDataButton = document.getElementById('viewDataButton');
  const optionsButton = document.getElementById('optionsButton');

  // Document type selection
  document.querySelectorAll('input[name="docType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedDocType = e.target.value;
    });
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    console.log('File input changed', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      console.log('Selected file:', file.name, file.type, file.size);
      handleFileSelect(file);
    } else {
      console.log('No file selected');
    }
  });

  // Drag and drop handlers on upload area
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  });

  // Also handle click on upload area as fallback
  uploadArea.addEventListener('click', (e) => {
    // Only trigger if click is not on the file input itself
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  // Upload button
  uploadButton.addEventListener('click', () => {
    if (selectedFile) {
      processDocument(selectedFile, selectedDocType);
    }
  });

  // Remove file
  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFileSelection();
  });

  // View data button
  viewDataButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Options button
  optionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Login button
  const loginButton = document.getElementById('loginButton');
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

  // Sync button
  const syncButton = document.getElementById('syncButton');
  if (syncButton) {
    syncButton.addEventListener('click', async () => {
      await syncWithPlatform();
    });
  }
}

/**
 * Handle file selection
 */
function handleFileSelect(file) {
  console.log('handleFileSelect called with:', file);
  if (!file) {
    console.log('No file provided');
    return;
  }

  // Validate file type
  const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    console.log('Invalid file type:', file.type);
    showStatus('Please select a PDF, JPG, or PNG file', 'error');
    return;
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    console.log('File too large:', file.size);
    showStatus('File size must be less than 10MB', 'error');
    return;
  }

  selectedFile = file;
  console.log('File selected successfully:', file.name);
  displayFileInfo(file);
  const uploadButton = document.getElementById('uploadButton');
  if (uploadButton) {
    uploadButton.disabled = false;
    console.log('Upload button enabled');
  }
}

/**
 * Display file information
 */
function displayFileInfo(file) {
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  
  fileName.textContent = file.name;
  fileInfo.style.display = 'flex';
}

/**
 * Clear file selection
 */
function clearFileSelection() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('uploadButton').disabled = true;
}

/**
 * Process document
 */
async function processDocument(file, documentType) {
  const uploadButton = document.getElementById('uploadButton');
  const statusSection = document.getElementById('statusSection');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');

  // Disable button and show progress
  uploadButton.disabled = true;
  statusSection.style.display = 'block';
  progressBar.style.display = 'block';
  showStatus('Processing document...', '');

  // Simulate progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 5;
    if (progress <= 85) {
      progressFill.style.width = progress + '%';
    }
  }, 300);

  try {
    // Process document directly in popup (since background worker can't access Tesseract/PDF.js easily)
    const result = await processDocumentInPopup(file, documentType, (progressValue) => {
      progressFill.style.width = Math.min(85, progressValue * 0.85) + '%';
    });

    clearInterval(progressInterval);
    progressFill.style.width = '100%';

    if (result.success) {
      // Get existing data and merge
      const existingResponse = await chrome.runtime.sendMessage({ action: 'getStoredData' });
      const existingData = (existingResponse.success && existingResponse.data) ? existingResponse.data : {};
      
      const mergedData = {
        ...existingData,
        ...result.extractedData,
        documents: {
          ...(existingData.documents || {}),
          [documentType]: {
            processed: new Date().toISOString(),
            extracted: result.extractedData
          }
        }
      };

      // Save the merged data
      const saveResponse = await chrome.runtime.sendMessage({
        action: 'saveData',
        data: mergedData
      });

      if (saveResponse.success) {
        showStatus('Document processed successfully! Data extracted and saved.', 'success');
        setTimeout(() => {
          clearFileSelection();
          statusSection.style.display = 'none';
          progressBar.style.display = 'none';
        }, 3000);
      } else {
        showStatus('Data extracted but failed to save. Please try again.', 'error');
        uploadButton.disabled = false;
      }
    } else {
      showStatus(`Error: ${result.error || 'Failed to process document'}`, 'error');
      uploadButton.disabled = false;
    }
  } catch (error) {
    clearInterval(progressInterval);
    showStatus(`Error: ${error.message}`, 'error');
    uploadButton.disabled = false;
  }
}

/**
 * Process document in popup context (has access to Tesseract and PDF.js)
 */
async function processDocumentInPopup(file, documentType, progressCallback) {
  try {
    let text = '';

    // Load PDF.js if needed
    if (file.type === 'application/pdf' && typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js library not loaded');
    }

    // Load Tesseract if needed
    if (file.type.startsWith('image/') && typeof Tesseract === 'undefined') {
      throw new Error('Tesseract.js library not loaded');
    }

    // Extract text based on file type
    if (file.type === 'application/pdf') {
      text = await extractTextFromPDF(file, progressCallback);
    } else if (file.type.startsWith('image/')) {
      text = await extractTextFromImage(file, progressCallback);
    } else {
      throw new Error('Unsupported file type');
    }

    // Parse based on document type
    const parser = new DocumentParser();
    let extractedData = {};
    
    switch (documentType) {
      case 'driversLicense':
        extractedData = parser.parseDriversLicense(text);
        break;
      case 'taxReturn':
        extractedData = parser.parseTaxReturn(text);
        break;
      case 'payStub':
        extractedData = parser.parsePayStub(text);
        break;
      case 'bankStatement':
        extractedData = parser.parseBankStatement(text);
        break;
      case 'w2':
      case '1099':
        extractedData = parser.parseW2Or1099(text);
        break;
      default:
        extractedData = { rawText: text };
    }

    return {
      success: true,
      documentType,
      extractedData,
      rawText: text
    };
  } catch (error) {
    console.error('Document processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract text from PDF using PDF.js
 */
async function extractTextFromPDF(file, progressCallback) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    if (progressCallback) {
      progressCallback((i / pdf.numPages) * 50); // First 50% for PDF extraction
    }
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

/**
 * Extract text from image using Tesseract.js
 */
async function extractTextFromImage(file, progressCallback) {
  try {
    // Use Tesseract's recognize directly which handles worker creation internally
    // This might work better with extensions
    const workerPath = chrome.runtime.getURL('lib/worker.min.js');
    const corePath = chrome.runtime.getURL('lib/tesseract-core.wasm.js');
    const langPath = chrome.runtime.getURL('lib/');
    
    console.log('Using Tesseract recognize with local paths');
    
    // Use recognize directly - it will create workers internally
    const { data: { text } } = await Tesseract.recognize(file, 'eng', {
      workerPath: workerPath,
      corePath: corePath,
      langPath: langPath,
      logger: (m) => {
        if (progressCallback && m.status === 'recognizing text') {
          progressCallback(50 + (m.progress * 50));
        }
      }
    });
    
    return text;
  } catch (error) {
    console.error('Tesseract error:', error);
    // Fallback: try without explicit paths
    try {
      console.log('Trying fallback without explicit paths');
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (progressCallback && m.status === 'recognizing text') {
            progressCallback(50 + (m.progress * 50));
          }
        }
      });
      return text;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw new Error('OCR failed: ' + fallbackError.message);
    }
  }
}

/**
 * Document Parser class (simplified version for popup)
 */
class DocumentParser {
  parseDriversLicense(text) {
    const data = {
      name: null,
      dateOfBirth: null,
      address: null,
      licenseNumber: null,
      ssn: null,
      expirationDate: null
    };

    const nameMatch = text.match(/(?:DL|DRIVER\s+LICENSE|NAME)[\s:]*([A-Z][A-Z\s,]+)/i);
    if (nameMatch) {
      data.name = nameMatch[1].trim();
    }

    const dobMatch = text.match(/(?:DOB|DATE\s+OF\s+BIRTH|BIRTH)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dobMatch) {
      data.dateOfBirth = dobMatch[1];
    }

    const addressMatch = text.match(/(?:ADDRESS|ADDR)[\s:]*([0-9]+\s+[A-Z0-9\s,#\-]+(?:ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|LN|LANE|BLVD|BOULEVARD)[A-Z0-9\s,#\-]*)/i);
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }

    const licenseMatch = text.match(/(?:DLN|LICENSE\s+NO|LIC\s+#)[\s:]*([A-Z0-9]{8,12})/i);
    if (licenseMatch) {
      data.licenseNumber = licenseMatch[1];
    }

    const ssnMatch = text.match(/(?:SSN|SOCIAL)[\s:]*(\d{3}[-\s]?\d{2}[-\s]?\d{4})/i);
    if (ssnMatch) {
      data.ssn = ssnMatch[1].replace(/[-\s]/g, '');
    }

    return data;
  }

  parseTaxReturn(text) {
    const data = {
      filingStatus: null,
      adjustedGrossIncome: null,
      totalIncome: null,
      dependents: null,
      taxYear: null
    };

    const statusMatch = text.match(/(?:FILING\s+STATUS|STATUS)[\s:]*(\w+(?:\s+\w+)?)/i);
    if (statusMatch) {
      data.filingStatus = statusMatch[1];
    }

    const agiMatch = text.match(/(?:ADJUSTED\s+GROSS\s+INCOME|AGI)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (agiMatch) {
      data.adjustedGrossIncome = parseFloat(agiMatch[1].replace(/,/g, ''));
    }

    const incomeMatch = text.match(/(?:TOTAL\s+INCOME|INCOME)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (incomeMatch) {
      data.totalIncome = parseFloat(incomeMatch[1].replace(/,/g, ''));
    }

    const dependentsMatch = text.match(/(?:DEPENDENTS|DEP)[\s:]*(\d+)/i);
    if (dependentsMatch) {
      data.dependents = parseInt(dependentsMatch[1]);
    }

    const yearMatch = text.match(/(?:TAX\s+YEAR|YEAR)[\s:]*(\d{4})/i);
    if (yearMatch) {
      data.taxYear = yearMatch[1];
    }

    return data;
  }

  parsePayStub(text) {
    const data = {
      employerName: null,
      grossPay: null,
      netPay: null,
      payPeriod: null,
      deductions: {},
      yearToDate: {}
    };

    const employerMatch = text.match(/(?:EMPLOYER|COMPANY)[\s:]*([A-Z][A-Z\s&,\.]+)/i);
    if (employerMatch) {
      data.employerName = employerMatch[1].trim();
    }

    const grossMatch = text.match(/(?:GROSS\s+PAY|GROSS)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (grossMatch) {
      data.grossPay = parseFloat(grossMatch[1].replace(/,/g, ''));
    }

    const netMatch = text.match(/(?:NET\s+PAY|NET|TAKE\s+HOME)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (netMatch) {
      data.netPay = parseFloat(netMatch[1].replace(/,/g, ''));
    }

    const periodMatch = text.match(/(?:PAY\s+PERIOD|PERIOD)[\s:]*([A-Z][A-Z\s\d,]+)/i);
    if (periodMatch) {
      data.payPeriod = periodMatch[1].trim();
    }

    return data;
  }

  parseBankStatement(text) {
    const data = {
      bankName: null,
      accountNumber: null,
      accountType: null,
      balance: null,
      statementDate: null
    };

    const bankMatch = text.match(/(?:BANK|FINANCIAL)[\s:]*([A-Z][A-Z\s&,\.]+)/i);
    if (bankMatch) {
      data.bankName = bankMatch[1].trim();
    }

    const accountMatch = text.match(/(?:ACCOUNT\s+#|ACCT\s+#|ACCOUNT\s+NUMBER)[\s:]*([X\*\d]{4,})/i);
    if (accountMatch) {
      data.accountNumber = accountMatch[1];
    }

    const balanceMatch = text.match(/(?:BALANCE|CURRENT\s+BALANCE)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (balanceMatch) {
      data.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    }

    return data;
  }

  parseW2Or1099(text) {
    const data = {
      formType: null,
      employerName: null,
      wages: null,
      federalTaxWithheld: null,
      socialSecurityWages: null,
      medicareWages: null,
      taxYear: null
    };

    if (text.match(/W-2|W2/i)) {
      data.formType = 'W-2';
    } else if (text.match(/1099/i)) {
      data.formType = '1099';
    }

    const employerMatch = text.match(/(?:EMPLOYER|PAYER)[\s:]*([A-Z][A-Z\s&,\.]+)/i);
    if (employerMatch) {
      data.employerName = employerMatch[1].trim();
    }

    const wagesMatch = text.match(/(?:WAGES|COMPENSATION)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (wagesMatch) {
      data.wages = parseFloat(wagesMatch[1].replace(/,/g, ''));
    }

    const yearMatch = text.match(/(\d{4})/);
    if (yearMatch) {
      data.taxYear = yearMatch[1];
    }

    return data;
  }
}

/**
 * Convert file to data URL
 */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Show status message
 */
function showStatus(message, type = '') {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = 'status-message ' + type;
}

/**
 * Check if there's stored data
 */
async function checkStoredData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStoredData' });
    if (response.success && response.data) {
      // Could show indicator that data exists
    }
  } catch (error) {
    console.error('Error checking stored data:', error);
  }
}

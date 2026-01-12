/**
 * Document Parser - Handles OCR and data extraction from various document types
 */

class DocumentParser {
  constructor() {
    this.tesseractWorker = null;
  }

  /**
   * Initialize Tesseract.js worker
   */
  async initTesseract() {
    if (!this.tesseractWorker) {
      // Tesseract.js will be loaded from CDN or local file
      if (typeof Tesseract !== 'undefined') {
        this.tesseractWorker = await Tesseract.createWorker('eng');
      } else {
        throw new Error('Tesseract.js not loaded');
      }
    }
    return this.tesseractWorker;
  }

  /**
   * Extract text from image using OCR
   */
  async extractTextFromImage(imageFile) {
    try {
      await this.initTesseract();
      const { data: { text } } = await this.tesseractWorker.recognize(imageFile);
      return text;
    } catch (error) {
      console.error('OCR Error:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF
   */
  async extractTextFromPDF(pdfFile) {
    try {
      // PDF.js will be loaded from CDN or local file
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js not loaded');
      }

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      // Fallback to OCR if PDF text extraction fails
      return await this.extractTextFromImage(pdfFile);
    }
  }

  /**
   * Parse driver's license information
   */
  parseDriversLicense(text) {
    const data = {
      name: null,
      dateOfBirth: null,
      address: null,
      licenseNumber: null,
      ssn: null,
      expirationDate: null
    };

    // Extract name (usually first line or after "DL" or "DRIVER LICENSE")
    const nameMatch = text.match(/(?:DL|DRIVER\s+LICENSE|NAME)[\s:]*([A-Z][A-Z\s,]+)/i);
    if (nameMatch) {
      data.name = nameMatch[1].trim();
    }

    // Extract DOB (various formats)
    const dobMatch = text.match(/(?:DOB|DATE\s+OF\s+BIRTH|BIRTH)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dobMatch) {
      data.dateOfBirth = dobMatch[1];
    }

    // Extract address
    const addressMatch = text.match(/(?:ADDRESS|ADDR)[\s:]*([0-9]+\s+[A-Z0-9\s,#\-]+(?:ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|LN|LANE|BLVD|BOULEVARD)[A-Z0-9\s,#\-]*)/i);
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }

    // Extract license number (usually alphanumeric, 8-12 characters)
    const licenseMatch = text.match(/(?:DLN|LICENSE\s+NO|LIC\s+#)[\s:]*([A-Z0-9]{8,12})/i);
    if (licenseMatch) {
      data.licenseNumber = licenseMatch[1];
    }

    // Extract SSN (9 digits, possibly with dashes)
    const ssnMatch = text.match(/(?:SSN|SOCIAL)[\s:]*(\d{3}[-\s]?\d{2}[-\s]?\d{4})/i);
    if (ssnMatch) {
      data.ssn = ssnMatch[1].replace(/[-\s]/g, '');
    }

    return data;
  }

  /**
   * Parse tax return information
   */
  parseTaxReturn(text) {
    const data = {
      filingStatus: null,
      adjustedGrossIncome: null,
      totalIncome: null,
      dependents: null,
      taxYear: null
    };

    // Extract filing status
    const statusMatch = text.match(/(?:FILING\s+STATUS|STATUS)[\s:]*(\w+(?:\s+\w+)?)/i);
    if (statusMatch) {
      data.filingStatus = statusMatch[1];
    }

    // Extract AGI
    const agiMatch = text.match(/(?:ADJUSTED\s+GROSS\s+INCOME|AGI)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (agiMatch) {
      data.adjustedGrossIncome = parseFloat(agiMatch[1].replace(/,/g, ''));
    }

    // Extract total income
    const incomeMatch = text.match(/(?:TOTAL\s+INCOME|INCOME)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (incomeMatch) {
      data.totalIncome = parseFloat(incomeMatch[1].replace(/,/g, ''));
    }

    // Extract number of dependents
    const dependentsMatch = text.match(/(?:DEPENDENTS|DEP)[\s:]*(\d+)/i);
    if (dependentsMatch) {
      data.dependents = parseInt(dependentsMatch[1]);
    }

    // Extract tax year
    const yearMatch = text.match(/(?:TAX\s+YEAR|YEAR)[\s:]*(\d{4})/i);
    if (yearMatch) {
      data.taxYear = yearMatch[1];
    }

    return data;
  }

  /**
   * Parse pay stub information
   */
  parsePayStub(text) {
    const data = {
      employerName: null,
      grossPay: null,
      netPay: null,
      payPeriod: null,
      deductions: {},
      yearToDate: {}
    };

    // Extract employer name
    const employerMatch = text.match(/(?:EMPLOYER|COMPANY)[\s:]*([A-Z][A-Z\s&,\.]+)/i);
    if (employerMatch) {
      data.employerName = employerMatch[1].trim();
    }

    // Extract gross pay
    const grossMatch = text.match(/(?:GROSS\s+PAY|GROSS)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (grossMatch) {
      data.grossPay = parseFloat(grossMatch[1].replace(/,/g, ''));
    }

    // Extract net pay
    const netMatch = text.match(/(?:NET\s+PAY|NET|TAKE\s+HOME)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (netMatch) {
      data.netPay = parseFloat(netMatch[1].replace(/,/g, ''));
    }

    // Extract pay period
    const periodMatch = text.match(/(?:PAY\s+PERIOD|PERIOD)[\s:]*([A-Z][A-Z\s\d,]+)/i);
    if (periodMatch) {
      data.payPeriod = periodMatch[1].trim();
    }

    return data;
  }

  /**
   * Parse bank statement information
   */
  parseBankStatement(text) {
    const data = {
      bankName: null,
      accountNumber: null,
      accountType: null,
      balance: null,
      statementDate: null
    };

    // Extract bank name
    const bankMatch = text.match(/(?:BANK|FINANCIAL)[\s:]*([A-Z][A-Z\s&,\.]+)/i);
    if (bankMatch) {
      data.bankName = bankMatch[1].trim();
    }

    // Extract account number (usually masked or partial)
    const accountMatch = text.match(/(?:ACCOUNT\s+#|ACCT\s+#|ACCOUNT\s+NUMBER)[\s:]*([X\*\d]{4,})/i);
    if (accountMatch) {
      data.accountNumber = accountMatch[1];
    }

    // Extract balance
    const balanceMatch = text.match(/(?:BALANCE|CURRENT\s+BALANCE)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (balanceMatch) {
      data.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    }

    return data;
  }

  /**
   * Parse W-2 or 1099 form
   */
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

    // Determine form type
    if (text.match(/W-2|W2/i)) {
      data.formType = 'W-2';
    } else if (text.match(/1099/i)) {
      data.formType = '1099';
    }

    // Extract employer/payer name
    const employerMatch = text.match(/(?:EMPLOYER|PAYER)[\s:]*([A-Z][A-Z\s&,\.]+)/i);
    if (employerMatch) {
      data.employerName = employerMatch[1].trim();
    }

    // Extract wages
    const wagesMatch = text.match(/(?:WAGES|COMPENSATION)[\s:$]*\$?([\d,]+\.?\d*)/i);
    if (wagesMatch) {
      data.wages = parseFloat(wagesMatch[1].replace(/,/g, ''));
    }

    // Extract tax year
    const yearMatch = text.match(/(\d{4})/);
    if (yearMatch) {
      data.taxYear = yearMatch[1];
    }

    return data;
  }

  /**
   * Process document and extract data based on document type
   */
  async processDocument(file, documentType) {
    try {
      let text = '';

      // Extract text based on file type
      if (file.type === 'application/pdf') {
        text = await this.extractTextFromPDF(file);
      } else if (file.type.startsWith('image/')) {
        text = await this.extractTextFromImage(file);
      } else {
        throw new Error('Unsupported file type');
      }

      // Parse based on document type
      let extractedData = {};
      switch (documentType) {
        case 'driversLicense':
          extractedData = this.parseDriversLicense(text);
          break;
        case 'taxReturn':
          extractedData = this.parseTaxReturn(text);
          break;
        case 'payStub':
          extractedData = this.parsePayStub(text);
          break;
        case 'bankStatement':
          extractedData = this.parseBankStatement(text);
          break;
        case 'w2':
        case '1099':
          extractedData = this.parseW2Or1099(text);
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
   * Cleanup Tesseract worker
   */
  async cleanup() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentParser;
}

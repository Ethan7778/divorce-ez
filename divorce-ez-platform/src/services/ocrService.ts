/**
 * OCR Service - Browser-based document processing using Tesseract.js and PDF.js
 */

import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker - use unpkg CDN which is more reliable
if (typeof window !== 'undefined') {
  // Use unpkg CDN which typically has better availability
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

export interface OCRResult {
  success: boolean
  text: string
  error?: string
}

export interface ProcessedDocument {
  success: boolean
  documentType: string
  extractedData: Record<string, any>
  rawText: string
  error?: string
}

/**
 * Extract text from image using Tesseract.js OCR
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    console.log('🖼️ Starting OCR for image file:', file.name, 'Size:', file.size)
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(m.progress)
        }
        // Log OCR progress for debugging
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    console.log('✅ OCR completed:', {
      textLength: data.text.length,
      confidence: data.confidence,
      textPreview: data.text.substring(0, 200)
    })

    if (!data.text || data.text.trim().length === 0) {
      console.warn('⚠️ OCR returned empty text')
      return {
        success: false,
        text: '',
        error: 'OCR returned no text. The image may be too blurry or contain no readable text.',
      }
    }

    return {
      success: true,
      text: data.text,
    }
  } catch (error: any) {
    console.error('❌ OCR Error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return {
      success: false,
      text: '',
      error: error.message || 'OCR failed',
    }
  }
}

/**
 * Extract text from PDF using PDF.js
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    console.log('📄 Starting PDF text extraction:', file.name)
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    const totalPages = pdf.numPages
    console.log(`📄 PDF has ${totalPages} page(s)`)

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')

      fullText += pageText + '\n'

      if (onProgress) {
        onProgress(i / totalPages)
      }
      
      console.log(`Page ${i}/${totalPages} extracted: ${pageText.length} characters`)
    }

    console.log('✅ PDF text extraction complete:', {
      totalLength: fullText.length,
      textPreview: fullText.substring(0, 200)
    })

    // If PDF has no extractable text, fall back to OCR
    if (fullText.trim().length < 10) {
      console.warn('⚠️ PDF has no extractable text (only ' + fullText.trim().length + ' chars), falling back to OCR')
      return await extractTextFromImage(file, onProgress)
    }

    return {
      success: true,
      text: fullText,
    }
  } catch (error: any) {
    console.error('❌ PDF extraction error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    console.log('🔄 Falling back to OCR for PDF...')
    // Fallback to OCR if PDF extraction fails
    return await extractTextFromImage(file, onProgress)
  }
}

/**
 * Extract text from file (auto-detect type)
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  if (file.type === 'application/pdf') {
    return await extractTextFromPDF(file, onProgress)
  } else if (file.type.startsWith('image/')) {
    return await extractTextFromImage(file, onProgress)
  } else {
    return {
      success: false,
      text: '',
      error: 'Unsupported file type',
    }
  }
}

/**
 * Parse document text based on document type
 */
export function parseDocumentText(text: string, documentType: string): Record<string, any> {
  const extractedData: Record<string, any> = { rawText: text }

  if (!text || text.trim().length === 0) {
    console.warn('⚠️ Empty text provided to parseDocumentText')
    return extractedData
  }

  console.log(`📝 Parsing ${documentType} document, text length: ${text.length}`)

  let parsedData: Record<string, any>
  
  switch (documentType) {
    case 'driversLicense':
      parsedData = parseDriversLicense(text)
      break
    case 'taxReturn':
      parsedData = parseTaxReturn(text)
      break
    case 'payStub':
      parsedData = parsePayStub(text)
      break
    case 'bankStatement':
      parsedData = parseBankStatement(text)
      break
    case 'w2':
    case '1099':
      parsedData = parseW2Or1099(text)
      break
    case 'marriageCertificate':
      parsedData = parseMarriageCertificate(text)
      break
    case 'priorCourtOrder':
      parsedData = parsePriorCourtOrder(text)
      break
    case 'profitAndLoss':
      parsedData = parseProfitAndLoss(text)
      break
    default:
      console.warn(`⚠️ Unknown document type: ${documentType}, returning raw text only`)
      parsedData = extractedData
  }

  // Merge rawText into parsed data
  parsedData.rawText = text

  // Log parsing results
  const extractedKeys = Object.keys(parsedData).filter(k => k !== 'rawText')
  console.log(`✅ Parsed ${documentType}:`, {
    extractedFields: extractedKeys.length,
    fields: extractedKeys,
    hasData: extractedKeys.length > 0
  })

  return parsedData
}

/**
 * Parse driver's license information
 */
function parseDriversLicense(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Extract name
  const nameMatch = text.match(/(?:DL|DRIVER\s+LICENSE|NAME)[\s:]*([A-Z][A-Z\s,]+)/i)
  if (nameMatch) {
    const nameParts = nameMatch[1].trim().split(/\s+/)
    data.firstName = nameParts[0]
    data.lastName = nameParts.slice(1).join(' ')
    data.name = nameMatch[1].trim()
  }

  // Extract DOB
  const dobMatch = text.match(/(?:DOB|DATE\s+OF\s+BIRTH|BIRTH)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
  if (dobMatch) {
    data.dateOfBirth = dobMatch[1]
  }

  // Extract address
  const addressMatch = text.match(
    /(?:ADDRESS|ADDR)[\s:]*([0-9]+\s+[A-Z0-9\s,#\-]+(?:ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|LN|LANE|BLVD|BOULEVARD)[A-Z0-9\s,#\-]*)/
  )
  if (addressMatch) {
    data.address = { street: addressMatch[1].trim() }
  }

  // Extract license number
  const licenseMatch = text.match(/(?:DLN|LICENSE\s+NO|LIC\s+#)[\s:]*([A-Z0-9]{8,12})/i)
  if (licenseMatch) {
    data.driverLicenseNumber = licenseMatch[1]
  }

  return data
}

/**
 * Parse tax return information (Form 1040 + schedules)
 * Extracts: Identity, Address, Marriage & Family, Income breakdown, Employment
 */
function parseTaxReturn(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Extract primary taxpayer name (Form 1040 line 1 area)
  const primaryNameMatch = text.match(/(?:YOUR\s+FIRST\s+NAME|FIRST\s+NAME\s+AND\s+MIDDLE\s+INITIAL)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (primaryNameMatch) {
    const nameParts = primaryNameMatch[1].trim().split(/\s+/)
    data.firstName = nameParts[0]
    if (nameParts.length > 1) {
      data.middleName = nameParts.slice(1, -1).join(' ')
      data.lastName = nameParts[nameParts.length - 1]
    } else {
      data.lastName = nameParts[0]
    }
  }

  // Extract last name separately (Form 1040)
  const lastNameMatch = text.match(/(?:LAST\s+NAME)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (lastNameMatch && !data.lastName) {
    data.lastName = lastNameMatch[1].trim()
  }

  // Extract SSN (full, we'll store only last 4)
  const ssnMatch = text.match(/(?:SSN|SOCIAL\s+SECURITY\s+NUMBER)[\s:]*(\d{3}[-.\s]?\d{2}[-.\s]?\d{4})/i)
  if (ssnMatch) {
    const ssn = ssnMatch[1].replace(/[-.\s]/g, '')
    if (ssn.length === 9) {
      data.ssn = ssn
      data.ssnLast4 = ssn.slice(-4)
    }
  }

  // Extract filing status
  const filingStatusMatch = text.match(/(?:FILING\s+STATUS|Filing\s+Status)[\s:]*(\d|Single|Married\s+filing\s+jointly|Married\s+filing\s+separately|Head\s+of\s+household)/i)
  if (filingStatusMatch) {
    const status = filingStatusMatch[1].toLowerCase()
    if (status.includes('single') || status === '1') {
      data.filingStatus = 'single'
    } else if (status.includes('joint') || status === '2') {
      data.filingStatus = 'married_joint'
    } else if (status.includes('separate') || status === '3') {
      data.filingStatus = 'married_separate'
    } else if (status.includes('head') || status === '4') {
      data.filingStatus = 'head_of_household'
    }
  }

  // Extract address (Form 1040)
  const addressMatch = text.match(/(?:HOME\s+ADDRESS|STREET\s+ADDRESS)[\s:]*([0-9]+\s+[A-Z0-9\s,#\-]+)/i)
  if (addressMatch) {
    const addressParts = addressMatch[1].trim().split(/\s*,\s*/)
    data.address = { street: addressParts[0] }
    if (addressParts.length > 1) {
      data.address.city = addressParts[1]
    }
  }

  // Extract city
  const cityMatch = text.match(/(?:CITY\s+OR\s+TOWN|CITY)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)
  if (cityMatch && (!data.address || !data.address.city)) {
    if (!data.address) data.address = {}
    data.address.city = cityMatch[1].trim()
  }

  // Extract state
  const stateMatch = text.match(/(?:STATE|ST\.?)[\s:]*([A-Z]{2})/i)
  if (stateMatch && (!data.address || !data.address.state)) {
    if (!data.address) data.address = {}
    data.address.state = stateMatch[1].trim()
  }

  // Extract ZIP code
  const zipMatch = text.match(/(?:ZIP\s+CODE|ZIP)[\s:]*(\d{5}(?:-\d{4})?)/i)
  if (zipMatch && (!data.address || !data.address.zipCode)) {
    if (!data.address) data.address = {}
    data.address.zipCode = zipMatch[1].trim()
  }

  // Extract spouse name (if joint filing)
  const spouseNameMatch = text.match(/(?:SPOUSE'S\s+FIRST\s+NAME|SPOUSE\s+FIRST\s+NAME)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (spouseNameMatch) {
    const spouseFirst = spouseNameMatch[1].trim()
    const spouseLastMatch = text.match(/(?:SPOUSE'S\s+LAST\s+NAME|SPOUSE\s+LAST\s+NAME)[\s:]*([A-Z][a-z]+)/i)
    if (spouseLastMatch) {
      data.spouseName = `${spouseFirst} ${spouseLastMatch[1].trim()}`
    } else {
      data.spouseName = spouseFirst
    }
  }

  // Extract dependents (from dependent section or Schedule EIC)
  const dependents: Array<{ name: string; dateOfBirth: string }> = []
  // Look for dependent names and DOBs
  const dependentPattern = /(?:DEPENDENT|CHILD)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)[\s:]*DOB[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
  let dependentMatch
  while ((dependentMatch = dependentPattern.exec(text)) !== null) {
    dependents.push({
      name: dependentMatch[1].trim(),
      dateOfBirth: dependentMatch[2].trim(),
    })
  }
  if (dependents.length > 0) {
    data.dependents = dependents
  }

  // Extract wage income (Form 1040 line 1, or W-2 box 1)
  const wageMatch = text.match(/(?:WAGES|SALARIES|TIP|TAXABLE\s+WAGE|LINE\s+1)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (wageMatch) {
    data.wageIncome = parseFloat(wageMatch[1].replace(/,/g, ''))
    data.annualIncome = (data.annualIncome || 0) + data.wageIncome
  }

  // Extract self-employment income (Schedule C or Form 1040 line 7)
  const selfEmpMatch = text.match(/(?:BUSINESS\s+INCOME|SELF[\s-]?EMPLOYMENT|SCHEDULE\s+C|LINE\s+7)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (selfEmpMatch) {
    data.selfEmploymentIncome = parseFloat(selfEmpMatch[1].replace(/,/g, ''))
    data.annualIncome = (data.annualIncome || 0) + data.selfEmploymentIncome
  }

  // Extract investment income (Schedule B/D or Form 1040 line 8a)
  const interestMatch = text.match(/(?:TAXABLE\s+INTEREST|INTEREST\s+INCOME|LINE\s+8A)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (interestMatch) {
    data.investmentIncome = parseFloat(interestMatch[1].replace(/,/g, ''))
    data.annualIncome = (data.annualIncome || 0) + data.investmentIncome
  }

  // Extract rental income (Schedule E or Form 1040 line 17)
  const rentalMatch = text.match(/(?:RENTAL\s+INCOME|RENTAL|SCHEDULE\s+E|LINE\s+17)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (rentalMatch) {
    data.rentalIncome = parseFloat(rentalMatch[1].replace(/,/g, ''))
    data.annualIncome = (data.annualIncome || 0) + data.rentalIncome
  }

  // Extract AGI (Adjusted Gross Income)
  const agiMatch = text.match(/(?:ADJUSTED\s+GROSS\s+INCOME|AGI|LINE\s+11)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (agiMatch) {
    const agi = parseFloat(agiMatch[1].replace(/,/g, ''))
    if (!data.annualIncome || agi > data.annualIncome) {
      data.annualIncome = agi
    }
    data.adjustedGrossIncome = agi
  }

  // Extract total income
  const totalIncomeMatch = text.match(/(?:TOTAL\s+INCOME|LINE\s+9)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (totalIncomeMatch) {
    data.totalIncome = parseFloat(totalIncomeMatch[1].replace(/,/g, ''))
  }

  // Extract employer names from W-2s (embedded in tax return)
  const employers: Array<{ name: string; income?: number }> = []
  const employerPattern = /(?:EMPLOYER'S\s+NAME|EMPLOYER)[\s:]*([A-Z][A-Z\s,&]+)/gi
  let employerMatch
  while ((employerMatch = employerPattern.exec(text)) !== null) {
    const employerName = employerMatch[1].trim()
    if (employerName && employerName.length > 2) {
      employers.push({ name: employerName })
    }
  }
  if (employers.length > 0) {
    data.employers = employers
  }

  return data
}

/**
 * Parse pay stub information
 * Extracts: Employer name, gross income, pay frequency, overtime, bonuses, insurance, deductions
 */
function parsePayStub(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Extract employer name (usually in header)
  const employerMatch = text.match(/(?:EMPLOYER|COMPANY|EMPLOYER\s+NAME)[\s:]*([A-Z][A-Z\s,&\.]+)/i)
  if (employerMatch) {
    data.employerName = employerMatch[1].trim()
    data.employers = [{ name: employerMatch[1].trim() }]
  }

  // Extract pay period dates to determine frequency
  const payPeriodMatch = text.match(/(?:PAY\s+PERIOD|PERIOD)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:TO|THRU|THROUGH|[-])\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
  if (payPeriodMatch) {
    const startDate = new Date(payPeriodMatch[1])
    const endDate = new Date(payPeriodMatch[2])
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= 7) {
      data.payFrequency = 'weekly'
    } else if (daysDiff <= 14) {
      data.payFrequency = 'biweekly'
    } else if (daysDiff <= 31) {
      data.payFrequency = 'monthly'
    } else {
      data.payFrequency = 'yearly'
    }
  }

  // Extract gross pay
  const grossMatch = text.match(/(?:GROSS\s+PAY|GROSS|GROSS\s+EARNINGS)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (grossMatch) {
    const gross = parseFloat(grossMatch[1].replace(/,/g, ''))
    
    // Determine if this is monthly, biweekly, or weekly based on pay frequency
    if (data.payFrequency === 'weekly') {
      data.monthlyIncome = gross * 4.33 // Approximate monthly
      data.annualIncome = gross * 52
    } else if (data.payFrequency === 'biweekly') {
      data.monthlyIncome = gross * 2.17 // Approximate monthly
      data.annualIncome = gross * 26
    } else if (data.payFrequency === 'monthly') {
      data.monthlyIncome = gross
      data.annualIncome = gross * 12
    } else {
      data.monthlyIncome = gross
      data.annualIncome = gross * 12 // Default assumption
    }
    
    data.wageIncome = gross
  }

  // Extract overtime
  const overtimeMatch = text.match(/(?:OVERTIME|OT)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (overtimeMatch) {
    data.overtime = parseFloat(overtimeMatch[1].replace(/,/g, ''))
  }

  // Extract bonuses
  const bonusMatch = text.match(/(?:BONUS|BONUSES)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (bonusMatch) {
    data.bonuses = parseFloat(bonusMatch[1].replace(/,/g, ''))
  }

  // Extract insurance premiums (health, dental, etc.)
  const healthInsuranceMatch = text.match(/(?:HEALTH\s+INSURANCE|MEDICAL|HEALTH)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (healthInsuranceMatch) {
    data.healthInsurance = parseFloat(healthInsuranceMatch[1].replace(/,/g, ''))
  }

  const dentalInsuranceMatch = text.match(/(?:DENTAL\s+INSURANCE|DENTAL)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (dentalInsuranceMatch) {
    data.dentalInsurance = parseFloat(dentalInsuranceMatch[1].replace(/,/g, ''))
  }

  // Total insurance premiums
  if (data.healthInsurance || data.dentalInsurance) {
    data.insurancePremiums = (data.healthInsurance || 0) + (data.dentalInsurance || 0)
  }

  // Extract total payroll deductions
  const deductionsMatch = text.match(/(?:TOTAL\s+DEDUCTIONS|DEDUCTIONS\s+TOTAL|TOTAL\s+DED)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (deductionsMatch) {
    data.payrollDeductions = parseFloat(deductionsMatch[1].replace(/,/g, ''))
  }

  // Extract net pay (for verification)
  const netPayMatch = text.match(/(?:NET\s+PAY|TAKE\s+HOME|NET)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (netPayMatch) {
    data.netPay = parseFloat(netPayMatch[1].replace(/,/g, ''))
  }

  return data
}

/**
 * Parse bank statement information
 * Extracts: Housing costs, utilities, childcare, debt payments, transportation, income patterns
 */
function parseBankStatement(text: string): Record<string, any> {
  const data: Record<string, any> = {}
  const expenses: Record<string, number> = {}

  // Extract balance
  const balanceMatch = text.match(/(?:BALANCE|CURRENT\s+BALANCE|ENDING\s+BALANCE)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (balanceMatch) {
    data.balance = parseFloat(balanceMatch[1].replace(/,/g, ''))
  }

  // Extract bank name
  const bankNameMatch = text.match(/(?:BANK|FINANCIAL\s+INSTITUTION)[\s:]*([A-Z][A-Z\s,&\.]+)/i)
  if (bankNameMatch) {
    data.bankName = bankNameMatch[1].trim()
  }

  // Extract account number
  const accountMatch = text.match(/(?:ACCOUNT\s+NUMBER|ACCT\s+#|ACCOUNT\s+#)[\s:]*([X*0-9]+)/i)
  if (accountMatch) {
    data.accountNumber = accountMatch[1].trim()
  }

  // Housing costs (rent/mortgage)
  const housingKeywords = ['rent', 'mortgage', 'housing', 'lease', 'apartment']
  const housingPattern = new RegExp(`(${housingKeywords.join('|')})[\\s:]*\\$?([\\d,]+\\.?\\d*)`, 'gi')
  let housingMatch
  let housingTotal = 0
  while ((housingMatch = housingPattern.exec(text)) !== null) {
    const amount = parseFloat(housingMatch[2].replace(/,/g, ''))
    if (amount > 0 && amount < 100000) { // Reasonable range
      housingTotal += amount
    }
  }
  if (housingTotal > 0) {
    expenses.housing = housingTotal
  }

  // Utilities (electric, water, gas, internet)
  const utilityKeywords = ['electric', 'electricity', 'power', 'water', 'gas', 'internet', 'cable', 'utility', 'utilities']
  const utilityPattern = new RegExp(`(${utilityKeywords.join('|')})[\\s:]*\\$?([\\d,]+\\.?\\d*)`, 'gi')
  let utilityMatch
  let utilityTotal = 0
  while ((utilityMatch = utilityPattern.exec(text)) !== null) {
    const amount = parseFloat(utilityMatch[2].replace(/,/g, ''))
    if (amount > 0 && amount < 10000) { // Reasonable range
      utilityTotal += amount
    }
  }
  if (utilityTotal > 0) {
    expenses.utilities = utilityTotal
  }

  // Childcare
  const childcareKeywords = ['childcare', 'daycare', 'babysitter', 'nanny', 'preschool']
  const childcarePattern = new RegExp(`(${childcareKeywords.join('|')})[\\s:]*\\$?([\\d,]+\\.?\\d*)`, 'gi')
  let childcareMatch
  let childcareTotal = 0
  while ((childcareMatch = childcarePattern.exec(text)) !== null) {
    const amount = parseFloat(childcareMatch[2].replace(/,/g, ''))
    if (amount > 0 && amount < 50000) { // Reasonable range
      childcareTotal += amount
    }
  }
  if (childcareTotal > 0) {
    expenses.childcare = childcareTotal
  }

  // Debt payments (credit cards, loans)
  const debtKeywords = ['credit card', 'loan', 'payment', 'minimum payment', 'credit', 'visa', 'mastercard', 'amex']
  const debtPattern = new RegExp(`(${debtKeywords.join('|')})[\\s:]*\\$?([\\d,]+\\.?\\d*)`, 'gi')
  let debtMatch
  let debtTotal = 0
  while ((debtMatch = debtPattern.exec(text)) !== null) {
    const amount = parseFloat(debtMatch[2].replace(/,/g, ''))
    if (amount > 0 && amount < 100000) { // Reasonable range
      debtTotal += amount
    }
  }
  if (debtTotal > 0) {
    expenses.debt = debtTotal
  }

  // Transportation costs (gas, car payment, auto)
  const transportKeywords = ['gas', 'gasoline', 'fuel', 'car payment', 'auto', 'vehicle', 'transportation', 'uber', 'lyft']
  const transportPattern = new RegExp(`(${transportKeywords.join('|')})[\\s:]*\\$?([\\d,]+\\.?\\d*)`, 'gi')
  let transportMatch
  let transportTotal = 0
  while ((transportMatch = transportPattern.exec(text)) !== null) {
    const amount = parseFloat(transportMatch[2].replace(/,/g, ''))
    if (amount > 0 && amount < 10000) { // Reasonable range
      transportTotal += amount
    }
  }
  if (transportTotal > 0) {
    expenses.transportation = transportTotal
  }

  // Payroll deposits (to infer income patterns)
  const payrollKeywords = ['payroll', 'salary', 'direct deposit', 'paycheck', 'wages']
  const payrollPattern = new RegExp(`(${payrollKeywords.join('|')})[\\s:]*\\$?([\\d,]+\\.?\\d*)`, 'gi')
  let payrollMatch
  const payrollDeposits: number[] = []
  while ((payrollMatch = payrollPattern.exec(text)) !== null) {
    const amount = parseFloat(payrollMatch[2].replace(/,/g, ''))
    if (amount > 0) {
      payrollDeposits.push(amount)
    }
  }
  if (payrollDeposits.length > 0) {
    const avgPayroll = payrollDeposits.reduce((a, b) => a + b, 0) / payrollDeposits.length
    data.monthlyIncome = avgPayroll
    // Try to infer frequency from deposit count in statement period
    if (payrollDeposits.length >= 4) {
      data.payFrequency = 'weekly'
    } else if (payrollDeposits.length >= 2) {
      data.payFrequency = 'biweekly'
    } else {
      data.payFrequency = 'monthly'
    }
  }

  // Store expenses if any found
  if (Object.keys(expenses).length > 0) {
    data.expenses = expenses
  }

  return data
}

/**
 * Parse marriage certificate
 * Extracts: Legal names at marriage, marriage date, place, maiden names
 */
function parseMarriageCertificate(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Extract spouse 1 name (groom/bride)
  const spouse1Match = text.match(/(?:GROOM|BRIDE|PARTY\s+1|SPOUSE\s+1)[\s:]*([A-Z][A-Z\s,]+)/i)
  if (spouse1Match) {
    data.spouse1Name = spouse1Match[1].trim()
  }

  // Extract spouse 2 name
  const spouse2Match = text.match(/(?:GROOM|BRIDE|PARTY\s+2|SPOUSE\s+2)[\s:]*([A-Z][A-Z\s,]+)/i)
  if (spouse2Match) {
    data.spouse2Name = spouse2Match[1].trim()
  }

  // Extract legal names at marriage
  if (data.spouse1Name && data.spouse2Name) {
    data.legalNamesAtMarriage = {
      spouse1: data.spouse1Name,
      spouse2: data.spouse2Name,
    }
  }

  // Extract marriage date
  const dateMatch = text.match(/(?:DATE\s+OF\s+MARRIAGE|MARRIAGE\s+DATE|MARRIED)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
  if (dateMatch) {
    data.marriageDate = dateMatch[1].trim()
  }

  // Extract place of marriage (city, county, state)
  const placeMatch = text.match(/(?:PLACE\s+OF\s+MARRIAGE|MARRIED\s+AT|CITY|COUNTY)[\s:]*([A-Z][A-Z\s,]+(?:COUNTY|CITY|STATE)?)/i)
  if (placeMatch) {
    data.marriagePlace = placeMatch[1].trim()
  }

  // Extract maiden name (often mentioned for bride)
  const maidenNameMatch = text.match(/(?:MAIDEN\s+NAME|FORMER\s+NAME)[\s:]*([A-Z][A-Z\s,]+)/i)
  if (maidenNameMatch) {
    data.maidenNames = [maidenNameMatch[1].trim()]
  }

  // Extract certificate number
  const certMatch = text.match(/(?:CERTIFICATE\s+NUMBER|CERT\s+#|LICENSE\s+#)[\s:]*([A-Z0-9]+)/i)
  if (certMatch) {
    data.certificateNumber = certMatch[1].trim()
  }

  return data
}

/**
 * Parse prior court order
 * Extracts: Order type, jurisdiction, constraints, domestic violence indicators
 */
function parsePriorCourtOrder(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Detect order types
  const orderTypes: string[] = []
  if (/(?:CUSTODY|CUSTODIAL)/i.test(text)) {
    orderTypes.push('custody')
  }
  if (/(?:CHILD\s+SUPPORT|SUPPORT\s+ORDER)/i.test(text)) {
    orderTypes.push('support')
  }
  if (/(?:PROTECTIVE\s+ORDER|RESTRAINING\s+ORDER|ORDER\s+OF\s+PROTECTION)/i.test(text)) {
    orderTypes.push('protective')
    data.hasDomesticViolence = true
  }
  if (orderTypes.length > 0) {
    data.orderTypes = orderTypes
    data.hasPriorOrders = true
  }

  // Extract jurisdiction (court name, county, state)
  const courtMatch = text.match(/(?:COURT|JUDICIAL|DISTRICT\s+COURT)[\s:]*([A-Z][A-Z\s,]+(?:COUNTY|COURT)?)/i)
  if (courtMatch) {
    data.courtName = courtMatch[1].trim()
  }

  const countyMatch = text.match(/(?:COUNTY)[\s:]*([A-Z][A-Z\s]+COUNTY)/i)
  if (countyMatch) {
    data.county = countyMatch[1].trim()
  }

  const stateMatch = text.match(/(?:STATE\s+OF|STATE)[\s:]*([A-Z]{2})/i)
  if (stateMatch) {
    data.state = stateMatch[1].trim()
  }

  if (data.courtName || data.county || data.state) {
    data.jurisdictions = []
    if (data.courtName) data.jurisdictions.push(data.courtName)
    if (data.county) data.jurisdictions.push(data.county)
    if (data.state) data.jurisdictions.push(data.state)
  }

  // Extract order date
  const orderDateMatch = text.match(/(?:ORDER\s+DATE|DATE\s+OF\s+ORDER|ISSUED)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
  if (orderDateMatch) {
    data.orderDate = orderDateMatch[1].trim()
  }

  // Extract custody constraints (if custody order)
  if (orderTypes.includes('custody')) {
    const constraints: string[] = []
    if (/(?:SOLE\s+CUSTODY|FULL\s+CUSTODY)/i.test(text)) {
      constraints.push('sole custody')
    }
    if (/(?:JOINT\s+CUSTODY|SHARED\s+CUSTODY)/i.test(text)) {
      constraints.push('joint custody')
    }
    if (/(?:VISITATION|VISITATION\s+RIGHTS)/i.test(text)) {
      constraints.push('visitation rights')
    }
    if (constraints.length > 0) {
      data.custodyConstraints = constraints
    }
  }

  return data
}

/**
 * Parse profit & loss statement
 * Extracts: Business name, revenue, expenses, net income
 */
function parseProfitAndLoss(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Extract business name
  const businessMatch = text.match(/(?:BUSINESS\s+NAME|COMPANY\s+NAME|NAME)[\s:]*([A-Z][A-Z\s,&\.]+)/i)
  if (businessMatch) {
    data.businessName = businessMatch[1].trim()
  }

  // Extract gross revenue/income
  const revenueMatch = text.match(/(?:GROSS\s+REVENUE|TOTAL\s+REVENUE|GROSS\s+INCOME|REVENUE)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (revenueMatch) {
    data.grossRevenue = parseFloat(revenueMatch[1].replace(/,/g, ''))
  }

  // Extract total expenses
  const expensesMatch = text.match(/(?:TOTAL\s+EXPENSES|EXPENSES\s+TOTAL|TOTAL\s+EXP)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (expensesMatch) {
    data.totalExpenses = parseFloat(expensesMatch[1].replace(/,/g, ''))
  }

  // Extract net income
  const netIncomeMatch = text.match(/(?:NET\s+INCOME|NET\s+PROFIT|PROFIT)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (netIncomeMatch) {
    const netIncome = parseFloat(netIncomeMatch[1].replace(/,/g, ''))
    data.netIncome = netIncome
    data.selfEmploymentIncome = netIncome
    data.monthlyIncome = netIncome
    data.annualIncome = netIncome * 12 // Assume monthly if not specified
  }

  // Extract business type
  const businessTypeMatch = text.match(/(?:BUSINESS\s+TYPE|TYPE\s+OF\s+BUSINESS)[\s:]*([A-Z][A-Z\s]+)/i)
  if (businessTypeMatch) {
    data.businessType = businessTypeMatch[1].trim()
  }

  return data
}

/**
 * Parse W-2 or 1099 form
 */
function parseW2Or1099(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Extract wages
  const wagesMatch = text.match(/(?:WAGES|COMPENSATION)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (wagesMatch) {
    const wages = parseFloat(wagesMatch[1].replace(/,/g, ''))
    data.annualIncome = wages
    data.wageIncome = wages
  }

  // Extract employer name
  const employerMatch = text.match(/(?:EMPLOYER'S\s+NAME|EMPLOYER)[\s:]*([A-Z][A-Z\s,&\.]+)/i)
  if (employerMatch) {
    data.employerName = employerMatch[1].trim()
    data.employers = [{ name: employerMatch[1].trim(), income: wages }]
  }

  return data
}

/**
 * Process document: extract text and parse it
 */
export async function processDocument(
  file: File,
  documentType: string,
  onProgress?: (progress: number) => void
): Promise<ProcessedDocument> {
  try {
    console.log('🔍 Starting document processing:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      documentType
    })

    // Extract text
    const ocrResult = await extractTextFromFile(file, (progress) => {
      if (onProgress) {
        onProgress(progress * 0.8) // 80% for OCR
      }
    })

    if (!ocrResult.success) {
      console.error('❌ OCR extraction failed:', ocrResult.error)
      return {
        success: false,
        documentType,
        extractedData: {},
        rawText: '',
        error: ocrResult.error,
      }
    }

    console.log('✅ OCR extraction successful:', {
      textLength: ocrResult.text.length,
      textPreview: ocrResult.text.substring(0, 200) + '...'
    })

    // Parse text
    if (onProgress) {
      onProgress(0.9)
    }

    console.log('📝 Parsing document text for type:', documentType)
    const extractedData = parseDocumentText(ocrResult.text, documentType)
    
    console.log('✅ Parsing complete:', {
      extractedKeys: Object.keys(extractedData),
      extractedKeyCount: Object.keys(extractedData).length,
      hasData: Object.keys(extractedData).length > 1, // More than just rawText
      sampleData: Object.keys(extractedData).slice(0, 5).reduce((acc, key) => {
        if (key !== 'rawText') {
          acc[key] = extractedData[key]
        }
        return acc
      }, {} as Record<string, any>)
    })

    if (onProgress) {
      onProgress(1.0)
    }

    return {
      success: true,
      documentType,
      extractedData,
      rawText: ocrResult.text,
    }
  } catch (error: any) {
    console.error('❌ Document processing error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return {
      success: false,
      documentType,
      extractedData: {},
      rawText: '',
      error: error.message || 'Processing failed',
    }
  }
}

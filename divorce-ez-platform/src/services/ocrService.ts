/**
 * OCR Service - Browser-based document processing using Tesseract.js and PDF.js
 */

import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
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
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(m.progress)
        }
      },
    })

    return {
      success: true,
      text: data.text,
    }
  } catch (error: any) {
    console.error('OCR Error:', error)
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
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    const totalPages = pdf.numPages

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')

      fullText += pageText + '\n'

      if (onProgress) {
        onProgress(i / totalPages)
      }
    }

    // If PDF has no extractable text, fall back to OCR
    if (fullText.trim().length < 10) {
      console.log('PDF has no extractable text, falling back to OCR')
      return await extractTextFromImage(file, onProgress)
    }

    return {
      success: true,
      text: fullText,
    }
  } catch (error: any) {
    console.error('PDF extraction error:', error)
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

  switch (documentType) {
    case 'driversLicense':
      return parseDriversLicense(text)
    case 'taxReturn':
      return parseTaxReturn(text)
    case 'payStub':
      return parsePayStub(text)
    case 'bankStatement':
      return parseBankStatement(text)
    case 'w2':
    case '1099':
      return parseW2Or1099(text)
    default:
      return extractedData
  }
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
 * Parse tax return information
 */
function parseTaxReturn(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Extract AGI
  const agiMatch = text.match(/(?:ADJUSTED\s+GROSS\s+INCOME|AGI)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (agiMatch) {
    data.annualIncome = parseFloat(agiMatch[1].replace(/,/g, ''))
  }

  // Extract total income
  const incomeMatch = text.match(/(?:TOTAL\s+INCOME|INCOME)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (incomeMatch) {
    data.totalIncome = parseFloat(incomeMatch[1].replace(/,/g, ''))
  }

  return data
}

/**
 * Parse pay stub information
 */
function parsePayStub(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Extract gross pay
  const grossMatch = text.match(/(?:GROSS\s+PAY|GROSS)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (grossMatch) {
    const gross = parseFloat(grossMatch[1].replace(/,/g, ''))
    data.monthlyIncome = gross
    data.annualIncome = gross * 12 // Estimate annual from monthly
  }

  return data
}

/**
 * Parse bank statement information
 */
function parseBankStatement(text: string): Record<string, any> {
  const data: Record<string, any> = {}

  // Extract balance
  const balanceMatch = text.match(/(?:BALANCE|CURRENT\s+BALANCE)[\s:$]*\$?([\d,]+\.?\d*)/i)
  if (balanceMatch) {
    data.balance = parseFloat(balanceMatch[1].replace(/,/g, ''))
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
    // Extract text
    const ocrResult = await extractTextFromFile(file, (progress) => {
      if (onProgress) {
        onProgress(progress * 0.8) // 80% for OCR
      }
    })

    if (!ocrResult.success) {
      return {
        success: false,
        documentType,
        extractedData: {},
        rawText: '',
        error: ocrResult.error,
      }
    }

    // Parse text
    if (onProgress) {
      onProgress(0.9)
    }

    const extractedData = parseDocumentText(ocrResult.text, documentType)

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
    console.error('Document processing error:', error)
    return {
      success: false,
      documentType,
      extractedData: {},
      rawText: '',
      error: error.message || 'Processing failed',
    }
  }
}

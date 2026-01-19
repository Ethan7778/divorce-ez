/**
 * Gemini API Service
 * Handles document field extraction using Google Gemini API
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger'
import { getExpectedFields } from './documentSchemas'
import type { PayStubFields, MarriageCertificateFields, BankStatementFields, TaxReturnFields } from './documentSchemas'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash'

let genAI: GoogleGenerativeAI | null = null

/**
 * Initialize Gemini client
 */
function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY environment variable.')
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  }
  return genAI
}

/**
 * Truncate text to fit within token limits
 * Gemini 1.5 Flash has ~1M token context, but we'll limit to 8000 chars for cost
 */
function truncateText(text: string, maxChars: number = 8000): string {
  if (text.length <= maxChars) return text
  return text.substring(0, maxChars) + '\n\n[... text truncated for cost optimization ...]'
}

/**
 * Create extraction prompt for a document type
 */
function createExtractionPrompt(documentType: string, ocrText: string): string {
  const truncatedText = truncateText(ocrText)

  switch (documentType) {
    case 'payStub':
      return `You are extracting structured data from a PAY STUB document.

Extract the following fields from the OCR text below and return ONLY valid JSON (no markdown, no code blocks, just pure JSON):

Required fields:
- employeeFullName: Full legal name of the employee (string or null)
- employerName: Name of the employer company (string or null)
- employerAddress: Full address of employer (string or null)
- payPeriodStart: Start date of pay period in YYYY-MM-DD format (string or null)
- payPeriodEnd: End date of pay period in YYYY-MM-DD format (string or null)
- payFrequency: One of "weekly", "biweekly", "monthly", "yearly" (string or null)
- grossIncomeCurrent: Current period gross income as number (number or null)
- grossIncomeYTD: Year-to-date gross income as number (number or null)
- netIncomeCurrent: Current period net income as number (number or null)
- federalTaxWithheld: Federal tax withheld this period (number or null)
- stateTaxWithheld: State tax withheld this period (number or null)
- socialSecurityTax: Social Security tax withheld (number or null)
- medicareTax: Medicare tax withheld (number or null)
- healthInsuranceDeduction: Health insurance deduction amount (number or null)
- retirementDeduction: Retirement/401k deduction amount (number or null)
- otherDeductionsTotal: Total of other deductions (number or null)

OCR Text:
${truncatedText}

Return JSON in this exact format (use null for missing fields):
{
  "employeeFullName": "John Doe",
  "employerName": "ABC Company",
  "employerAddress": "123 Main St, City, ST 12345",
  "payPeriodStart": "2024-01-01",
  "payPeriodEnd": "2024-01-15",
  "payFrequency": "biweekly",
  "grossIncomeCurrent": 4000.00,
  "grossIncomeYTD": 8000.00,
  "netIncomeCurrent": 2994.00,
  "federalTaxWithheld": 200.00,
  "stateTaxWithheld": 100.00,
  "socialSecurityTax": 248.00,
  "medicareTax": 58.00,
  "healthInsuranceDeduction": 150.00,
  "retirementDeduction": 200.00,
  "otherDeductionsTotal": 50.00
}`

    case 'marriageCertificate':
      return `You are extracting structured data from a MARRIAGE CERTIFICATE or MARRIAGE LICENSE document.

Extract the following fields from the OCR text below and return ONLY valid JSON:

Required fields:
- spouse1FullName: Full legal name of first spouse (string or null)
- spouse2FullName: Full legal name of second spouse (string or null)
- marriageDate: Date of marriage in YYYY-MM-DD format (string or null)
- marriagePlace: Place of marriage (city, county, state) (string or null)
- certificateNumber: Marriage certificate or license number (string or null)
- issuingAuthority: County clerk office or state agency that issued it (string or null)
- officiantName: Name of person who performed the ceremony (string or null)

OCR Text:
${truncatedText}

Return JSON in this exact format (use null for missing fields):
{
  "spouse1FullName": "John Doe",
  "spouse2FullName": "Jane Smith",
  "marriageDate": "2020-06-15",
  "marriagePlace": "Salt Lake City, Salt Lake County, Utah",
  "certificateNumber": "MC-2020-12345",
  "issuingAuthority": "Salt Lake County Clerk",
  "officiantName": "Reverend John Smith"
}`

    case 'bankStatement':
      return `You are extracting structured data from a BANK STATEMENT document.

Extract the following fields from the OCR text below and return ONLY valid JSON:

Required fields:
- accountHolderNames: Full name(s) of account holder(s), comma-separated if multiple (string or null)
- financialInstitutionName: Name of the bank or financial institution (string or null)
- accountType: One of "checking", "savings", "money_market" (string or null)
- accountNumberLast4: Last 4 digits of account number (string or null)
- statementStartDate: Statement period start date in YYYY-MM-DD format (string or null)
- statementEndDate: Statement period end date in YYYY-MM-DD format (string or null)
- beginningBalance: Account balance at start of period (number or null)
- endingBalance: Account balance at end of period (number or null)
- totalDeposits: Total deposits during period (number or null)
- totalWithdrawals: Total withdrawals during period (number or null)

OCR Text:
${truncatedText}

Return JSON in this exact format (use null for missing fields):
{
  "accountHolderNames": "John Doe",
  "financialInstitutionName": "Chase Bank",
  "accountType": "checking",
  "accountNumberLast4": "1234",
  "statementStartDate": "2024-01-01",
  "statementEndDate": "2024-01-31",
  "beginningBalance": 5000.00,
  "endingBalance": 7500.00,
  "totalDeposits": 5000.00,
  "totalWithdrawals": 2500.00
}`

    case 'taxReturn':
      return `You are extracting structured data from a TAX RETURN (Form 1040) document.

Extract the following fields from the OCR text below and return ONLY valid JSON:

Required fields:
- taxYear: Tax year (e.g., 2024) (number or null)
- filingStatus: One of "single", "married_joint", "married_separate", "head_of_household" (string or null)
- taxpayerName: Full name of primary taxpayer (string or null)
- spouseName: Full name of spouse if joint return (string or null)
- adjustedGrossIncome: Adjusted Gross Income (AGI) (number or null)
- totalIncome: Total income before adjustments (number or null)
- wages: Wages, salaries, tips from W-2 forms (number or null)
- interestIncome: Interest income (number or null)
- dividendIncome: Dividend income (number or null)
- businessIncome: Business income or loss from Schedule C (number or null, can be negative)
- totalTax: Total tax owed (number or null)
- refundOrAmountOwed: Refund (positive) or amount owed (negative) (number or null)

OCR Text:
${truncatedText}

Return JSON in this exact format (use null for missing fields):
{
  "taxYear": 2024,
  "filingStatus": "married_joint",
  "taxpayerName": "John Doe",
  "spouseName": "Jane Doe",
  "adjustedGrossIncome": 95000.00,
  "totalIncome": 100000.00,
  "wages": 85000.00,
  "interestIncome": 500.00,
  "dividendIncome": 200.00,
  "businessIncome": 12300.00,
  "totalTax": 12000.00,
  "refundOrAmountOwed": 500.00
}`

    default:
      throw new Error(`Unsupported document type for Gemini extraction: ${documentType}`)
  }
}

/**
 * Parse JSON response from Gemini, handling various formats
 */
function parseGeminiResponse(response: string): Record<string, any> {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '')
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Try to find JSON object in response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleaned = jsonMatch[0]
    }

    return JSON.parse(cleaned)
  } catch (error) {
    logger.error('Failed to parse Gemini JSON response:', error)
    logger.debug('Raw response:', response.substring(0, 500))
    throw new Error('Invalid JSON response from Gemini API')
  }
}

/**
 * Extract document fields using Gemini API
 */
export async function extractWithGemini(
  ocrText: string,
  documentType: string
): Promise<Record<string, any>> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  if (!ocrText || ocrText.trim().length === 0) {
    throw new Error('OCR text is empty')
  }

  try {
    const client = getGeminiClient()
    const model = client.getGenerativeModel({ model: GEMINI_MODEL })

    const prompt = createExtractionPrompt(documentType, ocrText)

    logger.debug('Calling Gemini API', {
      documentType,
      textLength: ocrText.length,
      model: GEMINI_MODEL,
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    if (!text) {
      throw new Error('Empty response from Gemini API')
    }

    const extractedData = parseGeminiResponse(text)

    // Validate that we got some data
    const expectedFields = getExpectedFields(documentType)
    const extractedFields = Object.keys(extractedData).filter(
      (key) => extractedData[key] !== null && extractedData[key] !== undefined
    )

      logger.debug('Gemini extraction complete', {
        documentType,
        extractedFields: extractedFields.length,
        expectedFields: expectedFields.length,
        extractionRate: `${Math.round((extractedFields.length / expectedFields.length) * 100)}%`,
      })

      // Record usage for cost tracking
      recordGeminiUsage(documentType, prompt, text)

      return extractedData
  } catch (error: any) {
    logger.error('Gemini API error:', {
      message: error.message,
      documentType,
    })
    throw error
  }
}

/**
 * Estimate cost for Gemini API call
 * Gemini 1.5 Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
 * Gemini 1.5 Pro: $1.25 per 1M input tokens, $5.00 per 1M output tokens
 */
export function estimateGeminiCost(inputText: string, outputText: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  const inputTokens = Math.ceil(inputText.length / 4)
  const outputTokens = Math.ceil(outputText.length / 4)

  // Pricing based on model
  const isPro = GEMINI_MODEL.includes('pro')
  const inputPricePerM = isPro ? 1.25 : 0.075
  const outputPricePerM = isPro ? 5.00 : 0.30

  const inputCost = (inputTokens / 1_000_000) * inputPricePerM
  const outputCost = (outputTokens / 1_000_000) * outputPricePerM

  return inputCost + outputCost
}

/**
 * Track Gemini API usage (for analytics/cost monitoring)
 */
export interface GeminiUsage {
  documentType: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  timestamp: string
}

let usageHistory: GeminiUsage[] = []

/**
 * Record Gemini API usage
 */
export function recordGeminiUsage(
  documentType: string,
  inputText: string,
  outputText: string
): GeminiUsage {
  const inputTokens = Math.ceil(inputText.length / 4)
  const outputTokens = Math.ceil(outputText.length / 4)
  const estimatedCost = estimateGeminiCost(inputText, outputText)

  const usage: GeminiUsage = {
    documentType,
    inputTokens,
    outputTokens,
    estimatedCost,
    timestamp: new Date().toISOString(),
  }

  usageHistory.push(usage)

  // Keep only last 1000 records in memory
  if (usageHistory.length > 1000) {
    usageHistory = usageHistory.slice(-1000)
  }

  logger.debug('Gemini usage recorded', {
    documentType,
    inputTokens,
    outputTokens,
    estimatedCost: `$${estimatedCost.toFixed(6)}`,
  })

  return usage
}

/**
 * Get usage statistics
 */
export function getGeminiUsageStats(): {
  totalCalls: number
  totalCost: number
  byDocumentType: Record<string, { calls: number; cost: number }>
} {
  const totalCalls = usageHistory.length
  const totalCost = usageHistory.reduce((sum, usage) => sum + usage.estimatedCost, 0)

  const byDocumentType: Record<string, { calls: number; cost: number }> = {}
  for (const usage of usageHistory) {
    if (!byDocumentType[usage.documentType]) {
      byDocumentType[usage.documentType] = { calls: 0, cost: 0 }
    }
    byDocumentType[usage.documentType].calls++
    byDocumentType[usage.documentType].cost += usage.estimatedCost
  }

  return {
    totalCalls,
    totalCost,
    byDocumentType,
  }
}

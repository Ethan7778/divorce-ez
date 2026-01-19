/**
 * Document Field Schemas
 * Defines expected fields for each document type to guide extraction
 */

export interface PayStubFields {
  employeeFullName?: string | null
  employerName?: string | null
  employerAddress?: string | null
  payPeriodStart?: string | null // ISO date string
  payPeriodEnd?: string | null // ISO date string
  payFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null
  grossIncomeCurrent?: number | null
  grossIncomeYTD?: number | null
  netIncomeCurrent?: number | null
  federalTaxWithheld?: number | null
  stateTaxWithheld?: number | null
  socialSecurityTax?: number | null
  medicareTax?: number | null
  healthInsuranceDeduction?: number | null
  retirementDeduction?: number | null
  otherDeductionsTotal?: number | null
}

export interface MarriageCertificateFields {
  spouse1FullName?: string | null
  spouse2FullName?: string | null
  marriageDate?: string | null // ISO date string
  marriagePlace?: string | null // City, county, state
  certificateNumber?: string | null
  issuingAuthority?: string | null // County clerk or state
  officiantName?: string | null
}

export interface BankStatementFields {
  accountHolderNames?: string | null // Can be multiple names
  financialInstitutionName?: string | null
  accountType?: 'checking' | 'savings' | 'money_market' | null
  accountNumberLast4?: string | null
  statementStartDate?: string | null // ISO date string
  statementEndDate?: string | null // ISO date string
  beginningBalance?: number | null
  endingBalance?: number | null
  totalDeposits?: number | null
  totalWithdrawals?: number | null
}

export interface TaxReturnFields {
  taxYear?: number | null
  filingStatus?: 'single' | 'married_joint' | 'married_separate' | 'head_of_household' | null
  taxpayerName?: string | null
  spouseName?: string | null
  adjustedGrossIncome?: number | null // AGI
  totalIncome?: number | null
  wages?: number | null // W-2 total
  interestIncome?: number | null
  dividendIncome?: number | null
  businessIncome?: number | null // Schedule C
  totalTax?: number | null
  refundOrAmountOwed?: number | null // Positive = refund, negative = owed
}

export type DocumentFields = PayStubFields | MarriageCertificateFields | BankStatementFields | TaxReturnFields

/**
 * Get expected fields for a document type
 */
export function getExpectedFields(documentType: string): string[] {
  switch (documentType) {
    case 'payStub':
      return [
        'employeeFullName',
        'employerName',
        'employerAddress',
        'payPeriodStart',
        'payPeriodEnd',
        'payFrequency',
        'grossIncomeCurrent',
        'grossIncomeYTD',
        'netIncomeCurrent',
        'federalTaxWithheld',
        'stateTaxWithheld',
        'socialSecurityTax',
        'medicareTax',
        'healthInsuranceDeduction',
        'retirementDeduction',
        'otherDeductionsTotal',
      ]
    case 'marriageCertificate':
      return [
        'spouse1FullName',
        'spouse2FullName',
        'marriageDate',
        'marriagePlace',
        'certificateNumber',
        'issuingAuthority',
        'officiantName',
      ]
    case 'bankStatement':
      return [
        'accountHolderNames',
        'financialInstitutionName',
        'accountType',
        'accountNumberLast4',
        'statementStartDate',
        'statementEndDate',
        'beginningBalance',
        'endingBalance',
        'totalDeposits',
        'totalWithdrawals',
      ]
    case 'taxReturn':
      return [
        'taxYear',
        'filingStatus',
        'taxpayerName',
        'spouseName',
        'adjustedGrossIncome',
        'totalIncome',
        'wages',
        'interestIncome',
        'dividendIncome',
        'businessIncome',
        'totalTax',
        'refundOrAmountOwed',
      ]
    default:
      return []
  }
}

/**
 * Get critical fields that must be present for a document type
 */
export function getCriticalFields(documentType: string): string[] {
  switch (documentType) {
    case 'payStub':
      return ['employeeFullName', 'employerName', 'grossIncomeCurrent', 'netIncomeCurrent']
    case 'marriageCertificate':
      return ['spouse1FullName', 'spouse2FullName', 'marriageDate', 'marriagePlace']
    case 'bankStatement':
      return ['accountHolderNames', 'financialInstitutionName', 'endingBalance']
    case 'taxReturn':
      return ['taxYear', 'taxpayerName', 'adjustedGrossIncome', 'totalIncome']
    default:
      return []
  }
}

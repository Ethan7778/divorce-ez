export type DocumentType = 'driversLicense' | 'taxReturn' | 'payStub' | 'bankStatement' | 'w2' | '1099' | 'marriageCertificate' | 'priorCourtOrder' | 'profitAndLoss'

export interface Document {
  id: string
  user_id: string
  file_name: string
  file_path: string | null
  document_type: DocumentType
  uploaded_at: string
  status: 'uploaded' | 'processing' | 'processed' | 'failed'
  extracted_data_id: string | null
}

export interface PersonalInfo {
  firstName?: string
  lastName?: string
  middleName?: string
  dateOfBirth?: string
  phone?: string
  email?: string
  driverLicenseNumber?: string
  driverLicenseState?: string
  ssn?: string
  ssnLast4?: string // Store only last 4 digits
  spouseName?: string
  dependents?: Array<{
    name: string
    dateOfBirth: string
    relationship?: string
  }>
  maidenName?: string
  marriageDate?: string
  marriagePlace?: string
  filingStatus?: 'single' | 'married_joint' | 'married_separate' | 'head_of_household'
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
  }
}

export interface FinancialInfo {
  income?: {
    monthly?: number
    annual?: number
    wage?: number
    selfEmployment?: number
    investment?: number
    rental?: number
    sources?: string[]
    payFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  }
  employers?: Array<{
    name: string
    income?: number
    incomeType?: string
  }>
  expenses?: {
    housing?: number // rent/mortgage
    utilities?: number
    childcare?: number
    debt?: number
    transportation?: number
  }
  insurance?: {
    health?: number
    premiums?: number
  }
  payrollDeductions?: number
  overtime?: number
  bonuses?: number
  assets?: Array<{
    type: string
    value: number
  }>
  debts?: Array<{
    type: string
    amount: number
  }>
  bankAccounts?: Array<{
    bankName?: string
    accountNumber?: string
    balance?: number
  }>
}

export interface UserProgress {
  id: string
  user_id: string
  module_name: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percentage: number
  last_updated: string
  overall_progress?: number
}

export interface MarriageInfo {
  legalNamesAtMarriage?: {
    spouse1?: string
    spouse2?: string
  }
  marriageDate?: string
  marriagePlace?: string
  maidenNames?: string[]
}

export interface CourtInfo {
  hasPriorOrders?: boolean
  orderTypes?: string[] // 'custody', 'support', 'protective'
  jurisdictions?: string[]
  custodyConstraints?: string[]
  hasDomesticViolence?: boolean
}

export interface FormData {
  id: string
  user_id: string
  personal_info?: PersonalInfo
  financial_info?: FinancialInfo
  marriage_info?: MarriageInfo
  court_info?: CourtInfo
  last_updated: string
}

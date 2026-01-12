export type DocumentType = 'driversLicense' | 'taxReturn' | 'payStub' | 'bankStatement' | 'w2' | '1099'

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
    sources?: string[]
  }
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

export interface FormData {
  id: string
  user_id: string
  personal_info?: PersonalInfo
  financial_info?: FinancialInfo
  last_updated: string
}

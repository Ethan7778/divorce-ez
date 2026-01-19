export type DocumentType = 'driversLicense' | 'taxReturn' | 'payStub' | 'bankStatement' | 'w2' | '1099' | 'marriageCertificate' | 'priorCourtOrder' | 'profitAndLoss'

// Gemini extraction result types (matching documentSchemas.ts)
export interface PayStubExtraction {
  employeeFullName?: string | null
  employerName?: string | null
  employerAddress?: string | null
  payPeriodStart?: string | null
  payPeriodEnd?: string | null
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

export interface MarriageCertificateExtraction {
  spouse1FullName?: string | null
  spouse2FullName?: string | null
  marriageDate?: string | null
  marriagePlace?: string | null
  certificateNumber?: string | null
  issuingAuthority?: string | null
  officiantName?: string | null
}

export interface BankStatementExtraction {
  accountHolderNames?: string | null
  financialInstitutionName?: string | null
  accountType?: 'checking' | 'savings' | 'money_market' | null
  accountNumberLast4?: string | null
  statementStartDate?: string | null
  statementEndDate?: string | null
  beginningBalance?: number | null
  endingBalance?: number | null
  totalDeposits?: number | null
  totalWithdrawals?: number | null
}

export interface TaxReturnExtraction {
  taxYear?: number | null
  filingStatus?: 'single' | 'married_joint' | 'married_separate' | 'head_of_household' | null
  taxpayerName?: string | null
  spouseName?: string | null
  adjustedGrossIncome?: number | null
  totalIncome?: number | null
  wages?: number | null
  interestIncome?: number | null
  dividendIncome?: number | null
  businessIncome?: number | null
  totalTax?: number | null
  refundOrAmountOwed?: number | null
}

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

// ============================================================================
// Normalized Database Types (V4)
// ============================================================================

export interface PersonalInfoRow {
  id: string
  user_id: string
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  date_of_birth: string | null // DATE as ISO string
  ssn_last_4: string | null
  driver_license_number: string | null
  driver_license_state: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip_code: string | null
  email: string | null
  phone: string | null
  utah_residency_years: number | null
  filing_status: 'single' | 'married_joint' | 'married_separate' | 'head_of_household' | null
  last_updated: string
}

export interface SpouseInfoRow {
  id: string
  user_id: string
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  date_of_birth: string | null
  ssn_last_4: string | null
  driver_license_number: string | null
  driver_license_state: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip_code: string | null
  email: string | null
  phone: string | null
  last_updated: string
}

export interface ChildRow {
  id: string
  user_id: string
  full_name: string
  date_of_birth: string | null
  primary_residence_parent: string | null // 'spouse1' or 'spouse2'
  legal_custody_type: string | null // 'sole' or 'joint'
  physical_custody_type: string | null // 'sole' or 'joint'
  overnights_with_spouse1: number | null
  overnights_with_spouse2: number | null
  last_updated: string
}

export interface IncomeRow {
  id: string
  user_id: string
  spouse_number: 1 | 2
  gross_monthly_income: number | null
  gross_annual_income: number | null
  wage_income: number | null
  self_employment_income: number | null
  investment_income: number | null
  rental_income: number | null
  total_income: number | null
  adjusted_gross_income: number | null
  income_type: string | null // 'employment', 'self_employed', 'benefits', 'mixed'
  pay_frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null
  overtime: number | null
  bonuses: number | null
  last_updated: string
}

export interface EmployerRow {
  id: string
  user_id: string
  spouse_number: 1 | 2
  employer_name: string
  income_amount: number | null
  income_type: string | null
  last_updated: string
}

export interface ExpenseRow {
  id: string
  user_id: string
  spouse_number: 1 | 2
  monthly_housing_cost: number | null
  monthly_childcare_cost: number | null
  monthly_utilities: number | null
  monthly_debt_payments: number | null
  monthly_transportation: number | null
  monthly_health_insurance: number | null
  monthly_insurance_premiums: number | null
  monthly_payroll_deductions: number | null
  last_updated: string
}

export interface AssetRow {
  id: string
  user_id: string
  asset_type: string // 'bank_account', 'vehicle', 'home', 'retirement', 'investment', 'other'
  asset_name: string | null
  approximate_value: number | null
  ownership_type: string | null // 'joint' or 'separate'
  bank_name: string | null
  account_number: string | null
  last_updated: string
}

export interface DebtRow {
  id: string
  user_id: string
  debt_type: string // 'credit_card', 'mortgage', 'loan', 'student_loan', 'other'
  creditor_name: string | null
  approximate_balance: number | null
  monthly_payment: number | null
  last_updated: string
}

export interface MarriageInfoRow {
  id: string
  user_id: string
  marriage_date: string | null // DATE as ISO string
  marriage_place: string | null
  date_of_separation: string | null // DATE as ISO string
  spouse1_name_at_marriage: string | null
  spouse2_name_at_marriage: string | null
  maiden_names: string[] | null
  last_updated: string
}

export interface CourtInfoRow {
  id: string
  user_id: string
  case_type: string // Default 'divorce'
  county: string | null
  judicial_district: string | null
  is_contested: boolean | null
  has_minor_children: boolean | null
  requesting_child_support: boolean | null
  requesting_alimony: boolean | null
  has_prior_orders: boolean | null
  order_types: string[] | null // ['custody', 'support', 'protective']
  jurisdictions: string[] | null
  custody_constraints: string[] | null
  has_domestic_violence: boolean | null
  last_updated: string
}

// Aggregated normalized form data (for extension compatibility)
export interface NormalizedFormData {
  personal_info: PersonalInfoRow | null
  spouse_info: SpouseInfoRow | null
  children: ChildRow[]
  income: IncomeRow[] // Array with up to 2 items (spouse 1 and spouse 2)
  employers: EmployerRow[]
  expenses: ExpenseRow[] // Array with up to 2 items (spouse 1 and spouse 2)
  assets: AssetRow[]
  debts: DebtRow[]
  marriage_info: MarriageInfoRow | null
  court_info: CourtInfoRow | null
}

/**
 * API Service - Handles communication with web platform
 */

/**
 * API Service - Handles communication with web platform
 * 
 * CONFIGURATION REQUIRED:
 * Set PLATFORM_URL to one of:
 * 1. Supabase Edge Function URL: https://[project-ref].supabase.co/functions/v1/api
 * 2. Your Vercel/deployed site URL: https://your-app.vercel.app (if proxying API calls)
 */

// Note: We query Supabase directly, so PLATFORM_URL is not needed for data fetching
// It's only used for getUserProgress() which we can implement later if needed
let PLATFORM_URL = null; // Not used - we query Supabase directly

class ApiService {
  constructor() {
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiry = null
  }

  /**
   * Initialize API service - load tokens from storage
   */
  async init() {
    const result = await chrome.storage.local.get(['accessToken', 'refreshToken', 'expiresAt'])
    this.accessToken = result.accessToken || null
    this.refreshToken = result.refreshToken || null
    this.tokenExpiry = result.expiresAt || null

    // Refresh token if expired
    if (this.tokenExpiry && Date.now() >= this.tokenExpiry) {
      try {
        await this.refreshAccessToken()
      } catch (error) {
        console.warn('Token refresh failed during init:', error)
        // Don't throw - allow user to re-authenticate
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      // Use Supabase auth endpoint directly
      const supabaseUrl = 'https://jjqyweuffxyorqumuyyu.supabase.co'
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': await this.getSupabaseAnonKey(),
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken,
        }),
      })

      const data = await response.json()

      if (response.ok && data.access_token) {
        this.accessToken = data.access_token
        this.refreshToken = data.refresh_token || this.refreshToken
        this.tokenExpiry = Date.now() + (data.expires_in * 1000)

        await chrome.storage.local.set({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          expiresAt: this.tokenExpiry,
        })

        return true
      } else {
        // Refresh failed - user needs to log in again
        await this.clearAuth()
        throw new Error('Token refresh failed')
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      await this.clearAuth()
      throw error
    }
  }

  /**
   * Get authorization headers
   */
  async getAuthHeaders() {
    await this.init()

    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    // Check if token needs refresh
    if (this.tokenExpiry && Date.now() >= this.tokenExpiry - 60000) {
      // Refresh 1 minute before expiry
      await this.refreshAccessToken()
    }

    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Get user's form data from platform
   * Queries normalized tables and aggregates into backward-compatible format
   */
  async getUserFormData() {
    try {
      await this.init()
      if (!this.accessToken) {
        throw new Error('Not authenticated')
      }

      // Query Supabase directly using REST API
      const supabaseUrl = 'https://jjqyweuffxyorqumuyyu.supabase.co'
      const supabaseKey = await this.getSupabaseAnonKey()
      
      // Get user ID from token (decode JWT)
      const user = await this.getCurrentUser()
      if (!user) {
        throw new Error('Could not get user ID')
      }

      const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }

      // Query all normalized tables in parallel
      const [
        personalInfoRes,
        spouseInfoRes,
        childrenRes,
        incomeRes,
        employersRes,
        expensesRes,
        assetsRes,
        debtsRes,
        marriageInfoRes,
        courtInfoRes
      ] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/personal_info?user_id=eq.${user.id}&select=*`, { method: 'GET', headers }),
        fetch(`${supabaseUrl}/rest/v1/spouse_info?user_id=eq.${user.id}&select=*`, { method: 'GET', headers }),
        fetch(`${supabaseUrl}/rest/v1/children?user_id=eq.${user.id}&select=*`, { method: 'GET', headers }),
        fetch(`${supabaseUrl}/rest/v1/income?user_id=eq.${user.id}&select=*&order=spouse_number`, { method: 'GET', headers }),
        fetch(`${supabaseUrl}/rest/v1/employers?user_id=eq.${user.id}&select=*`, { method: 'GET', headers }),
        fetch(`${supabaseUrl}/rest/v1/expenses?user_id=eq.${user.id}&select=*&order=spouse_number`, { method: 'GET', headers }),
        fetch(`${supabaseUrl}/rest/v1/assets?user_id=eq.${user.id}&select=*`, { method: 'GET', headers }),
        fetch(`${supabaseUrl}/rest/v1/debts?user_id=eq.${user.id}&select=*`, { method: 'GET', headers }),
        fetch(`${supabaseUrl}/rest/v1/marriage_info?user_id=eq.${user.id}&select=*`, { method: 'GET', headers }),
        fetch(`${supabaseUrl}/rest/v1/court_info?user_id=eq.${user.id}&select=*`, { method: 'GET', headers })
      ])

      // Parse responses
      const personalInfo = personalInfoRes.ok ? (await personalInfoRes.json())[0] : null
      const spouseInfo = spouseInfoRes.ok ? (await spouseInfoRes.json())[0] : null
      const children = childrenRes.ok ? await childrenRes.json() : []
      const income = incomeRes.ok ? await incomeRes.json() : []
      const employers = employersRes.ok ? await employersRes.json() : []
      const expenses = expensesRes.ok ? await expensesRes.json() : []
      const assets = assetsRes.ok ? await assetsRes.json() : []
      const debts = debtsRes.ok ? await debtsRes.json() : []
      const marriageInfo = marriageInfoRes.ok ? (await marriageInfoRes.json())[0] : null
      const courtInfo = courtInfoRes.ok ? (await courtInfoRes.json())[0] : null

      // Get income for spouse 1 (primary)
      const spouse1Income = income.find(i => i.spouse_number === 1) || {}
      const spouse1Expenses = expenses.find(e => e.spouse_number === 1) || {}

      // Aggregate into backward-compatible format
      const formData = {
        personal_info: personalInfo ? {
          firstName: personalInfo.first_name,
          lastName: personalInfo.last_name,
          middleName: personalInfo.middle_name,
          dateOfBirth: personalInfo.date_of_birth,
          ssnLast4: personalInfo.ssn_last_4,
          driverLicenseNumber: personalInfo.driver_license_number,
          driverLicenseState: personalInfo.driver_license_state,
          address: {
            street: personalInfo.address_street,
            city: personalInfo.address_city,
            state: personalInfo.address_state,
            zipCode: personalInfo.address_zip_code
          },
          email: personalInfo.email,
          phone: personalInfo.phone,
          filingStatus: personalInfo.filing_status,
          spouseName: spouseInfo ? `${spouseInfo.first_name || ''} ${spouseInfo.last_name || ''}`.trim() : null,
          dependents: children.map(c => ({
            name: c.full_name,
            dateOfBirth: c.date_of_birth
          }))
        } : {},
        financial_info: {
          income: {
            monthly: spouse1Income.gross_monthly_income,
            annual: spouse1Income.gross_annual_income,
            wage: spouse1Income.wage_income,
            selfEmployment: spouse1Income.self_employment_income,
            investment: spouse1Income.investment_income,
            rental: spouse1Income.rental_income,
            totalIncome: spouse1Income.total_income,
            adjustedGrossIncome: spouse1Income.adjusted_gross_income,
            payFrequency: spouse1Income.pay_frequency,
            sources: []
          },
          employers: employers.filter(e => e.spouse_number === 1).map(e => ({
            name: e.employer_name,
            income: e.income_amount,
            incomeType: e.income_type
          })),
          expenses: {
            housing: spouse1Expenses.monthly_housing_cost,
            utilities: spouse1Expenses.monthly_utilities,
            childcare: spouse1Expenses.monthly_childcare_cost,
            debt: spouse1Expenses.monthly_debt_payments,
            transportation: spouse1Expenses.monthly_transportation
          },
          insurance: {
            health: spouse1Expenses.monthly_health_insurance,
            premiums: spouse1Expenses.monthly_insurance_premiums
          },
          payrollDeductions: spouse1Expenses.monthly_payroll_deductions,
          overtime: spouse1Income.overtime,
          bonuses: spouse1Income.bonuses,
          assets: assets.map(a => ({
            type: a.asset_type,
            value: a.approximate_value
          })),
          debts: debts.map(d => ({
            type: d.debt_type,
            amount: d.approximate_balance
          })),
          bankAccounts: assets.filter(a => a.asset_type === 'bank_account').map(a => ({
            bankName: a.bank_name,
            accountNumber: a.account_number,
            balance: a.approximate_value
          }))
        },
        marriage_info: marriageInfo ? {
          marriageDate: marriageInfo.marriage_date,
          marriagePlace: marriageInfo.marriage_place,
          legalNamesAtMarriage: {
            spouse1: marriageInfo.spouse1_name_at_marriage,
            spouse2: marriageInfo.spouse2_name_at_marriage
          },
          maidenNames: marriageInfo.maiden_names || []
        } : {},
        court_info: courtInfo ? {
          hasPriorOrders: courtInfo.has_prior_orders,
          orderTypes: courtInfo.order_types || [],
          jurisdictions: courtInfo.jurisdictions || [],
          custodyConstraints: courtInfo.custody_constraints || [],
          hasDomesticViolence: courtInfo.has_domestic_violence
        } : {}
      }

      // Log data structure for debugging
      console.log('📊 Fetched normalized data structure:', {
        hasPersonalInfo: !!formData.personal_info && Object.keys(formData.personal_info).length > 0,
        hasFinancialInfo: !!formData.financial_info && Object.keys(formData.financial_info).length > 0,
        hasMarriageInfo: !!formData.marriage_info && Object.keys(formData.marriage_info).length > 0,
        hasCourtInfo: !!formData.court_info && Object.keys(formData.court_info).length > 0,
        personalInfoKeys: Object.keys(formData.personal_info),
        financialInfoKeys: Object.keys(formData.financial_info),
        hasIncome: !!formData.financial_info.income,
        incomeKeys: formData.financial_info.income ? Object.keys(formData.financial_info.income) : []
      })
      
      return formData
    } catch (error) {
      console.error('Error fetching user data:', error)
      throw error
    }
  }

  /**
   * Get current user from token
   */
  async getCurrentUser() {
    try {
      // Decode JWT to get user ID
      const tokenParts = this.accessToken.split('.')
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format')
      }
      const payload = JSON.parse(atob(tokenParts[1]))
      return { id: payload.sub, email: payload.email }
    } catch (error) {
      console.error('Error decoding token:', error)
      return null
    }
  }

  /**
   * Get user's progress
   * Query Supabase directly instead of using Edge Function
   */
  async getUserProgress() {
    try {
      await this.init()
      if (!this.accessToken) {
        throw new Error('Not authenticated')
      }

      const supabaseUrl = 'https://jjqyweuffxyorqumuyyu.supabase.co'
      const supabaseKey = await this.getSupabaseAnonKey()
      const user = await this.getCurrentUser()
      
      if (!user) {
        throw new Error('Could not get user ID')
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_progress?user_id=eq.${user.id}&select=*`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch progress')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching progress:', error)
      throw error
    }
  }

  /**
   * Check if user is authenticated
   * Just checks if tokens exist and are valid - doesn't make network calls
   */
  async isAuthenticated() {
    await this.init()
    if (!this.accessToken || !this.refreshToken) {
      return false
    }
    // Check if token is expired
    if (this.tokenExpiry && Date.now() >= this.tokenExpiry) {
      // Token expired, but we have refresh token, so still "authenticated"
      // Will refresh on next API call
      return true
    }
    // Token exists and not expired
    return true
  }

  /**
   * Clear authentication
   */
  async clearAuth() {
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiry = null
    await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt', 'user'])
  }

  /**
   * Get Supabase anon key (should be configured)
   */
  async getSupabaseAnonKey() {
    const result = await chrome.storage.local.get(['supabaseAnonKey'])
    // Default key for your project (should be stored securely in production)
    return result.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXl3ZXVmZnh5b3JxdW11eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzM2MTAsImV4cCI6MjA4MzgwOTYxMH0.7U8Gyl2y6xdlESnkMeBql0BUr3tS5lSVBky27CyFx84'
  }
}

// Export singleton instance - make it globally available for service worker
const apiService = new ApiService()
// Make it globally available for importScripts
if (typeof self !== 'undefined') {
  self.apiService = apiService
}
// Also support CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiService
}

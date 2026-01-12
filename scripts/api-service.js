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
   * For now, we'll query Supabase directly since Edge Function doesn't exist yet
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

      // First, try to get from form_data table
      const formDataResponse = await fetch(
        `${supabaseUrl}/rest/v1/form_data?user_id=eq.${user.id}&select=*`,
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

      if (formDataResponse.ok) {
        const formDataArray = await formDataResponse.json()
        if (formDataArray && formDataArray.length > 0) {
          return {
            personal_info: formDataArray[0].personal_info || {},
            financial_info: formDataArray[0].financial_info || {}
          }
        }
      }

      // If no form_data, aggregate from extracted_data via documents
      // First get documents
      const documentsResponse = await fetch(
        `${supabaseUrl}/rest/v1/documents?user_id=eq.${user.id}&select=id`,
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

      if (documentsResponse.ok) {
        const documents = await documentsResponse.json()
        const personalInfo = {}
        const financialInfo = {}

        // Get extracted data for each document
        for (const doc of documents) {
          const extractedDataResponse = await fetch(
            `${supabaseUrl}/rest/v1/extracted_data?document_id=eq.${doc.id}&select=data`,
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
          
          if (extractedDataResponse.ok) {
            const extractedDataArray = await extractedDataResponse.json()
            if (extractedDataArray && extractedDataArray.length > 0) {
              const extracted = extractedDataArray[0].data
              
              // Helper function to get value with fallback options
              const getValue = (obj, ...keys) => {
                for (const key of keys) {
                  if (obj[key] != null && obj[key] !== '') return obj[key]
                }
                return null
              }
              
              // Merge personal info - handle field name variations
              if (!personalInfo.firstName) personalInfo.firstName = getValue(extracted, 'firstName', 'first_name', 'fname')
              if (!personalInfo.lastName) personalInfo.lastName = getValue(extracted, 'lastName', 'last_name', 'lname')
              if (!personalInfo.fullName) personalInfo.fullName = getValue(extracted, 'fullName', 'full_name', 'name')
              if (!personalInfo.dateOfBirth) personalInfo.dateOfBirth = getValue(extracted, 'dateOfBirth', 'dob', 'birthDate', 'birth_date')
              if (!personalInfo.ssn) personalInfo.ssn = getValue(extracted, 'ssn', 'socialSecurity', 'social_security')
              if (!personalInfo.licenseNumber) personalInfo.licenseNumber = getValue(extracted, 'licenseNumber', 'license_number', 'driverLicenseNumber', 'driver_license_number', 'dlNumber', 'dl_number')
              
              // Handle address - can be string or object
              if (!personalInfo.address) {
                const addressStr = getValue(extracted, 'address', 'street', 'streetAddress', 'street_address')
                const addressObj = extracted.address
                if (addressStr && typeof addressStr === 'string') {
                  personalInfo.address = addressStr
                } else if (addressObj && typeof addressObj === 'object') {
                  personalInfo.address = addressObj.street || addressObj.address || ''
                }
              }
              if (!personalInfo.city) personalInfo.city = getValue(extracted, 'city')
              if (!personalInfo.state) personalInfo.state = getValue(extracted, 'state')
              if (!personalInfo.zipCode) personalInfo.zipCode = getValue(extracted, 'zipCode', 'zip', 'zip_code', 'postalCode', 'postal_code')
              
              // Merge financial info - handle field name variations
              if (!financialInfo.totalIncome) financialInfo.totalIncome = getValue(extracted, 'totalIncome', 'total_income', 'income', 'annualIncome', 'annual_income')
              if (!financialInfo.grossPay) financialInfo.grossPay = getValue(extracted, 'grossPay', 'gross_pay', 'gross', 'grossIncome', 'gross_income')
              if (!financialInfo.netPay) financialInfo.netPay = getValue(extracted, 'netPay', 'net_pay', 'net', 'netIncome', 'net_income')
              if (!financialInfo.employerName) financialInfo.employerName = getValue(extracted, 'employerName', 'employer_name', 'employer', 'company', 'companyName', 'company_name')
              if (!financialInfo.filingStatus) financialInfo.filingStatus = getValue(extracted, 'filingStatus', 'filing_status', 'status')
              if (!financialInfo.dependents) financialInfo.dependents = getValue(extracted, 'dependents', 'dependents_count', 'numDependents')
              if (!financialInfo.bankName) financialInfo.bankName = getValue(extracted, 'bankName', 'bank_name', 'bank', 'financialInstitution', 'financial_institution')
              if (!financialInfo.accountNumber) financialInfo.accountNumber = getValue(extracted, 'accountNumber', 'account_number', 'acctNumber', 'acct_number')
              if (!financialInfo.balance) financialInfo.balance = getValue(extracted, 'balance', 'accountBalance', 'account_balance', 'currentBalance', 'current_balance')
              if (!financialInfo.wages) financialInfo.wages = getValue(extracted, 'wages', 'wage', 'compensation', 'salary')
              if (!financialInfo.adjustedGrossIncome) financialInfo.adjustedGrossIncome = getValue(extracted, 'adjustedGrossIncome', 'adjusted_gross_income', 'agi', 'AGI')
            }
          }
        }

        return {
          personal_info: personalInfo,
          financial_info: financialInfo
        }
      }

      // Return empty if nothing found
      return {
        personal_info: {},
        financial_info: {}
      }
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

// Export singleton instance
const apiService = new ApiService()
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiService
}

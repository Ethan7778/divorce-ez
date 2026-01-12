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

// Get platform URL from storage or use default
// For now, we'll use Supabase Edge Function URL directly
// TODO: Create Edge Function or use Vercel API routes
let PLATFORM_URL = 'https://jjqyweuffxyorqumuyyu.supabase.co/functions/v1/api'; // Supabase Edge Function URL

// Load platform URL from storage (users can configure in options)
chrome.storage.local.get(['platformUrl'], (result) => {
  if (result.platformUrl) {
    PLATFORM_URL = result.platformUrl;
  }
});

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
    this.accessToken = result.accessToken
    this.refreshToken = result.refreshToken
    this.tokenExpiry = result.expiresAt

    // Refresh token if expired
    if (this.tokenExpiry && Date.now() >= this.tokenExpiry) {
      await this.refreshAccessToken()
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
              // Merge personal info
              Object.assign(personalInfo, {
                firstName: extracted.firstName || personalInfo.firstName,
                lastName: extracted.lastName || personalInfo.lastName,
                fullName: extracted.fullName || personalInfo.fullName,
                dateOfBirth: extracted.dateOfBirth || personalInfo.dateOfBirth,
                address: extracted.address || personalInfo.address,
                city: extracted.city || personalInfo.city,
                state: extracted.state || personalInfo.state,
                zipCode: extracted.zipCode || personalInfo.zipCode,
                ssn: extracted.ssn || personalInfo.ssn,
                licenseNumber: extracted.licenseNumber || personalInfo.licenseNumber,
              })
              // Merge financial info
              Object.assign(financialInfo, {
                totalIncome: extracted.totalIncome || financialInfo.totalIncome,
                grossPay: extracted.grossPay || financialInfo.grossPay,
                netPay: extracted.netPay || financialInfo.netPay,
                employerName: extracted.employerName || financialInfo.employerName,
                filingStatus: extracted.filingStatus || financialInfo.filingStatus,
                dependents: extracted.dependents || financialInfo.dependents,
                bankName: extracted.bankName || financialInfo.bankName,
                accountNumber: extracted.accountNumber || financialInfo.accountNumber,
                balance: extracted.balance || financialInfo.balance,
                wages: extracted.wages || financialInfo.wages,
                adjustedGrossIncome: extracted.adjustedGrossIncome || financialInfo.adjustedGrossIncome,
              })
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
   */
  async getUserProgress() {
    try {
      const headers = await this.getAuthHeaders()
      const apiPath = PLATFORM_URL.includes('/functions/v1') 
        ? '/user/progress' 
        : '/api/user/progress'
      const response = await fetch(`${PLATFORM_URL}${apiPath}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch progress')
      }

      const data = await response.json()
      return data.data
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

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
      const response = await fetch(`${PLATFORM_URL}/auth/v1/token?grant_type=refresh_token`, {
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
   */
  async getUserFormData() {
    try {
      const headers = await this.getAuthHeaders()
      // If PLATFORM_URL is Supabase Edge Function, path is already included
      // If PLATFORM_URL is Vercel, need /api/user/data
      const apiPath = PLATFORM_URL.includes('/functions/v1') 
        ? '/user/data' 
        : '/api/user/data'
      const response = await fetch(`${PLATFORM_URL}${apiPath}`, {
        method: 'GET',
        headers,
      })

      if (response.status === 401) {
        // Token expired, try refresh
        await this.refreshAccessToken()
        const newHeaders = await this.getAuthHeaders()
        const retryResponse = await fetch(`${PLATFORM_URL}${apiPath}`, {
          method: 'GET',
          headers: newHeaders,
        })

        if (!retryResponse.ok) {
          throw new Error('Failed to fetch user data')
        }

        const data = await retryResponse.json()
        return data.data
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Error fetching user data:', error)
      throw error
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
   */
  async isAuthenticated() {
    await this.init()
    return !!this.accessToken && this.tokenExpiry > Date.now()
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
    return result.supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY'
  }
}

// Export singleton instance
const apiService = new ApiService()
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiService
}

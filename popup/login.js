/**
 * Login Script - Handles OAuth authentication with web platform
 * 
 * CONFIGURATION REQUIRED:
 * SUPABASE_URL: Your Supabase project URL (e.g., https://[project-ref].supabase.co)
 * PLATFORM_URL: Your deployed site URL (e.g., https://your-app.vercel.app) - used for signup link
 */

// ⚠️ UPDATE THESE URLs:
const SUPABASE_URL = 'https://jjqyweuffxyorqumuyyu.supabase.co' // Your Supabase project URL
const PLATFORM_URL = 'https://divorce-huw6ts83v-ethans-projects-a966bcc9.vercel.app/' // Your deployed site URL (for signup link)

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm')
  const loginButton = document.getElementById('loginButton')
  const emailInput = document.getElementById('email')
  const passwordInput = document.getElementById('password')
  const statusMessage = document.getElementById('statusMessage')
  const loginStatus = document.getElementById('loginStatus')
  const signupLink = document.getElementById('signupLink')

  // Check if already logged in
  checkAuthStatus()

  signupLink.addEventListener('click', (e) => {
    e.preventDefault()
    chrome.tabs.create({ url: `${PLATFORM_URL}/signup` })
  })

  loginButton.addEventListener('click', async () => {
    const email = emailInput.value
    const password = passwordInput.value

    if (!email || !password) {
      showStatus('Please enter both email and password', 'error')
      return
    }

    loginButton.disabled = true
    loginButton.textContent = 'Signing in...'

    try {
      // Get Supabase URL and key from storage or use defaults
      const config = await chrome.storage.local.get(['supabaseUrl', 'supabaseAnonKey']);
      const supabaseUrl = config.supabaseUrl || SUPABASE_URL;
      const supabaseKey = config.supabaseAnonKey || await getSupabaseAnonKey();

      // Call Supabase auth API directly
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok && data.access_token) {
        // Store tokens
        await chrome.storage.local.set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
          expiresAt: Date.now() + (data.expires_in * 1000),
        })

        showStatus('Successfully connected!', 'success')
        setTimeout(() => {
          window.close()
          chrome.runtime.sendMessage({ action: 'authSuccess' })
        }, 1500)
      } else {
        showStatus(data.error_description || 'Login failed', 'error')
        loginButton.disabled = false
        loginButton.textContent = 'Sign In'
      }
    } catch (error) {
      console.error('Login error:', error)
      showStatus('Connection error. Please try again.', 'error')
      loginButton.disabled = false
      loginButton.textContent = 'Sign In'
    }
  })

  async function checkAuthStatus() {
    const result = await chrome.storage.local.get(['accessToken', 'expiresAt'])
    if (result.accessToken && result.expiresAt > Date.now()) {
      // Already logged in
      showStatus('Already connected!', 'success')
      setTimeout(() => {
        window.close()
      }, 1000)
    }
  }

  function showStatus(message, type) {
    statusMessage.textContent = message
    statusMessage.className = `status-message ${type}`
    loginStatus.style.display = 'block'
    loginForm.style.display = 'none'
  }

  async function getSupabaseAnonKey() {
    // In production, this should be stored securely or retrieved from your platform
    // For now, return a placeholder - you'll need to configure this
    const result = await chrome.storage.local.get(['supabaseAnonKey'])
    return result.supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY'
  }
}

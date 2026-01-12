/**
 * Login Script - Handles OAuth authentication with web platform
 * 
 * CONFIGURATION REQUIRED:
 * SUPABASE_URL: Your Supabase project URL (e.g., https://[project-ref].supabase.co)
 * PLATFORM_URL: Your deployed site URL (e.g., https://your-app.vercel.app) - used for signup link
 */

// ⚠️ UPDATE THESE URLs:
const SUPABASE_URL = 'https://jjqyweuffxyorqumuyyu.supabase.co' // Your Supabase project URL
const PLATFORM_URL = 'https://divorce-huw6ts83v-ethans-projects-a966bcc9.vercel.app' // Your deployed site URL (for signup link)

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm')
  const loginButton = document.getElementById('loginButton')
  const googleLoginButton = document.getElementById('googleLoginButton')
  const emailInput = document.getElementById('email')
  const passwordInput = document.getElementById('password')
  const statusMessage = document.getElementById('statusMessage')
  const loginStatus = document.getElementById('loginStatus')
  const signupLink = document.getElementById('signupLink')

  // Debug: Check if OAuth button exists
  if (!googleLoginButton) {
    console.error('Google login button not found!')
  } else {
    console.log('Google login button found:', googleLoginButton)
    // Ensure button is visible
    googleLoginButton.style.display = 'flex'
    googleLoginButton.style.visibility = 'visible'
    googleLoginButton.style.opacity = '1'
  }

  // Ensure login form is visible
  if (loginForm) {
    loginForm.style.display = 'flex'
    loginForm.style.flexDirection = 'column'
  }

  // Check if already logged in
  checkAuthStatus()

  if (signupLink) {
    signupLink.addEventListener('click', (e) => {
      e.preventDefault()
      chrome.tabs.create({ url: `${PLATFORM_URL}/signup` })
    })
  }

  // Google OAuth login
  if (googleLoginButton) {
    googleLoginButton.addEventListener('click', async () => {
      await handleGoogleLogin()
    })
  } else {
    console.error('Google login button not found in DOM')
  }

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
    // Get from storage or use default
    const result = await chrome.storage.local.get(['supabaseAnonKey'])
    return result.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXl3ZXVmZnh5b3JxdW11eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzM2MTAsImV4cCI6MjA4MzgwOTYxMH0.7U8Gyl2y6xdlESnkMeBql0BUr3tS5lSVBky27CyFx84'
  }

  /**
   * Handle Google OAuth login
   */
  async function handleGoogleLogin() {
    try {
      googleLoginButton.disabled = true
      googleLoginButton.innerHTML = 'Connecting...'

      const supabaseKey = await getSupabaseAnonKey()
      
      // Get redirect URL
      const redirectUrl = chrome.runtime.getURL('popup/login.html')
      
      // Build OAuth URL
      const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&apikey=${supabaseKey}`
      
      // Open OAuth popup
      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      }, async (callbackUrl) => {
        if (chrome.runtime.lastError) {
          console.error('OAuth error:', chrome.runtime.lastError)
          showStatus('OAuth login failed. Please try again.', 'error')
          googleLoginButton.disabled = false
          googleLoginButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.584-5.04-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.96 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l3.003-2.342z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.96 7.293C4.67 5.158 6.653 3.58 9 3.58z"/></svg>Sign in with Google'
          return
        }

        if (!callbackUrl) {
          showStatus('OAuth login cancelled', 'error')
          googleLoginButton.disabled = false
          googleLoginButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.584-5.04-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.96 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l3.003-2.342z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.96 7.293C4.67 5.158 6.653 3.58 9 3.58z"/></svg>Sign in with Google'
          return
        }

        // Extract tokens from callback URL
        const url = new URL(callbackUrl)
        const hash = url.hash.substring(1) // Remove #
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const expiresIn = params.get('expires_in')

        if (accessToken && refreshToken) {
          // Store tokens
          await chrome.storage.local.set({
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: Date.now() + (parseInt(expiresIn || '3600') * 1000),
          })

          showStatus('Successfully connected with Google!', 'success')
          setTimeout(() => {
            window.close()
            chrome.runtime.sendMessage({ action: 'authSuccess' })
          }, 1500)
        } else {
          showStatus('Failed to get tokens from OAuth response', 'error')
          googleLoginButton.disabled = false
          googleLoginButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.584-5.04-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.96 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l3.003-2.342z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.96 7.293C4.67 5.158 6.653 3.58 9 3.58z"/></svg>Sign in with Google'
        }
      })
    } catch (error) {
      console.error('Google login error:', error)
      showStatus('OAuth login failed. Please try again.', 'error')
      googleLoginButton.disabled = false
      googleLoginButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.584-5.04-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.96 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l3.003-2.342z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.96 7.293C4.67 5.158 6.653 3.58 9 3.58z"/></svg>Sign in with Google'
    }
  }
})

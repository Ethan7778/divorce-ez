import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signInWithOAuth: (provider: 'google' | 'github' | 'facebook') => Promise<any>
  signOut: () => Promise<any>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for OAuth callback in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    
    // If we have tokens in the URL, Supabase will handle them automatically
    // Clear the hash from URL after processing
    if (accessToken || refreshToken) {
      window.history.replaceState(null, '', window.location.pathname)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) throw error
    return data
  }

  const signInWithOAuth = async (provider: 'google' | 'github' | 'facebook') => {
    setLoading(true)
    // Use current origin for redirect - this ensures we always redirect to the current deployment
    // Supabase will validate this against allowed redirect URLs in dashboard
    const currentOrigin = window.location.origin
    const isDevelopment = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')
    
    // Use environment variable if set, otherwise use current origin
    // This works for both development and production
    let redirectUrl: string
    if (import.meta.env.VITE_SITE_URL) {
      // Use environment variable if configured
      redirectUrl = import.meta.env.VITE_SITE_URL
    } else {
      // Use current origin (works for both dev and production)
      redirectUrl = currentOrigin
    }
    
    const fullRedirectUrl = `${redirectUrl}/dashboard`
    console.log('OAuth Configuration:', {
      provider,
      redirectUrl: fullRedirectUrl,
      currentOrigin,
      isDevelopment,
      envSiteUrl: import.meta.env.VITE_SITE_URL
    })
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: fullRedirectUrl,
        skipBrowserRedirect: false,
      },
    })
    setLoading(false)
    if (error) {
      console.error('OAuth error:', error)
      throw error
    }
    return data
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signInWithOAuth, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

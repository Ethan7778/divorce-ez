import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Dashboard from './pages/dashboard/Dashboard'
import { isSupabaseConfigured } from './lib/supabase'
import './index.css'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  return user ? children : <Navigate to="/login" />
}

function App() {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Configuration Error</h2>
          <p className="text-gray-600 text-center mb-4">
            Supabase environment variables are not configured.
          </p>
          <div className="bg-gray-50 rounded p-4 mb-4">
            <p className="text-sm text-gray-700 mb-2">Please add these environment variables in Vercel:</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li><code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_URL</code></li>
              <li><code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_ANON_KEY</code></li>
            </ul>
          </div>
          <p className="text-xs text-gray-500 text-center">
            See <code className="bg-gray-200 px-1 rounded">VERCEL_ENV_SETUP.md</code> for instructions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

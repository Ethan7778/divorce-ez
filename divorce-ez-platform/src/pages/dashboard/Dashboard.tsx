import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useProgress } from '../../hooks/useProgress'
import { useNavigate } from 'react-router-dom'
import DocumentUploadModule from './modules/DocumentUploadModule'

type ModuleView = 'overview' | 'document' | 'personal' | 'financial' | 'review' | 'guidance' | 'checklist'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { progress, loading: progressLoading, getOverallProgressPercentage } = useProgress()
  const navigate = useNavigate()
  const [activeModule, setActiveModule] = useState<ModuleView>('overview')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const overallProgress = getOverallProgressPercentage()

  const modules = [
    {
      id: 'document' as ModuleView,
      title: 'Document Upload',
      description: 'Upload your financial documents and identification',
      completed: progress.find((p) => p.module_name === 'module_document_upload')?.status === 'completed' || false,
    },
    {
      id: 'personal' as ModuleView,
      title: 'Personal Information',
      description: 'Review and confirm your personal details',
      completed: progress.find((p) => p.module_name === 'module_personal_info')?.status === 'completed' || false,
    },
    {
      id: 'financial' as ModuleView,
      title: 'Financial Information',
      description: 'Review your financial data from uploaded documents',
      completed: progress.find((p) => p.module_name === 'module_financial_info')?.status === 'completed' || false,
    },
  ]

  if (progressLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Divorce EZ Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Progress: <span className="font-medium">{overallProgress}%</span>
              </div>
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeModule === 'overview' ? (
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Divorce Filing Progress</h2>
              <p className="text-gray-600">Complete each module to prepare your divorce filing documents</p>
            </div>

            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Overall Progress</h3>
                <span className="text-2xl font-bold text-indigo-600">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-indigo-600 h-4 rounded-full transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <div
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{module.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                  <div className="flex items-center">
                    {module.completed ? (
                      <span className="text-sm text-green-600 font-medium">✓ Completed</span>
                    ) : (
                      <span className="text-sm text-gray-500">Not started</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 sm:px-0">
            <button
              onClick={() => setActiveModule('overview')}
              className="mb-4 text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Overview
            </button>

            {activeModule === 'document' && (
              <DocumentUploadModule onComplete={() => setActiveModule('overview')} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

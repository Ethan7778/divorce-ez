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
      {/* Canvas-style Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Divorce EZ</h1>
              <span className="ml-3 text-xs text-gray-500">v2.0.1</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Progress: <span className="font-medium text-gray-900">{overallProgress}%</span>
              </div>
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Canvas-style Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4">
            <button
              onClick={() => setActiveModule('overview')}
              className={`w-full text-left px-3 py-2 rounded-md mb-1 ${
                activeModule === 'overview'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Home
            </button>
            <div className="mt-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Modules
              </div>
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full text-left px-3 py-2 rounded-md mb-1 flex items-center justify-between ${
                    activeModule === module.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{module.title}</span>
                  {module.completed && (
                    <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {activeModule === 'overview' ? (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Home</h2>
              
              {/* Canvas-style Section */}
              <div className="mt-6 bg-white border border-gray-200 rounded">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <button className="flex items-center justify-between w-full text-left">
                    <h3 className="text-base font-semibold text-gray-900">Your Divorce Filing Progress</h3>
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Overall Progress</span>
                      <span className="text-sm font-medium text-gray-900">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Canvas-style Module List */}
                  <div className="space-y-1">
                    {modules.map((module) => (
                      <div
                        key={module.id}
                        onClick={() => setActiveModule(module.id)}
                        className="flex items-center px-3 py-2.5 hover:bg-gray-50 rounded cursor-pointer group"
                      >
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
                          <svg className="h-5 w-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{module.title}</span>
                            {module.completed && (
                              <svg className="ml-2 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{module.description}</p>
                        </div>
                        <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setActiveModule('overview')}
                className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Home
              </button>

              {activeModule === 'document' && (
                <DocumentUploadModule onComplete={() => setActiveModule('overview')} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

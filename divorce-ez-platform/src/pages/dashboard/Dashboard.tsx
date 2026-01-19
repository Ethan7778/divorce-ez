import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useProgress } from '../../hooks/useProgress'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DocumentDropZone from '../../components/DocumentDropZone'
import type { Document } from '../../types'

type ModuleView = 'overview' | 'personal' | 'financial' | 'review' | 'guidance' | 'checklist'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { progress, loading: progressLoading, getOverallProgressPercentage } = useProgress()
  const navigate = useNavigate()
  const [activeModule, setActiveModule] = useState<ModuleView>('overview')
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const overallProgress = getOverallProgressPercentage()

  // Fetch uploaded documents
  useEffect(() => {
    if (user) {
      fetchDocuments()
    }
  }, [user])

  // Debug: Log version to console to verify deployment
  useEffect(() => {
    console.log('🎨 UI Version: Canvas Redesign v2.0.1')
    console.log('📅 Deployed:', new Date().toISOString())
  }, [])

  const fetchDocuments = async () => {
    if (!user) return
    setDocumentsLoading(true)
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setUploadedDocuments(data || [])
    } catch (err) {
      console.error('Error fetching documents:', err)
    } finally {
      setDocumentsLoading(false)
    }
  }

  // Check which document types are uploaded
  const getDocumentStatus = (docType: string) => {
    const doc = uploadedDocuments.find(d => d.document_type === docType)
    return doc ? { uploaded: true, status: doc.status, date: doc.uploaded_at } : { uploaded: false, status: null, date: null }
  }

  const modules = [
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Canvas-style Header - matches Canvas exactly */}
      <header className="bg-white border-b border-gray-300">
        <div className="px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">Divorce EZ</h1>
            </div>
            <div className="flex items-center space-x-4">
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

      <div className="flex">
        {/* Canvas-style Sidebar - matches Canvas exactly */}
        <aside className="w-64 bg-white border-r border-gray-300 min-h-[calc(100vh-4rem)]">
          <nav className="p-0">
            <div className="border-b border-gray-300">
              <button
                onClick={() => setActiveModule('overview')}
                className={`w-full text-left px-4 py-3 text-sm ${
                  activeModule === 'overview'
                    ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Home
              </button>
            </div>
            <div className="mt-0">
              {modules.map((module) => (
                <div key={module.id} className="border-b border-gray-300">
                  <button
                    onClick={() => setActiveModule(module.id)}
                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${
                      activeModule === module.id
                        ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600'
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
                </div>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content Area - Canvas style */}
        <main className="flex-1 bg-gray-100 p-6">
          {activeModule === 'overview' ? (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Home</h1>
              
              {/* Document Upload Section - Modern Drop Zones */}
              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Documents</h2>
                  <p className="text-sm text-gray-600">
                    Upload your documents below. Each document type has its own drop zone with helpful information.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { type: 'taxReturn' as const, label: 'Tax Return (1040 + schedules)', priority: 1, required: true, description: 'Anchor document - provides most comprehensive data' },
                    { type: 'payStub' as const, label: 'Pay Stub (last 1-2 months)', priority: 2, required: true, description: 'OR Profit & Loss if self-employed' },
                    { type: 'profitAndLoss' as const, label: 'Profit & Loss Statement', priority: 2, required: false, description: 'If self-employed (alternative to Pay Stub)' },
                    { type: 'marriageCertificate' as const, label: 'Marriage Certificate', priority: 3, required: true, description: 'Provides marriage date, place, and legal names' },
                    { type: 'priorCourtOrder' as const, label: 'Prior Court Order', priority: 4, required: false, description: 'If children exist - custody, support, or protective orders' },
                    { type: 'bankStatement' as const, label: 'Bank Statement (last 1-2 months)', priority: 5, required: false, description: 'Helps infer expenses and income patterns' },
                  ].map((doc) => {
                    const status = getDocumentStatus(doc.type)
                    return (
                      <DocumentDropZone
                        key={doc.type}
                        documentType={doc.type}
                        label={doc.label}
                        description={doc.description}
                        priority={doc.priority}
                        required={doc.required}
                        isUploaded={status.uploaded}
                        uploadDate={status.date || undefined}
                        onUploadComplete={fetchDocuments}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Progress Section - Canvas style */}
              <div className="mb-6 bg-white border border-gray-300 rounded">
                <div className="border-b border-gray-300 bg-gray-50 px-4 py-3">
                  <h2 className="text-base font-semibold text-gray-900">Your Progress</h2>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Overall Completion</span>
                      <span className="text-sm font-medium text-gray-900">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-0">
                    {modules.map((module, idx) => (
                      <div
                        key={module.id}
                        onClick={() => setActiveModule(module.id)}
                        className={`flex items-center px-3 py-2.5 hover:bg-gray-50 cursor-pointer ${
                          idx > 0 ? 'border-t border-gray-200' : ''
                        }`}
                      >
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-3">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            </div>
          )}
        </main>
      </div>
    </div>
  )
}

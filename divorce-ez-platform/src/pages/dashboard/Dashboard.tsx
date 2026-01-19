import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useProgress } from '../../hooks/useProgress'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DocumentDropZone from '../../components/DocumentDropZone'
import PersonalInformationModule from './modules/PersonalInformationModule'
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-blue-600"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-sm sticky top-0 z-10">
        <div className="px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Divorce EZ</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Modern Sidebar */}
        <aside className="w-64 bg-white/60 backdrop-blur-sm border-r border-gray-200/60 min-h-[calc(100vh-4rem)]">
          <nav className="p-2">
            <div className="mb-2">
              <button
                onClick={() => setActiveModule('overview')}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeModule === 'overview'
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Home</span>
                </div>
              </button>
            </div>
            <div className="space-y-1">
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-between group ${
                    activeModule === module.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50/80'
                  }`}
                >
                  <span>{module.title}</span>
                  {module.completed && (
                    <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {!module.completed && (
                    <svg className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8">
          {activeModule === 'overview' ? (
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Welcome back</h1>
                <p className="text-gray-600">Upload your documents to get started with your divorce filing.</p>
              </div>
              
              {/* Document Upload Section - Modern Drop Zones */}
              <div className="mb-8">
                <div className="mb-6">
                  <h2 className="section-header">Upload Documents</h2>
                  <p className="section-description">
                    Each document type has its own drop zone with helpful information on how to obtain it.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

              {/* Progress Section */}
              <div className="card">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/60">
                  <h2 className="text-lg font-semibold text-gray-900">Your Progress</h2>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                      <span className="text-lg font-semibold text-gray-900">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200/60 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {modules.map((module) => (
                      <div
                        key={module.id}
                        onClick={() => setActiveModule(module.id)}
                        className="flex items-center px-4 py-3 rounded-lg hover:bg-gray-50/80 cursor-pointer transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3 bg-gray-100 rounded-lg group-hover:bg-blue-50 transition-colors">
                          <svg className="h-5 w-5 text-gray-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{module.title}</span>
                            {module.completed && (
                              <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{module.description}</p>
                        </div>
                        <svg className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setActiveModule('overview')}
                className="mb-6 text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 group"
              >
                <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Home
              </button>

              {activeModule === 'personal' && <PersonalInformationModule />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

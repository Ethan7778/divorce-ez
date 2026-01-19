import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { processDocument } from '../services/ocrService'
import { migrateFromExtractedData } from '../services/formDataService'
import type { DocumentType } from '../types'

interface DocumentDropZoneProps {
  documentType: DocumentType
  label: string
  description: string
  helpText?: string
  priority?: number
  required?: boolean
  isUploaded: boolean
  uploadDate?: string
  onUploadComplete: () => void
}

const documentHelpText: Record<DocumentType, string> = {
  taxReturn: 'Request a copy from the IRS at irs.gov/individual/get-transcript or download from your tax software (TurboTax, H&R Block, etc.)',
  payStub: 'Download from your employer\'s payroll portal or request from HR. You need the last 1-2 months of pay stubs.',
  profitAndLoss: 'If you\'re self-employed, create this from your business records showing income and expenses for the period.',
  marriageCertificate: 'Request a certified copy from the county clerk\'s office where you were married, or order online through VitalChek.',
  priorCourtOrder: 'Contact the court clerk\'s office where the order was issued to request a certified copy.',
  bankStatement: 'Download from your bank\'s online portal or request a statement from your bank branch. You need the last 1-2 months.',
  driversLicense: 'Your current driver\'s license or state ID card.',
  w2: 'Request from your employer or download from your tax software if you filed electronically.',
  '1099': 'Request from the company that paid you (client, bank, etc.) or download from your tax software.',
}

export default function DocumentDropZone({
  documentType,
  label,
  description,
  helpText,
  priority,
  required,
  isUploaded,
  uploadDate,
  onUploadComplete,
}: DocumentDropZoneProps) {
  const { user } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showHelp, setShowHelp] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (isUploaded || isProcessing || !user) return

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        await handleFileUpload(files[0])
      }
    },
    [isUploaded, isProcessing, user, documentType]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && !isUploaded && !isProcessing && user) {
        await handleFileUpload(e.target.files[0])
      }
    },
    [isUploaded, isProcessing, user, documentType]
  )

  const handleFileUpload = async (file: File) => {
    if (!user) {
      setError('Please log in to upload documents.')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccess(false)
    setProgress(0)

    try {
      // Process document
      const processed = await processDocument(file, documentType, (progressValue) => {
        setProgress(Math.round(progressValue * 100))
      })

      if (!processed.success) {
        throw new Error(processed.error || 'Failed to process document')
      }

      setProgress(90)

      // Upload file to storage (optional)
      let filePath: string | null = null
      try {
        filePath = `${user.id}/${documentType}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) {
          console.warn('⚠️ File upload to storage failed:', uploadError.message)
          filePath = null
        }
      } catch (storageError: any) {
        console.warn('⚠️ Storage bucket not configured:', storageError?.message)
        filePath = null
      }

      // Store document record
      const { data: documentData, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          document_type: documentType,
          status: 'processed',
        })
        .select()
        .single()

      if (docError) {
        throw new Error(`Failed to save document: ${docError.message}`)
      }

      // Store extracted data
      const { error: dataError } = await supabase.from('extracted_data').insert({
        document_id: documentData.id,
        data: processed.extractedData,
      })

      if (dataError) {
        console.error('❌ Failed to save extracted data:', dataError)
      }

      // Update normalized form data
      await migrateFromExtractedData(user.id, processed.extractedData, documentType)

      setProgress(100)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onUploadComplete()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to upload document')
    } finally {
      setIsProcessing(false)
      setProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const helpTextToShow = helpText || documentHelpText[documentType] || 'Upload your document here.'

  return (
    <div
      className={`group relative bg-white border-2 border-dashed rounded-xl transition-all duration-300 ${
        isUploaded
          ? 'border-green-300 bg-green-50 shadow-sm'
          : isDragging
          ? 'border-blue-400 bg-blue-50 scale-[1.02] shadow-md'
          : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
      } ${isProcessing ? 'pointer-events-none opacity-75' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{label}</h3>
              {priority === 1 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex-shrink-0">
                  Anchor
                </span>
              )}
              {required && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full flex-shrink-0">
                  Required
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-2">{description}</p>
          </div>
          {isUploaded && (
            <div className="flex-shrink-0 ml-2">
              <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Help Text Toggle */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1 transition-all duration-200 hover:gap-2"
        >
          <svg
            className={`h-3 w-3 transition-transform duration-200 ${showHelp ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="font-medium">{showHelp ? 'Hide instructions' : 'How to obtain this document'}</span>
        </button>

        {/* Help Text */}
        {showHelp && (
          <div className="mb-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-xs text-blue-900 animate-fade-in shadow-sm">
            <div className="flex items-start gap-2">
              <svg className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="leading-relaxed">{helpTextToShow}</p>
            </div>
          </div>
        )}

        {/* Upload Date */}
        {isUploaded && uploadDate && (
          <p className="text-xs text-gray-500 mb-2">Uploaded {new Date(uploadDate).toLocaleDateString()}</p>
        )}

        {/* Drop Zone / Upload Area */}
        {!isUploaded && (
          <div className="mt-2">
            <label
              htmlFor={`file-upload-${documentType}`}
              className="block cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-white hover:from-blue-50 hover:to-indigo-50 hover:border-blue-400 transition-all duration-300 cursor-pointer">
                {isProcessing ? (
                  <>
                    <svg
                      className="animate-spin h-6 w-6 text-blue-600 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="text-xs text-gray-600">Processing... {progress}%</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-8 w-8 text-gray-400 mb-3 group-hover:text-blue-500 transition-all duration-300 group-hover:scale-110"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 text-center mb-1 group-hover:text-blue-700 transition-colors">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                id={`file-upload-${documentType}`}
                type="file"
                className="sr-only"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={isProcessing}
              />
            </label>
          </div>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2 animate-fade-in">
            <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-center gap-2 animate-fade-in">
            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Upload successful!</span>
          </div>
        )}
      </div>
    </div>
  )
}

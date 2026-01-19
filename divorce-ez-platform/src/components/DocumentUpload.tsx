import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { processDocument } from '../services/ocrService'
import { migrateFromExtractedData } from '../services/formDataService'
import type { Document, DocumentType } from '../types'

/**
 * Helper function to migrate extracted data to normalized tables
 * Uses the new formDataService instead of JSONB
 */
async function updateFormData(userId: string, extractedData: Record<string, any>, documentType?: string) {
  try {
    console.log('📊 updateFormData called with:', {
      userId,
      documentType,
      extractedDataKeys: Object.keys(extractedData || {}),
    })

    // Use the new normalized formDataService
    await migrateFromExtractedData(userId, extractedData, documentType)
    
    console.log('✅ Form data migrated to normalized tables successfully')
  } catch (error) {
    console.error('❌ Error updating form data:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    // Don't throw - this is optional aggregation, but log the error
  }
}

const documentTypes: { value: Document['document_type']; label: string; priority?: number }[] = [
  { value: 'taxReturn', label: 'Tax Return (1040 + schedules) - Anchor Document', priority: 1 },
  { value: 'payStub', label: 'Pay Stub (last 1-2 months)', priority: 2 },
  { value: 'profitAndLoss', label: 'Profit & Loss Statement (if self-employed)', priority: 2 },
  { value: 'marriageCertificate', label: 'Marriage Certificate', priority: 3 },
  { value: 'priorCourtOrder', label: 'Prior Court Order (if children exist)', priority: 4 },
  { value: 'bankStatement', label: 'Bank Statement (last 1-2 months)', priority: 5 },
  { value: 'driversLicense', label: "Driver's License" },
  { value: 'w2', label: 'W-2 Form' },
  { value: '1099', label: '1099 Form' },
]

export default function DocumentUpload() {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedDocType, setSelectedDocType] = useState<Document['document_type']>('driversLicense')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setError(null)
      setSuccess(null)
    }
  }

  const handleUpload = async () => {
    if (!user || !selectedFile) {
      setError('Please select a file and ensure you are logged in.')
      return
    }

    setProcessing(true)
    setUploading(false)
    setError(null)
    setSuccess(null)
    setProgress(0)

    try {
      // Step 1: Process document in browser using OCR
      const processed = await processDocument(selectedFile, selectedDocType, (progressValue) => {
        setProgress(Math.round(progressValue * 100))
      })

      if (!processed.success) {
        throw new Error(processed.error || 'Failed to process document')
      }

      // Debug: Log extracted data
      console.log('📄 Document Processing Results:')
      console.log('Document Type:', selectedDocType)
      console.log('Raw OCR Text Length:', processed.rawText?.length || 0)
      console.log('Raw OCR Text (first 500 chars):', processed.rawText?.substring(0, 500) || 'No text extracted')
      console.log('Extracted Data:', processed.extractedData)
      console.log('Extracted Data Keys:', Object.keys(processed.extractedData || {}))
      console.log('Number of extracted fields:', Object.keys(processed.extractedData || {}).length)

      setProgress(90)
      setProcessing(false)
      setUploading(true)

      // Step 2: Upload file to Supabase Storage (optional - for reference)
      let filePath: string | null = null
      try {
        filePath = `${user.id}/${selectedDocType}/${Date.now()}_${selectedFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile)

        if (uploadError) {
          console.warn('⚠️ File upload to storage failed (continuing with data upload):', uploadError.message)
          filePath = null // Don't save file path if upload failed
        } else {
          console.log('✅ File uploaded to storage:', filePath)
        }
      } catch (storageError: any) {
        console.warn('⚠️ Storage bucket not configured (continuing with data upload):', storageError?.message || 'Bucket not found')
        filePath = null // Don't save file path if storage is not configured
      }

      // Step 3: Store extracted data in database
      const { data: documentData, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: filePath,
          document_type: selectedDocType,
          status: 'processed',
        })
        .select()
        .single()

      if (docError) {
        throw new Error(`Failed to save document: ${docError.message}`)
      }

      // Step 4: Store extracted data
      console.log('💾 Saving extracted data to database...')
      console.log('Data being saved:', JSON.stringify(processed.extractedData, null, 2))
      
      const { data: savedExtractedData, error: dataError } = await supabase.from('extracted_data').insert({
        document_id: documentData.id,
        data: processed.extractedData,
      }).select().single()

      if (dataError) {
        console.error('❌ Failed to save extracted data:', dataError)
        throw new Error(`Failed to save extracted data: ${dataError.message}`)
      }
      
      console.log('✅ Extracted data saved successfully:', savedExtractedData?.id)

      // Step 5: Update form_data table with aggregated data
      console.log('🔄 Updating form_data table...')
      await updateFormData(user.id, processed.extractedData, selectedDocType)
      console.log('✅ Form data update completed')

      setProgress(100)
      setSuccess('Document processed and uploaded successfully!')
      setSelectedFile(null)

      // Reset after 3 seconds
      setTimeout(() => {
        setSuccess(null)
        setProgress(0)
      }, 3000)
    } catch (err: any) {
      setError(err.message)
      setProcessing(false)
      setUploading(false)
    } finally {
      setUploading(false)
    }
  }

  // Get document icon based on type
  const getDocumentIcon = (docType: string) => {
    switch (docType) {
      case 'taxReturn':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'payStub':
      case 'profitAndLoss':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'marriageCertificate':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )
      case 'priorCourtOrder':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      case 'bankStatement':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  return (
    <div className="bg-white border border-gray-300 rounded">
      {/* Canvas-style Section Header */}
      <div className="border-b border-gray-300 bg-gray-50 px-4 py-3">
        <h3 className="text-base font-semibold text-gray-900">Document Upload</h3>
      </div>

      <div className="p-4">
        {/* Canvas-style Information Section */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-3">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <strong>Recommended order:</strong> Start with your Tax Return (most comprehensive), then Pay Stubs, Marriage Certificate, and other documents as needed.
            </div>
          </div>
        </div>

        {/* Canvas-style Document Type List */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Document Type</label>
          <div className="border border-gray-300 rounded">
            {documentTypes.sort((a, b) => (a.priority || 99) - (b.priority || 99)).map((type, idx) => (
              <div
                key={type.value}
                onClick={() => setSelectedDocType(type.value)}
                className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  selectedDocType === type.value ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                } ${idx > 0 ? 'border-t border-gray-300' : ''}`}
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-3">
                  {getDocumentIcon(type.value)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`text-sm ${selectedDocType === type.value ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {type.label.replace(' - Anchor Document', '')}
                    </span>
                    {type.priority === 1 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                        Anchor
                      </span>
                    )}
                    {type.priority === 2 && type.value === 'payStub' && (
                      <span className="text-xs text-gray-500">Required</span>
                    )}
                  </div>
                </div>
                {selectedDocType === type.value && (
                  <svg className="h-4 w-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas-style File Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">File Upload</label>
          <div className="border-2 border-dashed border-gray-300 rounded p-6 hover:border-gray-400 transition-colors">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4V8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex items-center justify-center text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer font-medium text-blue-600 hover:text-blue-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </label>
                <span className="mx-2">or drag and drop</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
              {selectedFile && (
                <div className="mt-4 flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">{selectedFile.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {(processing || uploading) && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{processing ? 'Processing document...' : 'Uploading...'}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start">
            <svg className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded flex items-start">
            <svg className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-green-800">{success}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploading || processing}
          className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : uploading ? (
            'Uploading...'
          ) : (
            'Process & Upload Document'
          )}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { processDocument } from '../services/ocrService'
import { Document } from '../types'

const documentTypes: { value: Document['document_type']; label: string }[] = [
  { value: 'driversLicense', label: "Driver's License" },
  { value: 'taxReturn', label: 'Tax Return' },
  { value: 'payStub', label: 'Pay Stub' },
  { value: 'bankStatement', label: 'Bank Statement' },
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

      setProgress(90)
      setProcessing(false)
      setUploading(true)

      // Step 2: Upload file to Supabase Storage (optional - for reference)
      const filePath = `${user.id}/${selectedDocType}/${Date.now()}_${selectedFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) {
        console.warn('File upload failed, but continuing with data upload:', uploadError)
      }

      // Step 3: Store extracted data in database
      const { data: documentData, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: uploadError ? null : filePath,
          document_type: selectedDocType,
          status: 'processed',
        })
        .select()
        .single()

      if (docError) {
        throw new Error(`Failed to save document: ${docError.message}`)
      }

      // Step 4: Store extracted data
      const { error: dataError } = await supabase.from('extracted_data').insert({
        document_id: documentData.id,
        data: processed.extractedData,
      })

      if (dataError) {
        throw new Error(`Failed to save extracted data: ${dataError.message}`)
      }

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

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Upload New Document</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="document-type" className="block text-sm font-medium text-gray-700">
            Document Type
          </label>
          <select
            id="document-type"
            name="document-type"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value as Document['document_type'])}
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">File Upload</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4V8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
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
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
            </div>
          </div>
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-900">Selected: {selectedFile.name}</p>
          )}
        </div>

        {/* Progress Bar */}
        {(processing || uploading) && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{processing ? 'Processing document...' : 'Uploading...'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploading || processing}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing
            ? 'Processing...'
            : uploading
            ? 'Uploading...'
            : 'Process & Upload Document'}
        </button>
      </div>
    </div>
  )
}

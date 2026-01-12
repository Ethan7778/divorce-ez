import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { processDocument } from '../services/ocrService'
import type { Document, DocumentType, PersonalInfo, FinancialInfo } from '../types'

/**
 * Helper function to aggregate extracted data into form_data structure
 */
async function updateFormData(userId: string, extractedData: Record<string, any>) {
  try {
    // Get existing form_data
    const { data: existingFormData, error: fetchError } = await supabase
      .from('form_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // Helper to get value with fallbacks
    const getValue = (obj: Record<string, any>, ...keys: string[]) => {
      for (const key of keys) {
        if (obj[key] != null && obj[key] !== '') return obj[key]
      }
      return null
    }

    // Build personal_info
    const personalInfo: Partial<PersonalInfo> = existingFormData?.personal_info || {}
    if (!personalInfo.firstName) personalInfo.firstName = getValue(extractedData, 'firstName', 'first_name', 'fname') as string | undefined
    if (!personalInfo.lastName) personalInfo.lastName = getValue(extractedData, 'lastName', 'last_name', 'lname') as string | undefined
    if (!personalInfo.fullName) {
      const fullName = getValue(extractedData, 'fullName', 'full_name', 'name') as string | undefined
      if (fullName) personalInfo.fullName = fullName
      else if (personalInfo.firstName && personalInfo.lastName) {
        personalInfo.fullName = `${personalInfo.firstName} ${personalInfo.lastName}`
      }
    }
    if (!personalInfo.dateOfBirth) personalInfo.dateOfBirth = getValue(extractedData, 'dateOfBirth', 'dob', 'birthDate', 'birth_date') as string | undefined
    if (!personalInfo.ssn) personalInfo.ssn = getValue(extractedData, 'ssn', 'socialSecurity', 'social_security') as string | undefined
    if (!personalInfo.driverLicenseNumber) personalInfo.driverLicenseNumber = getValue(extractedData, 'licenseNumber', 'license_number', 'driverLicenseNumber', 'driver_license_number', 'dlNumber', 'dl_number') as string | undefined
    
    // Handle address - can be string or object
    if (!personalInfo.address) {
      const addressStr = getValue(extractedData, 'address', 'street', 'streetAddress', 'street_address')
      const addressObj = extractedData.address
      if (addressStr && typeof addressStr === 'string') {
        personalInfo.address = { street: addressStr }
      } else if (addressObj && typeof addressObj === 'object') {
        personalInfo.address = {
          street: addressObj.street || addressObj.address || '',
          city: addressObj.city || '',
          state: addressObj.state || '',
          zipCode: addressObj.zipCode || addressObj.zip || '',
        }
      }
    }
    if (!personalInfo.address?.city) {
      const city = getValue(extractedData, 'city') as string | undefined
      if (city) personalInfo.address = { ...personalInfo.address, city }
    }
    if (!personalInfo.address?.state) {
      const state = getValue(extractedData, 'state') as string | undefined
      if (state) personalInfo.address = { ...personalInfo.address, state }
    }
    if (!personalInfo.address?.zipCode) {
      const zipCode = getValue(extractedData, 'zipCode', 'zip', 'zip_code', 'postalCode', 'postal_code') as string | undefined
      if (zipCode) personalInfo.address = { ...personalInfo.address, zipCode }
    }

    // Build financial_info
    const financialInfo: Partial<FinancialInfo> = existingFormData?.financial_info || {}
    const income = financialInfo.income || {}
    if (!income.annual) income.annual = getValue(extractedData, 'totalIncome', 'total_income', 'income', 'annualIncome', 'annual_income', 'adjustedGrossIncome', 'adjusted_gross_income', 'agi', 'AGI') as number | undefined
    if (!income.monthly) income.monthly = getValue(extractedData, 'grossPay', 'gross_pay', 'gross', 'netPay', 'net_pay', 'net') as number | undefined
    financialInfo.income = income

    // Bank accounts
    if (!financialInfo.bankAccounts || financialInfo.bankAccounts.length === 0) {
      const bankName = getValue(extractedData, 'bankName', 'bank_name', 'bank', 'financialInstitution', 'financial_institution') as string | undefined
      const accountNumber = getValue(extractedData, 'accountNumber', 'account_number', 'acctNumber', 'acct_number') as string | undefined
      const balance = getValue(extractedData, 'balance', 'accountBalance', 'account_balance', 'currentBalance', 'current_balance')
      if (bankName || accountNumber || balance) {
        financialInfo.bankAccounts = [{
          bankName: bankName,
          accountNumber: accountNumber,
          balance: balance ? Number(balance) : undefined,
        }]
      }
    }

    // Upsert form_data
    const { error: upsertError } = await supabase
      .from('form_data')
      .upsert(
        {
          user_id: userId,
          personal_info: personalInfo,
          financial_info: financialInfo,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('Failed to update form_data:', upsertError)
      // Don't throw - this is optional aggregation
    }
  } catch (error) {
    console.error('Error updating form_data:', error)
    // Don't throw - this is optional aggregation
  }
}

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

      // Step 5: Update form_data table with aggregated data
      await updateFormData(user.id, processed.extractedData)

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

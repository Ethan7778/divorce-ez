import DocumentUpload from '../../../components/DocumentUpload'
import { useProgress } from '../../../hooks/useProgress'

interface DocumentUploadModuleProps {
  onComplete?: () => void
}

export default function DocumentUploadModule({ onComplete }: DocumentUploadModuleProps) {
  const { updateModule } = useProgress()

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-1">Document Upload</h2>
      <p className="text-sm text-gray-600 mb-6">
        Upload your financial documents and identification here. Documents will be processed using browser OCR.
      </p>
      <DocumentUpload />
      <div className="mt-6">
        <button
          onClick={async () => {
            await updateModule('module_document_upload', true)
            onComplete?.()
          }}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
        >
          Mark as Complete
        </button>
      </div>
    </div>
  )
}

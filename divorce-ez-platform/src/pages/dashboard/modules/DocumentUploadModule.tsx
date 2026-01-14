import DocumentUpload from '../../../components/DocumentUpload'
import { useProgress } from '../../../hooks/useProgress'

interface DocumentUploadModuleProps {
  onComplete?: () => void
}

export default function DocumentUploadModule({ onComplete }: DocumentUploadModuleProps) {
  const { updateModule } = useProgress()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Document Upload</h1>
      <DocumentUpload />
      <div className="mt-6">
        <button
          onClick={async () => {
            await updateModule('module_document_upload', true)
            onComplete?.()
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
        >
          Mark as Complete
        </button>
      </div>
    </div>
  )
}

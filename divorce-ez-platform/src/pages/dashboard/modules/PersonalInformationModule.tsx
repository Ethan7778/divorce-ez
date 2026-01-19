import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { getFormData, updatePersonalInfo, updateSpouseInfo, updateChildren, updateMarriageInfo } from '../../../services/formDataService'
import type { NormalizedFormData, PersonalInfoRow, SpouseInfoRow, ChildRow, MarriageInfoRow } from '../../../types'

export default function PersonalInformationModule() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<NormalizedFormData | null>(null)

  // Form state
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInfoRow>>({})
  const [spouseInfo, setSpouseInfo] = useState<Partial<SpouseInfoRow>>({})
  const [children, setChildren] = useState<ChildRow[]>([])
  const [marriageInfo, setMarriageInfo] = useState<Partial<MarriageInfoRow>>({})

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await getFormData(user.id)
      setFormData(data)
      setPersonalInfo(data.personal_info || {})
      setSpouseInfo(data.spouse_info || {})
      setChildren(data.children || [])
      setMarriageInfo(data.marriage_info || {})
    } catch (err: any) {
      console.error('Error loading personal information:', err)
      setError(err.message || 'Failed to load personal information')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Save all sections
      await Promise.all([
        updatePersonalInfo(user.id, personalInfo),
        spouseInfo && Object.keys(spouseInfo).length > 0 ? updateSpouseInfo(user.id, spouseInfo) : Promise.resolve(),
        updateChildren(user.id, children.map(({ id, user_id, last_updated, ...rest }) => ({ ...rest, full_name: rest.full_name || '' }))),
        marriageInfo && Object.keys(marriageInfo).length > 0 ? updateMarriageInfo(user.id, marriageInfo) : Promise.resolve(),
      ])

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await loadData() // Reload to get updated data
    } catch (err: any) {
      console.error('Error saving personal information:', err)
      setError(err.message || 'Failed to save personal information')
    } finally {
      setSaving(false)
    }
  }

  const addChild = () => {
    setChildren([...children, { id: '', user_id: '', full_name: '', date_of_birth: null, primary_residence_parent: null, legal_custody_type: null, physical_custody_type: null, overnights_with_spouse1: null, overnights_with_spouse2: null, last_updated: '' }])
  }

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index))
  }

  const updateChild = (index: number, field: keyof ChildRow, value: string | number | null) => {
    const updated = [...children]
    updated[index] = { ...updated[index], [field]: value }
    setChildren(updated)
  }

  const isFieldEmpty = (value: any): boolean => {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
  }

  const FieldSection = ({ title, children: fields }: { title: string; children: React.ReactNode }) => (
    <div className="card mb-6">
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/60">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{fields}</div>
      </div>
    </div>
  )

  const FormField = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    required = false,
  }: {
    label: string
    value: any
    onChange: (value: string) => void
    type?: string
    placeholder?: string
    required?: boolean
  }) => {
    const isEmpty = isFieldEmpty(value)
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {isEmpty && (
            <span className="ml-2 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
              Blank
            </span>
          )}
        </label>
        {type === 'textarea' ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            className={`input-base ${isEmpty ? 'border-amber-200 bg-amber-50/30' : ''}`}
            rows={3}
          />
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            className={`input-base ${isEmpty ? 'border-amber-200 bg-amber-50/30' : ''}`}
          />
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-blue-600"></div>
          <p className="text-sm text-gray-600">Loading personal information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Personal Information</h1>
        <p className="text-gray-600">Review and update your personal information extracted from documents.</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-fade-in">
          <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-green-800">Personal information saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-fade-in">
          <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-red-800">{error}</span>
        </div>
      )}

      {/* Your Information */}
      <FieldSection title="Your Information">
        <FormField
          label="First Name"
          value={personalInfo.first_name}
          onChange={(val) => setPersonalInfo({ ...personalInfo, first_name: val || null })}
          required
        />
        <FormField
          label="Middle Name"
          value={personalInfo.middle_name}
          onChange={(val) => setPersonalInfo({ ...personalInfo, middle_name: val || null })}
        />
        <FormField
          label="Last Name"
          value={personalInfo.last_name}
          onChange={(val) => setPersonalInfo({ ...personalInfo, last_name: val || null })}
          required
        />
        <FormField
          label="Date of Birth"
          value={personalInfo.date_of_birth || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, date_of_birth: val || null })}
          type="date"
        />
        <FormField
          label="SSN (Last 4 digits)"
          value={personalInfo.ssn_last_4 || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, ssn_last_4: val || null })}
          placeholder="1234"
          type="text"
        />
        <FormField
          label="Email"
          value={personalInfo.email || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, email: val || null })}
          type="email"
        />
        <FormField
          label="Phone"
          value={personalInfo.phone || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, phone: val || null })}
          type="tel"
          placeholder="(555) 123-4567"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Filing Status
            {isFieldEmpty(personalInfo.filing_status) && (
              <span className="ml-2 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                Blank
              </span>
            )}
          </label>
          <select
            value={personalInfo.filing_status || ''}
            onChange={(e) => setPersonalInfo({ ...personalInfo, filing_status: e.target.value as any || null })}
            className={`input-base ${isFieldEmpty(personalInfo.filing_status) ? 'border-amber-200 bg-amber-50/30' : ''}`}
          >
            <option value="">Select filing status</option>
            <option value="single">Single</option>
            <option value="married_joint">Married Filing Jointly</option>
            <option value="married_separate">Married Filing Separately</option>
            <option value="head_of_household">Head of Household</option>
          </select>
        </div>
      </FieldSection>

      {/* Address */}
      <FieldSection title="Address">
        <FormField
          label="Street Address"
          value={personalInfo.address_street || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, address_street: val || null })}
        />
        <FormField
          label="City"
          value={personalInfo.address_city || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, address_city: val || null })}
        />
        <FormField
          label="State"
          value={personalInfo.address_state || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, address_state: val || null })}
          placeholder="UT"
        />
        <FormField
          label="ZIP Code"
          value={personalInfo.address_zip_code || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, address_zip_code: val || null })}
          placeholder="84101"
        />
        <FormField
          label="Utah Residency (Years)"
          value={personalInfo.utah_residency_years?.toString() || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, utah_residency_years: val ? parseInt(val) : null })}
          type="number"
          placeholder="0"
        />
      </FieldSection>

      {/* Driver's License */}
      <FieldSection title="Driver's License">
        <FormField
          label="License Number"
          value={personalInfo.driver_license_number || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, driver_license_number: val || null })}
        />
        <FormField
          label="License State"
          value={personalInfo.driver_license_state || ''}
          onChange={(val) => setPersonalInfo({ ...personalInfo, driver_license_state: val || null })}
          placeholder="UT"
        />
      </FieldSection>

      {/* Spouse Information */}
      <FieldSection title="Spouse Information">
        <FormField
          label="Spouse First Name"
          value={spouseInfo.first_name || ''}
          onChange={(val) => setSpouseInfo({ ...spouseInfo, first_name: val || null })}
        />
        <FormField
          label="Spouse Middle Name"
          value={spouseInfo.middle_name || ''}
          onChange={(val) => setSpouseInfo({ ...spouseInfo, middle_name: val || null })}
        />
        <FormField
          label="Spouse Last Name"
          value={spouseInfo.last_name || ''}
          onChange={(val) => setSpouseInfo({ ...spouseInfo, last_name: val || null })}
        />
        <FormField
          label="Spouse Date of Birth"
          value={spouseInfo.date_of_birth || ''}
          onChange={(val) => setSpouseInfo({ ...spouseInfo, date_of_birth: val || null })}
          type="date"
        />
        <FormField
          label="Spouse SSN (Last 4)"
          value={spouseInfo.ssn_last_4 || ''}
          onChange={(val) => setSpouseInfo({ ...spouseInfo, ssn_last_4: val || null })}
          placeholder="1234"
        />
      </FieldSection>

      {/* Marriage Information */}
      <FieldSection title="Marriage Information">
        <FormField
          label="Marriage Date"
          value={marriageInfo.marriage_date || ''}
          onChange={(val) => setMarriageInfo({ ...marriageInfo, marriage_date: val || null })}
          type="date"
        />
        <FormField
          label="Marriage Place (City, State)"
          value={marriageInfo.marriage_place || ''}
          onChange={(val) => setMarriageInfo({ ...marriageInfo, marriage_place: val || null })}
          placeholder="Salt Lake City, UT"
        />
        <FormField
          label="Spouse 1 Legal Name at Marriage"
          value={marriageInfo.spouse1_legal_name_at_marriage || ''}
          onChange={(val) => setMarriageInfo({ ...marriageInfo, spouse1_legal_name_at_marriage: val || null })}
        />
        <FormField
          label="Spouse 2 Legal Name at Marriage"
          value={marriageInfo.spouse2_legal_name_at_marriage || ''}
          onChange={(val) => setMarriageInfo({ ...marriageInfo, spouse2_legal_name_at_marriage: val || null })}
        />
      </FieldSection>

      {/* Children */}
      <div className="card mb-6">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/60 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Children</h3>
          <button
            type="button"
            onClick={addChild}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Child
          </button>
        </div>
        <div className="p-6">
          {children.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No children added yet. Click "Add Child" to add one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {children.map((child, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">Child {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeChild(index)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="Full Name"
                      value={child.full_name || ''}
                      onChange={(val) => updateChild(index, 'full_name', val || null)}
                      required
                    />
                    <FormField
                      label="Date of Birth"
                      value={child.date_of_birth || ''}
                      onChange={(val) => updateChild(index, 'date_of_birth', val || null)}
                      type="date"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Primary Residence Parent
                        {isFieldEmpty(child.primary_residence_parent) && (
                          <span className="ml-2 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                            Blank
                          </span>
                        )}
                      </label>
                      <select
                        value={child.primary_residence_parent || ''}
                        onChange={(e) => updateChild(index, 'primary_residence_parent', e.target.value || null)}
                        className={`input-base ${isFieldEmpty(child.primary_residence_parent) ? 'border-amber-200 bg-amber-50/30' : ''}`}
                      >
                        <option value="">Select parent</option>
                        <option value="spouse1">You (Spouse 1)</option>
                        <option value="spouse2">Spouse 2</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Legal Custody Type
                        {isFieldEmpty(child.legal_custody_type) && (
                          <span className="ml-2 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                            Blank
                          </span>
                        )}
                      </label>
                      <select
                        value={child.legal_custody_type || ''}
                        onChange={(e) => updateChild(index, 'legal_custody_type', e.target.value || null)}
                        className={`input-base ${isFieldEmpty(child.legal_custody_type) ? 'border-amber-200 bg-amber-50/30' : ''}`}
                      >
                        <option value="">Select type</option>
                        <option value="sole">Sole</option>
                        <option value="joint">Joint</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Physical Custody Type
                        {isFieldEmpty(child.physical_custody_type) && (
                          <span className="ml-2 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                            Blank
                          </span>
                        )}
                      </label>
                      <select
                        value={child.physical_custody_type || ''}
                        onChange={(e) => updateChild(index, 'physical_custody_type', e.target.value || null)}
                        className={`input-base ${isFieldEmpty(child.physical_custody_type) ? 'border-amber-200 bg-amber-50/30' : ''}`}
                      >
                        <option value="">Select type</option>
                        <option value="sole">Sole</option>
                        <option value="joint">Joint</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 mb-8">
        <button
          type="button"
          onClick={loadData}
          className="btn-secondary"
          disabled={saving}
        >
          Reset Changes
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary min-w-[120px]"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}

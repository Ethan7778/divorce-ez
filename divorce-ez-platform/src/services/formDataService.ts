/**
 * Form Data Service - Handles normalized table operations
 * Replaces the old JSONB-based form_data approach
 */

import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import { validateUserId } from '../utils/validation'
import type {
  PersonalInfoRow,
  SpouseInfoRow,
  ChildRow,
  IncomeRow,
  EmployerRow,
  ExpenseRow,
  AssetRow,
  DebtRow,
  MarriageInfoRow,
  CourtInfoRow,
  NormalizedFormData,
} from '../types'

/**
 * Get all form data for a user (aggregated from all normalized tables)
 */
export async function getFormData(userId: string): Promise<NormalizedFormData> {
  try {
    // Query all tables in parallel
    const [
      personalInfoResult,
      spouseInfoResult,
      childrenResult,
      incomeResult,
      employersResult,
      expensesResult,
      assetsResult,
      debtsResult,
      marriageInfoResult,
      courtInfoResult,
    ] = await Promise.all([
      supabase.from('personal_info').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('spouse_info').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('children').select('*').eq('user_id', userId),
      supabase.from('income').select('*').eq('user_id', userId).order('spouse_number'),
      supabase.from('employers').select('*').eq('user_id', userId).order('spouse_number'),
      supabase.from('expenses').select('*').eq('user_id', userId).order('spouse_number'),
      supabase.from('assets').select('*').eq('user_id', userId),
      supabase.from('debts').select('*').eq('user_id', userId),
      supabase.from('marriage_info').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('court_info').select('*').eq('user_id', userId).maybeSingle(),
    ])

    return {
      personal_info: personalInfoResult.data || null,
      spouse_info: spouseInfoResult.data || null,
      children: childrenResult.data || [],
      income: incomeResult.data || [],
      employers: employersResult.data || [],
      expenses: expensesResult.data || [],
      assets: assetsResult.data || [],
      debts: debtsResult.data || [],
      marriage_info: marriageInfoResult.data || null,
      court_info: courtInfoResult.data || null,
    }
  } catch (error) {
    logger.error('Error getting form data:', error)
    throw error
  }
}

/**
 * Update personal info (upsert)
 */
export async function updatePersonalInfo(
  userId: string,
  data: Partial<Omit<PersonalInfoRow, 'id' | 'user_id' | 'last_updated'>>
): Promise<PersonalInfoRow> {
  const validatedUserId = validateUserId(userId)

  const payload = {
    user_id: validatedUserId,
    ...data,
    last_updated: new Date().toISOString(),
  }

  // Verify authentication
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !authUser) {
    throw new Error('Authentication required')
  }

  if (authUser.id !== validatedUserId) {
    throw new Error('Unauthorized: Cannot update another user\'s data')
  }

  const { data: result, error } = await supabase
    .from('personal_info')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    logger.error('Error upserting personal_info:', {
      code: error.code,
      message: error.message,
      hint: error.hint,
    })
    throw error
  }

  logger.debug('Personal info updated successfully')
  return result
}

/**
 * Update spouse info (upsert)
 */
export async function updateSpouseInfo(
  userId: string,
  data: Partial<Omit<SpouseInfoRow, 'id' | 'user_id' | 'last_updated'>>
): Promise<SpouseInfoRow> {
  const { data: result, error } = await supabase
    .from('spouse_info')
    .upsert(
      {
        user_id: userId,
        ...data,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) throw error
  return result
}

/**
 * Replace all children for a user
 */
export async function updateChildren(userId: string, children: Omit<ChildRow, 'id' | 'user_id' | 'last_updated'>[]): Promise<ChildRow[]> {
  // Delete existing children
  await supabase.from('children').delete().eq('user_id', userId)

  if (children.length === 0) {
    return []
  }

  // Insert new children
  const childrenToInsert = children.map((child) => ({
    user_id: userId,
    ...child,
    last_updated: new Date().toISOString(),
  }))

  const { data: result, error } = await supabase.from('children').insert(childrenToInsert).select()

  if (error) throw error
  return result
}

/**
 * Update income for a specific spouse (upsert)
 */
export async function updateIncome(
  userId: string,
  spouseNumber: 1 | 2,
  data: Partial<Omit<IncomeRow, 'id' | 'user_id' | 'spouse_number' | 'last_updated'>>
): Promise<IncomeRow> {
  const { data: result, error } = await supabase
    .from('income')
    .upsert(
      {
        user_id: userId,
        spouse_number: spouseNumber,
        ...data,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'user_id,spouse_number' }
    )
    .select()
    .single()

  if (error) throw error
  return result
}

/**
 * Replace all employers for a specific spouse
 */
export async function updateEmployers(
  userId: string,
  spouseNumber: 1 | 2,
  employers: Omit<EmployerRow, 'id' | 'user_id' | 'spouse_number' | 'last_updated'>[]
): Promise<EmployerRow[]> {
  // Delete existing employers for this spouse
  await supabase.from('employers').delete().eq('user_id', userId).eq('spouse_number', spouseNumber)

  if (employers.length === 0) {
    return []
  }

  // Insert new employers
  const employersToInsert = employers.map((employer) => ({
    user_id: userId,
    spouse_number: spouseNumber,
    ...employer,
    last_updated: new Date().toISOString(),
  }))

  const { data: result, error } = await supabase.from('employers').insert(employersToInsert).select()

  if (error) throw error
  return result
}

/**
 * Update expenses for a specific spouse (upsert)
 */
export async function updateExpenses(
  userId: string,
  spouseNumber: 1 | 2,
  data: Partial<Omit<ExpenseRow, 'id' | 'user_id' | 'spouse_number' | 'last_updated'>>
): Promise<ExpenseRow> {
  const { data: result, error } = await supabase
    .from('expenses')
    .upsert(
      {
        user_id: userId,
        spouse_number: spouseNumber,
        ...data,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'user_id,spouse_number' }
    )
    .select()
    .single()

  if (error) throw error
  return result
}

/**
 * Replace all assets for a user
 */
export async function updateAssets(userId: string, assets: Omit<AssetRow, 'id' | 'user_id' | 'last_updated'>[]): Promise<AssetRow[]> {
  // Delete existing assets
  await supabase.from('assets').delete().eq('user_id', userId)

  if (assets.length === 0) {
    return []
  }

  // Insert new assets
  const assetsToInsert = assets.map((asset) => ({
    user_id: userId,
    ...asset,
    last_updated: new Date().toISOString(),
  }))

  const { data: result, error } = await supabase.from('assets').insert(assetsToInsert).select()

  if (error) throw error
  return result
}

/**
 * Replace all debts for a user
 */
export async function updateDebts(userId: string, debts: Omit<DebtRow, 'id' | 'user_id' | 'last_updated'>[]): Promise<DebtRow[]> {
  // Delete existing debts
  await supabase.from('debts').delete().eq('user_id', userId)

  if (debts.length === 0) {
    return []
  }

  // Insert new debts
  const debtsToInsert = debts.map((debt) => ({
    user_id: userId,
    ...debt,
    last_updated: new Date().toISOString(),
  }))

  const { data: result, error } = await supabase.from('debts').insert(debtsToInsert).select()

  if (error) throw error
  return result
}

/**
 * Update marriage info (upsert)
 */
export async function updateMarriageInfo(
  userId: string,
  data: Partial<Omit<MarriageInfoRow, 'id' | 'user_id' | 'last_updated'>>
): Promise<MarriageInfoRow> {
  const { data: result, error } = await supabase
    .from('marriage_info')
    .upsert(
      {
        user_id: userId,
        ...data,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) throw error
  return result
}

/**
 * Update court info (upsert)
 */
export async function updateCourtInfo(
  userId: string,
  data: Partial<Omit<CourtInfoRow, 'id' | 'user_id' | 'last_updated'>>
): Promise<CourtInfoRow> {
  const { data: result, error } = await supabase
    .from('court_info')
    .upsert(
      {
        user_id: userId,
        ...data,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) throw error
  return result
}

/**
 * Migrate extracted OCR data to normalized tables
 * This replaces the old updateFormData function
 */
export async function migrateFromExtractedData(
  userId: string,
  extractedData: Record<string, any>,
  documentType?: string
): Promise<void> {
  try {
    const validatedUserId = validateUserId(userId)

    // Validate extractedData
    if (!extractedData || typeof extractedData !== 'object' || Array.isArray(extractedData)) {
      logger.warn('Invalid extractedData provided, skipping migration')
      return
    }

    logger.debug('Migrating extracted data to normalized tables', {
      documentType,
      extractedKeys: Object.keys(extractedData),
    })

    // Helper to get value with fallbacks
    const getValue = (obj: Record<string, any>, ...keys: string[]): any => {
      if (!obj || typeof obj !== 'object') return null
      for (const key of keys) {
        if (obj[key] != null && obj[key] !== '') return obj[key]
      }
      return null
    }

    // Get existing data to merge intelligently
    const existingData = await getFormData(validatedUserId)

    // ========================================================================
    // Personal Info (Spouse 1)
    // ========================================================================
    // Always replace fields when new data is available (user wants new uploads to replace old)
    const personalInfoUpdates: Partial<PersonalInfoRow> = {}
    let hasPersonalInfoUpdates = false

    // Extract firstName - handle both regex and Gemini formats
    const firstName = getValue(extractedData, 'firstName', 'first_name', 'fname', 'employeeFullName')
    if (firstName) {
      // If employeeFullName, split it
      if (firstName.includes(' ')) {
        const nameParts = firstName.split(/\s+/)
        personalInfoUpdates.first_name = nameParts[0]
        if (nameParts.length > 2) {
          personalInfoUpdates.middle_name = nameParts.slice(1, -1).join(' ')
        }
        personalInfoUpdates.last_name = nameParts[nameParts.length - 1]
        hasPersonalInfoUpdates = true
      } else {
        personalInfoUpdates.first_name = firstName as string | null
        hasPersonalInfoUpdates = true
      }
    }

    // Extract middleName
    const middleName = getValue(extractedData, 'middleName', 'middle_name', 'mname')
    if (middleName) {
      personalInfoUpdates.middle_name = middleName as string | null
      hasPersonalInfoUpdates = true
    }

    // Extract lastName
    const lastName = getValue(extractedData, 'lastName', 'last_name', 'lname')
    if (lastName) {
      personalInfoUpdates.last_name = lastName as string | null
      hasPersonalInfoUpdates = true
    }

    // Extract date of birth - always replace if found
    const dob = getValue(extractedData, 'dateOfBirth', 'dob', 'birthDate', 'birth_date')
    if (dob) {
      // Convert to ISO date format if needed
      let dateStr = String(dob)
      if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
        const parts = dateStr.split(/[\/\-]/)
        dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      }
      personalInfoUpdates.date_of_birth = dateStr
      hasPersonalInfoUpdates = true
    }

    // Extract SSN - always replace if found
    const ssn = getValue(extractedData, 'ssn', 'ssnLast4', 'socialSecurity', 'ssn_last_4')
    if (ssn) {
      const ssnStr = String(ssn).replace(/[^\d]/g, '')
      if (ssnStr.length >= 4) {
        personalInfoUpdates.ssn_last_4 = ssnStr.slice(-4) // Only store last 4
        hasPersonalInfoUpdates = true
      }
    }

    // Extract driver license - always replace if found
    const licenseNumber = getValue(extractedData, 'licenseNumber', 'driverLicenseNumber', 'dl_number')
    if (licenseNumber) {
      personalInfoUpdates.driver_license_number = String(licenseNumber)
      hasPersonalInfoUpdates = true
    }
    const licenseState = getValue(extractedData, 'licenseState', 'driverLicenseState', 'dl_state')
    if (licenseState) {
      personalInfoUpdates.driver_license_state = String(licenseState).toUpperCase().slice(0, 2)
      hasPersonalInfoUpdates = true
    }

    // Extract address - always replace if found
    if (extractedData.address) {
      const address = extractedData.address
      if (typeof address === 'object' && address !== null) {
        if (address.street) {
          personalInfoUpdates.address_street = String(address.street)
          hasPersonalInfoUpdates = true
        }
        if (address.city) {
          personalInfoUpdates.address_city = String(address.city)
          hasPersonalInfoUpdates = true
        }
        if (address.state) {
          personalInfoUpdates.address_state = String(address.state).toUpperCase().slice(0, 2)
          hasPersonalInfoUpdates = true
        }
        if (address.zipCode || address.zip) {
          personalInfoUpdates.address_zip_code = String(address.zipCode || address.zip)
          hasPersonalInfoUpdates = true
        }
      }
    }

    // Extract zip code separately if address object not found
    const zipCode = getValue(extractedData, 'zipCode', 'zip', 'zip_code', 'postalCode', 'postal_code')
    if (zipCode && !personalInfoUpdates.address_zip_code) {
      personalInfoUpdates.address_zip_code = zipCode as string | null
      hasPersonalInfoUpdates = true
    }

    // Extract email - always replace if found
    const email = getValue(extractedData, 'email', 'e-mail', 'e_mail')
    if (email) {
      personalInfoUpdates.email = email as string | null
      hasPersonalInfoUpdates = true
    }

    // Extract phone - always replace if found
    const phone = getValue(extractedData, 'phone', 'telephone', 'mobile', 'cell')
    if (phone) {
      personalInfoUpdates.phone = phone as string | null
      hasPersonalInfoUpdates = true
    }

    // Extract filing status - always replace if found
    const filingStatus = getValue(extractedData, 'filingStatus', 'filing_status')
    if (filingStatus) {
      personalInfoUpdates.filing_status = filingStatus as
        | 'single'
        | 'married_joint'
        | 'married_separate'
        | 'head_of_household'
        | null
      hasPersonalInfoUpdates = true
    }

      // Check if we have ANY extracted data that could be personal info
      const hasAnyPersonalData = 
        getValue(extractedData, 'firstName', 'first_name', 'fname') ||
        getValue(extractedData, 'lastName', 'last_name', 'lname') ||
        getValue(extractedData, 'dateOfBirth', 'dob', 'birthDate') ||
        getValue(extractedData, 'ssn', 'ssnLast4', 'socialSecurity') ||
        extractedData.address ||
        getValue(extractedData, 'email') ||
        getValue(extractedData, 'phone') ||
        getValue(extractedData, 'licenseNumber', 'driverLicenseNumber')

      // Always update if we have any updates, or if we need to create a record
      if (hasPersonalInfoUpdates || Object.keys(personalInfoUpdates).length > 0) {
        try {
          await updatePersonalInfo(validatedUserId, personalInfoUpdates)
          logger.debug('Personal info updated successfully')
        } catch (updateError: any) {
          logger.error('Error updating personal_info:', {
            code: updateError.code,
            message: updateError.message,
            hint: updateError.hint,
          })
          throw updateError
        }
      } else if (hasAnyPersonalData) {
        logger.warn('Found personal data but no fields matched')
      }

    // ========================================================================
    // Spouse Info (Spouse 2) - from tax return or marriage certificate
    // ========================================================================
    // Handle Gemini format: spouse1FullName, spouse2FullName
    const spouse1FullName = getValue(extractedData, 'spouse1FullName', 'spouse1_full_name')
    const spouse2FullName = getValue(extractedData, 'spouse2FullName', 'spouse2_full_name')
    const spouseName = getValue(extractedData, 'spouseName', 'spouse_name')
    const spouse2Name = getValue(extractedData, 'spouse2Name', 'spouse2_name', 'spouse2Name')
    const legalNamesAtMarriage = extractedData.legalNamesAtMarriage

    // Determine which spouse name to use
    let spouse2FullNameToUse = spouse2FullName || spouse2Name || legalNamesAtMarriage?.spouse2
    
    // If we have spouse1FullName but no spouse2, check if spouse1 is different from primary
    if (spouse1FullName && !spouse2FullNameToUse) {
      const primaryFullName = existingData.personal_info 
        ? `${existingData.personal_info.first_name || ''} ${existingData.personal_info.last_name || ''}`.trim()
        : ''
      if (spouse1FullName !== primaryFullName) {
        spouse2FullNameToUse = spouse1FullName
      }
    }

    if (spouse2FullNameToUse || spouseName) {
      const spouseNameToUse = spouse2FullNameToUse || spouseName || spouse2Name || legalNamesAtMarriage?.spouse2
      if (spouseNameToUse && typeof spouseNameToUse === 'string') {
        const nameParts = spouseNameToUse.trim().split(/\s+/)
        if (nameParts.length >= 2) {
          // Always replace spouse info when found
          await updateSpouseInfo(validatedUserId, {
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' '),
          })
        }
      }
    }

    // ========================================================================
    // Children (from dependents in tax return)
    // ========================================================================
    if (extractedData.dependents && Array.isArray(extractedData.dependents)) {
      const children: Omit<ChildRow, 'id' | 'user_id' | 'last_updated'>[] = extractedData.dependents.map((dep: any) => ({
        full_name: dep.name || '',
        date_of_birth: dep.dateOfBirth || dep.date_of_birth || null,
        primary_residence_parent: null,
        legal_custody_type: null,
        physical_custody_type: null,
        overnights_with_spouse1: null,
        overnights_with_spouse2: null,
      }))
      await updateChildren(validatedUserId, children)
    }

    // ========================================================================
    // Income (Spouse 1)
    // ========================================================================
    const incomeData = extractedData.income || {}
    if (Object.keys(incomeData).length > 0 || extractedData.annualIncome || extractedData.wageIncome) {
      const incomeUpdates: Partial<IncomeRow> = {}

      if (!existingData.income.find((i) => i.spouse_number === 1)?.gross_annual_income) {
        incomeUpdates.gross_annual_income = getValue(
          extractedData,
          'annualIncome',
          'annual_income',
          'totalIncome',
          'total_income',
          'adjustedGrossIncome',
          'adjusted_gross_income',
          'agi',
          'AGI'
        ) as number | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.gross_monthly_income) {
        incomeUpdates.gross_monthly_income = getValue(
          extractedData,
          'monthlyIncome',
          'monthly_income',
          'grossPay',
          'gross_pay',
          'gross'
        ) as number | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.wage_income) {
        incomeUpdates.wage_income = getValue(extractedData, 'wageIncome', 'wage_income', 'wages', 'wage') as number | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.self_employment_income) {
        incomeUpdates.self_employment_income = getValue(
          extractedData,
          'selfEmploymentIncome',
          'self_employment_income',
          'netIncome'
        ) as number | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.investment_income) {
        incomeUpdates.investment_income = getValue(extractedData, 'investmentIncome', 'investment_income') as number | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.rental_income) {
        incomeUpdates.rental_income = getValue(extractedData, 'rentalIncome', 'rental_income') as number | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.total_income) {
        incomeUpdates.total_income = getValue(extractedData, 'totalIncome', 'total_income') as number | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.adjusted_gross_income) {
        incomeUpdates.adjusted_gross_income = getValue(
          extractedData,
          'adjustedGrossIncome',
          'adjusted_gross_income',
          'agi',
          'AGI'
        ) as number | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.pay_frequency) {
        incomeUpdates.pay_frequency = getValue(extractedData, 'payFrequency', 'pay_frequency') as
          | 'weekly'
          | 'biweekly'
          | 'monthly'
          | 'yearly'
          | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.overtime) {
        incomeUpdates.overtime = getValue(extractedData, 'overtime', 'ot') as number | null
      }
      if (!existingData.income.find((i) => i.spouse_number === 1)?.bonuses) {
        incomeUpdates.bonuses = getValue(extractedData, 'bonuses', 'bonus') as number | null
      }

      if (Object.keys(incomeUpdates).length > 0) {
        await updateIncome(validatedUserId, 1, incomeUpdates)
      }
    }

    // ========================================================================
    // Employers (Spouse 1)
    // ========================================================================
    if (extractedData.employers && Array.isArray(extractedData.employers)) {
      const employers: Omit<EmployerRow, 'id' | 'user_id' | 'spouse_number' | 'last_updated'>[] = extractedData.employers.map(
        (emp: any) => ({
          employer_name: emp.name || '',
          income_amount: emp.income || null,
          income_type: emp.incomeType || emp.income_type || null,
        })
      )
      await updateEmployers(validatedUserId, 1, employers)
    } else if (extractedData.employerName || extractedData.employer_name) {
      const employerName = getValue(extractedData, 'employerName', 'employer_name', 'employer', 'company', 'companyName')
      if (employerName) {
        await updateEmployers(validatedUserId, 1, [
          {
            employer_name: employerName as string,
            income_amount: null,
            income_type: null,
          },
        ])
      }
    }

    // ========================================================================
    // Expenses (Spouse 1)
    // ========================================================================
    const expensesData = extractedData.expenses || {}
    if (Object.keys(expensesData).length > 0) {
      const expenseUpdates: Partial<ExpenseRow> = {}

      if (!existingData.expenses.find((e) => e.spouse_number === 1)?.monthly_housing_cost) {
        expenseUpdates.monthly_housing_cost = expensesData.housing as number | null
      }
      if (!existingData.expenses.find((e) => e.spouse_number === 1)?.monthly_childcare_cost) {
        expenseUpdates.monthly_childcare_cost = expensesData.childcare as number | null
      }
      if (!existingData.expenses.find((e) => e.spouse_number === 1)?.monthly_utilities) {
        expenseUpdates.monthly_utilities = expensesData.utilities as number | null
      }
      if (!existingData.expenses.find((e) => e.spouse_number === 1)?.monthly_debt_payments) {
        expenseUpdates.monthly_debt_payments = expensesData.debt as number | null
      }
      if (!existingData.expenses.find((e) => e.spouse_number === 1)?.monthly_transportation) {
        expenseUpdates.monthly_transportation = expensesData.transportation as number | null
      }

      const insuranceData = extractedData.insurance || {}
      if (!existingData.expenses.find((e) => e.spouse_number === 1)?.monthly_health_insurance) {
        expenseUpdates.monthly_health_insurance = insuranceData.health as number | null
      }
      if (!existingData.expenses.find((e) => e.spouse_number === 1)?.monthly_insurance_premiums) {
        expenseUpdates.monthly_insurance_premiums = insuranceData.premiums as number | null
      }
      if (!existingData.expenses.find((e) => e.spouse_number === 1)?.monthly_payroll_deductions) {
        expenseUpdates.monthly_payroll_deductions = getValue(
          extractedData,
          'payrollDeductions',
          'payroll_deductions'
        ) as number | null
      }

      if (Object.keys(expenseUpdates).length > 0) {
        await updateExpenses(validatedUserId, 1, expenseUpdates)
      }
    }

    // ========================================================================
    // Assets
    // ========================================================================
    if (extractedData.assets && Array.isArray(extractedData.assets)) {
      const assets: Omit<AssetRow, 'id' | 'user_id' | 'last_updated'>[] = extractedData.assets.map((asset: any) => ({
        asset_type: asset.type || 'other',
        asset_name: asset.name || null,
        approximate_value: asset.value || null,
        ownership_type: null, // Manual entry
        bank_name: null,
        account_number: null,
      }))
      await updateAssets(validatedUserId, assets)
    }

    // Bank accounts as assets
    if (extractedData.bankAccounts && Array.isArray(extractedData.bankAccounts)) {
      const bankAssets: Omit<AssetRow, 'id' | 'user_id' | 'last_updated'>[] = extractedData.bankAccounts.map((account: any) => ({
        asset_type: 'bank_account',
        asset_name: account.bankName || null,
        approximate_value: account.balance || null,
        ownership_type: null,
        bank_name: account.bankName || null,
        account_number: account.accountNumber || null,
      }))
      const existingAssets = existingData.assets || []
      await updateAssets(validatedUserId, [...existingAssets, ...bankAssets])
    } else if (extractedData.bankName || extractedData.balance) {
      const bankAsset: Omit<AssetRow, 'id' | 'user_id' | 'last_updated'> = {
        asset_type: 'bank_account',
        asset_name: getValue(extractedData, 'bankName', 'bank_name', 'bank') as string | null,
        approximate_value: getValue(extractedData, 'balance', 'accountBalance', 'currentBalance') as number | null,
        ownership_type: null,
        bank_name: getValue(extractedData, 'bankName', 'bank_name', 'bank') as string | null,
        account_number: getValue(extractedData, 'accountNumber', 'account_number') as string | null,
      }
      const existingAssets = existingData.assets || []
      await updateAssets(validatedUserId, [...existingAssets, bankAsset])
    }

    // ========================================================================
    // Debts
    // ========================================================================
    if (extractedData.debts && Array.isArray(extractedData.debts)) {
      const debts: Omit<DebtRow, 'id' | 'user_id' | 'last_updated'>[] = extractedData.debts.map((debt: any) => ({
        debt_type: debt.type || 'other',
        creditor_name: debt.creditorName || debt.creditor_name || null,
        approximate_balance: debt.amount || debt.balance || null,
        monthly_payment: debt.monthlyPayment || debt.monthly_payment || null,
      }))
      await updateDebts(validatedUserId, debts)
    }

    // ========================================================================
    // Marriage Info
    // ========================================================================
    if (extractedData.marriageDate || extractedData.marriagePlace || legalNamesAtMarriage) {
      const marriageUpdates: Partial<MarriageInfoRow> = {}

      if (!existingData.marriage_info?.marriage_date) {
        const marriageDate = getValue(extractedData, 'marriageDate', 'marriage_date')
        marriageUpdates.marriage_date = marriageDate ? (typeof marriageDate === 'string' ? marriageDate : marriageDate.toString()) : null
      }
      if (!existingData.marriage_info?.marriage_place) {
        marriageUpdates.marriage_place = getValue(extractedData, 'marriagePlace', 'marriage_place') as string | null
      }
      if (legalNamesAtMarriage) {
        if (!existingData.marriage_info?.spouse1_name_at_marriage) {
          marriageUpdates.spouse1_name_at_marriage = legalNamesAtMarriage.spouse1 || null
        }
        if (!existingData.marriage_info?.spouse2_name_at_marriage) {
          marriageUpdates.spouse2_name_at_marriage = legalNamesAtMarriage.spouse2 || null
        }
      }
      if (extractedData.maidenNames && Array.isArray(extractedData.maidenNames)) {
        if (!existingData.marriage_info?.maiden_names || existingData.marriage_info.maiden_names.length === 0) {
          marriageUpdates.maiden_names = extractedData.maidenNames
        }
      }

      if (Object.keys(marriageUpdates).length > 0) {
        await updateMarriageInfo(validatedUserId, marriageUpdates)
      }
    }

    // ========================================================================
    // Court Info
    // ========================================================================
    if (
      extractedData.hasPriorOrders !== undefined ||
      extractedData.orderTypes ||
      extractedData.jurisdictions ||
      extractedData.hasDomesticViolence !== undefined
    ) {
      const courtUpdates: Partial<CourtInfoRow> = {}

      if (existingData.court_info?.has_prior_orders === null || existingData.court_info?.has_prior_orders === undefined) {
        courtUpdates.has_prior_orders = extractedData.hasPriorOrders as boolean | null
      }
      if (extractedData.orderTypes && Array.isArray(extractedData.orderTypes)) {
        if (!existingData.court_info?.order_types || existingData.court_info.order_types.length === 0) {
          courtUpdates.order_types = extractedData.orderTypes
        }
      }
      if (extractedData.jurisdictions && Array.isArray(extractedData.jurisdictions)) {
        if (!existingData.court_info?.jurisdictions || existingData.court_info.jurisdictions.length === 0) {
          courtUpdates.jurisdictions = extractedData.jurisdictions
        }
      }
      if (extractedData.custodyConstraints && Array.isArray(extractedData.custodyConstraints)) {
        if (!existingData.court_info?.custody_constraints || existingData.court_info.custody_constraints.length === 0) {
          courtUpdates.custody_constraints = extractedData.custodyConstraints
        }
      }
      if (existingData.court_info?.has_domestic_violence === null || existingData.court_info?.has_domestic_violence === undefined) {
        courtUpdates.has_domestic_violence = extractedData.hasDomesticViolence as boolean | null
      }

      // Set has_minor_children based on children count
      const childrenCount = existingData.children?.length || 0
      if (childrenCount > 0) {
        courtUpdates.has_minor_children = true
      }

      if (Object.keys(courtUpdates).length > 0) {
        await updateCourtInfo(validatedUserId, courtUpdates)
      }
    }

    logger.debug('Successfully migrated extracted data to normalized tables')
  } catch (error) {
    logger.error('Error migrating extracted data:', error)
    throw error
  }
}

/**
 * Re-aggregate all form data from all remaining documents for a user
 * This is called when a document is deleted or replaced to ensure data consistency
 */
export async function reAggregateFormDataFromDocuments(userId: string): Promise<void> {
  try {
    const validatedUserId = validateUserId(userId)

    // Get all documents for this user
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, document_type')
      .eq('user_id', validatedUserId)
      .eq('status', 'processed')
      .order('uploaded_at', { ascending: false })

    if (docsError) throw docsError

    if (!documents || documents.length === 0) {
      logger.debug('No documents found, clearing normalized tables')
      // Clear all normalized data if no documents remain
      await Promise.all([
        supabase.from('personal_info').delete().eq('user_id', validatedUserId),
        supabase.from('spouse_info').delete().eq('user_id', validatedUserId),
        supabase.from('children').delete().eq('user_id', validatedUserId),
        supabase.from('income').delete().eq('user_id', validatedUserId),
        supabase.from('employers').delete().eq('user_id', validatedUserId),
        supabase.from('expenses').delete().eq('user_id', validatedUserId),
        supabase.from('assets').delete().eq('user_id', validatedUserId),
        supabase.from('debts').delete().eq('user_id', validatedUserId),
        supabase.from('marriage_info').delete().eq('user_id', validatedUserId),
        supabase.from('court_info').delete().eq('user_id', validatedUserId),
      ])
      return
    }

    // Get all extracted_data for these documents
    const documentIds = documents.map(d => d.id)
    const { data: extractedDataRecords, error: dataError } = await supabase
      .from('extracted_data')
      .select('id, document_id, data')
      .in('document_id', documentIds)

    if (dataError) throw dataError

    if (!extractedDataRecords || extractedDataRecords.length === 0) {
      logger.debug('No extracted data found')
      return
    }

    // Clear existing normalized data
    await Promise.all([
      supabase.from('personal_info').delete().eq('user_id', validatedUserId),
      supabase.from('spouse_info').delete().eq('user_id', validatedUserId),
      supabase.from('children').delete().eq('user_id', validatedUserId),
      supabase.from('income').delete().eq('user_id', validatedUserId),
      supabase.from('employers').delete().eq('user_id', validatedUserId),
      supabase.from('expenses').delete().eq('user_id', validatedUserId),
      supabase.from('assets').delete().eq('user_id', validatedUserId),
      supabase.from('debts').delete().eq('user_id', validatedUserId),
      supabase.from('marriage_info').delete().eq('user_id', validatedUserId),
      supabase.from('court_info').delete().eq('user_id', validatedUserId),
    ])

    // Re-migrate all extracted data (process in reverse order so newest overwrites oldest)
    // This ensures the most recent document's data takes precedence
    const sortedRecords = extractedDataRecords.sort((a, b) => {
      const docA = documents.find(d => d.id === a.document_id)
      const docB = documents.find(d => d.id === b.document_id)
      return 0 // We'll process in document upload order (newest first from query)
    })

    logger.debug(`Re-migrating ${sortedRecords.length} extracted data records`)
    for (const record of sortedRecords.reverse()) { // Process oldest first, newest last (so newest overwrites)
      const doc = documents.find(d => d.id === record.document_id)
      if (doc && record.data) {
        await migrateFromExtractedData(validatedUserId, record.data, doc.document_type)
      }
    }

    logger.debug('Re-aggregation complete')
  } catch (error) {
    logger.error('Error re-aggregating form data:', error)
    throw error
  }
}

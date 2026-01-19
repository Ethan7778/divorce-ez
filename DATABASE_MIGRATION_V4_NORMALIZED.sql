-- Database Migration V4 - Normalized Structure
-- Migrates from JSONB-based form_data to normalized relational tables
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create Normalized Tables
-- ============================================================================

-- Personal Information Table (Primary Spouse - Spouse 1)
CREATE TABLE IF NOT EXISTS personal_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Name
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  ssn_last_4 TEXT, -- Only store last 4 digits for security
  
  -- Driver's License
  driver_license_number TEXT,
  driver_license_state TEXT,
  
  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip_code TEXT,
  
  -- Contact (manual entry typically)
  email TEXT,
  phone TEXT,
  
  -- Utah Residency (manual entry)
  utah_residency_years INTEGER,
  
  -- Filing Status (from tax return)
  filing_status TEXT, -- 'single', 'married_joint', 'married_separate', 'head_of_household'
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Spouse Information Table (Spouse 2)
CREATE TABLE IF NOT EXISTS spouse_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Name
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  ssn_last_4 TEXT,
  
  -- Driver's License
  driver_license_number TEXT,
  driver_license_state TEXT,
  
  -- Address (if different from primary spouse)
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip_code TEXT,
  
  -- Contact
  email TEXT,
  phone TEXT,
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Children Table (one row per child)
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  
  -- Custody Information (manual entry)
  primary_residence_parent TEXT, -- 'spouse1' or 'spouse2'
  legal_custody_type TEXT, -- 'sole' or 'joint'
  physical_custody_type TEXT, -- 'sole' or 'joint'
  overnights_with_spouse1 INTEGER,
  overnights_with_spouse2 INTEGER,
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Income Table (one row per spouse)
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spouse_number INTEGER NOT NULL CHECK (spouse_number IN (1, 2)),
  
  -- Income amounts
  gross_monthly_income DECIMAL(10,2),
  gross_annual_income DECIMAL(10,2),
  
  -- Income breakdown
  wage_income DECIMAL(10,2),
  self_employment_income DECIMAL(10,2),
  investment_income DECIMAL(10,2),
  rental_income DECIMAL(10,2),
  
  -- Tax return specific
  total_income DECIMAL(10,2), -- Line 9
  adjusted_gross_income DECIMAL(10,2), -- Line 11 (AGI)
  
  -- Income type and frequency
  income_type TEXT, -- 'employment', 'self_employed', 'benefits', 'mixed'
  pay_frequency TEXT, -- 'weekly', 'biweekly', 'monthly', 'yearly'
  
  -- Additional income
  overtime DECIMAL(10,2),
  bonuses DECIMAL(10,2),
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  UNIQUE(user_id, spouse_number)
);

-- Employers Table (one row per employer)
CREATE TABLE IF NOT EXISTS employers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spouse_number INTEGER NOT NULL CHECK (spouse_number IN (1, 2)),
  
  employer_name TEXT NOT NULL,
  income_amount DECIMAL(10,2),
  income_type TEXT, -- 'wage', 'self_employment', etc.
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Expenses Table (one row per spouse)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spouse_number INTEGER NOT NULL CHECK (spouse_number IN (1, 2)),
  
  monthly_housing_cost DECIMAL(10,2), -- rent/mortgage
  monthly_childcare_cost DECIMAL(10,2),
  monthly_utilities DECIMAL(10,2),
  monthly_debt_payments DECIMAL(10,2),
  monthly_transportation DECIMAL(10,2),
  
  -- Insurance
  monthly_health_insurance DECIMAL(10,2),
  monthly_insurance_premiums DECIMAL(10,2),
  
  -- Payroll deductions
  monthly_payroll_deductions DECIMAL(10,2),
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  UNIQUE(user_id, spouse_number)
);

-- Assets Table (one row per asset)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  asset_type TEXT NOT NULL, -- 'bank_account', 'vehicle', 'home', 'retirement', 'investment', 'other'
  asset_name TEXT, -- e.g., "Chase Checking", "2019 Honda Accord", "401k"
  approximate_value DECIMAL(10,2),
  ownership_type TEXT, -- 'joint' or 'separate' (manual entry)
  
  -- For bank accounts
  bank_name TEXT,
  account_number TEXT, -- Last 4 digits only for security
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Debts Table (one row per debt)
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  debt_type TEXT NOT NULL, -- 'credit_card', 'mortgage', 'loan', 'student_loan', 'other'
  creditor_name TEXT,
  approximate_balance DECIMAL(10,2),
  monthly_payment DECIMAL(10,2),
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Marriage Information Table
CREATE TABLE IF NOT EXISTS marriage_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  marriage_date DATE,
  marriage_place TEXT,
  date_of_separation DATE, -- Manual entry
  
  -- Legal names at time of marriage
  spouse1_name_at_marriage TEXT,
  spouse2_name_at_marriage TEXT,
  maiden_names TEXT[], -- Array of maiden names
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Court Information Table
CREATE TABLE IF NOT EXISTS court_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  case_type TEXT DEFAULT 'divorce',
  county TEXT,
  judicial_district TEXT,
  is_contested BOOLEAN, -- Manual entry
  has_minor_children BOOLEAN,
  
  -- Support requests (manual entry)
  requesting_child_support BOOLEAN,
  requesting_alimony BOOLEAN,
  
  -- Prior orders
  has_prior_orders BOOLEAN,
  order_types TEXT[], -- Array: ['custody', 'support', 'protective']
  jurisdictions TEXT[], -- Array of jurisdiction names
  custody_constraints TEXT[], -- Array: ['sole custody', 'joint custody', 'visitation rights']
  has_domestic_violence BOOLEAN,
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- STEP 2: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_personal_info_user_id ON personal_info(user_id);
CREATE INDEX IF NOT EXISTS idx_spouse_info_user_id ON spouse_info(user_id);
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_income_user_spouse ON income(user_id, spouse_number);
CREATE INDEX IF NOT EXISTS idx_employers_user_id ON employers(user_id);
CREATE INDEX IF NOT EXISTS idx_employers_user_spouse ON employers(user_id, spouse_number);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_spouse ON expenses(user_id, spouse_number);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_marriage_info_user_id ON marriage_info(user_id);
CREATE INDEX IF NOT EXISTS idx_court_info_user_id ON court_info(user_id);

-- ============================================================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE personal_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE spouse_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marriage_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_info ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS Policies
-- ============================================================================

-- Personal Info Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personal_info' AND policyname = 'Users can view their own personal info') THEN
    CREATE POLICY "Users can view their own personal info" ON personal_info
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personal_info' AND policyname = 'Users can insert their own personal info') THEN
    CREATE POLICY "Users can insert their own personal info" ON personal_info
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personal_info' AND policyname = 'Users can update their own personal info') THEN
    CREATE POLICY "Users can update their own personal info" ON personal_info
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personal_info' AND policyname = 'Users can delete their own personal info') THEN
    CREATE POLICY "Users can delete their own personal info" ON personal_info
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Spouse Info Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'spouse_info' AND policyname = 'Users can view their own spouse info') THEN
    CREATE POLICY "Users can view their own spouse info" ON spouse_info
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'spouse_info' AND policyname = 'Users can insert their own spouse info') THEN
    CREATE POLICY "Users can insert their own spouse info" ON spouse_info
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'spouse_info' AND policyname = 'Users can update their own spouse info') THEN
    CREATE POLICY "Users can update their own spouse info" ON spouse_info
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'spouse_info' AND policyname = 'Users can delete their own spouse info') THEN
    CREATE POLICY "Users can delete their own spouse info" ON spouse_info
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Children Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'Users can view their own children') THEN
    CREATE POLICY "Users can view their own children" ON children
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'Users can insert their own children') THEN
    CREATE POLICY "Users can insert their own children" ON children
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'Users can update their own children') THEN
    CREATE POLICY "Users can update their own children" ON children
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'Users can delete their own children') THEN
    CREATE POLICY "Users can delete their own children" ON children
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Income Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income' AND policyname = 'Users can view their own income') THEN
    CREATE POLICY "Users can view their own income" ON income
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income' AND policyname = 'Users can insert their own income') THEN
    CREATE POLICY "Users can insert their own income" ON income
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income' AND policyname = 'Users can update their own income') THEN
    CREATE POLICY "Users can update their own income" ON income
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income' AND policyname = 'Users can delete their own income') THEN
    CREATE POLICY "Users can delete their own income" ON income
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Employers Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employers' AND policyname = 'Users can view their own employers') THEN
    CREATE POLICY "Users can view their own employers" ON employers
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employers' AND policyname = 'Users can insert their own employers') THEN
    CREATE POLICY "Users can insert their own employers" ON employers
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employers' AND policyname = 'Users can update their own employers') THEN
    CREATE POLICY "Users can update their own employers" ON employers
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employers' AND policyname = 'Users can delete their own employers') THEN
    CREATE POLICY "Users can delete their own employers" ON employers
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Expenses Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can view their own expenses') THEN
    CREATE POLICY "Users can view their own expenses" ON expenses
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can insert their own expenses') THEN
    CREATE POLICY "Users can insert their own expenses" ON expenses
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can update their own expenses') THEN
    CREATE POLICY "Users can update their own expenses" ON expenses
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can delete their own expenses') THEN
    CREATE POLICY "Users can delete their own expenses" ON expenses
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Assets Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'Users can view their own assets') THEN
    CREATE POLICY "Users can view their own assets" ON assets
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'Users can insert their own assets') THEN
    CREATE POLICY "Users can insert their own assets" ON assets
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'Users can update their own assets') THEN
    CREATE POLICY "Users can update their own assets" ON assets
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'Users can delete their own assets') THEN
    CREATE POLICY "Users can delete their own assets" ON assets
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Debts Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'debts' AND policyname = 'Users can view their own debts') THEN
    CREATE POLICY "Users can view their own debts" ON debts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'debts' AND policyname = 'Users can insert their own debts') THEN
    CREATE POLICY "Users can insert their own debts" ON debts
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'debts' AND policyname = 'Users can update their own debts') THEN
    CREATE POLICY "Users can update their own debts" ON debts
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'debts' AND policyname = 'Users can delete their own debts') THEN
    CREATE POLICY "Users can delete their own debts" ON debts
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Marriage Info Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marriage_info' AND policyname = 'Users can view their own marriage info') THEN
    CREATE POLICY "Users can view their own marriage info" ON marriage_info
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marriage_info' AND policyname = 'Users can insert their own marriage info') THEN
    CREATE POLICY "Users can insert their own marriage info" ON marriage_info
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marriage_info' AND policyname = 'Users can update their own marriage info') THEN
    CREATE POLICY "Users can update their own marriage info" ON marriage_info
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marriage_info' AND policyname = 'Users can delete their own marriage info') THEN
    CREATE POLICY "Users can delete their own marriage info" ON marriage_info
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Court Info Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'court_info' AND policyname = 'Users can view their own court info') THEN
    CREATE POLICY "Users can view their own court info" ON court_info
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'court_info' AND policyname = 'Users can insert their own court info') THEN
    CREATE POLICY "Users can insert their own court info" ON court_info
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'court_info' AND policyname = 'Users can update their own court info') THEN
    CREATE POLICY "Users can update their own court info" ON court_info
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'court_info' AND policyname = 'Users can delete their own court info') THEN
    CREATE POLICY "Users can delete their own court info" ON court_info
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Data Migration Function
-- Migrates existing JSONB data from form_data to normalized tables
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_form_data_to_normalized()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  form_record RECORD;
  personal_data JSONB;
  financial_data JSONB;
  marriage_data JSONB;
  court_data JSONB;
  dependent_record JSONB;
  employer_record JSONB;
  asset_record JSONB;
  debt_record JSONB;
  spouse_name TEXT;
  spouse_name_parts TEXT[];
BEGIN
  -- Loop through all form_data records
  FOR form_record IN SELECT * FROM form_data LOOP
    personal_data := COALESCE(form_record.personal_info, '{}'::jsonb);
    financial_data := COALESCE(form_record.financial_info, '{}'::jsonb);
    marriage_data := COALESCE(form_record.marriage_info, '{}'::jsonb);
    court_data := COALESCE(form_record.court_info, '{}'::jsonb);
    
    -- Migrate Personal Info
    INSERT INTO personal_info (
      user_id,
      first_name,
      middle_name,
      last_name,
      date_of_birth,
      ssn_last_4,
      driver_license_number,
      driver_license_state,
      address_street,
      address_city,
      address_state,
      address_zip_code,
      email,
      phone,
      filing_status
    ) VALUES (
      form_record.user_id,
      personal_data->>'firstName',
      personal_data->>'middleName',
      personal_data->>'lastName',
      CASE WHEN personal_data->>'dateOfBirth' IS NOT NULL 
        THEN (personal_data->>'dateOfBirth')::DATE 
        ELSE NULL END,
      personal_data->>'ssnLast4',
      personal_data->>'driverLicenseNumber',
      personal_data->>'driverLicenseState',
      personal_data->'address'->>'street',
      personal_data->'address'->>'city',
      personal_data->'address'->>'state',
      personal_data->'address'->>'zipCode',
      personal_data->>'email',
      personal_data->>'phone',
      personal_data->>'filingStatus'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      middle_name = EXCLUDED.middle_name,
      last_name = EXCLUDED.last_name,
      date_of_birth = EXCLUDED.date_of_birth,
      ssn_last_4 = EXCLUDED.ssn_last_4,
      driver_license_number = EXCLUDED.driver_license_number,
      driver_license_state = EXCLUDED.driver_license_state,
      address_street = EXCLUDED.address_street,
      address_city = EXCLUDED.address_city,
      address_state = EXCLUDED.address_state,
      address_zip_code = EXCLUDED.address_zip_code,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      filing_status = EXCLUDED.filing_status,
      last_updated = now();
    
    -- Migrate Spouse Info (if spouse name exists)
    spouse_name := COALESCE(personal_data->>'spouseName', marriage_data->'legalNamesAtMarriage'->>'spouse2');
    IF spouse_name IS NOT NULL THEN
      spouse_name_parts := string_to_array(trim(spouse_name), ' ');
      INSERT INTO spouse_info (
        user_id,
        first_name,
        last_name,
        date_of_birth,
        ssn_last_4
      ) VALUES (
        form_record.user_id,
        spouse_name_parts[1],
        array_to_string(spouse_name_parts[2:array_length(spouse_name_parts, 1)], ' '),
        NULL, -- DOB not typically in spouse name
        NULL  -- SSN not typically available for spouse
      )
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        last_updated = now();
    END IF;
    
    -- Migrate Children (dependents)
    IF personal_data->'dependents' IS NOT NULL THEN
      FOR dependent_record IN SELECT * FROM jsonb_array_elements(personal_data->'dependents') LOOP
        INSERT INTO children (
          user_id,
          full_name,
          date_of_birth
        ) VALUES (
          form_record.user_id,
          dependent_record->>'name',
          CASE WHEN dependent_record->>'dateOfBirth' IS NOT NULL 
            THEN (dependent_record->>'dateOfBirth')::DATE 
            ELSE NULL END
        );
      END LOOP;
    END IF;
    
    -- Migrate Income (Spouse 1)
    IF financial_data->'income' IS NOT NULL THEN
      INSERT INTO income (
        user_id,
        spouse_number,
        gross_monthly_income,
        gross_annual_income,
        wage_income,
        self_employment_income,
        investment_income,
        rental_income,
        total_income,
        adjusted_gross_income,
        income_type,
        pay_frequency,
        overtime,
        bonuses
      ) VALUES (
        form_record.user_id,
        1,
        (financial_data->'income'->>'monthly')::DECIMAL,
        (financial_data->'income'->>'annual')::DECIMAL,
        (financial_data->'income'->>'wage')::DECIMAL,
        (financial_data->'income'->>'selfEmployment')::DECIMAL,
        (financial_data->'income'->>'investment')::DECIMAL,
        (financial_data->'income'->>'rental')::DECIMAL,
        (financial_data->'income'->>'totalIncome')::DECIMAL,
        (financial_data->'income'->>'adjustedGrossIncome')::DECIMAL,
        NULL, -- income_type not in old structure
        financial_data->'income'->>'payFrequency',
        (financial_data->>'overtime')::DECIMAL,
        (financial_data->>'bonuses')::DECIMAL
      )
      ON CONFLICT (user_id, spouse_number) DO UPDATE SET
        gross_monthly_income = EXCLUDED.gross_monthly_income,
        gross_annual_income = EXCLUDED.gross_annual_income,
        wage_income = EXCLUDED.wage_income,
        self_employment_income = EXCLUDED.self_employment_income,
        investment_income = EXCLUDED.investment_income,
        rental_income = EXCLUDED.rental_income,
        total_income = EXCLUDED.total_income,
        adjusted_gross_income = EXCLUDED.adjusted_gross_income,
        pay_frequency = EXCLUDED.pay_frequency,
        overtime = EXCLUDED.overtime,
        bonuses = EXCLUDED.bonuses,
        last_updated = now();
    END IF;
    
    -- Migrate Employers (Spouse 1)
    IF financial_data->'employers' IS NOT NULL THEN
      FOR employer_record IN SELECT * FROM jsonb_array_elements(financial_data->'employers') LOOP
        INSERT INTO employers (
          user_id,
          spouse_number,
          employer_name,
          income_amount
        ) VALUES (
          form_record.user_id,
          1,
          employer_record->>'name',
          (employer_record->>'income')::DECIMAL
        );
      END LOOP;
    END IF;
    
    -- Migrate Expenses (Spouse 1)
    IF financial_data->'expenses' IS NOT NULL THEN
      INSERT INTO expenses (
        user_id,
        spouse_number,
        monthly_housing_cost,
        monthly_childcare_cost,
        monthly_utilities,
        monthly_debt_payments,
        monthly_transportation,
        monthly_health_insurance,
        monthly_insurance_premiums,
        monthly_payroll_deductions
      ) VALUES (
        form_record.user_id,
        1,
        (financial_data->'expenses'->>'housing')::DECIMAL,
        (financial_data->'expenses'->>'childcare')::DECIMAL,
        (financial_data->'expenses'->>'utilities')::DECIMAL,
        (financial_data->'expenses'->>'debt')::DECIMAL,
        (financial_data->'expenses'->>'transportation')::DECIMAL,
        (financial_data->'insurance'->>'health')::DECIMAL,
        (financial_data->'insurance'->>'premiums')::DECIMAL,
        (financial_data->>'payrollDeductions')::DECIMAL
      )
      ON CONFLICT (user_id, spouse_number) DO UPDATE SET
        monthly_housing_cost = EXCLUDED.monthly_housing_cost,
        monthly_childcare_cost = EXCLUDED.monthly_childcare_cost,
        monthly_utilities = EXCLUDED.monthly_utilities,
        monthly_debt_payments = EXCLUDED.monthly_debt_payments,
        monthly_transportation = EXCLUDED.monthly_transportation,
        monthly_health_insurance = EXCLUDED.monthly_health_insurance,
        monthly_insurance_premiums = EXCLUDED.monthly_insurance_premiums,
        monthly_payroll_deductions = EXCLUDED.monthly_payroll_deductions,
        last_updated = now();
    END IF;
    
    -- Migrate Assets
    IF financial_data->'assets' IS NOT NULL THEN
      FOR asset_record IN SELECT * FROM jsonb_array_elements(financial_data->'assets') LOOP
        INSERT INTO assets (
          user_id,
          asset_type,
          asset_name,
          approximate_value
        ) VALUES (
          form_record.user_id,
          asset_record->>'type',
          NULL, -- asset_name not in old structure
          (asset_record->>'value')::DECIMAL
        );
      END LOOP;
    END IF;
    
    -- Migrate Bank Accounts as Assets
    IF financial_data->'bankAccounts' IS NOT NULL THEN
      FOR asset_record IN SELECT * FROM jsonb_array_elements(financial_data->'bankAccounts') LOOP
        INSERT INTO assets (
          user_id,
          asset_type,
          asset_name,
          approximate_value,
          bank_name,
          account_number
        ) VALUES (
          form_record.user_id,
          'bank_account',
          asset_record->>'bankName',
          (asset_record->>'balance')::DECIMAL,
          asset_record->>'bankName',
          asset_record->>'accountNumber'
        );
      END LOOP;
    END IF;
    
    -- Migrate Debts
    IF financial_data->'debts' IS NOT NULL THEN
      FOR debt_record IN SELECT * FROM jsonb_array_elements(financial_data->'debts') LOOP
        INSERT INTO debts (
          user_id,
          debt_type,
          creditor_name,
          approximate_balance,
          monthly_payment
        ) VALUES (
          form_record.user_id,
          debt_record->>'type',
          NULL, -- creditor_name not in old structure
          (debt_record->>'amount')::DECIMAL,
          NULL  -- monthly_payment not in old structure
        );
      END LOOP;
    END IF;
    
    -- Migrate Marriage Info
    INSERT INTO marriage_info (
      user_id,
      marriage_date,
      marriage_place,
      spouse1_name_at_marriage,
      spouse2_name_at_marriage,
      maiden_names
    ) VALUES (
      form_record.user_id,
      CASE WHEN COALESCE(personal_data->>'marriageDate', marriage_data->>'marriageDate') IS NOT NULL 
        THEN (COALESCE(personal_data->>'marriageDate', marriage_data->>'marriageDate'))::DATE 
        ELSE NULL END,
      COALESCE(personal_data->>'marriagePlace', marriage_data->>'marriagePlace'),
      marriage_data->'legalNamesAtMarriage'->>'spouse1',
      marriage_data->'legalNamesAtMarriage'->>'spouse2',
      CASE WHEN marriage_data->'maidenNames' IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(marriage_data->'maidenNames'))
        ELSE NULL END
    )
    ON CONFLICT (user_id) DO UPDATE SET
      marriage_date = EXCLUDED.marriage_date,
      marriage_place = EXCLUDED.marriage_place,
      spouse1_name_at_marriage = EXCLUDED.spouse1_name_at_marriage,
      spouse2_name_at_marriage = EXCLUDED.spouse2_name_at_marriage,
      maiden_names = EXCLUDED.maiden_names,
      last_updated = now();
    
    -- Migrate Court Info
    INSERT INTO court_info (
      user_id,
      case_type,
      has_minor_children,
      has_prior_orders,
      order_types,
      jurisdictions,
      custody_constraints,
      has_domestic_violence
    ) VALUES (
      form_record.user_id,
      'divorce',
      CASE WHEN personal_data->'dependents' IS NOT NULL 
        AND jsonb_array_length(personal_data->'dependents') > 0 
        THEN TRUE ELSE FALSE END,
      (court_data->>'hasPriorOrders')::BOOLEAN,
      CASE WHEN court_data->'orderTypes' IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(court_data->'orderTypes'))
        ELSE NULL END,
      CASE WHEN court_data->'jurisdictions' IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(court_data->'jurisdictions'))
        ELSE NULL END,
      CASE WHEN court_data->'custodyConstraints' IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(court_data->'custodyConstraints'))
        ELSE NULL END,
      (court_data->>'hasDomesticViolence')::BOOLEAN
    )
    ON CONFLICT (user_id) DO UPDATE SET
      has_minor_children = EXCLUDED.has_minor_children,
      has_prior_orders = EXCLUDED.has_prior_orders,
      order_types = EXCLUDED.order_types,
      jurisdictions = EXCLUDED.jurisdictions,
      custody_constraints = EXCLUDED.custody_constraints,
      has_domestic_violence = EXCLUDED.has_domestic_violence,
      last_updated = now();
    
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END;
$$;

-- ============================================================================
-- STEP 6: Run Migration (Uncomment to execute)
-- ============================================================================

-- SELECT migrate_form_data_to_normalized();

-- ============================================================================
-- STEP 7: Verification Query
-- ============================================================================

-- Uncomment to verify migration:
-- SELECT 
--   (SELECT COUNT(*) FROM personal_info) as personal_info_count,
--   (SELECT COUNT(*) FROM spouse_info) as spouse_info_count,
--   (SELECT COUNT(*) FROM children) as children_count,
--   (SELECT COUNT(*) FROM income) as income_count,
--   (SELECT COUNT(*) FROM employers) as employers_count,
--   (SELECT COUNT(*) FROM expenses) as expenses_count,
--   (SELECT COUNT(*) FROM assets) as assets_count,
--   (SELECT COUNT(*) FROM debts) as debts_count,
--   (SELECT COUNT(*) FROM marriage_info) as marriage_info_count,
--   (SELECT COUNT(*) FROM court_info) as court_info_count;

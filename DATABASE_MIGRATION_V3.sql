-- Database Migration V3 - Complete Schema Verification and Fixes
-- Run this in Supabase SQL Editor to ensure all required columns exist

-- Ensure form_data table has all required columns
DO $$ 
BEGIN
  -- Add marriage_info column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_data' AND column_name = 'marriage_info'
  ) THEN
    ALTER TABLE form_data 
    ADD COLUMN marriage_info JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added marriage_info column to form_data';
  END IF;

  -- Add court_info column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_data' AND column_name = 'court_info'
  ) THEN
    ALTER TABLE form_data 
    ADD COLUMN court_info JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added court_info column to form_data';
  END IF;

  -- Ensure personal_info column exists (should already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_data' AND column_name = 'personal_info'
  ) THEN
    ALTER TABLE form_data 
    ADD COLUMN personal_info JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added personal_info column to form_data';
  END IF;

  -- Ensure financial_info column exists (should already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_data' AND column_name = 'financial_info'
  ) THEN
    ALTER TABLE form_data 
    ADD COLUMN financial_info JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added financial_info column to form_data';
  END IF;
END $$;

-- Update document type comment to include all types
COMMENT ON COLUMN documents.document_type IS 
  'Document type: driversLicense, taxReturn, payStub, bankStatement, w2, 1099, marriageCertificate, priorCourtOrder, profitAndLoss';

-- Verify extracted_data table structure
DO $$
BEGIN
  -- Ensure data column exists and is JSONB
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'extracted_data' AND column_name = 'data'
  ) THEN
    ALTER TABLE extracted_data 
    ADD COLUMN data JSONB NOT NULL DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added data column to extracted_data';
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_form_data_user_id ON form_data(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_document_id ON extracted_data(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

-- Verify RLS is enabled
ALTER TABLE form_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Ensure RLS policies exist for form_data
DO $$
BEGIN
  -- Check if policies exist, if not create them
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_data' AND policyname = 'Users can view their own form data'
  ) THEN
    CREATE POLICY "Users can view their own form data" ON form_data
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_data' AND policyname = 'Users can insert their own form data'
  ) THEN
    CREATE POLICY "Users can insert their own form data" ON form_data
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_data' AND policyname = 'Users can update their own form data'
  ) THEN
    CREATE POLICY "Users can update their own form data" ON form_data
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_data' AND policyname = 'Users can delete their own form data'
  ) THEN
    CREATE POLICY "Users can delete their own form data" ON form_data
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Display current schema
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('form_data', 'extracted_data', 'documents')
ORDER BY table_name, ordinal_position
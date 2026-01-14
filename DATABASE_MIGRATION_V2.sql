-- Database Migration V2 - Enhanced Document Processing
-- Run this in Supabase SQL Editor after the initial migration

-- Add new JSONB columns to form_data table for marriage and court information
ALTER TABLE form_data 
ADD COLUMN IF NOT EXISTS marriage_info JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS court_info JSONB DEFAULT '{}'::jsonb;

-- Update document type comment to include new types
COMMENT ON COLUMN documents.document_type IS 
  'Document type: driversLicense, taxReturn, payStub, bankStatement, w2, 1099, marriageCertificate, priorCourtOrder, profitAndLoss';

-- Database Migration for Divorce EZ Platform
-- Run this in Supabase SQL Editor

-- Create tables
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT, -- Path in Supabase Storage (optional if using browser OCR)
  document_type TEXT NOT NULL, -- 'driversLicense', 'taxReturn', 'payStub', 'bankStatement', 'w2', '1099'
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  status TEXT DEFAULT 'uploaded' NOT NULL, -- 'uploaded', 'processing', 'processed', 'failed'
  extracted_data_id UUID REFERENCES extracted_data(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS extracted_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL, -- Store extracted key-value pairs
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_name TEXT NOT NULL, -- 'module_document_upload', 'module_personal_info', etc.
  status TEXT DEFAULT 'not_started' NOT NULL, -- 'not_started', 'in_progress', 'completed'
  progress_percentage INTEGER DEFAULT 0 NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, module_name)
);

CREATE TABLE IF NOT EXISTS form_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  personal_info JSONB DEFAULT '{}'::jsonb,
  financial_info JSONB DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents table
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for extracted_data table
CREATE POLICY "Users can view their own extracted data" ON extracted_data
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));

CREATE POLICY "Users can insert their own extracted data" ON extracted_data
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));

CREATE POLICY "Users can update their own extracted data" ON extracted_data
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));

CREATE POLICY "Users can delete their own extracted data" ON extracted_data
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));

-- RLS policies for user_progress table
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON user_progress
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for form_data table
CREATE POLICY "Users can view their own form data" ON form_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own form data" ON form_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form data" ON form_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own form data" ON form_data
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_document_id ON extracted_data(document_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_form_data_user_id ON form_data(user_id);

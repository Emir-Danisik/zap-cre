-- Create the searches table in the public schema
CREATE TABLE IF NOT EXISTS public.searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES public.users(id) NULL, -- Can be NULL for unauthenticated searches
  query TEXT NOT NULL,
  api_response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policy for searches table
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;

-- Policy to allow a user to read only their own searches
CREATE POLICY searches_read_own ON public.searches
  FOR SELECT
  USING (user_id = auth.uid()::text OR user_id IS NULL);

-- Policy to allow inserts by authenticated users or server
CREATE POLICY searches_insert ON public.searches
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid()::text AND auth.role() = 'authenticated') OR 
    auth.role() = 'service_role'
  );

-- Create index on user_id for faster lookup of a user's searches
CREATE INDEX IF NOT EXISTS searches_user_id_idx ON public.searches (user_id);

-- Create index on created_at for efficient time-based queries
CREATE INDEX IF NOT EXISTS searches_created_at_idx ON public.searches (created_at); 
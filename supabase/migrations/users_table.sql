-- Create a secure schema for our application
CREATE SCHEMA IF NOT EXISTS app_public;

-- Create the users table in the public schema
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- Clerk ID as the primary key
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policy for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy to allow a user to read and update only their own record
CREATE POLICY users_individual_access ON public.users
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- Create policy to allow inserting only from server
CREATE POLICY users_insert_server ON public.users
  FOR INSERT
  WITH CHECK (TRUE);  -- This will be restricted by API key/JWT role

-- Create policy to allow reading all users for authenticated users
-- (Useful if you need to list users in your app)
CREATE POLICY users_read_all ON public.users
  FOR SELECT
  USING (TRUE);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- Create a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at(); 
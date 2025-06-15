-- Add phone column to applications table
DO $$ 
BEGIN
    -- Add phone column to applications table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'phone') THEN
        ALTER TABLE public.applications ADD COLUMN phone TEXT;
    END IF;
END $$;
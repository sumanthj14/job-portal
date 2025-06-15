-- Add skills column to applications table
DO $$ 
BEGIN
    -- Add skills column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'skills') THEN
        ALTER TABLE public.applications ADD COLUMN skills TEXT;
    END IF;

    -- Ensure metadata column exists for storing parsed resume data
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'metadata') THEN
        ALTER TABLE public.applications ADD COLUMN metadata JSONB;
    END IF;

    -- Add education column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'education') THEN
        ALTER TABLE public.applications ADD COLUMN education TEXT;
    END IF;

    -- Add experience column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'experience') THEN
        ALTER TABLE public.applications ADD COLUMN experience TEXT;
    END IF;
END $$;
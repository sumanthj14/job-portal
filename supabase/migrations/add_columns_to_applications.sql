-- Add name, email, and phone columns to applications table if they don't exist
DO $$ 
BEGIN
    -- Add name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'name') THEN
        ALTER TABLE public.applications ADD COLUMN name TEXT;
    END IF;

    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'email') THEN
        ALTER TABLE public.applications ADD COLUMN email TEXT;
    END IF;

    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'phone') THEN
        ALTER TABLE public.applications ADD COLUMN phone TEXT;
    END IF;

    -- Rename resume_url to resume if needed
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'resume_url') 
       AND NOT EXISTS (SELECT FROM information_schema.columns 
                     WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'resume') THEN
        ALTER TABLE public.applications RENAME COLUMN resume_url TO resume;
    END IF;
END $$;
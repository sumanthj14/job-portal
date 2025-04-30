-- Add isOpen field to jobs table
DO $$ 
BEGIN
    -- Add isOpen column to jobs table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'isopen') THEN
        ALTER TABLE public.jobs ADD COLUMN isopen BOOLEAN DEFAULT true;
        
        -- Update existing jobs to have isOpen set to true by default
        UPDATE public.jobs SET isopen = true;
    END IF;
END $$;
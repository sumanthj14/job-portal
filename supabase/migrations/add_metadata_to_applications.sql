-- Add metadata column to applications table
DO $$ 
BEGIN
    -- Add metadata column to applications table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'metadata') THEN
        ALTER TABLE public.applications ADD COLUMN metadata JSONB;
        
        -- Update existing applications to have empty metadata
        UPDATE public.applications SET metadata = '{}'::jsonb;
    END IF;
END $$;
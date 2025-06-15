-- Ensure applications table has all necessary columns
DO $$ 
BEGIN
    -- Create applications table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applications') THEN
        CREATE TABLE public.applications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            job_id UUID NOT NULL,
            candidate_id UUID REFERENCES public.users(id),
            name TEXT,
            email TEXT,
            phone TEXT,
            resume TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metadata JSONB DEFAULT '{}'::jsonb,
            skills TEXT,
            education TEXT,
            experience TEXT
        );
        
        -- Add comment to the table
        COMMENT ON TABLE public.applications IS 'Stores job applications with resume URLs and parsed data';
        RAISE NOTICE 'Created applications table';
    ELSE
        -- Check if candidate_id column exists and is TEXT type
        IF EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' 
                  AND column_name = 'candidate_id' AND data_type = 'text') THEN
            
            -- Drop the existing foreign key constraint if it exists
            IF EXISTS (SELECT FROM information_schema.table_constraints tc
                      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                      WHERE tc.constraint_type = 'FOREIGN KEY' 
                      AND tc.table_schema = 'public' 
                      AND tc.table_name = 'applications' 
                      AND ccu.column_name = 'candidate_id') THEN
                EXECUTE (
                    SELECT 'ALTER TABLE public.applications DROP CONSTRAINT ' || tc.constraint_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                    AND tc.table_schema = 'public' 
                    AND tc.table_name = 'applications' 
                    AND ccu.column_name = 'candidate_id'
                    LIMIT 1
                );
                RAISE NOTICE 'Dropped existing foreign key constraint on candidate_id';
            END IF;
            
            -- Create a temporary column for the UUID values
            ALTER TABLE public.applications ADD COLUMN candidate_id_uuid UUID;
            
            -- Update the temporary column with UUIDs from the users table
            UPDATE public.applications a
            SET candidate_id_uuid = u.id
            FROM public.users u
            WHERE a.candidate_id = u.clerk_id;
            
            -- Drop the old TEXT column
            ALTER TABLE public.applications DROP COLUMN candidate_id;
            
            -- Rename the UUID column to candidate_id
            ALTER TABLE public.applications RENAME COLUMN candidate_id_uuid TO candidate_id;
            
            -- Add the foreign key constraint
            ALTER TABLE public.applications ADD CONSTRAINT applications_candidate_id_fkey 
            FOREIGN KEY (candidate_id) REFERENCES public.users(id);
            
            RAISE NOTICE 'Successfully changed candidate_id column type from TEXT to UUID';
        END IF;
        
        -- Add columns if they don't exist
        -- Add name column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'name') THEN
            ALTER TABLE public.applications ADD COLUMN name TEXT;
            RAISE NOTICE 'Added name column to applications table';
        END IF;

        -- Add email column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'email') THEN
            ALTER TABLE public.applications ADD COLUMN email TEXT;
            RAISE NOTICE 'Added email column to applications table';
        END IF;

        -- Add phone column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'phone') THEN
            ALTER TABLE public.applications ADD COLUMN phone TEXT;
            RAISE NOTICE 'Added phone column to applications table';
        END IF;

        -- Rename resume_url to resume if needed
        IF EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'resume_url') 
           AND NOT EXISTS (SELECT FROM information_schema.columns 
                         WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'resume') THEN
            ALTER TABLE public.applications RENAME COLUMN resume_url TO resume;
        END IF;
        
        -- Add resume column if it doesn't exist (and resume_url doesn't exist)
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'resume')
           AND NOT EXISTS (SELECT FROM information_schema.columns 
                         WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'resume_url') THEN
            ALTER TABLE public.applications ADD COLUMN resume TEXT;
        END IF;

        -- Add metadata column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'metadata') THEN
            ALTER TABLE public.applications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;

        -- Add skills column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'skills') THEN
            ALTER TABLE public.applications ADD COLUMN skills TEXT;
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
    END IF;
    
    -- Ensure RLS is enabled
    ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies if they don't exist
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'applications' AND policyname = 'Users can view their own applications') THEN
        CREATE POLICY "Users can view their own applications" 
          ON public.applications 
          FOR SELECT 
          USING (candidate_id = (SELECT id FROM public.users WHERE clerk_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'applications' AND policyname = 'Users can insert their own applications') THEN
        CREATE POLICY "Users can insert their own applications" 
          ON public.applications 
          FOR INSERT 
          WITH CHECK (candidate_id = (SELECT id FROM public.users WHERE clerk_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'applications' AND policyname = 'Recruiters can view applications for their jobs') THEN
        CREATE POLICY "Recruiters can view applications for their jobs" 
          ON public.applications 
          FOR SELECT 
          USING (EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = applications.job_id AND jobs.recruiter_id = auth.uid()
          ));
    END IF;
    
    -- Create index on candidate_id for faster lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'applications_candidate_id_idx') THEN
        CREATE INDEX applications_candidate_id_idx ON public.applications(candidate_id);
    END IF;
    
    -- Create index on job_id for faster lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'applications_job_id_idx') THEN
        CREATE INDEX applications_job_id_idx ON public.applications(job_id);
    END IF;
    
    -- Create index on status for filtering
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'applications_status_idx') THEN
        CREATE INDEX applications_status_idx ON public.applications(status);
    END IF;
    
    -- Create index on created_at for sorting
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'applications_created_at_idx') THEN
        CREATE INDEX applications_created_at_idx ON public.applications(created_at);
    END IF;
END $$;

-- Ensure the resumes storage bucket exists
DO $$
BEGIN
    -- Check if the bucket exists
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'resumes'
    ) THEN
        -- Create the bucket
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('resumes', 'resumes', true);
        
        -- Add comment to the bucket
        COMMENT ON TABLE storage.objects IS 'Stores resume files uploaded by job applicants';
    END IF;
END
$$;

-- Ensure storage policies are set up correctly
DO $$
BEGIN
    -- Enable RLS on the buckets table if not already enabled
    ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

    -- Enable RLS on the objects table if not already enabled
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Create policy for public read access to resumes bucket if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow public read access to resumes bucket') THEN
        CREATE POLICY "Allow public read access to resumes bucket"
            ON storage.objects
            FOR SELECT
            USING (bucket_id = 'resumes');
    END IF;

    -- Create policy for authenticated users to upload to resumes bucket if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow authenticated users to upload to resumes bucket') THEN
        CREATE POLICY "Allow authenticated users to upload to resumes bucket"
            ON storage.objects
            FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = 'resumes');
    END IF;
    
    -- Create policy for service role to manage resumes bucket if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow service role to manage resumes bucket') THEN
        CREATE POLICY "Allow service role to manage resumes bucket"
            ON storage.objects
            FOR ALL
            TO service_role
            USING (bucket_id = 'resumes');
    END IF;
END
$$;
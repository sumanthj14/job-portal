-- Add foreign key relationships for the users table

-- First ensure the users table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE NOTICE 'The users table does not exist. Please run the users_table.sql migration first.';
        RETURN;
    END IF;

    -- Create applications table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applications') THEN
        CREATE TABLE public.applications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            job_id UUID NOT NULL,
            candidate_id TEXT REFERENCES public.users(clerk_id),
            status TEXT DEFAULT 'pending',
            resume_url TEXT,
            cover_letter TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add clerk_id column to applications table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'candidate_id') THEN
            ALTER TABLE public.applications ADD COLUMN candidate_id TEXT REFERENCES public.users(clerk_id);
            
            -- Update existing applications to use clerk_id instead of any previous user identifier
            -- This is a placeholder - you'll need to adjust based on your actual data structure
            -- UPDATE public.applications SET candidate_id = (SELECT clerk_id FROM public.users WHERE users.id = applications.user_id);
        END IF;
    END IF;

    -- Create jobs table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs') THEN
        CREATE TABLE public.jobs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT,
            description TEXT,
            requirements TEXT,
            salary_range TEXT,
            job_type TEXT,
            recruiter_id TEXT REFERENCES public.users(clerk_id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add clerk_id column to jobs table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'recruiter_id') THEN
            ALTER TABLE public.jobs ADD COLUMN recruiter_id TEXT REFERENCES public.users(clerk_id);
            
            -- Update existing jobs to use clerk_id instead of any previous user identifier
            -- This is a placeholder - you'll need to adjust based on your actual data structure
            -- UPDATE public.jobs SET recruiter_id = (SELECT clerk_id FROM public.users WHERE users.id = jobs.user_id);
        END IF;
    END IF;

    -- Create saved_jobs table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_jobs') THEN
        CREATE TABLE public.saved_jobs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            job_id UUID NOT NULL,
            user_id TEXT REFERENCES public.users(clerk_id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add clerk_id column to saved_jobs table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'saved_jobs' AND column_name = 'user_id') THEN
            ALTER TABLE public.saved_jobs ADD COLUMN user_id TEXT REFERENCES public.users(clerk_id);
            
            -- Update existing saved_jobs to use clerk_id instead of any previous user identifier
            -- This is a placeholder - you'll need to adjust based on your actual data structure
            -- UPDATE public.saved_jobs SET user_id = (SELECT clerk_id FROM public.users WHERE users.id = saved_jobs.user_id);
        END IF;
    END IF;

END $$;

-- Add RLS policies for related tables

-- Applications table policies
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications" 
  ON public.applications 
  FOR SELECT 
  USING (auth.uid() = candidate_id);

CREATE POLICY "Users can insert their own applications" 
  ON public.applications 
  FOR INSERT 
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Recruiters can view applications for their jobs" 
  ON public.applications 
  FOR SELECT 
  USING (auth.uid() IN (
    SELECT recruiter_id FROM public.jobs WHERE jobs.id = applications.job_id
  ));

-- Jobs table policies
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view jobs" 
  ON public.jobs 
  FOR SELECT 
  USING (true);

CREATE POLICY "Recruiters can insert their own jobs" 
  ON public.jobs 
  FOR INSERT 
  WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can update their own jobs" 
  ON public.jobs 
  FOR UPDATE 
  USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can delete their own jobs" 
  ON public.jobs 
  FOR DELETE 
  USING (auth.uid() = recruiter_id);

-- Saved jobs table policies
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved jobs" 
  ON public.saved_jobs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved jobs" 
  ON public.saved_jobs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved jobs" 
  ON public.saved_jobs 
  FOR DELETE 
  USING (auth.uid() = user_id);
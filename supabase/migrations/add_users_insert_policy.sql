-- Add INSERT policy for users table

-- Check if the policy already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND operation = 'INSERT'
    ) THEN
        -- Create policy to allow inserting users
        -- This is needed for the Clerk webhook handler to create new users
        CREATE POLICY "Allow user creation" 
        ON public.users 
        FOR INSERT 
        WITH CHECK (true);
        
        RAISE NOTICE 'Created INSERT policy for users table';
    ELSE
        RAISE NOTICE 'INSERT policy for users table already exists';
    END IF;
END $$;
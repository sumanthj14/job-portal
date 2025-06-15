-- Fix candidate_id column type in applications table
DO $$ 
BEGIN
    -- Check if applications table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applications') THEN
        -- Check if candidate_id column exists and is UUID type
        IF EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'applications' 
                  AND column_name = 'candidate_id' AND data_type = 'uuid') THEN
            
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
            END IF;
            
            -- Alter the column type to TEXT
            ALTER TABLE public.applications ALTER COLUMN candidate_id TYPE TEXT;
            
            -- Add foreign key reference to users.clerk_id
            ALTER TABLE public.applications ADD CONSTRAINT applications_candidate_id_fkey 
            FOREIGN KEY (candidate_id) REFERENCES public.users(clerk_id);
            
            RAISE NOTICE 'Successfully changed candidate_id column type from UUID to TEXT';
        ELSE
            -- Check if candidate_id column exists and is already TEXT type
            IF EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'applications' 
                      AND column_name = 'candidate_id' AND data_type = 'text') THEN
                RAISE NOTICE 'candidate_id column is already TEXT type';
                
                -- Ensure it has the correct foreign key constraint
                IF NOT EXISTS (SELECT FROM information_schema.table_constraints tc
                              JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                              WHERE tc.constraint_type = 'FOREIGN KEY' 
                              AND tc.table_schema = 'public' 
                              AND tc.table_name = 'applications' 
                              AND ccu.column_name = 'candidate_id'
                              AND ccu.table_name = 'users'
                              AND ccu.column_name = 'clerk_id') THEN
                    -- Drop any existing foreign key constraint
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
                    END IF;
                    
                    -- Add the correct foreign key constraint
                    ALTER TABLE public.applications ADD CONSTRAINT applications_candidate_id_fkey 
                    FOREIGN KEY (candidate_id) REFERENCES public.users(clerk_id);
                    
                    RAISE NOTICE 'Added foreign key constraint to candidate_id column';
                END IF;
            ELSE
                RAISE NOTICE 'candidate_id column does not exist or has an unexpected type';
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'applications table does not exist';
    END IF;
END $$;
-- Storage bucket and policies for resume uploads

-- Create the 'resumes' bucket if it doesn't exist
DO $$
BEGIN
    -- Check if the bucket exists
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'resumes'
    ) THEN
        -- Create the bucket
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('resumes', 'resumes', true);
    END IF;
END
$$;

-- Enable RLS on the buckets table
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on the objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to create buckets
DROP POLICY IF EXISTS "Allow authenticated users to create buckets" ON storage.buckets;
CREATE POLICY "Allow authenticated users to create buckets"
    ON storage.buckets
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy to allow public read access to the 'resumes' bucket
DROP POLICY IF EXISTS "Allow public read access to resumes bucket" ON storage.objects;
CREATE POLICY "Allow public read access to resumes bucket"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'resumes');

-- Policy to allow authenticated users to upload to the 'resumes' bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload to resumes bucket" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload to resumes bucket"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'resumes');
    
-- More permissive policy for resume uploads (temporary for debugging)
DROP POLICY IF EXISTS "Temporary permissive policy for resume uploads" ON storage.objects;
CREATE POLICY "Temporary permissive policy for resume uploads"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'resumes');
    
-- Policy to allow service role to upload to any bucket
DROP POLICY IF EXISTS "Allow service role to upload to any bucket" ON storage.objects;
CREATE POLICY "Allow service role to upload to any bucket"
    ON storage.objects
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy to allow users to update their own objects in the 'resumes' bucket
DROP POLICY IF EXISTS "Allow users to update their own objects in resumes bucket" ON storage.objects;
CREATE POLICY "Allow users to update their own objects in resumes bucket"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'resumes' AND owner = auth.uid());

-- Policy to allow users to delete their own objects in the 'resumes' bucket
DROP POLICY IF EXISTS "Allow users to delete their own objects in resumes bucket" ON storage.objects;
CREATE POLICY "Allow users to delete their own objects in resumes bucket"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'resumes' AND owner = auth.uid());
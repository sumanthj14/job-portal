# Clerk Integration with Supabase Applications Table

## Problem

When a candidate applies for a job, the application was failing to insert data into the `applications` table with this error:

```
invalid input syntax for type uuid: "user_2xwpIuvBCYuBwYmrPLcjVS3QXSv"
```

This occurred because the `candidate_id` column in the `applications` table expected a UUID, but Clerk returns a string-based user ID in the format `user_XXXX`.

## Solution Implemented

We chose **Option A**: Change the `candidate_id` column type in Supabase to `TEXT` to accept Clerk's user ID format.

### Changes Made

1. **Database Schema Changes**:
   - Created a migration file `fix_candidate_id_type.sql` to change the `candidate_id` column type from UUID to TEXT
   - Added a foreign key constraint to ensure `candidate_id` references `users.clerk_id`
   - Created a migration file `add_skills_column_to_applications.sql` to add additional columns for storing parsed resume data

2. **Application Code Changes**:
   - Updated `apiApplication.js` to handle the Clerk user ID format correctly
   - Added support for storing parsed resume data in the `metadata` column
   - Updated `apply-job.jsx` to include parsed resume data in the application submission

### Resume Storage

The resume file upload functionality has been preserved and enhanced:

- Files are uploaded to the Supabase storage bucket named `resumes`
- The file's public URL is stored in the `resume` column of the `applications` table
- Additional parsed data from the resume is stored in the `metadata` column as a JSON object

## Database Schema

The `applications` table now has the following structure:

```sql
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    candidate_id TEXT REFERENCES public.users(clerk_id),
    status TEXT DEFAULT 'pending',
    resume TEXT,
    cover_letter TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    skills TEXT,
    education TEXT,
    experience TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## How It Works

1. When a user applies for a job, their Clerk user ID is stored directly in the `candidate_id` column
2. The resume file is uploaded to the Supabase storage bucket and its URL is stored in the `resume` column
3. Parsed resume data is stored in the `metadata` column as a JSON object
4. Additional fields like `name`, `email`, `phone`, etc. are stored in their respective columns

## Benefits

- Simplified integration between Clerk and Supabase
- No need for a separate mapping table
- Preserved all existing functionality
- Enhanced with additional fields for storing parsed resume data
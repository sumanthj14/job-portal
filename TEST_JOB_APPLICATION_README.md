# Job Application Testing

This document explains how to test the job application functionality in the Job Portal application.

## Overview

The job application process involves several key steps:

1. Uploading a resume file to Supabase storage
2. Generating a public URL for the resume
3. Creating an application record in the database

Two test scripts are provided to verify this functionality:

- `test-job-application.js`: Tests the basic job application flow directly using Supabase client
- `test-job-application-api.js`: Tests the actual API function used in the application

## Prerequisites

Before running the tests, you need:

1. Supabase service role key for bypassing Row Level Security
2. Node.js installed on your system
3. Proper Supabase setup with the 'resumes' bucket and storage policies

## Running the Tests

### 1. Set the required environment variables:

```bash
# Windows (Command Prompt)
set VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
set VITE_SUPABASE_URL=your_supabase_url
set VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Windows (PowerShell)
$env:VITE_SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
$env:VITE_SUPABASE_URL="your_supabase_url"
$env:VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"

# Linux/macOS
export VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
export VITE_SUPABASE_URL=your_supabase_url
export VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Run the basic test script:

```bash
node test-job-application.js
```

### 3. Run the API test script (tests the actual application code):

```bash
node test-job-application-api.js
```

## What the Tests Do

### Basic Test (`test-job-application.js`)

This test script performs the following operations:

1. Creates a test resume file (if it doesn't exist)
2. Creates a test job in the database
3. Uploads the resume to the Supabase 'resumes' bucket
4. Generates a public URL for the resume
5. Creates an application record in the database
6. Verifies that the application exists in the database

### API Test (`test-job-application-api.js`)

This test script performs a more comprehensive test:

1. First runs a direct test similar to the basic test
2. Then tests the actual `applyToJob` function from `apiApplication.js`
3. Creates a mock resume file and job application data
4. Calls the API function with the test data
5. Verifies that the application was properly stored in the database
6. Automatically cleans up all test data after completion

## Expected Output

If the tests run successfully, you should see output similar to:

```
=== STARTING DIRECT JOB APPLICATION TEST ===
Creating test resume file...
✅ Test resume file created at /path/to/test-resume.pdf
Creating test job in database...
✅ Test job created with ID: test-job-1234567890
Uploading resume to Supabase storage...
✅ Resume uploaded successfully
✅ Resume public URL generated: https://your-project.supabase.co/storage/v1/object/public/resumes/resume_test-job-1234567890_test-candidate-1234567890_1234567890.txt
Creating application record in database...
✅ Application saved successfully: { ... application data ... }
Verifying application exists in database...
✅ Application verified in database
Application data: { ... application data ... }
=== DIRECT JOB APPLICATION TEST COMPLETED SUCCESSFULLY ===

=== STARTING API JOB APPLICATION TEST ===
...
=== API JOB APPLICATION TEST COMPLETED SUCCESSFULLY ===

=== CLEANING UP TEST DATA ===
✅ Applications deleted
✅ Job deleted
✅ Resume files deleted
✅ Local test resume file deleted
=== CLEANUP COMPLETED ===

=== TEST SUMMARY ===
Direct Job Application Test: ✅ PASSED
API Job Application Test: ✅ PASSED
```

## Troubleshooting

If the tests fail, check the following:

1. Ensure your Supabase service role key is correct
2. Verify that the 'resumes' bucket exists in your Supabase storage
3. Check that the 'applications' and 'jobs' tables exist in your database
4. Ensure the storage policies allow file uploads to the 'resumes' bucket
5. Check the error messages for specific issues

### Common Issues

- **Module not found errors**: Make sure you're running the tests from the project root directory
- **Permission errors**: Verify your Supabase service role key has the necessary permissions
- **Storage bucket errors**: Ensure the 'resumes' bucket exists and has the correct policies

## Storage Policies

The job application functionality relies on proper storage policies. The required policies are defined in `supabase/migrations/storage_policies.sql` and include:

1. A 'resumes' bucket for storing resume files
2. Policies allowing authenticated users to upload to the 'resumes' bucket
3. Policies allowing public read access to the 'resumes' bucket

If you encounter storage-related errors, verify these policies are correctly applied in your Supabase project.
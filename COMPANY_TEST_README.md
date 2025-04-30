# Testing Company Data Storage

This document provides instructions on how to test if company data is being properly stored in the Supabase company table. This test verifies that the fix for the company logo storage issue is working correctly.

## Prerequisites

1. Make sure you have Node.js installed
2. Ensure you have the required environment variables set up
3. Supabase project with a "companies" table and "company-logo" storage bucket

## Setup

1. Create a `.env` file in the root directory based on the `.env.example` template
2. Fill in your Supabase credentials and a valid JWT token for testing:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_TEST_TOKEN=your_supabase_jwt_token
```

To get a valid JWT token, you can:
- Log in to your application and extract the token from local storage
- Generate a test token using Supabase's JWT generation tools

## Running the Test

Execute the test script using Node.js:

```bash
node test-company-storage.js
```

## Expected Output

If the test is successful, you should see output similar to:

```
Starting company storage test...
Attempting to create company: Test Company 1234567890
✅ SUCCESS: Company was successfully stored!
Company details: {...}
✅ SUCCESS: Logo URL was properly set: https://...
✅ SUCCESS: Company name was properly set
Test completed
```

## What the Test Verifies

The test script verifies that:

1. A company can be successfully created in the database
2. The company logo is properly uploaded to Supabase storage
3. The logo URL is correctly stored in the company record
4. The company name is correctly stored in the database

## Troubleshooting

If the test fails, check:

1. Your Supabase credentials and JWT token are correct
2. The Supabase storage bucket "company-logo" exists and has proper permissions
3. The database has a "companies" table with the correct schema
4. Network connectivity to Supabase services
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Supabase configuration - read from .env file
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Supabase Service Key (first 10 chars):', supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + '...' : 'undefined');

// No need to set up environment variables as we're reading directly from .env file

// Mock the import.meta.env for ESM modules
global.import = { 
  meta: { 
    env: { 
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL, 
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY, 
      VITE_SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY 
    } 
  } 
};

// Patch the import.meta object for ESM modules
if (typeof globalThis.import === 'undefined') {
  globalThis.import = global.import;
}

if (typeof globalThis.import.meta === 'undefined') {
  globalThis.import.meta = global.import.meta;
}

// Verify service role key is available
if (!supabaseServiceKey) {
  console.error('❌ ERROR: VITE_SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('This test requires the service role key to bypass Row Level Security');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test configuration
const TEST_COMPANY_ID = '00000000-0000-0000-0000-000000000004'; // Using a valid UUID format
const TEST_JOB_ID = '00000000-0000-0000-0000-000000000003'; // Using a valid UUID format
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; // Using a valid UUID format for user id
const TEST_CLERK_ID = '00000000-0000-0000-0000-000000000002'; // Using a UUID format instead of Clerk ID
const TEST_CANDIDATE_ID = TEST_CLERK_ID; // Use the UUID as candidate_id
const TEST_RESUME_PATH = path.join(process.cwd(), 'test-resume.pdf');

// Create a simple test resume file if it doesn't exist
async function createTestResumeFile() {
  console.log('Creating test resume file...');
  
  // Check if test file already exists
  if (fs.existsSync(TEST_RESUME_PATH)) {
    console.log('Test resume file already exists');
    return TEST_RESUME_PATH;
  }
  
  // Create a simple PDF-like content (not a real PDF, just for testing)
  const content = 'This is a test resume file for job application testing.';
  fs.writeFileSync(TEST_RESUME_PATH, content);
  console.log(`✅ Test resume file created at ${TEST_RESUME_PATH}`);
  return TEST_RESUME_PATH;
}

// Create a test company in the database
async function createTestCompany() {
  console.log('Creating test company in database...');
  
  const companyData = {
    id: TEST_COMPANY_ID,
    name: 'Test Company',
    logo_url: 'https://example.com/logo.png',
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('companies')
    .upsert(companyData)
    .select();
    
  if (error) {
    console.error('❌ Error creating test company:', error);
    throw error;
  }
  
  console.log(`✅ Test company created with ID: ${TEST_COMPANY_ID}`);
  return data[0];
}

// Create a test job in the database
async function createTestJob() {
  console.log('Creating test job in database...');
  
  const jobData = {
    id: TEST_JOB_ID,
    title: 'Test Job for Application Testing',
    company_id: TEST_COMPANY_ID, // Using the test company ID
    description: 'This is a test job created for application testing',
    location: 'Remote', // Adding required location field
    isopen: true,
    recruiter_id: TEST_CLERK_ID, // Using the clerk_id for recruiter
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('jobs')
    .upsert(jobData)
    .select();
    
  if (error) {
    console.error('❌ Error creating test job:', error);
    throw error;
  }
  
  console.log(`✅ Test job created with ID: ${TEST_JOB_ID}`);
  return data[0];
}

// Create a test user in the database
async function createTestUser() {
  console.log('Creating test user in database...');
  
  // Generate a unique email for each test run to avoid duplicate key errors
  const timestamp = new Date().getTime();
  const uniqueEmail = `test-${timestamp}@example.com`;
  
  const userData = {
    id: TEST_USER_ID,
    clerk_id: TEST_CLERK_ID,
    email: uniqueEmail
  };
  
  const { data, error } = await supabase
    .from('users')
    .upsert(userData)
    .select();
    
  if (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
  
  console.log(`✅ Test user created with clerk_id: ${TEST_CLERK_ID}`);
  return data[0];
}

// Test job application using direct API approach
async function testDirectJobApplication() {
  try {
    console.log('=== STARTING DIRECT JOB APPLICATION TEST ===');
    
    // Step 1: Create test resume file
    const resumePath = await createTestResumeFile();
    
    // Step 2: Create test user
    const user = await createTestUser();
    
    // Step 3: Create test company
    const company = await createTestCompany();
    
    // Step 4: Create test job
    const job = await createTestJob();
    
    // Step 4: Read the test resume file
    const resumeFile = fs.readFileSync(resumePath);
    
    // Step 5: Upload resume to Supabase storage
    console.log('Uploading resume to Supabase storage...');
    
    // Generate a unique filename
    const timestamp = new Date().getTime();
    // Use a safe version of the clerk ID for the filename
    const safeClerkId = TEST_CLERK_ID.replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = `resume_${TEST_JOB_ID}_${safeClerkId}_${timestamp}.txt`;
    
    // Upload file to 'resumes' bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, resumeFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf'
      });
      
    if (uploadError) {
      console.error('❌ Resume upload error:', uploadError);
      throw uploadError;
    }
    
    console.log('✅ Resume uploaded successfully');
    
    // Step 6: Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);
      
    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('❌ Failed to generate public URL');
      throw new Error('Failed to generate resume URL');
    }
    
    const resumeUrl = publicUrlData.publicUrl;
    console.log('✅ Resume public URL generated:', resumeUrl);
    
    // Step 7: Create application record in database...
    console.log('Creating application record in database...');
    
    // Use the same unique email as the user
    const appTimestamp = new Date().getTime();
    const appUniqueEmail = `test-${appTimestamp}@example.com`;
    
    const applicationData = {
      job_id: TEST_JOB_ID,
      candidate_id: TEST_CLERK_ID, // Use the UUID as required by the applications table
      status: 'pending', // Using 'pending' as it's the default in the schema
      name: 'Test Applicant',
      email: appUniqueEmail,
      resume: 'test-resume.pdf', // Adding required resume field
      // resume_url field removed as it's not in the schema cache
      created_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('applications')
      .insert(applicationData)
      .select();
      
    if (insertError) {
      console.error('❌ Error inserting application data:', insertError);
      throw insertError;
    }
    
    console.log('✅ Application saved successfully:', insertData[0]);
    
    // Step 8: Verify application exists in database
    console.log('Verifying application exists in database...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', TEST_JOB_ID)
      .eq('candidate_id', TEST_CLERK_ID); // Use the clerk_id (TEXT) as required by the applications table
      
    if (verifyError) {
      console.error('❌ Error verifying application:', verifyError);
      throw verifyError;
    }
    
    if (!verifyData || verifyData.length === 0) {
      console.error('❌ Application not found in database');
      throw new Error('Application not found in database');
    }
    
    console.log('✅ Application verified in database');
    console.log('Application data:', verifyData[0]);
    
    console.log('=== DIRECT JOB APPLICATION TEST COMPLETED SUCCESSFULLY ===');
    return { job, resumeUrl, application: verifyData[0] };
  } catch (error) {
    console.error('❌ DIRECT TEST FAILED:', error);
    throw error;
  }
}

// Test job application using the API function
async function testApiJobApplication() {
  try {
    console.log('\n=== STARTING API JOB APPLICATION TEST ===');
    
    // Use the ESM version of the API functions for testing
    console.log('Using test-apiApplication-esm.js for API functions...');
    const { applyToJob, supabaseClient } = await import('./test-apiApplication-esm.js');
    
    // Step 1: Create test resume file
    const resumePath = await createTestResumeFile();
    
    // Step 2: Create test user
    const user = await createTestUser();
    
    // Step 3: Create test job
    const job = await createTestJob();
    
    // Step 3: Create a File object from the test resume file
    // Note: In Node.js, we need to create a mock File object
    const buffer = fs.readFileSync(resumePath);
    const resumeFile = {
      name: 'test-resume.pdf',
      type: 'application/pdf',
      size: buffer.length,
      arrayBuffer: async () => buffer,
    };
    
    // Step 4: Prepare job application data
    // Use the same unique email generation approach
    const apiTimestamp = new Date().getTime();
    const apiUniqueEmail = `test-${apiTimestamp}@example.com`;
    
    const jobData = {
      job_id: TEST_JOB_ID,
      candidate_id: TEST_CLERK_ID, // Use the UUID as required by the applications table
      status: 'pending',
      name: 'Test Applicant',
      email: apiUniqueEmail,
      resume: [resumeFile], // API expects an array of files
    };
    
    console.log('Applying to job using API function...');
    
    // Step 5: Call the applyToJob function
    // We use the service role key as the token for authentication
    console.log('Calling applyToJob with jobData:', { ...jobData, resume: '[File Object]' });
    
    // Using the test-apiApplication.js module which already has the correct supabase client
    
    const result = await applyToJob(supabaseServiceKey, null, jobData);
    
    console.log('✅ API job application successful:', result);
    
    // Step 6: Verify application exists in database
    console.log('Verifying application exists in database...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', TEST_JOB_ID)
      .eq('candidate_id', TEST_CLERK_ID); // Use the clerk_id (TEXT) as required by the applications table
      
    if (verifyError) {
      console.error('❌ Error verifying application:', verifyError);
      throw verifyError;
    }
    
    if (!verifyData || verifyData.length === 0) {
      console.error('❌ Application not found in database');
      throw new Error('Application not found in database');
    }
    
    console.log('✅ Application verified in database');
    console.log('Application data:', verifyData[0]);
    
    console.log('=== API JOB APPLICATION TEST COMPLETED SUCCESSFULLY ===');
    return true;
  } catch (error) {
    console.error('❌ API TEST FAILED:', error);
    console.error('Error details:', error.message);
    if (error.stack) console.error(error.stack);
    return false;
  }
}

// Clean up test data
async function cleanupTestData() {
  try {
    console.log('\n=== CLEANING UP TEST DATA ===');
    
    // Delete applications
    const { error: deleteAppError } = await supabase
      .from('applications')
      .delete()
      .eq('job_id', TEST_JOB_ID);
      
    if (deleteAppError) {
      console.error('❌ Error deleting applications:', deleteAppError);
    } else {
      console.log('✅ Applications deleted');
    }
    
    // Delete job
    const { error: deleteJobError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', TEST_JOB_ID);
      
    if (deleteJobError) {
      console.error('❌ Error deleting job:', deleteJobError);
    } else {
      console.log('✅ Job deleted');
    }
    
    // Delete resume files from storage
    const { data: files, error: listError } = await supabase.storage
      .from('resumes')
      .list();
      
    if (listError) {
      console.error('❌ Error listing resume files:', listError);
    } else {
      const testFiles = files.filter(file => 
        file.name.includes(TEST_JOB_ID) || file.name.includes(TEST_CANDIDATE_ID)
      );
      
      if (testFiles.length > 0) {
        const { error: deleteFileError } = await supabase.storage
          .from('resumes')
          .remove(testFiles.map(file => file.name));
          
        if (deleteFileError) {
          console.error('❌ Error deleting resume files:', deleteFileError);
        } else {
          console.log(`✅ ${testFiles.length} resume files deleted`);
        }
      } else {
        console.log('No test resume files found to delete');
      }
    }
    
    // Delete local test file
    if (fs.existsSync(TEST_RESUME_PATH)) {
      fs.unlinkSync(TEST_RESUME_PATH);
      console.log('✅ Local test resume file deleted');
    }
    
    console.log('=== CLEANUP COMPLETED ===');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the tests
async function runTests() {
  let directTestSuccess = false;
  let apiTestSuccess = false;
  
  try {
    // Run direct test first
    try {
      directTestSuccess = await testDirectJobApplication();
    } catch (error) {
      console.error('❌ Direct test failed with error:', error);
      directTestSuccess = false;
    }
    
    // Only run API test if direct test succeeds
    if (directTestSuccess) {
      try {
        apiTestSuccess = await testApiJobApplication();
      } catch (error) {
        console.error('❌ API test failed with error:', error);
        apiTestSuccess = false;
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error in runTests:', error);
  } finally {
    // Clean up regardless of test results
    try {
      await cleanupTestData();
    } catch (cleanupError) {
      console.error('❌ Error during cleanup:', cleanupError);
    }
  }
  
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Direct Job Application Test: ${directTestSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`API Job Application Test: ${apiTestSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Exit with appropriate code
  process.exit(directTestSuccess && apiTestSuccess ? 0 : 1);
}

// Run the tests
runTests();
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lecmbaolkurxwdlzkmxh.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ ERROR: VITE_SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('This test requires the service role key to bypass Row Level Security');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const TEST_COMPANY_ID = '00000000-0000-0000-0000-000000000000'; // Using a valid UUID format
const TEST_JOB_ID = '00000000-0000-0000-0000-000000000001'; // Using a valid UUID format
const TEST_USER_ID = '00000000-0000-0000-0000-000000000002'; // Using a valid UUID format for user id
const TEST_CLERK_ID = 'user_2NNEqL2nrIRdJ194ndJqAFwEzic'; // Using a valid Clerk ID format
const TEST_CANDIDATE_ID = TEST_CLERK_ID; // Use the Clerk ID as candidate_id
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
  
  const userData = {
    id: TEST_USER_ID,
    clerk_id: TEST_CLERK_ID,
    email: 'test@example.com'
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

// Test job application process
async function testJobApplication() {
  try {
    console.log('=== STARTING JOB APPLICATION TEST ===');
    
    // Step 1: Create test resume file
    const resumePath = await createTestResumeFile();
    
    // Step 2: Create test user
    const user = await createTestUser();
    
    // Step 3: Create test company
    const company = await createTestCompany();
    
    // Step 4: Create test job
    const job = await createTestJob();
    
    // Step 5: Read the test resume file
    const resumeFile = fs.readFileSync(resumePath);
    
    // Step 6: Upload resume to Supabase storage
    console.log('Uploading resume to Supabase storage...');
    
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const fileName = `resume_${TEST_JOB_ID}_${TEST_CANDIDATE_ID}_${timestamp}.txt`;
    
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
    
    // Step 7: Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);
      
    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('❌ Failed to generate public URL');
      throw new Error('Failed to generate resume URL');
    }
    
    // Step 8: Create application record in database
    console.log('Creating application record in database...');
    
    const applicationData = {
      job_id: TEST_JOB_ID,
      candidate_id: TEST_CANDIDATE_ID,
      name: 'Test Candidate',
      status: 'applied',
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
      .eq('candidate_id', TEST_CANDIDATE_ID);
      
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
    
    console.log('=== JOB APPLICATION TEST COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Run the test
testJobApplication();
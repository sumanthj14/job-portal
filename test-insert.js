import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ ERROR: VITE_SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
  try {
    // Create test job first
    const jobData = {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Test Job',
      company_id: '00000000-0000-0000-0000-000000000000', // UUID format
      location: 'Remote',
      description: 'Test job description',
      isopen: true,
      recruiter_id: '6013b983-3e1f-4b4c-bd63-d4025b8e9207' // Using a UUID format for recruiter_id
    };

    console.log('Creating test job...');
    const { data: jobResult, error: jobError } = await supabase
      .from('jobs')
      .upsert(jobData)
      .select();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return;
    }

    console.log('Job created successfully:', jobResult);

    // Create application using the job ID
    const applicationData = {
      job_id: '00000000-0000-0000-0000-000000000001', // Use the same UUID as the job
      candidate_id: '00000000-0000-0000-0000-000000000002', // Using a UUID for candidate_id
      status: 'pending',
      name: 'Test Applicant', // Required field not mentioned in migration file
      email: 'test@example.com', // Required field not mentioned in migration file
      resume: 'test-resume.pdf' // Required field not mentioned in migration file
      // Note: resume field is different from resume_url in the migration file
    };

    console.log('Creating test application...');
    const { data: appResult, error: appError } = await supabase
      .from('applications')
      .insert(applicationData)
      .select();

    if (appError) {
      console.error('Error creating application:', appError);
    } else {
      console.log('Application created successfully:', appResult);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testInsert();
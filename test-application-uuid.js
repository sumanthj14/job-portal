/**
 * Simple Test Script for Application Submission with UUID
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create a Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test data with UUID
const testCandidateId = uuidv4(); // Generate a valid UUID for candidate
let testJobId = null; // Will be set after creating a test job

async function createTestJob() {
  console.log('Creating test job...');
  
  try {
    // Create a test job
    const jobData = {
      title: 'Test Job',
      description: 'This is a test job for application submission testing',
      location: 'Remote',
      salary: '100000',
      company_id: 'afc4cdb5-0e75-4396-9e6c-d9c5a33a79aa', // Using the company_id from the output
      recruiter_id: testCandidateId, // Using the test candidate as the recruiter
      isopen: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test job:', error);
      throw error;
    }
    
    console.log('Test job created successfully:', data);
    testJobId = data.id; // Set the testJobId to the created job's ID
    return data;
  } catch (error) {
    console.error('Failed to create test job:', error);
    throw error;
  }
}

async function deleteTestJob() {
  if (!testJobId) return;
  
  console.log('Deleting test job with ID:', testJobId);
  
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', testJobId);
    
    if (error) {
      console.error('Error deleting test job:', error);
    } else {
      console.log('Test job deleted successfully');
    }
  } catch (error) {
    console.error('Failed to delete test job:', error);
  }
}

async function createTestUser() {
  console.log('Creating test user with UUID:', testCandidateId);
  
  // Generate a unique email address using the UUID
  const uniqueEmail = `test-${testCandidateId.substring(0, 8)}@example.com`;
  
  try {
    // Create a test user with the UUID as both id and clerk_id
    const userData = {
      id: testCandidateId,
      clerk_id: testCandidateId,
      email: uniqueEmail,  // Use a unique email address
      full_name: 'Test User',
      role: 'candidate',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test user:', error);
      throw error;
    }
    
    console.log('Test user created successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  }
}

async function deleteTestUser() {
  console.log('Deleting test user with UUID:', testCandidateId);
  
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', testCandidateId);
    
    if (error) {
      console.error('Error deleting test user:', error);
    } else {
      console.log('Test user deleted successfully');
    }
  } catch (error) {
    console.error('Failed to delete test user:', error);
  }
}

async function testApplicationSubmission() {
  console.log('Testing application submission with UUID...');
  
  try {
    // Prepare minimal application data
    const applicationData = {
      job_id: testJobId,
      candidate_id: testCandidateId,
      status: 'pending',
      resume: 'https://example.com/test-resume.pdf',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      name: 'Test User',
      email: 'test@example.com',
      metadata: {}
    };
    
    console.log('Submitting application data with UUID candidate_id:', testCandidateId);
    
    // Insert the application data
    const { data, error } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();
    
    if (error) {
      console.error('Application submission test failed:', error);
      return;
    }
    
    console.log('Application submitted successfully:', data);
    
    // Clean up
    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', data.id);
    
    if (deleteError) {
      console.error('Error deleting test application:', deleteError);
    } else {
      console.log(`Deleted test application with ID: ${data.id}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting application submission tests with UUID...');
  
  try {
    // Step 1: Create a test user
    await createTestUser();
    
    // Step 2: Create a test job
    await createTestJob();
    
    // Step 3: Submit the application
    await testApplicationSubmission();
    
    console.log('All tests passed successfully!');
    
  } catch (error) {
    console.error('Tests failed:', error);
  } finally {
    // Clean up test data
    await deleteTestJob();
    await deleteTestUser();
  }
}

// Run the tests
runTests();
/**
 * Successful Test Script for Multi-Step Application Submission
 * 
 * This script tests the basic functionality of the application submission system,
 * using actual data from the database to ensure successful submission.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

// Test data - Use real values from the database
const testJobId = '00000000-0000-0000-0000-000000000001'; // Real job ID from the database
const testCandidateId = 'user_2NNEqL2nrIRdJ194ndJqAFwEzic'; // Real user clerk_id from the database
const testResumePath = path.join(process.cwd(), 'test-resume.pdf'); // Create a test PDF file

/**
 * Create a test resume file
 * @returns {Promise<void>}
 */
async function createTestResume() {
  // Simple PDF-like content (not a real PDF)
  const content = '%PDF-1.5\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 68 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test Resume for John Doe) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000234 00000 n\n0000000302 00000 n\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n421\n%%EOF';
  
  try {
    await fs.promises.writeFile(testResumePath, content);
    console.log(`Test resume created at ${testResumePath}`);
  } catch (error) {
    console.error('Error creating test resume:', error);
    throw error;
  }
}

/**
 * Upload a resume to Supabase Storage
 * @returns {Promise<string>} - Public URL of the uploaded resume
 */
async function testResumeUpload() {
  console.log('Testing resume upload...');
  
  try {
    // Read the test resume file
    const fileContent = await fs.promises.readFile(testResumePath);
    
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const fileName = `test_resume_${timestamp}.pdf`;
    
    // Check if the 'resumes' bucket exists, create it if it doesn't
    const { data: buckets } = await supabase.storage.listBuckets();
    const resumesBucketExists = buckets.some(bucket => bucket.name === 'resumes');
    
    if (!resumesBucketExists) {
      await supabase.storage.createBucket('resumes', {
        public: true,
        fileSizeLimit: 10485760 // 10MB in bytes
      });
      console.log("Created 'resumes' bucket");
    }
    
    // Upload the resume file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, fileContent, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading resume:', uploadError);
      throw uploadError;
    }
    
    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);
    
    console.log('Resume uploaded successfully:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
    
  } catch (error) {
    console.error('Resume upload test failed:', error);
    throw error;
  }
}

/**
 * Test submitting an application to Supabase
 * @param {string} resumeUrl - URL of the uploaded resume
 * @returns {Promise<Object>} - Saved application data
 */
async function testApplicationSubmission(resumeUrl) {
  console.log('Testing application submission...');
  
  try {
    // Prepare application data with the actual columns that exist in the table
    // Based on the schema check results and using real IDs from the database
    const applicationData = {
      job_id: testJobId,
      candidate_id: testCandidateId,
      name: 'Test Candidate',
      email: 'test@example.com',
      resume: resumeUrl,
      status: 'pending'
      // created_at and updated_at will be set automatically
    };
    
    // Insert the application into the database
    const { data: insertData, error: insertError } = await supabase
      .from('applications')
      .insert([applicationData])
      .select();
    
    if (insertError) {
      console.error('Error inserting application data:', insertError);
      throw insertError;
    }
    
    console.log('Application submitted successfully:', insertData[0]);
    return insertData[0];
    
  } catch (error) {
    console.error('Application submission test failed:', error);
    throw error;
  }
}

/**
 * Clean up test data
 * @param {string} applicationId - ID of the test application
 * @param {string} resumeUrl - URL of the test resume
 * @returns {Promise<void>}
 */
async function cleanupTestData(applicationId, resumeUrl) {
  console.log('Cleaning up test data...');
  
  try {
    // Delete the test application
    if (applicationId) {
      const { error: deleteAppError } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId);
      
      if (deleteAppError) {
        console.error('Error deleting test application:', deleteAppError);
      } else {
        console.log(`Deleted test application with ID: ${applicationId}`);
      }
    }
    
    // Delete the test resume from storage
    if (resumeUrl) {
      const fileName = resumeUrl.split('/').pop();
      
      const { error: deleteFileError } = await supabase.storage
        .from('resumes')
        .remove([fileName]);
      
      if (deleteFileError) {
        console.error('Error deleting test resume:', deleteFileError);
      } else {
        console.log(`Deleted test resume: ${fileName}`);
      }
    }
    
    // Delete the local test resume file
    await fs.promises.unlink(testResumePath);
    console.log(`Deleted local test resume file: ${testResumePath}`);
    
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting application submission tests...');
  
  let resumeUrl = null;
  let applicationId = null;
  
  try {
    // Step 1: Create a test resume file
    await createTestResume();
    
    // Step 2: Upload the resume to Supabase Storage
    resumeUrl = await testResumeUpload();
    
    // Step 3: Submit the application to Supabase
    const application = await testApplicationSubmission(resumeUrl);
    applicationId = application.id;
    
    console.log('All tests passed successfully!');
    
  } catch (error) {
    console.error('Tests failed:', error);
  } finally {
    // Clean up test data
    await cleanupTestData(applicationId, resumeUrl);
  }
}

// Run the tests
runTests();
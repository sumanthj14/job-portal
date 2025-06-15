// Multi-step Job Application API Module
import { createClient } from "@supabase/supabase-js";
import supabaseClient, { supabaseUrl } from "../utils/supabase";

// Support both browser (import.meta.env) and Node.js (process.env) environments
const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  return process.env[key];
};

// Service role key for operations that need to bypass RLS
const serviceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

// Create a service role client that can bypass RLS policies
function createServiceRoleClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        // Set this header to bypass RLS policies
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    }
  });
}

/**
 * Upload resume to Supabase Storage
 * @param {string} token - Supabase access token
 * @param {File} resumeFile - Resume file object
 * @param {string} candidateId - Candidate ID (UUID)
 * @param {string} jobId - Job ID (UUID)
 * @returns {Promise<string>} - Public URL of the uploaded resume
 */
export async function uploadResume(token, resumeFile, candidateId, jobId) {
  console.log("Starting resume upload process");
  
  try {
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];
    
    if (!resumeFile || !allowedTypes.includes(resumeFile.type)) {
      throw new Error("Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.");
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (resumeFile.size > maxSize) {
      throw new Error("File size exceeds the maximum limit of 10MB.");
    }
    
    // Generate a unique filename for the resume
    const timestamp = new Date().getTime();
    const fileExtension = resumeFile.name.split('.').pop();
    const safeCandidate = candidateId.replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = `resume_${jobId}_${safeCandidate}_${timestamp}.${fileExtension}`;
    
    // Create a service role client to bypass RLS for storage operations
    const serviceClient = createServiceRoleClient();
    
    // Check if the 'resumes' bucket exists, create it if it doesn't
    const { data: buckets } = await serviceClient.storage.listBuckets();
    const resumesBucketExists = buckets.some(bucket => bucket.name === 'resumes');
    
    if (!resumesBucketExists) {
      await serviceClient.storage.createBucket('resumes', {
        public: true,
        fileSizeLimit: 10485760 // 10MB in bytes
      });
    }
    
    // Upload the resume file
    const arrayBuffer = await resumeFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('resumes')
      .upload(fileName, uint8Array, {
        contentType: resumeFile.type,
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error("Error uploading resume:", uploadError);
      throw new Error(`Failed to upload resume: ${uploadError.message}`);
    }
    
    // Get the public URL of the uploaded file
    const { data: publicUrlData } = serviceClient.storage
      .from('resumes')
      .getPublicUrl(fileName);
    
    return publicUrlData.publicUrl;
    
  } catch (error) {
    console.error("Resume upload error:", error);
    throw error;
  }
}

/**
 * Submit complete job application
 * @param {string} token - Supabase access token
 * @param {Object} applicationData - Complete application data
 * @returns {Promise<Object>} - Saved application data
 */
export async function submitApplication(token, applicationData) {
  console.log("Submitting complete application");
  
  try {
    // Create a service role client for database operations
    const serviceClient = createServiceRoleClient();
    
    // Prepare the application data for database
    // Ensure it matches the database schema
    const dbApplicationData = {
      job_id: applicationData.job_id,
      candidate_id: applicationData.candidate_id,
      status: 'pending',
      name: `${applicationData.firstName} ${applicationData.lastName}`,
      email: applicationData.email,
      resume: applicationData.resume_url, // Store the resume URL in the resume field
      created_at: new Date().toISOString()
    };
    
    // Insert the application into the database
    const { data: insertData, error: insertError } = await serviceClient
      .from('applications')
      .insert([dbApplicationData])
      .select();
    
    if (insertError) {
      console.error("Error inserting application data:", insertError);
      throw new Error(`Failed to save application: ${insertError.message}`);
    }
    
    return insertData[0];
    
  } catch (error) {
    console.error("Application submission error:", error);
    throw error;
  }
}

/**
 * Process multi-step job application
 * This function handles the complete flow from resume upload to application submission
 * @param {string} token - Supabase access token
 * @param {Object} formData - Complete form data from all steps
 * @returns {Promise<Object>} - Saved application data
 */
export async function processMultiStepApplication(token, formData) {
  console.log("Processing multi-step application");
  
  try {
    // Extract necessary data
    const { job_id, candidate_id, resume } = formData;
    
    // Step 1: Upload resume and get URL
    const resumeFile = resume[0]; // Get the File object
    const resumeUrl = await uploadResume(token, resumeFile, candidate_id, job_id);
    
    // Step 2: Submit complete application with resume URL
    const applicationData = {
      ...formData,
      resume_url: resumeUrl
    };
    
    const result = await submitApplication(token, applicationData);
    return result;
    
  } catch (error) {
    console.error("Multi-step application process error:", error);
    throw error;
  }
}

/**
 * Save application draft
 * This function allows saving partial application data as a draft
 * @param {string} token - Supabase access token
 * @param {Object} draftData - Partial application data
 * @param {string} draftId - Optional existing draft ID for updates
 * @returns {Promise<Object>} - Saved draft data
 */
export async function saveApplicationDraft(token, draftData, draftId = null) {
  console.log("Saving application draft");
  
  try {
    const supabase = await supabaseClient(token);
    
    // Prepare draft data
    const dbDraftData = {
      job_id: draftData.job_id,
      candidate_id: draftData.candidate_id,
      draft_data: draftData, // Store the complete form data as JSON
      updated_at: new Date().toISOString()
    };
    
    let result;
    
    if (draftId) {
      // Update existing draft
      const { data, error } = await supabase
        .from('application_drafts')
        .update(dbDraftData)
        .eq('id', draftId)
        .select();
      
      if (error) throw error;
      result = data[0];
    } else {
      // Create new draft
      dbDraftData.created_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('application_drafts')
        .insert([dbDraftData])
        .select();
      
      if (error) throw error;
      result = data[0];
    }
    
    return result;
    
  } catch (error) {
    console.error("Draft save error:", error);
    throw error;
  }
}

/**
 * Get application draft
 * @param {string} token - Supabase access token
 * @param {string} candidateId - Candidate ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Draft data if exists
 */
export async function getApplicationDraft(token, candidateId, jobId) {
  console.log("Retrieving application draft");
  
  try {
    const supabase = await supabaseClient(token);
    
    const { data, error } = await supabase
      .from('application_drafts')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    return data.length > 0 ? data[0] : null;
    
  } catch (error) {
    console.error("Draft retrieval error:", error);
    throw error;
  }
}
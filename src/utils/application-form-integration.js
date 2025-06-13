/**
 * Application Form Integration Utility
 * 
 * This utility provides functions to integrate the multi-step application form
 * with the Supabase backend storage.
 */

import { processMultiStepApplication } from '../api/applicationService';

/**
 * Prepare application data from form values
 * @param {Object} formValues - Form values from React Hook Form
 * @param {Object} user - Current user information
 * @param {Object} job - Job being applied to
 * @returns {Object} - Prepared application data
 */
export function prepareApplicationData(formValues, user, job) {
  return {
    // Required IDs
    candidate_id: user.id,
    job_id: job.id,
    
    // Form data
    ...formValues,
    
    // Metadata
    application_date: new Date().toISOString()
  };
}

/**
 * Submit application to Supabase
 * @param {string} token - Supabase access token
 * @param {Object} formValues - Form values from React Hook Form
 * @param {Object} user - Current user information
 * @param {Object} job - Job being applied to
 * @returns {Promise<Object>} - Submission result
 */
export async function submitApplicationToSupabase(token, formValues, user, job) {
  try {
    // Prepare the application data
    const applicationData = prepareApplicationData(formValues, user, job);
    
    // Process the application
    const result = await processMultiStepApplication(token, applicationData);
    
    return result;
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
}

/**
 * Validate resume file
 * @param {File} file - Resume file
 * @returns {boolean} - Validation result
 */
export function validateResumeFile(file) {
  // Check if file exists
  if (!file) return false;
  
  // Check file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(file.type)) return false;
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) return false;
  
  return true;
}

/**
 * Format application data for display
 * @param {Object} application - Application data from Supabase
 * @returns {Object} - Formatted application data
 */
export function formatApplicationData(application) {
  // Extract metadata if it exists
  const metadata = application.metadata || {};
  
  // Format the application date
  const applicationDate = new Date(application.created_at);
  const formattedDate = applicationDate.toLocaleDateString();
  
  return {
    id: application.id,
    jobId: application.job_id,
    candidateId: application.candidate_id,
    status: application.status,
    resumeUrl: application.resume_url,
    name: application.name,
    email: application.email,
    phone: application.phone,
    applicationDate: formattedDate,
    
    // Include metadata if available
    personal: metadata.personal || {},
    education: metadata.education || {},
    projects: metadata.projects || [],
    workExperiences: metadata.workExperiences || [],
    skills: metadata.skills || {}
  };
}
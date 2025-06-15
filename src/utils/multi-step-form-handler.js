/**
 * Multi-step Form Handler Utility
 * 
 * This utility provides functions to manage data collection and submission
 * for multi-step job application forms.
 */

import { processMultiStepApplication, saveApplicationDraft, getApplicationDraft } from "../api/apiMultiStepApplication";

/**
 * Collects and organizes form data from all steps
 * @param {Object} formData - Raw form data from React Hook Form
 * @param {Object} user - Current user information
 * @param {Object} job - Job being applied to
 * @returns {Object} - Organized application data ready for submission
 */
export function prepareApplicationData(formData, user, job) {
  // Extract user and job IDs
  const candidate_id = user.id;
  const job_id = job.id;
  
  // Organize personal information
  const personalInfo = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    middleName: formData.middleName,
    email: formData.email,
    contactNumber: formData.contactNumber,
    linkedinUrl: formData.linkedinUrl,
    githubUrl: formData.githubUrl,
    portfolioUrl: formData.portfolioUrl,
    address: formData.address
  };
  
  // Organize education information
  const educationInfo = {
    educationLevel: formData.educationLevel,
    collegeName: formData.collegeName,
    universityName: formData.universityName,
    degree: formData.degree,
    specialization: formData.specialization,
    graduationYear: formData.graduationYear,
    startYear: formData.startYear,
    endYear: formData.endYear,
    location: formData.location,
    cgpa: formData.cgpa
  };
  
  // Projects and work experience are already arrays
  const projects = formData.projects || [];
  const workExperiences = formData.workExperiences || [];
  
  // Organize skills and certifications
  const skillsInfo = {
    skills: formData.skills,
    technicalSkills: formData.technicalSkills,
    softSkills: formData.softSkills,
    languages: formData.languages,
    certifications: formData.certifications,
    experience: formData.experience
  };
  
  // Combine all data into a structured application object
  return {
    // Required fields for database
    job_id,
    candidate_id,
    resume: formData.resume, // File object array
    
    // Organized form data
    ...personalInfo,
    ...educationInfo,
    projects,
    workExperiences,
    ...skillsInfo,
    
    // Additional metadata
    application_date: new Date().toISOString()
  };
}

/**
 * Submits the complete application
 * @param {string} token - Supabase access token
 * @param {Object} formData - Complete form data
 * @param {Object} user - Current user information
 * @param {Object} job - Job being applied to
 * @returns {Promise<Object>} - Submission result
 */
export async function submitApplication(token, formData, user, job) {
  try {
    // Prepare the application data
    const applicationData = prepareApplicationData(formData, user, job);
    
    // Process the application using our API
    const result = await processMultiStepApplication(token, applicationData);
    
    // Clean up any drafts after successful submission
    try {
      // This is a non-critical operation, so we don't throw if it fails
      await deleteDraft(token, user.id, job.id);
    } catch (error) {
      console.warn("Failed to clean up draft after submission:", error);
    }
    
    return result;
  } catch (error) {
    console.error("Application submission error:", error);
    throw error;
  }
}

/**
 * Saves the current form state as a draft
 * @param {string} token - Supabase access token
 * @param {Object} formData - Current form data
 * @param {Object} user - Current user information
 * @param {Object} job - Job being applied to
 * @param {string} draftId - Optional existing draft ID
 * @returns {Promise<Object>} - Saved draft data
 */
export async function saveDraft(token, formData, user, job, draftId = null) {
  try {
    // Prepare the application data
    const draftData = prepareApplicationData(formData, user, job);
    
    // Add the current step to the draft data
    draftData.currentStep = formData.currentStep || 0;
    
    // Save the draft
    return await saveApplicationDraft(token, draftData, draftId);
  } catch (error) {
    console.error("Draft save error:", error);
    throw error;
  }
}

/**
 * Loads a saved draft
 * @param {string} token - Supabase access token
 * @param {string} candidateId - Candidate ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Draft data if exists
 */
export async function loadDraft(token, candidateId, jobId) {
  try {
    const draft = await getApplicationDraft(token, candidateId, jobId);
    return draft ? draft.draft_data : null;
  } catch (error) {
    console.error("Draft load error:", error);
    throw error;
  }
}

/**
 * Deletes a saved draft
 * @param {string} token - Supabase access token
 * @param {string} candidateId - Candidate ID
 * @param {string} jobId - Job ID
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteDraft(token, candidateId, jobId) {
  try {
    const supabase = await import("../utils/supabase").then(m => m.default(token));
    
    const { error } = await supabase
      .from('application_drafts')
      .delete()
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Draft delete error:", error);
    throw error;
  }
}
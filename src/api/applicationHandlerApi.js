import { submitApplication, getUserApplications, updateApplicationStatus } from '../services/applicationHandler';

/**
 * API function to apply to a job
 * @param {string} token - The authentication token
 * @param {Object} applicationData - The application data with Clerk user ID as candidate_id
 * @returns {Promise<Object>} The result of the application submission
 */
export async function applyToJob(token, applicationData) {
  console.log('API: Submitting job application');
  try {
    // applicationData.candidate_id should be the Clerk ID
    // The service will handle looking up the Supabase UUID
    const result = await submitApplication(token, applicationData);
    console.log('API: Application submitted successfully');
    return result;
  } catch (error) {
    console.error('API: Error submitting application:', error);
    throw error;
  }
}

/**
 * API function to get applications for a user
 * @param {string} token - The authentication token
 * @param {string} clerkId - The Clerk user ID
 * @returns {Promise<Array>} Array of applications
 */
export async function getApplications(token, clerkId) {
  console.log('API: Fetching applications for user with Clerk ID:', clerkId);
  try {
    // Pass the Clerk ID - the service will handle looking up the Supabase UUID
    const applications = await getUserApplications(token, clerkId);
    console.log(`API: Found ${applications.length} applications`);
    return applications;
  } catch (error) {
    console.error('API: Error fetching applications:', error);
    throw error;
  }
}

/**
 * API function to update application status
 * @param {string} token - The authentication token
 * @param {string} applicationId - The application ID
 * @param {string} status - The new status
 * @returns {Promise<Object>} The updated application
 */
export async function updateStatus(token, applicationId, status) {
  console.log(`API: Updating application ${applicationId} status to ${status}`);
  try {
    const updatedApplication = await updateApplicationStatus(token, applicationId, status);
    console.log('API: Application status updated successfully');
    return updatedApplication;
  } catch (error) {
    console.error('API: Error updating application status:', error);
    throw error;
  }
}

export default {
  applyToJob,
  getApplications,
  updateStatus
};
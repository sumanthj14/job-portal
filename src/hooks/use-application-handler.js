import { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { applyToJob } from '../api/applicationHandlerApi';

/**
 * Custom hook for handling job applications
 * @param {Object} options - Configuration options
 * @returns {Object} Application submission state and handlers
 */
export function useApplicationHandler(options = {}) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [applicationResult, setApplicationResult] = useState(null);

  /**
   * Submit a job application
   * @param {Object} formData - The form data including resume file
   * @param {string} jobId - The job ID
   * @param {Object} parsedResumeData - Optional parsed resume data
   * @returns {Promise<Object>} The result of the application submission
   */
  const submitApplication = async (formData, jobId, parsedResumeData = null) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setApplicationResult(null);

    try {
      if (!user) {
        throw new Error('User is not authenticated');
      }

      // Get the authentication token from Clerk
      const token = await getToken({ template: 'supabase' });
      
      // Prepare the application data
      const applicationData = {
        ...formData,
        job_id: jobId,
        candidate_id: user.id, // Use the Clerk user ID
      };

      // Add parsed resume data if available
      if (parsedResumeData) {
        applicationData.parsedResumeData = parsedResumeData;
      }
      
      // Submit the application
      const result = await applyToJob(token, applicationData);
      
      setSuccess(true);
      setApplicationResult(result);
      return result;
    } catch (err) {
      console.error('Error submitting application:', err);
      setError(err.message || 'An error occurred while submitting your application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitApplication,
    loading,
    error,
    success,
    applicationResult,
    resetState: () => {
      setLoading(false);
      setError(null);
      setSuccess(false);
      setApplicationResult(null);
    }
  };
}

export default useApplicationHandler;
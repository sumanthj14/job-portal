/**
 * Custom hook for handling multi-step application submission
 * 
 * This hook provides a clean interface for submitting multi-step job applications,
 * including resume upload and form data collection.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  processMultiStepApplication,
  saveApplicationDraft,
  getApplicationDraft,
  deleteApplicationDraft
} from '../api/applicationService';

/**
 * Custom hook for handling application submission
 * @param {Object} options - Configuration options
 * @param {Object} options.job - Job being applied to
 * @param {Function} options.onSuccess - Callback for successful submission
 * @param {Function} options.onError - Callback for submission errors
 * @returns {Object} - Submission state and control functions
 */
export default function useApplicationSubmission({
  job,
  onSuccess,
  onError
}) {
  // State for tracking submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [draftId, setDraftId] = useState(null);
  
  // Get the current user and session from Clerk
  const { userId, getToken } = useAuth();
  
  /**
   * Submit the complete application
   * @param {Object} formData - Complete form data from all steps
   * @returns {Promise<Object>} - Submission result
   */
  const submitApplication = useCallback(async (formData) => {
    if (!userId || !job) {
      const error = new Error('User or job information is missing');
      if (onError) onError(error);
      setError(error);
      return null;
    }
    
    setIsSubmitting(true);
    setError(null);
    setProgress(0);
    
    try {
      // Get the Supabase token from Clerk
      const token = await getToken({ template: 'supabase' });
      
      // Add user and job IDs to the form data
      const enrichedFormData = {
        ...formData,
        candidate_id: userId,
        job_id: job.id
      };
      
      // Start the upload process
      setIsUploading(true);
      setProgress(10);
      
      // Process the multi-step application
      const result = await processMultiStepApplication(token, enrichedFormData);
      
      setProgress(100);
      setIsUploading(false);
      
      // Delete any drafts after successful submission
      if (draftId) {
        try {
          await deleteApplicationDraft(token, draftId);
        } catch (draftError) {
          console.error('Error deleting draft:', draftError);
          // Non-critical error, don't throw
        }
      }
      
      // Call the success callback if provided
      if (onSuccess) onSuccess(result);
      
      return result;
    } catch (error) {
      console.error('Application submission error:', error);
      setError(error);
      
      // Call the error callback if provided
      if (onError) onError(error);
      
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, job, draftId, getToken, onSuccess, onError]);
  
  /**
   * Save the current application as a draft
   * @param {Object} formData - Current form data
   * @returns {Promise<Object>} - Saved draft data
   */
  const saveDraft = useCallback(async (formData) => {
    if (!userId || !job) {
      const error = new Error('User or job information is missing');
      setError(error);
      return null;
    }
    
    try {
      // Get the Supabase token from Clerk
      const token = await getToken({ template: 'supabase' });
      
      // Add user and job IDs to the form data
      const draftData = {
        ...formData,
        candidate_id: userId,
        job_id: job.id
      };
      
      // Save the draft
      const result = await saveApplicationDraft(token, draftData, draftId);
      
      // Update the draft ID for future updates
      setDraftId(result.id);
      
      return result;
    } catch (error) {
      console.error('Draft save error:', error);
      setError(error);
      return null;
    }
  }, [userId, job, draftId, getToken]);
  
  /**
   * Load a previously saved draft
   * @returns {Promise<Object>} - Loaded draft data
   */
  const loadDraft = useCallback(async () => {
    if (!userId || !job) {
      const error = new Error('User or job information is missing');
      setError(error);
      return null;
    }
    
    try {
      // Get the Supabase token from Clerk
      const token = await getToken({ template: 'supabase' });
      
      // Load the draft
      const draft = await getApplicationDraft(token, userId, job.id);
      
      if (draft) {
        // Update the draft ID for future updates
        setDraftId(draft.id);
        return draft.draft_data;
      }
      
      return null;
    } catch (error) {
      console.error('Draft load error:', error);
      setError(error);
      return null;
    }
  }, [userId, job, getToken]);
  
  /**
   * Delete a saved draft
   * @returns {Promise<boolean>} - Success status
   */
  const deleteDraft = useCallback(async () => {
    if (!draftId) return false;
    
    try {
      // Get the Supabase token from Clerk
      const token = await getToken({ template: 'supabase' });
      
      // Delete the draft
      await deleteApplicationDraft(token, draftId);
      
      // Clear the draft ID
      setDraftId(null);
      
      return true;
    } catch (error) {
      console.error('Draft deletion error:', error);
      setError(error);
      return false;
    }
  }, [draftId, getToken]);
  
  return {
    // State
    isSubmitting,
    isUploading,
    progress,
    error,
    draftId,
    
    // Actions
    submitApplication,
    saveDraft,
    loadDraft,
    deleteDraft
  };
}
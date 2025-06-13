/**
 * Custom hook for managing multi-step job applications
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitApplication, saveDraft, loadDraft, deleteDraft } from '../utils/multi-step-form-handler';
import useFetch from './use-fetch';
import { processMultiStepApplication } from '../api/apiMultiStepApplication';

/**
 * Custom hook for managing multi-step job applications
 * @param {Object} options - Configuration options
 * @param {Object} options.user - Current user information
 * @param {Object} options.job - Job being applied to
 * @param {Object} options.schema - Zod validation schema
 * @param {Object} options.defaultValues - Default form values
 * @param {Array} options.steps - Array of step definitions
 * @param {Function} options.onSuccess - Callback for successful submission
 * @param {Function} options.onError - Callback for submission errors
 * @returns {Object} - Form state and control functions
 */
export default function useMultiStepApplication({
  user,
  job,
  schema,
  defaultValues,
  steps,
  onSuccess,
  onError
}) {
  // State for managing the current step
  const [currentStep, setCurrentStep] = useState(0);
  const [draftId, setDraftId] = useState(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Initialize form with React Hook Form
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange'
  });
  
  // Use our custom fetch hook for API calls
  const { loading, error, fn: submitFn } = useFetch(processMultiStepApplication);
  
  // Load any existing draft when the component mounts
  useEffect(() => {
    if (!user || !job || draftLoaded) return;
    
    const fetchDraft = async () => {
      try {
        // Get the Supabase token
        // This assumes you have a way to get the token, adjust as needed
        const token = localStorage.getItem('supabase.auth.token');
        
        if (!token) return;
        
        const draftData = await loadDraft(token, user.id, job.id);
        
        if (draftData) {
          // Set the draft ID for future updates
          setDraftId(draftData.id);
          
          // Restore the current step
          if (draftData.currentStep !== undefined) {
            setCurrentStep(draftData.currentStep);
          }
          
          // Reset the form with the draft data
          form.reset(draftData);
          
          // Set the last saved timestamp
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      } finally {
        setDraftLoaded(true);
      }
    };
    
    fetchDraft();
  }, [user, job, form, draftLoaded]);
  
  // Auto-save draft when form values change
  useEffect(() => {
    if (!autosaveEnabled || !draftLoaded || !user || !job) return;
    
    const formValues = form.getValues();
    if (Object.keys(formValues).length === 0) return;
    
    // Debounce the save operation
    const timer = setTimeout(async () => {
      try {
        // Get the Supabase token
        const token = localStorage.getItem('supabase.auth.token');
        
        if (!token) return;
        
        // Include the current step in the form data
        const draftData = { ...formValues, currentStep };
        
        // Save the draft
        const result = await saveDraft(token, draftData, user, job, draftId);
        
        // Update the draft ID if this is a new draft
        if (result && result.id && !draftId) {
          setDraftId(result.id);
        }
        
        // Update the last saved timestamp
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error auto-saving draft:', error);
      }
    }, 2000); // Save after 2 seconds of inactivity
    
    return () => clearTimeout(timer);
  }, [form.watch(), currentStep, autosaveEnabled, draftLoaded, user, job, draftId]);
  
  // Navigation functions
  const nextStep = useCallback(() => {
    const isLastStep = currentStep === steps.length - 1;
    
    if (isLastStep) {
      // If this is the last step, submit the form
      form.handleSubmit(handleSubmit)();
    } else {
      // Validate the current step before proceeding
      const currentStepFields = steps[currentStep].fields || [];
      
      // Create a validation function that only validates the current step's fields
      const validateCurrentStep = async () => {
        const result = await form.trigger(currentStepFields);
        return result;
      };
      
      validateCurrentStep().then(isValid => {
        if (isValid) {
          setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
        }
      });
    }
  }, [currentStep, steps, form]);
  
  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);
  
  const goToStep = useCallback((step) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  }, [steps]);
  
  // Form submission handler
  const handleSubmit = useCallback(async (data) => {
    try {
      // Get the Supabase token
      const token = localStorage.getItem('supabase.auth.token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Submit the application
      const result = await submitFn(token, data);
      
      // Call the success callback
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Clean up the draft
      try {
        await deleteDraft(token, user.id, job.id);
        setDraftId(null);
      } catch (error) {
        console.warn('Error deleting draft:', error);
      }
      
      return result;
    } catch (error) {
      console.error('Error submitting application:', error);
      
      // Call the error callback
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  }, [submitFn, user, job, onSuccess, onError]);
  
  // Manual save function
  const saveDraftManually = useCallback(async () => {
    try {
      // Get the Supabase token
      const token = localStorage.getItem('supabase.auth.token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Get the current form values
      const formValues = form.getValues();
      
      // Include the current step in the form data
      const draftData = { ...formValues, currentStep };
      
      // Save the draft
      const result = await saveDraft(token, draftData, user, job, draftId);
      
      // Update the draft ID if this is a new draft
      if (result && result.id && !draftId) {
        setDraftId(result.id);
      }
      
      // Update the last saved timestamp
      setLastSaved(new Date());
      
      return result;
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    }
  }, [form, currentStep, user, job, draftId]);
  
  // Toggle autosave
  const toggleAutosave = useCallback(() => {
    setAutosaveEnabled(prev => !prev);
  }, []);
  
  return {
    // Form state
    currentStep,
    steps,
    form,
    loading,
    error,
    draftId,
    lastSaved,
    autosaveEnabled,
    
    // Navigation functions
    nextStep,
    prevStep,
    goToStep,
    
    // Form submission
    handleSubmit: form.handleSubmit(handleSubmit),
    
    // Draft management
    saveDraft: saveDraftManually,
    toggleAutosave,
    
    // Utility functions
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    currentStepData: steps[currentStep] || {}
  };
}
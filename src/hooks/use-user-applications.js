import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { getApplications } from '../api/applicationHandlerApi';

/**
 * Custom hook for fetching and managing user applications
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoFetch - Whether to fetch applications automatically on mount
 * @returns {Object} Applications data and handlers
 */
export function useUserApplications(options = { autoFetch: true }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch applications for the current user
   */
  const fetchApplications = useCallback(async () => {
    if (!user) {
      setError('User is not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the authentication token from Clerk
      const token = await getToken({ template: 'supabase' });
      
      // Fetch applications using the Clerk user ID
      const userApplications = await getApplications(token, user.id);
      setApplications(userApplications);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err.message || 'An error occurred while fetching your applications');
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  // Auto-fetch applications on mount if enabled
  useEffect(() => {
    if (options.autoFetch && user) {
      fetchApplications();
    }
  }, [options.autoFetch, user, fetchApplications]);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    refreshApplications: fetchApplications
  };
}

export default useUserApplications;
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '@clerk/clerk-react';
import { syncUserWithSupabase } from '@/api/apiUsers';

/**
 * This component handles synchronizing Clerk user data with Supabase
 * It runs on sign-in and when user data changes
 */
const ClerkWebhookHandler = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    // Only proceed if Clerk has loaded and user is signed in
    if (!isLoaded || !isSignedIn || !user) return;

    const syncUser = async () => {
      try {
        // Get the Supabase JWT token from Clerk
        const token = await getToken({ template: 'supabase' });
        
        if (!token) {
          console.error('Failed to get Supabase token from Clerk');
          return;
        }

        // Sync the user data with Supabase
        await syncUserWithSupabase(token, user);
        console.log('User synchronized with Supabase');
      } catch (error) {
        console.error('Error synchronizing user with Supabase:', error);
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user, getToken]);

  // This is a utility component that doesn't render anything
  return null;
};

export default ClerkWebhookHandler;
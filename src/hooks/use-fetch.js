import { useSession } from "@clerk/clerk-react";
import { useState } from "react";

const useFetch = (cb, options = {}) => {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const { session } = useSession();

  const fn = async (...args) => {
    setLoading(true);
    setError(null);

    try {
      // Check if session exists
      if (!session) {
        throw new Error("No active session found. Please sign in again.");
      }

      // Get Supabase token with better error handling
      let supabaseAccessToken;
      try {
        supabaseAccessToken = await session.getToken({
          template: "supabase",
        });
        
        if (!supabaseAccessToken) {
          throw new Error("Failed to retrieve Supabase access token");
        }
        
        console.log("Successfully retrieved Supabase token");
      } catch (tokenError) {
        console.error("Error getting Supabase token:", tokenError);
        throw new Error(`Authentication error: ${tokenError.message}`);
      }
      
      const response = await cb(supabaseAccessToken, options, ...args);
      setData(response);
      setError(null);
      return response; // Return the response for chaining
    } catch (error) {
      console.error("useFetch error:", error);
      setError(error);
      throw error; // Re-throw to allow handling in the component
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fn };
};

export default useFetch;

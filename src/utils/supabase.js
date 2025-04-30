import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance = null;

const supabaseClient = async (supabaseAccessToken) => {
  // If we already have an instance, update the headers and return it
  if (supabaseInstance) {
    // Update the authorization header with the new token
    // Using global headers instead of deprecated setAuth method
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${supabaseAccessToken}` } },
    });
    return supabaseInstance;
  }
  
  // Create a new instance if one doesn't exist
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${supabaseAccessToken}` } },
  });
  
  // set Supabase JWT on the client object,
  // so it is sent up with all Supabase requests
  return supabaseInstance;
};

export default supabaseClient;

import { createClient } from "@supabase/supabase-js";

// Support both browser (import.meta.env) and Node.js (process.env) environments
const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  return process.env[key];
};

export const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

console.log('Supabase URL in supabase.js:', supabaseUrl);

// Singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance = null;

const supabaseClient = async (supabaseAccessToken) => {
  // If we already have an instance, update the headers and return it
  if (supabaseInstance) {
    // Update the authorization header with the new token
    // Using global headers instead of deprecated setAuth method
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      global: { 
        headers: { 
          Authorization: `Bearer ${supabaseAccessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        } 
      },
    });
    return supabaseInstance;
  }
  
  // Create a new instance if one doesn't exist
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    global: { 
      headers: { 
        Authorization: `Bearer ${supabaseAccessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      } 
    },
  });
  
  // set Supabase JWT on the client object,
  // so it is sent up with all Supabase requests
  return supabaseInstance;
};

export default supabaseClient;

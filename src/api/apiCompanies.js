import supabaseClient, { supabaseUrl } from "@/utils/supabase";
import { createClient } from "@supabase/supabase-js";

// Fetch Companies
export async function getCompanies(token) {
  const supabase = await supabaseClient(token);
  const { data, error } = await supabase.from("companies").select("*");

  if (error) {
    console.error("Error fetching Companies:", error);
    return null;
  }

  return data;
}

/**
 * Validates if a string is a valid UUID or Clerk user ID
 * @param {string} uuid - The string to validate
 * @returns {boolean} - True if valid UUID or Clerk user ID, false otherwise
 */
export function isValidUUID(uuid) {
  // Standard UUID regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Clerk user ID regex (typically starts with 'user_' followed by alphanumeric characters)
  const clerkUserIdRegex = /^user_[a-zA-Z0-9]+$/;
  
  // Return true if it matches either pattern
  return uuidRegex.test(uuid) || clerkUserIdRegex.test(uuid);
}

/**
 * Uploads a company logo to Supabase Storage
 * @param {object} supabase - Supabase client instance
 * @param {string} userId - User ID to associate with the logo
 * @param {File} file - Logo file to upload
 * @returns {Promise<string>} - URL of the uploaded logo
 */
export async function uploadCompanyLogo(supabase, userId, file) {
  if (!isValidUUID(userId)) {
    throw new Error("Invalid user ID format. Must be a valid UUID.");
  }

  // Generate a unique filename with userId
  const fileName = `logos/${userId}-${file.name}`;

  try {
    console.log('Uploading logo to company-logo bucket');
    
    // Upload the logo file to Supabase storage
    const { data: uploadData, error: storageError } = await supabase.storage
      .from("company-logo")
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // Allow overwriting if file exists
        contentType: file.type || 'image/png', // Set the correct content type with fallback
      });

    if (storageError) {
      console.error("Storage error:", storageError);
      throw new Error("Error uploading company logo: " + storageError.message);
    }

    // Get the public URL directly from Supabase
    const { data: publicUrlData } = supabase.storage
      .from("company-logo")
      .getPublicUrl(fileName);
      
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Logo upload error:", err);
    throw new Error(err.message || "Failed to upload company logo");
  }
}

/**
 * Inserts company data into the Supabase database
 * @param {object} supabase - Supabase client instance
 * @param {string} userId - User ID for validation only, not stored in database
 * @param {object} companyData - Company data to insert
 * @returns {Promise<object>} - Inserted company data
 */
export async function insertCompanyData(supabase, userId, companyData) {
  if (!isValidUUID(userId)) {
    throw new Error("Invalid user ID format. Must be a valid UUID.");
  }

  try {
    const { data, error } = await supabase
      .from("companies")
      .insert([
        {
          name: companyData.name,
          logo_url: companyData.logo_url,
          // Note: description field removed as it doesn't exist in the schema
          // Note: user_id field removed as it doesn't exist in the schema
        },
      ])
      .select();

    if (error) {
      console.error("Database error:", error);
      throw new Error("Error inserting company data: " + error.message);
    }

    return data;
  } catch (err) {
    console.error("Company insertion error:", err);
    throw new Error(err.message || "Failed to insert company data");
  }
}

// Service role key for storage operations
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlY21iYW9sa3VyeHdkbHprbXhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDAyMjI0NCwiZXhwIjoyMDU5NTk4MjQ0fQ.pFghbPLnuBPyNIADfPcarN5CxIuKDbbpmS-6kCvO4zI';

/**
 * Creates a Supabase client with service role key for storage operations
 * @returns {object} - Supabase client with service role key
 */
export function createServiceRoleClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        // Set this header to bypass RLS policies
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    }
  });
}

/**
 * Adds a new company with logo upload and data insertion
 * @param {string} token - Authentication token
 * @param {string} _ - Unused parameter
 * @param {object} companyData - Company data including name, description, and logo file
 * @returns {Promise<object>} - Inserted company data
 */
export async function addNewCompany(token, _, companyData) {
  const supabase = await supabaseClient(token);
  const userId = companyData.userId; // Get userId from companyData

  try {
    // Validate userId is a valid UUID
    if (!isValidUUID(userId)) {
      throw new Error("Invalid user ID format. Must be a valid UUID.");
    }

    // Create a service role client for storage operations
    const serviceClient = createServiceRoleClient();
    
    // Step 1: Upload the logo using service role client
    const logo_url = await uploadCompanyLogo(serviceClient, userId, companyData.logo);
    console.log('Logo uploaded successfully, URL:', logo_url);

    // Step 2: Insert company data with the logo URL
    const companyWithLogo = {
      name: companyData.name,
      logo_url: logo_url,
      // Note: description field removed as it doesn't exist in the schema
    };

    const data = await insertCompanyData(serviceClient, userId, companyWithLogo);
    console.log('Company inserted successfully');
    
    return data;
  } catch (err) {
    console.error("Company creation error:", err);
    throw new Error(err.message || "Failed to create company");
  }
}

import supabaseClient from "@/utils/supabase";

/**
 * Generates a UUID v4 compatible with both browser and Node.js environments
 * @returns {string} A UUID v4 string
 */
function generateUUID() {
  // Check if we're in a Node.js environment with native crypto support
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      // Use Node.js crypto module
      const crypto = require('crypto');
      // Check if randomUUID is available (Node.js 14.17.0+ and 16.7.0+)
      if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      // Fallback for older Node.js versions
      return crypto.randomBytes(16).toString('hex').replace(
        /(.{8})(.{4})(.{4})(.{4})(.{12})/,
        '$1-$2-$3-$4-$5'
      );
    } catch (e) {
      // Fallback to browser implementation if require fails
      // This can happen in webpack environments
      console.warn('Node.js crypto module failed, using browser fallback:', e);
    }
  }
  
  // Browser implementation (or Node.js fallback)
  // Check if Web Crypto API is available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Use Web Crypto API
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }
  
  // Last resort fallback using Math.random (less secure but works everywhere)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Synchronizes a Clerk user with Supabase database
 * Called when a user signs in or signs up
 * @param {string} token - Supabase access token
 * @param {object} userData - User data from Clerk
 * @returns {Promise<object>} - The created or updated user record
 */
export async function syncUserWithSupabase(token, userData) {
  if (!userData || !userData.id) {
    console.error("Invalid user data provided for sync");
    return null;
  }

  // Create a properly configured Supabase client that can bypass RLS policies
  const supabase = await supabaseClient(token);
  
  // Add service role header to bypass RLS policies if needed
  // This is similar to the approach used in the test scripts
  supabase.headers = {
    ...supabase.headers,
    'x-supabase-auth-token': `Bearer ${token}`
  };
  
  // Check if user already exists
  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", userData.id)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 is the error code for "No rows found"
    console.error("Error checking for existing user:", fetchError);
    return null;
  }

  // Prepare user data for upsert - only include fields that exist in the database schema
  const userRecord = {
    clerk_id: userData.id,
    email: userData.emailAddresses?.[0]?.emailAddress || userData.email,
    // Map name fields to full_name if it exists in the schema
    full_name: userData.firstName && userData.lastName ? 
      `${userData.firstName} ${userData.lastName}` : undefined,
    role: userData.unsafeMetadata?.role || "candidate"
  };
  
  // Add UUID for new users only
  if (!existingUser) {
    // Generate a UUID that works in both Node.js and browser environments
    userRecord.id = generateUUID();
  }
  
  // Remove any undefined or null values to prevent 406 errors
  Object.keys(userRecord).forEach(key => {
    if (userRecord[key] === undefined || userRecord[key] === null) {
      delete userRecord[key];
    }
  });
  
  // Log the cleaned user record for debugging
  console.log("Prepared user record for Supabase:", JSON.stringify(userRecord, null, 2));

  // If user exists, update the record
  if (existingUser) {
    try {
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update(userRecord)
        .eq("clerk_id", userData.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user in Supabase:", updateError);
        console.error("Error details:", JSON.stringify(updateError, null, 2));
        console.error("Request payload:", JSON.stringify(userRecord, null, 2));
        return null;
      }

      console.log("User updated successfully:", updatedUser?.id);
      return updatedUser;
    } catch (err) {
      console.error("Unexpected error during user update:", err.message);
      return null;
    }
  }
  
  // If user doesn't exist, create a new record
  try {
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([userRecord])
      .select()
      .single();

    if (insertError) {
      console.error("Error creating user in Supabase:", insertError);
      console.error("Error details:", JSON.stringify(insertError, null, 2));
      console.error("Request payload:", JSON.stringify(userRecord, null, 2));
      
      // Check specifically for 406 errors which often indicate data format issues
      if (insertError.code === '406') {
        console.error("406 Not Acceptable error - This typically indicates a data format issue");
      }
      
      return null;
    }

    console.log("New user created successfully:", newUser?.id);
    return newUser;
  } catch (err) {
    console.error("Unexpected error during user creation:", err.message);
    return null;
  }
}

/**
 * Handles Clerk webhook events
 * @param {object} event - The webhook event from Clerk
 * @param {string} token - Supabase access token
 * @returns {Promise<object>} - Response object
 */
export async function handleClerkWebhook(token, event) {
  if (!event || !event.data) {
    return { status: 400, message: "Invalid webhook payload" };
  }

  const { type, data } = event;
  
  switch (type) {
    case "user.created":
    case "user.updated":
    case "user.signed_in":
      const user = await syncUserWithSupabase(token, data);
      return { 
        status: user ? 200 : 500, 
        message: user ? "User synchronized successfully" : "Failed to synchronize user",
        data: user
      };
    
    default:
      // Ignore other webhook events
      return { status: 200, message: `Ignored event: ${type}` };
  }
}
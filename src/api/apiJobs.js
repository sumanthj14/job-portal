import supabaseClient, { supabaseUrl } from "@/utils/supabase";
import { isValidUUID, createServiceRoleClient } from "@/api/apiCompanies";

/**
 * Helper function to get a Supabase UUID from a Clerk user ID
 * @param {string} clerkId - The Clerk user ID (starts with 'user_')
 * @returns {Promise<string>} - The corresponding Supabase UUID
 * @throws {Error} - If the UUID cannot be found
 */
async function getUuidFromClerkId(clerkId) {
  if (!clerkId || !clerkId.startsWith('user_')) {
    throw new Error('Invalid Clerk ID format');
  }
  
  // Create a service role client to bypass RLS policies
  const serviceClient = createServiceRoleClient();
  
  // Look up the user's UUID in the users table using their Clerk ID
  const { data: userData, error: userError } = await serviceClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .single();
    
  if (userError || !userData) {
    console.error("Error finding user UUID for Clerk ID:", userError || "User not found");
    throw new Error("Could not find a valid UUID for your user account. Please ensure your account is properly set up.");
  }
  
  console.log(`Mapped Clerk ID ${clerkId} to Supabase UUID ${userData.id}`);
  return userData.id;
}

// Fetch Jobs
export async function getJobs(token, { location, company_id, searchQuery }) {
  const supabase = await supabaseClient(token);
  let query = supabase
    .from("jobs")
    .select("*, saved: saved_jobs(id), company: companies(name,logo_url)");

  if (location) {
    query = query.eq("location", location);
  }

  if (company_id) {
    query = query.eq("company_id", company_id);
  }

  if (searchQuery) {
    query = query.ilike("title", `%${searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Jobs:", error);
    return null;
  }

  return data;
}

// Read Saved Jobs
export async function getSavedJobs(token) {
  const supabase = await supabaseClient(token);
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("*, job: jobs(*, company: companies(name,logo_url))");

  if (error) {
    console.error("Error fetching Saved Jobs:", error);
    return null;
  }

  return data;
}

// Read single job
export async function getSingleJob(token, { job_id }) {
  const supabase = await supabaseClient(token);
  let query = supabase
    .from("jobs")
    .select(
      "*, company: companies(name,logo_url), applications: applications(*)"
    )
    .eq("id", job_id)
    .single();

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Job:", error);
    return null;
  }

  return data;
}

// - Add / Remove Saved Job
export async function saveJob(token, { alreadySaved }, saveData) {
  const supabase = await supabaseClient(token);

  if (alreadySaved) {
    // If the job is already saved, remove it
    const { data, error: deleteError } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("job_id", saveData.job_id);

    if (deleteError) {
      console.error("Error removing saved job:", deleteError);
      return data;
    }

    return data;
  } else {
    // If the job is not saved, add it to saved jobs
    const { data, error: insertError } = await supabase
      .from("saved_jobs")
      .insert([saveData])
      .select();

    if (insertError) {
      console.error("Error saving job:", insertError);
      return data;
    }

    return data;
  }
}

// - job status toggle - (recruiter_id = auth.uid())
export async function updateHiringStatus(token, { job_id }, status) {
  const supabase = await supabaseClient(token);
  
  const { data, error } = await supabase
    .from("jobs")
    .update({ isopen: status })
    .eq("id", job_id)
    .select();

  if (error) {
    console.error("Error Updating Hiring Status:", error);
    return null;
  }

  return data;
}

// get my created jobs
export async function getMyJobs(token, { recruiter_id }) {
  const supabase = await supabaseClient(token);
  
  try {
    // Handle Clerk user IDs by looking up the corresponding UUID
    let actualRecruiterId = recruiter_id;
    
    if (recruiter_id && recruiter_id.startsWith('user_')) {
      console.log('Clerk user ID detected in getMyJobs, fetching corresponding UUID from Supabase');
      // Get the UUID from the Clerk ID using our helper function
      actualRecruiterId = await getUuidFromClerkId(recruiter_id);
    }
    
    // Query jobs with the correct UUID
    const { data, error } = await supabase
      .from("jobs")
      .select("*, company: companies(name,logo_url)")
      .eq("recruiter_id", actualRecruiterId);

    if (error) {
      console.error("Error fetching Jobs:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error fetching jobs:", err);
    return null;
  }
}

// Delete job
export async function deleteJob(token, { job_id }) {
  const supabase = await supabaseClient(token);

  const { data, error: deleteError } = await supabase
    .from("jobs")
    .delete()
    .eq("id", job_id)
    .select();

  if (deleteError) {
    console.error("Error deleting job:", deleteError);
    return data;
  }

  return data;
}

// - post job
export async function addNewJob(token, _, jobData) {
  const supabase = await supabaseClient(token);

  try {
    // Validate the job data before insertion
    const validatedJobData = validateJobData(jobData);
    
    // Handle recruiter_id - if it's a Clerk ID, we need to get the corresponding UUID from Supabase
    if (jobData.recruiter_id) {
      // Check if it's a Clerk user ID (starts with 'user_')
      if (jobData.recruiter_id.startsWith('user_')) {
        console.log('Clerk user ID detected, fetching corresponding UUID from Supabase');
        
        // Get the UUID from the Clerk ID using our helper function
        validatedJobData.recruiter_id = await getUuidFromClerkId(jobData.recruiter_id);
        
        // Create a service role client to bypass RLS policies
        const serviceClient = createServiceRoleClient();
        
        // Insert job data using service role client
        const { data, error } = await serviceClient
          .from("jobs")
          .insert([validatedJobData])
          .select();
          
        if (error) {
          console.error("Error creating job with service role:", error);
          throw new Error("Error creating job: " + error.message);
        }
        
        return data;
      } else {
        // If it's a regular UUID, add it to the validated data
        validatedJobData.recruiter_id = jobData.recruiter_id;
      }
    }
    
    // Note: isopen field is already set in validateJobData function
    // No need to set it again here

    // Only reach here if not using service client
    const { data, error } = await supabase
      .from("jobs")
      .insert([validatedJobData])
      .select();

    if (error) {
      console.error("Error creating job:", error);
      throw new Error("Error creating job: " + error.message);
    }

    return data;
  } catch (err) {
    console.error("Job creation error:", err);
    throw new Error(err.message || "Failed to create job");
  }
}

/**
 * Validates job data before insertion or update
 * @param {object} jobData - Job data to validate
 * @returns {object} - Validated job data
 * @throws {Error} - If validation fails
 */
function validateJobData(jobData) {
  // Create a new object with only the fields we want to validate and update
  const validatedData = {};
  
  // Required fields
  if (!jobData.title || jobData.title.trim() === '') {
    throw new Error('Job title is required');
  }
  validatedData.title = jobData.title.trim();
  
  if (!jobData.description || jobData.description.trim() === '') {
    throw new Error('Job description is required');
  }
  validatedData.description = jobData.description.trim();
  
  if (!jobData.location || jobData.location.trim() === '') {
    throw new Error('Job location is required');
  }
  validatedData.location = jobData.location.trim();
  
  // Optional fields with defaults
  validatedData.salary = jobData.salary ? jobData.salary.trim() : '';
  
  // Company ID validation
  if (jobData.company_id) {
    // Use the imported isValidUUID function from apiCompanies.js
    // If company_id is not a valid UUID, throw an error
    if (!isValidUUID(jobData.company_id)) {
      throw new Error(`Invalid company_id format: ${jobData.company_id}. Must be a valid UUID.`);
    }
    
    validatedData.company_id = jobData.company_id;
  }
  
  // Recruiter ID validation
  if (jobData.recruiter_id) {
    // For Clerk IDs (starting with 'user_'), we'll handle the conversion in addNewJob
    // so we don't need to add it to validatedData here
    if (jobData.recruiter_id.startsWith('user_')) {
      // We'll handle this in addNewJob by looking up the corresponding UUID
      console.log('Clerk user ID detected in validation, will be processed in addNewJob');
      // Don't add to validatedData as we'll replace it with the UUID later
    } else if (isValidUUID(jobData.recruiter_id)) {
      // If it's a valid UUID, add it directly
      validatedData.recruiter_id = jobData.recruiter_id;
    } else {
      // If it's neither a UUID nor a Clerk ID, throw an error
      throw new Error(`Invalid recruiter_id format: ${jobData.recruiter_id}. Must be a valid UUID or Clerk user ID.`);
    }
  }
  
  // Handle isopen field (job status)
  validatedData.isopen = jobData.isOpen !== undefined ? jobData.isOpen : true;
  
  return validatedData;
}

/**
 * Updates an existing job posting in the database
 * @param {string} token - Authentication token
 * @param {object} params - Parameters containing job_id
 * @param {object} updatedJobData - Updated job data
 * @returns {Promise<object>} - Updated job data
 */
export async function updateJob(token, { job_id }, updatedJobData) {
  const supabase = await supabaseClient(token);

  try {
    // Validate that the job exists and belongs to the user
    const { data: existingJob, error: fetchError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (fetchError) {
      console.error("Error fetching job for update:", fetchError);
      throw new Error("Job not found or you don't have permission to update it");
    }
    
    // Convert isOpen field to isopen for database compatibility
    if (updatedJobData.isOpen !== undefined) {
      updatedJobData.isopen = updatedJobData.isOpen;
      delete updatedJobData.isOpen;
    }
    
    // Handle recruiter_id if it's a Clerk ID
    if (updatedJobData.recruiter_id && updatedJobData.recruiter_id.startsWith('user_')) {
      console.log('Clerk user ID detected in update, fetching corresponding UUID from Supabase');
      // Get the UUID from the Clerk ID using our helper function
      updatedJobData.recruiter_id = await getUuidFromClerkId(updatedJobData.recruiter_id);
    }
    
    // Validate the job data
    const validatedJobData = validateJobData({
      ...existingJob, // Start with existing data
      ...updatedJobData, // Override with updated fields
    });

    // Update the job in the database
    const { data, error } = await supabase
      .from("jobs")
      .update(validatedJobData)
      .eq("id", job_id)
      .select();

    if (error) {
      console.error("Error updating job:", error);
      throw new Error("Error updating job: " + error.message);
    }

    return data;
  } catch (err) {
    console.error("Job update error:", err);
    throw new Error(err.message || "Failed to update job");
  }
}

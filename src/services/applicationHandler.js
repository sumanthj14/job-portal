import { createClient } from "@supabase/supabase-js";

// Import the supabase client and URL
let supabaseClient, supabaseUrl;
try {
  const regularSupabase = await import('../utils/supabase');
  supabaseClient = regularSupabase.default;
  supabaseUrl = regularSupabase.supabaseUrl;
} catch (error) {
  console.error('Error importing supabase client:', error);
  throw new Error('Failed to initialize Supabase client');
}

// Support both browser and Node.js environments for env variables
const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  return process.env[key];
};

// Get service role key for operations that need to bypass RLS
const serviceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

/**
 * Creates a Supabase client with service role permissions that can bypass RLS
 * @returns {Object} Supabase client with service role permissions
 */
function createServiceRoleClient() {
  if (!serviceRoleKey) {
    console.error("Service role key is undefined or empty");
    throw new Error("Service role key is missing. Please check your environment variables.");
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    }
  });
}

/**
 * Validates a resume file for type and size constraints
 * @param {File} file - The resume file to validate
 * @returns {Object} Object containing validation result and error message if any
 */
function validateResumeFile(file) {
  if (!file) {
    return { valid: false, error: "Resume file is required. Please upload a PDF or Word document." };
  }
  
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  
  // Handle case where file type might be undefined
  if (!file.type) {
    // Try to determine file type from extension
    const fileName = file.name || '';
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    if (fileExt === 'pdf' || fileExt === 'doc' || fileExt === 'docx') {
      // Continue processing as the extension is valid
      // Set the file type based on extension for further processing
      if (fileExt === 'pdf') {
        file.type = 'application/pdf';
      } else if (fileExt === 'doc') {
        file.type = 'application/msword';
      } else if (fileExt === 'docx') {
        file.type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    } else {
      return { valid: false, error: "Invalid file type. Only PDF or Word documents are allowed." };
    }
  } else if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Only PDF or Word documents are allowed.` };
  }
  
  // Check file size (limit to 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds the 10MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB` };
  }
  
  return { valid: true };
}

/**
 * Finds the Supabase UUID for a user based on their Clerk ID
 * @param {Object} serviceClient - The Supabase service client
 * @param {string} clerkId - The Clerk user ID
 * @returns {Promise<string>} The Supabase UUID
 */
async function getSupabaseUuidFromClerkId(serviceClient, clerkId) {
  try {
    console.log(`Looking up Supabase UUID for Clerk ID: ${clerkId}`);
    
    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();
      
    if (userError) {
      console.error("Error finding user:", userError);
      throw new Error(`Error finding user: ${userError.message}`);
    }
    
    if (!userData || !userData.id) {
      throw new Error(`No user found with clerk_id: ${clerkId}`);
    }
    
    console.log(`Found Supabase UUID ${userData.id} for Clerk ID ${clerkId}`);
    return userData.id;
  } catch (error) {
    console.error("Exception during user lookup:", error);
    throw error;
  }
}

/**
 * Uploads a resume file to Supabase storage
 * @param {Object} serviceClient - The Supabase service client
 * @param {File} file - The resume file to upload
 * @param {string} jobId - The job ID
 * @param {string} candidateId - The candidate ID (Clerk ID for filename)
 * @returns {Promise<Object>} Object containing the upload result with public URL
 */
async function uploadResumeFile(serviceClient, file, jobId, candidateId) {
  try {
    console.log(`Starting resume upload for job ${jobId} and candidate ${candidateId}`);
    
    // Create a unique filename
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop();
    // Ensure we have a valid filename regardless of candidate_id format
    const safeCandidate = candidateId.replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = `resume_${jobId}_${safeCandidate}_${timestamp}.${fileExtension}`;
    
    // Ensure the 'resumes' bucket exists
    const { data: buckets, error: bucketsError } = await serviceClient.storage.listBuckets();
    
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      throw new Error(`Error accessing storage: ${bucketsError.message}`);
    }
    
    // Check if 'resumes' bucket exists, create it if it doesn't
    const resumesBucketExists = buckets && buckets.some(bucket => bucket.name === "resumes");
    
    if (!resumesBucketExists) {
      console.log("'resumes' bucket does not exist, creating it...");
      const { error: createBucketError } = await serviceClient.storage
        .createBucket("resumes", { public: true });
        
      if (createBucketError) {
        console.error("Error creating 'resumes' bucket:", createBucketError);
        throw new Error(`Error creating storage bucket: ${createBucketError.message}`);
      }
      console.log("'resumes' bucket created successfully");
    }
    
    // Convert File object to ArrayBuffer for more reliable upload
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`Uploading file ${fileName} to 'resumes' bucket...`);
    // Upload file using service role client
    const { data: uploadData, error: storageError } = await serviceClient.storage
      .from("resumes")
      .upload(fileName, uint8Array, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (storageError) {
      console.error("Resume upload error:", storageError);
      throw new Error(`Error uploading resume: ${storageError.message}`);
    }
    
    // Get the public URL from Supabase
    const { data: publicUrlData } = serviceClient.storage
      .from("resumes")
      .getPublicUrl(fileName);
      
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error("Failed to generate resume URL.");
    }
    
    console.log(`Resume uploaded successfully. Public URL: ${publicUrlData.publicUrl}`);
    return { 
      success: true, 
      fileName, 
      publicUrl: publicUrlData.publicUrl 
    };
  } catch (error) {
    console.error("Exception during file upload:", error);
    throw new Error(`Error uploading resume: ${error.message}`);
  }
}

/**
 * Saves application data to the applications table
 * @param {Object} serviceClient - The Supabase service client
 * @param {Object} applicationData - The application data to save
 * @returns {Promise<Object>} The saved application data
 */
async function saveApplicationData(serviceClient, applicationData) {
  try {
    console.log("Preparing to save application data to database");
    
    // Filter out any fields that don't exist in the applications table
    // This is based on the schema we've seen in the migrations
    const validFields = [
      'id', 'job_id', 'candidate_id', 'name', 'email', 'phone',
      'resume', 'status', 'created_at', 'updated_at', 'metadata',
      'skills', 'education', 'experience'
    ];
    
    // Create a new object with only valid fields
    const filteredData = {};
    for (const field of validFields) {
      if (applicationData[field] !== undefined) {
        filteredData[field] = applicationData[field];
      }
    }
    
    // Add timestamps if not provided
    if (!filteredData.created_at) {
      filteredData.created_at = new Date().toISOString();
    }
    if (!filteredData.updated_at) {
      filteredData.updated_at = new Date().toISOString();
    }
    
    console.log("Saving application data:", {
      ...filteredData,
      resume: filteredData.resume ? "[Resume URL]" : null // Log resume URL presence without showing full URL
    });
    
    // Insert the application data
    const { data, error } = await serviceClient
      .from("applications")
      .insert(filteredData)
      .select();
      
    if (error) {
      console.error("Error inserting application data:", error);
      throw new Error(`Error saving application: ${error.message}`);
    }
    
    console.log("Application saved successfully with ID:", data[0].id);
    return data[0];
  } catch (error) {
    console.error("Exception during database operation:", error);
    throw new Error(`Error saving application data: ${error.message}`);
  }
}

/**
 * Submits a job application with resume upload and database entry
 * @param {string} token - The authentication token
 * @param {Object} applicationData - The application data including resume file and Clerk user ID
 * @returns {Promise<Object>} The result of the application submission
 */
export async function submitApplication(token, applicationData) {
  console.log("Starting job application process");
  
  try {
    // Initialize Supabase client with the provided token
    const supabase = await supabaseClient(token);
    
    // Create a service role client for operations that need to bypass RLS
    const serviceClient = createServiceRoleClient();
    
    // Extract and validate the resume file
    const resumeFile = applicationData.resume?.[0];
    const validation = validateResumeFile(resumeFile);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Get the Supabase UUID for the user based on their Clerk ID
    const clerkId = applicationData.candidate_id;
    const supabaseUserId = await getSupabaseUuidFromClerkId(serviceClient, clerkId);
    
    // Upload the resume file - still use clerk_id for filename to maintain compatibility
    const uploadResult = await uploadResumeFile(
      serviceClient,
      resumeFile, 
      applicationData.job_id, 
      clerkId
    );
    
    // Prepare the application data for database insertion
    const dbApplicationData = {
      job_id: applicationData.job_id,
      candidate_id: supabaseUserId, // Use the Supabase UUID instead of Clerk ID
      name: applicationData.name,
      email: applicationData.email,
      phone: applicationData.phone,
      status: applicationData.status || 'applied',
      resume: uploadResult.publicUrl
    };
    
    // Add parsed resume data to metadata if available
    if (applicationData.parsedResumeData) {
      dbApplicationData.metadata = applicationData.parsedResumeData;
      
      // Extract specific fields from parsed data if they exist
      if (applicationData.parsedResumeData.skills) {
        dbApplicationData.skills = Array.isArray(applicationData.parsedResumeData.skills) 
          ? applicationData.parsedResumeData.skills.join(', ')
          : applicationData.parsedResumeData.skills;
      }
      
      if (applicationData.parsedResumeData.education) {
        dbApplicationData.education = typeof applicationData.parsedResumeData.education === 'string'
          ? applicationData.parsedResumeData.education
          : JSON.stringify(applicationData.parsedResumeData.education);
      }
      
      if (applicationData.parsedResumeData.experience) {
        dbApplicationData.experience = typeof applicationData.parsedResumeData.experience === 'string'
          ? applicationData.parsedResumeData.experience
          : JSON.stringify(applicationData.parsedResumeData.experience);
      }
    }
    
    // Save the application data to the database
    const savedApplication = await saveApplicationData(serviceClient, dbApplicationData);
    
    console.log("Application submitted successfully:", savedApplication.id);
    return savedApplication;
  } catch (error) {
    console.error("Application submission error:", error);
    throw error;
  }
}

/**
 * Gets all applications for a specific user
 * @param {string} token - The authentication token
 * @param {string} clerkId - The Clerk user ID
 * @returns {Promise<Array>} Array of applications
 */
export async function getUserApplications(token, clerkId) {
  try {
    console.log(`Fetching applications for user with Clerk ID: ${clerkId}`);
    
    const supabase = await supabaseClient(token);
    const serviceClient = createServiceRoleClient();
    
    // Get the Supabase UUID for the user based on their Clerk ID
    const supabaseUserId = await getSupabaseUuidFromClerkId(serviceClient, clerkId);
    
    // Query applications using the Supabase UUID
    const { data, error } = await supabase
      .from("applications")
      .select("*, job:jobs(title, company:companies(name))")
      .eq("candidate_id", supabaseUserId);

    if (error) {
      console.error("Error fetching applications:", error);
      throw new Error(`Error fetching applications: ${error.message}`);
    }

    console.log(`Found ${data.length} applications for user`);
    return data;
  } catch (error) {
    console.error("Exception during applications fetch:", error);
    throw error;
  }
}

/**
 * Updates the status of an application
 * @param {string} token - The authentication token
 * @param {string} applicationId - The application ID
 * @param {string} status - The new status
 * @returns {Promise<Object>} The updated application
 */
export async function updateApplicationStatus(token, applicationId, status) {
  try {
    console.log(`Updating application ${applicationId} status to ${status}`);
    
    const supabase = await supabaseClient(token);
    const { data, error } = await supabase
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", applicationId)
      .select();

    if (error) {
      console.error("Error updating application status:", error);
      throw new Error(`Error updating application status: ${error.message}`);
    }

    console.log(`Application status updated successfully`);
    return data[0];
  } catch (error) {
    console.error("Exception during status update:", error);
    throw error;
  }
}

export default {
  submitApplication,
  getUserApplications,
  updateApplicationStatus
};
// Try to import from test-supabase.js if running in test mode, otherwise use the regular import
let supabaseClient, supabaseUrl;

try {
  // First try to import from test-supabase.js (for tests)
  const testSupabase = await import('../../test-supabase.js');
  supabaseClient = testSupabase.default;
  supabaseUrl = testSupabase.supabaseUrl;
  console.log('Using test-supabase.js in apiApplication.js');
} catch (error) {
  // Fall back to regular import (for production)
  const regularSupabase = await import('../utils/supabase');
  supabaseClient = regularSupabase.default;
  supabaseUrl = regularSupabase.supabaseUrl;
  console.log('Using regular supabase.js in apiApplication.js');
}

// Export supabaseClient as default for mocking in tests
export default supabaseClient;
import { createClient } from "@supabase/supabase-js";

// Service role key for operations that need to bypass RLS
// Support both browser (import.meta.env) and Node.js (process.env) environments
const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  return process.env[key];
};

const serviceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');
console.log('Service Role Key in apiApplication.js (first 10 chars):', serviceRoleKey ? serviceRoleKey.substring(0, 10) + '...' : 'undefined');

// Create a service role client that can bypass RLS policies
// Create a service role client that can bypass RLS policies
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
        // Set this header to bypass RLS policies
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    }
  });
}

// - Apply to job ( candidate )
export async function applyToJob(token, _, jobData) {
  console.log("Starting job application process with data:", { ...jobData, resume: jobData.resume ? "[File Object]" : null });
  
  try {
    // Log the token (partially masked for security)
    const tokenPreview = token ? `${token.substring(0, 10)}...` : 'null';
    console.log("Using Supabase token (preview):", tokenPreview);
    
    const supabase = await supabaseClient(token);
    console.log("Supabase client initialized with URL:", supabaseUrl);

    // Validate file type
    const resumeFile = jobData.resume?.[0]; // Access the first file in the array
    console.log("Resume file info:", resumeFile ? {
      name: resumeFile.name,
      type: resumeFile.type,
      size: resumeFile.size
    } : "No resume file");
    
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    // Check if file exists
    if (!resumeFile) {
      console.error("No resume file provided");
      throw new Error("Resume file is required. Please upload a PDF or Word document.");
    }
    
    // Check if file type is valid
    // Handle case where file type might be undefined
    if (!resumeFile.type) {
      console.error("File type is undefined");
      // Try to determine file type from extension
      const fileName = resumeFile.name || '';
      const fileExt = fileName.split('.').pop().toLowerCase();
      
      if (fileExt === 'pdf' || fileExt === 'doc' || fileExt === 'docx') {
        console.log("File type determined from extension:", fileExt);
        // Continue processing as the extension is valid
      } else {
        throw new Error("Invalid file type. Only PDF or Word documents are allowed.");
      }
    } else if (!allowedTypes.includes(resumeFile.type)) {
      console.error("Invalid file type:", resumeFile.type);
      throw new Error("Invalid file type. Only PDF or Word documents are allowed.");
    }
    
    // Check file size (limit to 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (resumeFile.size > MAX_FILE_SIZE) {
      console.error("File size too large:", resumeFile.size);
      throw new Error("File size exceeds the 10MB limit.");
    }

    // Create a unique filename using job_id and candidate_id with file extension
    const timestamp = new Date().getTime();
    const fileExtension = resumeFile.name.split('.').pop();
    // Ensure we have a valid filename regardless of candidate_id format
    const safeCandidate = jobData.candidate_id.replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = `resume_${jobData.job_id}_${safeCandidate}_${timestamp}.${fileExtension}`;
    console.log("Generated filename:", fileName);
    
    // Check if the bucket exists
    console.log("Checking if 'resumes' bucket exists");
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
      
    console.log("Available buckets:", buckets);
    
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      console.error("Bucket error details:", JSON.stringify(bucketsError));
      throw new Error(`Error accessing storage: ${bucketsError.message}`);
    }
    
    // Check if 'resumes' bucket exists, create it if it doesn't
    const resumesBucketExists = buckets && buckets.some(bucket => bucket.name === "resumes");
    
    if (!resumesBucketExists) {
      console.log("'resumes' bucket doesn't exist, creating it");
      try {
        const { data: createBucketData, error: createBucketError } = await supabase
          .storage
          .createBucket("resumes", {
            public: true
          });
          
        console.log("Create bucket response:", createBucketData);
        
        if (createBucketError) {
          console.error("Error creating 'resumes' bucket:", createBucketError);
          console.error("Create bucket error details:", JSON.stringify(createBucketError));
          
          // Continue with upload attempt even if bucket creation fails
          console.log("Attempting to upload to existing bucket despite creation error");
        } else {
          console.log("'resumes' bucket created successfully");
        }
      } catch (bucketError) {
        console.error("Exception creating bucket:", bucketError);
        // Continue with upload attempt even if bucket creation fails
        console.log("Attempting to upload to existing bucket despite creation exception");
      }
    }
    
    // Upload file to Supabase Storage using service role client to bypass RLS
    console.log("Attempting to upload file to Supabase Storage using service role client");
    try {
      // Create a service role client for storage operations
      const serviceClient = createServiceRoleClient();
      console.log("Service role client created");
      
      // Convert File object to ArrayBuffer for more reliable upload
      const arrayBuffer = await resumeFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // First ensure the bucket exists using service role client
      console.log("Checking if 'resumes' bucket exists using service role client");
      const { data: serviceBuckets, error: serviceBucketsError } = await serviceClient.storage.listBuckets();
      
      if (serviceBucketsError) {
        console.error("Error listing buckets with service role:", serviceBucketsError);
        console.error("Service bucket error details:", JSON.stringify(serviceBucketsError));
      } else {
        console.log("Available buckets with service role:", serviceBuckets);
        
        // Create bucket if it doesn't exist
        const resumesBucketExists = serviceBuckets && serviceBuckets.some(bucket => bucket.name === "resumes");
        if (!resumesBucketExists) {
          console.log("Creating 'resumes' bucket with service role client");
          const { data: createBucketData, error: createBucketError } = await serviceClient.storage
            .createBucket("resumes", { public: true });
            
          if (createBucketError) {
            console.error("Error creating bucket with service role:", createBucketError);
          } else {
            console.log("Bucket created successfully with service role");
          }
        }
      }
      
      // Upload file using service role client
      console.log("Uploading file with service role client");
      const { data: uploadData, error: storageError } = await serviceClient.storage
        .from("resumes")
        .upload(fileName, uint8Array, {
          cacheControl: '3600',
          upsert: true, // Allow overwriting if file exists
          contentType: resumeFile.type // Set the correct content type
        });

      if (storageError) {
        console.error("Resume upload error with service role:", storageError);
        console.error("Upload error details:", JSON.stringify(storageError));
        console.error("❌ RESUME STORAGE: Failed to store resume in Supabase 'resumes' bucket");
        throw new Error(`Error uploading resume: ${storageError.message}`);
      }
      
      console.log("File uploaded successfully with service role:", uploadData);
      console.log("✅ RESUME STORAGE: Successfully stored resume in Supabase 'resumes' bucket");

      // Get the public URL from Supabase
      console.log("Getting public URL");
      const { data: publicUrlData } = serviceClient.storage
        .from("resumes")
        .getPublicUrl(fileName);
        
      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error("Failed to generate public URL", publicUrlData);
        throw new Error("Failed to generate resume URL.");
      }
      
      // Store the public URL for the resume
      const resume_url = publicUrlData.publicUrl;
      console.log("Resume public URL generated:", resume_url);
      
      // Get the Supabase UUID for the user based on their Clerk ID
      console.log("Looking up Supabase UUID for Clerk ID:", jobData.candidate_id);
      const { data: userData, error: userError } = await serviceClient
        .from("users")
        .select("id")
        .eq("clerk_id", jobData.candidate_id)
        .single();
        
      if (userError) {
        console.error("Error finding user:", userError);
        throw new Error(`Error finding user: ${userError.message}`);
      }
      
      if (!userData || !userData.id) {
        throw new Error(`No user found with clerk_id: ${jobData.candidate_id}`);
      }
      
      const supabaseUserId = userData.id;
      console.log(`Found Supabase UUID ${supabaseUserId} for Clerk ID ${jobData.candidate_id}`);
      
      // Save application data to database
      console.log("Saving application data to database");
      
      // Prepare application data with resume URL
      const applicationData = {
        job_id: jobData.job_id,
        candidate_id: supabaseUserId, // Use the Supabase UUID
        clerk_id: jobData.candidate_id, // Store the original Clerk ID
        status: jobData.status || 'applied',
        resume: resume_url, // Use the URL we generated
        created_at: new Date().toISOString()
      };
      
      // Add metadata field for storing parsed resume data if available
      if (jobData.parsedResumeData) {
        applicationData.metadata = jobData.parsedResumeData;
      }
      
      // Add name, email, and phone fields if provided
      if (jobData.name) {
        applicationData.name = jobData.name;
      }
      
      if (jobData.email) {
        applicationData.email = jobData.email;
      }
      
      if (jobData.phone) {
        applicationData.phone = jobData.phone;
      }
      
      console.log("Application data to save:", applicationData);
      
      // Use service role client to bypass RLS for database insert
      // We already have a service client from the file upload
      
      const { data: insertData, error: insertError } = await serviceClient
        .from("applications")
        .insert(applicationData)
        .select();
        
      if (insertError) {
        console.error("Error inserting application data:", insertError);
        console.error("Insert error details:", JSON.stringify(insertError));
        throw new Error(`Error saving application: ${insertError.message}`);
      }
      
      console.log("Application saved successfully:", insertData);
      console.log("✅ COMPLETE PROCESS: Resume stored in Supabase and application data saved to database");
      return insertData[0];
    } catch (uploadError) {
      console.error("Exception during file upload or database operation:", uploadError);
      console.error("❌ RESUME STORAGE: Failed to complete resume storage process in Supabase due to an exception");
      throw new Error(`Error processing application: ${uploadError.message}`);
    }
  } catch (error) {
    console.error("Application process error:", error);
    throw error;
  }
}

// - Edit Application Status ( recruiter )
export async function updateApplicationStatus(token, { job_id }, status) {
  const supabase = await supabaseClient(token);
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("job_id", job_id)
    .select();

  if (error) {
    throw error;
  }

  return data;
}

export async function getApplications(token, { user_id }) {
  const supabase = await supabaseClient(token);
  const { data, error } = await supabase
    .from("applications")
    .select("*, job:jobs(title, company:companies(name))")
    .eq("candidate_id", user_id);

  if (error) {
    console.error("Error fetching Applications:", error);
    return null;
  }

  return data;
}

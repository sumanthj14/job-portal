const { createClient } = require('@supabase/supabase-js');

// Support both browser (import.meta.env) and Node.js (process.env) environments
const getEnv = (key) => {
  return process.env[key];
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
const serviceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

console.log('Supabase URL in test-apiApplication.js:', supabaseUrl);
console.log('Service Role Key in test-apiApplication.js (first 10 chars):', serviceRoleKey ? serviceRoleKey.substring(0, 10) + '...' : 'undefined');

// Create a service role client that can bypass RLS policies
function createServiceRoleClient() {
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
      }
    });
    return supabaseInstance;
  }

  // Create a new instance with the token
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    global: { 
      headers: { 
        Authorization: `Bearer ${supabaseAccessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      } 
    }
  });

  return supabaseInstance;
};

async function applyToJob(token, _, jobData) {
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
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];
    
    if (resumeFile && !allowedTypes.includes(resumeFile.type)) {
      throw new Error("Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.");
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (resumeFile && resumeFile.size > maxSize) {
      throw new Error("File size exceeds the maximum limit of 5MB.");
    }
    
    // Generate a unique filename for the resume
    const fileExtension = resumeFile ? resumeFile.name.split('.').pop() : 'txt';
    const uniqueFilename = `resume_${jobData.job_id}_${jobData.candidate_id}_${Date.now()}.${fileExtension}`;
    console.log("Generated unique filename:", uniqueFilename);
    
    // Create a service role client to bypass RLS for storage operations
    const serviceClient = createServiceRoleClient();
    console.log("Service role client created for storage operations");
    
    // Check if the 'resumes' bucket exists, create it if it doesn't
    const { data: buckets } = await serviceClient.storage.listBuckets();
    const resumesBucketExists = buckets.some(bucket => bucket.name === 'resumes');
    
    if (!resumesBucketExists) {
      console.log("Creating 'resumes' bucket...");
      await serviceClient.storage.createBucket('resumes', {
        public: true,
        fileSizeLimit: 5242880 // 5MB in bytes
      });
      console.log("'resumes' bucket created successfully");
    } else {
      console.log("'resumes' bucket already exists");
    }
    
    // Upload the resume file
    let resumeUrl = null;
    if (resumeFile) {
      console.log("Uploading resume file...");
      
      // Convert the File object to a Uint8Array for upload
      const arrayBuffer = await resumeFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const { data: uploadData, error: uploadError } = await serviceClient.storage
        .from('resumes')
        .upload(uniqueFilename, uint8Array, {
          contentType: resumeFile.type,
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error("Error uploading resume:", uploadError);
        throw new Error(`Failed to upload resume: ${uploadError.message}`);
      }
      
      console.log("Resume uploaded successfully");
      
      // Get the public URL of the uploaded file
      const { data: publicUrlData } = serviceClient.storage
        .from('resumes')
        .getPublicUrl(uniqueFilename);
      
      resumeUrl = publicUrlData.publicUrl;
      console.log("Resume public URL generated:", resumeUrl);
    }
    
    // Prepare the application data
    const applicationData = {
      job_id: jobData.job_id,
      candidate_id: jobData.candidate_id,
      status: 'pending',
      resume_url: resumeUrl,
      cover_letter: jobData.cover_letter || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log("Saving application data to database:", applicationData);
    
    // Use service role client to insert the application data
    const { data: insertData, error: insertError } = await serviceClient
      .from('applications')
      .insert([applicationData])
      .select();
    
    if (insertError) {
      console.error("Error inserting application data:", insertError);
      throw new Error(`Failed to save application: ${insertError.message}`);
    }
    
    console.log("Application saved successfully:", insertData);
    return insertData[0];
    
  } catch (error) {
    console.error("Error in applyToJob:", error);
    throw error;
  }
}

module.exports = {
  applyToJob,
  supabaseClient,
  supabaseUrl,
  createServiceRoleClient
};
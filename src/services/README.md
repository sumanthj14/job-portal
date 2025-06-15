# Application Service and API

This directory contains services for handling job applications in the job portal application. The main functionality includes uploading resume files to Supabase storage and saving application data to the database.

## Key Features

- Resume file upload to Supabase storage bucket named 'resumes'
- Validation of resume files (type and size)
- Saving application data to the 'applications' table
- Handling both operations together (upload and database save)
- Proper error handling for both operations
- Filtering out extra fields that don't exist in the table schema

## Usage Examples

### Submitting a Job Application

```javascript
import { submitApplication } from '../services/applicationService';
// or use the API wrapper
import { applyToJob } from '../api/applicationApi';

// Using the service directly
async function handleApplicationSubmit(token, formData) {
  try {
    const applicationData = {
      job_id: formData.jobId,
      candidate_id: user.id, // Clerk user ID
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      resume: formData.resumeFile, // File object or array of files
      status: 'applied',
      // Optional parsed resume data
      parsedResumeData: {
        skills: ['JavaScript', 'React', 'Node.js'],
        education: 'Bachelor of Computer Science',
        experience: '5 years of web development'
      }
    };
    
    const result = await submitApplication(token, applicationData);
    console.log('Application submitted successfully:', result);
    return result;
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
}

// Using the API wrapper
async function handleApplicationSubmitWithApi(token, formData) {
  try {
    const applicationData = {
      job_id: formData.jobId,
      candidate_id: user.id,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      resume: formData.resumeFile,
      status: 'applied',
      parsedResumeData: formData.parsedResumeData
    };
    
    const result = await applyToJob(token, null, applicationData);
    console.log('Application submitted successfully:', result);
    return result;
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
}
```

### Getting User Applications

```javascript
import { getUserApplications } from '../services/applicationService';
// or use the API wrapper
import { getApplications } from '../api/applicationApi';

// Using the service directly
async function fetchUserApplications(token, userId) {
  try {
    const applications = await getUserApplications(token, userId);
    console.log(`Found ${applications.length} applications for user`);
    return applications;
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
}

// Using the API wrapper
async function fetchUserApplicationsWithApi(token, userId) {
  try {
    const applications = await getApplications(token, { user_id: userId });
    console.log(`Found ${applications.length} applications for user`);
    return applications;
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
}
```

### Updating Application Status

```javascript
import { updateApplicationStatus } from '../services/applicationService';
// or use the API wrapper
import { updateStatus } from '../api/applicationApi';

// Using the service directly
async function changeApplicationStatus(token, applicationId, newStatus) {
  try {
    const updatedApplication = await updateApplicationStatus(token, applicationId, newStatus);
    console.log('Application status updated successfully:', updatedApplication);
    return updatedApplication;
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
}

// Using the API wrapper
async function changeApplicationStatusWithApi(token, applicationId, newStatus) {
  try {
    const updatedApplication = await updateStatus(token, { application_id: applicationId }, newStatus);
    console.log('Application status updated successfully:', updatedApplication);
    return updatedApplication;
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
}
```

## Schema Information

The applications table has the following columns:

- `id` (UUID, primary key)
- `job_id` (UUID, required)
- `candidate_id` (TEXT, references users.clerk_id)
- `name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `resume` (TEXT, stores the URL to the uploaded file)
- `status` (TEXT, default: 'applied')
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- `metadata` (JSONB, for storing parsed resume data)
- `skills` (TEXT)
- `education` (TEXT)
- `experience` (TEXT)

## Best Practices

1. Always validate resume files before uploading
2. Handle both upload and database operations in a single transaction when possible
3. Provide meaningful error messages to users
4. Use the service role client for operations that need to bypass RLS
5. Filter out extra fields that don't exist in the table schema
6. Use the API wrapper for frontend integration
7. Include proper error handling in your application code

## Error Handling

The service and API will throw errors with descriptive messages for various failure scenarios:

- Missing or invalid resume file
- File size exceeds limit
- Storage bucket access issues
- Database insertion errors
- Authentication errors

Make sure to catch these errors in your application code and display appropriate messages to users.
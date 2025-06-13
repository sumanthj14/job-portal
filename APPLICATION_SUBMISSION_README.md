# Multi-Step Application Submission System

This document provides an overview of the multi-step job application submission system implemented in the Job Portal application.

## Overview

The application submission system allows users to:

1. Upload a resume to Supabase Storage
2. Fill out a multi-step form with personal information, education, projects, work experience, and skills
3. Save drafts of their application
4. Submit the complete application to Supabase

## Architecture

The system consists of the following components:

### Backend Services

- `applicationService.js`: Core service that handles resume upload, application submission, and draft management
- `application-form-integration.js`: Utility functions for integrating the form with Supabase

### Frontend Hooks

- `use-application-submission.js`: Custom hook for handling the submission process
- `use-multi-step-application.js`: Custom hook for managing the multi-step form

## Database Schema

The system uses the following Supabase tables:

### Applications Table

```sql
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    candidate_id TEXT REFERENCES public.users(clerk_id),
    status TEXT DEFAULT 'pending',
    resume_url TEXT,
    cover_letter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT,
    email TEXT,
    phone TEXT,
    metadata JSONB
);
```

### Application Drafts Table

```sql
CREATE TABLE public.application_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    candidate_id TEXT REFERENCES public.users(clerk_id),
    draft_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Storage Buckets

The system uses a Supabase Storage bucket named `resumes` to store uploaded resume files.

## Usage

### Submitting an Application

```jsx
import useApplicationSubmission from '../hooks/use-application-submission';

function ApplicationForm({ job }) {
  const {
    isSubmitting,
    isUploading,
    progress,
    error,
    submitApplication
  } = useApplicationSubmission({
    job,
    onSuccess: (result) => {
      console.log('Application submitted successfully:', result);
      // Navigate to success page or show success message
    },
    onError: (error) => {
      console.error('Application submission failed:', error);
      // Show error message
    }
  });

  const handleSubmit = async (formData) => {
    await submitApplication(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Application'}
      </button>
      {isUploading && <progress value={progress} max="100" />}
      {error && <div className="error">{error.message}</div>}
    </form>
  );
}
```

### Saving and Loading Drafts

```jsx
import useApplicationSubmission from '../hooks/use-application-submission';

function ApplicationForm({ job }) {
  const {
    saveDraft,
    loadDraft,
    deleteDraft
  } = useApplicationSubmission({ job });

  // Load draft when component mounts
  useEffect(() => {
    const loadSavedDraft = async () => {
      const draft = await loadDraft();
      if (draft) {
        // Populate form with draft data
        form.reset(draft);
      }
    };

    loadSavedDraft();
  }, [loadDraft]);

  // Auto-save draft when form values change
  useEffect(() => {
    const formValues = form.getValues();
    if (Object.keys(formValues).length === 0) return;

    const timer = setTimeout(() => {
      saveDraft(formValues);
    }, 2000);

    return () => clearTimeout(timer);
  }, [form.watch(), saveDraft]);

  return (
    <form>
      {/* Form fields */}
      <button type="button" onClick={() => saveDraft(form.getValues())}>
        Save Draft
      </button>
      <button type="button" onClick={deleteDraft}>
        Delete Draft
      </button>
    </form>
  );
}
```

## Integration with Multi-Step Form

The application submission system integrates with the existing multi-step form component. The form collects data in the following steps:

1. Resume Upload
2. Personal Information
3. Education
4. Projects
5. Work Experience
6. Skills
7. Review

When the user completes all steps and clicks Submit, the system:

1. Uploads the resume to Supabase Storage
2. Collects all form data
3. Submits the complete application to the applications table
4. Deletes any saved drafts

## Error Handling

The system includes comprehensive error handling for:

- Resume upload failures
- Invalid file types or sizes
- Database errors
- Network issues

Errors are propagated to the UI through the `error` state in the `useApplicationSubmission` hook.

## Security Considerations

- The system uses Supabase RLS policies to ensure users can only access their own applications
- Resume uploads use a service role client to bypass RLS for storage operations
- The system validates file types and sizes to prevent malicious uploads

## Future Improvements

- Add support for cover letter uploads
- Implement application status tracking
- Add email notifications for application status changes
- Implement application search and filtering
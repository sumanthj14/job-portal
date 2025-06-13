# Full Stack Job Portal with React JS, Tailwind CSS, Supabase, Clerk, Shadcn UI  🔥🔥

This project implements a full-stack job portal with a robust job application system using Clerk for authentication and Supabase for data storage. It handles the process of job applications, including storing resumes in Supabase Storage and managing application data.

## Features

- User authentication with Clerk
- Supabase integration for data storage
- Resume file upload to Supabase Storage
- Job application submission and tracking
- User application history

## Architecture

The application follows a modular architecture:

1. **Services Layer** - Core business logic for handling applications
2. **API Layer** - Clean interface for the frontend
3. **React Hooks** - Reusable hooks for components
4. **Example Components** - Ready-to-use UI components

## Setup

### Environment Variables

Create a `.env` file with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

### Database Setup

Run the SQL migration in `migrations/ensure_applications_schema.sql` to set up the required tables and policies.

## Job Application System

### Submitting a Job Application

Use the `ApplicationForm` component or the `useApplicationHandler` hook:

```jsx
import { useApplicationHandler } from '../hooks/use-application-handler';

function YourComponent() {
  const { submitApplication, loading, error, success } = useApplicationHandler();
  
  const handleSubmit = async (formData) => {
    await submitApplication(formData, jobId);
  };
  
  // Render your form
}
```

### Viewing User Applications

Use the `ApplicationsList` component or the `useUserApplications` hook:

```jsx
import { useUserApplications } from '../hooks/use-user-applications';

function YourComponent() {
  const { applications, loading, error, refreshApplications } = useUserApplications();
  
  // Render your applications list
}
```

## Implementation Details

### User ID Handling

The system handles the mapping between Clerk user IDs and Supabase UUIDs:

1. When a user applies for a job, their Clerk ID is used to look up their Supabase UUID
2. The Supabase UUID is used as the `candidate_id` in the `applications` table
3. This maintains proper foreign key relationships in the database

### Resume Storage

Resumes are stored in the Supabase Storage 'resumes' bucket:

1. Files are validated for type (PDF/Word) and size (max 10MB)
2. A unique filename is generated using the job ID, candidate ID, and timestamp
3. The file is uploaded with the correct content type
4. The public URL is saved to the application record

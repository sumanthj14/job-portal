# Clerk-Supabase Integration Guide

This document explains how the integration between Clerk (authentication) and Supabase (database) works in this job portal application.

## Overview

When users sign in or sign up through Clerk, their information is automatically synchronized with the Supabase database. This ensures that user data is consistent across both systems and allows the application to use Supabase for data operations while leveraging Clerk's authentication features.

## How It Works

1. When a user signs in through Clerk, the `ClerkWebhookHandler` component detects the authentication event
2. The handler calls the `syncUserWithSupabase` function from the `apiUsers.js` file
3. This function checks if the user already exists in Supabase and either creates a new record or updates the existing one

## Implementation Details

### Components

- **ClerkWebhookHandler**: A React component that listens for Clerk authentication events and triggers the synchronization process
- **apiUsers.js**: Contains functions for syncing user data and handling webhook events
- **users_table.sql**: SQL migration file defining the structure of the users table in Supabase

### Configuration Steps

1. **Set up Clerk JWT Templates**:
   - In your Clerk dashboard, go to JWT Templates
   - Create a template named "supabase" with the following claims:
     ```json
     {
       "sub": "{{user.id}}",
       "email": "{{user.primary_email_address}}",
       "role": "{{user.unsafe_metadata.role}}"
     }
     ```

2. **Configure Supabase**:
   - Run the SQL migration in `supabase/migrations/users_table.sql` to create the users table
   - Ensure your Supabase JWT secret matches the one configured in Clerk

3. **Environment Variables**:
   - Make sure the following environment variables are set:
     ```
     VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

## Troubleshooting

If user synchronization is not working:

1. Check browser console for errors
2. Verify that the Clerk JWT template is correctly configured
3. Ensure the Supabase JWT secret matches the one in Clerk
4. Check that the users table exists in your Supabase database

## Data Flow

```
User Signs In/Up with Clerk
        ↓
ClerkWebhookHandler detects event
        ↓
syncUserWithSupabase function is called
        ↓
User data is upserted in Supabase
        ↓
Application can now use user data from Supabase
```

## Security Considerations

- Row-level security policies are applied to the users table to ensure users can only access their own data
- The integration uses JWT tokens for secure communication between Clerk and Supabase
- User roles and permissions are synchronized between both systems
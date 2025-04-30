# Clerk-Supabase User Synchronization Setup

## Overview

This document explains how to set up and test the synchronization between Clerk authentication and your Supabase database. When users sign in through Clerk, their data will be automatically synchronized with the Supabase `users` table.

## Components

1. **ClerkWebhookHandler Component**: A React component that listens for Clerk authentication events and triggers synchronization
2. **apiUsers.js**: Contains functions for syncing user data with Supabase
3. **clerk-webhook-handler.js**: Server-side webhook handler for processing Clerk events
4. **users_table.sql**: SQL migration defining the structure of the users table in Supabase

## Setup Instructions

### 1. Environment Variables

Ensure your `.env` file contains the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # For webhook handler
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_CLERK_SECRET_KEY=your_clerk_secret_key  # For webhook verification
```

### 2. Database Setup

1. Run the SQL migration in `supabase/migrations/users_table.sql` to create the users table
2. Run the SQL migration in `supabase/migrations/add_users_insert_policy.sql` to add the INSERT policy

### 3. Client-Side Setup

The `ClerkWebhookHandler` component is already included in your App.jsx and will automatically sync user data when a user signs in through Clerk.

### 4. Server-Side Webhook Setup

1. Set up a webhook endpoint in your API that uses the `handleClerkWebhook` function from `src/api/clerk-webhook-handler.js`
2. Configure the webhook in the Clerk Dashboard:
   - Go to Webhooks in your Clerk Dashboard
   - Add a new webhook pointing to your endpoint
   - Select the events: `user.created`, `user.updated`, and `user.signed_in`
   - Save the webhook and copy the signing secret
   - Add the signing secret to your environment variables

## Testing

### Testing the INSERT Policy

The `test-insert-policy.js` script verifies that the Supabase INSERT policy is correctly configured. To run the test:

```bash
node test-insert-policy.js
```

Note: This test requires the `VITE_SUPABASE_SERVICE_ROLE_KEY` environment variable to bypass Row Level Security.

### Testing the Webhook

1. In the Clerk Dashboard, go to your webhook
2. Click **Trigger example** to send a test event
3. Check your server logs to confirm the webhook was received and processed
4. Verify that user data was correctly synchronized in your Supabase database

## Troubleshooting

- **RLS Policy Errors**: If you encounter "violates row-level security policy" errors, ensure you're using the service role key for administrative operations
- **Schema Errors**: If you see column not found errors, verify that your user object matches the schema defined in `users_table.sql`
- **Authentication Errors**: Check that the JWT token from Clerk is correctly passed to Supabase

## How It Works

1. When a user signs in through Clerk, the `ClerkWebhookHandler` component detects the authentication event
2. The handler calls the `syncUserWithSupabase` function from `apiUsers.js`
3. This function checks if the user already exists in Supabase and either creates a new record or updates the existing one
4. Additionally, Clerk sends webhook events to your server for user.created, user.updated, and user.signed_in events
5. The server-side webhook handler processes these events and syncs the user data with Supabase

This dual approach ensures that user data is synchronized both during client-side interactions and through server-side webhooks for maximum reliability.
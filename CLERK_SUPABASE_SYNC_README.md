# Clerk-Supabase User Synchronization

This document provides instructions for setting up and testing the Clerk-Supabase user synchronization in your job portal application.

## Overview

The synchronization system works through two main mechanisms:

1. **Client-side synchronization**: The `ClerkWebhookHandler` component automatically syncs user data when a user signs in through Clerk.
2. **Server-side synchronization**: Clerk webhooks send events to your server when users are created, updated, or sign in, ensuring data stays in sync even when updates happen outside your application.

## Setup Instructions

### 1. Environment Variables

Ensure your `.env` file contains the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # For webhook handler
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_CLERK_SECRET_KEY=your_clerk_secret_key  # For webhook verification
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret  # From Clerk Dashboard
```

### 2. Client-Side Setup

The `ClerkWebhookHandler` component is already included in your App.jsx and will automatically sync user data when a user signs in through Clerk.

### 3. Server-Side Webhook Setup

1. Deploy your application with the webhook endpoint at `/api/webhooks/clerk.js`
2. Configure the webhook in the Clerk Dashboard:
   - Go to Webhooks in your Clerk Dashboard
   - Add a new webhook pointing to your endpoint (e.g., `https://your-domain.com/api/webhooks/clerk`)
   - Select the events: `user.created`, `user.updated`, and `user.signed_in`
   - Save the webhook and copy the signing secret
   - Add this secret to your environment variables as `CLERK_WEBHOOK_SECRET`

## Testing the Integration

This repository includes two test scripts to verify the integration:

### 1. Test Supabase INSERT Policy

This script verifies that the Supabase database is properly configured to allow user creation:

```bash
node test-insert-policy.js
```

### 2. Test Webhook Handler

This script simulates a Clerk webhook event and verifies that it correctly syncs user data with Supabase:

```bash
node test-webhook-handler.js
```

### 3. Testing the Webhook in Clerk Dashboard

1. In the Clerk Dashboard, go to your webhook
2. Click **Trigger example** to send a test event
3. Check your server logs to confirm the webhook was received and processed
4. Verify that user data was correctly synchronized in your Supabase database

## How It Works

1. When a user signs in through Clerk, the `ClerkWebhookHandler` component detects the authentication event
2. The handler calls the `syncUserWithSupabase` function from `apiUsers.js`
3. This function checks if the user already exists in Supabase and either creates a new record or updates the existing one
4. Additionally, Clerk sends webhook events to your server for user.created, user.updated, and user.signed_in events
5. The server-side webhook handler processes these events and syncs the user data with Supabase

This dual approach ensures that user data is synchronized both during client-side interactions and through server-side webhooks for maximum reliability.

## Troubleshooting

### Webhook Not Receiving Events

- Ensure your webhook URL is publicly accessible
- Check that you've selected the correct events in the Clerk Dashboard
- Verify your server logs for any errors in processing the webhook
- Confirm you're using the correct webhook secret

### User Data Not Syncing

- Check the Supabase database for any errors in the users table
- Verify that the `syncUserWithSupabase` function is being called correctly
- Ensure the Supabase service role key has the necessary permissions
- Check for any errors in the console logs

### Best Practices

- Always verify webhook signatures in production environments
- Consider implementing rate limiting on your webhook endpoint
- Use HTTPS for all webhook URLs
- Regularly monitor your webhook logs for any issues
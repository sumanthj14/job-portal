# Clerk-Supabase User Synchronization Implementation

This document explains how the user synchronization between Clerk and Supabase has been implemented in this project.

## Overview

The synchronization between Clerk and Supabase happens through two mechanisms:

1. **Client-side synchronization**: The `ClerkWebhookHandler` component automatically syncs user data when a user signs in through Clerk.
2. **Server-side synchronization**: Clerk webhooks send events to your server when users are created, updated, or sign in, ensuring data stays in sync even when updates happen outside your application.

## Implementation Details

### Client-Side Synchronization

The `ClerkWebhookHandler` component in `src/components/clerk-webhook-handler.jsx` handles client-side synchronization:

- It listens for Clerk authentication events using the `useUser` and `useAuth` hooks
- When a user signs in, it calls the `syncUserWithSupabase` function from `apiUsers.js`
- This function checks if the user already exists in Supabase and either creates or updates the user record

### Server-Side Synchronization

Server-side synchronization is handled through Clerk webhooks:

1. The webhook endpoint is implemented in `api/webhooks/clerk.js`
2. When Clerk sends an event (user.created, user.updated, user.signed_in), the endpoint:
   - Verifies the webhook signature (in production)
   - Processes the event using the `processClerkWebhook` function from `src/utils/clerk-webhook.js`
   - The `processClerkWebhook` function calls `handleClerkWebhook` from `apiUsers.js`
   - `handleClerkWebhook` calls `syncUserWithSupabase` to create or update the user in Supabase

## Testing the Implementation

Two test scripts have been created to verify the implementation:

1. **Direct Database Access Test**: `test-direct-insert.js`
   - Tests direct user insertion with disabled RLS
   - Verifies that the Supabase client with service role key can bypass RLS policies

2. **Webhook Synchronization Test**: `test-clerk-webhook-sync.js`
   - Simulates a Clerk webhook event
   - Verifies that the event is processed correctly and the user is synchronized with Supabase

### Running the Tests

To run the tests, use the following commands:

```bash
# Test direct database access
node test-direct-insert.js

# Test webhook synchronization
node test-clerk-webhook-sync.js
```

## Production Setup

For production deployment, make sure to:

1. Set up the webhook endpoint in your API that uses the `handleClerkWebhook` function
2. Configure the webhook in the Clerk Dashboard:
   - Go to Webhooks in your Clerk Dashboard
   - Add a new webhook pointing to your endpoint (e.g., `https://your-domain.com/api/webhooks/clerk`)
   - Select the events to listen for: `user.created`, `user.updated`, and `user.signed_in`
   - Copy the signing secret and add it to your environment variables as `CLERK_WEBHOOK_SECRET`

3. Ensure your environment variables are properly set:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
   ```

4. Uncomment the webhook signature verification code in `api/webhooks/clerk.js` for production use

## Troubleshooting

If you encounter issues with the synchronization:

1. Check the browser console for client-side errors
2. Check your server logs for webhook processing errors
3. Verify that your environment variables are correctly set
4. Ensure that the Supabase RLS policies allow the service role to insert/update users
5. Test the webhook endpoint using the Clerk Dashboard's "Send Example" feature
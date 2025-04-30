# Setting Up Clerk Webhooks for User Synchronization

This guide explains how to configure Clerk webhooks to automatically synchronize user data with your Supabase database in a production environment.

## Overview

While the client-side integration we've implemented will handle user synchronization during active sessions, setting up webhooks ensures that user data stays in sync even when updates happen outside your application (e.g., when users update their profile through Clerk's hosted pages).

## Step 1: Create a Webhook Endpoint

You'll need a server endpoint to receive webhook events from Clerk. Depending on your hosting environment, you have several options:

### Option A: Vercel Serverless Functions

1. Create an API route at `api/webhooks/clerk.js`
2. Implement the webhook handler using the example in `src/api/webhooks/clerk.js`

### Option B: Express Server

1. Set up an Express route at `/api/webhooks/clerk`
2. Use the Express implementation example from `src/api/webhooks/clerk.js`

## Step 2: Configure Clerk Webhook in Dashboard

1. Log in to your [Clerk Dashboard](https://dashboard.clerk.dev/)
2. Navigate to **Webhooks** in the sidebar
3. Click **Add Endpoint**
4. Enter your webhook URL (e.g., `https://your-domain.com/api/webhooks/clerk`)
5. Select the following events to listen for:
   - `user.created`
   - `user.updated`
   - `user.signed_in`
6. Click **Create** to save your webhook

## Step 3: Get Your Webhook Secret

1. In the Clerk Dashboard, go to your newly created webhook
2. Copy the **Signing Secret**
3. Add this secret to your environment variables as `CLERK_WEBHOOK_SECRET`

## Step 4: Configure Supabase Service Role Key

For webhook handlers to update the database, you'll need a Supabase service role key:

1. Go to your Supabase dashboard
2. Navigate to **Project Settings** > **API**
3. Copy the **service_role key** (not the anon key)
4. Add this to your environment variables as `SUPABASE_SERVICE_ROLE_KEY`

## Step 5: Secure Your Webhook

In production, always verify webhook signatures to ensure requests are coming from Clerk:

```javascript
import { Webhook } from '@clerk/clerk-sdk-node';

// In your webhook handler
const wh = new Webhook(req.headers, req.body);
const evt = wh.verify(process.env.CLERK_WEBHOOK_SECRET);

// Process the verified event
const result = await processClerkWebhook(evt, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

## Step 6: Test Your Webhook

1. In the Clerk Dashboard, go to your webhook
2. Click **Trigger example** to send a test event
3. Check your server logs to confirm the webhook was received and processed
4. Verify that user data was correctly synchronized in your Supabase database

## Troubleshooting

### Webhook Not Receiving Events

- Ensure your webhook URL is publicly accessible
- Check that you've selected the correct events in the Clerk Dashboard
- Verify your server is properly handling POST requests

### Signature Verification Failing

- Confirm you're using the correct webhook secret
- Ensure you're passing the complete request headers and body to the verification function

### Database Updates Not Working

- Verify your Supabase service role key has the necessary permissions
- Check that your database schema matches the expected structure
- Look for error messages in your server logs

## Security Considerations

- Never expose your Supabase service role key in client-side code
- Always verify webhook signatures in production environments
- Consider implementing rate limiting on your webhook endpoint
- Use HTTPS for all webhook URLs
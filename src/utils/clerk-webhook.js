/**
 * Utility functions for handling Clerk webhooks
 */

import { handleClerkWebhook } from "@/api/apiUsers";

/**
 * Process a Clerk webhook event
 * This function can be used in a serverless function or API route
 * 
 * @param {Object} event - The webhook event from Clerk
 * @param {string} token - Supabase access token
 * @returns {Promise<Object>} - Response object
 */
export async function processClerkWebhook(event, token) {
  try {
    // Verify webhook signature (in a production environment)
    // This is a simplified version - in production, you should verify the webhook signature
    
    // Process the webhook event
    const result = await handleClerkWebhook(token, event);
    return result;
  } catch (error) {
    console.error('Error processing Clerk webhook:', error);
    return {
      status: 500,
      message: 'Error processing webhook',
      error: error.message
    };
  }
}

/**
 * Configure Clerk to use Supabase JWT template
 * Call this function when setting up your Clerk instance
 * 
 * @param {Object} clerkClient - The Clerk client instance
 */
export async function configureClerkSupabaseIntegration(clerkClient) {
  // This would typically be done in a server initialization script
  // or through the Clerk dashboard
  
  // Example of how to programmatically set up a JWT template
  // Note: This is usually done through the Clerk dashboard
  /*
  await clerkClient.jwtTemplates.create({
    name: 'supabase',
    claims: {
      sub: '{{user.id}}',
      email: '{{user.primary_email_address}}',
      role: '{{user.unsafe_metadata.role}}'
    }
  });
  */
}
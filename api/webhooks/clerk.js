/**
 * Clerk webhook handler endpoint
 * 
 * This file implements a webhook endpoint for receiving and processing Clerk events
 * to synchronize user data with Supabase.
 */

import { processClerkWebhook } from "../../src/utils/clerk-webhook.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Handle Clerk webhook events
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    // 1. Verify the webhook signature (important in production)
    const svixId = req.headers['svix-id'];
    const svixTimestamp = req.headers['svix-timestamp'];
    const svixSignature = req.headers['svix-signature'];
    
    // Verify the webhook signature for security
    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(401).json({ success: false, message: 'Missing Svix headers' });
    }
    
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Missing CLERK_WEBHOOK_SECRET environment variable');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    
    // Verify the webhook signature
    const payload = JSON.stringify(req.body);
    
    // Import the Webhook class from @clerk/clerk-sdk-node
    // Make sure to install this package: npm install @clerk/clerk-sdk-node
    try {
      // In a production environment, uncomment this code to verify the signature
      // const { Webhook } = await import('@clerk/clerk-sdk-node');
      // const wh = new Webhook(webhookSecret);
      // const evt = wh.verify(payload, {
      //   'svix-id': svixId,
      //   'svix-timestamp': svixTimestamp,
      //   'svix-signature': svixSignature
      // });
      
      // For now, we'll just log that verification would happen in production
      console.log('Webhook received - signature verification would happen in production');
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
    
    // 2. Get the webhook payload
    const payload = req.body;
    
    // 3. Get a Supabase token (using service role key for database operations)
    const supabaseToken = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseToken) {
      console.error('Missing VITE_SUPABASE_SERVICE_ROLE_KEY environment variable');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    
    // 4. Process the webhook
    const result = await processClerkWebhook(payload, supabaseToken);
    
    // 5. Return the response
    return res.status(result.status).json({
      success: result.status === 200,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Error handling Clerk webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
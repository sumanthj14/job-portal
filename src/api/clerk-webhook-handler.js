// Webhook handler for Clerk events
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin access

/**
 * Process Clerk webhook events and sync user data with Supabase
 * @param {Object} req - The request object containing Clerk webhook data
 * @param {Object} res - The response object
 */
export async function handleClerkWebhook(req, res) {
  // Verify webhook signature (implement this for production)
  // const isValid = verifyClerkWebhookSignature(req);
  // if (!isValid) return res.status(401).json({ error: 'Invalid webhook signature' });

  const event = req.body;
  
  // Only process relevant user events
  if (!event || !event.type || !event.data) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  // Handle different event types
  switch (event.type) {
    case 'user.created':
    case 'user.updated':
    case 'user.signed_in':
      try {
        const userData = event.data;
        const result = await syncUserWithSupabase(userData);
        return res.status(200).json(result);
      } catch (error) {
        console.error('Error processing webhook:', error);
        return res.status(500).json({ error: 'Failed to process webhook' });
      }
    
    default:
      // Acknowledge but ignore other event types
      return res.status(200).json({ message: `Ignored event: ${event.type}` });
  }
}

/**
 * Synchronize Clerk user data with Supabase
 * @param {Object} userData - User data from Clerk
 * @returns {Object} - Result of the synchronization
 */
async function syncUserWithSupabase(userData) {
  if (!userData || !userData.id) {
    throw new Error('Invalid user data');
  }

  // Create Supabase client with service role key to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Prepare user data for upsert
  const userRecord = {
    clerk_id: userData.id,
    email: userData.email_addresses?.[0]?.email_address || userData.email,
    first_name: userData.first_name,
    last_name: userData.last_name,
    avatar_url: userData.image_url,
    username: userData.username,
    role: userData.unsafe_metadata?.role || 'candidate',
    last_sign_in: new Date().toISOString()
  };

  // Check if user already exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', userData.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is the error code for "No rows found"
    console.error('Error checking for existing user:', fetchError);
    throw new Error(`Failed to check for existing user: ${fetchError.message}`);
  }

  // If user exists, update the record
  if (existingUser) {
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(userRecord)
      .eq('clerk_id', userData.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user in Supabase:', updateError);
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    return { success: true, action: 'updated', user: updatedUser };
  }
  
  // If user doesn't exist, create a new record
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([userRecord])
    .select()
    .single();

  if (insertError) {
    console.error('Error creating user in Supabase:', insertError);
    throw new Error(`Failed to create user: ${insertError.message}`);
  }

  return { success: true, action: 'created', user: newUser };
}
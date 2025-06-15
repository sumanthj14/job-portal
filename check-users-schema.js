/**
 * Check Users Table Schema
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create a Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUsersSchema() {
  try {
    // Get the first user to see the schema
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Users table columns:', Object.keys(data[0]));
    } else {
      console.log('No users found in the table');
      
      // Try to get the schema directly
      const { data: columnsData, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'users');
      
      if (columnsError) {
        console.error('Error fetching columns:', columnsError);
      } else {
        console.log('Users table columns from schema:', columnsData.map(col => col.column_name));
      }
    }
  } catch (error) {
    console.error('Error checking users schema:', error);
  }
}

// Run the check
checkUsersSchema();
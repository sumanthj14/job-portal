/**
 * Script to check the schema of the applications table
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

async function checkApplicationsSchema() {
  try {
    // Use a raw SQL query to get the column information
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying applications table:', error);
      return;
    }

    // If we got data, we can see what columns are available
    if (data && data.length > 0) {
      console.log('Applications table columns:', Object.keys(data[0]));
    } else {
      console.log('No data found in applications table, trying to get schema info');
      
      // Try to get schema info using a different approach
      const { data: schemaData, error: schemaError } = await supabase.rpc(
        'pg_get_columns',
        { table_name: 'applications' }
      );

      if (schemaError) {
        console.error('Error getting schema info:', schemaError);
      } else {
        console.log('Schema info:', schemaData);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
checkApplicationsSchema();
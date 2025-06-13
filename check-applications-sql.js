import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ ERROR: VITE_SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkApplicationsSchema() {
  try {
    console.log('Checking applications table schema...');
    
    // Use a direct SQL query to get the table schema
    const { data, error } = await supabase.sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable 
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'applications' AND 
        table_schema = 'public'
    `;

    if (error) {
      console.error('Error querying schema:', error);
    } else {
      console.log('Applications table schema:', data);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkApplicationsSchema();
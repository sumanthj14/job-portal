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

async function checkApplicationsTable() {
  try {
    console.log('Checking applications table structure...');
    
    // First, let's check the table definition using a direct SQL query
    console.log('\nQuerying table structure for applications table...');
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_applications_schema', {});

    if (schemaError) {
      console.error('Error querying schema:', schemaError);
      
      // Try an alternative approach with a direct SQL query
      console.log('\nTrying alternative approach with direct SQL...');
      const { data: sqlData, error: sqlError } = await supabase.sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'applications' AND table_schema = 'public'
      `;
      
      if (sqlError) {
        console.error('Error with direct SQL query:', sqlError);
      } else {
        console.log('Applications table schema from SQL:', sqlData);
      }
    } else {
      console.log('Applications table schema:', schemaData);
    }
    
    // Now let's try to get a sample row
    console.log('\nQuerying applications table for sample data...');
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying applications table:', error);
    } else {
      console.log('Applications table data:', data);
      if (data.length > 0) {
        console.log('Applications table columns:', Object.keys(data[0]));
      } else {
        console.log('No data found in applications table');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkApplicationsTable();
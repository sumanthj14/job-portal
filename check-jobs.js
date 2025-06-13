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

async function checkJobsTable() {
  try {
    console.log('Checking jobs table structure...');
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying jobs table:', error);
      return;
    }

    console.log('Jobs table data:', data);
    if (data.length > 0) {
      console.log('Jobs table columns:', Object.keys(data[0]));
    } else {
      console.log('No data found in jobs table');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkJobsTable();
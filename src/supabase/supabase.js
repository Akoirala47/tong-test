// Revert back to standard createClient
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Consider a more user-friendly error or fallback if needed in production
  throw new Error('Missing Supabase URL or Anon Key environment variables');
}

// Export the standard Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

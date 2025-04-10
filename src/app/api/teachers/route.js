import { NextResponse } from 'next/server';
// Import the server client creation utility
import { createClient } from '@/utils/supabase/server'; 

export async function GET(request) {
  const supabase = createClient(); // Create server client for this request

  // --- Authentication Check ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    // Require login to see teachers
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
  // --- End Authentication Check ---

  try {
    console.log('GET /api/teachers request received');

    // Fetch users who have the 'teacher' role
    const { data: teachers, error } = await supabase
      .from('profiles')
      .select('id, display_name') // Select only needed fields
      .eq('role', 'teacher'); // Filter by role

    if (error) {
      console.error('Supabase select error fetching teachers:', error);
      throw error;
    }

    return NextResponse.json(teachers || []); // Return teachers or empty array

  } catch (error) {
    console.error('Failed to fetch teachers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teachers', details: error.message },
      { status: 500 }
    );
  }
}

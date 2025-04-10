import { NextResponse } from 'next/server';
// Import the server client creation utility
import { createClient } from '@/utils/supabase/server'; 

export async function POST(request) {
  const supabase = createClient(); // Create server client for this request

  // --- Authentication Check ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
  // --- End Authentication Check ---

  try {
    // Assuming expertId corresponds to teacher_id in the schema
    // Assuming startTime corresponds to scheduled_time
    // title is not in the schema, omitting for now.
    // endTime is not in the schema, omitting for now.
    // roomId is not in the schema, omitting for now.
    const { expertId, startTime } = await request.json(); 
    // Learner ID should come from the authenticated user
    const learnerId = user.id; 

    if (!expertId || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields: expertId, startTime' },
        { status: 400 }
      );
    }
     // Optional: Validate that learnerId isn't the same as expertId?

    const sessionData = {
      learner_id: learnerId, // Use authenticated user's ID
      teacher_id: expertId, // Map expertId to teacher_id
      scheduled_time: new Date(startTime).toISOString(), // Ensure ISO format
      // status defaults to 'requested' in the schema
    };

    const { data: insertedSession, error } = await supabase
      .from('scheduled_sessions')
      .insert(sessionData)
      .select() // Return the inserted row
      .single(); // Expecting a single row back

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    
    return NextResponse.json(insertedSession, { status: 201 });

  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const supabase = createClient(); // Create server client for this request

  // --- Authentication Check ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    // Allow unauthenticated access? Or require login? Let's require login.
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
   // --- End Authentication Check ---

  try {
    console.log('GET /api/sessions request received');
    const requestUrl = request.url;
    console.log('Request URL:', requestUrl);
    
    if (!requestUrl) {
      return NextResponse.json(
        { error: 'Invalid request URL' },
        { status: 400 }
      );
    }

    let url;
    try {
      url = new URL(requestUrl);
    } catch (e) {
      console.error('Invalid URL:', requestUrl);
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const { searchParams } = url;
    // Use the authenticated user's ID instead of relying on query param
    const userId = user.id; 
    const role = searchParams.get('role'); // Still need role to know which column to filter

    if (!role) { // userId comes from auth now
       return NextResponse.json(
        { error: 'Missing required query parameter: role' },
        { status: 400 }
      );     
    }
     if (role !== 'learner' && role !== 'teacher') {
        return NextResponse.json({ error: 'Invalid role parameter' }, { status: 400 });
     }

    // Determine the column to filter on based on the role
    const filterColumn = role === 'learner' ? 'learner_id' : 'teacher_id';

    // Fetch sessions where the authenticated user is either the learner or teacher
    const { data: sessions, error } = await supabase
      .from('scheduled_sessions')
      .select('*') 
      .eq(filterColumn, userId); 

    if (error) {
      console.error('Supabase select error:', error);
      throw error;
    }

    // Timestamps from Supabase are already ISO strings, no conversion needed
    return NextResponse.json(sessions);

  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: error.message },
      { status: 500 }
    );
  }
}

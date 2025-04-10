import { NextResponse } from 'next/server';
// Import the server client creation utility
import { createClient } from '@/utils/supabase/server'; 

export async function PATCH(request, { params }) {
  const supabase = createClient(); // Create server client for this request
  const sessionId = params.sessionId;
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Status is required in request body' }, { status: 400 });
    }

    // --- Authorization Check ---
    // 1. Get the authenticated user server-side
    const { data: { user }, error: authError } = await supabase.auth.getUser(); 

    if (authError || !user) {
      console.error('Auth error in PATCH /api/sessions:', authError);
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // 2. Get the session to check the teacher_id
    const { data: sessionData, error: fetchError } = await supabase
      .from('scheduled_sessions')
      .select('teacher_id') // Only need the teacher_id for auth check
      .eq('id', sessionId)
      .single();

    if (fetchError) {
       console.error(`Error fetching session ${sessionId} for auth check:`, fetchError);
       // If session doesn't exist, return 404
       if (fetchError.code === 'PGRST116') { 
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
       }
       return NextResponse.json({ error: 'Failed to verify session ownership' }, { status: 500 });
    }
    
    if (!sessionData) {
       return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 3. Compare authenticated user ID with the session's teacher_id
    if (sessionData.teacher_id !== user.id) {
       console.warn(`Unauthorized attempt by user ${user.id} to update session ${sessionId} owned by ${sessionData.teacher_id}`);
       return NextResponse.json({ error: 'Forbidden: You are not the teacher for this session' }, { status: 403 });
    }
    // --- End Authorization Check ---

    // User is authorized, proceed with the update
    const { data: updatedSession, error: updateError } = await supabase
      .from('scheduled_sessions')
      .update({ status: status }) // Update the status field
      .eq('id', sessionId)       // Where the ID matches
      .select()                  // Return the updated row
      .single();                 // Expect a single row

    if (updateError) {
      console.error('Supabase update error:', updateError);
      // Handle specific errors, e.g., session not found (PGRST116 might indicate this if .single() is used)
      if (updateError.code === 'PGRST116') {
         return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      throw updateError;
    }

    if (!updatedSession) {
       return NextResponse.json({ error: 'Session not found after update attempt' }, { status: 404 });
    }

    return NextResponse.json(updatedSession);

  } catch (error) {
    console.error(`Failed to update session ${sessionId}:`, error);
    return NextResponse.json(
      { error: 'Failed to update session', details: error.message },
      { status: 500 }
    );
  }
}

// Optional: Implement GET for fetching a single session by ID if needed
// export async function GET(request, { params }) { ... }

// Optional: Implement DELETE for cancelling/deleting a session if needed
// export async function DELETE(request, { params }) { ... }

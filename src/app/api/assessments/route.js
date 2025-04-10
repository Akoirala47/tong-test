import { NextResponse } from 'next/server';
// Import the server client creation utility
import { createClient } from '@/utils/supabase/server'; 

// Hardcoded admin email for initial setup (same as middleware)
const ADMIN_EMAIL = 'aayush.k204@gmail.com'; 

// Helper function for admin check (can be reused)
async function isAdminUser(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;
  // Option A: Hardcoded email check
  return user.email === ADMIN_EMAIL;
  // Option B: Check is_admin flag in profiles (more flexible)
  /*
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return !profileError && profile?.is_admin === true;
  */
}


export async function POST(request) {
  const supabase = createClient(); // Create server client

  try {
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // 2. Parse request body
    const { language, quizData } = await request.json();

    // 3. Validate input
    if (!language || !quizData) {
      return NextResponse.json({ error: 'Missing required fields: language, quizData' }, { status: 400 });
    }
    // Add more specific validation for quizData structure if needed

    // 4. Prepare data for insertion
    const assessmentData = {
      user_id: user.id,
      language: language,
      quiz_data: quizData,
      status: 'pending', // Default status
    };

    // 5. Insert into the database
    const { data: insertedAssessment, error: insertError } = await supabase
      .from('teacher_assessments')
      .insert(assessmentData)
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insert error (teacher_assessments):', insertError);
      // Handle potential unique constraint violation (user already has pending request for this language)
      if (insertError.code === '23505') { // Check for unique violation code
         return NextResponse.json(
           { error: `You already have a pending assessment request for ${language}.` }, 
           { status: 409 } // 409 Conflict
         );
      }
      throw insertError; // Re-throw other errors
    }

    // 6. Return success response
    return NextResponse.json(insertedAssessment, { status: 201 });

  } catch (error) {
    console.error('Failed to submit assessment:', error);
    return NextResponse.json(
      { error: 'Failed to submit assessment', details: error.message },
      { status: 500 }
    );
  }
}


export async function GET(request) {
  const supabase = createClient(); // Create server client
  
  try {
    // 1. Authorization: Check if user is admin
    // Pass the created client to the helper function
    const isAdmin = await isAdminUser(supabase); 
    if (!isAdmin) {
       return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // e.g., 'pending'

    // 3. Build query
    let query = supabase.from('teacher_assessments').select('*');

    if (status) {
      query = query.eq('status', status);
    }
    
    query = query.order('submitted_at', { ascending: true }); // Order by submission time

    // 4. Execute query
    const { data: assessments, error } = await query;

    if (error) {
      console.error('Supabase select error (teacher_assessments):', error);
      throw error;
    }

    // 5. Return data
    return NextResponse.json(assessments || []);

  } catch (error) {
    console.error('Failed to fetch assessments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments', details: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
// Import the server client creation utility
import { createClient } from '@/utils/supabase/server'; 

// Hardcoded admin email for initial setup (same as middleware/other route)
const ADMIN_EMAIL = 'aayush.k204@gmail.com'; 

// Helper function for admin check (copied from assessments/route.js)
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

export async function PATCH(request, { params }) {
  const supabase = createClient(); // Create server client
  const assessmentId = params.assessmentId;

  if (!assessmentId) {
    return NextResponse.json({ error: 'Assessment ID is required' }, { status: 400 });
  }

  try {
    // 1. Authorization: Check if user is admin
    // Pass the created client to the helper function
    const isAdmin = await isAdminUser(supabase); 
    if (!isAdmin) {
       return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Get new status from request body
    const { status: newStatus } = await request.json();
    if (!newStatus || !['approved', 'rejected'].includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status provided. Must be "approved" or "rejected".' }, { status: 400 });
    }

    // 3. Fetch the assessment to get the user_id
    const { data: assessment, error: fetchError } = await supabase
      .from('teacher_assessments')
      .select('user_id, status') // Select current status and user_id
      .eq('id', assessmentId)
      .single();

    if (fetchError || !assessment) {
       console.error(`Error fetching assessment ${assessmentId} for update:`, fetchError);
       return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Optional: Prevent updating if not currently 'pending'?
    if (assessment.status !== 'pending') {
       return NextResponse.json({ error: `Assessment is already ${assessment.status}.` }, { status: 409 }); // Conflict
    }

    // --- Perform Updates ---
    // Use a transaction if possible, although Supabase JS doesn't directly support multi-table transactions easily.
    // We'll do sequential updates and handle potential inconsistencies.

    // 4. Update the assessment status
    const { error: updateAssessmentError } = await supabase
      .from('teacher_assessments')
      .update({ 
          status: newStatus, 
          reviewed_at: new Date().toISOString(), // Record review time
          // reviewer_notes: 'Optional notes here' // Could add notes field later
       })
      .eq('id', assessmentId);

    if (updateAssessmentError) {
      console.error(`Error updating assessment ${assessmentId} status:`, updateAssessmentError);
      throw new Error('Failed to update assessment status.');
    }

    console.log(`Assessment ${assessmentId} status updated to ${newStatus}.`);

    // 5. If approved, update the user's role in the profiles table
    if (newStatus === 'approved') {
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ role: 'teacher' }) // Update role to teacher
        .eq('id', assessment.user_id); // For the specific user

      if (updateProfileError) {
        // Critical: Log this error, as the user role update failed!
        // May need manual correction or retry logic.
        console.error(`CRITICAL: Failed to update profile role to 'teacher' for user ${assessment.user_id} after approving assessment ${assessmentId}:`, updateProfileError);
        // Return a specific error indicating partial success?
        return NextResponse.json(
           { warning: 'Assessment status updated, but failed to update user role.', details: updateProfileError.message }, 
           { status: 500 } // Internal server error because state is inconsistent
        );
      }
       console.log(`Profile role updated to 'teacher' for user ${assessment.user_id}.`);
    }

    // 6. Return success
    return NextResponse.json({ message: `Assessment ${assessmentId} status updated to ${newStatus}.` });

  } catch (error) {
    console.error(`Failed to process assessment update for ${assessmentId}:`, error);
    return NextResponse.json(
      { error: 'Failed to process assessment update', details: error.message },
      { status: 500 }
    );
  }
}

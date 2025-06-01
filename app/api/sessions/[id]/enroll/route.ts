import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// POST /api/sessions/:id/enroll - Enroll in a session (with unit check)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Check if user is already enrolled
    const { data: existingEnrollment, error: enrollmentError } = await supabase
      .from('session_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single();
    
    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Already enrolled in this session', enrollment: existingEnrollment },
        { status: 409 }
      );
    }
    
    // Call the database function to enroll in the session
    const { data: result, error: enrollError } = await supabase
      .rpc('enroll_in_session', {
        p_session_id: sessionId,
        p_user_id: user.id
      });
    
    if (enrollError) {
      // Check if it's an insufficient units error
      if (enrollError.message && enrollError.message.includes('Insufficient units')) {
        return NextResponse.json(
          { error: enrollError.message },
          { status: 402 } // 402 Payment Required - appropriate for insufficient units
        );
      }
      
      console.error('Error enrolling in session:', enrollError);
      return NextResponse.json(
        { error: 'Failed to enroll in session' },
        { status: 500 }
      );
    }
    
    // Get the enrollment record
    const { data: enrollment } = await supabase
      .from('session_enrollments')
      .select('id, created_at, status, units_spent')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single();
    
    return NextResponse.json({
      success: true,
      enrollment
    });
  } catch (error) {
    console.error('Unexpected error in enrollment API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

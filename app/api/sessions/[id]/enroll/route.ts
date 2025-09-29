import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { sendEnrollmentConfirmation, WebinarDetails } from '@/services/email';
import { inngest } from '@/lib/inngest';

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
      
    // If session exists, get more detailed information for the email
    let sessionDetails = null;
    if (session) {
      const { data: details, error: detailsError } = await supabase
        .from('sessions')
        .select(`
          id, 
          title, 
          description,
          start_time,
          end_time,
          location,
          course_id,
          is_online
        `)
        .eq('id', sessionId)
        .single();
      sessionDetails = details;
      
      console.log('Session details fetch result:', {
        hasDetails: !!details,
        sessionId,
        title: details?.title,
        detailsError: detailsError?.message,
        availableColumns: details ? Object.keys(details) : []
      });
    }
    
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
    
    // Get user profile information for the email
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    
    console.log('User profile fetch result:', { 
      hasProfile: !!userProfile, 
      hasEmail: !!userProfile?.email,
      profileError: profileError?.message
    });
    
    // Send confirmation email if we have the user's email and detailed session info
    if (userProfile?.email && sessionDetails) {
      console.log('Attempting to send email confirmation with:', {
        userEmail: userProfile.email,
        userName: userProfile.full_name || 'Participant',
        webinarTitle: sessionDetails.title
      });
      try {
        // Format session data for the email
        const webinarDetails: WebinarDetails = {
          id: sessionDetails.id,
          title: sessionDetails.title,
          date: sessionDetails.start_time,
          startTime: sessionDetails.start_time ? new Date(sessionDetails.start_time).toLocaleTimeString() : 'TBD',
          endTime: sessionDetails.end_time ? new Date(sessionDetails.end_time).toLocaleTimeString() : undefined,
          speakerName: 'Session Speaker', // We don't have speaker name in the sessions table
          duration: sessionDetails.end_time && sessionDetails.start_time ? 
            Math.round((new Date(sessionDetails.end_time).getTime() - new Date(sessionDetails.start_time).getTime()) / (1000 * 60)) : 60,
          location: sessionDetails.is_online ? 'Online' : (sessionDetails.location || 'TBD'),
          description: sessionDetails.description
        };
        
        // Send the email
        const userName = userProfile.full_name || 'Participant';
        await sendEnrollmentConfirmation(
          userProfile.email,
          userName,
          webinarDetails
        );
      } catch (emailError) {
        // Log the error but don't fail the enrollment
        console.error('Failed to send enrollment confirmation email:', {
          error: emailError,
          message: emailError instanceof Error ? emailError.message : 'Unknown error',
          stack: emailError instanceof Error ? emailError.stack : undefined
        });
      }
    }

    // Trigger Inngest event to schedule reminder emails
    if (enrollment && sessionDetails) {
      try {
        await inngest.send({
          name: "session/user.enrolled",
          data: {
            sessionId: sessionId,
            userId: user.id,
            enrollmentId: enrollment.id,
            sessionStartTime: sessionDetails.start_time
          }
        });
        console.log('Reminder scheduling event sent to Inngest');
      } catch (inngestError) {
        // Log the error but don't fail the enrollment
        console.error('Failed to schedule reminder emails:', {
          error: inngestError,
          message: inngestError instanceof Error ? inngestError.message : 'Unknown error'
        });
      }
    }
    
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

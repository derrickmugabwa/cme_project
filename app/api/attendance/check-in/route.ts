import { createClient } from '@/lib/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the current user - using getUser() for better security
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Check if the session exists
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, start_time, end_time')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if attendance record already exists
    const { data: existingAttendance, error: existingError } = await supabase
      .from('session_attendance')
      .select('id, status')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();

    if (existingAttendance) {
      // Attendance record already exists
      return NextResponse.json({
        message: 'Attendance already recorded',
        status: existingAttendance.status,
        id: existingAttendance.id
      });
    }

    // Create new attendance record
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('session_attendance')
      .insert([
        {
          user_id: userId,
          session_id: sessionId,
          check_in_time: new Date().toISOString(),
          status: 'pending_approval'
        }
      ])
      .select()
      .single();

    if (attendanceError) {
      console.error('Error creating attendance record:', attendanceError);
      return NextResponse.json(
        { error: 'Failed to record attendance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Attendance recorded successfully',
      status: 'pending_approval',
      id: attendanceData.id
    });

  } catch (error) {
    console.error('Error processing attendance check-in:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

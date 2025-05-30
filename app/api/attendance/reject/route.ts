import { createClient } from '@/lib/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { attendanceId, notes } = await request.json();

    if (!attendanceId) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
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

    // Check if user is admin or faculty
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    if (userProfile.role !== 'admin' && userProfile.role !== 'faculty') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and faculty can reject attendance' },
        { status: 403 }
      );
    }

    // Update attendance record
    const { data: updatedAttendance, error: updateError } = await supabase
      .from('session_attendance')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        notes: notes || 'Attendance rejected'
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error rejecting attendance:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject attendance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Attendance rejected successfully',
      data: updatedAttendance
    });

  } catch (error) {
    console.error('Error processing attendance rejection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

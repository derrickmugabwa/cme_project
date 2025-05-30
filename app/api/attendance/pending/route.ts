import { createClient } from '@/lib/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
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
        { error: 'Unauthorized. Only admins and faculty can access this endpoint' },
        { status: 403 }
      );
    }

    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const status = searchParams.get('status') || 'pending_approval';

    // Build query
    let query = supabase
      .from('session_attendance')
      .select(`
        id,
        created_at,
        user_id,
        session_id,
        check_in_time,
        status,
        approved_by,
        approved_at,
        notes,
        profiles:user_id(id, full_name, email),
        sessions:session_id(id, title, start_time, end_time)
      `)
      .eq('status', status);

    // Add session filter if provided
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    // Execute query
    const { data: attendanceRecords, error: attendanceError } = await query;

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError);
      return NextResponse.json(
        { error: 'Failed to fetch attendance records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: attendanceRecords
    });

  } catch (error) {
    console.error('Error processing attendance records request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

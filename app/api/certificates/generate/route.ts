import { createClient } from '@/lib/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request body
    const { attendanceId } = await request.json();
    if (!attendanceId) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the attendance record belongs to the current user
    const { data: attendance, error: attendanceError } = await supabase
      .from('session_attendance')
      .select('*')
      .eq('id', attendanceId)
      .single();
    
    if (attendanceError || !attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }
    
    if (attendance.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to generate certificate for this attendance' },
        { status: 403 }
      );
    }
    
    if (attendance.status !== 'approved') {
      return NextResponse.json(
        { error: 'Cannot generate certificate for non-approved attendance' },
        { status: 400 }
      );
    }
    
    // Generate certificate using the database function
    const { data: certificateId, error: generateError } = await supabase.rpc(
      'generate_certificate',
      { p_attendance_id: attendanceId }
    );
    
    if (generateError) {
      console.error('Error generating certificate:', generateError);
      return NextResponse.json(
        { error: 'Failed to generate certificate' },
        { status: 500 }
      );
    }
    
    // Fetch the generated certificate
    const { data: certificate, error: fetchError } = await supabase
      .from('certificates')
      .select(`
        *,
        profiles:user_id(id, full_name, email),
        sessions:session_id(id, title, start_time, end_time)
      `)
      .eq('id', certificateId)
      .single();
    
    if (fetchError || !certificate) {
      console.error('Error fetching generated certificate:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch generated certificate' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      certificate
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

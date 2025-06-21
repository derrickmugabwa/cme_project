import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

/**
 * API endpoint to clear attendance records for a session
 * DELETE /api/attendance/clear
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check authorization (admin or faculty only)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    if (!['admin', 'faculty'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const { sessionId, userId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Check if session exists
    const { data: sessionExists, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
      
    if (sessionError || !sessionExists) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }
    
    // If userId is provided, check if user exists
    if (userId) {
      const { data: userExists, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (userError || !userExists) {
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 }
        );
      }
    }
    
    // Call the database function to clear attendance records
    const { data, error } = await supabase
      .rpc('clear_attendance_records', {
        p_session_id: sessionId,
        p_user_id: userId || null
      });
      
    if (error) {
      console.error('Error clearing attendance records:', error);
      return NextResponse.json(
        { error: 'Failed to clear attendance records' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Attendance records cleared successfully',
      result: data
    });
  } catch (error: any) {
    console.error('Error clearing attendance records:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to clear attendance records' },
      { status: 500 }
    );
  }
}

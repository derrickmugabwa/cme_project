import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

/**
 * Get session attendance settings
 * GET /api/sessions/[id]/settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const supabase = createClient();
    
    // Check authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionData.session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user is admin or faculty
    if (!['admin', 'faculty'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get settings
    const { data, error } = await supabase
      .from('session_settings')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw error;
    }

    // Return default settings if none exist
    if (!data) {
      return NextResponse.json({
        session_id: sessionId,
        min_attendance_minutes: 30, // Default value
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting session settings:', error);
    return NextResponse.json(
      { error: 'Failed to get session settings' },
      { status: 500 }
    );
  }
}

/**
 * Update session attendance settings
 * PUT /api/sessions/[id]/settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const supabase = createClient();
    
    // Check authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionData.session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user is admin or faculty
    if (!['admin', 'faculty'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { min_attendance_minutes } = body;

    if (typeof min_attendance_minutes !== 'number' || min_attendance_minutes < 0) {
      return NextResponse.json(
        { error: 'Invalid min_attendance_minutes value' },
        { status: 400 }
      );
    }

    // Update settings
    const { data, error } = await supabase
      .from('session_settings')
      .upsert({
        session_id: sessionId,
        min_attendance_minutes,
        updated_by: sessionData.session.user.id,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Trigger recalculation of eligibility for all attendance records
    const { error: recalcError } = await supabase.rpc('recalculate_attendance_eligibility', {
      p_session_id: sessionId
    });

    if (recalcError) {
      console.error('Error recalculating eligibility:', recalcError);
      // Continue despite error, as settings were updated successfully
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating session settings:', error);
    return NextResponse.json(
      { error: 'Failed to update session settings' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import teamsMeetingService from '@/lib/teamsMeetingService';

// GET /api/sessions - Get all sessions
export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client with server-side context
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('start_time', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ sessions: data });
  } catch (error: any) {
    console.error('Error getting sessions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client with server-side context
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    // Get user role to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || !['faculty', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Parse request body
    const sessionData = await request.json();
    
    // Validate session data
    if (!sessionData.title || !sessionData.start_time || !sessionData.end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create session in database
    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        title: sessionData.title,
        description: sessionData.description,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        location: sessionData.location,
        course_id: sessionData.course_id,
        created_by: user.id,
        is_online: sessionData.is_online || false
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // If session is online, create Teams meeting
    if (newSession.is_online) {
      try {
        const meetingDetails = await teamsMeetingService.createTeamsMeeting(user.id, newSession);
        
        return NextResponse.json({
          session: {
            ...newSession,
            teams_meeting_id: meetingDetails.meetingId,
            teams_join_url: meetingDetails.joinUrl
          }
        });
      } catch (teamsError: any) {
        // Return session even if Teams meeting creation fails
        console.error('Error creating Teams meeting:', teamsError);
        
        return NextResponse.json({
          session: newSession,
          teamsError: teamsError.message
        });
      }
    }
    
    return NextResponse.json({ session: newSession });
  } catch (error: any) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

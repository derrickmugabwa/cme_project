import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import teamsMeetingService from '@/lib/teamsMeetingService';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET /api/sessions/[id] - Get a single session
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ session: data });
  } catch (error: any) {
    console.error('Error getting session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/sessions/[id] - Update a session
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    // Get user role and current session to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('created_by')
      .eq('id', params.id)
      .single();
    
    // Check permissions
    if (!profile || 
        (profile.role !== 'admin' && 
         (profile.role !== 'faculty' || currentSession?.created_by !== user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Parse request body
    const sessionData = await request.json();
    
    // Update session in database
    const { data: updatedSession, error } = await supabase
      .from('sessions')
      .update({
        title: sessionData.title,
        description: sessionData.description,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        location: sessionData.location,
        course_id: sessionData.course_id,
        is_online: sessionData.is_online,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Handle Teams meeting update
    if (updatedSession.is_online) {
      try {
        // If session is online, create or update Teams meeting
        const meetingDetails = await teamsMeetingService.updateTeamsMeeting(user.id, {
          ...updatedSession,
          id: params.id
        });
        
        return NextResponse.json({
          session: {
            ...updatedSession,
            teams_meeting_id: meetingDetails.meetingId
          }
        });
      } catch (teamsError: any) {
        // Return session even if Teams meeting update fails
        console.error('Error updating Teams meeting:', teamsError);
        
        return NextResponse.json({
          session: updatedSession,
          teamsError: teamsError.message
        });
      }
    } else if (!updatedSession.is_online && currentSession?.teams_meeting_id) {
      // If session was changed from online to in-person, cancel Teams meeting
      try {
        await teamsMeetingService.cancelTeamsMeeting(user.id, params.id);
      } catch (teamsError: any) {
        console.error('Error canceling Teams meeting:', teamsError);
      }
    }
    
    return NextResponse.json({ session: updatedSession });
  } catch (error: any) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/sessions/[id] - Delete a session
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    // Get user role and current session to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('created_by, teams_meeting_id')
      .eq('id', params.id)
      .single();
    
    // Check permissions
    if (!profile || 
        (profile.role !== 'admin' && 
         (profile.role !== 'faculty' || currentSession?.created_by !== user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // If session has a Teams meeting, cancel it
    if (currentSession?.teams_meeting_id) {
      try {
        await teamsMeetingService.cancelTeamsMeeting(user.id, params.id);
      } catch (teamsError: any) {
        console.error('Error canceling Teams meeting:', teamsError);
      }
    }
    
    // Delete session from database
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

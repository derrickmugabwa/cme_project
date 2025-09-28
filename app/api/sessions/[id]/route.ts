import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import teamsMeetingService from '@/lib/teamsMeetingService';

// GET /api/sessions/[id] - Get a single session
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
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
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
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
    
    // Check if user is admin or instructor
    if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Get the session to update
    const { data: existingSession, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    // Check permissions
    if (!profile || 
        (profile.role !== 'admin' && 
         (profile.role !== 'faculty' || existingSession?.created_by !== user.id))) {
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
      .eq('id', id)
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
          id: id
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
    } else if (!updatedSession.is_online && existingSession?.teams_meeting_id) {
      // If session was changed from online to in-person, cancel Teams meeting
      try {
        await teamsMeetingService.cancelTeamsMeeting(user.id, id);
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
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
      .eq('id', id)
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
        await teamsMeetingService.cancelTeamsMeeting(user.id, id);
      } catch (teamsError: any) {
        console.error('Error canceling Teams meeting:', teamsError);
      }
    }
    
    try {
      // Check if session exists and user has permission to archive
      const { data: sessionExists, error: sessionError } = await supabase
        .from('sessions')
        .select('id, title, created_by, archived_at')
        .eq('id', id)
        .single();

      if (sessionError || !sessionExists) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      if (sessionExists.archived_at) {
        return NextResponse.json({ error: 'Session is already archived' }, { status: 400 });
      }

      // Check permissions: admin, faculty, or session creator
      if (user.role !== 'admin' && user.role !== 'faculty' && sessionExists.created_by !== user.id) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Archive the session instead of deleting it
      // This preserves all related data (attendance, enrollments, unit requirements, etc.)
      const { data: archivedData, error: archiveError } = await supabase
        .from('sessions')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: user.id,
          archive_reason: 'Archived via admin interface',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (archiveError) {
        console.error('Error archiving session:', archiveError);
        throw new Error(`Failed to archive session: ${archiveError.message}`);
      }

      console.log('Session archived successfully:', archivedData);
      
      return NextResponse.json({ 
        success: true, 
        message: `Session "${sessionExists.title}" has been archived successfully. All related data (enrollments, attendance, unit requirements) has been preserved.`,
        archived: true,
        archivedData: archivedData?.[0]
      });
    } catch (error: any) {
      console.error('Error deleting session:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

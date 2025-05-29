import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

// POST /api/sessions/google-meet - Create a new session with Google Meet link
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is faculty or admin
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
    if (!sessionData.title || !sessionData.start_time || !sessionData.end_time || !sessionData.google_meet_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate Google Meet URL format
    if (!sessionData.google_meet_url.includes('meet.google.com')) {
      return NextResponse.json({ error: 'Invalid Google Meet URL' }, { status: 400 });
    }
    
    // Create session in database
    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        title: sessionData.title,
        description: sessionData.description,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        location: null,
        course_id: sessionData.course_id,
        created_by: user.id,
        is_online: true,
        online_provider: 'google-meet',
        teams_join_url: sessionData.google_meet_url // Reusing the teams_join_url field for now
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ session: newSession });
  } catch (error: any) {
    console.error('Error creating Google Meet session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

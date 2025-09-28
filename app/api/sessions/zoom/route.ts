import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

// POST /api/sessions/zoom - Create a new session with Zoom meeting link
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
    if (!sessionData.title || !sessionData.topic || !sessionData.start_time || !sessionData.end_time || !sessionData.zoom_join_url) {
      return NextResponse.json({ error: 'Missing required fields: title, topic, start_time, end_time, and zoom_join_url are required' }, { status: 400 });
    }
    
    // Validate Zoom URL format
    if (!sessionData.zoom_join_url.includes('zoom.us')) {
      return NextResponse.json({ error: 'Invalid Zoom meeting URL' }, { status: 400 });
    }
    
    // Create session in database
    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        title: sessionData.title,
        topic: sessionData.topic,
        description: sessionData.description,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        location: null,
        course_id: sessionData.course_id,
        created_by: user.id,
        is_online: true,
        online_provider: 'zoom',
        teams_join_url: sessionData.zoom_join_url // Reusing the teams_join_url field for now
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ session: newSession });
  } catch (error: any) {
    console.error('Error creating Zoom session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

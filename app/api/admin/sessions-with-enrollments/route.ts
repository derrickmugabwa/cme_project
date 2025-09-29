import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// GET /api/admin/sessions-with-enrollments - Get sessions with enrollment counts
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication and admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch sessions with enrollment counts
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        start_time,
        end_time,
        is_online,
        session_enrollments(count)
      `)
      .gte('start_time', new Date().toISOString()) // Only future sessions
      .order('start_time');

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Transform the data to include enrollment count
    const sessionsWithCounts = sessions.map(session => ({
      id: session.id,
      title: session.title,
      start_time: session.start_time,
      end_time: session.end_time,
      is_online: session.is_online,
      enrollmentCount: session.session_enrollments?.[0]?.count || 0
    }));

    return NextResponse.json(sessionsWithCounts);
  } catch (error) {
    console.error('Error in sessions-with-enrollments GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

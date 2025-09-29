import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest';

// POST /api/admin/send-manual-reminders - Send manual reminders for a session
export async function POST(request: Request) {
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

    const body = await request.json();
    const { sessionId, reminderTypes } = body;

    if (!sessionId || !reminderTypes || !Array.isArray(reminderTypes)) {
      return NextResponse.json({ error: 'Session ID and reminder types are required' }, { status: 400 });
    }

    // Verify session exists and get enrollment count
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        start_time,
        session_enrollments(count)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const enrollmentCount = session.session_enrollments?.[0]?.count || 0;
    if (enrollmentCount === 0) {
      return NextResponse.json({ error: 'No users enrolled in this session' }, { status: 400 });
    }

    // Trigger Inngest event for manual reminders
    try {
      await inngest.send({
        name: "admin/trigger.reminders",
        data: {
          sessionId,
          reminderTypes,
          triggeredBy: user.id,
          triggeredAt: new Date().toISOString()
        }
      });

      return NextResponse.json({
        success: true,
        scheduled: reminderTypes.length,
        enrollmentCount,
        message: `Manual reminders scheduled for ${enrollmentCount} users`
      });
    } catch (inngestError) {
      console.error('Failed to trigger Inngest event:', inngestError);
      return NextResponse.json({ error: 'Failed to schedule reminders' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in send-manual-reminders POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { sendSessionReminder } from '@/services/email';

// POST /api/admin/send-test-reminder - Send test reminder to admin
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
      .select('role, full_name, email')
      .eq('id', user.id)
      .single();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!profile.email) {
      return NextResponse.json({ error: 'Admin email not found in profile' }, { status: 400 });
    }

    const body = await request.json();
    const { reminderTypes } = body;

    if (!reminderTypes || !Array.isArray(reminderTypes) || reminderTypes.length === 0) {
      return NextResponse.json({ error: 'At least one reminder type is required' }, { status: 400 });
    }

    // Get reminder configurations
    const { data: configs, error: configError } = await supabase
      .from('reminder_configurations')
      .select('*')
      .in('reminder_type', reminderTypes);

    if (configError || !configs || configs.length === 0) {
      return NextResponse.json({ error: 'Reminder configurations not found' }, { status: 404 });
    }

    // Create mock session data for testing
    const mockSessionDetails = {
      id: 'test-session-id',
      title: 'Test Session - Email Reminder System',
      description: 'This is a test session used to verify the email reminder system is working correctly.',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      speakerName: 'Dr. Test Speaker',
      duration: 60,
      location: 'Online Meeting Room',
      is_online: true,
      reminderType: '',
      reminderConfig: configs[0], // Will be updated for each type
      joinUrl: 'https://example.com/join/test-session',
      preparationNotes: 'This is a test email. No preparation needed.'
    };

    const results = [];

    // Send test email for each selected reminder type
    for (const config of configs) {
      try {
        const testSessionDetails = {
          ...mockSessionDetails,
          reminderType: config.reminder_type,
          reminderConfig: config
        };

        const result = await sendSessionReminder(
          profile.email,
          profile.full_name || 'Admin User',
          testSessionDetails
        );

        results.push({
          reminderType: config.reminder_type,
          success: result.success,
          error: result.error
        });
      } catch (error) {
        results.push({
          reminderType: config.reminder_type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      sent: successCount,
      failed: failureCount,
      results,
      message: `Test reminder(s) sent to ${profile.email}`
    });
  } catch (error) {
    console.error('Error in send-test-reminder POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ReminderService } from '@/lib/reminder-service';

// This is a test endpoint - bypass auth for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Test endpoint is working' });
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST request received');
    const body = await request.json();
    console.log('Request body:', body);
    
    const { sessionId, reminderType } = body;
    
    if (!sessionId || !reminderType) {
      console.log('Missing required parameters:', { sessionId, reminderType });
      return NextResponse.json({ 
        error: 'Missing required parameters',
        received: { sessionId, reminderType }
      }, { status: 400 });
    }
    
    console.log('Testing reminder service directly:', { sessionId, reminderType });
    
    // Get the reminder configuration
    const configs = await ReminderService.getEnabledReminderConfigurations();
    const config = configs.find(c => c.reminder_type === reminderType);
    
    if (!config) {
      return NextResponse.json({ 
        error: 'Reminder configuration not found',
        availableTypes: configs.map(c => c.reminder_type)
      }, { status: 400 });
    }
    
    console.log('Found config:', config);
    
    // Get session enrollments
    const enrollments = await ReminderService.getSessionEnrollments(sessionId);
    console.log('Found enrollments:', enrollments.length);
    
    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ 
        error: 'No enrollments found',
        sessionId 
      }, { status: 400 });
    }
    
    // Create pending reminders
    const pendingReminders = enrollments.map(enrollment => ({
      sessionId: enrollment.session_id,
      userId: enrollment.user_id,
      userEmail: enrollment.profiles.email,
      userName: enrollment.profiles.full_name || 'Participant',
      sessionDetails: enrollment.sessions
    }));
    
    console.log('Created pending reminders:', pendingReminders);
    
    // Process the reminders
    const result = await ReminderService.processBatchedReminders(pendingReminders, config);
    
    console.log('Processing result:', result);
    
    return NextResponse.json({
      success: true,
      config,
      enrollments: enrollments.length,
      pendingReminders: pendingReminders.length,
      result
    });
    
  } catch (error) {
    console.error('Test reminder error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

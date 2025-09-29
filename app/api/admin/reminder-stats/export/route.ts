import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// GET /api/admin/reminder-stats/export - Export reminder statistics as CSV
export async function GET(request: Request) {
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

    // Parse query parameters
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const type = url.searchParams.get('type') || 'all';

    // Build query for detailed reminder data
    let query = supabase
      .from('session_reminder_emails')
      .select(`
        *,
        sessions!inner(title, start_time),
        profiles!inner(full_name, email)
      `);

    // Apply date filters
    if (from) {
      query = query.gte('sent_at', from);
    }
    if (to) {
      query = query.lte('sent_at', to);
    }

    // Apply type filter
    if (type !== 'all') {
      query = query.eq('reminder_type', type);
    }

    const { data: reminders, error } = await query.order('sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching reminder data for export:', error);
      return NextResponse.json({ error: 'Failed to fetch data for export' }, { status: 500 });
    }

    // Generate CSV content
    const csvHeaders = [
      'Date Sent',
      'Session Title',
      'Session Date',
      'Reminder Type',
      'Recipient Name',
      'Recipient Email',
      'Status',
      'Resend Email ID',
      'Retry Count',
      'Error Message'
    ];

    const csvRows = reminders.map((reminder: any) => [
      new Date(reminder.sent_at).toLocaleString(),
      reminder.sessions.title,
      new Date(reminder.sessions.start_time).toLocaleString(),
      reminder.reminder_type,
      reminder.profiles.full_name,
      reminder.profiles.email,
      reminder.email_status,
      reminder.resend_email_id || '',
      reminder.retry_count || 0,
      reminder.last_error || ''
    ]);

    // Combine headers and rows
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Create response with CSV content
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="reminder-stats-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

    return response;
  } catch (error) {
    console.error('Error in reminder stats export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

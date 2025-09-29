import { createClient, createAdminClient } from '@/lib/server';
import { NextResponse } from 'next/server';

// GET /api/admin/reminder-stats - Get reminder statistics
export async function GET(request: Request) {
  try {
    // Use regular client for authentication
    const authSupabase = await createClient();
    
    // Check authentication and admin role
    const { data: { user }, error: userError } = await authSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await authSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use admin client for data queries
    const supabase = createAdminClient();

    // Parse query parameters
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const type = url.searchParams.get('type') || 'all';

    // Build base query
    let query = supabase
      .from('session_reminder_emails')
      .select('*');

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

    const { data: reminders, error } = await query;

    if (error) {
      console.error('Error fetching reminder stats:', error);
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
    }

    // Calculate statistics
    const totalSent = reminders.filter(r => r.email_status === 'sent').length;
    const totalFailed = reminders.filter(r => r.email_status === 'failed').length;
    const successRate = totalSent + totalFailed > 0 ? (totalSent / (totalSent + totalFailed)) * 100 : 0;

    // Group by type
    const byType: Record<string, { sent: number; failed: number }> = {};
    reminders.forEach(reminder => {
      if (!byType[reminder.reminder_type]) {
        byType[reminder.reminder_type] = { sent: 0, failed: 0 };
      }
      if (reminder.email_status === 'sent') {
        byType[reminder.reminder_type].sent++;
      } else if (reminder.email_status === 'failed') {
        byType[reminder.reminder_type].failed++;
      }
    });

    // Group by day
    const byDay: Record<string, number> = {};
    reminders.forEach(reminder => {
      const day = new Date(reminder.sent_at).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    // Recent activity (last 7 days)
    const recentActivity = Object.entries(byDay)
      .map(([date, count]) => ({
        date,
        sent: reminders.filter(r => 
          r.sent_at.startsWith(date) && r.email_status === 'sent'
        ).length,
        failed: reminders.filter(r => 
          r.sent_at.startsWith(date) && r.email_status === 'failed'
        ).length
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);

    const stats = {
      totalSent,
      totalFailed,
      successRate,
      byType,
      byDay,
      recentActivity
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in reminder stats GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

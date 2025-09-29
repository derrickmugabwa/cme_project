import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import { ReminderConfigManager } from './components/ReminderConfigManager';
import { ReminderStatistics } from './components/ReminderStatistics';
import { ManualReminderTrigger } from './components/ManualReminderTrigger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default async function RemindersAdminPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/auth/login');
  }
  
  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
    redirect('/dashboard');
  }

  // Fetch initial data
  const { data: reminderConfigs } = await supabase
    .from('reminder_configurations')
    .select('*')
    .order('sort_order');

  const { data: recentReminders } = await supabase
    .from('session_reminder_emails')
    .select(`
      *,
      sessions!inner(title, start_time),
      profiles!inner(full_name, email)
    `)
    .order('sent_at', { ascending: false })
    .limit(10);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Session Reminder Management</h1>
          <p className="text-muted-foreground">
            Configure and monitor automated session reminder emails
          </p>
        </div>
      </div>

      <Tabs defaultValue="configurations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="manual">Manual Triggers</TabsTrigger>
          <TabsTrigger value="logs">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="configurations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reminder Configurations</CardTitle>
              <CardDescription>
                Manage when and how reminder emails are sent to enrolled users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReminderConfigManager initialConfigs={reminderConfigs || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <ReminderStatistics />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Reminder Triggers</CardTitle>
              <CardDescription>
                Send immediate reminders for specific sessions or test the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManualReminderTrigger />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reminder Activity</CardTitle>
              <CardDescription>
                Latest reminder emails sent by the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReminders && recentReminders.length > 0 ? (
                  <div className="space-y-2">
                    {recentReminders.map((reminder: any) => (
                      <div
                        key={reminder.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{reminder.sessions.title}</p>
                          <p className="text-sm text-muted-foreground">
                            To: {reminder.profiles.full_name} ({reminder.profiles.email})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Type: {reminder.reminder_type} • 
                            Sent: {new Date(reminder.sent_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            reminder.email_status === 'sent' 
                              ? 'bg-green-100 text-green-800' 
                              : reminder.email_status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {reminder.email_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No reminder emails sent yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

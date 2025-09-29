'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
// Using simple div separator instead of Radix UI component
import { Send, Search, Users, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  enrollmentCount: number;
  is_online: boolean;
}

interface ReminderType {
  reminder_type: string;
  display_name: string;
  is_enabled: boolean;
}

export function ManualReminderTrigger() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reminderTypes, setReminderTypes] = useState<ReminderType[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchReminderTypes();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/sessions-with-enrollments');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      toast.error('Failed to load sessions');
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReminderTypes = async () => {
    try {
      const response = await fetch('/api/admin/reminder-configs');
      if (!response.ok) throw new Error('Failed to fetch reminder types');
      
      const data = await response.json();
      setReminderTypes(data);
    } catch (error) {
      toast.error('Failed to load reminder types');
      console.error('Error fetching reminder types:', error);
    }
  };

  const sendManualReminders = async () => {
    if (!selectedSession || selectedTypes.length === 0) {
      toast.error('Please select a session and at least one reminder type');
      return;
    }

    const session = sessions.find(s => s.id === selectedSession);
    if (!session) {
      toast.error('Selected session not found');
      return;
    }

    if (session.enrollmentCount === 0) {
      toast.error('No users enrolled in this session');
      return;
    }

    const confirmMessage = `Send ${selectedTypes.length} reminder type(s) to ${session.enrollmentCount} enrolled user(s) for "${session.title}"?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/admin/send-manual-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession,
          reminderTypes: selectedTypes
        })
      });

      if (!response.ok) throw new Error('Failed to send reminders');

      const result = await response.json();
      toast.success(`Successfully triggered ${result.scheduled} reminder(s)`);
      
      // Reset form
      setSelectedSession('');
      setSelectedTypes([]);
    } catch (error) {
      toast.error('Failed to send reminders');
      console.error('Error sending reminders:', error);
    } finally {
      setIsSending(false);
    }
  };

  const sendTestReminder = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one reminder type for testing');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/admin/send-test-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderTypes: selectedTypes
        })
      });

      if (!response.ok) throw new Error('Failed to send test reminder');

      toast.success('Test reminder sent to your email');
    } catch (error) {
      toast.error('Failed to send test reminder');
      console.error('Error sending test reminder:', error);
    } finally {
      setIsSending(false);
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <div className="space-y-6">
      {/* Session Selection */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="session-search">Search Sessions</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="session-search"
              placeholder="Search by session title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label>Select Session</Label>
          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading sessions...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No sessions found
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSession === session.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedSession(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{session.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.start_time).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {session.enrollmentCount} enrolled
                        </span>
                        <Badge variant={session.is_online ? "default" : "secondary"} className={session.is_online ? "bg-green-100 text-green-800" : ""}>
                          {session.is_online ? "Online" : "In-Person"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reminder Type Selection */}
      <div className="space-y-4">
        <Label>Select Reminder Types</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reminderTypes.map((type) => (
            <div
              key={type.reminder_type}
              className="flex items-center space-x-2 p-3 border rounded-lg"
            >
              <Checkbox
                id={type.reminder_type}
                checked={selectedTypes.includes(type.reminder_type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedTypes(prev => [...prev, type.reminder_type]);
                  } else {
                    setSelectedTypes(prev => prev.filter(t => t !== type.reminder_type));
                  }
                }}
                disabled={!type.is_enabled}
              />
              <div className="flex-1">
                <Label
                  htmlFor={type.reminder_type}
                  className={`cursor-pointer ${!type.is_enabled ? 'text-muted-foreground' : ''}`}
                >
                  {type.display_name}
                </Label>
                {!type.is_enabled && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Disabled
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Session Summary */}
      {selectedSessionData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reminder Summary
            </CardTitle>
            <CardDescription>
              Review the details before sending manual reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">Session:</span> {selectedSessionData.title}
            </div>
            <div>
              <span className="font-medium">Date:</span>{' '}
              {new Date(selectedSessionData.start_time).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Enrolled Users:</span> {selectedSessionData.enrollmentCount}
            </div>
            <div>
              <span className="font-medium">Selected Reminder Types:</span>{' '}
              {selectedTypes.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTypes.map(type => {
                    const typeData = reminderTypes.find(t => t.reminder_type === type);
                    return (
                      <Badge key={type} variant="outline">
                        {typeData?.display_name || type}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <span className="text-muted-foreground">None selected</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              This will send {selectedTypes.length} reminder email(s) to {selectedSessionData.enrollmentCount} user(s).
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border-t border-border my-6" />

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={sendManualReminders}
          disabled={!selectedSession || selectedTypes.length === 0 || isSending}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400"
        >
          <Send className="h-4 w-4 mr-2" />
          {isSending ? 'Sending...' : 'Send Manual Reminders'}
        </Button>
        
        <Button
          variant="outline"
          onClick={sendTestReminder}
          disabled={selectedTypes.length === 0 || isSending}
          className="border-green-600 text-green-600 hover:bg-green-50"
        >
          Send Test Email
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        <strong>Note:</strong> Manual reminders will be sent immediately regardless of the session timing.
        Test emails will be sent to your admin email address only.
      </div>
    </div>
  );
}

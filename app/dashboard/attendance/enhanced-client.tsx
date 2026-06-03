"use client";

import { useCallback, useMemo, useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { CalendarClock, Check, ChevronsUpDown, Loader2, RefreshCw, Video } from 'lucide-react';
import AttendanceManagement from '@/components/attendance/AttendanceManagement';

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

export default function EnhancedAttendanceClient() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const checkUserRole = useCallback(async () => {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Get current user's role
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        if (!userError && userData && (userData.role === 'admin' || userData.role === 'faculty')) {
          setIsAdmin(true);
        } else {
          // Redirect non-admin users
          window.location.href = '/dashboard';
        }
      } else {
        // Redirect unauthenticated users
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  }, [supabase]);
  
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all sessions ordered by start time (most recent first)
      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, start_time, end_time')
        .order('start_time', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setSessions(data || []);
      
      // Auto-select the most recent session if available
      if (data && data.length > 0) {
        setSelectedSessionId(currentSessionId => currentSessionId || data[0].id);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sessions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const selectedSession = useMemo(
    () => sessions.find(session => session.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  const filteredSessions = useMemo(() => {
    const term = sessionSearchTerm.trim().toLowerCase();
    const matchingSessions = term
      ? sessions.filter(session => {
          const searchableText = [
            session.title,
            formatDate(session.start_time),
            formatDate(session.end_time),
            session.id,
          ].join(' ').toLowerCase();

          return searchableText.includes(term);
        })
      : sessions;

    return matchingSessions.slice(0, 80);
  }, [formatDate, sessions, sessionSearchTerm]);

  const matchingSessionCount = useMemo(() => {
    const term = sessionSearchTerm.trim().toLowerCase();

    if (!term) {
      return sessions.length;
    }

    return sessions.filter(session => {
      const searchableText = [
        session.title,
        formatDate(session.start_time),
        formatDate(session.end_time),
        session.id,
      ].join(' ').toLowerCase();

      return searchableText.includes(term);
    }).length;
  }, [formatDate, sessions, sessionSearchTerm]);

  useEffect(() => {
    const loadInitialData = async () => {
      await checkUserRole();
      await fetchSessions();
    };

    void loadInitialData();
  }, [checkUserRole, fetchSessions]);
  
  return (
    <div className="space-y-6">
      <Toaster />
      
      <Card>
        <CardHeader>
          <CardTitle>Select Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="w-full max-w-2xl space-y-2">
              <Popover
                open={sessionPickerOpen}
                onOpenChange={(open) => {
                  setSessionPickerOpen(open);
                  if (!open) {
                    setSessionSearchTerm('');
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={sessionPickerOpen}
                    disabled={loading}
                    className="h-auto min-h-12 w-full justify-between gap-3 px-3 py-2 text-left font-normal"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading webinars...
                      </span>
                    ) : selectedSession ? (
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                          <Video className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {selectedSession.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {formatDate(selectedSession.start_time)}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="flex min-w-0 items-center gap-3 text-muted-foreground">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <CalendarClock className="h-4 w-4" />
                        </span>
                        Search and select a webinar
                      </span>
                    )}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search webinars by title or date..."
                      value={sessionSearchTerm}
                      onValueChange={setSessionSearchTerm}
                      className="h-11"
                    />
                    <CommandList className="max-h-80">
                      {matchingSessionCount === 0 ? (
                        <CommandEmpty>No matching webinars found.</CommandEmpty>
                      ) : (
                        <CommandGroup
                          heading={
                            matchingSessionCount > filteredSessions.length
                              ? `Showing ${filteredSessions.length} of ${matchingSessionCount} webinars`
                              : `${matchingSessionCount} webinars`
                          }
                        >
                          {filteredSessions.map((session) => {
                            return (
                              <CommandItem
                                key={session.id}
                                value={`${session.title} ${formatDate(session.start_time)} ${session.id}`}
                                onSelect={() => {
                                  setSelectedSessionId(session.id);
                                  setSessionPickerOpen(false);
                                }}
                                className="items-start gap-3 py-3"
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                                  <Video className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">{session.title}</span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {formatDate(session.start_time)}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                  <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                                    Webinar
                                  </Badge>
                                  <Check
                                    className={`h-4 w-4 ${selectedSessionId === session.id ? 'opacity-100' : 'opacity-0'}`}
                                  />
                                </span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedSession && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{selectedSession.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(selectedSession.start_time)}
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit shrink-0 border-green-200 bg-green-50 text-green-700">
                      Webinar
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={fetchSessions}
              disabled={loading}
              title="Refresh sessions"
              className="shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {selectedSessionId ? (
        <AttendanceManagement
          sessionId={selectedSessionId}
          isAdmin={isAdmin}
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            Please select a session to manage attendance
          </CardContent>
        </Card>
      )}
    </div>
  );
}

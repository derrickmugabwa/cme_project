"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Loader2, RefreshCw } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();
  
  useEffect(() => {
    checkUserRole();
    fetchSessions();
  }, []);
  
  async function checkUserRole() {
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
  }
  
  async function fetchSessions() {
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
        setSelectedSessionId(data[0].id);
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
  }
  
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return (
    <div className="space-y-6">
      <Toaster />
      
      <Card>
        <CardHeader>
          <CardTitle>Select Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-full max-w-md">
              <Select
                value={selectedSessionId || ''}
                onValueChange={(value) => setSelectedSessionId(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.title} - {formatDate(session.start_time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={fetchSessions}
              disabled={loading}
              title="Refresh sessions"
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

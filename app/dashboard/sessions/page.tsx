"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { format } from 'date-fns';

interface Session {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  is_online: boolean;
  teams_join_url: string;
  teams_error: string;
  created_by: string;
}

type FilterType = 'all' | 'upcoming' | 'active' | 'past';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Apply filters to sessions based on the active filter
  useEffect(() => {
    if (!sessions.length) return;
    
    const now = new Date();
    
    let filtered = [...sessions];
    if (activeFilter === 'upcoming') {
      filtered = sessions.filter(session => {
        const startTime = new Date(session.start_time);
        return startTime > now;
      });
    } else if (activeFilter === 'active') {
      filtered = sessions.filter(session => {
        const startTime = new Date(session.start_time);
        const endTime = new Date(session.end_time);
        return startTime <= now && endTime >= now;
      });
    } else if (activeFilter === 'past') {
      filtered = sessions.filter(session => {
        const endTime = new Date(session.end_time);
        return endTime < now;
      });
    }
    
    setFilteredSessions(filtered);
  }, [sessions, activeFilter]);
  
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      setLoading(true);
      
      try {
        // Fetch user profile to get role
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
            
          if (profileData) {
            setUserRole(profileData.role);
          }
        }
        
        // Fetch sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .order('start_time', { ascending: true });
        
        if (sessionsError) {
          throw sessionsError;
        }
        
        setSessions(sessionsData || []);
        setFilteredSessions(sessionsData || []);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  // Function to determine status badge based on date and teams URL status
  const getSessionStatus = (session: Session) => {
    const now = new Date();
    const startTime = new Date(session.start_time);
    const endTime = new Date(session.end_time);
    
    if (session.teams_error) {
      return { 
        label: 'Error', 
        style: 'border-transparent bg-red-100 text-red-800 hover:bg-red-200'
      };
    }
    
    if (now < startTime) {
      return { 
        label: 'Upcoming', 
        style: 'border-transparent bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
      };
    } else if (now >= startTime && now <= endTime) {
      return { 
        label: 'In Progress', 
        style: 'border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
      };
    } else {
      return { 
        label: 'Completed', 
        style: 'border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200'
      };
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Webinars</h1>
        {userRole && userRole !== 'user' && (
          <Button onClick={() => router.push('/dashboard/sessions/create')}>
            Create New Webinar
          </Button>
        )}
      </div>
      
      <div className="flex items-center space-x-2 mb-6">
        <Button
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('all')}
          className="rounded-full"
        >
          All
        </Button>
        <Button
          variant={activeFilter === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('upcoming')}
          className="rounded-full"
        >
          Upcoming
        </Button>
        <Button
          variant={activeFilter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('active')}
          className="rounded-full"
        >
          Current
        </Button>
        <Button
          variant={activeFilter === 'past' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('past')}
          className="rounded-full"
        >
          Past
        </Button>
      </div>
      
      {error && (
        <Alert className="bg-red-50 border-red-200 mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {loading ? (
        <LoadingPage />
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p>No webinars found. Create your first Webinar to get started.</p>
          </CardContent>
        </Card>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p>No {activeFilter} webinars found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span>Webinar Title</span>
                    </div>
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Attendees</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredSessions.map((session) => {
                  const status = getSessionStatus(session);
                  return (
                    <tr 
                      key={session.id} 
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <td className="p-4 align-middle">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded border-gray-300" />
                          <span className="font-medium">{session.title}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex flex-col">
                          <span>{formatDate(session.start_time)}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        {session.is_online ? (
                          <Badge className="border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200">
                            Online
                          </Badge>
                        ) : (
                          <Badge className="border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200">
                            In-person
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        {/* Placeholder for attendee count - would need to be added to your data model */}
                        <span>-</span>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge className={status.style}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/sessions/${session.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">View details</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/sessions/${session.id}/edit`)}
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Edit</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">More options</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

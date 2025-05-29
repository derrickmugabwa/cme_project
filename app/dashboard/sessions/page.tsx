"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchSessions() {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .order('start_time', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        setSessions(data || []);
      } catch (error: any) {
        console.error('Error fetching sessions:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSessions();
  }, []);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Button onClick={() => router.push('/dashboard/sessions/create')}>
          Create New Session
        </Button>
      </div>
      
      {error && (
        <Alert className="bg-red-50 border-red-200 mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {loading ? (
        <p>Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p>No sessions found. Create your first session to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{session.title}</CardTitle>
                  <div className="flex space-x-2">
                    {session.is_online && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Online
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Start:</span> {formatDate(session.start_time)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">End:</span> {formatDate(session.end_time)}
                  </div>
                  
                  {session.description && (
                    <div className="text-sm mt-2">
                      <p>{session.description}</p>
                    </div>
                  )}
                  
                  {session.is_online ? (
                    <div className="mt-4">
                      {session.teams_join_url ? (
                        <div>
                          <p className="text-sm font-medium mb-1">Teams Meeting:</p>
                          <a 
                            href={session.teams_join_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Join Teams Meeting
                          </a>
                        </div>
                      ) : session.teams_error ? (
                        <Alert className="bg-red-50 border-red-200 mt-2">
                          <AlertDescription className="text-sm">
                            Error creating Teams meeting: {session.teams_error}
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <p className="text-sm text-yellow-600">Teams meeting is being created...</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm mt-2">
                      <span className="font-medium">Location:</span> {session.location || 'No location specified'}
                    </div>
                  )}
                  
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/dashboard/sessions/${session.id}`)}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/dashboard/sessions/${session.id}/edit`)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

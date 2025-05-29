"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  teams_meeting_id: string;
  teams_calendar_event_id: string;
  teams_recording_url: string;
  teams_error: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Attendance {
  id: string;
  student_id: string;
  student: {
    full_name: string;
    email: string;
  };
  teams_verified: boolean;
  teams_join_time: string;
  teams_leave_time: string;
  teams_duration_minutes: number;
  verification_method: string;
}

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  useEffect(() => {
    async function fetchSessionDetails() {
      try {
        // Fetch session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (sessionError) {
          throw sessionError;
        }
        
        setSession(sessionData);
        
        // Fetch attendance for this session
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*, student:profiles(full_name, email)')
          .eq('session_id', params.id);
        
        if (attendanceError) {
          console.error('Error fetching attendance:', attendanceError);
        } else {
          setAttendance(attendanceData || []);
        }
      } catch (error: any) {
        console.error('Error fetching session details:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSessionDetails();
  }, [params.id]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  // Handle session deletion
  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    try {
      setDeleting(true);
      
      const response = await fetch(`/api/sessions/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete session');
      }
      
      router.push('/dashboard/sessions');
    } catch (error: any) {
      console.error('Error deleting session:', error);
      setError(error.message);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };
  
  if (loading) {
    return <p>Loading session details...</p>;
  }
  
  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200 mb-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!session) {
    return <p>Session not found</p>;
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/sessions/${params.id}/edit`)}
          >
            Edit Session
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleteConfirm ? 'Confirm Delete' : deleting ? 'Deleting...' : 'Delete Session'}
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Session Details</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Start Time</h3>
              <p>{formatDate(session.start_time)}</p>
            </div>
            
            <div>
              <h3 className="font-medium">End Time</h3>
              <p>{formatDate(session.end_time)}</p>
            </div>
            
            <div>
              <h3 className="font-medium">Session Type</h3>
              <div className="flex items-center mt-1">
                {session.is_online ? (
                  <Badge className="bg-blue-100 text-blue-800">Online (Teams)</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">In-Person</Badge>
                )}
              </div>
            </div>
            
            {!session.is_online && (
              <div>
                <h3 className="font-medium">Location</h3>
                <p>{session.location || 'No location specified'}</p>
              </div>
            )}
            
            {session.description && (
              <div className="col-span-2">
                <h3 className="font-medium">Description</h3>
                <p>{session.description}</p>
              </div>
            )}
          </div>
          
          {session.is_online && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Microsoft Teams Meeting</h3>
              
              {session.teams_join_url ? (
                <div className="space-y-2">
                  <div>
                    <a 
                      href={session.teams_join_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Join Teams Meeting
                    </a>
                  </div>
                  
                  {session.teams_recording_url && (
                    <div>
                      <h4 className="font-medium text-sm">Recording</h4>
                      <a 
                        href={session.teams_recording_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Recording
                      </a>
                    </div>
                  )}
                </div>
              ) : session.teams_error ? (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTitle>Teams Meeting Error</AlertTitle>
                  <AlertDescription>{session.teams_error}</AlertDescription>
                </Alert>
              ) : (
                <p>Teams meeting is being created...</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {attendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Attendance</CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Student</th>
                    <th className="text-left py-2 px-4">Email</th>
                    <th className="text-left py-2 px-4">Verification</th>
                    {session.is_online && (
                      <>
                        <th className="text-left py-2 px-4">Join Time</th>
                        <th className="text-left py-2 px-4">Leave Time</th>
                        <th className="text-left py-2 px-4">Duration</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{record.student?.full_name || 'Unknown'}</td>
                      <td className="py-2 px-4">{record.student?.email || 'Unknown'}</td>
                      <td className="py-2 px-4">
                        {record.verification_method === 'teams' ? (
                          <Badge className={record.teams_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {record.teams_verified ? 'Teams Verified' : 'Teams Pending'}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">
                            {record.verification_method || 'Manual'}
                          </Badge>
                        )}
                      </td>
                      {session.is_online && (
                        <>
                          <td className="py-2 px-4">
                            {record.teams_join_time ? formatDate(record.teams_join_time) : 'N/A'}
                          </td>
                          <td className="py-2 px-4">
                            {record.teams_leave_time ? formatDate(record.teams_leave_time) : 'N/A'}
                          </td>
                          <td className="py-2 px-4">
                            {record.teams_duration_minutes ? `${record.teams_duration_minutes} min` : 'N/A'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

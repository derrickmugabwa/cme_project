"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EnrollButton from '@/components/units/EnrollButton';
import { LoadingPage, LoadingSpinner } from '@/components/ui/loading-spinner';
import { SessionCertificate } from '@/components/certificates/session-certificate';
import SessionMediaViewer from '@/components/sessions/SessionMediaViewer';
import { PlayCircle } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  topic: string;
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
  attendeeCount?: number;
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

interface Enrollee {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

// Client component that receives the sessionId as a prop
export default function WebinarDetailClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [enrollees, setEnrollees] = useState<Enrollee[]>([]);
  const [creatorName, setCreatorName] = useState<string>('Unknown');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [enrolleesLoading, setEnrolleesLoading] = useState(true);
  const [authSession, setAuthSession] = useState<any>(null);
  
  // Function to fetch enrollment status
  const fetchEnrollmentStatus = async () => {
    try {
      setEnrollmentLoading(true);
      const response = await fetch(`/api/sessions/${sessionId}/enrollment-status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch enrollment status');
      }
      
      const data = await response.json();
      setIsEnrolled(data.enrolled);
    } catch (error) {
      console.error('Error fetching enrollment status:', error);
      setIsEnrolled(false);
    } finally {
      setEnrollmentLoading(false);
    }
  };
  
  useEffect(() => {
    async function fetchWebinarDetails() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Get current user session
        const { data: { session: authSessionData } } = await supabase.auth.getSession();
        
        // Store auth session in state
        setAuthSession(authSessionData);
        
        if (authSessionData) {
          // Get current user's role
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authSessionData.user.id)
            .single();
            
          if (!userError && userData) {
            setCurrentUserRole(userData.role);
          }
        }
        
        // Fetch webinar details using Supabase client
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        
        if (sessionError) {
          throw sessionError;
        }
        
        setSession(sessionData);
        
        // Fetch creator's profile information if creator ID exists
        if (sessionData && sessionData.created_by) {
          const { data: creatorData, error: creatorError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', sessionData.created_by)
            .single();
            
          if (!creatorError && creatorData) {
            setCreatorName(creatorData.full_name);
          }
        }
        
        // Fetch attendance records if needed in the future
        // For now, we'll just set an empty array
        setAttendance([]);
        
        // Fetch enrollees (users who have enrolled in this session)
        try {
          setEnrolleesLoading(true);
          // Fetch enrollments with user data
          const { data: enrolleesData, error: enrolleesError } = await supabase
            .from('session_enrollments')
            .select('id, user_id, session_id, created_at')
            .eq('session_id', sessionId);
            
          // If we have enrollments, fetch the user profiles separately
          let userProfiles: Record<string, { id: string, full_name: string, email: string }> = {};
          
          if (enrolleesData && enrolleesData.length > 0) {
            const userIds = enrolleesData.map(e => e.user_id).filter(Boolean);
            
            if (userIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);
                
              if (profiles) {
                // Create a map of user_id to profile data for quick lookup
                userProfiles = profiles.reduce((acc, profile) => {
                  acc[profile.id] = {
                    id: profile.id,
                    full_name: profile.full_name || 'Unknown',
                    email: profile.email || ''
                  };
                  return acc;
                }, {} as Record<string, { id: string, full_name: string, email: string }>);
              }
            }
          }
          
          if (enrolleesError) {
            console.error('Error fetching enrollees:', enrolleesError);
          } else {
            // Map enrollment data with user profile data
            if (enrolleesData) {
              const typedEnrollees = enrolleesData.map(item => {
                const userProfile = userProfiles[item.user_id] || {
                  id: item.user_id || '',
                  full_name: 'Unknown User',
                  email: ''
                };
                
                return {
                  id: item.id,
                  user_id: item.user_id,
                  session_id: item.session_id,
                  created_at: item.created_at,
                  user: userProfile
                };
              });
              
              setEnrollees(typedEnrollees);
            } else {
              setEnrollees([]);
            }
            // Update session with attendee count
            if (sessionData) {
              sessionData.attendeeCount = enrolleesData?.length || 0;
            }
          }
        } catch (enrolleesError) {
          console.error('Error fetching enrollees:', enrolleesError);
        } finally {
          setEnrolleesLoading(false);
        }
      } catch (error: any) {
        console.error('Error fetching webinar details:', error);
        setError(error.message || 'An error occurred while fetching webinar details');
      } finally {
        setLoading(false);
      }
    }
    
    fetchWebinarDetails();
    fetchEnrollmentStatus();
  }, [sessionId]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  // Open the join meeting confirmation dialog
  const openJoinDialog = () => {
    setJoinDialogOpen(true);
  };

  // Handle joining the meeting (attendance recording disabled)
  const handleJoinMeeting = () => {
    // Close the dialog
    setJoinDialogOpen(false);
    
    // Open meeting URL directly without recording attendance
    if (session && session.teams_join_url) {
      window.open(session.teams_join_url, '_blank');
      
      // Show informational message
      toast({
        title: 'Meeting Opened',
        description: 'Attendance is now only recorded via Teams attendance reports',
        variant: 'default',
      });
    } else {
      toast({
        title: 'Error',
        description: 'No meeting URL available for this session',
        variant: 'destructive',
      });
    }
  };

  // Handle webinar deletion
  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    try {
      setDeleting(true);
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete webinar');
      }
      
      router.push('/dashboard/sessions');
    } catch (error: any) {
      console.error('Error deleting webinar:', error);
      setError(error.message);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };
  
  if (loading) {
    return <LoadingPage />;
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="bg-red-50 border-red-200 mb-4">
          <AlertTitle className="text-lg font-semibold">Unable to Load Webinar</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/sessions')}
            className="mr-2"
          >
            Back to Webinars
          </Button>
          <Button
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  if (!session) {
    return <p className="text-center py-8">Webinar not found</p>;
  }
  
  return (
    <div className="container mx-auto py-6">
      <Toaster />
      
      {/* Join Meeting Confirmation Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Attendance</DialogTitle>
            <DialogDescription>
              By joining this meeting, your attendance will be recorded and will require approval from an administrator or faculty member.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-500">
              Once you click "Join Meeting", the system will:
            </p>
            <ul className="list-disc pl-5 mt-2 text-sm text-gray-500 space-y-1">
              <li>Open the meeting link in a new tab</li>
            </ul>
            {/* <p className="text-sm text-gray-500 mt-3 font-medium">
              <span className="text-amber-600">Note:</span> Attendance is now only recorded through Teams attendance reports uploaded by the instructor.
            </p> */}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleJoinMeeting}>Join Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/sessions')}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Webinar Details</h1>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="flex items-center space-x-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            <span>Print</span>
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/sessions/${sessionId}/edit`)}
            className="flex items-center space-x-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <span>Edit</span>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left Column - Webinar Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">
              Webinar {session.id.substring(0, 8).toUpperCase()}
            </CardTitle>
            <p className="text-sm text-gray-500">
              Created on {format(new Date(session.created_at), 'yyyy-MM-dd')}
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="border-t pt-4 mt-2">
              <h3 className="font-medium text-lg mb-2">{session?.title}</h3>
              
              {session?.topic && (
                <div className="mb-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {session.topic}
                  </Badge>
                </div>
              )}
              
              {session?.description && (
                <p className="text-gray-700 mb-4">{session.description}</p>
              )}
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Date & Time</h4>
                  <p>{formatDate(session?.start_time || '')}</p>
                  <p className="text-sm text-gray-500">
                    to {format(new Date(session?.end_time || Date.now()), 'h:mm a')}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Location</h4>
                  {session?.is_online ? (
                    <div>
                      <Badge className="bg-blue-100 text-blue-800">Online Meeting</Badge>
                    </div>
                  ) : (
                    <p>{session?.location || 'No location specified'}</p>
                  )}
                </div>
                
                {session?.is_online && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Meeting Link</h4>
                    {session?.teams_join_url ? (
                      <div>
                        {enrollmentLoading ? (
                          <Button 
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            disabled
                          >
                            <LoadingSpinner size="xs" className="mr-1" />
                            Loading
                          </Button>
                        ) : isEnrolled ? (
                          <Button 
                            onClick={openJoinDialog}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Join Meeting
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                              disabled
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                              Join Meeting
                            </Button>
                            <p className="text-xs text-amber-600">Enrollment required to join</p>
                          </div>
                        )}
                      </div>
                    ) : session.teams_error ? (
                      <p className="text-red-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {session.teams_error}
                      </p>
                    ) : (
                      <p className="text-yellow-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Teams meeting is being created...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Right Column - Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Webinar Summary</CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span>Duration</span>
                <span className="font-medium">
                  {Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60))} minutes
                </span>
              </div>
              
              {/* Enrollment section */}
              <div className="py-4 border-b">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Enrollment</h3>
                <EnrollButton sessionId={sessionId} />
              </div>
              
              {/* Certificate section - only shown if user is authenticated */}
              {authSession?.user && (
                <SessionCertificate sessionId={sessionId} userId={authSession.user.id} />
              )}
              
              <div className="flex justify-between py-2 border-b">
                <span>Type</span>
                <span className="font-medium">
                  {session.is_online ? 'Online Meeting' : 'In-Person'}
                </span>
              </div>
              
              <div className="flex justify-between py-2 border-b">
                <span>Created By</span>
                <span className="font-medium">
                  {creatorName}
                </span>
              </div>
              
              <div className="flex justify-between py-2">
                <span>Attendees</span>
                <span className="font-medium">
                  {enrolleesLoading ? 'Loading...' : (session?.attendeeCount || enrollees.length)} enrolled
                </span>
              </div>
              
              {currentUserRole && currentUserRole !== 'user' && (
                <div className="mt-6 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full"
                  >
                    {deleteConfirm ? 'Confirm Delete' : deleting ? 'Deleting...' : 'Delete Webinar'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Attendees Section - Only visible to admins and faculty */}
      {currentUserRole && (currentUserRole === 'admin' || currentUserRole === 'faculty') && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Enrolled Attendees</CardTitle>
            <Badge variant="outline" className="ml-2">
              {enrolleesLoading ? 
                <span className="flex items-center">
                  <LoadingSpinner size="xs" className="mr-1" />
                  Loading...
                </span> : 
                `${enrollees.length} enrolled`
              }
            </Badge>
          </CardHeader>
          
          <CardContent>
            {enrolleesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : enrollees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No attendees have enrolled for this webinar yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium text-gray-500">Name</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-500">Email</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-500">Enrolled On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollees.map((enrollee) => (
                      <tr key={enrollee.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{enrollee.user.full_name}</td>
                        <td className="py-3 px-4">{enrollee.user.email || 'No email'}</td>
                        <td className="py-3 px-4">{format(new Date(enrollee.created_at), 'MMM d, yyyy h:mm a')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Session Media Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Session Media
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SessionMediaViewer 
            sessionId={sessionId}
            canEdit={currentUserRole === 'admin' || (session && session.created_by === authSession?.user?.id)}
            userRole={currentUserRole || undefined}
          />
        </CardContent>
      </Card>

      {/* Status Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-xl">Webinar Status</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="relative">
            <div className="flex justify-between mb-2">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm mt-1">Created</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm mt-1">Scheduled</span>
              </div>
              
              <div className="flex flex-col items-center">
                {session && new Date() >= new Date(session.start_time) && new Date() <= new Date(session.end_time) ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm mt-1">In Progress</span>
                  </>
                ) : new Date() > new Date(session.end_time) ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm mt-1">Completed</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm mt-1">Pending</span>
                  </>
                )}
              </div>
              
              <div className="flex flex-col items-center">
                {session && new Date() > new Date(session.end_time) ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm mt-1">Delivered</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm mt-1">Pending</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ 
                  width: new Date() > new Date(session?.end_time || Date.now()) 
                    ? '100%' 
                    : new Date() < new Date(session?.start_time || Date.now()) 
                      ? '50%' 
                      : '75%' 
                }}
              ></div>
            </div>
            
            <div className="mt-4 p-2 border rounded-md bg-gray-50">
              <p className="text-sm">
                {new Date() > new Date(session.end_time) 
                  ? `Webinar completed on ${format(new Date(session.end_time), 'MMMM d, yyyy')}` 
                  : new Date() >= new Date(session.start_time) && new Date() <= new Date(session.end_time)
                    ? 'Webinar is currently in progress' 
                    : `Webinar scheduled for ${format(new Date(session.start_time), 'MMMM d, yyyy')}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Attendance section - hidden for now as requested */}
      {false && attendance.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl">Attendance</CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Student</th>
                    <th className="py-3 px-4 text-left font-medium">Email</th>
                    {session?.is_online && (
                      <>
                        <th className="py-3 px-4 text-left font-medium">Teams Verified</th>
                        <th className="py-3 px-4 text-left font-medium">Join Time</th>
                        <th className="py-3 px-4 text-left font-medium">Leave Time</th>
                        <th className="py-3 px-4 text-left font-medium">Duration</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendance.map((record) => (
                    <tr key={record.id}>
                      <td className="py-2 px-4">{record.student?.full_name || 'Unknown'}</td>
                      <td className="py-2 px-4">{record.student?.email || 'Unknown'}</td>
                      {session?.is_online && (
                        <>
                          <td className="py-2 px-4">
                            {record.teams_verified ? (
                              <Badge className="bg-green-100 text-green-800">Verified</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                            )}
                          </td>
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

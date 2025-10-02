"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { format } from 'date-fns';
import { Trash2, ChevronLeft, ChevronRight, Archive, Info } from 'lucide-react';

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
  isEnrolled?: boolean;
  attendeeCount?: number;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginatedSessions, setPaginatedSessions] = useState<Session[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  
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
    // Reset to first page when filter changes
    setCurrentPage(1);
  }, [sessions, activeFilter]);
  
  // Apply pagination to filtered sessions
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filteredSessions.slice(startIndex, endIndex);
    
    setPaginatedSessions(paginated);
    setTotalPages(Math.ceil(filteredSessions.length / pageSize));
  }, [filteredSessions, currentPage, pageSize]);
  
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      setLoading(true);
      
      try {
        // Fetch user profile to get role
        const { data: { session } } = await supabase.auth.getSession();
        let userId = null;
        
        if (session) {
          userId = session.user.id;
          setCurrentUserId(userId);
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
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
        
        // Fetch attendee counts for each session
        if (sessionsData && sessionsData.length > 0) {
          const sessionIds = sessionsData.map(session => session.id);
          
          // Fetch all enrollments for these sessions
          const { data: enrollmentsData, error: enrollmentsCountError } = await supabase
            .from('session_enrollments')
            .select('session_id')
            .in('session_id', sessionIds);
            
          if (enrollmentsCountError) {
            console.error('Error fetching enrollment counts:', enrollmentsCountError);
          } else {
            // Count enrollments for each session
            const countMap: Record<string, number> = {};
            
            // Initialize all sessions with 0 count
            sessionIds.forEach(id => {
              countMap[id] = 0;
            });
            
            // Count enrollments for each session
            if (enrollmentsData) {
              enrollmentsData.forEach(enrollment => {
                if (enrollment.session_id) {
                  countMap[enrollment.session_id] = (countMap[enrollment.session_id] || 0) + 1;
                }
              });
            }
            
            // Add attendee counts to sessions
            sessionsData.forEach(session => {
              session.attendeeCount = countMap[session.id] || 0;
            });
          }
        }
        
        // If user is logged in, fetch their enrollments
        if (userId && sessionsData && sessionsData.length > 0) {
          const sessionIds = sessionsData.map(session => session.id);
          
          // Query the session_enrollments table
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from('session_enrollments')
            .select('session_id')
            .eq('user_id', userId)
            .in('session_id', sessionIds);
            
          if (enrollmentsError) {
            console.error('Error fetching enrollments:', enrollmentsError);
          } else {
            // Create a set of enrolled session IDs for quick lookup
            const enrolledSessionIds = new Set(enrollmentsData?.map(e => e.session_id) || []);
            
            // Add enrollment status to each session
            const sessionsWithEnrollment = sessionsData.map(session => ({
              ...session,
              isEnrolled: enrolledSessionIds.has(session.id)
            }));
            
            setSessions(sessionsWithEnrollment);
            setFilteredSessions(sessionsWithEnrollment);
            return;
          }
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

  // Function to handle delete confirmation
  const handleDeleteClick = (session: Session) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  // Function to delete a session
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/sessions/${sessionToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete session');
      }

      // Remove the session from the local state
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
      
      toast({
        title: "Session Deleted",
        description: "The session has been successfully deleted.",
      });

      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete session. Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Function to check if user can delete a session
  const canDeleteSession = (session: Session) => {
    // Admin and faculty can delete any session
    if (userRole === 'admin' || userRole === 'faculty') {
      return true;
    }
    // Users can only delete their own sessions
    return session.created_by === currentUserId;
  };
  
  // Pagination functions
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1); // Reset to first page when page size changes
  };
  
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
    <div className="container mx-auto py-4 px-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Webinars</h1>
        {userRole && userRole !== 'user' && (
          <Button 
            onClick={() => router.push('/dashboard/sessions/create')}
            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
          >
            Create New Webinar
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Button
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('all')}
          className={`rounded-full flex-1 sm:flex-none ${
            activeFilter === 'all' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'border-green-600 text-green-600 hover:bg-green-50'
          }`}
        >
          All
        </Button>
        <Button
          variant={activeFilter === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('upcoming')}
          className={`rounded-full flex-1 sm:flex-none ${
            activeFilter === 'upcoming' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'border-green-600 text-green-600 hover:bg-green-50'
          }`}
        >
          Upcoming
        </Button>
        <Button
          variant={activeFilter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('active')}
          className={`rounded-full flex-1 sm:flex-none ${
            activeFilter === 'active' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'border-green-600 text-green-600 hover:bg-green-50'
          }`}
        >
          Current
        </Button>
        <Button
          variant={activeFilter === 'past' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('past')}
          className={`rounded-full flex-1 sm:flex-none ${
            activeFilter === 'past' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'border-green-600 text-green-600 hover:bg-green-50'
          }`}
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
        <>
          {/* Results summary and page size selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSessions.length)} of {filteredSessions.length} sessions
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20 border-green-200 focus:ring-green-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        {/* Mobile Card View */}
        <div className="block md:hidden space-y-4">
          {paginatedSessions.map((session) => {
            const status = getSessionStatus(session);
            return (
              <Card key={session.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-lg">{session.title}</h3>
                    <Badge className={status.style}>
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{formatDate(session.start_time)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      {session.is_online ? (
                        <Badge className="border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200">
                          Online
                        </Badge>
                      ) : (
                        <Badge className="border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200">
                          In-person
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attendees:</span>
                      <span className="font-medium">{session.attendeeCount || 0}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Enrollment:</span>
                      {session.isEnrolled ? (
                        <Badge className="border-transparent bg-green-100 text-green-800 hover:bg-green-200">
                          Enrolled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Not Enrolled
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/dashboard/sessions/${session.id}`)}
                      className="h-8 w-8 p-0"
                    >
                      <span className="sr-only">View details</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </Button>
                    {userRole && userRole !== 'user' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/sessions/${session.id}/edit`)}
                        className="h-8 w-8 p-0"
                      >
                        <span className="sr-only">Edit</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                      </Button>
                    )}
                    {canDeleteSession(session) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteClick(session)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <span className="sr-only">Delete session</span>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block rounded-md border">
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
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Enrollment</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {paginatedSessions.map((session) => {
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
                        <span className="font-medium">{session.attendeeCount || 0}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge className={status.style}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">
                        {session.isEnrolled ? (
                          <Badge className="border-transparent bg-green-100 text-green-800 hover:bg-green-200">
                            Enrolled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Not Enrolled
                          </Badge>
                        )}
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
                          {userRole && userRole !== 'user' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/sessions/${session.id}/edit`)}
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Edit</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                            </Button>
                          )}
                          {canDeleteSession(session) && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteClick(session)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <span className="sr-only">Delete session</span>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t gap-4">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-1 border-green-200 text-green-600 hover:bg-green-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      return page === 1 || 
                             page === totalPages || 
                             Math.abs(page - currentPage) <= 1;
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className={`w-8 h-8 p-0 ${
                              currentPage === page 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'border-green-200 text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-1 border-green-200 text-green-600 hover:bg-green-50"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-sm text-gray-600 text-center sm:text-right">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{sessionToDelete?.title}"?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Archive className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Archiving will:</h4>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Hide the session from active session lists</li>
                    <li>Preserve all enrollment and attendance records</li>
                    <li>Maintain all session materials and media</li>
                    <li>Keep unit requirements and credit tracking intact</li>
                    <li>Allow the session to be restored later if needed</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Data Preservation Benefits:</h4>
                  <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                    <li>User certificates and credits remain valid</li>
                    <li>Attendance history is preserved for compliance</li>
                    <li>Session can be unarchived by administrators</li>
                    <li>All related data remains intact for reporting</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 font-medium">
                Archiving is reversible and preserves all important data. This is the recommended approach for session management.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleDeleteSession}
              disabled={deleting}
            >
              {deleting ? 'Archiving...' : 'Archive Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

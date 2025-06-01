"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, MoreVertical, Eye, CheckCircle, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  id: string;
  created_at: string;
  user_id: string;
  session_id: string;
  check_in_time: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  profiles: Profile;
  sessions: Session;
}

export default function AttendanceClient() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('pending_approval');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    checkUserRole();
    fetchAttendanceRecords(currentTab);
  }, [currentTab]);
  
  async function checkUserRole() {
    try {
      const supabase = createClient();
      
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
  
  async function fetchAttendanceRecords(status: string) {
    try {
      setLoading(true);
      setError(null); // Reset any previous errors
      
      console.log(`Fetching attendance records with status: ${status}`);
      
      // Use the Supabase client directly instead of the API endpoint
      const supabase = createClient();
      
      // Fetch attendance records directly from Supabase
      console.log('Executing Supabase query for status:', status);
      
      // First, get the attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('session_attendance')
        .select(`
          id,
          created_at,
          user_id,
          session_id,
          check_in_time,
          status,
          approved_by,
          approved_at,
          notes
        `)
        .eq('status', status);
        
      if (attendanceError) {
        console.error('Supabase error fetching attendance:', attendanceError);
        throw new Error(attendanceError.message || 'Failed to fetch attendance records');
      }
      
      console.log(`Retrieved ${attendanceData?.length || 0} attendance records`);
      
      // Then, for each record, fetch the associated profile and session data
      const enhancedData = await Promise.all((attendanceData || []).map(async (record) => {
        // Get profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', record.user_id)
          .single();
          
        if (profileError) {
          console.warn('Error fetching profile for user_id:', record.user_id, profileError);
        }
        
        // Get session data
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id, title, start_time, end_time')
          .eq('id', record.session_id)
          .single();
          
        if (sessionError) {
          console.warn('Error fetching session for session_id:', record.session_id, sessionError);
        }
        
        // Return a properly formatted record with profile and session data
        return {
          id: record.id,
          created_at: record.created_at,
          user_id: record.user_id,
          session_id: record.session_id,
          check_in_time: record.check_in_time,
          status: record.status,
          approved_by: record.approved_by,
          approved_at: record.approved_at,
          notes: record.notes,
          profiles: profileData || { id: record.user_id, full_name: 'Unknown', email: '' },
          sessions: sessionData || { id: record.session_id, title: 'Unknown Session', start_time: '', end_time: '' }
        } as AttendanceRecord;
      }));
      
      console.log(`Enhanced ${enhancedData.length} attendance records with profile and session data`);
      setAttendanceRecords(enhancedData);
      setSelectedRecords([]);
    } catch (error: any) {
      console.error('Error fetching attendance records:', error);
      setError(error.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }
  
  function formatDate(dateString: string) {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  }
  
  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedRecords(attendanceRecords.map(record => record.id));
    } else {
      setSelectedRecords([]);
    }
  }
  
  function handleSelectRecord(id: string) {
    if (selectedRecords.includes(id)) {
      setSelectedRecords(selectedRecords.filter(recordId => recordId !== id));
    } else {
      setSelectedRecords([...selectedRecords, id]);
    }
  }
  
  async function handleApproveSelected() {
    try {
      if (selectedRecords.length === 0) return;
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to approve attendance records',
          variant: 'destructive',
        });
        return;
      }
      
      setLoading(true);
      
      // Update each selected record
      const updatePromises = selectedRecords.map(async (recordId) => {
        const { error } = await supabase
          .from('session_attendance')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', recordId);
          
        if (error) {
          console.error(`Error approving record ${recordId}:`, error);
          throw new Error(error.message);
        }
      });
      
      await Promise.all(updatePromises);
      
      toast({
        title: 'Success',
        description: `${selectedRecords.length} attendance record(s) approved successfully`,
      });
      
      // Refresh the list
      fetchAttendanceRecords(currentTab);
    } catch (error: any) {
      console.error('Error approving records:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve attendance records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
  function handleRejectClick(recordId: string) {
    setCurrentRecordId(recordId);
    setRejectionNotes('');
    setNotesDialogOpen(true);
  }
  
  async function handleRejectConfirm() {
    try {
      if (!currentRecordId) return;
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to reject attendance records',
          variant: 'destructive',
        });
        return;
      }
      
      setLoading(true);
      setNotesDialogOpen(false);
      
      const { error } = await supabase
        .from('session_attendance')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          notes: rejectionNotes,
        })
        .eq('id', currentRecordId);
        
      if (error) {
        throw new Error(error.message);
      }
      
      toast({
        title: 'Success',
        description: 'Attendance record rejected successfully',
      });
      
      // Refresh the list
      fetchAttendanceRecords(currentTab);
    } catch (error: any) {
      console.error('Error rejecting record:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject attendance record',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setCurrentRecordId(null);
    }
  }
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]"></div>
        <span className="ml-2">Checking permissions...</span>
      </div>
    );
  }
  
  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]"></div>
        <span className="ml-2">Loading attendance records...</span>
      </div>
    );
  }
  
  // Filter records based on search term
  const filteredRecords = searchTerm
    ? attendanceRecords.filter(record => 
        record.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.sessions.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : attendanceRecords;
  
  return (
    <div>
      <Toaster />
      
      <Card className="mb-6 border-none shadow-none">
        <CardContent className="p-0">
          <div className="bg-white rounded-lg shadow">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b">
              <div className="flex space-x-1 mb-4 sm:mb-0">
                <Button 
                  variant={currentTab === 'all' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTab('all')}
                  className="rounded-full"
                >
                  All
                </Button>
                <Button 
                  variant={currentTab === 'pending_approval' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTab('pending_approval')}
                  className="rounded-full"
                >
                  Pending
                </Button>
                <Button 
                  variant={currentTab === 'approved' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTab('approved')}
                  className="rounded-full"
                >
                  Completed
                </Button>
                <Button 
                  variant={currentTab === 'rejected' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTab('rejected')}
                  className="rounded-full"
                >
                  Rejected
                </Button>
              </div>
              
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8 w-full sm:w-[250px] h-9 rounded-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-gray-500 border-b">
              <div className="col-span-1">
                <Checkbox 
                  id="select-all"
                  checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRecords(filteredRecords.map(record => record.id));
                    } else {
                      setSelectedRecords([]);
                    }
                  }}
                />
              </div>
              <div className="col-span-3">Webinar Title</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Attendee</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
            
            {/* Table Content */}
            {error ? (
              <div className="p-4 text-center text-red-500">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchAttendanceRecords(currentTab)}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No {currentTab.replace('_', ' ')} attendance records found.</p>
              </div>
            ) : (
              <div>
                {currentTab === 'pending_approval' && selectedRecords.length > 0 && (
                  <div className="flex justify-end p-2 bg-gray-50">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleApproveSelected}
                      className="flex items-center"
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Approve Selected ({selectedRecords.length})
                    </Button>
                  </div>
                )}
                
                {filteredRecords.map((record) => (
                  <div key={record.id} className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50">
                    <div className="col-span-1 flex items-center">
                      <Checkbox 
                        checked={selectedRecords.includes(record.id)}
                        onCheckedChange={() => handleSelectRecord(record.id)}
                      />
                    </div>
                    <div className="col-span-3">
                      <p className="font-medium">{record.sessions.title}</p>
                    </div>
                    <div className="col-span-2">
                      <p>{formatDate(record.sessions.start_time)}</p>
                    </div>
                    <div className="col-span-2">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Online</Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="font-medium">{record.profiles.full_name}</p>
                      <p className="text-xs text-gray-500">{record.profiles.email}</p>
                    </div>
                    <div className="col-span-1">
                      {record.status === 'pending_approval' && (
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
                      )}
                      {record.status === 'approved' && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
                      )}
                      {record.status === 'rejected' && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
                      )}
                    </div>
                    <div className="col-span-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.location.href = `/dashboard/sessions/${record.session_id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Webinar
                          </DropdownMenuItem>
                          {record.status === 'pending_approval' && (
                            <>
                              <DropdownMenuItem onClick={() => {
                                const recordIds = [record.id];
                                setSelectedRecords(recordIds);
                                handleApproveSelected();
                              }}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRejectClick(record.id)}>
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this attendance record.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason"
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRejectConfirm}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

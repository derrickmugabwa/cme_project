"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
      const results = await Promise.all(
        selectedRecords.map(async (id) => {
          const response = await fetch('/api/attendance/approve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ attendanceId: id })
          });
          
          return { id, success: response.ok };
        })
      );
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        toast({
          title: 'Attendance Approved',
          description: `Successfully approved ${successCount} attendance record${successCount !== 1 ? 's' : ''}.`,
          variant: 'default',
        });
      }
      
      if (failCount > 0) {
        toast({
          title: 'Approval Failed',
          description: `Failed to approve ${failCount} attendance record${failCount !== 1 ? 's' : ''}.`,
          variant: 'destructive',
        });
      }
      
      // Refresh the list
      fetchAttendanceRecords(currentTab);
    } catch (error: any) {
      console.error('Error approving attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve attendance',
        variant: 'destructive',
      });
    }
  }
  
  function handleRejectClick(id: string) {
    setCurrentRecordId(id);
    setRejectionNotes('');
    setNotesDialogOpen(true);
  }
  
  async function handleRejectConfirm() {
    if (!currentRecordId) return;
    
    try {
      const response = await fetch('/api/attendance/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendanceId: currentRecordId,
          notes: rejectionNotes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject attendance');
      }
      
      toast({
        title: 'Attendance Rejected',
        description: 'Successfully rejected the attendance record.',
        variant: 'default',
      });
      
      setNotesDialogOpen(false);
      setCurrentRecordId(null);
      
      // Refresh the list
      fetchAttendanceRecords(currentTab);
    } catch (error: any) {
      console.error('Error rejecting attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject attendance',
        variant: 'destructive',
      });
    }
  }
  
  if (!isAdmin) {
    return <p className="text-center py-8">Checking permissions...</p>;
  }
  
  if (loading && attendanceRecords.length === 0) {
    return <p className="text-center py-8">Loading attendance records...</p>;
  }
  
  return (
    <div>
      <Toaster />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending_approval" onValueChange={setCurrentTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending_approval">Pending Approval</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending_approval">
              {renderAttendanceTable()}
            </TabsContent>
            
            <TabsContent value="approved">
              {renderAttendanceTable()}
            </TabsContent>
            
            <TabsContent value="rejected">
              {renderAttendanceTable()}
            </TabsContent>
          </Tabs>
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
  
  function renderAttendanceTable() {
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-red-700">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchAttendanceRecords(currentTab)}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      );
    }
    
    if (attendanceRecords.length === 0) {
      return (
        <div className="text-center py-8 border rounded-md bg-gray-50">
          <p className="text-gray-500">No {currentTab.replace('_', ' ')} attendance records found.</p>
        </div>
      );
    }
    
    return (
      <div>
        {currentTab === 'pending_approval' && (
          <div className="flex justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all" 
                checked={selectedRecords.length === attendanceRecords.length && attendanceRecords.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedRecords(attendanceRecords.map(record => record.id));
                  } else {
                    setSelectedRecords([]);
                  }
                }}
              />
              <Label htmlFor="select-all">Select All</Label>
            </div>
            
            <div className="space-x-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleApproveSelected}
                disabled={selectedRecords.length === 0}
              >
                Approve Selected
              </Button>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {currentTab === 'pending_approval' && (
                  <th className="py-2 px-4 text-left font-medium"></th>
                )}
                <th className="py-2 px-4 text-left font-medium">User</th>
                <th className="py-2 px-4 text-left font-medium">Session</th>
                <th className="py-2 px-4 text-left font-medium">Check-in Time</th>
                <th className="py-2 px-4 text-left font-medium">Status</th>
                {(currentTab === 'approved' || currentTab === 'rejected') && (
                  <th className="py-2 px-4 text-left font-medium">Processed By</th>
                )}
                {currentTab === 'rejected' && (
                  <th className="py-2 px-4 text-left font-medium">Reason</th>
                )}
                {currentTab === 'pending_approval' && (
                  <th className="py-2 px-4 text-left font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((record) => (
                <tr key={record.id} className="border-b hover:bg-gray-50">
                  {currentTab === 'pending_approval' && (
                    <td className="py-3 px-4">
                      <Checkbox 
                        checked={selectedRecords.includes(record.id)}
                        onCheckedChange={() => handleSelectRecord(record.id)}
                      />
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{record.profiles.full_name}</p>
                      <p className="text-sm text-gray-500">{record.profiles.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{record.sessions.title}</p>
                      <p className="text-sm text-gray-500">{formatDate(record.sessions.start_time)}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">{formatDate(record.check_in_time)}</td>
                  <td className="py-3 px-4">
                    {record.status === 'pending_approval' && (
                      <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    )}
                    {record.status === 'approved' && (
                      <Badge className="bg-green-100 text-green-800">Approved</Badge>
                    )}
                    {record.status === 'rejected' && (
                      <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                    )}
                  </td>
                  {(currentTab === 'approved' || currentTab === 'rejected') && (
                    <td className="py-3 px-4">
                      {record.approved_at && (
                        <div>
                          <p className="text-sm">{formatDate(record.approved_at)}</p>
                        </div>
                      )}
                    </td>
                  )}
                  {currentTab === 'rejected' && (
                    <td className="py-3 px-4">
                      <p className="text-sm">{record.notes || 'No reason provided'}</p>
                    </td>
                  )}
                  {currentTab === 'pending_approval' && (
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            fetch('/api/attendance/approve', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ attendanceId: record.id })
                            })
                            .then(response => {
                              if (response.ok) {
                                toast({
                                  title: 'Attendance Approved',
                                  description: 'Successfully approved the attendance record.',
                                  variant: 'default',
                                });
                                fetchAttendanceRecords(currentTab);
                              } else {
                                throw new Error('Failed to approve attendance');
                              }
                            })
                            .catch(error => {
                              toast({
                                title: 'Error',
                                description: error.message || 'Failed to approve attendance',
                                variant: 'destructive',
                              });
                            });
                          }}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRejectClick(record.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

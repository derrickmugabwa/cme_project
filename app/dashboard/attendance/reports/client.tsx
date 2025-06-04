"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  session_id: string;
  check_in_time: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    professional_cadre?: string;
    institution?: string;
  }[];
  sessions: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  }[];
}

interface ReportFilters {
  sessionId: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
}

export default function AttendanceReportsClient() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    sessionId: '',
    startDate: null,
    endDate: null,
    status: 'all'
  });
  const [reportType, setReportType] = useState('by-session');
  
  // Stats
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [approvedAttendance, setApprovedAttendance] = useState(0);
  const [pendingAttendance, setPendingAttendance] = useState(0);
  const [rejectedAttendance, setRejectedAttendance] = useState(0);
  
  useEffect(() => {
    checkUserRole();
    fetchSessions();
  }, []);
  
  useEffect(() => {
    if (isAdmin) {
      fetchAttendanceData();
    }
  }, [isAdmin, filters]);
  
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
  
  async function fetchSessions() {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, start_time, end_time')
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      
      setSessions(data || []);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      setError(error.message);
    }
  }
  
  async function fetchAttendanceData() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      let query = supabase
        .from('session_attendance')
        .select(`
          id,
          user_id,
          session_id,
          check_in_time,
          status,
          approved_by,
          approved_at,
          notes,
          profiles:user_id(id, full_name, email, professional_cadre, institution),
          sessions:session_id(id, title, start_time, end_time)
        `);
      
      // Apply filters
      if (filters.sessionId) {
        query = query.eq('session_id', filters.sessionId);
      }
      
      if (filters.startDate) {
        query = query.gte('check_in_time', filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        // Add one day to include the end date fully
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('check_in_time', endDate.toISOString());
      }
      
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setAttendanceRecords(data as unknown as AttendanceRecord[] || []);
      
      // Calculate stats
      setTotalAttendance(data?.length || 0);
      setApprovedAttendance(data?.filter(record => record.status === 'approved').length || 0);
      setPendingAttendance(data?.filter(record => record.status === 'pending_approval').length || 0);
      setRejectedAttendance(data?.filter(record => record.status === 'rejected').length || 0);
    } catch (error: any) {
      console.error('Error fetching attendance data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }
  
  function formatDate(dateString: string) {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  }
  
  function formatTime(dateString: string) {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch (error) {
      return dateString;
    }
  }
  
  function handleExportCSV() {
    try {
      if (attendanceRecords.length === 0) {
        toast({
          title: 'No Data',
          description: 'There are no records to export',
          variant: 'destructive',
        });
        return;
      }
      
      // Create CSV content
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Headers
      const headers = [
        'Webinar Title',
        'Webinar Date',
        'Attendee Name',
        'Email',
        'Professional Cadre',
        'Institution',
        'Check-in Time',
        'Status',
        'Processed Date',
        'Notes'
      ];
      
      csvContent += headers.join(',') + '\n';
      
      // Data rows
      attendanceRecords.forEach(record => {
        const row = [
          `"${record.sessions[0]?.title || ''}"`,
          formatDate(record.sessions[0]?.start_time || ''),
          `"${record.profiles[0]?.full_name || ''}"`,
          `"${record.profiles[0]?.email || ''}"`,
          `"${record.profiles[0]?.professional_cadre || ''}"`,
          `"${record.profiles[0]?.institution || ''}"`,
          `${formatDate(record.check_in_time)} ${formatTime(record.check_in_time)}`,
          record.status,
          record.approved_at ? `${formatDate(record.approved_at)}` : '',
          `"${record.notes || ''}"`
        ];
        
        csvContent += row.join(',') + '\n';
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      
      // Download the CSV file
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Export Successful',
        description: `Exported ${attendanceRecords.length} records to CSV`,
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export data',
        variant: 'destructive',
      });
    }
  }
  
  if (!isAdmin) {
    return <p className="text-center py-8">Checking permissions...</p>;
  }
  
  return (
    <div>
      <Toaster />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttendance}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedAttendance}</div>
            <div className="text-xs text-gray-500">
              {totalAttendance > 0 ? Math.round((approvedAttendance / totalAttendance) * 100) : 0}% of total
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingAttendance}</div>
            <div className="text-xs text-gray-500">
              {totalAttendance > 0 ? Math.round((pendingAttendance / totalAttendance) * 100) : 0}% of total
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedAttendance}</div>
            <div className="text-xs text-gray-500">
              {totalAttendance > 0 ? Math.round((rejectedAttendance / totalAttendance) * 100) : 0}% of total
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="by-session" onValueChange={setReportType}>
            <TabsList className="mb-4">
              <TabsTrigger value="by-session">By Session</TabsTrigger>
              <TabsTrigger value="by-date">By Date Range</TabsTrigger>
              <TabsTrigger value="by-status">By Status</TabsTrigger>
            </TabsList>
            
            <TabsContent value="by-session">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="session">Select Webinar Session</Label>
                  <Select 
                    value={filters.sessionId} 
                    onValueChange={(value) => setFilters({...filters, sessionId: value})}
                  >
                    <SelectTrigger id="session" className="mt-1">
                      <SelectValue placeholder="All Sessions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sessions</SelectItem>
                      {sessions.map(session => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.title} ({formatDate(session.start_time)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="by-date">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <DatePicker
                    selected={filters.startDate}
                    onSelect={(date) => setFilters({...filters, startDate: date})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>End Date</Label>
                  <DatePicker
                    selected={filters.endDate}
                    onSelect={(date) => setFilters({...filters, endDate: date})}
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="by-status">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status">Attendance Status</Label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters({...filters, status: value})}
                  >
                    <SelectTrigger id="status" className="mt-1">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end mt-6">
            <Button onClick={handleExportCSV} className="ml-2">
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading attendance data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-8 border rounded-md bg-gray-50">
              <p className="text-gray-500">No attendance records found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 text-left font-medium">Webinar</th>
                    <th className="py-2 px-4 text-left font-medium">Attendee</th>
                    <th className="py-2 px-4 text-left font-medium">Check-in Time</th>
                    <th className="py-2 px-4 text-left font-medium">Status</th>
                    <th className="py-2 px-4 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{record.sessions[0]?.title || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{formatDate(record.sessions[0]?.start_time || '')}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{record.profiles[0]?.full_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{record.profiles[0]?.email || 'N/A'}</p>
                          {record.profiles[0]?.professional_cadre && (
                            <p className="text-xs text-gray-500">{record.profiles[0]?.professional_cadre}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p>{formatDate(record.check_in_time)}</p>
                          <p className="text-xs text-gray-500">{formatTime(record.check_in_time)}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className={`font-medium ${record.status === 'approved' ? 'text-green-600' : record.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {record.status === 'pending_approval' ? 'Pending' : 
                             record.status === 'approved' ? 'Approved' : 'Rejected'}
                          </p>
                          {record.approved_at && (
                            <p className="text-xs text-gray-500">
                              {formatDate(record.approved_at)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">{record.notes || '-'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Upload, 
  Settings, 
  RefreshCw,
  FileSpreadsheet,
  Monitor
} from 'lucide-react';
import TeamsAttendanceUpload from './TeamsAttendanceUpload';
import SessionAttendanceSettings from './SessionAttendanceSettings';

interface AttendanceManagementProps {
  sessionId: string;
  isAdmin: boolean;
}

export default function AttendanceManagement({ 
  sessionId, 
  isAdmin 
}: AttendanceManagementProps) {
  const [activeTab, setActiveTab] = useState('records');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchAttendanceRecords();
    if (isAdmin) {
      fetchUploadHistory();
    }
  }, [sessionId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = attendanceRecords.filter(record => 
        record.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.user_email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecords(filtered);
    } else {
      setFilteredRecords(attendanceRecords);
    }
  }, [searchQuery, attendanceRecords]);

  const fetchAttendanceRecords = async () => {
    try {
      setIsLoading(true);
      
      // First, get the attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('session_attendance')
        .select(`
          id,
          user_id,
          session_id,
          check_in_time,
          join_time,
          leave_time,
          duration_minutes,
          is_eligible_for_certificate,
          attendance_source,
          status,
          approved_at,
          notes
        `)
        .eq('session_id', sessionId)
        .order('check_in_time', { ascending: false });
        
      if (attendanceError) throw attendanceError;
      
      if (attendanceData.length === 0) {
        setAttendanceRecords([]);
        setFilteredRecords([]);
        setIsLoading(false);
        return;
      }
      
      // Then, get user profiles for these records
      const userIds = attendanceData.map(record => record.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Combine the data
      const data = attendanceData.map(record => {
        const profile = profilesData.find(p => p.id === record.user_id);
        return {
          ...record,
          profiles: profile || null
        };
      });
      
      // Format the data
      const formattedData = data.map(record => ({
        ...record,
        user_name: record.profiles ? record.profiles.full_name : 'Unknown',
        user_email: record.profiles ? record.profiles.email : 'No email'
      }));
      
      setAttendanceRecords(formattedData);
      setFilteredRecords(formattedData);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUploadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_upload_history')
        .select(`
          id,
          uploaded_at,
          filename,
          record_count,
          success_count,
          error_count,
          status,
          uploaded_by
        `)
        .eq('session_id', sessionId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      
      // Get uploader names
      if (data && data.length > 0) {
        const uploaderIds = data.map(item => item.uploaded_by).filter(Boolean);
        
        if (uploaderIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', uploaderIds);
            
          const enrichedData = data.map(item => {
            const uploader = profilesData?.find(p => p.id === item.uploaded_by);
            return {
              ...item,
              profiles: uploader || null
            };
          });
          
          setUploadHistory(enrichedData);
          return;
        }
      }
      
      setUploadHistory(data || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }
  };

  const handleApproveReject = async (recordId: string, approve: boolean) => {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session');
        return;
      }
      
      const { error } = await supabase
        .from('session_attendance')
        .update({
          status: approve ? 'approved' : 'rejected',
          approved_at: approve ? new Date().toISOString() : null,
          approved_by: approve ? session.user.id : null,
          notes: approve ? null : 'Manually rejected by admin'
        })
        .eq('id', recordId);
      
      if (error) throw error;
      
      // Refresh the records
      fetchAttendanceRecords();
    } catch (error) {
      console.error('Error updating attendance status:', error);
    }
  };

  const handleUploadComplete = () => {
    // Refresh both attendance records and upload history
    fetchAttendanceRecords();
    fetchUploadHistory();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getAttendanceSourceIcon = (source: string) => {
    switch (source) {
      case 'teams_csv':
        return <FileSpreadsheet className="h-4 w-4 text-blue-500" title="Teams CSV Upload" />;
      case 'manual':
        return <Monitor className="h-4 w-4 text-green-500" title="Application Check-in" />;
      default:
        return null;
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes && minutes !== 0) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="records">
            Attendance Records
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="upload">
                Upload Teams Attendance
              </TabsTrigger>
              <TabsTrigger value="settings">
                Settings
              </TabsTrigger>
              <TabsTrigger value="history">
                Upload History
              </TabsTrigger>
            </>
          )}
        </TabsList>
        
        <TabsContent value="records">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attendance Records</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email"
                    className="pl-8 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={fetchAttendanceRecords}
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attendee</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Certificate Eligible</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                          Loading attendance records...
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{record.user_name}</div>
                              <div className="text-sm text-gray-500">{record.user_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getAttendanceSourceIcon(record.attendance_source)}
                              <span className="ml-1 text-xs">
                                {record.attendance_source === 'teams_csv' ? 'Teams' : 'App'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(record.check_in_time)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1 text-gray-400" />
                              {formatDuration(record.duration_minutes)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.is_eligible_for_certificate ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <span>Yes</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-red-600">
                                <XCircle className="h-4 w-4 mr-1" />
                                <span>No</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(record.status)}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => handleApproveReject(record.id, true)}
                                  disabled={record.status === 'approved'}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleApproveReject(record.id, false)}
                                  disabled={record.status === 'rejected'}
                                >
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isAdmin && (
          <>
            <TabsContent value="upload">
              <TeamsAttendanceUpload 
                sessionId={sessionId} 
                onUploadComplete={handleUploadComplete}
              />
            </TabsContent>
            
            <TabsContent value="settings">
              <SessionAttendanceSettings sessionId={sessionId} />
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Upload History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Filename</TableHead>
                          <TableHead>Records</TableHead>
                          <TableHead>Success</TableHead>
                          <TableHead>Errors</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadHistory.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              No upload history found
                            </TableCell>
                          </TableRow>
                        ) : (
                          uploadHistory.map((upload) => (
                            <TableRow key={upload.id}>
                              <TableCell>
                                {formatDateTime(upload.uploaded_at)}
                              </TableCell>
                              <TableCell>
                                {upload.profiles?.full_name || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <FileSpreadsheet className="h-4 w-4 mr-1 text-blue-500" />
                                  {upload.filename}
                                </div>
                              </TableCell>
                              <TableCell>{upload.record_count}</TableCell>
                              <TableCell className="text-green-600">
                                {upload.success_count}
                              </TableCell>
                              <TableCell className="text-red-600">
                                {upload.error_count}
                              </TableCell>
                              <TableCell>
                                {upload.status === 'completed' ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    Completed
                                  </Badge>
                                ) : upload.status === 'failed' ? (
                                  <Badge className="bg-red-100 text-red-800">
                                    Failed
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    Processing
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

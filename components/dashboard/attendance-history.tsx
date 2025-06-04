"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  created_at: string;
  user_id: string;
  session_id: string;
  check_in_time: string;
  status: string;
  approved_at: string | null;
  notes: string | null;
  sessions: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  }[];
}

export function AttendanceHistory() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAttendanceHistory() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch user's attendance records
        const { data, error } = await supabase
          .from('session_attendance')
          .select(`
            id,
            created_at,
            user_id,
            session_id,
            check_in_time,
            status,
            approved_at,
            notes,
            sessions:session_id(id, title, start_time, end_time)
          `)
          .order('check_in_time', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        setAttendanceRecords(data as unknown as AttendanceRecord[] || []);
      } catch (error: any) {
        console.error('Error fetching attendance history:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAttendanceHistory();
  }, []);
  
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
  
  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">My Attendance History</CardTitle>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <p className="text-center py-4 text-sm text-gray-500">Loading attendance history...</p>
        ) : error ? (
          <p className="text-center py-4 text-sm text-red-500">{error}</p>
        ) : attendanceRecords.length === 0 ? (
          <p className="text-center py-4 text-sm text-gray-500">No attendance records found.</p>
        ) : (
          <div className="space-y-4">
            {attendanceRecords.map((record) => (
              <div key={record.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{record.sessions[0]?.title || 'Unknown Session'}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(record.sessions[0]?.start_time || '')} at {formatTime(record.sessions[0]?.start_time || '')}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(record.status)}
                  </div>
                </div>
                
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Checked in:</span>
                    <span>{formatDate(record.check_in_time)} at {formatTime(record.check_in_time)}</span>
                  </div>
                  
                  {record.status === 'rejected' && record.notes && (
                    <div className="mt-2 text-red-600 text-xs">
                      Reason: {record.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {attendanceRecords.length > 0 && (
              <div className="pt-2 text-center">
                <a href="/dashboard/attendance/history" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  View all attendance records
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

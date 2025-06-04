"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function AttendanceHistoryClient() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
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
          .order('check_in_time', { ascending: false });
        
        if (error) throw error;
        
        // Type assertion to match the expected AttendanceRecord structure
        setAttendanceRecords(data as unknown as AttendanceRecord[] || []);
        setFilteredRecords(data as unknown as AttendanceRecord[] || []);
      } catch (error: any) {
        console.error('Error fetching attendance history:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAttendanceHistory();
  }, []);
  
  useEffect(() => {
    // Filter records based on search term and status filter
    let filtered = attendanceRecords;
    
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.sessions[0]?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }
    
    setFilteredRecords(filtered);
  }, [searchTerm, statusFilter, attendanceRecords]);
  
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
    <div>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Webinars</Label>
              <Input
                id="search"
                placeholder="Search by webinar title"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading attendance history...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-8 border rounded-md bg-gray-50">
          <p className="text-gray-500">
            {attendanceRecords.length === 0 
              ? 'No attendance records found.' 
              : 'No matching records found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-2">Showing {filteredRecords.length} records</p>
          
          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                      <h3 className="font-medium text-lg">{record.sessions[0]?.title}</h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(record.sessions[0]?.start_time)} at {formatTime(record.sessions[0]?.start_time)}
                      </p>
                    </div>
                    <div>
                      {getStatusBadge(record.status)}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Check-in Details</p>
                      <div className="mt-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date:</span>
                          <span>{formatDate(record.check_in_time)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time:</span>
                          <span>{formatTime(record.check_in_time)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Status Information</p>
                      <div className="mt-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Current Status:</span>
                          <span>{record.status.replace('_', ' ')}</span>
                        </div>
                        {record.approved_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Processed On:</span>
                            <span>{formatDate(record.approved_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {record.status === 'rejected' && record.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium">Rejection Reason</p>
                      <p className="mt-1 text-sm text-red-600">{record.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

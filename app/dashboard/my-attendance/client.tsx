"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Toaster } from '@/components/ui/toaster';
import { Input } from '@/components/ui/input';
import { Search, Eye } from 'lucide-react';
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

export default function UserAttendanceClient() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<string>('all');
  
  useEffect(() => {
    fetchUserAttendanceRecords();
  }, []);
  
  async function fetchUserAttendanceRecords() {
    try {
      setLoading(true);
      setError(null); // Reset any previous errors
      
      console.log('Fetching user attendance records');
      
      // Use the Supabase client directly
      const supabase = createClient();
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting current user:', userError);
        throw new Error(userError?.message || 'You must be logged in to view your attendance records');
      }
      
      // Fetch attendance records for the current user
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
        .eq('user_id', user.id);
        
      if (attendanceError) {
        console.error('Supabase error fetching attendance:', attendanceError);
        throw new Error(attendanceError.message || 'Failed to fetch attendance records');
      }
      
      console.log(`Retrieved ${attendanceData?.length || 0} attendance records`);
      
      // Then, for each record, fetch the associated session data
      const enhancedData = await Promise.all((attendanceData || []).map(async (record) => {
        // Get user profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', record.user_id)
          .single();
        
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
      
      console.log(`Enhanced ${enhancedData.length} attendance records with session data`);
      setAttendanceRecords(enhancedData);
    } catch (error: any) {
      console.error('Error fetching user attendance records:', error);
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
  
  // Filter records based on search term and current tab
  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = 
      record.sessions.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatDate(record.check_in_time).toLowerCase().includes(searchTerm.toLowerCase());
      
    if (currentTab === 'all') {
      return matchesSearch;
    } else {
      return matchesSearch && record.status === currentTab;
    }
  });
  
  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]"></div>
        <span className="ml-2">Loading your attendance records...</span>
      </div>
    );
  }
  
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
              <div className="col-span-4">Webinar Title</div>
              <div className="col-span-3">Date</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
            
            {/* Table Content */}
            {error ? (
              <div className="p-4 text-center text-red-500">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchUserAttendanceRecords()}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No attendance records found.</p>
                <p className="mt-2">Join webinars to start building your attendance history.</p>
              </div>
            ) : (
              <div>
                {filteredRecords.map((record) => (
                  <div key={record.id} className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50">
                    <div className="col-span-4">
                      <p className="font-medium">{record.sessions.title}</p>
                    </div>
                    <div className="col-span-3">
                      <p>{formatDate(record.check_in_time)}</p>
                    </div>
                    <div className="col-span-2">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Online</Badge>
                    </div>
                    <div className="col-span-2">
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => window.location.href = `/dashboard/sessions/${record.session_id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {record.notes && (
                      <div className="col-span-12 text-sm text-gray-500 pl-4 pr-4 pb-2">
                        <p className="font-medium">Notes:</p>
                        <p>{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Toaster } from '@/components/ui/toaster';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, ChevronLeft, ChevronRight, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
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
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginatedRecords, setPaginatedRecords] = useState<AttendanceRecord[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  
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
  
  // Apply pagination to filtered records
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filteredRecords.slice(startIndex, endIndex);
    
    setPaginatedRecords(paginated);
    setTotalPages(Math.ceil(filteredRecords.length / pageSize));
  }, [attendanceRecords, currentTab, searchTerm, currentPage, pageSize]);
  
  // Reset to first page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab, searchTerm]);
  
  // Pagination functions
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };
  
  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#008C45] border-r-transparent align-[-0.125em]"></div>
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
                  className={`rounded-full ${
                    currentTab === 'all' 
                      ? 'bg-[#008C45] hover:bg-[#006633] text-white' 
                      : 'border-[#008C45] text-[#008C45] hover:bg-green-50'
                  }`}
                >
                  All
                </Button>
                <Button 
                  variant={currentTab === 'pending_approval' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTab('pending_approval')}
                  className={`rounded-full ${
                    currentTab === 'pending_approval' 
                      ? 'bg-[#008C45] hover:bg-[#006633] text-white' 
                      : 'border-[#008C45] text-[#008C45] hover:bg-green-50'
                  }`}
                >
                  Pending
                </Button>
                <Button 
                  variant={currentTab === 'approved' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTab('approved')}
                  className={`rounded-full ${
                    currentTab === 'approved' 
                      ? 'bg-[#008C45] hover:bg-[#006633] text-white' 
                      : 'border-[#008C45] text-[#008C45] hover:bg-green-50'
                  }`}
                >
                  Completed
                </Button>
                <Button 
                  variant={currentTab === 'rejected' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTab('rejected')}
                  className={`rounded-full ${
                    currentTab === 'rejected' 
                      ? 'bg-[#008C45] hover:bg-[#006633] text-white' 
                      : 'border-[#008C45] text-[#008C45] hover:bg-green-50'
                  }`}
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
            
            {/* Results summary and page size selector */}
            {filteredRecords.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b gap-2">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20 border-[#008C45]/30 focus:ring-[#008C45]">
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
            )}
            
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
              <>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                  {paginatedRecords.map((record) => (
                    <Card key={record.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 flex-1 pr-2">
                            {record.sessions.title}
                          </h3>
                          {record.status === 'pending_approval' && (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex-shrink-0">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {record.status === 'approved' && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex-shrink-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {record.status === 'rejected' && (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 flex-shrink-0">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(record.check_in_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#E8F5E9] text-[#008C45] hover:bg-[#E8F5E9] text-xs">
                              Online
                            </Badge>
                          </div>
                        </div>
                        
                        {record.notes && (
                          <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                            <p className="font-medium text-gray-700 mb-1">Notes:</p>
                            <p className="text-gray-600">{record.notes}</p>
                          </div>
                        )}
                        
                        <div className="pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-[#008C45]/30 text-[#008C45] hover:bg-green-50"
                            onClick={() => window.location.href = `/dashboard/sessions/${record.session_id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  {paginatedRecords.map((record) => (
                    <div key={record.id} className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50">
                      <div className="col-span-4">
                        <p className="font-medium">{record.sessions.title}</p>
                      </div>
                      <div className="col-span-3">
                        <p>{formatDate(record.check_in_time)}</p>
                      </div>
                      <div className="col-span-2">
                        <Badge className="bg-[#E8F5E9] text-[#008C45] hover:bg-[#E8F5E9]">Online</Badge>
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
              </>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t gap-4">
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-1 border-[#008C45]/30 text-[#008C45] hover:bg-green-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return page === 1 || 
                               page === totalPages || 
                               Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, index, array) => {
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
                                  ? 'bg-[#008C45] hover:bg-[#006633] text-white' 
                                  : 'border-[#008C45]/30 text-[#008C45] hover:bg-green-50'
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
                    className="flex items-center space-x-1 border-[#008C45]/30 text-[#008C45] hover:bg-green-50"
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
        </CardContent>
      </Card>
    </div>
  );
}

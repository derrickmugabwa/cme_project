'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calendar, CheckCircle, Clock, FileText, GraduationCap, BarChart2, Users, Video, ExternalLink, Award } from 'lucide-react'
import { createClient } from '@/lib/client'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { LoadingSpinner, LoadingSection, LoadingPage } from '@/components/ui/loading-spinner'

interface UserDashboardProps {
  profile: any
  user: any
}

// Webinar Sessions List Component
function WebinarSessionsList({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSessionsAndEnrollments = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch all available sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .gt('start_time', new Date().toISOString()) // Only future sessions
          .order('start_time', { ascending: true });
          
        if (sessionsError) throw sessionsError;
        
        // Fetch user's enrollments
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('session_enrollments')
          .select('session_id')
          .eq('user_id', userId);
          
        if (enrollmentsError) throw enrollmentsError;
        
        // Create a map of session_id -> enrolled status
        const enrollmentMap: Record<string, boolean> = {};
        (enrollmentsData || []).forEach(enrollment => {
          enrollmentMap[enrollment.session_id] = true;
        });
        
        setSessions(sessionsData || []);
        setEnrollments(enrollmentMap);
      } catch (error) {
        console.error('Error fetching sessions and enrollments:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchSessionsAndEnrollments();
    }
  }, [userId]);
  
  if (loading) {
    return <LoadingSection />;
  }
  
  if (sessions.length === 0) {
    return (
      <div className="text-center py-6">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No upcoming webinar sessions</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Check back later for new webinar sessions.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {sessions.map(session => {
        const startTime = new Date(session.start_time);
        const endTime = new Date(session.end_time);
        
        return (
          <div key={session.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{session.title}</h3>
                {session.is_online && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Online
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{session.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{format(startTime, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              {enrollments[session.id] ? (
                <Button 
                  onClick={() => window.location.href = `/dashboard/sessions/${session.id}`}
                  className="bg-[#008C45] hover:bg-[#006633] text-white"
                >
                  View Details
                </Button>
              ) : (
                <Button 
                  onClick={() => window.location.href = `/dashboard/sessions/${session.id}`}
                  className="bg-[#008C45] hover:bg-[#006633] text-white"
                >
                  Enroll
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function UserDashboard({ profile, user }: UserDashboardProps) {
  // State for dashboard data
  const [userUnits, setUserUnits] = useState<number>(0);
  const [loadingUnits, setLoadingUnits] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [enrollmentData, setEnrollmentData] = useState({
    count: 0
  });
  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    total: 0,
    rate: 0
  });
  const [certificatesData, setCertificatesData] = useState({
    count: 0,
    total: 0,
    percentage: 0
  });
  
  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch user units
        const { data: unitsData, error: unitsError } = await supabase
          .from('user_units')
          .select('units')
          .eq('user_id', user.id)
          .single();
        
        if (unitsError && unitsError.code !== 'PGRST116') {
          console.error('Error fetching user units:', unitsError);
        } else {
          setUserUnits(unitsData?.units || 0);
        }
        
        // Fetch webinar enrollments
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('session_enrollments')
          .select('id')
          .eq('user_id', user.id);
          
        if (enrollmentsError) {
          console.error('Error fetching enrollments:', enrollmentsError);
        } else {
          setEnrollmentData({
            count: enrollmentsData?.length || 0
          });
        }
        
        // Fetch attendance data
        const { data: attendanceRecords, error: attendanceError } = await supabase
          .from('session_attendance')
          .select('id, status')
          .eq('user_id', user.id);
          
        if (attendanceError) {
          console.error('Error fetching attendance:', attendanceError);
        } else {
          const presentCount = attendanceRecords?.filter(record => record.status === 'approved').length || 0;
          const totalCount = attendanceRecords?.length || 0;
          
          setAttendanceData({
            present: presentCount,
            total: totalCount,
            rate: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
          });
        }
        
        // Fetch certificates data - using certificates table from migration
        try {
          // First check if the certificates table exists by querying it
          const { data: certificatesRecords, error: certificatesError } = await supabase
            .from('certificates')
            .select('id')
            .eq('user_id', user.id);
            
          if (certificatesError && certificatesError.code === '42P01') {
            // Table doesn't exist yet, use default values
            console.log('Certificates table not yet created, using default values');
            setCertificatesData({
              count: 0,
              total: 0,
              percentage: 0
            });
          } else if (certificatesError) {
            console.error('Error fetching certificates:', certificatesError);
            setCertificatesData({
              count: 0,
              total: 0,
              percentage: 0
            });
          } else {
            // Get total possible certificates (from completed sessions with attendance)
            const { data: eligibleSessions, error: eligibleError } = await supabase
              .from('session_attendance')
              .select('id')
              .eq('user_id', user.id)
              .eq('status', 'approved');
              
            const totalPossible = eligibleSessions?.length || 0;
            const earnedCount = certificatesRecords?.length || 0;
            
            setCertificatesData({
              count: earnedCount,
              total: totalPossible,
              percentage: totalPossible > 0 ? Math.round((earnedCount / totalPossible) * 100) : 0
            });
          }
        } catch (error) {
          console.error('Unexpected error fetching certificates:', error);
          setCertificatesData({
            count: 0,
            total: 0,
            percentage: 0
          });
        }
      } catch (error) {
        console.error('Unexpected error fetching dashboard data:', error);
      } finally {
        setLoadingUnits(false);
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user?.id]);

  // Show loading page when the entire dashboard is loading
  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#FFE2EC] to-[#FFF0F5] dark:from-pink-950 dark:to-pink-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Video className="h-12 w-12 text-[#008C45]" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">My Enrollment</CardDescription>
            <CardTitle className="text-3xl font-bold">{enrollmentData.count}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">Webinars enrolled</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-[#008C45]/30 text-[#008C45] dark:text-green-300"
              onClick={() => window.location.href = '/dashboard/sessions'}
            >
              <Video className="mr-2 h-4 w-4 text-[#008C45]" />
              Browse Webinars
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] dark:from-blue-950 dark:to-blue-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Calendar className="h-12 w-12 text-[#008C45]" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Attendance Rate</CardDescription>
            <CardTitle className="text-3xl font-bold">{attendanceData.rate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">{attendanceData.present} of {attendanceData.total} sessions attended</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-[#008C45]/30 text-[#008C45] dark:text-green-300"
              onClick={() => window.location.href = '/dashboard/my-attendance'}
            >
              <Calendar className="mr-2 h-4 w-4 text-[#008C45]" />
              View Schedule
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] dark:from-green-950 dark:to-green-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Award className="h-12 w-12 text-[#008C45]" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">My Certificates</CardDescription>
            <CardTitle className="text-3xl font-bold">{certificatesData.count}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">{certificatesData.count} of {certificatesData.total} certificates earned</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-green-300 text-green-700 dark:text-green-300"
              onClick={() => window.location.href = '/dashboard/certificates'}
            >
              <Award className="mr-2 h-4 w-4 text-green-500" />
              View Certificates
            </Button>
          </CardFooter>
        </Card>
      </div>
      

      
      {/* Two-column layout for Webinar Sessions and Units */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Available Webinar Sessions */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Available Webinar Sessions</CardTitle>
              <CardDescription>Upcoming webinar sessions you can enroll in</CardDescription>
            </div>
            <Badge variant="outline" className="bg-[#E8F5E9] text-[#008C45] border-[#008C45]/30 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
              <Video className="h-3 w-3 mr-1" />
              Webinars
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto p-6 custom-scrollbar">
              <WebinarSessionsList userId={user?.id} />
            </div>
          </CardContent>
        </Card>
        
        {/* Units Card */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Units</CardTitle>
              <CardDescription>Units available for webinar enrollments</CardDescription>
            </div>
            <Badge variant="outline" className="bg-[#E8F5E9] text-[#008C45] border-[#008C45]/30 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
              <BarChart2 className="h-3 w-3 mr-1" />
              Credits
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-6 py-6">
              {loadingUnits ? (
                <div className="flex justify-center items-center h-32">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold">{userUnits}</span>
                  </div>
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      className="text-muted stroke-current"
                      strokeWidth="10"
                      fill="transparent"
                      r="40"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className="text-[#008C45] stroke-current"
                      strokeWidth="10"
                      strokeLinecap="round"
                      fill="transparent"
                      r="40"
                      cx="50"
                      cy="50"
                      strokeDasharray={`${Math.min(userUnits * 25, 251.2)} 251.2`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                </div>
              )}
              <div className="text-center">
                <h3 className="text-lg font-medium">Available Units</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You need units to enroll in webinar sessions
                </p>
              </div>
              <Button 
                className="w-full bg-[#008C45] hover:bg-[#006633] text-white"
                onClick={() => window.location.href = '/dashboard/units'}
              >
                Manage Units
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

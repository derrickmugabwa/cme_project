'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Award, BarChart3, BookOpen, Calendar, CheckCircle, ClipboardX, Database, FileText, HardDrive, Image, Settings, Shield, ShieldCheck, UserPlus, Users } from "lucide-react"
import { createClient } from '@/lib/client'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface AdminDashboardProps {
  profile: any
  user: any
}

export function AdminDashboard({ profile, user }: AdminDashboardProps) {
  // State for dashboard data
  const [loading, setLoading] = useState<boolean>(true)
  
  // State for document stats
  const [documentStats, setDocumentStats] = useState({
    count: 0
  })
  
  // State for webinar stats
  const [webinarStats, setWebinarStats] = useState({
    count: 0
  })
  
  // State for certificate stats
  const [certificateStats, setCertificateStats] = useState({
    count: 0
  })
  
  // State for user stats
  const [userStats, setUserStats] = useState({
    total: 0,
    students: 0,
    faculty: 0,
    admins: 0,
    pendingApprovals: 0
  })
  
  // State for recent activities
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string;
    type: string;
    description: string;
    user: string;
    timestamp: string;
  }>>([])
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const supabase = createClient()
        
        // Fetch user statistics
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, role')
        
        if (usersError) {
          console.error('Error fetching users:', usersError)
        } else if (usersData) {
          const students = usersData.filter(u => u.role === 'student').length
          const faculty = usersData.filter(u => u.role === 'faculty').length
          const admins = usersData.filter(u => u.role === 'admin').length
          
          setUserStats({
            total: usersData.length,
            students,
            faculty,
            admins,
            pendingApprovals: 0 // We'll assume no pending approvals for now
          })
        }
        
        // Fetch sessions (webinars) data
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, title')
        
        if (sessionsError) {
          console.error('Error fetching sessions:', sessionsError)
        } else if (sessionsData) {
          setWebinarStats({
            count: sessionsData.length
          })
        }
        
        // Try to fetch certificates if table exists
        try {
          const { data: certificatesData, error: certificatesError } = await supabase
            .from('certificates')
            .select('id')
          
          if (!certificatesError) {
            setCertificateStats({
              count: certificatesData?.length || 0
            })
          }
        } catch (error) {
          console.log('Certificates table may not exist yet')
        }
        
        // Fetch attendance records as documents
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('session_attendance')
          .select('id')
        
        if (attendanceError) {
          console.error('Error fetching attendance:', attendanceError)
        } else if (attendanceData) {
          setDocumentStats({
            count: attendanceData.length
          })
        }
        
        // Fetch recent activities (from session_attendance, enrollments, and certificates if available)
        try {
          // Get recent session attendance
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('session_attendance')
            .select('id, created_at, user_id, session_id, profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(3)
          
          if (!attendanceError && attendanceData) {
            const attendanceActivities = attendanceData.map(item => ({
              id: item.id,
              type: 'attendance',
              description: 'Marked attendance',
              user: item.profiles ? (item.profiles as any).full_name || 'Unknown User' : 'Unknown User',
              timestamp: new Date(item.created_at).toLocaleString()
            }))
            
            // Get recent enrollments
            const { data: enrollmentData, error: enrollmentError } = await supabase
              .from('enrollments')
              .select('id, created_at, user_id, session_id, profiles(full_name)')
              .order('created_at', { ascending: false })
              .limit(3)
            
            const enrollmentActivities = !enrollmentError && enrollmentData ? 
              enrollmentData.map(item => ({
                id: item.id,
                type: 'enrollment',
                description: 'Enrolled in webinar',
                user: item.profiles ? (item.profiles as any).full_name || 'Unknown User' : 'Unknown User',
                timestamp: new Date(item.created_at).toLocaleString()
              })) : []
            
            // Try to get certificate activities if table exists
            let certificateActivities: Array<{
              id: string;
              type: string;
              description: string;
              user: string;
              timestamp: string;
            }> = []
            try {
              const { data: certificateData, error: certificateError } = await supabase
                .from('certificates')
                .select('id, created_at, user_id, profiles(full_name)')
                .order('created_at', { ascending: false })
                .limit(3)
              
              if (!certificateError && certificateData) {
                certificateActivities = certificateData.map(item => ({
                  id: item.id,
                  type: 'certificate',
                  description: 'Earned certificate',
                  user: item.profiles ? (item.profiles as any).full_name || 'Unknown User' : 'Unknown User',
                  timestamp: new Date(item.created_at).toLocaleString()
                }))
              }
            } catch (error) {
              console.log('Certificates table may not exist yet')
            }
            
            // Combine all activities, sort by timestamp, and take the most recent 5
            const allActivities = [...attendanceActivities, ...enrollmentActivities, ...certificateActivities]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5)
            
            setRecentActivities(allActivities)
          }
        } catch (error) {
          console.error('Error fetching recent activities:', error)
        }
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [user?.id])
  
  // System status is always online for the admin dashboard
  const systemStatus = {
    status: 'Online',
    database: 'Connected',
    storage: 'Available'
  }

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
      <>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#FFF5E6] to-[#FFFAF0] dark:from-blue-950 dark:to-blue-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <FileText className="h-12 w-12 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Attendance Records</CardDescription>
            <CardTitle className="text-3xl font-bold">{documentStats.count}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Card content intentionally left empty */}
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-blue-300 text-blue-700 dark:text-blue-300"
              onClick={() => window.location.href = '/dashboard/attendance'}
            >
              <FileText className="mr-2 h-4 w-4 text-blue-500" />
              Manage Attendance
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#F0F9FF] to-[#E6F7FF] dark:from-green-950 dark:to-green-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Calendar className="h-12 w-12 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Webinar Sessions</CardDescription>
            <CardTitle className="text-3xl font-bold">{webinarStats.count}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Card content intentionally left empty */}
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-green-300 text-green-700 dark:text-green-300"
              onClick={() => window.location.href = '/dashboard/sessions'}
            >
              <Calendar className="mr-2 h-4 w-4 text-green-500" />
              Manage Webinars
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#FFFBEB] to-[#FFF8E1] dark:from-amber-950 dark:to-amber-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Award className="h-12 w-12 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Certificates</CardDescription>
            <CardTitle className="text-3xl font-bold">{certificateStats.count}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Card content intentionally left empty */}
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-amber-300 text-amber-700 dark:text-amber-300"
              onClick={() => window.location.href = '/dashboard/certificates'}
            >
              <Award className="mr-2 h-4 w-4 text-amber-500" />
              Manage Certificates
            </Button>
          </CardFooter>
        </Card>
      </div>
      </>)}
      
      
      {/* Administrative Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#008C45] via-[#00a854] to-[#006633]"></div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#008C45]" />
                    <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#008C45] to-[#006633] dark:from-[#00a854] dark:to-[#008C45]">Administrative Actions</CardTitle>
                  </div>
                  <CardDescription className="mt-1 text-slate-500 dark:text-slate-400">Manage system operations and maintenance</CardDescription>
                </div>
                <div className="bg-[#E8F5E9] dark:bg-green-900/30 p-2 rounded-full">
                  <ShieldCheck className="h-6 w-6 text-[#008C45] dark:text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group relative overflow-hidden rounded-lg bg-white dark:bg-slate-800 shadow-sm transition-all duration-200 hover:shadow-md hover:translate-y-[-2px] border border-slate-100 dark:border-slate-700">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500 transition-all duration-200 group-hover:w-2"></div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <h3 className="font-semibold text-slate-800 dark:text-slate-200">User Management</h3>
                        </div>
                        <Badge className="bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-400 hover:bg-green-100 transition-colors">
                          {userStats.total} Users
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Manage user accounts and permissions
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors group-hover:border-green-300 dark:group-hover:border-green-800"
                        onClick={() => window.location.href = '/dashboard/admin/users'}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Manage Users
                      </Button>
                    </div>
                  </div>
                  
                  <div className="group relative overflow-hidden rounded-lg bg-white dark:bg-slate-800 shadow-sm transition-all duration-200 hover:shadow-md hover:translate-y-[-2px] border border-slate-100 dark:border-slate-700">
                    <div className="absolute top-0 left-0 w-1 h-full bg-pink-500 transition-all duration-200 group-hover:w-2"></div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-full">
                            <BookOpen className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                          </div>
                          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Units Management</h3>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Create and manage educational units
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2 border-pink-200 dark:border-pink-900 text-pink-700 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors group-hover:border-pink-300 dark:group-hover:border-pink-800"
                        onClick={() => window.location.href = '/dashboard/admin/units'}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Manage Units
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="group relative overflow-hidden rounded-lg bg-white dark:bg-slate-800 shadow-sm transition-all duration-200 hover:shadow-md hover:translate-y-[-2px] border border-slate-100 dark:border-slate-700">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 transition-all duration-200 group-hover:w-2"></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                          <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Reports</h3>
                      </div>
                      <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 hover:bg-amber-100 transition-colors">
                        Available
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Generate and view system reports and analytics
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors group-hover:border-amber-300 dark:group-hover:border-amber-800"
                      onClick={() => window.location.href = '/dashboard/reports'}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Reports
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#008C45] via-[#00a854] to-[#006633]"></div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-[#E8F5E9] dark:bg-green-900/30 p-2 rounded-full">
                    <Activity className="h-5 w-5 text-[#008C45] dark:text-green-400" />
                  </div>
                  <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#008C45] to-[#006633] dark:from-[#00a854] dark:to-[#008C45]">Recent Activity</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008C45]"></div>
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className={`p-2 rounded-full flex-shrink-0 ${
                        activity.type === 'attendance' ? 'bg-green-100 dark:bg-green-900/30' :
                        activity.type === 'enrollment' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        'bg-amber-100 dark:bg-amber-900/30'
                      }`}>
                        {activity.type === 'attendance' ? (
                          <CheckCircle className={`h-4 w-4 text-green-600 dark:text-green-400`} />
                        ) : activity.type === 'enrollment' ? (
                          <UserPlus className={`h-4 w-4 text-blue-600 dark:text-blue-400`} />
                        ) : (
                          <Award className={`h-4 w-4 text-amber-600 dark:text-amber-400`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{activity.user}</p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{activity.timestamp}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <ClipboardX className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-slate-500 dark:text-slate-400">No recent activities found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

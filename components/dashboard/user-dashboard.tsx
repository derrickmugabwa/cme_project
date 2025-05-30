'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calendar, CheckCircle, Clock, FileText, GraduationCap, BarChart2, Users, Video, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/client'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface UserDashboardProps {
  profile: any
  user: any
}

// Webinar Sessions List Component
function WebinarSessionsList({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSessions = async () => {
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
        
        setSessions(sessionsData || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchSessions();
    }
  }, [userId]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
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
              <Button 
                onClick={() => window.location.href = `/dashboard/sessions/${session.id}`}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                View Details
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function UserDashboard({ profile, user }: UserDashboardProps) {
  // Sample data for visualization - would be replaced with real data in production
  const attendanceData = {
    present: 0,
    absent: 0,
    excused: 0,
    total: 0,
    rate: 0
  }

  const progressData = {
    completed: 0,
    total: 0,
    percentage: 0
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#FFE2EC] to-[#FFF0F5] dark:from-pink-950 dark:to-pink-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <BookOpen className="h-12 w-12 text-pink-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">My Enrollment</CardDescription>
            <CardTitle className="text-3xl font-bold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">Courses enrolled</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-pink-300 text-pink-700 dark:text-pink-300">
              <BookOpen className="mr-2 h-4 w-4 text-pink-500" />
              Browse Courses
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] dark:from-blue-950 dark:to-blue-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Calendar className="h-12 w-12 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Attendance Rate</CardDescription>
            <CardTitle className="text-3xl font-bold">{attendanceData.rate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">{attendanceData.present} of {attendanceData.total} sessions attended</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-blue-300 text-blue-700 dark:text-blue-300">
              <Calendar className="mr-2 h-4 w-4 text-blue-500" />
              View Schedule
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] dark:from-green-950 dark:to-green-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Course Progress</CardDescription>
            <CardTitle className="text-3xl font-bold">{progressData.percentage}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">{progressData.completed} of {progressData.total} courses completed</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-green-300 text-green-700 dark:text-green-300">
              <GraduationCap className="mr-2 h-4 w-4 text-green-500" />
              View Progress
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
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
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
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
              <BarChart2 className="h-3 w-3 mr-1" />
              Credits
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-6 py-6">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold">0</span>
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
                    className="text-purple-500 stroke-current"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    strokeDasharray="0 251.2"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium">Available Units</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You need units to enroll in webinar sessions
                </p>
              </div>
              <Button className="w-full">
                Top Up Units
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

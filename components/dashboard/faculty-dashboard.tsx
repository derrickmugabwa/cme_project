'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, BookOpen, Calendar, FileText, GraduationCap, Plus, Upload, Users } from 'lucide-react'

interface FacultyDashboardProps {
  profile: any
  user: any
}

export function FacultyDashboard({ profile, user }: FacultyDashboardProps) {
  // Sample data for visualization - would be replaced with real data in production
  const courseData = {
    total: 0,
    active: 0,
    draft: 0
  }

  const studentData = {
    total: 0,
    attendanceRate: 0
  }

  const sessionData = {
    upcoming: 0,
    completed: 0
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#FFF5E6] to-[#FFFAF0] dark:from-blue-950 dark:to-blue-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <BookOpen className="h-12 w-12 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Documents</CardDescription>
            <CardTitle className="text-3xl font-bold">1390</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-blue-500 font-medium">2.1 GB</span>
                <span className="text-gray-600 dark:text-gray-300 ml-1">used</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '35%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">35% of storage used</p>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-blue-300 text-blue-700 dark:text-blue-300">
              <Plus className="mr-2 h-4 w-4 text-blue-500" />
              Create New Document
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#F0F9FF] to-[#E6F7FF] dark:from-green-950 dark:to-green-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Users className="h-12 w-12 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Images</CardDescription>
            <CardTitle className="text-3xl font-bold">5678</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-green-500 font-medium">3.8 GB</span>
                <span className="text-gray-600 dark:text-gray-300 ml-1">used</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '62%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">62% of storage used</p>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-green-300 text-green-700 dark:text-green-300">
              <Upload className="mr-2 h-4 w-4 text-green-500" />
              Upload Images
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#FFF0F0] to-[#FFEBEB] dark:from-red-950 dark:to-red-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Calendar className="h-12 w-12 text-red-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Videos</CardDescription>
            <CardTitle className="text-3xl font-bold">901</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-red-500 font-medium">7.5 GB</span>
                <span className="text-gray-600 dark:text-gray-300 ml-1">used</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: '89%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">89% of storage used</p>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-red-300 text-red-700 dark:text-red-300">
              <Upload className="mr-2 h-4 w-4 text-red-500" />
              Upload Videos
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Course Management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Management</CardTitle>
                  <CardDescription>Manage your teaching materials and student enrollments</CardDescription>
                </div>
                <GraduationCap className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Course Materials</CardTitle>
                        <Upload className="h-4 w-4 text-blue-500" />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-sm text-muted-foreground">
                        Upload and manage course materials for your students.
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="outline" size="sm" className="w-full">
                        Manage Materials
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card className="border shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Student Enrollment</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-sm text-muted-foreground">
                        View and manage student enrollments in your courses.
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="outline" size="sm" className="w-full">
                        Manage Enrollments
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                
                <Card className="border shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Course Analytics</CardTitle>
                      <BarChart3 className="h-4 w-4 text-red-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground">
                      Track student performance and engagement with detailed analytics.
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="outline" size="sm" className="w-full">
                      View Analytics
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Updates</CardTitle>
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              {/* If there are no updates */}
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-amber-500 mb-3" />
                <p className="text-muted-foreground mb-2">No recent updates</p>
                <p className="text-sm text-muted-foreground">
                  Updates to your courses and student activities will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

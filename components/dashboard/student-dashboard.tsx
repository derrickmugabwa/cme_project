'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calendar, CheckCircle, Clock, FileText, GraduationCap, BarChart2, Users } from 'lucide-react'

interface StudentDashboardProps {
  profile: any
  user: any
}

export function StudentDashboard({ profile, user }: StudentDashboardProps) {
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
            <BookOpen className="h-12 w-12 text-[#008C45]" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">My Enrollment</CardDescription>
            <CardTitle className="text-3xl font-bold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">Courses enrolled</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-[#008C45]/30 text-[#008C45] dark:text-green-300">
              <BookOpen className="mr-2 h-4 w-4 text-[#008C45]" />
              Browse Courses
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#E0F7FF] to-[#F0FAFF] dark:from-blue-950 dark:to-blue-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <CheckCircle className="h-12 w-12 text-[#008C45]" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Attendance Rate</CardDescription>
            <CardTitle className="text-3xl font-bold">{attendanceData.rate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-green-500 font-medium">{attendanceData.present}</span>
                <span className="text-gray-600 dark:text-gray-300 ml-1">Present</span>
              </div>
              <div>
                <span className="text-red-500 font-medium">{attendanceData.absent}</span>
                <span className="text-gray-600 dark:text-gray-300 ml-1">Absent</span>
              </div>
              <div>
                <span className="text-yellow-500 font-medium">{attendanceData.excused}</span>
                <span className="text-gray-600 dark:text-gray-300 ml-1">Excused</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-[#008C45]/30 text-[#008C45] dark:text-green-300">
              <Users className="mr-2 h-4 w-4 text-[#008C45]" />
              View Attendance
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#E6F9F1] to-[#F0FFF8] dark:from-green-950 dark:to-green-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Calendar className="h-12 w-12 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Upcoming</CardDescription>
            <CardTitle className="text-3xl font-bold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">Scheduled sessions</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-green-300 text-green-700 dark:text-green-300">
              <Calendar className="mr-2 h-4 w-4 text-green-500" />
              View Calendar
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Learning Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Learning Progress</CardTitle>
                  <CardDescription>Track your course completion</CardDescription>
                </div>
                <GraduationCap className="h-5 w-5 text-[#008C45]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Overall Progress</p>
                    <p className="text-sm text-muted-foreground">{progressData.percentage}%</p>
                  </div>
                  <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#008C45] to-[#006633] transition-all duration-500 ease-in-out" 
                      style={{ width: `${progressData.percentage || 10}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {progressData.completed} of {progressData.total} courses completed
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-medium">Student Overall Success Rate</p>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">+3%</Badge>
                  </div>
                  
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-pink-600 bg-pink-200 dark:bg-pink-900 dark:text-pink-200">
                          88%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-gray-600 dark:text-gray-400">
                          Target: 100%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                      <div style={{ width: "88%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-[#008C45] to-[#006633]"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="flex flex-col items-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Students</p>
                      <p className="font-semibold text-lg">1500</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Passing Students</p>
                      <p className="font-semibold text-lg">1320</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Percentage</p>
                      <p className="font-semibold text-lg">88%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="border shadow-sm h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Progress Statistics</CardTitle>
                <BarChart2 className="h-5 w-5 text-[#008C45]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-full">
                <div className="relative w-40 h-40 mb-4">
                  {/* Circular progress chart - outer ring */}
                  <div className="absolute inset-0 rounded-full border-8 border-gray-100 dark:border-gray-800"></div>
                  
                  {/* Pink segment - 65.2% */}
                  <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 0, 50% 0)' }}>
                    <div className="absolute inset-0 rounded-full border-8 border-pink-500 dark:border-pink-600" style={{ transform: 'rotate(125deg)' }}></div>
                  </div>
                  
                  {/* Purple segment - 25% */}
                  <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%, 0 100%, 0 50%)' }}>
                    <div className="absolute inset-0 rounded-full border-8 border-purple-500 dark:border-purple-600" style={{ transform: 'rotate(270deg)' }}></div>
                  </div>
                  
                  {/* Inner white circle */}
                  <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold">72.5%</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 w-full">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#e91e63] mr-2"></div>
                    <div>
                      <p className="text-xs">Mentoring</p>
                      <p className="text-xs font-semibold">65.2%</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#9c27b0] mr-2"></div>
                    <div>
                      <p className="text-xs">Organization</p>
                      <p className="text-xs font-semibold">25%</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#2196f3] mr-2"></div>
                    <div>
                      <p className="text-xs">Planning</p>
                      <p className="text-xs font-semibold">9.8%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Popular Courses */}
      <div>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Popular Courses</CardTitle>
                <CardDescription>Trending courses among students</CardDescription>
              </div>
              <div className="relative">
                <input type="text" placeholder="Search courses" className="px-3 py-1 text-sm border rounded-md w-40" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <span className="text-blue-600 text-xs">R</span>
                        </div>
                        <span>Introduction To React</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">Web Development</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span className="text-yellow-500">★</span>
                        <span className="ml-1">4.5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 w-32">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-[#008C45] to-[#006633] h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" className="bg-[#008C45] hover:bg-[#006633] text-white">Continue</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

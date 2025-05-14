'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, BookOpen, Database, FileText, HardDrive, Settings, ShieldCheck, Users } from 'lucide-react'

interface AdminDashboardProps {
  profile: any
  user: any
}

export function AdminDashboard({ profile, user }: AdminDashboardProps) {
  // Sample data for visualization - would be replaced with real data in production
  const userData = {
    total: 1,
    students: 0,
    faculty: 0,
    admins: 1
  }

  const courseData = {
    total: 0,
    active: 0,
    inactive: 0
  }

  const systemStatus = {
    status: 'Online',
    database: 'Connected',
    storage: 'Available'
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#FFF5E6] to-[#FFFAF0] dark:from-blue-950 dark:to-blue-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Users className="h-12 w-12 text-blue-500" />
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
              <Users className="mr-2 h-4 w-4 text-blue-500" />
              Manage Documents
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#F0F9FF] to-[#E6F7FF] dark:from-green-950 dark:to-green-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <BookOpen className="h-12 w-12 text-green-500" />
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
              <BookOpen className="mr-2 h-4 w-4 text-green-500" />
              Manage Images
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#FFFBEB] to-[#FFF8E1] dark:from-amber-950 dark:to-amber-900">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <HardDrive className="h-12 w-12 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-600 dark:text-gray-300">Others</CardDescription>
            <CardTitle className="text-3xl font-bold">234</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-amber-500 font-medium">1.2 GB</span>
                <span className="text-gray-600 dark:text-gray-300 ml-1">used</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: '28%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">28% of storage used</p>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors border-amber-300 text-amber-700 dark:text-amber-300">
              <Settings className="mr-2 h-4 w-4 text-amber-500" />
              Manage Files
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Administrative Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Administrative Actions</CardTitle>
                  <CardDescription>Manage system operations and maintenance</CardDescription>
                </div>
                <ShieldCheck className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">User Approvals</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Review and approve new user registrations
                        </p>
                        <Badge variant="outline">0 Pending</Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="outline" size="sm" className="w-full">
                        Manage Approvals
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card className="border shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Reports</CardTitle>
                        <BarChart3 className="h-4 w-4 text-pink-500" />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-sm text-muted-foreground">
                        Generate and view system reports and analytics
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="outline" size="sm" className="w-full">
                        View Reports
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                
                <Card className="border shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Backup & Restore</CardTitle>
                      <Database className="h-4 w-4 text-amber-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Manage system backups and restoration
                      </p>
                      <Badge variant="outline" className="bg-green-50">Last: Never</Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="outline" size="sm" className="w-full">
                      Backup Settings
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
                <CardTitle>System Metrics</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">Database Usage</p>
                    <p className="text-sm text-muted-foreground">5%</p>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '5%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">Storage Usage</p>
                    <p className="text-sm text-muted-foreground">2%</p>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '2%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">API Requests</p>
                    <p className="text-sm text-muted-foreground">0/day</p>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

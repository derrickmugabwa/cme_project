import { LogoutButton } from '@/components/logout-button'
import Link from 'next/link'
import { Bell, BarChart2, BookOpen, Calendar, Home, Search, Settings, User, FileText, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NavItemProps {
  href: string
  children: React.ReactNode
  active?: boolean
}

function NavItem({ href, children, active }: NavItemProps) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
        active 
          ? 'bg-sidebar-primary text-white font-medium' 
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground'
      }`}
    >
      {children}
    </Link>
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Create a Supabase client for server components
  const supabase = await createClient()
  
  // Get authenticated user - more secure than getSession()
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Authentication error:', userError)
    redirect('/auth/login')
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, role')
    .eq('id', user.id)
    .single()
  
  if (!profile) {
    redirect('/auth/login')
  }
  
  // Format role for display
  const formattedRole = profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
  // Get first letter of name for avatar
  const avatarInitial = (profile.full_name || profile.username || 'U').charAt(0).toUpperCase()
  return (
    <div className="min-h-screen flex">
      {/* Sidebar - fixed position with rounded corners */}
      <aside className="fixed left-0 top-0 z-30 h-screen hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-lg overflow-auto my-4 ml-4 rounded-2xl">
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-white font-bold">C</div>
              <h2 className="text-lg font-bold text-sidebar-foreground">CME Platform</h2>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 px-3">
            <div className="mb-3">
              <h2 className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">MAIN</h2>
            </div>
            
            <div className="space-y-1">
              <NavItem href="/dashboard" active>
                <Home className="h-4 w-4" />
                Dashboard
              </NavItem>
              <NavItem href="/dashboard/courses">
                <BookOpen className="h-4 w-4" />
                Courses
              </NavItem>
              <NavItem href="/dashboard/content">
                <FileText className="h-4 w-4" />
                Educational Content
              </NavItem>
              <NavItem href="/dashboard/attendance">
                <Calendar className="h-4 w-4" />
                Attendance
              </NavItem>
              <NavItem href="/dashboard/statistics">
                <BarChart2 className="h-4 w-4" />
                Statistics
              </NavItem>
            </div>
            
            <div className="mt-6 mb-2">
              <h2 className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">ACCOUNT</h2>
            </div>
            
            <div className="space-y-1">
              <NavItem href="/dashboard/profile">
                <User className="h-4 w-4" />
                Profile
              </NavItem>
              <NavItem href="/dashboard/settings">
                <Settings className="h-4 w-4" />
                Settings
              </NavItem>
            </div>
          </div>
          
          {/* Sidebar Footer */}
          <div className="mt-auto p-4">
            <div className="bg-sidebar-accent/20 rounded-xl p-4 border border-sidebar-accent/10">
              <p className="text-xs text-center text-sidebar-foreground/70">
                CME Platform v1.0
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2 md:hidden">
              <h1 className="text-xl font-bold">CME Platform</h1>
            </div>
            <div className="flex-1 mx-8 max-w-md">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search..." 
                  className="w-full pl-8 rounded-md border border-input bg-background" 
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
              </Button>
              
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-sm">{avatarInitial}</span>
                    </div>
                    <div className="hidden md:block">
                      <div className="flex items-center">
                        <p className="text-sm font-medium mr-1 text-gray-800">{profile.full_name || profile.username}</p>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex items-center">
                        <p className="text-xs text-gray-500">{profile.username}</p>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full font-medium shadow-sm">{formattedRole}</span>
                      </div>
                    </div>
                    
                    {/* Mobile view - just show avatar and role badge */}
                    <div className="md:hidden relative">
                      <span className="absolute -top-1 -right-1 text-[10px] w-4 h-4 flex items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full font-medium shadow-sm">{avatarInitial}</span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl p-2 border border-gray-200 shadow-lg">
                  <div className="flex items-center gap-3 px-2 py-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-lg">{avatarInitial}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{profile.full_name || profile.username}</p>
                      <div className="flex items-center">
                        <p className="text-xs text-gray-500">{profile.username}</p>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full font-medium shadow-sm">{formattedRole}</span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator className="my-2" />
                  
                  <DropdownMenuItem asChild className="rounded-lg hover:bg-gray-50 focus:bg-gray-50 cursor-pointer py-2">
                    <Link href="/dashboard/profile" className="flex items-center">
                      <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center mr-2">
                        <User className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">Profile</span>
                        <p className="text-xs text-gray-500">Manage your personal information</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild className="rounded-lg hover:bg-gray-50 focus:bg-gray-50 cursor-pointer py-2 mt-1">
                    <Link href="/dashboard/profile/account" className="flex items-center">
                      <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-2">
                        <Settings className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">Settings</span>
                        <p className="text-xs text-gray-500">Configure your account preferences</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-2" />
                  
                  <DropdownMenuItem className="rounded-lg hover:bg-red-50 focus:bg-red-50 cursor-pointer py-2">
                    <div className="flex items-center w-full">
                      <LogoutButton />
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

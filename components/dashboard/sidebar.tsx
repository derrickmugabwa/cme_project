'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Video, Calendar, BarChart2, User, Settings } from 'lucide-react'

interface NavItemProps {
  href: string
  children: React.ReactNode
}

function NavItem({ href, children }: NavItemProps) {
  const pathname = usePathname()
  
  // Check if the current path matches this nav item
  const isActive = 
    (href === '/dashboard' && pathname === '/dashboard') || 
    (pathname.startsWith(href) && href !== '/dashboard')
  
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
        isActive 
          ? 'bg-sidebar-primary text-white font-medium' 
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground'
      }`}
    >
      {children}
    </Link>
  )
}

export function Sidebar() {

  return (
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
            <NavItem href="/dashboard">
              <Home className="h-4 w-4" />
              Dashboard
            </NavItem>
            <NavItem href="/dashboard/content">
              <FileText className="h-4 w-4" />
              Educational Content
            </NavItem>
            <NavItem href="/dashboard/sessions">
              <Video className="h-4 w-4" />
              Webinars
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
  )
}

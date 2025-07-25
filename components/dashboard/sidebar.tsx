'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Home, FileText, Video, ClipboardCheck, Calendar, Coins, User, Settings, UsersRound, BarChart2, ChartNoAxesColumn, Award, X } from 'lucide-react'

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

export function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
          if (profile) {
            setUserRole(profile.role);
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    getUserRole();
  }, []);

  const isAdminOrFaculty = userRole === 'admin' || userRole === 'faculty';

  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen ${isOpen ? 'flex' : 'hidden'} md:flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-lg overflow-auto md:my-4 md:ml-4 md:rounded-2xl transition-all duration-300`}>
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-5 flex justify-between items-center">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-white font-bold">C</div>
            <h2 className="text-lg font-bold text-sidebar-foreground">CME Platform</h2>
          </div>
          {/* Close button for mobile */}
          {onClose && (
            <button 
              onClick={onClose} 
              className="md:hidden p-2 rounded-lg hover:bg-sidebar-accent/20"
            >
              <X className="h-5 w-5 text-sidebar-foreground" />
            </button>
          )}
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
            {userRole === 'user' && (
              <NavItem href="/dashboard/my-attendance">
                <ClipboardCheck className="h-4 w-4" />
                My Attendance
              </NavItem>
            )}
            {isAdminOrFaculty && (
              <NavItem href="/dashboard/attendance">
                <Calendar className="h-4 w-4" />
                Attendance Management
              </NavItem>
            )}
            <NavItem href="/dashboard/units">
              <Coins className="h-4 w-4" />
              Units Wallet
            </NavItem>
            <NavItem href="/dashboard/certificates">
              <Award className="h-4 w-4" />
              My Certificates
            </NavItem>
            {isAdminOrFaculty && (
              <NavItem href="/dashboard/admin/units">
                <Coins className="h-4 w-4" />
                Units Management
              </NavItem>
            )}
            {userRole === 'admin' && (
              <>
                <NavItem href="/dashboard/admin/users">
                  <UsersRound className="h-4 w-4" />
                  User Management
                </NavItem>
                <NavItem href="/dashboard/admin/payments">
                  <BarChart2 className="h-4 w-4" />
                  Payments Dashboard
                </NavItem>
                <NavItem href="/dashboard/admin/site">
                  <FileText className="h-4 w-4" />
                  Site Management
                </NavItem>
              </>
            )}
          </div>
          
          {/* Account section removed as not needed at the moment */}
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

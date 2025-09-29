'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Video, ClipboardCheck, Calendar, Coins, User, Settings, UsersRound, BarChart2, Award, X } from 'lucide-react'
import Image from 'next/image'

interface Logo {
  id: string;
  url: string;
  alt_text: string;
}

interface NavItemProps {
  href: string
  children: React.ReactNode
  onClose?: () => void
}

function NavItem({ href, children, onClose }: NavItemProps) {
  const pathname = usePathname()
  
  // Check if the current path matches this nav item
  const isActive = 
    (href === '/dashboard' && pathname === '/dashboard') || 
    (pathname.startsWith(href) && href !== '/dashboard')
  
  return (
    <Link 
      href={href} 
      onClick={onClose} // Close sidebar when navigation item is clicked
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



interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  logo: Logo | null;
  userRole: string;
}

export function Sidebar({ isOpen = false, onClose, logo, userRole }: SidebarProps) {
  // No loading state needed - role is passed directly from server
  const isAdminOrFaculty = userRole === 'admin' || userRole === 'faculty';
  const isAdmin = userRole === 'admin';

  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen ${isOpen ? 'flex' : 'hidden'} md:flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-lg overflow-auto md:my-4 md:ml-4 md:rounded-2xl transition-all duration-300`}>
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-5 flex justify-between items-center">
          <Link href="/" className="flex items-center mb-6">
            <div className="relative h-10 w-44">
              {logo ? (
                <Image
                  src={logo.url}
                  alt={logo.alt_text}
                  fill
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="h-10 w-44 bg-sidebar-primary/20 animate-pulse rounded flex items-center justify-center">
                  <span className="text-sidebar-foreground font-bold text-sm">METROPOLIS</span>
                </div>
              )}
            </div>
          </Link>
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
            {/* Universal items - always visible */}
            <NavItem href="/dashboard" onClose={onClose}>
              <Home className="h-4 w-4" />
              Dashboard
            </NavItem>
            <NavItem href="/dashboard/content" onClose={onClose}>
              <FileText className="h-4 w-4" />
              Educational Content
            </NavItem>
            <NavItem href="/dashboard/sessions" onClose={onClose}>
              <Video className="h-4 w-4" />
              Webinars
            </NavItem>
            
            {/* Role-based items - no loading needed */}
            {userRole === 'user' && (
              <NavItem href="/dashboard/my-attendance" onClose={onClose}>
                <ClipboardCheck className="h-4 w-4" />
                My Attendance
              </NavItem>
            )}
            {isAdminOrFaculty && (
              <NavItem href="/dashboard/attendance" onClose={onClose}>
                <Calendar className="h-4 w-4" />
                Attendance Management
              </NavItem>
            )}
            
            {/* More universal items */}
            <NavItem href="/dashboard/units" onClose={onClose}>
              <Coins className="h-4 w-4" />
              Units Wallet
            </NavItem>
            <NavItem href="/dashboard/certificates" onClose={onClose}>
              <Award className="h-4 w-4" />
              My Certificates
            </NavItem>
            
            {/* Admin/Faculty specific items - no loading needed */}
            {isAdminOrFaculty && (
              <NavItem href="/dashboard/admin/units" onClose={onClose}>
                <Coins className="h-4 w-4" />
                Units Management
              </NavItem>
            )}
            {isAdmin && (
              <>
                <NavItem href="/dashboard/admin/users" onClose={onClose}>
                  <UsersRound className="h-4 w-4" />
                  User Management
                </NavItem>
                <NavItem href="/dashboard/admin/payments" onClose={onClose}>
                  <BarChart2 className="h-4 w-4" />
                  Payments Dashboard
                </NavItem>
                <NavItem href="/dashboard/admin/site" onClose={onClose}>
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
              v1.0.0
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

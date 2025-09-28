'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LogoutButton } from '@/components/logout-button'
import { Bell, ChevronDown, Search, User, Settings, Menu } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Logo } from '@/lib/logo-service'

interface DashboardShellProps {
  children: React.ReactNode
  profile: {
    username: string
    full_name?: string
    role: string
  }
  formattedRole: string
  avatarInitial: string
  logo: Logo | null
}

export function DashboardShell({
  children,
  profile,
  formattedRole,
  avatarInitial,
  logo,
}: DashboardShellProps) {
  // State for mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex">
      {/* Sidebar component with mobile toggle */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        logo={logo}
        userRole={profile.role}
      />
      
      {/* Mobile overlay when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3 md:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(true)}
                className="h-9 w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
              {/* Logo with green triangle background */}
              <div 
                className="h-8 w-32 relative p-1 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#008C45' }}
              >
                {logo ? (
                  <Image
                    src={logo.url}
                    alt={logo.alt_text}
                    fill
                    className="object-contain p-0.5"
                  />
                ) : (
                  <div className="h-6 w-28 bg-white/20 animate-pulse rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">METROPOLIS</span>
                  </div>
                )}
              </div>
            </div>
            {/* Search bar removed for cleaner mobile experience */}
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
              </Button>
              
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">{profile.full_name || profile.username}</p>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-sidebar-primary text-white rounded-full font-medium">{formattedRole}</span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl p-2 border border-gray-200 shadow-lg">
                  <div className="flex flex-col gap-1 px-2 py-3">
                    <p className="font-semibold text-gray-800">{profile.full_name || profile.username}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">{profile.username}</p>
                      <span className="text-xs px-2 py-0.5 bg-sidebar-primary text-white rounded-full font-medium">{formattedRole}</span>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator className="my-2" />
                  
                  <DropdownMenuItem asChild className="rounded-lg hover:bg-gray-50 focus:bg-gray-50 cursor-pointer py-2">
                    <Link href="/dashboard/profile" className="flex items-center">
                      <div className="h-8 w-8 rounded-lg bg-sidebar-primary/10 flex items-center justify-center mr-2">
                        <User className="h-4 w-4 text-sidebar-primary" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">Profile</span>
                        <p className="text-xs text-gray-500">Manage your personal information</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild className="rounded-lg hover:bg-gray-50 focus:bg-gray-50 cursor-pointer py-2 mt-1">
                    <Link href="/dashboard/profile/account" className="flex items-center">
                      <div className="h-8 w-8 rounded-lg bg-sidebar-primary/10 flex items-center justify-center mr-2">
                        <Settings className="h-4 w-4 text-sidebar-primary" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">Settings</span>
                        <p className="text-xs text-gray-500">Configure your account preferences</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-2" />
                  
                  <DropdownMenuItem className="rounded-lg hover:bg-red-50 focus:bg-red-50 cursor-pointer py-2">
                    <LogoutButton />
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

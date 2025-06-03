'use client'

import { useState } from 'react'
import Link from 'next/link'
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

interface DashboardShellProps {
  children: React.ReactNode
  profile: {
    username: string
    full_name?: string
    role: string
  }
  formattedRole: string
  avatarInitial: string
}

export function DashboardShell({
  children,
  profile,
  formattedRole,
  avatarInitial,
}: DashboardShellProps) {
  // State for mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex">
      {/* Sidebar component with mobile toggle */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
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

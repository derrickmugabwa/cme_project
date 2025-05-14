'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'
import { Database } from '@/lib/database.types'
import { StudentDashboard } from '@/components/dashboard/student-dashboard'
import { FacultyDashboard } from '@/components/dashboard/faculty-dashboard'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CalendarDays, Clock, User } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient()
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Error fetching user:', userError)
        return redirect('/auth/login')
      }
      
      setUser(user)
      
      // Get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.error('Error fetching profile:', profileError)
      } else {
        setProfile(profile)
      }
      
      setLoading(false)
    }
    
    fetchUserData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  return (
    <div>
      {/* Page header with welcome message */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {profile?.full_name || user?.email?.split('@')[0]}</h2>
          <p className="text-muted-foreground">
            Here's what's happening with your account today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900 px-3 py-1.5 rounded-full border border-pink-200 dark:border-pink-800">
            <div className="h-2 w-2 rounded-full bg-pink-500"></div>
            <span className="text-sm font-medium text-pink-700 dark:text-pink-300">4 of 10 modules completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600 text-xs">D</span>
            </div>
            <span className="font-medium">Davis</span>
          </div>
        </div>
      </div>


      
      {/* Role-specific dashboard content */}
      {profile?.role === 'student' && <StudentDashboard profile={profile} user={user} />}
      {profile?.role === 'faculty' && <FacultyDashboard profile={profile} user={user} />}
      {profile?.role === 'admin' && <AdminDashboard profile={profile} user={user} />}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'
import { Database } from '@/lib/database.types'
import { UserDashboard } from '@/components/dashboard/user-dashboard'
import { FacultyDashboard } from '@/components/dashboard/faculty-dashboard'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { CalendarDays, Clock, User } from 'lucide-react'
import { LoadingPage } from '@/components/ui/loading-spinner'

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
    return <LoadingPage />
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
      </div>


      
      {/* Role-specific dashboard content */}
      {profile?.role === 'user' && <UserDashboard profile={profile} user={user} />}
      {profile?.role === 'faculty' && <FacultyDashboard profile={profile} user={user} />}
      {profile?.role === 'admin' && <AdminDashboard profile={profile} user={user} />}
    </div>
  )
}

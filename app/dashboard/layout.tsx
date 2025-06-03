import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

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
    <DashboardShell 
      profile={profile}
      formattedRole={formattedRole}
      avatarInitial={avatarInitial}
    >
      {children}
    </DashboardShell>
  )
}

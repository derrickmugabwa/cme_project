import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { AppearanceForm } from '@/components/profile/appearance-form'
import { ProfileSidebar } from '@/components/profile/profile-sidebar'

export default async function AppearancePage() {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/auth/login')
  }
  
  // Get user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
  
  if (!profile) {
    redirect('/dashboard')
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and set e-mail preferences.
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 lg:w-1/4">
          <ProfileSidebar activeTab="appearance" userRole={profile.role} />
        </div>
        <div className="flex-1">
          <AppearanceForm profile={profile} />
        </div>
      </div>
    </div>
  )
}

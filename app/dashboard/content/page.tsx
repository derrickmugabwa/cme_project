import { createClient } from '@/lib/server'
import { ContentList } from '@/components/content/content-list'
import { redirect } from 'next/navigation'

export default async function ContentPage() {
  const supabase = await createClient()
  
  // Use getUser() instead of getSession() for better security
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Authentication error:', userError)
    redirect('/auth/login')
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile) {
    redirect('/auth/login')
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Educational Content</h2>
        <p className="text-muted-foreground">
          {profile.role === 'faculty' || profile.role === 'admin' 
            ? 'Manage and share educational materials with your students.' 
            : 'Access educational materials for your courses.'}
        </p>
      </div>
      
      <ContentList userId={user.id} userRole={profile.role} />
    </div>
  )
}

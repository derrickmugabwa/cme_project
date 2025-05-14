import { createClient } from '@/lib/server'
import { UploadContentForm } from '@/components/content/upload-content-form'
import { redirect } from 'next/navigation'

export default async function UploadContentPage() {
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
  
  // Only faculty and admin can access this page
  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }
  
  return (
    <div>
      <UploadContentForm userId={user.id} />
    </div>
  )
}

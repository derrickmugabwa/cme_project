import { Metadata } from 'next';
import AdminUnitsClient from './client';
import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Units Management',
  description: 'Manage user units and session requirements',
};

async function checkAdminAccess() {
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Check if user is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }
  
  return true;
}

export default async function AdminUnitsPage() {
  await checkAdminAccess();
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Units Management</h1>
        <p className="text-muted-foreground">
          Manage user units and session unit requirements
        </p>
      </div>
      
      <AdminUnitsClient />
    </div>
  );
}

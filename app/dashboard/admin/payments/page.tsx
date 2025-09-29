import { Metadata } from 'next';
import AdminPaymentsClient from './client';
import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payments Dashboard',
  description: 'Track and manage payment transactions',
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

export default async function AdminPaymentsPage() {
  await checkAdminAccess();
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Payments Dashboard</h1>
        <p className="text-muted-foreground">
          Track and manage payment transactions
        </p>
      </div>
      
      <AdminPaymentsClient />
    </div>
  );
}

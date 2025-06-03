import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import { CertificatesList, CertificatesListSkeleton } from '@/components/certificates/certificates-list';
import { Suspense } from 'react';

export const metadata = {
  title: 'My Certificates | CME Platform',
  description: 'View and download your earned certificates'
};

export default async function CertificatesPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Certificates</h1>
        <p className="text-muted-foreground">
          View and download certificates for completed webinars
        </p>
      </div>
      
      <Suspense fallback={<CertificatesListSkeleton />}>
        <CertificatesList userId={user.id} />
      </Suspense>
    </div>
  );
}

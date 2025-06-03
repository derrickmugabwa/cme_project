'use client';

import { useState, useEffect } from 'react';
import { CertificateCard } from './certificate-card';
import { LoadingSection } from '../ui/loading-spinner';

type Certificate = {
  id: string;
  certificate_number: string;
  issued_at: string;
  downloaded_at: string | null;
  sessions: {
    title: string;
    start_time: string;
  };
};

interface CertificatesListProps {
  userId: string;
}

export function CertificatesList({ userId }: CertificatesListProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCertificates() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/certificates?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch certificates');
        }
        
        const data = await response.json();
        setCertificates(data.certificates || []);
      } catch (error: any) {
        console.error('Error fetching certificates:', error);
        setError(error.message || 'An error occurred while fetching certificates');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCertificates();
  }, [userId]);
  
  if (loading) {
    return <CertificatesListSkeleton />;
  }
  
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!certificates || certificates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-lg font-medium">No Certificates Yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete webinars and get your attendance approved to earn certificates.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {certificates.map((certificate) => (
        <CertificateCard key={certificate.id} certificate={certificate} />
      ))}
    </div>
  );
}

export function CertificatesListSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingSection />
      <p className="mt-4 text-sm text-muted-foreground">Loading certificates...</p>
    </div>
  );
}

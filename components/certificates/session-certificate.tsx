"use client";

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui/button';
import { LoadingInline } from '../ui/loading-spinner';
import { toast } from '../ui/use-toast';

interface SessionCertificateProps {
  sessionId: string;
  userId: string;
}

type Certificate = {
  id: string;
  certificate_number: string;
  issued_at: string;
};

export function SessionCertificate({ sessionId, userId }: SessionCertificateProps) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  
  useEffect(() => {
    async function checkCertificate() {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/certificates/check?sessionId=${sessionId}&userId=${userId}`);
        
        if (!response.ok) {
          // If the response is not OK, it might mean there's no certificate
          // or there was an error. Either way, we set certificate to null.
          setCertificate(null);
          return;
        }
        
        const data = await response.json();
        setCertificate(data.certificate || null);
      } catch (error) {
        console.error('Error checking certificate:', error);
        setCertificate(null);
      } finally {
        setLoading(false);
      }
    }
    
    checkCertificate();
  }, [sessionId, userId]);
  
  const handleDownload = async () => {
    if (!certificate) return;
    
    try {
      setDownloading(true);
      
      // Create a URL to the download endpoint
      const downloadUrl = `/api/certificates/download?id=${certificate.id}`;
      
      // Open the URL in a new tab/window
      window.open(downloadUrl, '_blank');
      
      // Wait a moment before setting downloading to false
      // This is just for UX to show the loading state
      setTimeout(() => {
        setDownloading(false);
      }, 1500);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      setDownloading(false);
      toast({
        title: 'Error',
        description: 'Failed to download certificate. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  if (loading) {
    return (
      <div className="py-4 border-b">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Certificate</h3>
        <div className="flex items-center space-x-2">
          <LoadingInline />
          <span className="text-sm">Checking certificate status...</span>
        </div>
      </div>
    );
  }
  
  if (!certificate) {
    return (
      <div className="py-4 border-b">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Certificate</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-700">
            No certificate available. Certificates are issued when your attendance is approved.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-4 border-b">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Certificate</h3>
      <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
        <p className="text-sm text-green-700">
          Your certificate is ready! You can download it using the button below.
        </p>
      </div>
      <Button
        onClick={handleDownload}
        disabled={downloading}
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-center gap-2"
      >
        {downloading ? (
          <>
            <LoadingInline />
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Download Certificate</span>
          </>
        )}
      </Button>
    </div>
  );
}

'use client';

import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { LoadingInline } from '../ui/loading-spinner';
import { useState } from 'react';

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

interface CertificateCardProps {
  certificate: Certificate;
}

export function CertificateCard({ certificate }: CertificateCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Create a URL to the download endpoint
      const downloadUrl = `/api/certificates/download?id=${certificate.id}`;
      
      // Open the URL in a new tab/window
      window.open(downloadUrl, '_blank');
      
      // Wait a moment before setting isDownloading to false
      // This is just for UX to show the loading state
      setTimeout(() => {
        setIsDownloading(false);
      }, 1500);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      setIsDownloading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="text-lg font-semibold">
          {certificate.sessions.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Certificate Number:</span>
            <span className="text-sm font-medium">{certificate.certificate_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Issued Date:</span>
            <span className="text-sm font-medium">
              {format(new Date(certificate.issued_at), 'MMM dd, yyyy')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Session Date:</span>
            <span className="text-sm font-medium">
              {format(new Date(certificate.sessions.start_time), 'MMM dd, yyyy')}
            </span>
          </div>
          {certificate.downloaded_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Downloaded:</span>
              <span className="text-sm font-medium">
                {format(new Date(certificate.downloaded_at), 'MMM dd, yyyy')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/20 px-6 py-3">
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="ml-auto flex items-center gap-2 bg-[#008C45] hover:bg-[#006633] text-white"
        >
          {isDownloading ? (
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
      </CardFooter>
    </Card>
  );
}

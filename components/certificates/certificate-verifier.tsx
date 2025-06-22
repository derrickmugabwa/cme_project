"use client";

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { LoadingInline } from '../ui/loading-spinner';

type VerificationResult = {
  valid: boolean;
  certificate?: {
    id: string;
    userFullName: string;
    sessionTitle: string;
    issuedAt: string;
  };
  message?: string;
};

type CertificateVerifierProps = {
  initialCertificateNumber?: string;
};

export function CertificateVerifier({ initialCertificateNumber = '' }: CertificateVerifierProps) {
  const [certificateNumber, setCertificateNumber] = useState(initialCertificateNumber);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  
  const handleVerify = useCallback(async () => {
    if (!certificateNumber.trim()) return;

    try {
      setIsVerifying(true);
      setResult(null);

      const response = await fetch(
        `/api/certificates/verify?id=${encodeURIComponent(certificateNumber)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error verifying certificate:', error);
      setResult({
        valid: false,
        message: 'An error occurred while verifying the certificate'
      });
    } finally {
      setIsVerifying(false);
    }
  }, [certificateNumber]);

  // Auto-verify when initialCertificateNumber is provided
  useEffect(() => {
    if (initialCertificateNumber) {
      handleVerify();
    }
  }, [initialCertificateNumber, handleVerify]);



  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Certificate Verification</CardTitle>
        <CardDescription>
          Enter a certificate number to verify its authenticity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Input
              type="text"
              placeholder="Enter certificate number (e.g., CERT-12345678-87654321-20250603)"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleVerify}
              disabled={isVerifying || !certificateNumber.trim()}
              className="flex items-center gap-2"
            >
              {isVerifying ? (
                <>
                  <LoadingInline />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Verify</span>
                </>
              )}
            </Button>
          </div>

          {result && (
            <div
              className={`mt-6 rounded-lg p-6 ${result.valid ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`rounded-full p-2 ${result.valid ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}
                >
                  {result.valid ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3
                    className={`text-lg font-medium ${result.valid ? 'text-green-800' : 'text-red-800'}`}
                  >
                    {result.valid
                      ? 'Certificate is Valid'
                      : 'Certificate is Invalid'}
                  </h3>
                  {result.valid && result.certificate ? (
                    <div className="mt-4 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-sm font-medium text-gray-600">
                          Certificate ID:
                        </span>
                        <span className="text-sm">{result.certificate.id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-sm font-medium text-gray-600">
                          Recipient:
                        </span>
                        <span className="text-sm">
                          {result.certificate.userFullName}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-sm font-medium text-gray-600">
                          Webinar:
                        </span>
                        <span className="text-sm">
                          {result.certificate.sessionTitle}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-sm font-medium text-gray-600">
                          Issued Date:
                        </span>
                        <span className="text-sm">
                          {format(
                            new Date(result.certificate.issuedAt),
                            'MMMM dd, yyyy'
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-red-600">
                      {result.message ||
                        'This certificate number does not exist in our records.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

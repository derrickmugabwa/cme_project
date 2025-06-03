"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/ui/loading-spinner';

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

export default function VerifyCertificateIdPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyCertificate() {
      try {
        setLoading(true);
        setError(null);

        const certificateNumber = params.id as string;
        
        if (!certificateNumber) {
          setError('Certificate number is missing');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/certificates/verify?id=${encodeURIComponent(certificateNumber)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to verify certificate');
        }

        const data = await response.json();
        setResult(data);
      } catch (error: any) {
        console.error('Error verifying certificate:', error);
        setError(error.message || 'An error occurred while verifying the certificate');
      } finally {
        setLoading(false);
      }
    }

    verifyCertificate();
  }, [params.id]);

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Verification Error</h2>
          <p className="text-red-700">{error}</p>
          <Button
            onClick={() => router.push('/verify')}
            variant="outline"
            className="mt-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Verification
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12">
      {result ? (
        <div
          className={`rounded-lg p-8 ${result.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div
              className={`rounded-full p-4 mb-4 ${result.valid ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}
            >
              {result.valid ? (
                <CheckCircle className="h-12 w-12" />
              ) : (
                <XCircle className="h-12 w-12" />
              )}
            </div>
            <h2
              className={`text-2xl font-bold mb-2 ${result.valid ? 'text-green-800' : 'text-red-800'}`}
            >
              {result.valid
                ? 'Certificate is Valid'
                : 'Certificate is Invalid'}
            </h2>
            <p className="text-gray-600">
              Certificate Number: <span className="font-medium">{params.id as string}</span>
            </p>
          </div>

          {result.valid && result.certificate ? (
            <div className="bg-white rounded-lg border p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Certificate Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">
                    Certificate ID:
                  </span>
                  <span className="text-sm sm:text-right">{result.certificate.id}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">
                    Recipient:
                  </span>
                  <span className="text-sm sm:text-right font-medium">
                    {result.certificate.userFullName}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">
                    Webinar:
                  </span>
                  <span className="text-sm sm:text-right">
                    {result.certificate.sessionTitle}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
                  <span className="text-sm font-medium text-gray-600">
                    Issued Date:
                  </span>
                  <span className="text-sm sm:text-right">
                    {format(
                      new Date(result.certificate.issuedAt),
                      'MMMM dd, yyyy'
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-100 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-center">
                {result.message ||
                  'This certificate number does not exist in our records.'}
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={() => router.push('/verify')}
              variant="outline"
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Verification
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p>No verification result available.</p>
          <Button
            onClick={() => router.push('/verify')}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Verification
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';

export default function PaymentCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');
  
  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('error');
        setMessage('Invalid payment reference');
        return;
      }
      
      try {
        // Get the current session to include the access token
        const { data: { session } } = await supabase.auth.getSession();
        
        // We need to include the auth token in the verification request
        // even though we've made the endpoint not require auth on the server side
        const response = await fetch(`/api/payments/paystack/verify/${reference}`, {
          headers: {
            'Authorization': session ? `Bearer ${session.access_token}` : ''
          }
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
          setStatus('success');
          setMessage(`${data.units} units have been added to your account`);
        } else {
          setStatus('error');
          setMessage(data.message || 'Payment verification failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying your payment');
      }
    };
    
    verifyPayment();
  }, [reference]);
  
  return (
    <div className="flex items-center justify-center h-[90vh] p-4 mt-[-5vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment {status === 'success' ? 'Successful' : status === 'error' ? 'Failed' : 'Processing'}</CardTitle>
          <CardDescription>
            {status === 'loading' ? 'Verifying your payment...' : 'Payment verification complete'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
          {status === 'loading' && (
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
          )}
          
          {status === 'success' && (
            <CheckCircle className="h-16 w-16 text-green-500" />
          )}
          
          {status === 'error' && (
            <XCircle className="h-16 w-16 text-red-500" />
          )}
          
          <p className="text-center text-muted-foreground">{message}</p>
          
          <Button 
            onClick={() => router.push('/dashboard/units')} 
            className="mt-4"
          >
            Return to Units Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

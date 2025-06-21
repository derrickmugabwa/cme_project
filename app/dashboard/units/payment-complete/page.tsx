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
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'warning'>('loading');
  const [message, setMessage] = useState('');
  // Paystack parameters
  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');
  
  // PesaPal parameters
  const orderTrackingId = searchParams.get('OrderTrackingId');
  const orderMerchantReference = searchParams.get('OrderMerchantReference');
  
  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  useEffect(() => {
    // Track if the component is mounted to prevent state updates after unmount
    let isMounted = true;
    // Store interval and timeout IDs for cleanup
    let pollIntervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Function to clean up all timers
    const cleanupTimers = () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
      if (timeoutId) clearTimeout(timeoutId);
      pollIntervalId = null;
      timeoutId = null;
    };
    const verifyPayment = async () => {
      try {
        // Get the session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        // Determine which payment method was used
        let paymentMethod = 'unknown';
        let response;
        
        if (reference) {
          paymentMethod = 'paystack';
          response = await fetch(`/api/payments/paystack/verify/${reference}`, {
            headers: {
              'Authorization': session ? `Bearer ${session.access_token}` : ''
            }
          });
        } else if (orderTrackingId && orderMerchantReference) {
          paymentMethod = 'pesapal';
          response = await fetch(`/api/payments/pesapal/verify/${orderTrackingId}`, {
            headers: {
              'Authorization': session ? `Bearer ${session.access_token}` : ''
            }
          });
        } else {
          // No valid payment parameters found
          if (isMounted) {
            setStatus('error');
            setMessage('Invalid payment parameters');
          }
          return;
        }
        
        const data = await response.json();
        
        console.log(`${paymentMethod} payment verification response:`, data);
        
        if (response.ok && data.success) {
          // Check if the payment is completed or still pending
          if (data.status === 'pending') {
            if (isMounted) {
              setStatus('loading');
              setMessage(data.message || 'Your payment is being processed. This may take a few moments.');
            }
            
            // Set up polling to check payment status every 5 seconds
            pollIntervalId = setInterval(async () => {
              try {
                // Check if component is still mounted
                if (!isMounted) {
                  cleanupTimers();
                  return;
                }
                
                const pollResponse = paymentMethod === 'paystack'
                  ? await fetch(`/api/payments/paystack/verify/${reference}`, {
                      headers: { 'Authorization': session ? `Bearer ${session.access_token}` : '' }
                    })
                  : await fetch(`/api/payments/pesapal/verify/${orderTrackingId}`, {
                      headers: { 'Authorization': session ? `Bearer ${session.access_token}` : '' }
                    });
                
                const pollData = await pollResponse.json();
                console.log('Payment status poll:', pollData);
                
                // Check if component is still mounted before updating state
                if (!isMounted) return;
                
                console.log('Processing poll data:', pollData);
                
                // Normalize status to lowercase for case-insensitive comparison
                const normalizedStatus = (pollData.status || '').toLowerCase();
                
                // Check for completed status in various formats
                if (normalizedStatus === 'completed' || 
                    normalizedStatus === 'complete' ||
                    (pollData.success === true && normalizedStatus !== 'pending' && normalizedStatus !== 'failed')) {
                  console.log('Payment completed successfully');
                  cleanupTimers();
                  setStatus('success');
                  setMessage(`${pollData.units} units have been added to your account`);
                } else if (normalizedStatus === 'failed') {
                  console.log('Payment failed');
                  cleanupTimers();
                  setStatus('error');
                  setMessage(pollData.message || 'Payment failed');
                } else {
                  console.log('Payment still pending, continuing to poll');
                }
              } catch (error) {
                console.error('Error polling payment status:', error);
              }
            }, 5000); // Poll every 5 seconds
            
            // Clear interval after 2 minutes (24 attempts) to avoid infinite polling
            timeoutId = setTimeout(() => {
              if (isMounted && pollIntervalId) {
                clearInterval(pollIntervalId);
                setStatus('warning');
                setMessage('Payment verification is taking longer than expected. Please check your account balance or contact support.');
              }
            }, 120000);
          } else {
            // Payment is already completed
            if (isMounted) {
              setStatus('success');
              setMessage(`${data.units} units have been added to your account`);
            }
          }
        } else {
          if (isMounted) {
            setStatus('error');
            setMessage(data.message || 'Payment verification failed');
          }
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        if (isMounted) {
          setStatus('error');
          setMessage('An error occurred while verifying payment');
        }
      }
    };
    
    verifyPayment();
    
    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      isMounted = false;
      cleanupTimers();
    };
  }, [reference, orderTrackingId, orderMerchantReference, router, supabase]);
  
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

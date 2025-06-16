# Implementation Plan: M-Pesa and Paystack Integration for Units System

## 1. Overview

This document outlines the implementation plan for integrating M-Pesa and Paystack payment methods into the existing units system. The integration will enable users to top up their units balance using either payment option.

## 2. Current System Analysis

The current units system consists of:
- Database tables: `user_units`, `unit_transactions`
- SQL functions: `topup_user_units` for adding units to user accounts
- API endpoints: `/api/units` for retrieving user units balance
- Frontend components: `UserUnitsWallet` for displaying units and transaction history

According to the existing implementation, a modern top-up card UI with tabs for M-Pesa and Paystack has already been created, but the actual payment processing logic is still a placeholder.

## 3. Database Schema Updates

```sql
-- Create payment_transactions table
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  payment_method TEXT NOT NULL, -- 'mpesa' or 'paystack'
  provider_transaction_id TEXT, -- Transaction ID from payment provider
  provider_reference TEXT, -- Reference from payment provider
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  units_purchased INTEGER,
  metadata JSONB, -- Store provider-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own transactions
CREATE POLICY "Users can view their own payment transactions"
  ON payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for admins to view all transactions
CREATE POLICY "Admins can view all payment transactions"
  ON payment_transactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- Create payment_settings table for admin configuration
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'mpesa' or 'paystack'
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL, -- Store API keys, endpoints, etc.
  units_per_currency DECIMAL(10,2) NOT NULL DEFAULT 1.0, -- How many units per currency unit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage payment settings
CREATE POLICY "Admins can manage payment settings"
  ON payment_settings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));
```

## 4. Environment Variables

Add the following environment variables to `.env.local`:

```
# M-Pesa API Credentials
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_PASSKEY=your_mpesa_passkey
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_CALLBACK_URL=https://your-domain.com/api/payments/mpesa/callback

# Paystack API Credentials
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_CALLBACK_URL=https://your-domain.com/dashboard/units/payment-complete
```

## 5. Backend API Endpoints

### 5.1. M-Pesa Integration

#### 5.1.1. Initiate M-Pesa Payment

Create a new API endpoint at `app/api/payments/mpesa/initiate/route.ts` to initiate M-Pesa STK Push:

- Accept `amount`, `phone`, and `units` parameters
- Authenticate with M-Pesa API
- Generate timestamp and password
- Send STK Push request
- Create a pending transaction record
- Return checkout request ID and transaction ID

#### 5.1.2. M-Pesa Callback Handler

Create a new API endpoint at `app/api/payments/mpesa/callback/route.ts` to handle M-Pesa callbacks:

- Receive callback data from M-Pesa
- Find the corresponding transaction using checkout request ID
- If payment successful:
  - Update transaction status to 'completed'
  - Add units to user's wallet using `topup_user_units` function
- If payment failed:
  - Update transaction status to 'failed'
- Return appropriate response to M-Pesa

#### 5.1.3. Check M-Pesa Payment Status

Create a new API endpoint at `app/api/payments/mpesa/status/[id]/route.ts` to check payment status:

- Accept transaction ID as parameter
- Retrieve transaction details from database
- Return transaction status, amount, and units purchased

### 5.2. Paystack Integration

#### 5.2.1. Initiate Paystack Payment

Create a new API endpoint at `app/api/payments/paystack/initiate/route.ts` to initiate Paystack payment:

- Accept `amount`, `email`, and `units` parameters
- Create a pending transaction record
- Initialize Paystack transaction
- Return authorization URL for redirect

#### 5.2.2. Paystack Webhook Handler

Create a new API endpoint at `app/api/payments/paystack/webhook/route.ts` to handle Paystack webhooks:

- Verify webhook signature
- Process charge.success events
- Find the corresponding transaction using reference
- Update transaction status
- Add units to user's wallet
- Return success response

#### 5.2.3. Verify Paystack Payment

Create a new API endpoint at `app/api/payments/paystack/verify/[reference]/route.ts` to verify Paystack payments:

- Accept reference as parameter
- Verify transaction with Paystack API
- If verified and successful:
  - Update transaction status if still pending
  - Add units to user's wallet if not already added
- Return verification result

## 6. Frontend Components

### 6.1. Update Existing Units Client Component

The payment UI is already implemented in `app/dashboard/units/client.tsx` with tabs for M-Pesa and Paystack. We need to update the payment processing logic in this file:

```typescript
// app/dashboard/units/client.tsx

// Replace the placeholder handleTopup function with actual implementation:
const handleTopup = async (method: 'mpesa' | 'paystack') => {
  if (topupAmount < 5) {
    toast({
      title: "Invalid amount",
      description: "Minimum top-up amount is 5 units",
      variant: "destructive",
    });
    return;
  }
  
  // For M-Pesa, validate mobile number
  if (method === 'mpesa' && !mobileNumber) {
    toast({
      title: "Missing mobile number",
      description: "Please enter your M-Pesa mobile number",
      variant: "destructive",
    });
    return;
  }

  setIsProcessing(true);

  try {
    // Step 1: Create a payment transaction
    const initResponse = await fetch('/api/units/topup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unitsAmount: topupAmount,
        paymentMethod: method
      }),
    });
    
    const initData = await initResponse.json();
    
    if (!initResponse.ok) {
      throw new Error(initData.error || 'Failed to initiate payment');
    }
    
    // Step 2: Process payment based on method
    if (method === 'mpesa') {
      // Initiate M-Pesa payment
      const mpesaResponse = await fetch('/api/payments/mpesa/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: initData.transaction_id,
          phone_number: mobileNumber
        }),
      });
      
      const mpesaData = await mpesaResponse.json();
      
      if (!mpesaResponse.ok) {
        throw new Error(mpesaData.error || 'Failed to initiate M-Pesa payment');
      }
      
      toast({
        title: "Payment initiated",
        description: "Please check your phone to complete the M-Pesa payment",
      });
      
      // Start polling for payment status
      pollPaymentStatus(initData.transaction_id);
    } else {
      // Initiate Paystack payment
      const paystackResponse = await fetch('/api/payments/paystack/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: initData.transaction_id,
          email: email || 'user@example.com' // In a real app, get user's email from profile
        }),
      });
      
      const paystackData = await paystackResponse.json();
      
      if (!paystackResponse.ok) {
        throw new Error(paystackData.error || 'Failed to initiate Paystack payment');
      }
      
      // Redirect to Paystack payment page
      window.location.href = paystackData.authorization_url;
    }
  } catch (error) {
    console.error('Payment error:', error);
    toast({
      title: "Payment failed",
      description: error instanceof Error ? error.message : "An unexpected error occurred",
      variant: "destructive",
    });
    setIsProcessing(false);
  }
};

// Add function to poll payment status
const pollPaymentStatus = async (transactionId: string) => {
  const maxAttempts = 10;
  let attempts = 0;
  
  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/payments/status?transaction_id=${transactionId}`);
      const data = await response.json();
      
      if (data.transaction?.status === 'completed') {
        // Payment successful
        toast({
          title: "Payment successful",
          description: `${data.transaction.units_purchased} units have been added to your account`,
        });
        setIsProcessing(false);
        
        // Refresh units data
        fetchUnits();
        fetchTransactions();
        return;
      } else if (data.transaction?.status === 'failed') {
        // Payment failed
        toast({
          title: "Payment failed",
          description: "Your payment could not be processed",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
      // If still pending and not exceeded max attempts, check again
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 5000); // Check every 5 seconds
      } else {
        // Max attempts reached, but don't mark as failed yet
        toast({
          title: "Payment pending",
          description: "Your payment is being processed. Check your units balance later.",
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: "Error checking payment",
        description: "Could not verify payment status",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };
  
  // Start checking status
  setTimeout(checkStatus, 5000); // Wait 5 seconds before first check
};
```

### 6.2. Payment Completion Page

Create a payment completion page at `app/dashboard/units/payment-complete/page.tsx` to handle Paystack redirects:

```typescript
// app/dashboard/units/payment-complete/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function PaymentCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');
  
  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('error');
        setMessage('Invalid payment reference');
        return;
      }
      
      try {
        const response = await fetch(`/api/payments/paystack/verify/${reference}`);
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
    <div className="container max-w-md py-12">
      <Card>
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
```

### 6.3. Transaction History Display

The transaction history display is already implemented in the units client component and will automatically show the new payment transactions once they're added to the database.

## 7. Security Considerations

1. **API Key Protection**:
   - Store all API keys in environment variables
   - Never expose API keys in client-side code

2. **Webhook Verification**:
   - Verify Paystack webhook signatures
   - Validate M-Pesa callback data

3. **Transaction Validation**:
   - Verify that the user owns the transaction before processing
   - Implement idempotency to prevent duplicate processing

4. **Error Handling**:
   - Log all payment errors
   - Provide clear error messages to users
   - Implement retry mechanisms for failed payments

## 8. Testing Plan

1. **Local Testing**:
   - Use sandbox/test environments for both payment providers
   - Test with minimal amounts
   - Verify all success and error paths

2. **Integration Testing**:
   - Test the complete payment flow from UI to database
   - Verify units are correctly added to user accounts
   - Test webhook handling with mock data

3. **Production Testing**:
   - Perform controlled tests in production
   - Monitor logs for any errors
   - Verify transaction records and units balance

## 9. Deployment Strategy

1. **Database Migration**:
   - Apply database schema changes first
   - Verify RLS policies are working correctly

2. **Backend Deployment**:
   - Deploy API endpoints
   - Configure environment variables
   - Set up webhook URLs in payment provider dashboards

3. **Frontend Deployment**:
   - Deploy updated UI components
   - Verify payment flows work end-to-end

## 10. Implementation Timeline

1. **Week 1**: Database schema updates and API endpoint implementation
2. **Week 2**: Frontend component implementation and integration
3. **Week 3**: Testing and bug fixes
4. **Week 4**: Documentation and deployment

## 11. Monitoring and Maintenance

1. **Logging**:
   - Log all payment attempts and outcomes
   - Set up alerts for failed payments

2. **Analytics**:
   - Track payment success rates
   - Monitor average transaction values

3. **Maintenance**:
   - Regularly check for API changes from payment providers
   - Update dependencies as needed

## 12. Future Enhancements

1. **Additional Payment Methods**:
   - Credit/debit cards
   - Bank transfers
   - Mobile money from other providers

2. **Subscription Model**:
   - Implement recurring payments
   - Auto top-up features

3. **Discount System**:
   - Volume discounts for bulk unit purchases
   - Promotional codes for special offers

## 13. Implementation Status

### Completed

- ✅ Database schema design and migration file creation
- ✅ M-Pesa payment initiation API endpoint
- ✅ M-Pesa callback handler endpoint
- ✅ Paystack payment initiation API endpoint
- ✅ Paystack webhook handler endpoint
- ✅ Paystack verification endpoint for redirect handling
- ✅ Payment status check endpoint
- ✅ Units top-up endpoint
- ✅ Payment completion page for Paystack redirects
- ✅ Updated units dashboard client with real payment processing logic

### Next Steps

1. **Testing**: Test the complete payment flow for both M-Pesa and Paystack in a development environment
2. **Environment Variables**: Ensure all required environment variables are set:
   - `MPESA_CONSUMER_KEY`
   - `MPESA_CONSUMER_SECRET`
   - `MPESA_PASSKEY`
   - `MPESA_SHORTCODE`
   - `MPESA_CALLBACK_URL`
   - `PAYSTACK_SECRET_KEY`
   - `PAYSTACK_PUBLIC_KEY`
   - `PAYSTACK_CALLBACK_URL`
3. **Database Migration**: Apply the migration file to the production database
4. **Monitoring**: Set up monitoring and error tracking for payment-related endpoints
5. **User Documentation**: Create user documentation explaining how to use the payment features

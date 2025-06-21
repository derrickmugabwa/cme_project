# PesaPal Integration PRD - Part 3: API Endpoints and Frontend Implementation

## 7. API Endpoints

### 7.1 Initiate PesaPal Payment

Create a new API endpoint at `app/api/payments/pesapal/initiate/route.ts`:

```typescript
// app/api/payments/pesapal/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';
import { createPesaPalClient } from '@/lib/payment-providers/pesapal';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Create Supabase client with service role to bypass RLS
    const supabase = createServerSupabaseClient();
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { transaction_id, email } = body;
    
    if (!transaction_id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();
    
    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Invalid transaction' },
        { status: 400 }
      );
    }
    
    // Create PesaPal client
    const pesapalClient = createPesaPalClient();
    
    // Get user profile for name information (optional)
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', user.id)
      .single();
    
    // Submit order to PesaPal
    const orderResponse = await pesapalClient.submitOrder({
      amount: transaction.amount,
      currency: 'KES', // Assuming KES as default currency
      description: `Purchase of ${transaction.units_purchased} units`,
      email: email,
      phoneNumber: profile?.phone,
      firstName: profile?.first_name,
      lastName: profile?.last_name,
      reference: transaction.id
    });
    
    // Update transaction with PesaPal order tracking ID
    await supabase
      .from('payment_transactions')
      .update({
        metadata: {
          ...transaction.metadata,
          order_tracking_id: orderResponse.order_tracking_id
        }
      })
      .eq('id', transaction_id);
    
    return NextResponse.json({
      success: true,
      message: 'PesaPal payment initiated',
      authorization_url: orderResponse.redirect_url,
      order_tracking_id: orderResponse.order_tracking_id
    });
  } catch (error) {
    console.error('Error initiating PesaPal payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 7.2 PesaPal IPN Handler

Create a new API endpoint at `app/api/payments/pesapal/ipn/route.ts`:

```typescript
// app/api/payments/pesapal/ipn/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';
import { createPesaPalClient } from '@/lib/payment-providers/pesapal';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters from the IPN request
    const orderTrackingId = request.nextUrl.searchParams.get('OrderTrackingId');
    const orderMerchantReference = request.nextUrl.searchParams.get('OrderMerchantReference');
    
    if (!orderTrackingId || !orderMerchantReference) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Create Supabase client with service role
    const supabase = createServerSupabaseClient();
    
    // Find the transaction using the merchant reference (which is our transaction ID)
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', orderMerchantReference)
      .eq('status', 'pending')
      .single();
    
    if (transactionError || !transaction) {
      console.error('Transaction not found or already processed:', orderMerchantReference);
      return NextResponse.json(
        { error: 'Transaction not found or already processed' },
        { status: 400 }
      );
    }
    
    // Create PesaPal client
    const pesapalClient = createPesaPalClient();
    
    // Get transaction status from PesaPal
    const statusResponse = await pesapalClient.getTransactionStatus(orderTrackingId);
    
    // Process based on status
    if (statusResponse.status === 'COMPLETED') {
      // Process successful payment
      await supabase.rpc('process_successful_payment', {
        p_transaction_id: transaction.id,
        p_provider_reference: orderTrackingId,
        p_provider_response: statusResponse
      });
      
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully'
      });
    } else if (statusResponse.status === 'FAILED') {
      // Mark payment as failed
      await supabase.rpc('mark_payment_failed', {
        p_transaction_id: transaction.id,
        p_error_message: 'Payment failed',
        p_provider_response: statusResponse
      });
      
      return NextResponse.json({
        success: false,
        message: 'Payment failed'
      });
    } else {
      // Payment is still pending or in another state
      return NextResponse.json({
        success: true,
        message: 'Payment status received',
        status: statusResponse.status
      });
    }
  } catch (error) {
    console.error('Error processing PesaPal IPN:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 7.3 Verify PesaPal Payment

Create a new API endpoint at `app/api/payments/pesapal/verify/[orderTrackingId]/route.ts`:

```typescript
// app/api/payments/pesapal/verify/[orderTrackingId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';
import { createPesaPalClient } from '@/lib/payment-providers/pesapal';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderTrackingId: string } }
) {
  try {
    const { orderTrackingId } = params;
    
    if (!orderTrackingId) {
      return NextResponse.json(
        { error: 'Missing order tracking ID' },
        { status: 400 }
      );
    }
    
    // Create Supabase client with service role
    const supabase = createServerSupabaseClient();
    
    // Find the transaction using the order tracking ID in metadata
    const { data: transactions, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .filter('metadata->order_tracking_id', 'eq', orderTrackingId);
    
    if (transactionError || !transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    const transaction = transactions[0];
    
    // If transaction is already completed or failed, return its status
    if (transaction.status !== 'pending') {
      return NextResponse.json({
        success: transaction.status === 'completed',
        status: transaction.status,
        units: transaction.units_purchased,
        message: transaction.status === 'completed' 
          ? 'Payment was successful' 
          : 'Payment failed'
      });
    }
    
    // Create PesaPal client
    const pesapalClient = createPesaPalClient();
    
    // Get transaction status from PesaPal
    const statusResponse = await pesapalClient.getTransactionStatus(orderTrackingId);
    
    // Process based on status
    if (statusResponse.status === 'COMPLETED') {
      // Process successful payment
      await supabase.rpc('process_successful_payment', {
        p_transaction_id: transaction.id,
        p_provider_reference: orderTrackingId,
        p_provider_response: statusResponse
      });
      
      return NextResponse.json({
        success: true,
        status: 'completed',
        units: transaction.units_purchased,
        message: 'Payment was successful'
      });
    } else if (statusResponse.status === 'FAILED') {
      // Mark payment as failed
      await supabase.rpc('mark_payment_failed', {
        p_transaction_id: transaction.id,
        p_error_message: 'Payment failed',
        p_provider_response: statusResponse
      });
      
      return NextResponse.json({
        success: false,
        status: 'failed',
        message: 'Payment failed'
      });
    } else {
      // Payment is still pending or in another state
      return NextResponse.json({
        success: false,
        status: 'pending',
        message: 'Payment is still being processed'
      });
    }
  } catch (error) {
    console.error('Error verifying PesaPal payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

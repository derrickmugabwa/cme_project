import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';

// Paystack payment verification
// This endpoint is called by a redirect from Paystack, so it doesn't require authentication
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service role to bypass RLS
    const supabase = createServerSupabaseClient();
    
    // Get the reference from the URL path
    const urlPath = request.nextUrl.pathname;
    const pathReference = urlPath.split('/').pop() || '';
    
    // Also check for reference in query params as a fallback
    const queryReference = request.nextUrl.searchParams.get('reference') || '';
    const finalReference = pathReference || queryReference;
    
    if (!finalReference) {
      return NextResponse.json(
        { error: 'Missing payment reference' },
        { status: 400 }
      );
    }
    
    // Get Paystack secret key
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (!paystackSecretKey) {
      console.error('Missing Paystack configuration');
      return NextResponse.json(
        { error: 'Payment provider configuration error' },
        { status: 500 }
      );
    }
    
    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${finalReference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const paystackData = await paystackResponse.json();
    
    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Failed to verify Paystack payment:', paystackData);
      return NextResponse.json(
        { success: false, message: 'Payment verification failed' },
        { status: 400 }
      );
    }
    
    // Extract transaction ID from reference (format: units-{transaction_id})
    const transactionId = finalReference.startsWith('units-') 
      ? finalReference.substring(6) 
      : null;
    
    if (!transactionId) {
      return NextResponse.json(
        { success: false, message: 'Invalid transaction reference' },
        { status: 400 }
      );
    }
    
    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (transactionError || !transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // Check if payment is already processed
    if (transaction.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        units: transaction.units_purchased
      });
    }
    
    // Check if payment was successful
    if (paystackData.data.status === 'success') {
      // Only process if transaction is still pending
      if (transaction.status === 'pending') {
        // Process the successful payment
        const { data: result, error: processError } = await supabase
          .rpc('process_successful_payment', {
            p_transaction_id: transactionId,
            p_provider_reference: finalReference,
            p_provider_response: paystackData
          });
        
        if (processError) {
          console.error('Error processing successful payment:', processError);
          return NextResponse.json(
            { success: false, message: 'Error processing payment' },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Payment successful',
        units: transaction.units_purchased
      });
    } else {
      // Mark payment as failed if still pending
      if (transaction.status === 'pending') {
        await supabase
          .rpc('mark_payment_failed', {
            p_transaction_id: transactionId,
            p_error_message: 'Payment verification failed',
            p_provider_response: paystackData
          });
      }
      
      return NextResponse.json(
        { success: false, message: 'Payment was not successful' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
